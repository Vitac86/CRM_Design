(function (global) {
  'use strict';

  var ns = global.CRMDocumentBuilder = global.CRMDocumentBuilder || {};

  function PdfViewer(options) {
    this.canvas = options.canvas;
    this.overlay = options.overlay;
    this.stage = options.stage;
    this.scroll = options.scroll;
    this.pageList = options.pageList;
    this.status = options.status;
    this.getTool = options.getTool || function () { return 'select'; };
    this.onRendered = options.onRendered || function () {};
    this.onPageChanged = options.onPageChanged || function () {};
    this.pdfjs = null;
    this.pdf = null;
    this.bytes = null;
    this.pages = [];
    this.pageIndex = 0;
    this.zoom = 1;
    this.zoomMode = 'fit-width';
    this.viewport = null;
    this.renderTask = null;
    this.textGuides = [];
    this.textByPage = [];
    this._renderToken = 0;
    this._panning = null;
    this._wireNavigation();
  }

  PdfViewer.prototype.init = function () {
    var self = this;
    var moduleUrl = new URL('../assets/vendor/pdfjs/pdf.mjs', global.location.href).href;
    return import(moduleUrl).then(function (pdfjs) {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('../assets/vendor/pdfjs/pdf.worker.mjs', global.location.href).href;
      self.pdfjs = pdfjs;
      return self;
    }).catch(function (error) {
      throw new Error('PDF.js не загрузился: ' + error.message);
    });
  };

  PdfViewer.prototype._wireNavigation = function () {
    var self = this;
    this.scroll.addEventListener('wheel', function (event) {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      var factor = event.deltaY < 0 ? 1.1 : 0.9;
      self.setZoom(self.zoom * factor, 'custom');
    }, { passive: false });
    this.scroll.addEventListener('pointerdown', function (event) {
      if (event.button !== 1 && self.getTool() !== 'pan') return;
      self._panning = { x: event.clientX, y: event.clientY, left: self.scroll.scrollLeft, top: self.scroll.scrollTop };
      self.scroll.setPointerCapture(event.pointerId);
      self.scroll.classList.add('is-panning');
    });
    this.scroll.addEventListener('pointermove', function (event) {
      if (!self._panning) return;
      self.scroll.scrollLeft = self._panning.left - (event.clientX - self._panning.x);
      self.scroll.scrollTop = self._panning.top - (event.clientY - self._panning.y);
    });
    function stopPan(event) {
      if (!self._panning) return;
      self._panning = null;
      self.scroll.classList.remove('is-panning');
      try { self.scroll.releasePointerCapture(event.pointerId); } catch (ignore) {}
    }
    this.scroll.addEventListener('pointerup', stopPan);
    this.scroll.addEventListener('pointercancel', stopPan);
  };

  PdfViewer.prototype.load = function (bytes, label) {
    var self = this;
    if (!this.pdfjs) return Promise.reject(new Error('PDF.js ещё не готов.'));
    this.status.textContent = 'Загрузка PDF…';
    this.bytes = bytes instanceof Uint8Array ? bytes.slice() : new Uint8Array(bytes);
    var previousPdf = this.pdf;
    var previousRender = this.renderTask;
    this.pdf = null;
    this.renderTask = null;
    var teardown = Promise.resolve();
    if (previousRender) {
      try { previousRender.cancel(); } catch (ignore) {}
      teardown = Promise.resolve(previousRender.promise).catch(function () {});
    }
    if (previousPdf) {
      teardown = teardown.then(function () { return previousPdf.destroy(); }).catch(function () {});
    }
    return teardown.then(function () {
      return self.pdfjs.getDocument({
        data: self.bytes.slice(),
        isEvalSupported: false,
        useWorkerFetch: false,
        stopEvent: true
      }).promise;
    }).then(function (pdf) {
      self.pdf = pdf;
      self.pages = [];
      self.textByPage = [];
      var jobs = [];
      for (var i = 1; i <= pdf.numPages; i += 1) {
        (function (pageNumber) {
          jobs.push(pdf.getPage(pageNumber).then(function (page) {
            var view = page.view;
            var width = Math.abs(view[2] - view[0]);
            var height = Math.abs(view[3] - view[1]);
            self.pages[pageNumber - 1] = { width: width, height: height, rotation: page.rotate || 0 };
            return page.getAnnotations({ intent: 'display' }).then(function (annotations) {
              self.pages[pageNumber - 1].widgets = annotations.filter(function (annotation) { return annotation.subtype === 'Widget'; }).length;
            });
          }));
        }(i));
      }
      return Promise.all(jobs);
    }).then(function () {
      self.pageIndex = Math.min(self.pageIndex, self.pages.length - 1);
      self._renderPageList();
      self.status.textContent = (label || 'PDF') + ' · ' + self.pages.length + ' стр.';
      return self.render();
    }).then(function () { return self.inspect(); });
  };

  PdfViewer.prototype.inspect = function () {
    var self = this;
    var shaPromise = global.crypto.subtle.digest('SHA-256', this.bytes.slice()).then(function (hash) {
      return Array.from(new Uint8Array(hash)).map(function (byte) { return byte.toString(16).padStart(2, '0'); }).join('');
    });
    var formPromise = global.PDFLib.PDFDocument.load(this.bytes.slice(), { ignoreEncryption: true })
      .then(function (doc) { return doc.getForm().getFields().length; });
    var textPromise = Promise.all(this.pages.map(function (_page, index) {
      return self.pdf.getPage(index + 1).then(function (page) {
        return page.getTextContent().then(function (content) {
          var text = content.items.map(function (item) { return item.str; }).join(' ').replace(/\s+/g, ' ').trim();
          self.textByPage[index] = text;
          return text;
        });
      });
    }));
    return Promise.all([shaPromise, formPromise, textPromise]).then(function (values) {
      return {
        sha256: values[0],
        pageCount: self.pages.length,
        pages: ns.schema.clone(self.pages),
        acroFormFields: values[1],
        widgets: self.pages.reduce(function (sum, page) { return sum + page.widgets; }, 0),
        textByPage: values[2]
      };
    });
  };

  PdfViewer.prototype._renderPageList = function () {
    var self = this;
    this.pageList.textContent = '';
    this.pages.forEach(function (page, index) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'dtb-page-item' + (index === self.pageIndex ? ' is-active' : '');
      button.dataset.page = String(index);
      var title = document.createElement('strong');
      title.textContent = 'Страница ' + (index + 1);
      var size = document.createElement('span');
      size.textContent = page.width.toFixed(2) + ' × ' + page.height.toFixed(2) + ' pt';
      button.appendChild(title);
      button.appendChild(size);
      button.addEventListener('click', function () { self.setPage(index); });
      self.pageList.appendChild(button);
    });
  };

  PdfViewer.prototype.setPage = function (index) {
    if (!this.pdf) return Promise.resolve();
    this.pageIndex = Math.max(0, Math.min(this.pages.length - 1, Number(index)));
    this._renderPageList();
    this.onPageChanged(this.pageIndex);
    return this.render();
  };

  PdfViewer.prototype.setZoom = function (zoom, mode) {
    this.zoom = Math.max(0.2, Math.min(5, Number(zoom) || 1));
    this.zoomMode = mode || 'custom';
    return this.render();
  };

  PdfViewer.prototype.fit = function (mode) {
    if (!this.pages.length) return Promise.resolve();
    var page = this.pages[this.pageIndex];
    var availableWidth = Math.max(200, this.scroll.clientWidth - 48);
    var availableHeight = Math.max(200, this.scroll.clientHeight - 48);
    var zoom = mode === 'fit-page'
      ? Math.min(availableWidth / page.width, availableHeight / page.height)
      : availableWidth / page.width;
    return this.setZoom(zoom, mode);
  };

  PdfViewer.prototype.render = function () {
    var self = this;
    if (!this.pdf) return Promise.resolve();
    var token = ++this._renderToken;
    if (this.zoomMode === 'fit-width' || this.zoomMode === 'fit-page') {
      var pageSize = this.pages[this.pageIndex];
      var availableWidth = Math.max(200, this.scroll.clientWidth - 48);
      var availableHeight = Math.max(200, this.scroll.clientHeight - 48);
      this.zoom = this.zoomMode === 'fit-page'
        ? Math.min(availableWidth / pageSize.width, availableHeight / pageSize.height)
        : availableWidth / pageSize.width;
    }
    if (this.renderTask) {
      try { this.renderTask.cancel(); } catch (ignore) {}
      this.renderTask = null;
    }
    return this.pdf.getPage(this.pageIndex + 1).then(function (page) {
      if (token !== self._renderToken) return null;
      self.viewport = page.getViewport({ scale: self.zoom });
      var ratio = Math.max(1, global.devicePixelRatio || 1);
      self.canvas.width = Math.floor(self.viewport.width * ratio);
      self.canvas.height = Math.floor(self.viewport.height * ratio);
      self.canvas.style.width = self.viewport.width + 'px';
      self.canvas.style.height = self.viewport.height + 'px';
      self.stage.style.width = self.viewport.width + 'px';
      self.stage.style.height = self.viewport.height + 'px';
      self.overlay.setAttribute('viewBox', '0 0 ' + self.viewport.width + ' ' + self.viewport.height);
      self.overlay.setAttribute('width', self.viewport.width);
      self.overlay.setAttribute('height', self.viewport.height);
      var context = self.canvas.getContext('2d', { alpha: false });
      self.renderTask = page.render({
        canvasContext: context,
        viewport: self.viewport,
        transform: ratio === 1 ? null : [ratio, 0, 0, ratio, 0, 0]
      });
      return Promise.all([
        self.renderTask.promise.catch(function (error) {
          if (error && error.name === 'RenderingCancelledException') return;
          throw error;
        }),
        page.getTextContent()
      ]).then(function (values) {
        if (token !== self._renderToken) return;
        self.textGuides = (values[1].items || []).map(function (item) {
          return { left: item.transform[4], baselineTop: self.pages[self.pageIndex].height - item.transform[5], width: item.width || 0, text: item.str || '' };
        });
        self.onRendered({ pageIndex: self.pageIndex, zoom: self.zoom, page: self.pages[self.pageIndex] });
      });
    }).catch(function (error) {
      self.status.textContent = 'Не удалось отобразить PDF: ' + error.message;
      throw error;
    });
  };

  PdfViewer.prototype.pdfToCss = function (left, top) {
    if (!this.viewport) return { x: 0, y: 0 };
    var page = this.pages[this.pageIndex];
    var point = this.viewport.convertToViewportPoint(Number(left), page.height - Number(top));
    return { x: point[0], y: point[1] };
  };

  PdfViewer.prototype.cssToPdf = function (x, y) {
    if (!this.viewport) return { left: 0, top: 0 };
    var page = this.pages[this.pageIndex];
    var point = this.viewport.convertToPdfPoint(Number(x), Number(y));
    return { left: point[0], top: page.height - point[1] };
  };

  PdfViewer.prototype.rectToCss = function (left, top, width, height) {
    var a = this.pdfToCss(left, top);
    var b = this.pdfToCss(Number(left) + Number(width), Number(top) + Number(height));
    return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) };
  };

  PdfViewer.prototype.destroy = function () {
    if (this.renderTask) try { this.renderTask.cancel(); } catch (ignore) {}
    if (this.pdf) this.pdf.destroy();
    this.pdf = null;
  };

  ns.PdfViewer = PdfViewer;
}(typeof window !== 'undefined' ? window : this));
