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

/**
 * Build a custom tag <x-milestonesadd> to add milestones in database
 */
(function () {

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
            $(this._labelmachine).html(this.element.getAttribute('machine-id'));
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
      let date = this._dateTimePicker[0].getISOValue();
      let text = this._milestonesInput[0].value;

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
      this._milestonesInput[0].value = '';

      // Close Dialog if exists
      pulseCustomDialog.close('x-milestonesadd');
    }

    _saveError (errorMessage) {
      let close = function () { // Do Nothing
      };
      pulseCustomDialog.openError(errorMessage.ErrorMessage, 'Error', close);
    }

    _saveFail (url, isTimeout, xhrStatus) {
      let close = function () { // Do Nothing
      };
      pulseCustomDialog.openError('Error while saving', 'Error', close);
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
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>').addClass('milestonesadd-content');
      $(this.element).append(this._content);

      // Machine id - for tests
      this._labelmachine = $('<label></label>').addClass('milestonesadd-machine');
      $(this._content).append(this._labelmachine);
      // Inputs
      let inputFields = $('<div></div>').addClass('milestonesadd-inputs');
      $(this._content).append(inputFields);
      // Day
      let dayLabel = $('<label></label>').addClass('milestonesadd-label')
        .html(this.getTranslation('whenColon', 'When: '));
      this._dateTimePicker = pulseUtility.createjQueryElementWithAttribute('x-datetimepicker', {});
      let dayInput = $('<div></div>').addClass('milestonesadd-input')
        .append(this._dateTimePicker);
      let dayRow = $('<div></div>').addClass('milestonesadd-row')
        .append(dayLabel).append(dayInput);
      $(inputFields).append(dayRow);

      // Text
      let milestonesLabel = $('<label></label>').addClass('milestonesadd-label')
        .html(this.getTranslation ('shortDescriptionColon', 'Short description:' ));
      this._milestonesInput = $('<input></input>').addClass('milestonesadd-input');
      let milestonesRow = $('<div></div>').addClass('milestonesadd-row')
        .append(milestonesLabel).append(this._milestonesInput);
      $(inputFields).append(milestonesRow);

      // Button
      this._button = $('<button></button>').addClass('milestonesadd-button')
        .html('ADD');
      let buttonDiv = $('<div></div>').addClass('milestonesadd-button-div')
        .append(this._button);
      $(this._content).append(buttonDiv);

      this._button.click(
        function () {
          this._clickOnAdd();
        }.bind(this));

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
      $(this.element).empty();
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

      this._labelmachine.html(this.element.getAttribute('machine-id'));

      this.switchToNextContext();
    }

    displayError (message) {
      // Disable
      this._dateTimePicker.prop('disabled', true);
      this._milestonesInput.prop('disabled', true);
      this._button.prop('disabled', true);
    }

    removeError () {
      // Enable
      this._dateTimePicker.prop('disabled', false);
      this._milestonesInput.prop('disabled', false);
      this._button.prop('disabled', false);
      // Todo try without jquery :
      //document.querySelector('.input-checkbox').disabled = true;
      //document.querySelectorAll('.input-checkbox').forEach(el => el.disabled = true);
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
