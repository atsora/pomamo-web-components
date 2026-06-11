// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-productionmachiningstatus
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */
import * as pulseComponent from 'pulsecomponent';
import * as pulseUtility from 'pulseUtility';
import * as eventBus from 'eventBus';

(function () {

  /**
   * `<x-productionmachiningstatus>` — work-information cells reflecting
   * the current production / machining status for one machine.
   *
   * Polls `Operation/ProductionMachiningStatus?MachineId=<id>&Option=TrackTask`
   * (interval = `refreshingRate.currentRefreshSeconds`, default 10 s) and
   * diff-renders one `.pulse-cellbar-first` per entry in
   * `WorkInformations` (keyed by `{ Kind, Value }`), flagging missing
   * values via `pulse-cellbar-cell-missing`. Reacts to
   * `machineIdChangeSignal` on `machine-context` (updates `machine-id`).
   *
   * @element x-productionmachiningstatus
   * @attr {number} machine-id      (required) machine id
   * @attr {string} machine-context event-bus context for `machineIdChangeSignal`
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
  class ProductionMachiningStatusComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      // DOM -> never in contructor
      self._content = undefined; // Optional
      self._displayedWorkInformations = null;

      return self;
    }

    get content () { return this._content; } // Optional

    // Sort machines worst-performance-first: set CSS `order` on the
    // ancestor `.group-single` (flex item) so the .group-main flex container
    // reorders rows. Lower `_shiftEfficiency` → lower order → appears first.
    // Default `order: 999999` (set in productionmachining.less) keeps not-yet-
    // refreshed rows at the bottom until their first response.
    //
    // Opt-in via `order-by-efficiency="true"` attribute — other pages that
    // embed x-productionmachiningstatus (e.g. running) don't want their rows
    // reordered by perf.
    _orderUsingShiftEfficiency () {
      if (this.element.getAttribute('order-by-efficiency') !== 'true') return;
      let parentToOrder = this.element.closest('.group-single');
      if (parentToOrder) {
        parentToOrder.style.order = Math.round(100.0 * this._shiftEfficiency);
      }
    }

    /**
      *Update display of workinformation data
      *
      *@param workInformations list of workinformation
      *@param config
      */
    _displayWorkInformations (workInformations) {
      // 1 - Verify if display need to be changed
      let needToRefresh = pulseUtility.isNotDefined(this._displayedWorkInformations);
      if (!needToRefresh) {
        needToRefresh = (this._displayedWorkInformations.length != workInformations.length);
      }
      let index = 0;
      while ((!needToRefresh) && (index < workInformations.length)) {
        if (this._displayedWorkInformations[index].Kind != workInformations[index].Kind) {
          needToRefresh = true;
        }
        if (this._displayedWorkInformations[index].Value != workInformations[index].Value) {
          needToRefresh = true;
        }
        index++
      }


      if (needToRefresh) {
        // empty
        let cells = this._content.querySelectorAll('.pulse-cellbar-first');
        cells.forEach(cell => cell.remove());

        for (const workInformation of workInformations) {
          // workinformation value is defined
          if (workInformation.Value) {
            let div = document.createElement('div');
            div.classList.add('pulse-cellbar-first', 'pulse-cellbar-current-data');
            div.setAttribute('kind', workInformation.Kind);
            div.innerHTML = workInformation.Value;
            this._between.parentNode.insertBefore(div, this._between);
          }
        } // end for
        this._displayedWorkInformations = workInformations;
      }
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'bar-style':
          if (newVal == 'true') {
            this.element.classList.add('pulse-lastbar');
            this.element.classList.remove('pulse-text');
          }
          else {
            this.element.classList.add('pulse-text');
            this.element.classList.remove('pulse-lastbar');
          }
          break;
        case 'machine-id':
          // Empty excepted message and loaded
          let cells = this._content.querySelectorAll('.pulse-cellbar-first, .pulse-cellbar-last');
          cells.forEach(cell => cell.remove());
          this._displayedWorkInformations = null;

          this.start();
          break;
        case 'display-context':
          this.start(); // To re-validate parameters
          break;
        default:
          break;
      }
    }

    initialize () {
      this.addClass('pulse-text'); // == default

      // Update here some internal parameters

      if (this.element.getAttribute('bar-style') == 'true') {
        this.element.classList.add('pulse-lastbar');
      }
      else {
        this.element.classList.add('pulse-text');
      }

      // listeners/dispatchers

      // In case of clone, need to be empty :
      this.element.replaceChildren();
      this._displayedWorkInformations = null;

      // Create DOM
      this._between = document.createElement('div');
      this._between.classList.add('pulse-cellbar-between');
      // Main
      this._content = document.createElement('div');
      this._content.classList.add('pulse-cellbar-main');
      this._content.appendChild(this._between);
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
      this._displayedWorkInformations = null;

      this._between = undefined;
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
      // Empty excepted message and loaded
      //let cells = this._content.querySelectorAll('.pulse-cellbar-first, .pulse-cellbar-last');
      //cells.forEach(cell => cell.remove());
      //this._displayedWorkInformations = workInformations;


      this._messageSpan.innerHTML = message;

      if (this.element.hasAttribute('display-context')) {
        eventBus.EventBus.dispatchToContext('displayChangeEvent',
          this.element.getAttribute('display-context'),
          {
            Display: '',
            ClassToAdd: '',
            ClassToRemove: 'good-efficiency mid-efficiency bad-efficiency'
          });
      }

      this._shiftEfficiency = 999999.9; // = display last
      this._orderUsingShiftEfficiency();
    }

    removeError () {
      this._messageSpan.innerHTML = '';
    }

    get refreshRate () {
      return 1000 * Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));
    }

    getShortUrl () {
      /* To restore if needed :
      let hideglobal = this.element.hasAttribute('hideglobal') ? this.element.getAttribute('hideglobal') : true; // Default = HIDE global
      */

      let url = 'Operation/ProductionMachiningStatus?MachineId='
        + this.element.getAttribute('machine-id')
        + '&Option=' + 'TrackTask';

      return url;
    }

    refresh (data) {
      this.removeError(); // Should have been done before...

      if (data.NotAvailable) {
        this.displayError(this.getTranslation('notavailable', 'Not Available'));
        return;
      }

      //if there is no slot, display ???
      this._displayWorkInformations(data.WorkInformations);

      // For external display
      let classToAdd = ''; // "bad-efficiency"
      let classToRemove = '';

      let doneGoal = '&nbsp';
      if (data.NbPiecesDoneDuringShift != undefined) {
        doneGoal = Math.floor(data.NbPiecesDoneDuringShift * 100) / 100 + ' / '; // Trunk with 2 decimal if needed
      }
      if (data.GoalNowShift != undefined) {
        if (doneGoal == '&nbsp') {
          doneGoal = Math.floor(data.GoalNowShift * 100) / 100; // Trunk with 2 decimal if needed
        }
        else {
          doneGoal += Math.floor(data.GoalNowShift * 100) / 100; // Trunk with 2 decimal if needed
        }
      }

      if ((data.GoalNowShift) && (0 < data.GoalNowShift)) {
        this._shiftEfficiency = data.NbPiecesDoneDuringShift / data.GoalNowShift;

        let thresholdredproduction = this.getConfigOrAttribute('thresholdredproduction', 60);
        let thresholdtargetproduction = this.getConfigOrAttribute('thresholdtargetproduction', 80);
        // colors
        let ratio = data.NbPiecesDoneDuringShift / data.GoalNowShift;
        if (ratio < thresholdredproduction / 100) {
          classToAdd = 'bad-efficiency';
          classToRemove = 'mid-efficiency good-efficiency';
        }
        else {
          if (ratio < thresholdtargetproduction / 100) {
            classToAdd = 'mid-efficiency';
            classToRemove = 'bad-efficiency good-efficiency';
          }
          else {
            classToAdd = 'good-efficiency';
            classToRemove = 'mid-efficiency bad-efficiency';
          }
        }
        if (data.NbPiecesDoneDuringShift == 0) {
          this._shiftEfficiency = 0 - data.GoalNowShift; // 0/50 should be before 0/10
        }
      }
      else {
        this._shiftEfficiency = data.NbPiecesDoneDuringShift + 100; // +100 = Display undefined last
        classToRemove = 'good-efficiency mid-efficiency bad-efficiency';
      }

      if (this.element.hasAttribute('display-context')) {
        // External display
        eventBus.EventBus.dispatchToContext('displayChangeEvent',
          this.element.getAttribute('display-context'),
          {
            Display: doneGoal,
            ClassToAdd: classToAdd,
            ClassToRemove: classToRemove
          });
      }
      else {
        // clean
        let lastCell = this._content.querySelector('.pulse-cellbar-last');
        if (lastCell) lastCell.remove();

        let shiftDiv = document.createElement('div');
        shiftDiv.classList.add('pulse-cellbar-last', 'pulse-cellbar-left-border', 'productionmachiningstatus-shift');
        // .classList.add('pulse-cellbar-past-data') // No, because not clickable

        if (data.NbPiecesDoneDuringShift != undefined) {
          // Shift display
          let shiftSpan = document.createElement('span');
          shiftSpan.classList.add('productionmachiningstatus-shiftspan');
          shiftSpan.innerHTML = doneGoal;
          let linkReport = document.createElement('a');
          linkReport.classList.add('productionmachiningstatus-linkreport'); // Keep <a> it to quickly restore any link here
          linkReport.setAttribute('target', '_blank'); // To open in a new tab
          let shiftLabel = document.createElement('span');
          shiftLabel.classList.add('productionmachiningstatus-shiftlabel');
          shiftLabel.textContent = 'Shift';
          linkReport.appendChild(shiftLabel);
          if (data.Shift && data.Shift.Display) {
            linkReport.innerHTML = data.Shift.Display;
          }
          else {
            linkReport.innerHTML = 'Out of shift';
          }

          shiftDiv.appendChild(linkReport);
          shiftDiv.appendChild(shiftSpan);
        }
        if ('' != classToAdd)
          shiftDiv.classList.add(classToAdd); //bad-efficiency...
        this._between.parentNode.insertBefore(shiftDiv, this._between.nextSibling);
      }

      this._orderUsingShiftEfficiency();
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

    /**
      * Event callback in case a config is updated: (re-)start the component
      *
      * @param {*} event
      */
    onConfigChange (event) {
      if ((event.target.config == 'thresholdunitispart')
        || (event.target.config == 'thresholdredproduction')
        || (event.target.config == 'thresholdtargetproduction')) {
        this.start();
      }
    }

  }

  pulseComponent.registerElement('x-productionmachiningstatus', ProductionMachiningStatusComponent, ['bar-style', 'machine-id', 'display-context']);
})();
