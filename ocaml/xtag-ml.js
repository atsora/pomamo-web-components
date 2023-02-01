// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module pulseComponent
 * @requires module:pulseConfig
 * @requires module:eventBus
 */
var pulseConfig = require('pulseConfig');
var eventBus = require('eventBus');

function unix_inet_addr_of_string () { return 0; } // eslint-disable-line no-unused-vars
window.unix_inet_addr_of_string = unix_inet_addr_of_string;

var registerElement = function (tag, create) { // eslint-disable-line no-unused-vars

  class C extends HTMLElement {
    constructor(...args) {
      const self = super();
      self._webComponent = create(this);
      this.addOcamlListener = function (signal, name) {
        let callback = function (d) {
          self._webComponent.eventBusCallback(d, signal, name);
        }.bind(this);
        eventBus.EventBus.addEventListener(this, signal, name, callback);
      }
      return self;
    }
    
    /**
     * Associated web component
     *
     * @return {Element} associated web component
     */
    get webComponent () {
      return this._webComponent;
    }
  
    connectedCallback () {
      this._webComponent.connectedCallback ();
    }
  
    disconnectedCallback () {
      if (this._webComponent != null) {
        if (this._webComponent.disconnectedCallback()) {
          // switch to context destroy
          this._webComponent = null; // remove reference to help gargabe collector
        }
      }
    }
  
    attributeChangedCallback (attr, oldVal, newVal) {
      if (this._webComponent != null) {
        if (typeof this._webComponent.attributeChangedCallback === 'function') {
          this._webComponent.attributeChangedCallback (attr, oldVal, newVal);
        }
      }
    }
  }

  customElements.define (tag, C);
}
window.registerElement = registerElement;

window.ocaml_pulseConfig_get = pulseConfig.get; // eslint-disable-line no-unused-vars
