"""Loopback-only static server for the manual smoke pack.

    python smoke_server.py            # pick a free port, serve, record the PID
    python smoke_server.py --stop     # stop the server this launcher started

Serves `static-uikit/` on 127.0.0.1 only, so the catalogue's relative links to
`../../assets/...` resolve exactly as they do for the production QA pages.

Stopping is deliberately narrow. The recorded PID is only trusted when the
process still running under it is *this* script, started from *this* directory,
with the port we recorded. A PID that has been recycled by Windows for some
other program is refused, not killed. Nothing is ever matched or terminated by
process name.
"""

from __future__ import annotations

import argparse
import http.server
import json
import os
import socket
import socketserver
import sys
import time
import webbrowser

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)                                   # …/word-flow-long-data
STATIC_UIKIT = os.path.abspath(os.path.join(ROOT, "..", ".."))  # …/static-uikit
PAGE = "/manual-smoke/word-flow-long-data/index.html"
STATE = os.path.join(HERE, "smoke-server.json")

MARKER = "CRM_SMOKE_PACK_SERVER"


def free_port() -> int:
    sock = socket.socket()
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.close()
    return port


def handler_for(root: str):
    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=root, **kwargs)

        def log_message(self, *args):
            pass

        def handle_one_request(self):
            try:
                super().handle_one_request()
            except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
                self.close_connection = True

        def end_headers(self):
            self.send_header("Cache-Control", "no-store")
            # Local review only: refuse to be embedded or contacted elsewhere.
            self.send_header("X-Frame-Options", "SAMEORIGIN")
            super().end_headers()

    # `.mjs` is not in the Windows registry, and a wrong Content-Type breaks
    # module imports for anyone who opens the builder from this same server.
    Handler.extensions_map = dict(Handler.extensions_map)
    Handler.extensions_map[".mjs"] = "text/javascript"
    Handler.extensions_map[".json"] = "application/json"
    return Handler


def serve(open_browser: bool) -> int:
    port = free_port()
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    httpd = socketserver.ThreadingTCPServer(("127.0.0.1", port),
                                            handler_for(STATIC_UIKIT))
    url = f"http://127.0.0.1:{port}{PAGE}"
    with open(STATE, "w", encoding="utf-8") as fh:
        json.dump({"pid": os.getpid(), "port": port, "url": url,
                   "marker": MARKER, "script": os.path.abspath(__file__),
                   "root": STATIC_UIKIT, "startedAt": time.time()}, fh, indent=1)

    print("Manual smoke pack — local server")
    print(f"  root : {STATIC_UIKIT}")
    print(f"  url  : {url}")
    print(f"  pid  : {os.getpid()}   port: {port}")
    print(f"  state: {STATE}")
    print("\nStop it with tools\\stop-smoke-pack.cmd, or press Ctrl+C here.")
    if open_browser:
        webbrowser.open(url)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")
    finally:
        httpd.server_close()
        try:
            os.remove(STATE)
        except OSError:
            pass
    return 0


