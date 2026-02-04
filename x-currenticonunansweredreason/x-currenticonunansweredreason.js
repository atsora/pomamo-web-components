// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-currenticonunansweredreason
 * @requires module:pulseComponent
 */
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseSvg = require('pulseSvg');
var pulseRange = require('pulseRange');
var eventBus = require('eventBus');


(function () {

  class CurrentIconUnansweredReasonComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      self._dispatchersListenersCreated = false;
      self._isUnanswered = false;

      self._content = undefined;

      return self;
    }

    //get content () { return this._content; } // Optional

    attributeChangedWhenConnectedOnce(attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
          this.start(); // Hope this reloads component 'NOW' --RR
          break;
        case 'active':
          //if (oldVal != newVal) // not possible if oldVal = undef
          {
            if (newVal == 'true') {
              $(this._content).addClass('active');
            }
            else {
              $(this._content).removeClass('active');
            }
            //this.displayUnanswered(); // Refresh with active or not active display
          }
          break;
        /*case 'machine-context':
          if (this._dispatchersListenersCreated) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'machineIdChangeSignal');
            eventBus.EventBus.addEventListener(this, 'machineIdChangeSignal', newVal,
                             this.onMachineIdChange.bind(this));
          }
          //this.start();
          break;*/
        case 'period-context':
          if (this._dispatchersListenersCreated) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'dateTimeRangeChangeEvent');
            eventBus.EventBus.addEventListener(this, 'dateTimeRangeChangeEvent', newVal,
              this.onDateTimeRangeChange.bind(this));
          }
          //this.start();
          break;
        case 'status-context':
          if (this._dispatchersListenersCreated) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'reasonStatusChange');
            eventBus.EventBus.addEventListener(this, 'reasonStatusChange', newVal,
              this.onReasonStatusChange.bind(this));
          }
          break;
        default:
          break;
      }
    }

    initialize() {
      this.addClass('pulse-icon');

      // listeners/dispatchers
      this._createListenersDispatchers();

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM
      this._content = $('<div></div>').addClass('pulse-icon-content');
      $(this.element)//.addClass('XXX')
        .append(this._content);
      if (this.element.hasAttribute('active') &&
        this.element.getAttribute('active') == 'true') {
        $(this._content).addClass('active');
      }

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization() {
      // Parameters
      // DOM
      $(this.element).empty();
      //this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    reset() {
      // Clean component
      (this._content).empty();
      this._isUnanswered = false;
      // Remove Error
      //this.removeError();

      this.switchToNextContext();
    }

    _createListenersDispatchers() {
      if (false == this._dispatchersListenersCreated) {
        /*if (this.element.hasAttribute('machine-context')) {
          eventBus.EventBus.addEventListener(this, 'machineIdChangeSignal', this.element.getAttribute('machine-context'), this.onMachineIdChange.bind(this), this);
        }*/
        if (this.element.hasAttribute('status-context')) {
          eventBus.EventBus.addEventListener(this, 'reasonStatusChange',
            this.element.getAttribute('status-context'),
            this.onReasonStatusChange.bind(this));
        }
        if (this.element.hasAttribute('period-context')) {
          eventBus.EventBus.addEventListener(this, 'dateTimeRangeChangeEvent',
            this.element.getAttribute('period-context'),
            this.onDateTimeRangeChange.bind(this));
        }
        else {
          eventBus.EventBus.addGlobalEventListener(this, 'dateTimeRangeChangeEvent',
            this.onDateTimeRangeChange.bind(this));
        }
        // Create modifications listener
        eventBus.EventBus.addGlobalEventListener(this,
          'modificationEvent', this.onModificationEvent.bind(this));

        this._dispatchersListenersCreated = true;
      }
    }

    _setRangeFromAttribute() {
      if (this.element.hasAttribute('range')) {
        let attr = this.element.getAttribute('range');
        let range = pulseRange.createDateRangeFromString(attr);
        if (!range.isEmpty()) {
          this._range = range;
        }
      }
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters() {

      // RANGE
      this._setRangeFromAttribute();
      // Check the range is valid
      if (this._range == undefined) {
        console.log('undefined range (missing attribute range');
        if (this.element.hasAttribute('period-context')) {
          eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
            this.element.getAttribute('period-context'));
        }
        else {
          eventBus.EventBus.dispatchToAll('askForDateTimeRangeEvent');
        }
        this.setError(this.getTranslation('error.missingRange', 'Missing range')); // delayed error message
        return;
      }
      if (this._range.isEmpty()) {
        console.error('empty range');
        //this.setError('empty range');
        if (this.element.hasAttribute('period-context')) {
          eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
            this.element.getAttribute('period-context'));
        }
        else {
          eventBus.EventBus.dispatchToAll('askForDateTimeRangeEvent');
        }
        this.setError(this.getTranslation('error.emptyPeriod', 'Empty period')); // delayed error message
        return;
      }
      if (!this.element.hasAttribute('machine-id')) {
        console.log('waiting attribute machine-id in currenticonunansweredreason.element');
        this.setError(this.getTranslation('error.selectMachine', 'Please select a machine')); // delayed error message
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        console.error('invalid attribute machine-id in currenticonunansweredreason.element');
        this.switchToKey('Error', () => this.displayError(this.getTranslation('error.invalidMachineId', 'Invalid machine-id')), () => this.removeError());
        return;
      }

      // All the parameters are ok, switch to the next context
      this.switchToNextContext();
    }

    // Overload to always refresh value
    get isVisible() {
      if (!this._connected) { // == is connected
        return false;
      }
      if ($(this.element).is(':visible')) {
        return true;
      }
      return false;
    }

    get refreshRate() {  // refresh rate in ms.
      return 1000 * (Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10)) + 1); // +1 to allow refresh from bars
    }

    getShortUrl() {
      // Maybe check if range is OK somewhere... -> in validate param

      //let webRange = this.element.getAttribute('range');
      let url = 'ReasonUnanswered?MachineId=' +
        + this.element.getAttribute('machine-id');
      url += '&Range=' + pulseUtility.convertDateRangeForWebService(this._range);
      return url;
    }

    refresh(data) {
      // Only update display if the state actually changes
      if (data.IsUnansweredPeriod) {
        if (!this._isUnanswered) {
          this.displayUnanswered();
          this._isUnanswered = true;
        }
      }
      else {
        if (this._isUnanswered) {
          this.hideUnanswered();
          this._isUnanswered = false;
        }
      }

    }

    hideUnanswered() {
      if (this._content != undefined) {
        (this._content).empty();
      }
    }

    displayUnanswered() {
      if (this._content != undefined) {
        (this._content).empty();
        this._image = $('<div></div>').addClass('pulse-icon-missing-reason');
        (this._content).append(this._image);
        pulseSvg.inlineBackgroundSvg(this._image);

        // Tooltips
        let tooltip = this.getTranslation('iconTooltip', '');
        if (tooltip != '') {
          pulseUtility.addToolTip(this._image, tooltip);
        }
      }
    }

    // Event bus callbacks

    /**
     * Event bus callback triggered when the machine id changes
     *
     * @param {Object} event
     */
    /*onMachineIdChange (event) {
      //let newMachineId = event.target.newMachineId;
      if (this.element.getAttribute("machine-id") == event.target.newMachineId) {
        this.element.setAttribute("active", "true");
      } else {
        this.element.setAttribute("active", "false");
      }
    }*/

    /**
     * Event bus callback triggered when the date/time range changes
     *
     * @param {Object} event
     */
    onDateTimeRangeChange(event) {
      let newRange = event.target.daterange;
      // Maybe check if range is KO somewhere... where ? RR
      /* TODO : if range = KO -> switch to error ??? Verif/Define NR / RR  */
      this._range = newRange;
      this.start();
    }

    /**
     * Event bus callback triggered when the reason status changes in current tab
     *
     * @param {Object} event
     */
    onReasonStatusChange(event) {
      if (this.element.hasAttribute('active') &&
        this.element.getAttribute('active') == 'true') {
        if (this._isUnanswered !== event.target.status) {
          this._isUnanswered = event.target.status;
          if (this._isUnanswered) {
            this.displayUnanswered();
          }
          else {
            this.hideUnanswered();
          }
        }
        this.switchToState('Normal', 'Loading'); // = Should re-start timer and avoid too many un-needed requests to webservice
      }
    }

    /**
     * Event bus callback triggered when a reload message is received
     *
     * @param {Object} event includes :
     * revisionid, machineid, kind, range,
     * initModifications: undefined, // pending modifications the first time
     * pendingModifications: undefined // pending modifications 'now'
     */
    onModificationEvent(event) {
      //let modif = event.target;
      if (event.target.kind != 'reason') {
        return;
      }
      if (event.target.machineid != this.element.getAttribute('machine-id')) {
        return;
      }

      if (event.target.pendingModifications == 0) {
        this.switchToContext('Reload');
      }
    }

    /**
     * Event bus callback triggered when a reload message is received -> reason may haev change
     *
     * @param {Object} event
     */
    /*onReload (event) {
      //this.switchToContext('Reload');
      this.start();
    }*/
  }

  pulseComponent.registerElement('x-currenticonunansweredreason', CurrentIconUnansweredReasonComponent, ['machine-id', 'active', 'period-context', 'status-context']);
})();
