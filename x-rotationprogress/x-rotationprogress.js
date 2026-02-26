// Copyright (C) 2025 Atsora Solutions
// SPDX-License-Identifier: Apache-2.0

var pulseComponent = require('pulsecomponent');
var eventBus = require('eventBus');

(function () {
  class RotationProgressComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    constructor(...args) {
      const self = super(...args);
      return self;
    }

    initialize() {
      this.addClass('pulse-rotationprogress');
      $(this.element).empty();

      // Lecture du mode (par défaut 'bar' si non spécifié)
      this._mode = this.element.getAttribute('display-mode') || 'bar';

      // --- MODE BARRE ---
      if (this._mode === 'bar') {
        this._barContainer = $('<div></div>').addClass('rotation-progress-track');
        this._bar = $('<div></div>').addClass('rotation-progress-bar');
        this._barContainer.append(this._bar);
        $(this.element).append(this._barContainer);
      }

      // --- MODE TEXTE ---
      if (this._mode === 'text') {
        this._text = $('<div></div>').addClass('rotation-progress-text');
        $(this.element).append(this._text);
      }

      // On écoute le moteur
      if (eventBus.EventBus.addGlobalEventListener) {
        eventBus.EventBus.addGlobalEventListener(this, 'rotationPageUpdate', this.onRotationUpdate);
      }

      $(this.element).hide();
      this.switchToNextContext();
    }

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

      // Mise à jour TEXTE
      if (this._mode === 'text' && this._text) {
        this._text.html('Page ' + page + ' / ' + total);
      }

      // Mise à jour BARRE
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