def command_line_of(pid: int) -> str | None:
    """This process's command line, or None if it cannot be read."""
    try:
        import ctypes
        import ctypes.wintypes as wintypes
    except Exception:
        return None
    if not sys.platform.startswith("win"):
        try:
            with open(f"/proc/{pid}/cmdline", "rb") as fh:
                return fh.read().decode("utf-8", "replace").replace("\0", " ")
        except OSError:
            return None

    # Windows: read the target's PEB → RTL_USER_PROCESS_PARAMETERS → CommandLine.
    PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
    PROCESS_VM_READ = 0x0010
    ntdll, kernel32 = ctypes.WinDLL("ntdll"), ctypes.WinDLL("kernel32")

    class UNICODE_STRING(ctypes.Structure):
        _fields_ = [("Length", wintypes.USHORT),
                    ("MaximumLength", wintypes.USHORT),
                    ("Buffer", ctypes.c_void_p)]

    class PROCESS_BASIC_INFORMATION(ctypes.Structure):
        _fields_ = [("Reserved1", ctypes.c_void_p),
                    ("PebBaseAddress", ctypes.c_void_p),
                    ("Reserved2", ctypes.c_void_p * 2),
                    ("UniqueProcessId", ctypes.c_void_p),
                    ("Reserved3", ctypes.c_void_p)]

    handle = kernel32.OpenProcess(
        PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_VM_READ, False, pid)
    if not handle:
        return None
    try:
        info = PROCESS_BASIC_INFORMATION()
        if ntdll.NtQueryInformationProcess(
                wintypes.HANDLE(handle), 0, ctypes.byref(info),
                ctypes.sizeof(info), None) != 0:
            return None

        def read(address, size):
            buffer = (ctypes.c_char * size)()
            read_bytes = ctypes.c_size_t(0)
            if not kernel32.ReadProcessMemory(
                    wintypes.HANDLE(handle), ctypes.c_void_p(address), buffer,
                    ctypes.c_size_t(size), ctypes.byref(read_bytes)):
                return None
            return bytes(buffer[:read_bytes.value])

        pointer = ctypes.sizeof(ctypes.c_void_p)
        peb = read(ctypes.cast(info.PebBaseAddress, ctypes.c_void_p).value,
                   0x30 if pointer == 8 else 0x20)
        if not peb:
            return None
        offset = 0x20 if pointer == 8 else 0x10
        params_address = int.from_bytes(peb[offset:offset + pointer], "little")
        params = read(params_address, 0x80)
        if not params:
            return None
        cmd_offset = 0x70 if pointer == 8 else 0x40
        raw = UNICODE_STRING.from_buffer_copy(
            params[cmd_offset:cmd_offset + ctypes.sizeof(UNICODE_STRING)])
        if not raw.Length or not raw.Buffer:
            return None
        text = read(raw.Buffer, raw.Length)
        return text.decode("utf-16-le", "replace") if text else None
    finally:
        kernel32.CloseHandle(handle)


def port_is_ours(port: int) -> bool:
    """Something is listening on the recorded loopback port."""
    sock = socket.socket()
    sock.settimeout(1.0)
    try:
        return sock.connect_ex(("127.0.0.1", port)) == 0
    finally:
        sock.close()


def stop() -> int:
    if not os.path.isfile(STATE):
        print("No recorded server. Nothing to stop.")
        return 0
    with open(STATE, encoding="utf-8") as fh:
        state = json.load(fh)
    pid, port = int(state.get("pid", 0)), int(state.get("port", 0))
    script = os.path.normcase(str(state.get("script", "")))
    print(f"Recorded server: pid {pid}, port {port}")

    if pid <= 0:
        print("REFUSED: no usable pid recorded.")
        return 1

    command = command_line_of(pid)
    if command is None:
        print("REFUSED: cannot read that process's command line, so it cannot "
              "be confirmed as our server. Not touching it.")
        print(f"Delete {STATE} by hand if the server is already gone.")
        return 1

    normalised = os.path.normcase(command)
    if os.path.basename(script) not in normalised or "python" not in normalised:
        print("REFUSED: pid {0} is now running something else:".format(pid))
        print(f"  {command}")
        print("The pid was reused. Not stopping it.")
        return 1
    if not port_is_ours(port):
        print(f"NOTE: nothing is listening on 127.0.0.1:{port} any more.")

    try:
        os.kill(pid, 15 if not sys.platform.startswith("win") else 15)
    except (ProcessLookupError, PermissionError, OSError) as error:
        # Windows has no SIGTERM for another process; fall back to the
        # documented terminate, still by this exact pid and nothing else.
        try:
            import ctypes
            handle = ctypes.WinDLL("kernel32").OpenProcess(0x0001, False, pid)
            if not handle:
                print(f"Could not open pid {pid}: {error}")
                return 1
            ctypes.WinDLL("kernel32").TerminateProcess(handle, 0)
            ctypes.WinDLL("kernel32").CloseHandle(handle)
        except Exception as inner:
            print(f"Could not stop pid {pid}: {inner}")
            return 1

    for _ in range(40):
        if not port_is_ours(port):
            break
        time.sleep(0.1)
    try:
        os.remove(STATE)
    except OSError:
        pass
    print(f"Stopped pid {pid}. No other process was touched.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--stop", action="store_true")
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()
    return stop() if args.stop else serve(not args.no_browser)


if __name__ == "__main__":
    sys.exit(main())
