"""Headless Chromium driver for the document QA harnesses.

Developer-workstation tooling. Nothing here ships to production and no client
data is involved — the harnesses it drives use fictional fixtures only.

The document engine is browser code (pdf-lib + fontkit + the production field
maps), so the only honest way to test it is to run it in a browser. This module
starts a local static server over `static-uikit/` and one Chromium instance, and
talks to it over the DevTools protocol.

Requires: Python 3.11+, `websocket-client`, and Chrome or Edge.

    from headless_browser import Server, Chrome

    srv, browser = Server(), Chrome()
    browser.goto(srv.base + "/tools/document-layout-qa.html?auto=1")
    browser.wait_for_title()
    browser.stop(); srv.stop()
"""

from __future__ import annotations

import atexit
import http.server
import json
import os
import shutil
import socket
import subprocess
import tempfile
import threading
import time
import urllib.request

import websocket  # websocket-client

# A corporate HTTP proxy may be configured on the workstation; loopback must
# never go through it or the DevTools endpoint looks unreachable.
for _var in ("HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy"):
    os.environ.pop(_var, None)
os.environ["NO_PROXY"] = os.environ["no_proxy"] = "127.0.0.1,localhost"
_OPENER = urllib.request.build_opener(urllib.request.ProxyHandler({}))

HERE = os.path.dirname(os.path.abspath(__file__))
STATIC_UIKIT = os.path.abspath(os.path.join(HERE, "..", ".."))

BROWSER_CANDIDATES = (
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
)


def find_browser() -> str:
    for candidate in BROWSER_CANDIDATES:
        if os.path.exists(candidate):
            return candidate
    found = shutil.which("google-chrome") or shutil.which("chromium")
    if found:
        return found
    raise RuntimeError(
        "No Chrome/Edge/Chromium found. Install one or extend BROWSER_CANDIDATES."
    )


def _free_port() -> int:
    sock = socket.socket()
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.close()
    return port


class _ThreadingHTTPServer(http.server.ThreadingHTTPServer):
    """One connection per thread, with a backlog deep enough for this job.

    The Template Builder page opens all 18 maps, their PDFs and their fonts at
    once. The stdlib default backlog of 5 drops connections under that burst,
    and a dropped connection surfaces in the browser as a failed fetch — which
    the harness reports as a missing template or a missing PDF worker. That is
    what produced 404s in the combined run and never in a single run.
    """

    allow_reuse_address = True
    daemon_threads = True
    request_queue_size = 128


class Server:
    """Static file server rooted at `static-uikit/` (fetch() needs http://)."""

    def __init__(self, root: str = STATIC_UIKIT) -> None:
        self.root = root
        # Bind, serve, then prove it answers before any test navigates to it.
        # A suite that starts driving a server which has not finished coming up
        # sees connection failures the harness can only report as missing
        # files, which is what made the combined run look flaky.
        last_error = None
        for _attempt in range(10):
            self.port = _free_port()
            try:
                self.httpd = _ThreadingHTTPServer(
                    ("127.0.0.1", self.port), self._handler())
                break
            except OSError as error:            # the port went in the meantime
                last_error = error
        else:
            raise RuntimeError(f"could not bind a loopback port: {last_error}")

        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()
        self._wait_until_ready()

    def _wait_until_ready(self, timeout: float = 20.0) -> None:
        deadline = time.time() + timeout
        url = f"http://127.0.0.1:{self.port}/tools/document-map-audit.html"
        while time.time() < deadline:
            try:
                with _OPENER.open(url, timeout=2) as response:
                    if response.status < 400:
                        return
            except Exception:
                time.sleep(0.05)
        raise RuntimeError(f"static server on {self.port} did not become ready")

    def assert_assets(self, paths) -> None:
        """Fail loudly, before any test runs, if a needed asset is not served.

        A missing PDF template or a `.mjs` worker served under the wrong type
        makes a product test fail for an environment reason. Checking first
        keeps that from being reported as a product defect.
        """
        for path in paths:
            url = f"http://127.0.0.1:{self.port}{path}"
            with _OPENER.open(url, timeout=10) as response:
                if response.status >= 400:
                    raise RuntimeError(f"{path}: HTTP {response.status}")
                if response.length == 0:
                    raise RuntimeError(f"{path}: empty")

    def _handler(self):
        root = self.root

        class Handler(http.server.SimpleHTTPRequestHandler):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, directory=root, **kwargs)

            def log_message(self, *args):  # keep QA output readable
                pass

            def handle_one_request(self):
                # Chrome drops keep-alive sockets aggressively; a reset here is
                # normal and must not spam the report with tracebacks.
                try:
                    super().handle_one_request()
                except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
                    self.close_connection = True

            def end_headers(self):
                self.send_header("Cache-Control", "no-store")
                super().end_headers()

        # `.mjs` is not registered on a stock Windows install, so the stdlib
        # falls back to application/octet-stream and the browser refuses to
        # import pdf.worker.mjs as a module. That is an environment fault that
        # looks exactly like a broken viewer.
        Handler.extensions_map = dict(Handler.extensions_map)
        Handler.extensions_map[".mjs"] = "text/javascript"
        Handler.extensions_map[".js"] = "text/javascript"
        Handler.extensions_map[".json"] = "application/json"
        return Handler

    @property
    def base(self) -> str:
        return f"http://127.0.0.1:{self.port}"

    def stop(self) -> None:
        self.httpd.shutdown()
        self.httpd.server_close()
        # Wait for the serving thread to actually finish, so the next suite in
        # a combined run cannot reach a half-closed listener.
        self.thread.join(timeout=10)


