// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2025 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-milestonesadd
 * @requires module:pulseComponent
 */
var pulseUtility = require('pulseUtility');
var pulseService = require('pulseService');
//var pulseRange = require('pulseRange');
var pulseCustomDialog = require('pulseCustomDialog');
var pulseComponent = require('pulsecomponent');
var eventBus = require('eventBus');

require('x-datetimepicker/x-datetimepicker');

(function () {

  /**
   * `<x-milestonesadd>` — form to create a new milestone for one machine.
   *
   * Renders a machine label, an `x-datetimepicker`, a short-description
   * input and an "ADD" button. Clicking the button calls
   * `MilestonesSave?GroupId=<machine-id>&At=<iso>&Message=<text>` via
   * `pulseService.runAjaxSimple`. On success: dispatches
   * `milestonesChangeEvent` globally, clears the input, and closes any
   * surrounding `x-milestonesadd` `pulseCustomDialog`. On error/failure,
   * opens an error dialog with the server message (or a generic fallback).
   * Reacts to `machineIdChangeSignal` on `machine-context` (updates
   * `machine-id`). `displayError` disables the form, `removeError`
   * re-enables it.
   *
   * @element x-milestonesadd
   * @attr {number} machine-id      (required) machine id
   * @attr {string} machine-context event-bus context for `machineIdChangeSignal`
   * @fires milestonesChangeEvent   dispatched globally after a successful save
   * @extends pulseComponent.PulseParamInitializedComponent
   */
  class MilestonesAddComponent extends pulseComponent.PulseParamInitializedComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      // DOM
      self._content = undefined;
      self._dateTimePicker = undefined;
      self._milestonesInput = undefined;
      self._button = undefined;
      self._labelmachine = undefined;

      return self;
    }

    get content () { return this._content; }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        //case 'group':
        case 'machine-id':
          if (this.isInitialized()) {
            this._labelmachine.innerHTML = this.element.getAttribute('machine-id');
            this.start();
          }
          break;
        case 'machine-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'machineIdChangeSignal');
            eventBus.EventBus.addEventListener(this, 'machineIdChangeSignal',
              newVal,
              this.onMachineIdChange.bind(this));
          } break;
        default:
          break;
      }
    }

    _clickOnAdd () {
      let date = this._dateTimePicker.getISOValue();
      let text = this._milestonesInput.value;

      // Call ajax
      let url = this.getConfigOrAttribute('path', '')
        + 'MilestonesSave?GroupId='
        + this.element.getAttribute('machine-id')
        + '&At=' + date
        + '&Message=' + text;
      //+ '&Message="' + text + '"'; // " to manage ' ' in string

      pulseService.runAjaxSimple(url,
        this._saveSuccess.bind(this),
        this._saveError.bind(this),
        this._saveFail.bind(this));
    }

    _saveSuccess (data) {
      // Manage progress bar ??? - No
      // Wait 1 sec to hope cache is cleaned
      setTimeout(() => {
        eventBus.EventBus.dispatchToAll('milestonesChangeEvent');
      }, 0);  // 1000);

      // Clean text
      this._milestonesInput.value = '';

      // Close Dialog if exists
      pulseCustomDialog.close('x-milestonesadd');
    }

    _saveError (errorMessage) {
      let close = function () { // Do Nothing
      };
      pulseCustomDialog.openDialog(errorMessage.ErrorMessage, { type: 'Error', title: 'Error', onClose: close });
    }

    _saveFail (url, isTimeout, xhrStatus) {
      let close = function () { // Do Nothing
      };
      pulseCustomDialog.openDialog('Error while saving', { type: 'Error', title: 'Error', onClose: close });
    }

    initialize () {
      //this.addClass('pulse-bigdisplay');
      //pulse-text / pulse-icon / pulse-lastbar / pulse-slotbar / pulse-piegauge / pulse-bigdisplay

      // Listener and dispatchers
      if (this.element.hasAttribute('machine-context')) {
        eventBus.EventBus.addEventListener(this,
          'machineIdChangeSignal',
          this.element.getAttribute('machine-context'),
          this.onMachineIdChange.bind(this));
      }

      // In case of clone, need to be empty :
      this.element.replaceChildren();

      // Create DOM - Content
      this._content = document.createElement('div');
      this._content.className = 'milestonesadd-content';
      this.element.appendChild(this._content);

      // Machine id - for tests
      this._labelmachine = document.createElement('label');
      this._labelmachine.className = 'milestonesadd-machine';
      this._content.appendChild(this._labelmachine);

      // Inputs
      let inputFields = document.createElement('div');
      inputFields.className = 'milestonesadd-inputs';
      this._content.appendChild(inputFields);

      // Day
      let dayLabel = document.createElement('label');
      dayLabel.className = 'milestonesadd-label';
      dayLabel.innerHTML = this.getTranslation('whenColon', 'When: ');
      this._dateTimePicker = pulseUtility.createElementWithAttribute('x-datetimepicker', {});
      let dayInput = document.createElement('div');
      dayInput.className = 'milestonesadd-input';
      dayInput.appendChild(this._dateTimePicker);
      let dayRow = document.createElement('div');
      dayRow.className = 'milestonesadd-row';
      dayRow.appendChild(dayLabel);
      dayRow.appendChild(dayInput);
      inputFields.appendChild(dayRow);

      // Text
      let milestonesLabel = document.createElement('label');
      milestonesLabel.className = 'milestonesadd-label';
      milestonesLabel.innerHTML = this.getTranslation('shortDescriptionColon', 'Short description:');
      this._milestonesInput = document.createElement('input');
      this._milestonesInput.className = 'milestonesadd-input';
      let milestonesRow = document.createElement('div');
      milestonesRow.className = 'milestonesadd-row';
      milestonesRow.appendChild(milestonesLabel);
      milestonesRow.appendChild(this._milestonesInput);
      inputFields.appendChild(milestonesRow);

      // Button
      this._button = document.createElement('button');
      this._button.className = 'milestonesadd-button';
      this._button.innerHTML = 'ADD';
      let buttonDiv = document.createElement('div');
      buttonDiv.className = 'milestonesadd-button-div';
      buttonDiv.appendChild(this._button);
      this._content.appendChild(buttonDiv);

      this._button.addEventListener('click', this._clickOnAdd.bind(this));

      // Create DOM - No Loader
      // Create DOM - No message for error

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    /**
      * Clear anything that was done during initialization, so that initialize can be called once again.
      * Remove all the dispatchers and listeners.
      * Please note that no state switch is done here
    */
    clearInitialization () {
      // Parameters

      // DOM
      this.element.replaceChildren();
      this._content = undefined;

      super.clearInitialization();
    }

    reset () {
      this.removeError();
      // Empty this._content ?

      this.switchToNextContext();
    }

    validateParameters () {
      if (!this.element.hasAttribute('machine-id') //&& !this.element.hasAttribute('group')
      ) {
        console.error('missing attribute machine id in Milestonesadd.element');
        this.setError(this.getTranslation('error.selectMachine', 'Please select a machine')); // delayed error message
        return;
      }

      this._labelmachine.innerHTML = this.element.getAttribute('machine-id');

      this.switchToNextContext();
    }

    displayError (message) {
      // Disable
      this._dateTimePicker.disabled = true;
      this._milestonesInput.disabled = true;
      this._button.disabled = true;
    }

    removeError () {
      // Enable
      this._dateTimePicker.disabled = false;
      this._milestonesInput.disabled = false;
      this._button.disabled = false;
    }

    // Callback events
    onMachineIdChange (event) {
      this.element.setAttribute('machine-id', event.target.newMachineId);
    }

    /**
     * Event callback in case a config is updated: (re-)start the component
     *
     * @param {*} event
     */
    onConfigChange (event) {
      // Default = do nothing
    }
  }

  pulseComponent.registerElement('x-milestonesadd', MilestonesAddComponent, ['machine-id', 'machine-context']);
})();
