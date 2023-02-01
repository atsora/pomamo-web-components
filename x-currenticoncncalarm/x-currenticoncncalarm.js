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
        /*if (this.element.hasAttribute('machine-context')) {
          eventBus.EventBus.addEventListener(this, 
            'machineIdChangeSignal',
            this.element.getAttribute('machine-context'),
            this.onMachineIdChange.bind(this));
        }*/
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
        this.setError('missing machine-id'); // delayed error message
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        console.error('invalid attribute machine-id in currenticoncncalarm.element');
        this.switchToKey('Error', () => this.displayError('invalid machine-id'), () => this.removeError());
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

        // NO Tooltips here - specific alarm tooltip !!!!
        /*let tooltip = this.getTranslation('iconTooltip', '');
        if (tooltip != '') {
          pulseUtility.addToolTip(this._image, tooltip);
        }*/

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

  pulseComponent.registerElement('x-currenticoncncalarm', CurrentIconCNCAlarmComponent, ['machine-id', 'active', 'status-context']);
})();
