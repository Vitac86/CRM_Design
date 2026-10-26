# PDF.js local distribution

The builder uses the official Mozilla PDF.js generic display build, version
5.7.284, committed locally so no CDN or external request is needed at runtime.

Files copied from the official `pdfjs-5.7.284-dist.zip` release:

- `pdf.mjs` — display API;
- `pdf.worker.mjs` — parsing/rendering worker;
- `LICENSE` — Apache License 2.0.

The builder sets `GlobalWorkerOptions.workerSrc` to the local worker URL and
sets `isEvalSupported: false`. Only the display layer is used; the stock PDF.js
viewer UI is not embedded.
