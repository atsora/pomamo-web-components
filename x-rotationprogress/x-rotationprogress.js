// Copyright (C) 2025 Atsora Solutions
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-rotationprogress
 */
var pulseComponent = require('pulsecomponent');
var eventBus = require('eventBus');

(function () {
  /**
   * `<x-rotationprogress>` — visual indicator for a paged-rotation tick.
   *
   * Performs no AJAX. Listens to `rotationPageUpdate` globally; each event
   * carries `{ page, total, delay }`. Hidden while `total <= 1` or
   * `delay` is missing, otherwise renders one of two modes selected by
   * `display-mode`:
   *  - `'bar'` (default): a `.rotation-progress-bar` whose CSS `width`
   *    transitions from 0 % to 100 % over `delay` ms each cycle;
   *  - `'text'`: a `.rotation-progress-text` showing `Page N / T`.
   *
   * @element x-rotationprogress
   * @attr {string} display-mode `'bar'` (default) or `'text'`
   * @extends pulseComponent.PulseInitializedComponent
   */
  class RotationProgressComponent extends pulseComponent.PulseInitializedComponent {
    /** @param {...any} args */
    constructor(...args) {
      const self = super(...args);
      return self;
    }

    initialize() {
      this.addClass('pulse-rotationprogress');
      this.element.replaceChildren();

      // Read display mode (default 'bar' if not specified)
      this._mode = this.element.getAttribute('display-mode') || 'bar';

      // --- BAR MODE ---
      if (this._mode === 'bar') {
        this._barContainer = document.createElement('div');
        this._barContainer.className = 'rotation-progress-track';
        this._bar = document.createElement('div');
        this._bar.className = 'rotation-progress-bar';
        this._barContainer.appendChild(this._bar);
        this.element.appendChild(this._barContainer);
      }

      // --- TEXT MODE ---
      if (this._mode === 'text') {
        this._text = document.createElement('div');
        this._text.className = 'rotation-progress-text';
        this.element.appendChild(this._text);
      }

      if (eventBus.EventBus.addGlobalEventListener) {
        eventBus.EventBus.addGlobalEventListener(this, 'rotationPageUpdate', this.onRotationUpdate);
      }

      this.element.style.display = 'none';
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
        this.element.style.display = 'none';
        return;
      }

      this.element.style.display = '';

      // Update TEXT
      if (this._mode === 'text' && this._text) {
        this._text.innerHTML = this.getTranslation('page', 'Page') + ' ' + page + ' / ' + total;
      }

      // Update BAR
      if (this._mode === 'bar' && this._bar) {
        this._bar.style.width = '0%';
        this._bar.style.transition = 'none';
        this._bar.offsetHeight; // Force reflow
        this._bar.style.transition = 'width ' + delay + 'ms linear';
        this._bar.style.width = '100%';
      }
    }
  }

  pulseComponent.registerElement('x-rotationprogress', RotationProgressComponent, ['display-mode']);
})();
