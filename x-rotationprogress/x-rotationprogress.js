// Copyright (C) 2025 Atsora Solutions
// SPDX-License-Identifier: Apache-2.0

var pulseComponent = require('pulsecomponent');
var eventBus = require('eventBus');

(function () {
  /**
   * `<x-rotationprogress>` — visual indicator for page rotation progress.
   *
   * No REST requests — purely event-driven.
   * Listens to `rotationPageUpdate` globally to update the display.
   * Renders in two modes controlled by the `display-mode` attribute:
   *  - `'bar'`  — animated progress bar (CSS transition width 0% → 100% over `delay` ms).
   *  - `'text'` — text label `'Page N / T'`.
   * Hidden when there is only one page or no delay is provided.
   *
   * Attributes:
   *   display-mode - `'bar'` (default) or `'text'`
   *
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
  class RotationProgressComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /** @param {...any} args */
    constructor(...args) {
      const self = super(...args);
      return self;
    }

    validateParameters () {}

    initialize() {
      this.addClass('pulse-rotationprogress');
      $(this.element).empty();

      // Read display mode (default 'bar' if not specified)
      this._mode = this.element.getAttribute('display-mode') || 'bar';

      // --- BAR MODE ---
      if (this._mode === 'bar') {
        this._barContainer = $('<div></div>').addClass('rotation-progress-track');
        this._bar = $('<div></div>').addClass('rotation-progress-bar');
        this._barContainer.append(this._bar);
        $(this.element).append(this._barContainer);
      }

      // --- TEXT MODE ---
      if (this._mode === 'text') {
        this._text = $('<div></div>').addClass('rotation-progress-text');
        $(this.element).append(this._text);
      }

      // Listen to the rotation engine
      if (eventBus.EventBus.addGlobalEventListener) {
        eventBus.EventBus.addGlobalEventListener(this, 'rotationPageUpdate', this.onRotationUpdate);
      }

      $(this.element).hide();
      this.switchToNextContext();
    }

    /**
     * Event callback for `rotationPageUpdate`: updates the bar or text display.
     * Hides the component if only one page or no delay is provided.
     *
     * @param {{ target: { page: number, total: number, delay: number } }} event
     */
    onRotationUpdate(event) {
      let data = event.target || event;
      let page = data.page;
      let total = data.total;
      let delay = data.delay;

      if (!total || total <= 1 || !delay) {
        $(this.element).hide();
        return;
      }

      $(this.element).show();

      // Update TEXT
      if (this._mode === 'text' && this._text) {
        this._text.html('Page ' + page + ' / ' + total);
      }

      // Update BAR
      if (this._mode === 'bar' && this._bar) {
        this._bar.stop(true, true).css({ 'width': '0%', 'transition': 'none' });
        this._bar[0].offsetHeight; // Force reflow
        this._bar.css({
          'transition': 'width ' + delay + 'ms linear',
          'width': '100%'
        });
      }
    }
  }

  pulseComponent.registerElement('x-rotationprogress', RotationProgressComponent, ['display-mode']);
})();
