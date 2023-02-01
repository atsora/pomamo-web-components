// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-machinedisplay
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */
var pulseUtility = require('pulseUtility');
var pulseComponent = require('pulsecomponent');
var eventBus = require('eventBus');

(function () {

  class MachineDisplayComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
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
        case 'group': // Not group-id because of url compatibility
        case 'machine-id':
          this.start();
          break;
        case 'machine-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'machineIdChangeSignal');
            eventBus.EventBus.addEventListener(this,
              'machineIdChangeSignal',
              newVal,
              this.onMachineIdChange.bind(this));
          }
          break;
        default:
          break;
      }
    }

    initialize () {
      this.addClass('pulse-text');

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content
      this._dataElement = $('<span></span>').addClass('machinedisplay-data');
      $(this.element).append(this._dataElement);
      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this.element).append(loaderDiv);

      // Create DOM - message for error
      this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this.element).append(messageDiv);

      // Listener and dispatchers
      if (this.element.hasAttribute('machine-context')) {
        eventBus.EventBus.addEventListener(this,
          'machineIdChangeSignal',
          this.element.getAttribute('machine-context'),
          this.onMachineIdChange.bind(this));
      }

      this.switchToNextContext();
    }

    clearInitialization () {
      // Parameters
      // DOM
      $(this.element).empty();

      this._messageSpan = undefined;
      this._dataElement = undefined;

      super.clearInitialization();
    }

    reset () {
      this.removeError();
      $(this._dataElement).html('');

      this.switchToNextContext();
    }

    validateParameters () {
      if (!this.element.hasAttribute('machine-id')) {
        if (!this.element.hasAttribute('group')) {
          if ('' === this.getConfigOrAttribute('group')) {

            if (this.isVisible) { // To avoid displayed error in hidden duplicated part
              console.error('missing attribute machine or group in MachineDisplayComponent.element');
            }
            //this.setError('missing machine-id'); // delayed error message
            this.switchToKey('Error', () => this.displayError('invalid machine or group'), () => this.removeError());
            return;
          }
        }
      }
      this.switchToNextContext();
    }

    getShortUrl () {
      let url = 'Machine/Name';
      if (this.element.hasAttribute('machine-id')) {
        url += '?MachineId=' + this.element.getAttribute('machine-id');
      }
      else {
        let group = '';
        if (this.element.hasAttribute('group')) {
          group = this.element.getAttribute('group');
        }
        else {
          group = this.getConfigOrAttribute('group'); // config first - keep getAttribute before
        }
        url += '?GroupId=' + group;
      }
      return url;
    }

    refresh (data) {
      if (!pulseUtility.isNotDefined(data.Display))
        $(this._dataElement).html(data.Display);
      else
        $(this._dataElement).html(data.Name);

      // string Id
      // string TreeName
      // bool Group // Is it a group ?
    }

    displayError (message) {
      $(this._dataElement).html('');
      $(this._messageSpan).html(message);
    }

    removeError () {
      this.displayError('');
    }

    // Callback events
    onMachineIdChange (event) {
      this.element.setAttribute('machine-id', event.target.newMachineId);
    }
  }

  pulseComponent.registerElement('x-machinedisplay', MachineDisplayComponent, ['group', 'machine-id', 'machine-context']);
})();
