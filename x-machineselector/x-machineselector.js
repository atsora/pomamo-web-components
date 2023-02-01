// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-machineselector
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */

var pulseUtility = require('pulseUtility');
//var pulseSvg = require('pulseSvg');
var pulseComponent = require('pulsecomponent');
//var pulseCustomDialog = require('pulseCustomDialog');
var pulseConfig = require('pulseConfig');
var pulseLogin = require('pulseLogin');
var eventBus = require('eventBus');

(function () {
  class MachineSelectorComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      // DOM
      self._machinesSelector = undefined;

      // Map [id] = group or machine display
      // How to use map : https://www.zendevs.xyz/les-nouveaux-objets-set-et-map-en-javascript-es6/
      self._machines = new Map(); // == from data in web services = [id] displayed
      // Key is stored as string. See machineselection

      return self;
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      /*
      switch (attr) {
        default:
          break;
      }*/
    }

    validateParameters () {
      this.switchToNextContext();
    }

    clearInitialization () {
      $(this.element).empty();

      super.clearInitialization();
    }

    // Creation of the component (empty)
    initialize () {
      this.addClass('pulse-text'); // Mandatory for loader

      // Parameters

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content - MACHINES
      this._machinesSelector = $('<select></select>').addClass('machineselection-machines-select');
      $(this.element).append(this._machinesSelector);

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

      this.switchToNextContext();
    }

    displayError (message) {
      //this._disable(message);
    }

    // Return the Web Service URL here
    getShortUrl () {
      let url = 'Machine/Groups?MachineList=true'; // Not needed Zoom=true
      // Login is set in global service call
      return url;
    }

    // Update the component with data which is returned by the web service in case of success
    refresh (data) {
      // Store lists of available categories (=groups)
      this._groups = data.GroupCategories;
      this._machinesFromService = data.MachineList;

      this._storeMachines();
      // Fill list of machines 
      this._fillMachinesList();
    } // end refresh

    /////////////////////////////////////////
    // FUNCTIONS FOR UPDATING Machine List //
    /////////////////////////////////////////

    _storeMachines () {
      this._machines.clear();

      for (let machIndex = 0; machIndex < this._machinesFromService.length; machIndex++) {
        let mach = this._machinesFromService[machIndex];
        this._machines.set(mach.Id.toString(), {
          display: mach.Display,
          sortpriority: mach.DisplayPriority
        });
      }

    }

    // Fill machines list
    _fillMachinesList () {
      if (this._machinesSelector == undefined)
        return;
      $(this._machinesSelector).empty();

      for (let machine of this._machines) {
        let id = machine[0];
        let displayStr = machine[1].display;
        //if (machine[1].sortpriority != undefined) -> to use ?

        let option = $('<option></option>').addClass('machineselection-machines-option')
          .html(displayStr);
        option[0].setAttribute('value', id);
        $(this._machinesSelector).append(option);
      }
      this._machinesSelector[0].options.selectedIndex = 0;
      this._selectOption();

      $('.machineselection-machines-option').click(
        function () {
          this._selectOption();
        }.bind(this));
    }

    _selectOption () {
      let context = this.element.getAttribute('machine-context');
      let index = this._machinesSelector[0].options.selectedIndex;
      let id = this._machinesSelector[0].options[index].getAttribute('value');
      eventBus.EventBus.dispatchToContext('machineIdChangeSignal',
        context,
        {
          newMachineId: Number(id)
        });
    }

  }

  pulseComponent.registerElement('x-machineselector', MachineSelectorComponent, ['machine-context']);
})();
