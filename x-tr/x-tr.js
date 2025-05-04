// Copyright (C) 2025 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-tr
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */
var pulseUtility = require('pulseUtility');
var pulseComponent = require('pulsecomponent');
var eventBus = require('eventBus');

(function () {

  class TrComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      self._dataElement = undefined;
      
      return self;
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'key':
        case 'default':
          this.start();
          break;
        default:
          break;
      }
    }

    initialize () {
      // In case of clone, need to be empty :
      this.element.replaceChildren();

      // Create DOM - Content
      this._dataElement = this.document.createElement('span');
      this._dataElement.className = 'tr-data';
      this.element.appendChild(this._dataElement);

      // No loading information here

      this.switchToNextContext();
    }

    clearInitialization () {
      // Parameters
      // DOM
      this.element.replaceChildren();

      this._messageSpan = undefined;
      this._dataElement = undefined;

      super.clearInitialization();
    }

    reset () {
      this.removeError();
      this._dataElement.innerText = '';

      this.switchToNextContext();
    }

    validateParameters () {
      if (!this.element.hasAttribute('key')) {
        if ('' === this.element.getAttribute('key')) {
          if (this.isVisible) { // To avoid displayed error in hidden duplicated part
            console.error('missing attribute machine or group in MachineDisplayComponent.element');
          }
          //this.setError('missing machine-id'); // delayed error message
          this.switchToKey('Error', () => this.displayError('invalid key'), () => this.removeError());
          return;
        }
      }
      this.switchToNextContext();
    }

    getShortUrl () {
      let url = 'I18N/Catalog';
      let key = this.element.getAttribute('key');
      let d = this.element.getAttribute('default');
      url += '?Key=' + key;
      if (!pulseUtility.isNotDefined(d)) {
        url += '&Default=' + d;
      }
      return url;
    }

    refresh (data) {
      this._dataElement.innerText = data.Value;
    }

    displayError (message) {
      if ('' === message) {
        this._dataElement.removeAttribute('error-message');
      }
      else {
        this._dataElement.setAttribute('error-message', message);
      }
    }

    removeError () {
      this.displayError('');
    }
  }

  pulseComponent.registerElement('x-tr', TrComponent, ['key']);
})();
