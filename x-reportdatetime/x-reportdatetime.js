// Copyright (C) 2009-2023 Lemoine Automation Technologies
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

/**
 * Build a custom tag <x-reportdatetime>
 * Used by report web app
 * 
 * Parameters :
 * groupDisplayForm = DATERANGE
 * groupName. ex = 
 * dataType = DATE or DATETIME
 * webapp. Ex : Last_1_day IN
 * webappname IN
 * mindate IN
 * mindatename IN
 * maxdate IN
 * maxdatename IN
 */

(function () {

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
          $(this._minDTP).attr(isDateTime ? 'defaultdatetime' : 'defaultdate', newVal);
        } break;
        case 'maxdate': {
          let isDateTime = (this.element.getAttribute('dataType') == 'DATETIME');
          $(this._maxDTP).attr(isDateTime ? 'defaultdatetime' : 'defaultdate', newVal);
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
            $(this._minDTP).attr(isDateTime ? 'defaultdatetime' : 'defaultdate', parts[1]);
          }
        } break;
        case ('past'): {
          if (parts.length >= 3) {
            $(this._pastNb)[0].value = parts[1];
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
            $(this._minDTP).attr(isDateTime ? 'defaultdatetime' : 'defaultdate', parts[1]);
            $(this._maxDTP).attr(isDateTime ? 'defaultdatetime' : 'defaultdate', parts[2]);
          }
          else { // Exemple : in report made from another report
            if (this.element.hasAttribute('mindate')) {
              $(this._minDTP).attr(isDateTime ? 'defaultdatetime' : 'defaultdate',
                this.element.getAttribute('mindate'));
            }
            if (this.element.hasAttribute('maxdate')) {
              $(this._maxDTP).attr(isDateTime ? 'defaultdatetime' : 'defaultdate',
                this.element.getAttribute('maxdate'));
            }
          }
        } break;
        // Never default ? NO !!! Can happen when min and max are given + change parameters
        default: {
          if (this.element.hasAttribute('mindate')) {
            $(this._minDTP).attr(isDateTime ? 'defaultdatetime' : 'defaultdate',
              this.element.getAttribute('mindate'));
          }
          if (this.element.hasAttribute('maxdate')) {
            $(this._maxDTP).attr(isDateTime ? 'defaultdatetime' : 'defaultdate',
              this.element.getAttribute('maxdate'));
          }
        }
      }
    }

    _setChangeSel () {
      this._typeSelectCB[0].addEventListener('change', this.onChangeSel.bind(this), false);
      this._pastNb[0].addEventListener('change', this.onChangeSel.bind(this), false);
      this._pastUnitCB[0].addEventListener('change', this.onChangeSel.bind(this), false);
      this._currentCB[0].addEventListener('change', this.onChangeSel.bind(this), false);
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
      this._selectItemByValue(this._typeSelectCB[0], value);
    }
    _selectPastCB (value) {
      this._selectItemByValue(this._pastUnitCB[0], value);
    }
    _selectCurrentCB (value) {
      this._selectItemByValue(this._currentCB[0], value);
    }


    _fillTypeCB () {
      // Combobox
      $(this._typeSelectCB).empty();

      let optionCB = $('<option value=explicit></option>').html("From... to...");
      this._typeSelectCB.append(optionCB);
      optionCB = $('<option value=since></option>').html("Since...");
      this._typeSelectCB.append(optionCB);
      optionCB = $('<option value=past></option>').html("Past");
      this._typeSelectCB.append(optionCB);
      optionCB = $('<option value=current></option>').html("Current");
      this._typeSelectCB.append(optionCB);
    }

    _fillPastCB () {
      // Combobox
      $(this._pastUnitCB).empty();

      let optionCB = $('<option value=hour></option>').html("hour(s)")
        .addClass('hide-for-full-day');
      this._pastUnitCB.append(optionCB);
      optionCB = $('<option value=shift></option>').html("shift(s)")
        .addClass('hide-for-full-day');
      this._pastUnitCB.append(optionCB);
      optionCB = $('<option value=day selected></option>').html("day(s)");
      this._pastUnitCB.append(optionCB);
      optionCB = $('<option value=week></option>').html("week(s)");
      this._pastUnitCB.append(optionCB);
      optionCB = $('<option value=month></option>').html("month(s)");
      this._pastUnitCB.append(optionCB);
      optionCB = $('<option value=quarter></option>').html("quarter(s)");
      this._pastUnitCB.append(optionCB);
      optionCB = $('<option value=year></option>').html("year(s)");
      this._pastUnitCB.append(optionCB);

      // Remove hours and shifts if dates are required -> done using CSS !
      /*if (isDate) {
        $("#WebAppParamsDateTime_unit option[value='hour']").remove();
        $("#WebAppParamsDateTime_duration option[value='1_hour']").remove();
        $("#WebAppParamsDateTime_unit option[value='shift']").remove();
        $("#WebAppParamsDateTime_duration option[value='1_shift']").remove();
      }*/
    }

    _fillCurrentCB () {
      // Combobox
      $(this._currentCB).empty();

      let optionCB = $('<option value=1_hour></option>').html("1 hour")
        .addClass('hide-for-full-day');
      this._currentCB.append(optionCB);
      optionCB = $('<option value=1_shift></option>').html("1 shift")
        .addClass('hide-for-full-day');
      this._currentCB.append(optionCB);
      optionCB = $('<option value=1_day selected></option>').html("today");
      this._currentCB.append(optionCB);
      optionCB = $('<option value=2_day></option>').html("today + yesterday");
      this._currentCB.append(optionCB);
      optionCB = $('<option value=1_week></option>').html("1 week");
      this._currentCB.append(optionCB);
      optionCB = $('<option value=2_week></option>').html("1 weeks");
      this._currentCB.append(optionCB);
      optionCB = $('<option value=1_month></option>').html("1 month");
      this._currentCB.append(optionCB);
      optionCB = $('<option value=1_quarter></option>').html("1 quarter");
      this._currentCB.append(optionCB);
      optionCB = $('<option value=1_year></option>').html("1 year");
      this._currentCB.append(optionCB);

    }

    // return value input
    initParamForReport (divToFill, name, parameterkey, dataType, parameterType,
      defaultValue, value, required, hidden, helptext) {
      $(divToFill).addClass('parameter');
      $(divToFill).append("<input type='hidden' id='name' value='" + name + "' />");
      $(divToFill).append("<input type='hidden' id='parameterkey' value='" + parameterkey + "' />");
      $(divToFill).append("<input type='hidden' id='defaultvalue' value='" + defaultValue + "' />");
      let retInput = $("<input type='hidden' id='value' value='" + value + "' />");
      $(divToFill).append(retInput);
      $(divToFill).append("<input type='hidden' id='datatype' value='" + dataType + "' />");
      $(divToFill).append("<input type='hidden' id='parametertype' value='" + parameterType + "' />");
      $(divToFill).append("<input type='hidden' id='required' value='" + required + "' />");
      $(divToFill).append("<input type='hidden' id='helptext' value='" + helptext + "' />");
      $(divToFill).append("<input type='hidden' id='hidden' value='" + hidden + "' />");
      if (parameterkey == 'WEBAPP') {
        $(divToFill).append("<input type='hidden' id='widget' value='TEXTBOX' />");
        retInput = $("<input type='hidden' id='" + name + "_value' value= />");
        $(divToFill).append(retInput);
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
      $(this.element).empty();

      // Create DOM - Content - added in parameterGroupContent no-left-border
      this._content = $('<div></div>').addClass('pulse-report-content');
      $(this.element)
        .addClass('pulse-report-datetime')
        .append(this._content);

      let isDateTime = (this.element.getAttribute('dataType') == 'DATETIME');
      if (isDateTime) {
        this._content.addClass('pulse-report-isdatetime');
      } else {
        this._content.addClass('pulse-report-isdate');
      }

      // First row 'pulse-report-datetime-main-sel-div'

      // explicit / since / past / current
      this._typeSelectCB = $('<select class="pulse-report-datetime-type-CB" ></select>');
      this._fillTypeCB();

      // past details - ex : 1 + day
      this._pastNb = $('<input type="number" value="1" min="1" max="365"></input>')
        .addClass('pulse-report-datetime-past-number');
      this._pastUnitCB = $('<select></select>').addClass('pulse-report-datetime-past-unit-CB');
      this._fillPastCB();

      // current details
      this._currentCB = $('<select></select>').addClass('pulse-report-datetime-current-CB');
      this._fillCurrentCB();

      // WebAppParamsDateTime_row1
      let typeMainSelDiv = $('<div></div>').addClass('pulse-report-datetime-main-sel-div')
        .append(this._typeSelectCB).append(this._pastNb).append(this._pastUnitCB).append(this._currentCB);

      $(this._content).append(typeMainSelDiv);

      // DIV for min / max / loader / error 
      let minMaxDiv = $('<div></div>').addClass('pulse-report-datetime-min-max-div');

      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(minMaxDiv).append(loaderDiv);

      // Create DOM - message for error
      this._messageSpan = $('<span></span>').addClass('pulse-message').html('');
      let messageDiv = $('<div></div>').addClass('pulse-message-div')
        .append(this._messageSpan);
      $(minMaxDiv).append(messageDiv);

      // MIN / MAX - same position as loader AND error message - WebAppParamsDateTime_row3
      this._minDTP = pulseUtility.createjQueryElementWithAttribute(
        isDateTime ? 'x-datetimepicker' : 'x-datepicker', {
        'showseconds': "true"
      });

      this._minDTP.addClass('pulse-report-datetime-min-DTP');
      //.addClass('parameter'); // Used by reporting to retrieve scalarparameter
      let minDiv = $('<div></div>').addClass('pulse-report-datetime-min-div')
        .append(this._minDTP);

      this._maxDTP = pulseUtility.createjQueryElementWithAttribute(
        isDateTime ? 'x-datetimepicker' : 'x-datepicker', {
        'showseconds': "true"
      });
      this._maxDTP.addClass('pulse-report-datetime-max-DTP');
      //.addClass('parameter'); // Used by reporting to retrieve scalarparameter
      let maxDiv = $('<div></div>').addClass('pulse-report-datetime-max-div')
        .append(this._maxDTP);

      minMaxDiv.append(minDiv).append(maxDiv);
      $(this._content).append(minMaxDiv);

      // Remove the left border of the group
      $(this.element).parent().addClass('no-left-border');

      // Show / Hide for consistancy
      let rangeType = this._typeSelectCB[0].options[this._typeSelectCB[0].selectedIndex].value;
      this._showHide(rangeType);

      // On change selection => change display
      this._setChangeSel();

      // Get Attributes => change selection
      if (this.element.hasAttribute('webapp')) {
        let webAppValue = this.element.getAttribute('webapp');
        this._setSelectionFromWebApp(webAppValue);
      }

      // Hidden div for report
      let minReportDiv = $('<div></div>').addClass('pulse-report-hidden');
      this.initParamForReport(minReportDiv,
        this.element.getAttribute('mindatename'), 'MINDATE', // name, parameterkey
        this.element.getAttribute('dataType'), // dataType = 'DATE':'DATETIME'
        'SIMPLE', '', '', // , parameterType, defaultValue, value, 
        'false', 'false', ''); // required, hidden, helptext
      minMaxDiv.append(minReportDiv);

      let maxReportDiv = $('<div></div>').addClass('pulse-report-hidden');
      this.initParamForReport(maxReportDiv,
        this.element.getAttribute('maxdatename'), 'MAXDATE', // name, parameterkey
        this.element.getAttribute('dataType'), // dataType = 'DATE':'DATETIME'
        'SIMPLE', '', '', // parameterType, defaultValue, value, 
        'false', 'false', ''); // required, hidden, helptext
      minMaxDiv.append(maxReportDiv);

      let webappReportDiv = $('<div></div>').addClass('pulse-report-hidden');
      this._webAppValue = this.initParamForReport(webappReportDiv,
        this.element.getAttribute('webappname'), 'WEBAPP', // name, parameterkey
        'STRING', // dataType
        'SIMPLE', '', '', // parameterType, defaultValue, value, 
        'false', 'true', ''); // required, hidden, helptext
      minMaxDiv.append(webappReportDiv);

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
      $(this.element).empty();
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
        this.switchToKey('Error', () => this.displayError('invalid groupDisplayForm'), () => this.removeError());
        return;
      }
      if (!this.element.hasAttribute('groupName')) {
        console.error('missing attribute groupName in reportdatetime.element');
        // Delayed display :
        //this.setError('missing groupName');
        // or
        // Immediat display :
        this.switchToKey('Error', () => this.displayError('invalid groupName'), () => this.removeError());
        return;
      }
      if (!this.element.hasAttribute('dataType')) {
        console.error('missing attribute dataType in reportdatetime.element');
        // Delayed display :
        //this.setError('missing dataType');
        // or
        // Immediat display :
        this.switchToKey('Error', () => this.displayError('invalid dataType'), () => this.removeError());
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
        $(this._messageSpan).html(text);
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
        this._pastNb.show();
        this._pastUnitCB.show();
      }
      else {
        this._pastNb.hide();
        this._pastUnitCB.hide();
      }

      if (rangeType == 'current') {
        this._currentCB.show();
      }
      else {
        this._currentCB.hide();
      }

      switch (rangeType) {
        case ('since'): {
          // only from visible + enabled
          //$(this._minDTP).show();
          //$(this._minDTP).enable();
          this._minDTP.prop('disabled', false);

          $(this._maxDTP).hide();
        } break;
        case ('explicit'): {
          // visible + enabled
          $(this._maxDTP).show();

          //$(this._minDTP).enable();
          this._minDTP.prop('disabled', false);
          this._maxDTP.prop('disabled', false);
          //$(this._maxDTP).enable();
        } break;
        case ('current'):
        case ('past'):
        default: {
          {
            // visible + disabled
            $(this._maxDTP).show();

            this._minDTP.prop('disabled', true);
            this._maxDTP.prop('disabled', true);
            //$(this._minDTP).disable();
            //$(this._maxDTP).disable();
          } break;
        }
      }
    }

    _storeWebAppValue () {
      let webapprange = this.getWebAppRange();
      $(this._webAppValue).attr('value', webapprange);
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
        let number = $(this._pastNb)[0].value;
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
        $(this._minDTP).attr('defaultdatetime', r.lower);
        $(this._maxDTP).attr('defaultdatetime', r.upper);
      }
      else {
        // YYYY-MM-DD
        let r = pulseRange.createStringRangeFromString(data.DayRange);
        $(this._minDTP).attr('defaultdate', r.lower);
        $(this._maxDTP).attr('defaultdate', r.upper);
      }

      this._storeWebAppValue();
    }

    // Callback events

    onChangeSel () {
      // Show / Hide
      let rangeType = this._typeSelectCB[0].options[this._typeSelectCB[0].selectedIndex].value;
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
      if (!this._beginDTP[0].isValid()) {
        //pulseCustomDialog.openError('Start date/time is not valid.');
        return false;
      }
      if (!this._endDTP[0].isValid()) {
        //pulseCustomDialog.openError('End date/time is not valid.');
        return false;
      }
      if (null == this._endDTP[0].getISOValue()) {
        //pulseCustomDialog.openError('End date/time is not valid.');
        return false;
      }

      let beginDateTime = new Date(this._beginDTP[0].getISOValue());
      let endDateTime = new Date(this._endDTP[0].getISOValue());

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
      return this._minDTP[0].getValueAsIs();
    }

    getMaxValueAsIs () { //'YYYY-MM-DD HH:mm:ss 
      return this._maxDTP[0].getValueAsIs();
    }

    getWebAppRange () {
      let rangeType = this._typeSelectCB[0].options[this._typeSelectCB[0].selectedIndex].value;

      let retVal = rangeType + '_';
      switch (rangeType) {
        case ('since'): {
          retVal += this.getMinValueAsIs();
        } break;
        case ('explicit'): {
          retVal += this.getMinValueAsIs() + '_' + this.getMaxValueAsIs();
        } break;
        case ('current'): {
          retVal += this._currentCB[0].options[this._currentCB[0].selectedIndex].value;
        } break;
        case ('past'): {
          let number = this._pastNb[0].value;
          let unit = this._pastUnitCB[0].options[this._pastUnitCB[0].selectedIndex].value;
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
