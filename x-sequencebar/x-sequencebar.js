// Copyright (C) 2009-2023 Lemoine Automation Technologies
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

/**
 * Build a custom tag <x-sequencebar> to display currently running sequence bar information.
 */
(function () {

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
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>').addClass('sequencebar')
        .addClass('pulse-cellbar-main'); // To opacity in case of error

      $(this.element)
        .append(this._content);

      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html(this.getTranslation('loadingDots', 'Loading...')).css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this.element).append(loaderDiv);

      // Create DOM - message for error
      this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this.element).append(messageDiv);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      $(this.element).empty();

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
      $(this._messageSpan).html(message);

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
      $(this._content).empty();

      if (data.NoEffectiveOperation || data.InvalidCycle) {
        // No useful data
        let noInfo = $('<div></div>').addClass('sequencebar-machinemodule-noinfo')
          .html('--');
        this._content.append(noInfo);
      }
      else {
        if (data.ByMachineModule) {
          /*if (data.ByMachineModule.length == 0) {
            // No machine module
            // ???
          }*/
          // For each module
          for (let iMod = 0; iMod < data.ByMachineModule.length; iMod++) {
            let machineModuleInfo = $('<div></div>').addClass('sequencebar-machinemodule-info');
            //.attr({'MachineModule': data.ByMachineModule[iMod].MachineModule.Display});
            this._content.append(machineModuleInfo);

            // Display Machine Module if more than 1
            if (data.ByMachineModule.length > 1) {
              let machineModule = $('<div></div>').addClass('sequencebar-machinemodule');
              machineModule.html(data.ByMachineModule[iMod].MachineModule.Display);
              machineModuleInfo.append(machineModule);
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
                $(obj).attr('title', title);
              });*/

              let text = $('<div></div>').addClass('sequencebar-text')
                .html(this.getTranslation('sequence', 'Sequence ')
                  + currentSeq + '/' + totalSeq);

              let progress = $('<div></div>').addClass('sequencebar-progressbar');
              let bar = $('<div></div>').addClass('sequencebar-bar').append(progress);
              //.({ value: currentProgress, max: totalProgress });
              if (!pulseUtility.isNotDefined(totalDurationInSec) && 0 != totalDurationInSec) {
                let Width = elapsedDurationInSec / totalDurationInSec;
                $(progress).animate({
                  width: 100 * Width + '%'
                }, 2); // 2 = speed of animation
              }
              else { //if (!pulseUtility.isNotDefined(totalSeq) && 0 != totalSeq)
                let Width = currentSeq / totalSeq;
                $(progress).animate({
                  width: 100 * Width + '%'
                }, 2); // 2 = speed of animation
              }
              let progressandtext = $('<div></div>').addClass('sequencebar-progressandtext')
                .append(bar).append(text);
              machineModuleInfo.append(progressandtext);


              /*
              $(tr).attr({
                'Total': sequenceStateDTO.Total,
                'Order': sequenceStateDTO.Order,
                'Display': sequenceStateDTO.Display,
                'UntilNext': sequenceStateDTO.UntilNext
              });*/
            }
            else {
              let noInfo = $('<div></div>').addClass('sequencebar-machinemodule-noinfo')
                .html('N/A');
              this._content.append(noInfo);
            }
          }
        }
      }
    }

    manageSuccess (data) {
      $(this.element).parent('.pulse-bar-div').show(); // To cancel NotApplicable
      $(this._content).show();

      super.manageSuccess(data); // or this.switchToNextContext(() => this.refresh(data));
    }

    manageNotApplicable () {
      $(this.element).parent('.pulse-bar-div').hide();

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
