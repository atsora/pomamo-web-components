// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-reportdatetime
 * @requires module:pulseComponent
 *
 */
var pulseComponent = require('pulsecomponent');
var pulseRange = require('pulseRange');
var pulseUtility = require('pulseUtility');

require('x-datepicker/x-datepicker');
require('x-datetimepicker/x-datetimepicker');

(function () {

  /**
   * `<x-reportdatetime>` — date / datetime range selector with preset
   * shortcuts.
   *
   * Renders a type combo (`From... to...` / `Since...` / `Past` /
   * `Current`), a `Past` numeric input + unit combo, a `Current` preset
   * combo and a pair of `x-datepicker` / `x-datetimepicker` (selected by
   * `dataType`). Resolves preset ranges via
   * `Time/PastRange/<n>_<unit>` or `Time/CurrentRange/<key>`; for the
   * explicit / since modes the user picks dates directly and no AJAX is
   * issued (`_runAlternateGetData()` short-circuits). The component
   * mirrors the selection into hidden parameter inputs
   * (`mindatename`, `maxdatename`, `webappname`) and exposes
   * `isValid` / `getValueAsIs` / `getMinValueAsIs` /
   * `getMaxValueAsIs` / `getWebAppRange`. Always reports
   * `isVisible === true`.
   *
   * @element x-reportdatetime
   * @attr {string} groupDisplayForm display form type (e.g. `'DATERANGE'`)
   * @attr {string} groupName        parameter group name
   * @attr {string} dataType         `'DATE'` or `'DATETIME'`
   * @attr {string} webapp           preset value (e.g. `'past_1_day'`)
   * @attr {string} webappname       parameter name for the preset
   * @attr {string} mindate          initial minimum date
   * @attr {string} mindatename      parameter name for the minimum date
   * @attr {string} maxdate          initial maximum date
   * @attr {string} maxdatename      parameter name for the maximum date
   * @method isValid              `true` when both pickers carry a valid range
   * @method getValueAsIs         value matching the `mindatename` or `maxdatename` request
   * @method getMinValueAsIs      current minimum value (`YYYY-MM-DD[ HH:mm:ss]`)
   * @method getMaxValueAsIs      current maximum value (`YYYY-MM-DD[ HH:mm:ss]`)
   * @method getWebAppRange       current preset encoded as a single string
   * @extends pulseComponent.PulseParamAutoPathSingleRequestComponent
   */
  class ReportDateTimeComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      self._content = undefined;

      self.methods = {
        isValid: self.isValid,
        getValueAsIs: self.getValueAsIs,
        getMinValueAsIs: self.getMinValueAsIs,
        getMaxValueAsIs: self.getMaxValueAsIs,
        getWebAppRange: self.getWebAppRange
        //,getWebAppRangeFromMinMax: self.getWebAppRangeFromMinMax // static
      };

      // DOM: never in constructor, use the initialize method instead

      return self;
    }

    //get content () { return this._content; } // Optional

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'groupDisplayForm':
          this.start(); // restart the component. == validate + send ajax request
          break;
        case 'groupName':
          this.start(); // restart the component. == validate + send ajax request
          break;
        case 'dataType':
          this.reset(); // Call initialize again
          break;
        case 'webapp':
          this._setSelectionFromWebApp(newVal);
          // show / hide is done by change selection - not needed here
          //this.start(); // validate + send ajax request when needed - done by change selection
          break;
        case 'mindate': {
          let isDateTime = (this.element.getAttribute('dataType') == 'DATETIME');
          this._minDTP.setAttribute(isDateTime ? 'defaultdatetime' : 'defaultdate', newVal);
        } break;
        case 'maxdate': {
          let isDateTime = (this.element.getAttribute('dataType') == 'DATETIME');
          this._maxDTP.setAttribute(isDateTime ? 'defaultdatetime' : 'defaultdate', newVal);
        } break;
        default:
          break;
      }
    }

    _setSelectionFromWebApp (val) {
      // show / hide is done by change selection - not needed here

      let isDateTime = (this.element.getAttribute('dataType') == 'DATETIME');
      let parts = val.split("_");
      this._selectTypeCB(parts[0]);
      switch (parts[0]) {
        case ('since'): {
          if (parts.length >= 2) {
            this._minDTP.setAttribute(isDateTime ? 'defaultdatetime' : 'defaultdate', parts[1]);
          }
        } break;
        case ('past'): {
          if (parts.length >= 3) {
            this._pastNb.value = parts[1];
            this._selectPastCB(parts[2]);
          }
        } break;
        case ('current'): {
          if (parts.length >= 3) {
            this._selectCurrentCB(parts[1] + '_' + parts[2]);
          }
        } break;
        case ('explicit'): {
          if (parts.length >= 3) {
            this._minDTP.setAttribute(isDateTime ? 'defaultdatetime' : 'defaultdate', parts[1]);
            this._maxDTP.setAttribute(isDateTime ? 'defaultdatetime' : 'defaultdate', parts[2]);
          }
          else { // Exemple : in report made from another report
            if (this.element.hasAttribute('mindate')) {
              this._minDTP.setAttribute(isDateTime ? 'defaultdatetime' : 'defaultdate',
                this.element.getAttribute('mindate'));
            }
            if (this.element.hasAttribute('maxdate')) {
              this._maxDTP.setAttribute(isDateTime ? 'defaultdatetime' : 'defaultdate',
                this.element.getAttribute('maxdate'));
            }
          }
        } break;
        // Never default ? NO !!! Can happen when min and max are given + change parameters
        default: {
          if (this.element.hasAttribute('mindate')) {
            this._minDTP.setAttribute(isDateTime ? 'defaultdatetime' : 'defaultdate',
              this.element.getAttribute('mindate'));
          }
          if (this.element.hasAttribute('maxdate')) {
            this._maxDTP.setAttribute(isDateTime ? 'defaultdatetime' : 'defaultdate',
              this.element.getAttribute('maxdate'));
          }
        }
      }
    }

    _setChangeSel () {
      this._typeSelectCB.addEventListener('change', this.onChangeSel.bind(this), false);
      this._pastNb.addEventListener('change', this.onChangeSel.bind(this), false);
      this._pastUnitCB.addEventListener('change', this.onChangeSel.bind(this), false);
      this._currentCB.addEventListener('change', this.onChangeSel.bind(this), false);
    }

    _selectItemByValue (elmnt, value) {
      for (let i = 0; i < elmnt.options.length; i++) {
        if (elmnt.options[i].value === value) {
          elmnt.selectedIndex = i;
          break;
        }
      }
    }
    _selectTypeCB (value) {
      this._selectItemByValue(this._typeSelectCB, value);
    }
    _selectPastCB (value) {
      this._selectItemByValue(this._pastUnitCB, value);
    }
    _selectCurrentCB (value) {
      this._selectItemByValue(this._currentCB, value);
    }


    _fillTypeCB () {
      // Combobox
      this._typeSelectCB.replaceChildren();

      let optionCB = document.createElement('option');
      optionCB.value = 'explicit';
      optionCB.textContent = 'From... to...';
      this._typeSelectCB.appendChild(optionCB);
      optionCB = document.createElement('option');
      optionCB.value = 'since';
      optionCB.textContent = 'Since...';
      this._typeSelectCB.appendChild(optionCB);
      optionCB = document.createElement('option');
      optionCB.value = 'past';
      optionCB.textContent = 'Past';
      this._typeSelectCB.appendChild(optionCB);
      optionCB = document.createElement('option');
      optionCB.value = 'current';
      optionCB.textContent = 'Current';
      this._typeSelectCB.appendChild(optionCB);
    }

    _fillPastCB () {
      // Combobox
      this._pastUnitCB.replaceChildren();

      let optionCB = document.createElement('option');
      optionCB.value = 'hour';
      optionCB.textContent = 'hour(s)';
      optionCB.classList.add('hide-for-full-day');
      this._pastUnitCB.appendChild(optionCB);
      optionCB = document.createElement('option');
      optionCB.value = 'shift';
      optionCB.textContent = 'shift(s)';
      optionCB.classList.add('hide-for-full-day');
      this._pastUnitCB.appendChild(optionCB);
      optionCB = document.createElement('option');
      optionCB.value = 'day';
      optionCB.selected = true;
      optionCB.textContent = 'day(s)';
      this._pastUnitCB.appendChild(optionCB);
      optionCB = document.createElement('option');
      optionCB.value = 'week';
      optionCB.textContent = 'week(s)';
      this._pastUnitCB.appendChild(optionCB);
      optionCB = document.createElement('option');
      optionCB.value = 'month';
      optionCB.textContent = 'month(s)';
      this._pastUnitCB.appendChild(optionCB);
      optionCB = document.createElement('option');
      optionCB.value = 'quarter';
      optionCB.textContent = 'quarter(s)';
      this._pastUnitCB.appendChild(optionCB);
      optionCB = document.createElement('option');
      optionCB.value = 'year';
      optionCB.textContent = 'year(s)';
      this._pastUnitCB.appendChild(optionCB);

      // Remove hours and shifts if dates are required -> done using CSS !
      /*if (isDate) {
        document.querySelector("#WebAppParamsDateTime_unit option[value='hour']").remove();
        document.querySelector("#WebAppParamsDateTime_duration option[value='1_hour']").remove();
        document.querySelector("#WebAppParamsDateTime_unit option[value='shift']").remove();
        document.querySelector("#WebAppParamsDateTime_duration option[value='1_shift']").remove();
      }*/
    }

    _fillCurrentCB () {
      // Combobox
      this._currentCB.replaceChildren();

      let optionCB = document.createElement('option');
      optionCB.value = '1_hour';
      optionCB.textContent = '1 hour';
      optionCB.classList.add('hide-for-full-day');
      this._currentCB.appendChild(optionCB);
      optionCB = document.createElement('option');
      optionCB.value = '1_shift';
      optionCB.textContent = '1 shift';
      optionCB.classList.add('hide-for-full-day');
      this._currentCB.appendChild(optionCB);
      optionCB = document.createElement('option');
      optionCB.value = '1_day';
      optionCB.selected = true;
      optionCB.textContent = 'today';
      this._currentCB.appendChild(optionCB);
      optionCB = document.createElement('option');
      optionCB.value = '2_day';
      optionCB.textContent = 'today + yesterday';
      this._currentCB.appendChild(optionCB);
      optionCB = document.createElement('option');
      optionCB.value = '1_week';
      optionCB.textContent = '1 week';
      this._currentCB.appendChild(optionCB);
      optionCB = document.createElement('option');
      optionCB.value = '2_week';
      optionCB.textContent = '1 weeks';
      this._currentCB.appendChild(optionCB);
      optionCB = document.createElement('option');
      optionCB.value = '1_month';
      optionCB.textContent = '1 month';
      this._currentCB.appendChild(optionCB);
      optionCB = document.createElement('option');
      optionCB.value = '1_quarter';
      optionCB.textContent = '1 quarter';
      this._currentCB.appendChild(optionCB);
      optionCB = document.createElement('option');
      optionCB.value = '1_year';
      optionCB.textContent = '1 year';
      this._currentCB.appendChild(optionCB);

    }

    // return value input
    initParamForReport (divToFill, name, parameterkey, dataType, parameterType,
      defaultValue, value, required, hidden, helptext) {
      divToFill.classList.add('parameter');
      let inp1 = document.createElement('input');
      inp1.type = 'hidden';
      inp1.id = 'name';
      inp1.value = name;
      divToFill.appendChild(inp1);
      let inp2 = document.createElement('input');
      inp2.type = 'hidden';
      inp2.id = 'parameterkey';
      inp2.value = parameterkey;
      divToFill.appendChild(inp2);
      let inp3 = document.createElement('input');
      inp3.type = 'hidden';
      inp3.id = 'defaultvalue';
      inp3.value = defaultValue;
      divToFill.appendChild(inp3);
      let retInput = document.createElement('input');
      retInput.type = 'hidden';
      retInput.id = 'value';
      retInput.value = value;
      divToFill.appendChild(retInput);
      let inp5 = document.createElement('input');
      inp5.type = 'hidden';
      inp5.id = 'datatype';
      inp5.value = dataType;
      divToFill.appendChild(inp5);
      let inp6 = document.createElement('input');
      inp6.type = 'hidden';
      inp6.id = 'parametertype';
      inp6.value = parameterType;
      divToFill.appendChild(inp6);
      let inp7 = document.createElement('input');
      inp7.type = 'hidden';
      inp7.id = 'required';
      inp7.value = required;
      divToFill.appendChild(inp7);
      let inp8 = document.createElement('input');
      inp8.type = 'hidden';
      inp8.id = 'helptext';
      inp8.value = helptext;
      divToFill.appendChild(inp8);
      let inp9 = document.createElement('input');
      inp9.type = 'hidden';
      inp9.id = 'hidden';
      inp9.value = hidden;
      divToFill.appendChild(inp9);
      if (parameterkey == 'WEBAPP') {
        let inp10 = document.createElement('input');
        inp10.type = 'hidden';
        inp10.id = 'widget';
        inp10.value = 'TEXTBOX';
        divToFill.appendChild(inp10);
        retInput = document.createElement('input');
        retInput.type = 'hidden';
        retInput.id = name + '_value';
        retInput.value = '';
        divToFill.appendChild(retInput);
      }
      return retInput;
      /*
        <input type="hidden" id="widget" value="DATEBOX" />
  <input type="hidden" id="name" value="${scalarParameter.name}" />

  <x-datepicker id='${scalarParameter.name}_value'></x-datepicker>
      */
    }

    initialize () {
      this.addClass('pulse-text'); // Mandatory for loader
      //pulse-text / pulse-icon / pulse-lastbar / pulse-slotbar / pulse-piegauge / pulse-bigdisplay

      // Listener and dispatchers

      // In case of clone, need to be empty :
      this.element.replaceChildren();

      // Create DOM - Content - added in parameterGroupContent no-left-border
      this._content = document.createElement('div');
      this._content.classList.add('pulse-report-content');
      this.element.classList.add('pulse-report-datetime');
      this.element.appendChild(this._content);

      let isDateTime = (this.element.getAttribute('dataType') == 'DATETIME');
      if (isDateTime) {
        this._content.classList.add('pulse-report-isdatetime');
      } else {
        this._content.classList.add('pulse-report-isdate');
      }

      // First row 'pulse-report-datetime-main-sel-div'

      // explicit / since / past / current
      this._typeSelectCB = document.createElement('select');
      this._typeSelectCB.classList.add('pulse-report-datetime-type-CB');
      this._fillTypeCB();

      // past details - ex : 1 + day
      this._pastNb = document.createElement('input');
      this._pastNb.type = 'number';
      this._pastNb.value = '1';
      this._pastNb.min = '1';
      this._pastNb.max = '365';
      this._pastNb.classList.add('pulse-report-datetime-past-number');

      this._pastUnitCB = document.createElement('select');
      this._pastUnitCB.classList.add('pulse-report-datetime-past-unit-CB');
      this._fillPastCB();

      // current details
      this._currentCB = document.createElement('select');
      this._currentCB.classList.add('pulse-report-datetime-current-CB');
      this._fillCurrentCB();

      // WebAppParamsDateTime_row1
      let typeMainSelDiv = document.createElement('div');
      typeMainSelDiv.classList.add('pulse-report-datetime-main-sel-div');
      typeMainSelDiv.appendChild(this._typeSelectCB);
      typeMainSelDiv.appendChild(this._pastNb);
      typeMainSelDiv.appendChild(this._pastUnitCB);
      typeMainSelDiv.appendChild(this._currentCB);

      this._content.appendChild(typeMainSelDiv);

      // DIV for min / max / loader / error
      let minMaxDiv = document.createElement('div');
      minMaxDiv.classList.add('pulse-report-datetime-min-max-div');

      // Create DOM - Loader
      let loader = document.createElement('div');
      loader.classList.add('pulse-loader');
      loader.innerHTML = this.getTranslation('loadingDots', 'Loading...');
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.classList.add('pulse-loader-div');
      loaderDiv.appendChild(loader);
      minMaxDiv.appendChild(loaderDiv);

      // Create DOM - message for error
      this._messageSpan = document.createElement('span');
      this._messageSpan.classList.add('pulse-message');
      this._messageSpan.innerHTML = '';
      let messageDiv = document.createElement('div');
      messageDiv.classList.add('pulse-message-div');
      messageDiv.appendChild(this._messageSpan);
      minMaxDiv.appendChild(messageDiv);

      // MIN / MAX - same position as loader AND error message - WebAppParamsDateTime_row3
      this._minDTP = pulseUtility.createElementWithAttribute(
        isDateTime ? 'x-datetimepicker' : 'x-datepicker', {
        'showseconds': "true"
      });

      this._minDTP.classList.add('pulse-report-datetime-min-DTP');
      //.classList.add('parameter'); // Used by reporting to retrieve scalarparameter
      let minDiv = document.createElement('div');
      minDiv.classList.add('pulse-report-datetime-min-div');
      minDiv.appendChild(this._minDTP);

      this._maxDTP = pulseUtility.createElementWithAttribute(
        isDateTime ? 'x-datetimepicker' : 'x-datepicker', {
        'showseconds': "true"
      });
      this._maxDTP.classList.add('pulse-report-datetime-max-DTP');
      //.classList.add('parameter'); // Used by reporting to retrieve scalarparameter
      let maxDiv = document.createElement('div');
      maxDiv.classList.add('pulse-report-datetime-max-div');
      maxDiv.appendChild(this._maxDTP);

      minMaxDiv.appendChild(minDiv);
      minMaxDiv.appendChild(maxDiv);
      this._content.appendChild(minMaxDiv);

      // Remove the left border of the group
      this.element.parentElement.classList.add('no-left-border');

      // Show / Hide for consistancy
      let rangeType = this._typeSelectCB.options[this._typeSelectCB.selectedIndex].value;
      this._showHide(rangeType);

      // On change selection => change display
      this._setChangeSel();

      // Get Attributes => change selection
      if (this.element.hasAttribute('webapp')) {
        let webAppValue = this.element.getAttribute('webapp');
        this._setSelectionFromWebApp(webAppValue);
      }

      // Hidden div for report
      let minReportDiv = document.createElement('div');
      minReportDiv.classList.add('pulse-report-hidden');
      this.initParamForReport(minReportDiv,
        this.element.getAttribute('mindatename'), 'MINDATE', // name, parameterkey
        this.element.getAttribute('dataType'), // dataType = 'DATE':'DATETIME'
        'SIMPLE', '', '', // , parameterType, defaultValue, value,
        'false', 'false', ''); // required, hidden, helptext
      minMaxDiv.appendChild(minReportDiv);

      let maxReportDiv = document.createElement('div');
      maxReportDiv.classList.add('pulse-report-hidden');
      this.initParamForReport(maxReportDiv,
        this.element.getAttribute('maxdatename'), 'MAXDATE', // name, parameterkey
        this.element.getAttribute('dataType'), // dataType = 'DATE':'DATETIME'
        'SIMPLE', '', '', // parameterType, defaultValue, value,
        'false', 'false', ''); // required, hidden, helptext
      minMaxDiv.appendChild(maxReportDiv);

      let webappReportDiv = document.createElement('div');
      webappReportDiv.classList.add('pulse-report-hidden');
      this._webAppValue = this.initParamForReport(webappReportDiv,
        this.element.getAttribute('webappname'), 'WEBAPP', // name, parameterkey
        'STRING', // dataType
        'SIMPLE', '', '', // parameterType, defaultValue, value,
        'false', 'true', ''); // required, hidden, helptext
      minMaxDiv.appendChild(webappReportDiv);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    /**
      * Clear anything that was done during intialization, so that initialize can be called once again.
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

    reset () { // Optional implementation
      // Code here to clean the component when the component has been initialized for example after a parameter change
      this.removeError();
      // Empty this._content

      this.switchToNextContext();
    }

    validateParameters () {
      if (!this.element.hasAttribute('groupDisplayForm')) {
        console.error('missing attribute groupDisplayForm in reportdatetime.element');
        // Delayed display :
        //this.setError('missing display form');
        // or
        // Immediat display :
        this.switchToKey('Error', () => this.displayError(this.getTranslation('invalidGroupDisplayForm', 'Invalid groupDisplayForm')), () => this.removeError());
        return;
      }
      if (!this.element.hasAttribute('groupName')) {
        console.error('missing attribute groupName in reportdatetime.element');
        // Delayed display :
        //this.setError('missing groupName');
        // or
        // Immediat display :
        this.switchToKey('Error', () => this.displayError(this.getTranslation('invalidGroupName', 'Invalid groupName')), () => this.removeError());
        return;
      }
      if (!this.element.hasAttribute('dataType')) {
        console.error('missing attribute dataType in reportdatetime.element');
        // Delayed display :
        //this.setError('missing dataType');
        // or
        // Immediat display :
        this.switchToKey('Error', () => this.displayError(this.getTranslation('invalidDataType', 'Invalid dataType')), () => this.removeError());
        return;
      }

      this.switchToNextContext();
    }


    /**
     * @override
     */
    manageError (data) {
      super.manageError(data);
    }

    /**
     * @override
     */
    manageFailure (isTimeout, xhrStatus) {
      super.manageFailure(isTimeout, xhrStatus);
    }

    /**
     * @override
     */
    displayError (text) {
      if (typeof text == 'undefined') {
        return; // No message to display, do not display any error
      }
      if (typeof this._messageSpan !== 'undefined') {
        this._messageSpan.innerHTML = text;
      }
    }

    removeError () {
      // Code here to remove the error message. Only required if displayError is implemented
      // For example:
      this.displayError('');
    }

    // Overload to always refresh value
    get isVisible () {
      return true;
    }

    _showHide (rangeType) {

      if (rangeType == 'past') {
        this._pastNb.style.display = '';
        this._pastUnitCB.style.display = '';
      }
      else {
        this._pastNb.style.display = 'none';
        this._pastUnitCB.style.display = 'none';
      }

      if (rangeType == 'current') {
        this._currentCB.style.display = '';
      }
      else {
        this._currentCB.style.display = 'none';
      }

      switch (rangeType) {
        case ('since'): {
          // only from visible + enabled
          //this._minDTP.style.display = '';
          //this._minDTP.disabled = false;
          this._minDTP.disabled = false;

          this._maxDTP.style.display = 'none';
        } break;
        case ('explicit'): {
          // visible + enabled
          this._maxDTP.style.display = '';

          //this._minDTP.disabled = false;
          this._minDTP.disabled = false;
          this._maxDTP.disabled = false;
          //this._maxDTP.disabled = false;
        } break;
        case ('current'):
        case ('past'):
        default: {
          {
            // visible + disabled
            this._maxDTP.style.display = '';

            this._minDTP.disabled = true;
            this._maxDTP.disabled = true;
            //this._minDTP.disabled = true;
            //this._maxDTP.disabled = true;
          } break;
        }
      }
    }

    _storeWebAppValue () {
      let webapprange = this.getWebAppRange();
      this._webAppValue.setAttribute('value', webapprange);
    }

    /** Replace _runAjaxWhenIsVisible when NO url should be called
     *  return true if something is done, false if _runAjaxWhenIsVisible should be called
     */
    _runAlternateGetData () {
      let rangeType = this._typeSelectCB[0].options[this._typeSelectCB[0].selectedIndex].value;
      this._showHide(rangeType); // Always here

      if (rangeType == 'explicit' || rangeType == 'since') {
        this._storeWebAppValue();
        // (_minDateMoment, _maxDateMoment); -> need to be read
        this.switchToContext('Loaded'); // to STOP calling Ajax request
        return true;
      }
      else {
        // Call web service
        return false;
      }
    }

    getShortUrl () {
      let rangeType = this._typeSelectCB[0].options[this._typeSelectCB[0].selectedIndex].value;
      if (rangeType == 'past') {
        let number = this._pastNb.value;
        let unit = this._pastUnitCB[0].options[this._pastUnitCB[0].selectedIndex].value;
        return 'Time/PastRange/' + number + '_' + unit;
      }
      else {
        let crt = this._currentCB[0].options[this._currentCB[0].selectedIndex].value;
        return 'Time/CurrentRange/' + crt;
      }
    }

    refresh (data) {
      // Update the component with data returned by the web service in case of success
      let isDateTime = (this.element.getAttribute('dataType') == 'DATETIME');
      if (isDateTime) {
        // "YYYY-MM-DDTHH:mm:ss"
        let r = pulseRange.createStringRangeFromString(data.UtcDateTimeRange);
        this._minDTP.setAttribute('defaultdatetime', r.lower);
        this._maxDTP.setAttribute('defaultdatetime', r.upper);
      }
      else {
        // YYYY-MM-DD
        let r = pulseRange.createStringRangeFromString(data.DayRange);
        this._minDTP.setAttribute('defaultdate', r.lower);
        this._maxDTP.setAttribute('defaultdate', r.upper);
      }

      this._storeWebAppValue();
    }

    // Callback events

    onChangeSel () {
      // Show / Hide
      let rangeType = this._typeSelectCB.options[this._typeSelectCB.selectedIndex].value;
      this._showHide(rangeType);

      // Reload if necessary
      switch (rangeType) {
        case ('current'):
        case ('past'): {
          // Force re-load
          this.start();
        } break;
        case ('since'):
        case ('explicit'):
        default: {
          this._storeWebAppValue();
          // Do nothing more
        }
      }
    }

    // External methods
    isValid () { // cf _callback_validate_settings () {
      if (!this._minDTP.isValid()) {
        //pulseCustomDialog.openError('Start date/time is not valid.');
        return false;
      }
      if (!this._maxDTP.isValid()) {
        //pulseCustomDialog.openError('End date/time is not valid.');
        return false;
      }
      if (null == this._maxDTP.getISOValue()) {
        //pulseCustomDialog.openError('End date/time is not valid.');
        return false;
      }

      let beginDateTime = new Date(this._minDTP.getISOValue());
      let endDateTime = new Date(this._maxDTP.getISOValue());

      // Check the range
      if (endDateTime) {
        if (endDateTime < beginDateTime) {
          //pulseCustomDialog.openError('End date/time is before start date/time.');
          return false;
        }
        else {
          if (beginDateTime < endDateTime) {
            // Do nothing = it is OK
          }
          else {
            //pulseCustomDialog.openError('Empty period.');
            return false;
          }
        }
      }
      return true;
    } // end isValid

    getValueAsIs (name) {
      if (this.element.getAttribute('mindatename') == name) {
        return this.getMinValueAsIs();
      }
      if (this.element.getAttribute('maxdatename') == name) {
        return this.getMaxValueAsIs();
      }
      return '';
    }

    getMinValueAsIs () { //'YYYY-MM-DD HH:mm:ss
      return this._minDTP.getValueAsIs();
    }

    getMaxValueAsIs () { //'YYYY-MM-DD HH:mm:ss
      return this._maxDTP.getValueAsIs();
    }

    getWebAppRange () {
      let rangeType = this._typeSelectCB.options[this._typeSelectCB.selectedIndex].value;

      let retVal = rangeType + '_';
      switch (rangeType) {
        case ('since'): {
          retVal += this.getMinValueAsIs();
        } break;
        case ('explicit'): {
          retVal += this.getMinValueAsIs() + '_' + this.getMaxValueAsIs();
        } break;
        case ('current'): {
          retVal += this._currentCB.options[this._currentCB.selectedIndex].value;
        } break;
        case ('past'): {
          let number = this._pastNb.value;
          let unit = this._pastUnitCB.options[this._pastUnitCB.selectedIndex].value;
          retVal += number + '_' + unit;
        } break;
        default: {
          // Never
        }
      }
      return retVal;
    }
    //_storeWebAppValue
    // Get "WebAppParamsDate" from "PulseMinDate", "PulseMaxDate"
    /*
    static getWebAppRangeFromMinMax(min, max) {
      let retVal = 'explicit_' + min + '_' + max;
      return retVal;
    }
    */

  }

  pulseComponent.registerElement('x-reportdatetime', ReportDateTimeComponent,
    ['groupDisplayForm', 'groupName', 'dataType', 'webapp', 'mindate', 'maxdate',
      'mindatename', 'maxdatename', 'webappname']);
  // mindatename','maxdatename' == PulseMinDate / PulseMaxDate
})();
