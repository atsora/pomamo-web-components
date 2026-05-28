// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-currenticoncncalarm
 * @requires module:pulseComponent
 */
var pulseUtility = require('pulseUtility');
//var pulseRange = require('pulseRange');
var pulseSvg = require('pulseSvg');
var pulseComponent = require('pulsecomponent');
var eventBus = require('eventBus');

(function () {

  /**
   * `<x-currenticoncncalarm>` — alarm icon for the currently active CNC alarms on
   * one machine.
   *
   * Polls `CncAlarm/Current?MachineId=<id>` at `currentRefreshSeconds + 1`
   * interval. The query is extended with `&IncludeIgnored=true` when the
   * `showIgnoredAlarm` config is `'true'`, or with `&KeepFocusOnly=true` when
   * `showUnknownAlarm` is `'false'`. Renders a `.pulse-icon-cncalarm` div with a
   * `-focused` / `-ignored` / `-unknown` variant depending on the alarm's
   * `Focus`, plus an optional text label below the icon when `showAlarmBelowIcon`
   * is `'true'`. Listens to `onCncAlarmStatusChange` on `status-context`.
   *
   * @element x-currenticoncncalarm
   * @attr {number}  machine-id      machine id (required unless `machine-context` is set)
   * @attr {boolean} active          `'true'` adds the `.active` class on the inner content
   * @attr {string}  status-context  event-bus context for `onCncAlarmStatusChange`
   * @attr {string}  machine-context event-bus context for `machineIdChangeSignal` (sets `machine-id` from the bus)
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
  class CurrentIconCNCAlarmComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      self._dispatchersListenersCreated = false;

      self._content = undefined;
      self._isAlarm = false;
      self._focus = '';
      self._mainDisplay = '';
      self._alarmsForTooltipDisplay = [];
      self._configChanged = true;

      return self;
    }

    //get content () { return this._content; } // Optional

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
          this.start(); // Hope this reloads component 'NOW' --RR
          break;
        case 'active':
          //if (oldVal != newVal)
          {
            if (newVal == 'true') {
              $(this._content).addClass('active');
            }
            else {
              $(this._content).removeClass('active');
            }
            //this.displayAlarm(); // Refresh with active or not active display
          }
          break;
        case 'status-context':
          if (this._dispatchersListenersCreated) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'onCncAlarmStatusChange');
            eventBus.EventBus.addEventListener(this,
              'onCncAlarmStatusChange', newVal,
              this.onCncAlarmStatusChange.bind(this));
          }
          //this.start(); // Why ? Is it useful ? --RR
          break;
        case 'machine-context':
          // Only re-bind to a new context if we were already following the bus
          // (no explicit machine-id). Per-tab variants keep their fixed id.
          if (this._dispatchersListenersCreated
            && !this.element.hasAttribute('machine-id')) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'machineIdChangeSignal');
            eventBus.EventBus.removeEventListenerBySignal(this, 'requestMachineIdSignal');
            eventBus.EventBus.addEventListener(this,
              'machineIdChangeSignal', newVal,
              this.onMachineIdChange.bind(this));
            eventBus.EventBus.addEventListener(this,
              'requestMachineIdSignal', newVal,
              this.onMachineIdChange.bind(this));
            eventBus.EventBus.dispatchToContext('askForMachineIdSignal', newVal);
          }
          break;
        default:
          break;
      }
    }

    initialize () {
      this.addClass('pulse-icon');

      // Attributes

      // listeners/dispatchers
      this._createListenersDispatchers();

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM
      this._content = $('<div></div>').addClass('pulse-icon-content');
      $(this.element)//.addClass('XXX')
        .append(this._content);
      if ((this.element.hasAttribute('active')) &&
        (this.element.getAttribute('active') == 'true')) {
        $(this._content).addClass('active');
      }

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      $(this.element).empty();
      //this._messageSpan = undefined;
      this._content = undefined;

      // super.clearInitialization wipes all listeners via removeEventListenerByScope.
      // Reset the flag so the next initialize() re-registers them instead of
      // short-circuiting in _createListenersDispatchers().
      this._dispatchersListenersCreated = false;

      super.clearInitialization();
    }

    reset () {
      // Clean component
      $(this._content).empty();
      // Remove Error
      //this.removeError();

      this.switchToNextContext();
    }

    _createListenersDispatchers () {
      if (false == this._dispatchersListenersCreated) {
        // Only follow machine-context when no explicit machine-id has been
        // stamped on this element. The per-tab variant inside <x-machinetab>
        // is pre-bound to a fixed machine and must not switch to the active
        // one when the user picks another tab — only the page-level instance
        // (with machine-context but no machine-id in markup) follows the bus.
        if (this.element.hasAttribute('machine-context')
          && !this.element.hasAttribute('machine-id')) {
          let ctx = this.element.getAttribute('machine-context');
          eventBus.EventBus.addEventListener(this,
            'machineIdChangeSignal', ctx,
            this.onMachineIdChange.bind(this));
          // x-machinetab replies on `requestMachineIdSignal` when something
          // dispatches `askForMachineIdSignal` — needed when this component
          // mounts after the initial machineIdChangeSignal has already been
          // fired by the active tab.
          eventBus.EventBus.addEventListener(this,
            'requestMachineIdSignal', ctx,
            this.onMachineIdChange.bind(this));
          eventBus.EventBus.dispatchToContext('askForMachineIdSignal', ctx);
        }
        if (this.element.hasAttribute('status-context')) {
          eventBus.EventBus.addEventListener(this,
            'onCncAlarmStatusChange',
            this.element.getAttribute('status-context'),
            this.onCncAlarmStatusChange.bind(this));
        }

        this._dispatchersListenersCreated = true;
      }
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters () {
      if (!this.element.hasAttribute('machine-id')) {
        console.log('waiting attribute machine-id in currenticoncncalarm.element');
        this.setError(this.getTranslation('error.selectMachine', 'Please select a machine')); // delayed error message
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        console.error('invalid attribute machine-id in currenticoncncalarm.element');
        this.switchToKey('Error', () => this.displayError(this.getTranslation('error.invalidMachineId', 'Invalid machine-id')), () => this.removeError());
        return;
      }

      // All the parameters are ok, switch to the next context
      this.switchToNextContext();
    }

    // Overload to always refresh value
    get isVisible () {
      if (!this._connected) { // == is connected
        return false;
      }
      if ($(this.element).is(':visible')) {
        return true;
      }
      return false;
    }

    get refreshRate () {  // refresh rate in ms.
      return 1000.0 * (Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10)) + 1); // +1 to allow refresh from bars
    }

    getShortUrl () {
      //let webRange = this.element.getAttribute('range');
      let url = 'CncAlarm/Current?MachineId=' +
        + this.element.getAttribute('machine-id');
      if ('true' == this.getConfigOrAttribute('showIgnoredAlarm', 'false')) {
        url += '&IncludeIgnored=true';
      }
      else {
        if ('false' == this.getConfigOrAttribute('showUnknownAlarm', 'true')) {
          url += '&KeepFocusOnly=true';
        }
      }
      return url;
    }

    refresh (data) {
      let newIsAlarm = false;
      let newDisplay = '';
      let newTooltipDisplay = [];
      let newFocus = '';
      if (data.ByMachineModule.length > 0) {
        if (data.ByMachineModule[0].CncAlarms.length > 0) {
          newIsAlarm = true;
          newDisplay = data.ByMachineModule[0].CncAlarms[0].Display;
          newFocus = data.ByMachineModule[0].CncAlarms[0].Focus;

          newTooltipDisplay.push(data.ByMachineModule[0].CncAlarms[0].Display);
        }
      }
      //else { // == default

      if ((this._configChanged == true)
        || (this._mainDisplay != newDisplay) // changement de texte possible
        || (this._focus != newFocus)) { // = changement d'image possible
        this._configChanged = false;

        this._isAlarm = newIsAlarm;
        this._focus = newFocus;
        this._mainDisplay = newDisplay;
        this._alarmsForTooltipDisplay = newTooltipDisplay;

        if (this._isAlarm) {
          this.displayAlarm();
        }
        else {
          this.hideAlarm();
        }
      }
      else {
        if (this._alarmsForTooltipDisplay != newTooltipDisplay) {
          this._alarmsForTooltipDisplay = newTooltipDisplay;
          this._changeAlarmTooltip();
        }
      }
    }

    hideAlarm () {
      if (this._content != undefined) {
        if (this._image != undefined)
          pulseUtility.removeToolTip(this._image);
        $(this._content).empty();
      }
    }

    displayAlarm () {
      if (this._content != undefined) {
        $(this._content).empty();
        //true / false / not set
        if (true == this._focus) {
          this._image = $('<div></div>').addClass('pulse-icon-cncalarm')
            .addClass('pulse-icon-cncalarm-focused');
        }
        else if (false == this._focus) {
          this._image = $('<div></div>').addClass('pulse-icon-cncalarm')
            .addClass('pulse-icon-cncalarm-ignored');
        }
        else {
          this._image = $('<div></div>').addClass('pulse-icon-cncalarm')
            .addClass('pulse-icon-cncalarm-unknown');
        }
        $(this._content).append(this._image);
        pulseSvg.inlineBackgroundSvg(this._image);


        let showAlarmBelowIcon = this.getConfigOrAttribute('showAlarmBelowIcon', false);
        if (showAlarmBelowIcon == 'true') {
          let text = $('<div></div>').addClass('currenticoncncalarm-text')
            .html(this._mainDisplay);
          $(this._content).append(text);
        }
        // Always :
        this._changeAlarmTooltip();
      }
    }

    _changeAlarmTooltip () {
      if (this._image != undefined) {
        let tooltipText = '';

        for (let iAlarms = 0; iAlarms < this._alarmsForTooltipDisplay.length; iAlarms++) {
          //let range = this._alarmsForTooltipDisplay[iAlarms].Range;
          //let tmpDateRange = pulseRange.createDateRangeFromString(range);
          //let rangeDisplay = pulseUtility.displayDateRange(tmpDateRange);
          //let color = this._alarmsForTooltipDisplay[iAlarms].Color;

          //let focus = this._alarmsForTooltipDisplay[iAlarms].Focus;
          let display = this._alarmsForTooltipDisplay[iAlarms]; //.Display;

          tooltipText += display + '\n\r';
        } // end for

        //pulseUtility.addToolTip(this._image, this._alarmsForTooltipDisplay);
        pulseUtility.addToolTip(this._image, tooltipText);
      }
    }

    // Event bus callbacks

    /**
     * Event bus callback triggered when the changes
     *
     * @param {Object} event
     */
    onCncAlarmStatusChange (event) {
      // TODO : maybe add an event here...
      //use event.target.???
      //this.switchToState('Normal', 'Loading'); // = Should re-start timer and avoid too many un-needed requests to webservice
    }

    /**
     * Event bus callback for `machineIdChangeSignal` (payload `newMachineId`) and
     * `requestMachineIdSignal` (payload `machineId`) on `machine-context`.
     * Updates `machine-id` so the component restarts its query for the new machine.
     *
     * @param {Object} event
     */
    onMachineIdChange (event) {
      let newId = event.target.newMachineId !== undefined
        ? event.target.newMachineId
        : event.target.machineId;
      if (newId !== undefined) {
        this.element.setAttribute('machine-id', newId);
      }
    }

    /**
     * Event callback in case a config is updated: (re-)start the component
     *
     * @param {*} event
    */
    onConfigChange (event) {
      if (event.target.config == 'showAlarmBelowIcon') {
        let showAlarmBelowIcon = this.getConfigOrAttribute('showAlarmBelowIcon', false);
        if (showAlarmBelowIcon == 'true') {
          if (this._isAlarm) {
            this.displayAlarm();
          }
        }
        else {
          $(this.element).find('.currenticoncncalarm-text').remove();
        }
      }
      if (event.target.config == 'showUnknownAlarm') {
        // let showUnknownAlarm = this.getConfigOrAttribute('showUnknownAlarm', false);
        this._configChanged = true;
        this.start(); // Need to ask asp service again
      }
    }
  }

  pulseComponent.registerElement('x-currenticoncncalarm', CurrentIconCNCAlarmComponent, ['machine-id', 'range', 'active', 'status-context', 'machine-context']);
})();