class Chrome:
    """One headless Chromium, driven over the DevTools protocol."""

    def __init__(self, headless: bool = True) -> None:
        self.port = _free_port()
        self.profile = tempfile.mkdtemp(prefix="crm-doc-qa-")
        self.session = None
        args = [
            find_browser(),
            f"--remote-debugging-port={self.port}",
            "--remote-allow-origins=*",
            f"--user-data-dir={self.profile}",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-extensions",
            "--disable-background-networking",
            "--disable-sync",
            "--disable-gpu",
            "--mute-audio",
            "about:blank",
        ]
        if headless:
            args.insert(1, "--headless=new")
        self.proc = subprocess.Popen(
            args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        atexit.register(self.stop)
        self.ws = websocket.create_connection(
            self._wait_for_devtools(),
            timeout=180,
            http_no_proxy=["127.0.0.1", "localhost"],
        )
        self._next_id = 0
        self.console: list[str] = []
        self.requests: list[str] = []
        self._open_page()

    # ── DevTools plumbing ────────────────────────────────────────────────────

    def _wait_for_devtools(self, timeout: float = 60) -> str:
        url = f"http://127.0.0.1:{self.port}/json/version"
        deadline = time.time() + timeout
        while time.time() < deadline:
            if self.proc.poll() is not None:
                raise RuntimeError("browser exited before DevTools came up")
            try:
                with _OPENER.open(url, timeout=2) as response:
                    return json.load(response)["webSocketDebuggerUrl"]
            except Exception:
                time.sleep(0.25)
        raise RuntimeError("browser DevTools endpoint did not come up")

    def _note_event(self, frame: dict) -> None:
        method = frame.get("method")
        if method == "Runtime.consoleAPICalled":
            entry = frame["params"]
            if entry.get("type") in ("error", "warning", "assert"):
                text = " ".join(
                    str(arg.get("value", arg.get("description", "")))
                    for arg in entry.get("args", [])
                )
                self.console.append(f"{entry['type']}: {text}")
        elif method == "Runtime.exceptionThrown":
            details = frame["params"].get("exceptionDetails", {})
            description = (details.get("exception") or {}).get("description")
            self.console.append("exception: " + str(description or details.get("text")))
        elif method == "Log.entryAdded":
            entry = frame["params"]["entry"]
            if entry.get("level") in ("error", "warning"):
                self.console.append(f"{entry['level']}: {entry.get('text', '')}")
        elif method == "Network.loadingFailed":
            self.requests.append("failed: " + str(frame["params"].get("errorText")))
        elif method == "Network.responseReceived":
            response = frame["params"].get("response", {})
            if int(response.get("status", 0)) >= 400:
                self.requests.append(
                    f"{response.get('status')}: {response.get('url')}"
                )

    def _send(self, method: str, params: dict | None = None) -> dict:
        self._next_id += 1
        message = {"id": self._next_id, "method": method, "params": params or {}}
        if self.session:
            message["sessionId"] = self.session
        self.ws.send(json.dumps(message))
        while True:
            frame = json.loads(self.ws.recv())
            self._note_event(frame)
            if frame.get("id") == self._next_id:
                if "error" in frame:
                    raise RuntimeError(f"{method}: {frame['error']}")
                return frame.get("result", {})

    def _open_page(self) -> None:
        target = self._send("Target.createTarget", {"url": "about:blank"})["targetId"]
        attached = self._send(
            "Target.attachToTarget", {"targetId": target, "flatten": True}
        )
        self.session = attached["sessionId"]
        self._send("Page.enable")
        self._send("Runtime.enable")
        self._send("Log.enable")
        self._send("Network.enable")

    # ── Page API ─────────────────────────────────────────────────────────────

    def goto(self, url: str, timeout: float = 90) -> None:
        self.console.clear()
        self.requests.clear()
        self._send("Page.navigate", {"url": url})
        deadline = time.time() + timeout
        while time.time() < deadline:
            try:
                if self.eval("document.readyState") == "complete":
                    return
            except Exception:
                pass
            time.sleep(0.1)
        raise RuntimeError(f"navigation to {url} timed out")

    def eval(self, expression: str, await_promise: bool = False):
        result = self._send(
            "Runtime.evaluate",
            {
                "expression": expression,
                "returnByValue": True,
                "awaitPromise": await_promise,
                "userGesture": True,
            },
        )
        if result.get("exceptionDetails"):
            details = result["exceptionDetails"]
            description = (details.get("exception") or {}).get("description")
            raise RuntimeError(f"JS exception: {description or details.get('text')}")
        return result["result"].get("value")

    def wait_for_title(self, titles=("DONE", "FAILED"), timeout: float = 300) -> str:
        """Every harness sets document.title when it finishes."""
        deadline = time.time() + timeout
        while time.time() < deadline:
            title = self.eval("document.title")
            if title in titles:
                return title
            time.sleep(0.15)
        raise RuntimeError("harness did not finish in time")

    def payload(self, start: str, end: str, element: str = "out") -> str:
        raw = self.eval(f"document.getElementById({element!r}).textContent") or ""
        if start in raw and end in raw:
            return raw[raw.index(start) + len(start): raw.rindex(end)]
        return ""

    def stop(self) -> None:
        try:
            self.ws.close()
        except Exception:
            pass
        try:
            if self.proc.poll() is None:
                self.proc.terminate()
                self.proc.wait(timeout=20)
        except Exception:
            try:
                self.proc.kill()
            except Exception:
                pass
        shutil.rmtree(self.profile, ignore_errors=True)
