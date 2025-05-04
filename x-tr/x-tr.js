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
var pulseConfig = require('pulseConfig');
var state = require('state');

(function () {

  /**
   * Add a ReadStatic context between ParamValidation and Load
   */
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

    /**
     * @override
     * 
     * @param {!string} context - Context
     * @return {!string} key
     */
    getStartKey(context) {
      switch (context) {
        case 'Read':
          return 'Reading';
        default:
          return super.getStartKey(context);
      }
    }

    /**
     * @override
     */
    getNextContext(context) {
      switch (context) {
        case 'ParamValidation':
          return 'Read';
        case 'Read':
          return 'Load';
        default:
          return super.getNextContext(context);
      }
    }

    /**
     * @override
     * 
     * @param {!string} context - Context
     * @param {!string} key - Key
     * @returns {!State} Created states
     */
    defineState(context, key) {
      switch (context) {
        case 'Read':
          switch (key) {
            case 'Reading':
              return new state.ReadState(context, key, this);
            default:
              console.error(`State not defined for context=${context} and key=${key}`);
              debugger; // eslint-disable-line no-debugger
              throw 'State not defined';
          }
        default:
          return super.defineState(context, key);
      }
    }

    enterContext(context) {
      if (context == 'Read') {
        this.startLoading();
      }
      return super.enterContext(context);
    }

    exitContext(context) {
      if (context == 'Read') {
        this.endLoading();
      }
      return super.exitContext(context);
    }

    attributeChangedWhenConnectedOnce(attr, oldVal, newVal) {
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

    initialize() {
      // In case of clone, need to be empty :
      this.element.replaceChildren();

      // Create DOM - Content
      this._dataElement = this.document.createElement('span');
      this._dataElement.className = 'tr-data';
      this.element.appendChild(this._dataElement);

      // No loading information here

      this.switchToNextContext();
    }

    clearInitialization() {
      // Parameters
      // DOM
      this.element.replaceChildren();

      this._messageSpan = undefined;
      this._dataElement = undefined;

      super.clearInitialization();
    }

    reset() {
      this.removeError();
      this._dataElement.innerText = '';

      this.switchToNextContext();
    }

    validateParameters() {
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

    /**
     * Read the data in catalog
     */
    read() {
      let key = this.element.getAttribute('key');
      let v = this.getTranslation(key, undefined);
      if ((v == undefined) || (v == null)) {
        v = pulseConfig.pulseTranslate(key, undefined);
        if ((v == undefined) || (v == null)) {
          this.switchToNextContext();
        }
        else {
          this._dataElement.innerText = v;
          this.switchToContext('Loaded');
        }
      }
      else {
        this._dataElement.innerText = v;
        this.switchToContext('Loaded');
      }
    }

    getShortUrl() {
      let url = 'I18N/Catalog';
      let key = this.element.getAttribute('key');
      let d = this.element.getAttribute('default');
      url += '?Key=' + key;
      if (!pulseUtility.isNotDefined(d)) {
        url += '&Default=' + d;
      }
      return url;
    }

    refresh(data) {
      this._dataElement.innerText = data.Value;
    }

    displayError(message) {
      if ('' === message) {
        this._dataElement.removeAttribute('error-message');
      }
      else {
        this._dataElement.setAttribute('error-message', message);
      }
    }

    removeError() {
      this.displayError('');
    }
  }

  pulseComponent.registerElement('x-tr', TrComponent, ['key']);
})();
