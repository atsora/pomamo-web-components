// Copyright (C) 2009-2026 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-signalbanner
 * @requires module:pulseComponent
 */

var pulseComponent = require('pulsecomponent');
var pulseConfig = require('pulseConfig');
var pulseLogin = require('pulseLogin');

(function () {

  /**
   * `<x-signalbanner>` — stacked banner of broadcast messages for a group.
   *
   * Polls `Signal/?GroupId=<id>[&RoleKey=<role>]` and renders one
   * `.xsignalbanner-row` per entry in `data.Messages`
   * (`{ Message, BgColor, FgColor }`); foreground colour defaults to the
   * best-contrast pick against `BgColor`. AJAX errors / failures hide
   * the banner silently rather than showing an error.
   * `from-machine-selection` opt-in mode ignores `group-id` and derives
   * the id from the `group` / `machine` config keys (re-polled on every
   * `configChangeEvent` matching those keys).
   *
   * @element x-signalbanner
   * @attr {string}  group-id               group id (e.g. `"1_23_53"`, `"ALL"`) — required unless `from-machine-selection` is set
   * @attr {boolean} from-machine-selection auto-derive the group id from the `group`/`machine` config keys
   * @attr {number}  refresh-rate           polling interval in seconds (default 30)
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
  class SignalBannerComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {

    constructor(...args) {
      const self = super(...args);

      self._container = undefined;
      self._stack = undefined;
      self._errorDiv = undefined;
      self._resolvedGroupId = '';

      return self;
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      if (attr == 'group-id' || attr == 'from-machine-selection') {
        this.start();
      }
    }

    initialize () {
      this.addClass('xsignalbanner-host');

      $(this.element).empty();

      this._container = $('<div></div>').addClass('xsignalbanner-container');

      this._stack = $('<div></div>')
        .addClass('xsignalbanner-stack')
        .css('display', 'none');

      this._errorDiv = $('<div></div>')
        .addClass('xsignalbanner-error')
        .css('display', 'none');

      this._container.append(this._stack).append(this._errorDiv);
      $(this.element).append(this._container);

      this.switchToNextContext();
    }

    clearInitialization () {
      $(this.element).empty();
      this._container = undefined;
      this._stack = undefined;
      this._errorDiv = undefined;
      super.clearInitialization();
    }

    // Restart the polling cycle whenever the source machine/group selection moves.
    onConfigChange (event) {
      if (!this._isAutoMode()) return;
      const key = event && event.target && event.target.config;
      if (key === 'group' || key === 'machine') {
        this.start();
      }
    }

    _isAutoMode () {
      return this.element.hasAttribute('from-machine-selection');
    }

    _computeResolvedGroupId () {
      if (this._isAutoMode()) {
        // Prefer raw group ids (the `group` config). Fall back to `machine`
        // when no groups are stored — the individual-machine case.
        const groups = pulseConfig.getString('group', '');
        let raw;
        if (groups && groups.trim() !== '') {
          raw = groups.split(',');
        }
        else {
          raw = pulseConfig.getArray('machine', []) || [];
        }
        return raw.map(s => String(s).trim()).filter(s => s !== '').join('_');
      }
      const explicit = this.element.getAttribute('group-id');
      return (explicit || '').trim();
    }

    validateParameters () {
      this._resolvedGroupId = this._computeResolvedGroupId();

      if (this._resolvedGroupId === '') {
        if (this._isAutoMode()) {
          // No selection yet — wait silently for configChangeEvent.
          this.switchToKey('Error',
            () => this._hideAll(),
            () => this.removeError());
          return;
        }
        this.switchToKey('Error',
          () => this.displayError('Please provide a group-id'),
          () => this.removeError());
        return;
      }
      this.switchToNextContext();
    }

    _hideAll () {
      if (this._stack) $(this._stack).css('display', 'none').empty();
      if (this._errorDiv) $(this._errorDiv).text('').css('display', 'none');
    }

    // Hide silently on AJAX errors / failures: a missing /Signal/ response
    // just means there are no signals to show right now.
    manageError (data) {
      this.switchToKey('Error', () => this._hideAll(), () => this.removeError());
    }

    manageFailure (isTimeout, xhrStatus) {
      this.switchToKey('Error', () => this._hideAll(), () => this.removeError());
    }

    displayError (text) {
      if (!this._errorDiv) return;
      $(this._stack).css('display', 'none').empty();
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
      let url = 'Signal/?GroupId=' + encodeURIComponent(this._resolvedGroupId);
      const role = pulseLogin.getRole();
      if (role) {
        url += '&RoleKey=' + encodeURIComponent(role);
      }
      return url;
    }

    refresh (data) {
      const messages = (data && Array.isArray(data.Messages))
        ? data.Messages.filter(m => m && typeof m.Message === 'string')
        : [];

      $(this._stack).empty();

      if (messages.length === 0) {
        $(this._stack).css('display', 'none');
        return;
      }

      messages.forEach(m => {
        const row = $('<div></div>').addClass('xsignalbanner-row');
        let fg = m.FgColor;
        if (m.BgColor) {
          row.css('background-color', m.BgColor);
          if (!fg) fg = _bestContrast(m.BgColor);
        }
        if (fg) row.css('color', fg);
        row.text(m.Message);
        $(this._stack).append(row);
      });

      $(this._stack).css('display', '');
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

  pulseComponent.registerElement('x-signalbanner', SignalBannerComponent,
    ['group-id', 'from-machine-selection', 'refresh-rate']);

})();
