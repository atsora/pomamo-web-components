// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-sequencebar
 * @requires module:pulseComponent
 * @requires module:pulseRange
 * @requires module:pulseUtility
 */
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var eventBus = require('eventBus');

(function () {

  /**
   * `<x-sequencebar>` — current-sequence progress bar for one machine.
   *
   * Polls `CycleProgress?MachineId=<id>&IncludeEvents=false` (interval =
   * `refreshingRate.currentRefreshSeconds`, default 10 s) and renders a
   * horizontal bar with the current sequence name and elapsed / expected
   * time indicators. Reacts to `machineIdChangeSignal` on
   * `machine-context` (updates `machine-id`).
   *
   * @element x-sequencebar
   * @attr {number} machine-id      (required) machine id
   * @attr {string} machine-context event-bus context for `machineIdChangeSignal`
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
  class SequenceBarComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      // DOM -> never in contructor
      self._content = undefined; // Optional

      return self;
    }

    get content () {
      return this._content;
    } // Optional

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
          this.start();
          break;
        case 'machine-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'dateTimeRangeChangeEvent');
            eventBus.EventBus.addEventListener(this,
              'machineIdChangeSignal',
              newVal, this.onMachineIdChange.bind(this));
          }
          this.start(); // To re-validate parameters
          break;
        default:
          break;
      }
    }

    initialize () {
      this.addClass('pulse-lastbar');

      // Update here some internal parameters

      // listeners/dispatchers
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
      this._content.classList.add('sequencebar');
      this._content.classList.add('pulse-cellbar-main'); // To opacity in case of error

      this.element.appendChild(this._content);

      // Create DOM - Loader
      let loader = document.createElement('div');
      loader.classList.add('pulse-loader');
      loader.innerHTML = this.getTranslation('loadingDots', 'Loading...');
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.classList.add('pulse-loader-div');
      loaderDiv.appendChild(loader);
      this.element.appendChild(loaderDiv);

      // Create DOM - message for error
      this._messageSpan = document.createElement('span');
      this._messageSpan.classList.add('pulse-message');
      this._messageSpan.innerHTML = '';
      let messageDiv = document.createElement('div');
      messageDiv.classList.add('pulse-message-div');
      messageDiv.appendChild(this._messageSpan);
      this.element.appendChild(messageDiv);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      this.element.replaceChildren();

      this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters () {
      // machine-id
      if (!this.element.hasAttribute('machine-id')) {
        this.setError(this.getTranslation('error.selectMachine', 'Please select a machine')); // delayed error message
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        //'Machine Id has incorrect value', 'BAD_ID');
        // Immediat display :
        this.switchToKey('Error', () => this.displayError(this.getTranslation('error.invalidMachineId', 'Invalid machine-id')), () => this.removeError());
        return;
      }

      this.switchToNextContext();
    }

    displayError (message) {
      this._messageSpan.innerHTML = message;

      /*if ('NO_DATA' == statusString) {
        'No available next stop information'
        */
    }

    removeError () {
      this.displayError('');
    }

    get refreshRate () {
      return 1000 * Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));
    }

    getShortUrl () {
      let url = 'CycleProgress?MachineId='
        + this.element.getAttribute('machine-id')
        + '&IncludeEvents=false';
      return url;
    }

    refresh (data) {
      this._content.replaceChildren();

      if (data.NoEffectiveOperation || data.InvalidCycle) {
        // No useful data
        let noInfo = document.createElement('div');
        noInfo.classList.add('sequencebar-machinemodule-noinfo');
        noInfo.innerHTML = '--';
        this._content.appendChild(noInfo);
      }
      else {
        if (data.ByMachineModule) {
          /*if (data.ByMachineModule.length == 0) {
            // No machine module
            // ???
          }*/
          // For each module
          for (let iMod = 0; iMod < data.ByMachineModule.length; iMod++) {
            let machineModuleInfo = document.createElement('div');
            machineModuleInfo.classList.add('sequencebar-machinemodule-info');
            //.attr({'MachineModule': data.ByMachineModule[iMod].MachineModule.Display});
            this._content.appendChild(machineModuleInfo);

            // Display Machine Module if more than 1
            if (data.ByMachineModule.length > 1) {
              let machineModule = document.createElement('div');
              machineModule.classList.add('sequencebar-machinemodule');
              machineModule.innerHTML = data.ByMachineModule[iMod].MachineModule.Display;
              machineModuleInfo.appendChild(machineModule);
            }

            let currentSeq = 0;
            let totalSeq = data.ByMachineModule[iMod].Sequences.length;
            let totalDurationInSec = 0;
            let elapsedDurationInSec = 0;
            // For each sequence
            for (let iSeq = 0; iSeq < data.ByMachineModule[iMod].Sequences.length; iSeq++) {
              //data.ByMachineModule[iMod].Sequences[iSeq].Order
              //data.ByMachineModule[iMod].Sequences[iSeq].Display
              //data.ByMachineModule[iMod].Sequences[iSeq].Kind
              if (data.ByMachineModule[iMod].Sequences[iSeq].IsCurrent) {
                currentSeq = iSeq;
              }
              else if (iSeq == (data.ByMachineModule[iMod].Sequences.length - 1)) {
                if (data.ByMachineModule[iMod].Sequences[iSeq].IsCompleted) {
                  currentSeq = totalSeq;
                }
              }
              totalDurationInSec += data.ByMachineModule[iMod].Sequences[iSeq].StandardDuration;
              if (data.ByMachineModule[iMod].Sequences[iSeq].IsCompleted) {
                elapsedDurationInSec += data.ByMachineModule[iMod].Sequences[iSeq].StandardDuration;
              }
            }
            // Display :
            if (totalSeq > 0) {
              //function that add tooltip text to a DOM object according to time until next stop
              // param obj : DOM object
              // param untilNext : time until next stop
              /*let addTitle = (function(obj, untilNext) {
                let title;
                if (untilNext > 0) {
                  title = 'Still ' + untilNext +' seconds to go';
                } else {
                  title = 'Already ' + (-untilNext) + ' seconds late';
                }
                obj.getAttribute('title', title);
              });*/

              let text = document.createElement('div');
              text.classList.add('sequencebar-text');
              text.innerHTML = this.getTranslation('sequence', 'Sequence ')
                  + currentSeq + '/' + totalSeq;

              let progress = document.createElement('div');
              progress.classList.add('sequencebar-progressbar');
              let bar = document.createElement('div');
              bar.classList.add('sequencebar-bar');
              bar.appendChild(progress);
              //.({ value: currentProgress, max: totalProgress });
              if (!pulseUtility.isNotDefined(totalDurationInSec) && 0 != totalDurationInSec) {
                let Width = elapsedDurationInSec / totalDurationInSec;
                progress.style.width = 100 * Width + '%';
              }
              else { //if (!pulseUtility.isNotDefined(totalSeq) && 0 != totalSeq)
                let Width = currentSeq / totalSeq;
                progress.style.width = 100 * Width + '%';
              }
              let progressandtext = document.createElement('div');
              progressandtext.classList.add('sequencebar-progressandtext');
              progressandtext.appendChild(bar);
              progressandtext.appendChild(text);
              machineModuleInfo.appendChild(progressandtext);


              /*
              $(tr).attr({
                'Total': sequenceStateDTO.Total,
                'Order': sequenceStateDTO.Order,
                'Display': sequenceStateDTO.Display,
                'UntilNext': sequenceStateDTO.UntilNext
              });*/
            }
            else {
              let noInfo = document.createElement('div');
              noInfo.classList.add('sequencebar-machinemodule-noinfo');
              noInfo.innerHTML = 'N/A';
              this._content.appendChild(noInfo);
            }
          }
        }
      }
    }

    manageSuccess (data) {
      let barDiv = this.element.parentElement;
      if (barDiv && barDiv.classList.contains('pulse-bar-div')) {
        barDiv.style.display = '';
      }
      this._content.style.display = '';

      super.manageSuccess(data); // or this.switchToNextContext(() => this.refresh(data));
    }

    manageNotApplicable () {
      let barDiv = this.element.parentElement;
      if (barDiv && barDiv.classList.contains('pulse-bar-div')) {
        barDiv.style.display = 'none';
      }

      super.manageNotApplicable(); // To hide
    }

    // Callback events

    /**
     * Event bus callback triggered when param changes
     *
     * @param {Object} event
     */
    onMachineIdChange (event) {
      this.element.setAttribute('machine-id', event.target.newMachineId);
    }
  }

  pulseComponent.registerElement('x-sequencebar', SequenceBarComponent, ['machine-id', 'machine-context']);
})();
