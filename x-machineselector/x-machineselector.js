// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-machineselector
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */

import * as pulseUtility from 'pulseUtility';
//var pulseSvg = require('pulseSvg');
import * as pulseComponent from 'pulsecomponent';
//var pulseCustomDialog = require('pulseCustomDialog');
import * as pulseConfig from 'pulseConfig';
import * as pulseLogin from 'pulseLogin';
import * as eventBus from 'eventBus';

(function () {
  /**
   * `<x-machineselector>` — single `<select>` dropdown of all machines.
   *
   * Fetches `Machine/Groups?MachineList=true` once and stores the response
   * as a `Map<id-as-string, { display, sortpriority }>`. The select is
   * populated from that map; index 0 is auto-selected on first fill, and
   * each option click re-dispatches the current selection via
   * `machineIdChangeSignal` on the `machine-context` event-bus context.
   *
   * @element x-machineselector
   * @attr {string} machine-context (required) event-bus context for `machineIdChangeSignal`
   * @fires machineIdChangeSignal   `{ newMachineId: number }` — on `machine-context`
   * @extends pulseComponent.PulseParamAutoPathSingleRequestComponent
   */
  class MachineSelectorComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
    /**
     * @param {...any} args
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
      this.element.replaceChildren();

      super.clearInitialization();
    }

    // Creation of the component (empty)
    initialize () {
      this.addClass('pulse-text'); // Mandatory for loader

      // Parameters

      // In case of clone, need to be empty :
      this.element.replaceChildren();

      // Create DOM - Content - MACHINES
      this._machinesSelector = document.createElement('select');
      this._machinesSelector.className = 'machineselection-machines-select';
      this.element.appendChild(this._machinesSelector);

      // Create DOM - Loader
      let loader = document.createElement('div');
      loader.className = 'pulse-loader';
      loader.innerHTML = this.getTranslation('loadingDots', 'Loading...');
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.className = 'pulse-loader-div';
      loaderDiv.appendChild(loader);
      this.element.appendChild(loaderDiv);
      // Create DOM - message for error
      this._messageSpan = document.createElement('span');
      this._messageSpan.className = 'pulse-message';
      this._messageSpan.innerHTML = '';
      let messageDiv = document.createElement('div');
      messageDiv.className = 'pulse-message-div';
      messageDiv.appendChild(this._messageSpan);
      this.element.appendChild(messageDiv);

      this.switchToNextContext();
    }

    displayError (message) {
      //this._disable(message);
    }

    /**
     * REST endpoint: `Machine/Groups?MachineList=true`
     *
     * @returns {string} Short URL without base path.
     */
    getShortUrl () {
      let url = 'Machine/Groups?MachineList=true'; // Not needed Zoom=true
      // Login is set in global service call
      return url;
    }

    /**
     * Stores machines and groups from the response, then populates the `<select>`.
     *
     * @param {{ GroupCategories: Array, MachineList: Array<{ Id: number, Display: string, DisplayPriority: number }> }} data
     */
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

    /**
     * Rebuilds `_machines` map from `_machinesFromService`.
     * Keys are machine IDs as strings; values are `{ display, sortpriority }`.
     */
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

    /**
     * Populates the `<select>` element from `_machines` map.
     * Auto-selects index 0 and dispatches initial selection via `_selectOption()`.
     * Binds click handler on each `<option>` to re-dispatch on manual change.
     */
    _fillMachinesList () {
      if (this._machinesSelector == undefined)
        return;
      this._machinesSelector.replaceChildren();

      for (let machine of this._machines) {
        let id = machine[0];
        let displayStr = machine[1].display;
        //if (machine[1].sortpriority != undefined) -> to use ?

        let option = document.createElement('option');
        option.className = 'machineselection-machines-option';
        option.innerHTML = displayStr;
        option.setAttribute('value', id);
        this._machinesSelector.appendChild(option);
      }
      this._machinesSelector.options.selectedIndex = 0;
      this._selectOption();

      [...this._machinesSelector.querySelectorAll('.machineselection-machines-option')].forEach(option => {
        option.addEventListener('click', () => {
          this._selectOption();
        });
      });
    }

    /**
     * Reads the currently selected `<option>` value and dispatches `machineIdChangeSignal`
     * on the `machine-context` event bus context.
     */
    _selectOption () {
      let context = this.element.getAttribute('machine-context');
      let index = this._machinesSelector.options.selectedIndex;
      let id = this._machinesSelector.options[index].getAttribute('value');
      eventBus.EventBus.dispatchToContext('machineIdChangeSignal',
        context,
        {
          newMachineId: Number(id)
        });
    }

  }

  pulseComponent.registerElement('x-machineselector', MachineSelectorComponent, ['machine-context']);
})();
