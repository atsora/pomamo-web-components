// Copyright (C) 2009-2026 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-signalbanner
 * @requires module:pulseComponent
 */

var pulseComponent = require('pulsecomponent');

(function () {

  /**
   * `<x-signalbanner>` — banner that polls the `/Signal/` endpoint for the given
   * group and displays the returned messages one at a time with prev/next
   * navigation and a top-right close button (per-session dismiss).
   *
   * Polls `Signal/?GroupId=<id>` at `refresh-rate` interval (default 30s).
   *
   * Attributes:
   *   group-id      - (required) group id string (e.g. "1_23_53" or "ALL")
   *   refresh-rate  - (optional) polling interval in seconds (default 30)
   *
   * Expected response shape:
   * ```js
   * {
   *   Messages: [
   *     { Message: string, BgColor: string, FgColor: string }
   *   ]
   * }
   * ```
   *
   * The `Message` text is used as the dismiss key (no dedicated id from the API).
   *
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
  class SignalBannerComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {

    constructor(...args) {
      const self = super(...args);

      self._container = undefined;
      self._content = undefined;
      self._errorDiv = undefined;
      self._messages = [];
      self._currentIndex = 0;
      self._dismissedMessages = new Set();

      return self;
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      if (attr == 'group-id') {
        this._dismissedMessages.clear();
        this._currentIndex = 0;
        this.start();
      }
    }

    initialize () {
      this.addClass('xsignalbanner-host');

      $(this.element).empty();

      this._container = $('<div></div>').addClass('xsignalbanner-container');

      this._content = $('<div></div>')
        .addClass('xsignalbanner-content')
        .css('display', 'none');

      this._errorDiv = $('<div></div>')
        .addClass('xsignalbanner-error')
        .css('display', 'none');

      this._container.append(this._content).append(this._errorDiv);
      $(this.element).append(this._container);

      this.switchToNextContext();
    }

    clearInitialization () {
      $(this.element).empty();
      this._container = undefined;
      this._content = undefined;
      this._errorDiv = undefined;
      this._messages = [];
      super.clearInitialization();
    }

    validateParameters () {
      if (!this.element.hasAttribute('group-id')
          || this.element.getAttribute('group-id').trim() === '') {
        this.switchToKey('Error',
          () => this.displayError('Please provide a group-id'),
          () => this.removeError());
        return;
      }
      this.switchToNextContext();
    }

    displayError (text) {
      if (!this._errorDiv) return;
      $(this._content).css('display', 'none');
      $(this._errorDiv).text(text).css('display', '');
    }

    removeError () {
      if (!this._errorDiv) return;
      $(this._errorDiv).text('').css('display', 'none');
    }

    get refreshRate () {
      if (this.element.hasAttribute('refresh-rate')) {
        return 1000 * Number(this.element.getAttribute('refresh-rate'));
      }
      return 30 * 1000;
    }

    getShortUrl () {
      return 'Signal/?GroupId=' + encodeURIComponent(this.element.getAttribute('group-id'));
    }

    refresh (data) {
      const incoming = (data && Array.isArray(data.Messages)) ? data.Messages : [];

      const previousKey = this._messages[this._currentIndex] && this._messages[this._currentIndex].Message;
      this._messages = incoming.filter(m =>
        m && typeof m.Message === 'string' && !this._dismissedMessages.has(m.Message));

      if (this._messages.length === 0) {
        this._currentIndex = 0;
        this._hideBanner();
        return;
      }

      const newIdx = this._messages.findIndex(m => m.Message === previousKey);
      this._currentIndex = (newIdx >= 0) ? newIdx : 0;

      this._renderCurrentMessage();
    }

    _hideBanner () {
      if (this._content) {
        $(this._content).css('display', 'none').empty();
      }
    }

    _renderCurrentMessage () {
      const msg = this._messages[this._currentIndex];
      if (!msg) { this._hideBanner(); return; }

      $(this._content).empty().css('display', '');
      this._applyInlineColors(msg.BgColor, msg.FgColor);

      const close = this._makeNavButton('close', () => this._dismiss(msg.Message));
      close.addClass('xsignalbanner-close-corner');

      const messageArea = $('<div></div>').addClass('xsignalbanner-message-area');
      const textSpan = $('<span></span>').addClass('xsignalbanner-text').text(msg.Message);
      messageArea.append(textSpan);

      const footer = $('<div></div>').addClass('xsignalbanner-footer');
      const prev = this._makeNavButton('prev', () => this._prev());
      const indicator = $('<span></span>').addClass('xsignalbanner-indicator')
        .text((this._currentIndex + 1) + '/' + this._messages.length);
      const next = this._makeNavButton('next', () => this._next());

      if (this._messages.length <= 1) {
        prev.css('visibility', 'hidden');
        next.css('visibility', 'hidden');
        indicator.css('visibility', 'hidden');
      }

      footer.append(prev).append(indicator).append(next);

      $(this._content).append(close).append(messageArea).append(footer);
    }

    _applyInlineColors (bg, fg) {
      if (bg) {
        $(this._content).css('background-color', bg);
        if (!fg) {
          fg = _bestContrast(bg);
        }
      }
      else {
        $(this._content).css('background-color', '');
      }
      $(this._content).css('color', fg || '');
    }

    _makeNavButton (kind, onClick) {
      const btn = $('<button></button>')
        .addClass('xsignalbanner-btn xsignalbanner-btn-' + kind)
        .attr('type', 'button')
        .attr('aria-label', kind);
      btn.html(_iconSvg(kind));
      btn.on('click', function (e) {
        e.stopPropagation();
        onClick();
      });
      return btn;
    }

    _prev () {
      if (this._messages.length === 0) return;
      this._currentIndex = (this._currentIndex - 1 + this._messages.length) % this._messages.length;
      this._renderCurrentMessage();
    }

    _next () {
      if (this._messages.length === 0) return;
      this._currentIndex = (this._currentIndex + 1) % this._messages.length;
      this._renderCurrentMessage();
    }

    _dismiss (messageText) {
      if (!messageText) return;
      this._dismissedMessages.add(messageText);
      this._messages = this._messages.filter(m => m.Message !== messageText);
      if (this._messages.length === 0) {
        this._currentIndex = 0;
        this._hideBanner();
        return;
      }
      if (this._currentIndex >= this._messages.length) {
        this._currentIndex = this._messages.length - 1;
      }
      this._renderCurrentMessage();
    }
  }

  function _hexToRgb (hex) {
    if (!hex) return null;
    let h = hex.trim().replace(/^#/, '');
    if (h.length === 3) {
      h = h.split('').map(c => c + c).join('');
    }
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    return {
      r: parseInt(h.substr(0, 2), 16),
      g: parseInt(h.substr(2, 2), 16),
      b: parseInt(h.substr(4, 2), 16)
    };
  }

  function _bestContrast (hex) {
    const rgb = _hexToRgb(hex);
    if (!rgb) return '';
    const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return lum > 0.6 ? '#000000' : '#ffffff';
  }

  function _iconSvg (kind) {
    if (kind === 'prev') {
      return '<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">'
        + '<path d="M10 2 L4 8 L10 14" fill="none" stroke="currentColor" '
        + 'stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
    if (kind === 'next') {
      return '<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">'
        + '<path d="M6 2 L12 8 L6 14" fill="none" stroke="currentColor" '
        + 'stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
    if (kind === 'close') {
      return '<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">'
        + '<path d="M3 3 L13 13 M13 3 L3 13" fill="none" stroke="currentColor" '
        + 'stroke-width="2" stroke-linecap="round"/></svg>';
    }
    return '';
  }

  pulseComponent.registerElement('x-signalbanner', SignalBannerComponent,
    ['group-id', 'refresh-rate']);

})();
