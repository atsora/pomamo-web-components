// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2025 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @file Various tool functions.
 */

/**
* @module pulseUtility
* @requires pulseRange
*/
var pulseRange = require('pulseRange');
var pulseConfig = require('pulseConfig');

/** Get integer from string
 * 
 * @memberof module:pulseUtility
 * @function string2int
 */
exports.string2int = function string2int (str) {
  return (str == 'null' || str == null || str == '') ? -1 : parseInt(str);
};

/** Get contrated color from rgb OR #hex
 * 
 * @memberof module:pulseUtility
 * @function getContrastColor
 */
exports.getContrastColor = function getContrastColor (hexcolor) {
  if (hexcolor.indexOf('rgb') >= 0) { // rgb format
    let nums = /(.*?)rgb\((\d+),\s*(\d+),\s*(\d+)\)/i.exec(hexcolor);
    let r = parseInt(nums[2], 10).toString(16);
    let g = parseInt(nums[3], 10).toString(16);
    let b = parseInt(nums[4], 10).toString(16);

    let yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#121212' : '#ededed'; //'black' : 'white';
  }
  else if (hexcolor.charAt(0) == '#') {
    let r = parseInt(hexcolor.substr(1, 2), 16);
    let g = parseInt(hexcolor.substr(3, 2), 16);
    let b = parseInt(hexcolor.substr(5, 2), 16);

    let yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#121212' : '#ededed'; //'black' : 'white';
  }
  else {
    return '#7F7F7F'; // Grey... best than nothing
  }
}

/** Check whether given object represents decimal or float value.
 * Replace jquery obsolete method.
 *
 * @memberof module:pulseUtility
 * @function isNumeric
 * 
 * @param {Object} value  object to check
 * @return {Boolean}
 */
exports.isNumeric = function (value) {
  if ((parseFloat(value) == parseInt(value)) && !isNaN(value)) {
    return true;
  }
  else {
    return Number(value) === value && value % 1 !== 0;
  }
}

/** Check whether given object represents decimal value or not
 *
 * @memberof module:pulseUtility
 * @function isFloat
 * 
 * @param {Object} value  object to check
 * @return {Boolean}
 */
exports.isFloat = function (value) {
  return Number(value) === value && value % 1 !== 0;
}

/** Check whether given object represents integer value or not
 *
 * @memberof module:pulseUtility
 * @function isInteger
 * 
 * @param {Object} value  object to check
 * @return {Boolean}
 */
var isInteger = exports.isInteger = function (value) {
  if ((parseFloat(value) == parseInt(value)) && !isNaN(value)) {
    return true;
  }
  else {
    return false;
  }
}

/** Check whether given object represents a boolean value or not
 *
 * @memberof module:pulseUtility
 * @function isBoolean
 *
 * @param {Object} value an object
 * @return {Boolean}
 */
exports.isBoolean = function (value) {
  if (((typeof value) === 'boolean') || ((value instanceof Boolean) == true) || (value === 'true') || (value === 'false')) {
    return true;
  }
  else {
    return false;
  }
}


/** Check whether given object represents function value or not
 *
 * @memberof module:pulseUtility
 * @function isFunction
 *
 * @param {Object} value an object
 * @return {Boolean}
 */
exports.isFunction = function (value) {
  return (value !== undefined) && (value !== null) && (Object.prototype.toString.call(value) == '[object Function]');
}

/**
 * return a string with leading 0 - for date FORMAT on 2 digits
 **/
exports.leadingZero = function (value) {
  if (value < 10) {
    return '0' + value.toString();
  }
  return value.toString();
}

/**
 * return an array of string used to gradate widget with time labels
 *
 * @memberof module:pulseUtility
 *
 * @function getTimeMarkers
 *
 * @param {Number} datetime represents seconds since 1 Jan 1970 in UTC format
 * @param {string} format time format used to format label to display
 * @return {Array}
 */
exports.getTimeMarkers = function (datetime, format) {
  let utc = moment.utc(datetime);
  let m0 = utc.local();
  let m1 = m0.clone().add(6, 'h');
  let m2 = m0.clone().add(12, 'h');
  let m3 = m0.clone().add(18, 'h');
  let m4 = m0.clone().add(1, 'd');
  let array = new Array();
  array[0] = m0.format(format);
  array[1] = m1.format(format);
  array[2] = m2.format(format);
  array[3] = m3.format(format);
  array[4] = m4.format(format);
  return array;
};

/**
 * Converts integer that represents date to a moment object in local mode.
 *
 * @memberof module:pulseUtility
 *
 * @function getMomentLocalFromUtcDate
 *
 * @param {Number} datetime Integer that represents date in utc
 * @return {Moment}
 */
exports.getMomentLocalFromUtcDate = function (datetime) {
  let moment_utc = moment(datetime).utc();
  let m = moment_utc.clone();
  return m.local();
}

/** Convert a date for the REPORT
 * 
 * It just converts the date to a LOCAL string for calling reports
 * (used in toollifemachine bar)
 * 
 * If date is not defined or if it is an empty string, an empty string is returned
 * 
 * @memberof module:pulseUtility
 * @function convertDateForReport
 *
 * @param {string|Date} date - date to send to the web service
 * @return {string} Date string for any REPORT
 */
//var convertDateForReport =
exports.convertDateForReport = function (date) {
  if (isNotDefined(date)) {
    return '';
  }
  let pad2 = function (number) {
    return ('0' + number).slice(-2);
  }
  let pad3 = function (number) {
    return ('00' + number).slice(-3);
  }

  let d = new Date(date);
  let dateString =
    d.getFullYear() + '-' +
    pad2(d.getMonth()) + '-' +
    pad2(d.getDate()) + '+' +
    pad2(d.getHours()) + '%3A' +
    pad2(d.getMinutes()) + '%3A' +
    pad2(d.getSeconds()) + '.' +
    pad3(d.getMilliseconds());

  return dateString;
}

/** Convert a date for the web service
 * 
 * It just converts the date to an ISO string
 * 
 * If date is not defined or if it is an empty string, an empty string is returned
 * 
 * @memberof module:pulseUtility
 * @function convertDateForWebService
 *
 * @param {string|Date} date - date to send to the web service
 * @return {string} Date string for the web service
 */
var convertDateForWebService = exports.convertDateForWebService = function (date) {
  if (isNotDefined(date)) {
    return '';
  }

  let d;
  if (typeof date == 'string') {
    if (date.trim() == '') {
      return '';
    }
    d = new Date(date);
  }
  else {
    d = date;
  }
  return d.toISOString();
}

/** Convert a day for the web service
 * 
 * It just converts the day to an ISO string day (not date ! )
 * 
 * If day is not defined or if it is an empty string, an empty string is returned
 * 
 * @memberof module:pulseUtility
 * @function convertDateForWebService
 *
 * @param {string|Date} date - date to send to the web service ou day string
 * @return {string} Day string for the web service = YYYY-MM-DD
 */
//var convertDayForWebService = 
exports.convertDayForWebService = function (day) {
  if (isNotDefined(day)) {
    return '';
  }

  let d;
  if (typeof day == 'string') {
    if (day.trim() == '') {
      return '';
    }
    return day;
  }
  else {
    d = new Date(day);
    return d.toISOString();
  }
}

/**
 * Callback to convert an object to a string
 * 
 * @callback toStringCallback
 * @param {Object} - Object to convert
 * @return {string} Result
 */

/** Convert a range for the web service
 * 
 * @memberof module:pulseUtility
 * @function convertRangeForWebService
 *
 * @param {Range} range - Range to convert
 * @param {toStringCallback} boundToString - Callback to convert a bound to a string
 * @return {string} string for the web service
 */
var _convertRangeForWebService //= exports.convertRangeForWebService 
  = function (range, boundToString) {
    return range.toString(boundToString);
  }

/** Convert a range for the web service
 * 
 * @memberof module:pulseUtility
 * @function convertStringRangeForWebService
 *
 * @param {StringRange} stringrange - Range of strings to convert
 * @return {string} string for the web service
 */
exports.convertStringRangeForWebService = function (stringrange) {
  return _convertRangeForWebService(stringrange, a => a);
}

/** Convert a date range for the web service
 * 
 * @memberof module:pulseUtility
 * @function convertDateRangeForWebService
 *
 * @param {DateRange} daterange - Date range to convert
 * @return {string} string for the web service
 */
var convertDateRangeForWebService = exports.convertDateRangeForWebService = function (daterange) {
  return _convertRangeForWebService(daterange, a => convertDateForWebService(a));
}

/**
 * Create range for webservice containing only 1 single date
 *
 * @memberof module:pulseUtility
 * @function createSingleRangeForWebService
 *
 * @param {string|Date} datetime String that represents the datetime in ISO 8601 format or Date
 * @return {string} range String that represents the range in ISO 8601 format: [2016-05-01T00:03:00,2016-05-01T00:03:00]
 */
exports.createSingleRangeForWebService = function (datetime) {
  let r = pulseRange.createDateRange(datetime, datetime, '[]');
  return convertDateRangeForWebService(r);
}

/**
 * Create range for webservice
 * 
 * The default inclusivity for a DateRange is:
 * [) if begin and end are not the same
 * else []
 *
 * @memberof module:pulseUtility
 *
 * @function createDateRangeForWebService
 *
 * @param {string|Date} begin - Date or string that represents the range in ISO 8601 format.
 * @param {string|Date} end - Date or string that represents the range in ISO 8601 format.
 * @return {string} range String that represents the range in ISO 8601 format: [2016-05-01T00:03:00,)
 */
exports.createDateRangeForWebService = function (begin, end) {
  let r = pulseRange.createDateRangeDefaultInclusivity(begin, end);
  return convertDateRangeForWebService(r);
}

/**
 * Display a day
 *
 * @memberof module:pulseUtility
 *
 * @function getDisplayDay
 *
 * @param {string} begin String that represents the begin day in ISO 8601 format
 * @return {string} String that represents the day
 */
exports.getDisplayDay = function (day) {
  // TODO: i18n
  if ((!day) || (day == 'null')) {
    return '';
  }
  if (day.length > 10) { // TMP code to make getRangeAround < 2016-03-07 work    
    let _day = convertDateToMoment(day); // day + midnight
    _day = _day.add(12, 'hours'); // To be sure to display the right day
    return _day.format('ll');
  }
  else {
    let _day = moment(day, 'YYYY-MM-DD');
    return _day.format('ll');
  }
}

/** Display a single date
 * 
 * @memberof module:pulseUtility
 *
 * @function displayDate
 *
 * @param {date} date - date, with bounds of type native javascript Date or ISO 8601 format
 * @param {boolean} seconds - true == show seconds
 * @return {string} String that represents the date
 */
var displayDate = exports.displayDate = function (date, seconds) {
  // TODO: i18n
  let m = convertDateToMoment(date);
  if (seconds) {
    return (m.format('ll') // Month name, day of month, year, time
      + ', ' + m.format('LTS'));  // HH:MM:Sec
  }
  else {
    return m.format('lll'); // Month name, day of month, year, time
  }
}

/** Display a date range
 * 
 * @memberof module:pulseUtility
 *
 * @function displayDateRange
 *
 * @param {Range} range - date range, with bounds of type native javascript Date or ISO 8601 format
 * @param {boolean} seconds - true == show seconds
 * @return {string} String that represents the date range
 */
//var displayDateRange = 
exports.displayDateRange = function (range, seconds) {
  let r = pulseRange.convertToDateRange(range);
  if (r.isEmpty()) {
    return '';
  }
  else { // not empty
    if (r.lower == null) {
      console.warn('displayDateRange: lower is not defined');
      if (r.upper == null) {
        return '-oo - +oo';
      }
      else {
        return '-oo - ' + displayDate(r.upper, seconds);
      }
    }
    else { // range.lower not null
      if (r.upper == null) {
        let retVal = displayDate(r.lower, seconds)
          + ' - '
          + pulseConfig.pulseTranslate ('content.inProgress', 'In progress');
        return retVal;
      }
      else { // lower and upper are defined
        if (r.lower.getTime() == r.upper.getTime()) {
          return displayDate(r.lower, seconds);
        }
        else {
          let begin_local = convertDateToMoment(r.lower);
          let end_local = convertDateToMoment(r.upper);
          if (begin_local.isSame(end_local, 'day')) {
            let retVal = begin_local.format('ll')
              + '   '
              + (seconds ? begin_local.format('LTS') : begin_local.format('LT'))
              + ' - '
              + (seconds ? end_local.format('LTS') : end_local.format('LT'));
            return retVal;
          }
          else {
            let retVal = displayDate(r.lower, seconds)
              + ' - '
              + displayDate(r.upper, seconds);
            return retVal;
          }
        }
      }
    }
  }
}

/** Display the lower time of the range
 * 
 * @memberof module:pulseUtility
 *
 * @function displayRangeLowerTime
 *
 * @param {Range} range - date range, with bounds of type native javascript Date or ISO 8601 format
 * @param {boolean} seconds - true == show seconds
 * @return {string} lower time of the range: HH:mm or HH:mm:ss
 */
//var displayRangeLowerTime = 
exports.displayRangeLowerTime = function (range, seconds) {
  let r = pulseRange.convertToDateRange(range);
  if (r.isEmpty()) {
    return '';
  }
  else { // not empty
    if (r.lower == null) {
      console.warn('displayDateRange: lower is not defined');
      return '-oo';
    }
    else { // range.lower not null
      let begin_local = convertDateToMoment(r.lower);
      return (seconds ? begin_local.format('LTS') : begin_local.format('LT'));
    }
  }
}

/** Append a date range display with separated begin and end
 * 
 * @memberof module:pulseUtility
 *
 * @function  appendDateRangeDisplay
 * output classes : range-begin / range-end / range-begin-end / range-begin-end-date
 *
 * @param {DOMElement} parent - where span will be added
 * @param {Range} range - date range, with bounds of type native javascript Date or ISO 8601 format
 * @param {boolean} seconds - true == show seconds
 * @return {boolean} true in case of success
 */
//var appendDateRangeDisplay = 
exports.appendDateRangeDisplay = function (parent, range, seconds) {

  let appendRange = function (parent, beginString, endString) {
    let spanBegin = $('<span></span>').addClass('range-begin').html(beginString);
    let spanSep = $('<span></span>').addClass('range-separator').html(' - ');
    let spanEnd = $('<span></span>').addClass('range-end').html(endString);
    $(parent).append(spanBegin).append(spanSep).append(spanEnd);
  }

  let r = pulseRange.convertToDateRange(range);
  if (r.isEmpty()) {
    return false;
  }
  else { // not empty
    if (r.lower == null) {
      console.warn('displayDateRange: lower is not defined');
      if (r.upper == null) {
        appendRange(parent, '-oo', '+oo');
        return true;
      }
      else {
        appendRange(parent, '-oo', displayDate(r.upper, seconds));
        return true;
      }
    }
    else { // range.lower not null
      if (r.upper == null) {
        appendRange(parent, displayDate(r.lower, seconds), pulseConfig.pulseTranslate ('content.inProgress', 'in progress'));
        return true;
      }
      else { // lower and upper are defined
        if (r.lower.getTime() == r.upper.getTime()) {
          // see appendRange - but unique !
          let spanRange = $('<span></span>').addClass('range-begin-end')
            .html(displayDate(r.lower, seconds));
          $(parent).append(spanRange);
          return true;
        }
        else {
          let begin_local = convertDateToMoment(r.lower);
          let end_local = convertDateToMoment(r.upper);
          if (begin_local.isSame(end_local, 'day')) {
            // see appendRange - but unique date - 2 times
            let spanDate = $('<span></span>').addClass('range-begin-end-date')
              .html(begin_local.format('ll'));
            let spanSepDT = $('<span></span>').addClass('range-separator-date-time').html(' ');
            let spanBegin = $('<span></span>').addClass('range-begin')
              .html((seconds ? begin_local.format('LTS') : begin_local.format('LT')));
            let spanSep = $('<span></span>').addClass('range-separator').html(' - ');
            let spanEnd = $('<span></span>').addClass('range-end')
              .html((seconds ? end_local.format('LTS') : end_local.format('LT')));
            $(parent).append(spanDate).append(spanSepDT)
              .append(spanBegin).append(spanSep).append(spanEnd);
            return true;
          }
          else {
            appendRange(parent, displayDate(r.lower, seconds), displayDate(r.upper, seconds));
            return true;
          }
        }
      }
    }
  }
}

/**
 * Convert a number of seconds to a string
 *
 * @memberof module:pulseUtility
 *
 * @function toHHMMSS
 *
 * @param {integer} nbSeconds number of seconds (duration)
 * @return string value
 */

exports.secondsToHHMMSS = function (nbSeconds) {
  let sec_num = parseInt(nbSeconds, 10); // don't forget the second param
  let hours = Math.floor(sec_num / 3600);
  let minutes = Math.floor((sec_num - (hours * 3600)) / 60);
  let seconds = sec_num - (hours * 3600) - (minutes * 60);

  if (hours >= 24) { hours = hours % 24; }

  if (hours < 10) { hours = '0' + hours; }
  if (minutes < 10) { minutes = '0' + minutes; }
  if (seconds < 10) { seconds = '0' + seconds; }
  return hours + ':' + minutes + ':' + seconds;
}

/**
 * Convert a duration string to a number of seconds
 *
 * @memberof module:pulseUtility
 *
 * @function HHMMSStoSeconds
 *
 * @param {string} HHHMMSS 
 * @return {integer} number of seconds (duration)
 */

exports.HHMMSStoSeconds = function (str) {
  let retVal = 0;
  let multiplier = 1;

  let splitedStr = str.split(':');
  for (let i = splitedStr.length - 1; i >= 0; i--) {
    retVal += multiplier * parseInt(splitedStr[i], 10);
    multiplier *= 60;
  }
  return retVal;
}

/**
 * search a parameter in an url and return its value
 *
 * @memberof module:pulseUtility
 *
 * @function getURLParameter
 *
 * @param {string} pageURL url address
 * @param {string} param parameter name whose name must be search in url
 * @return parameter value or null if given url do not contain this parameter name
 */
//var getURLParameter = 
exports.getURLParameter = function (pageURL, param) {
  let sQuery = pageURL.split('?')[1];
  if (sQuery) {
    let sURLVariables = sQuery.split('&');
    for (let i = 0; i < sURLVariables.length; i++) {
      let sParameterName = sURLVariables[i].split('=');
      if (sParameterName[0] == param) {
        return sParameterName[1];
      }
    }
  }
  return null;
}

/**
 * change or add a parameter in an url and return new url
 *
 * @memberof module:pulseUtility
 *
 * @function changeURLParameter
 *
 * @param {string} pageURL url address
 * @param {string} param parameter name whose name must be search in url
 * @param {string} value NEW parameter value to add in url
 * @return new URL
 */
exports.changeURLParameter = function (pageURL, param, value) {
  let sQuery = pageURL.split('?');
  if ((sQuery.length > 1) && (sQuery[1])) {
    let found = false;
    let sURLVariables = sQuery[1].split('&');
    for (let i = 0; i < sURLVariables.length; i++) {
      let sParameterName = sURLVariables[i].split('=');
      if (sParameterName[0] == param) {
        found = true;
        sParameterName[1] = value;
      }
      sURLVariables[i] = sParameterName.join('=');
    }
    if (!found) {
      sURLVariables[sURLVariables.length] = param + '=' + value;
    }
    sQuery[1] = sURLVariables.join('&');
  }
  else {
    sQuery[1] = param + '=' + value;
  }
  pageURL = sQuery.join('?');
  return pageURL;
}

/**
 * search a parameter in an url and return its values
 *
 * @memberof module:pulseUtility
 *
 * @function getURLParameterValues
 *
 * @param {string} pageURL url address
 * @param {string} param parameter name whose name must be search in url
 * @return an array with values of given parameters. if given url do not contain this parameter name, it returns an empty array 
 */
var getURLParameterValues = exports.getURLParameterValues = function (pageURL, param) {
  let splittedString = pageURL.split('?');
  let values = new Array();
  if (splittedString.length <= 1) {
    return values; // If no '?' exist
  }
  let sQuery = splittedString[1];
  if (sQuery) {
    let sURLVariables = sQuery.split('&');
    for (let i = 0; i < sURLVariables.length; i++) {
      let sParameterName = sURLVariables[i].split('=');
      if (sParameterName[0] == param) {
        values[values.length] = sParameterName[1];
      }
    }
  }
  let distinctValues = new Array();
  for (let j = 0; j < values.length; j++) {
    if (distinctValues.indexOf(values[j]) < 0) {
      distinctValues[distinctValues.length] = values[j];
    }
  }
  return distinctValues;
}

/**
 * Remove a parameter in an url and return new url
 *
 * @memberof module:pulseUtility
 *
 * @function removeURLParameter
 *
 * @param {string} pageURL url address
 * @param {string} param parameter name whose name must be search and removed in url
 * @return {string} an url
 */
//var removeURLParameter = 
exports.removeURLParameter = function (pageURL, param) {
  let splittedString = pageURL.split('?');
  if (splittedString.length == 0) {
    return '';
  }
  let newURL = splittedString[0];
  if (splittedString.length > 1) {
    let sQuery = splittedString[1];
    if (sQuery) {
      let sURLVariables = sQuery.split('&');
      for (let i = 0; i < sURLVariables.length; i++) {
        if (sURLVariables[i].length > 0) { // To avoid '?&' if any
          let sParameterName = sURLVariables[i].split('=');
          if (sParameterName[0] != param) {
            if (newURL.includes('?'))
              newURL += '&';
            else
              newURL += '?'
            newURL += sURLVariables[i];
          }
        }
      }
    }
  }
  return newURL;
}


/**
 * Remove a parameter in an url and return new url
 *
 * @memberof module:pulseUtility
 *
 * @function removeURLParameterContaining
 *
 * @param {string} pageURL url address
 * @param {string} param parameter whose name must be search and removed in url (*param*)
 * @return {string} an url
 */
//var removeURLParameterContaining = 
exports.removeURLParameterContaining = function (pageURL, param) {
  let splittedString = pageURL.split('?');
  if (splittedString.length == 0) {
    return '';
  }
  let newURL = splittedString[0];
  if (splittedString.length > 1) {
    let sQuery = splittedString[1];
    if (sQuery) {
      let sURLVariables = sQuery.split('&');
      for (let i = 0; i < sURLVariables.length; i++) {
        let sParameterName = sURLVariables[i].split('=');
        if (!sParameterName[0].includes(param)) {
          if (newURL.includes('?'))
            newURL += '&';
          else
            newURL += '?'
          newURL += sURLVariables[i];
        }
      }
    }
  }
  return newURL;
}

/**
 * search machine id parameter in an url and return its values.
 * This function look for all possible identifier of machine id parameter in url.
 *
 * @memberof module:pulseUtility
 *
 * @function getMachineIdParameterValue
 *
 * @param {string} pageURL url address
 * @return an array with values of machine id parameter values. if given url do not contain this parameter name, it returns an empty array 
 */
exports.getMachineIdParameterValue = function (pageURL) {
  let identifiers = ['machine', 'machine-ids'];
  let values = new Array();
  for (let id = 0; id < identifiers.length; id++) {
    values = getURLParameterValues(pageURL, identifiers[id]);
    if (values.length > 0) {
      return values;
    }
  }
  return values;
}

/**
 * search machine id parameter in an url and return its values.
 * This function look for all possible identifier of machine id parameter in url.
 *
 * @memberof module:pulseUtility
 *
 * @function getALLMachineIdParameterValue - TODO : REMOVE
 *
 * @param {string} pageURL url address
 * @return an array with values of machine id parameter values. if given url do not contain this parameter name, it returns an empty array 
 */
exports.getALLMachineIdParameterValue = function (pageURL) {
  let identifiers = ['machine', 'machine-ids', 'selected-machine-id', 'machinetop'];
  let values = new Array();
  for (let i = 0; i < identifiers.length; i++) {
    let tmpvalues = new Array();
    tmpvalues = getURLParameterValues(pageURL, identifiers[i]);
    values = values.concat(tmpvalues);
  }
  return values;
}

/**
 * search ALL parameters excluding machine id parameter in an url and return a string.
 *
 * @memberof module:pulseUtility
 *
 * @function getParametersExceptingMachineId
 *
 * @param {string} pageURL url address
 * @return an array with values of machine id parameter values. if given url do not contain this parameter name, it returns an empty array 
 */
exports.getParametersExceptingMachineId = function (pageURL) {
  let retString = '';
  let splittedString = pageURL.split('?');
  if (splittedString.length == 0) {
    console.log('pulseUtility.getParametersExceptingMachineId : no URL found !');
  }
  if (splittedString.length > 1) {
    let sQuery = splittedString[1];
    if (sQuery) {
      let sURLVariables = sQuery.split('&');
      for (let i = 0; i < sURLVariables.length; i++) {
        let sParameterName = sURLVariables[i].split('=');
        if ((sParameterName[0] != 'machine') &&
          (sParameterName[0] != 'machine-ids') &&
          (sParameterName[0] != 'selected-machine-id') &&
          (sParameterName[0] != 'machinetop')) {
          retString += '&' + sParameterName[0] + '=' + sParameterName[1];
        }
      }
    }
  }
  return retString;
}

/**
 * check if a value is not defined means that it is null or undefined
 *
 * @memberof module:pulseUtility
 *
 * @function isNotDefined
 *
 * @param value value to check
 * @return {Boolean}
 */
var isNotDefined = exports.isNotDefined = function (value) {
  if ((value === null) || (value == 'null') ||
    (value === undefined) || (typeof value == 'undefined')) {
    return true;
  }
  else {
    return false;
  }
}

/**
 *Get a duration in seconds and returns a text that represents
 *this duration in days, hours, minutes and seconds
 *
 * @memberof module:pulseUtility
 *
 * @function getTextDuration
 *
 * @param {Number} duration in seconds
 * @return {string}
 */
exports.getTextDuration = function (duration) {
  let seconds = parseInt(duration, 10);

  let days = Math.floor(seconds / (24 * 60 * 60));
  let hours = Math.floor((seconds - (days * 24 * 60 * 60)) / (60 * 60));
  let mins = Math.floor((seconds - (days * 24 * 60 * 60) - (hours * 60 * 60)) / 60);
  let secs = seconds - (days * 24 * 60 * 60) - (hours * 60 * 60) - (mins * 60);

  let text = '';

  if (days > 0) {
    text += days + ' d  ';
  }

  if (hours > 0) {
    text += hours + ' h ';
  }

  if (mins > 0) {
    text += mins + ' min ';
  }

  if ((days == 0) && (hours == 0) && (mins <= 5)) {
    if (secs > 0) {
      text += secs + ' sec ';
    }
  }
  return text;
}

/**
 * Get a duration in seconds and returns a text that represents
 *this duration in hours, minutes
 *
 * @memberof module:pulseUtility
 *
 * @function getHoursMinutesDuration
 *
 * @param {Number} duration in seconds
 * @return {string} 0:00 formatted text
 */
exports.getHoursMinutesDuration = function (duration) {
  let seconds = parseInt(duration, 10);

  let hours = Math.floor(seconds / (60 * 60));
  let mins = Math.floor((seconds - (hours * 60 * 60)) / 60);
  //let secs = seconds - (days *24 * 60 * 60) - (hours * 60 * 60) - (mins * 60);

  let text = hours + ':' + (mins > 9 ? '' + mins : '0' + mins);
  return text;
}

/**
 * Get a duration in seconds and returns remaining seconds after
 * text displayed with getHoursMinutesDuration
 *
 * @memberof module:pulseUtility
 *
 * @function getRemainingSecondsDuration
 *
 * @param {Number} duration in seconds
 * @return {Number}
 */
exports.getRemainingSecondsDuration = function (duration) {
  let seconds = parseInt(duration, 10);

  //let hours = Math.floor(seconds / (60 * 60));
  let mins = Math.floor(seconds / 60);
  let secs = seconds - (mins * 60);

  return secs;
}


/**
 * Convert datetime in iso string format to a moment object
 *
 * @memberof module:pulseUtility
 *
 * @function convertDateToMoment
 *
 * @param {string|Date} date Date or string that represends a date/time
 * @return {Moment} a moment object if parameter has right format otherwise null
 */
var convertDateToMoment = exports.convertDateToMoment = function (date) {
  let d;
  if (typeof lower == 'string') {
    d = new Date(date);
  }
  else {
    d = date;
  }
  let m = moment(d);
  if (!m.isValid()) {
    return null;
  }
  else {
    return m;
  }
}


/**
 * Convert moment object to datetime in iso string format 'YYYY-MM-DDTHH:mm:ssZ'
 * 
 *
 * @memberof module:pulseUtility
 *
 * @function convertMomentToDateTimeString
 *
 * @param {Moment} m dateTimeString representation of datetime with following format: 'YYYY-MM-DDTHH:mm:ssZ' / 'YYYY-MM-DDTHH:mm:ss.SSSZ'
 *
 * @return {string} a string object 
 */
exports.convertMomentToDateTimeString = function convertMomentToDateTimeString (m) {
  if (m.isValid()) {
    return m.toISOString();
  }
  else {
    return null;
  }
}
/** Default date format */
exports.defaultDateFormat = 'L';
/** Default time format*/
exports.defaultTimeFormat = 'LT';
/** Default time format with second*/
exports.defaultTimeFormatWithSecond = 'LTS';


/**
 * Function used to get default locate from navigator
 * 
 * @memberof module:pulseUtility
 * @function getDefaultLocale
 * 
 * @return Default locale
 */
exports.getDefaultLocale = function () {
  let locale = window.navigator.languages || [window.navigator.language || window.navigator.userLanguage];
  return locale[0];
}

/**
 * return true if time format for default locale use meridian(AM/PM)
 *  otherwise false
 * 
 * @memberof module:pulseUtility
 * @function is24HoursFormat
 *
 * @return {boolean} true if in 24 hours format
 */
exports.is24HoursFormat = function () {
  let longDateFormat = moment.localeData().longDateFormat('LTS').toUpperCase();
  if ((longDateFormat.indexOf('A') >= 0) || (longDateFormat.indexOf('P') >= 0)) {
    return false;
  }
  return true;
}


/**
 * Function used to return jQuery element with given tag name and attribute
 *
 * @memberof module:pulseUtility
 * @function createjQueryElementWithAttribute
 *
 * @param {string} tagName tag name
 *
 * @param {Object} an object in key-value form which represents attribute of element to create
 *
 * @return {DOMElement} a jQuery element 
 */
var createjQueryElementWithAttribute = exports.createjQueryElementWithAttribute = function (tagName, attributes) {
  let elt = null;

  if (window.navigator.userAgent.includes('Chrome')) {
    let str = '<' + tagName + ' ';
    for (let key in attributes) {
      let value = attributes[key];
      if (value) {
        str = str + key + "='" + value + "' ";
      }
    }
    str = str + '></' + tagName + '>';
    elt = $(str);
  }
  else {
    let domElt = document.createElement(tagName);
    for (let key in attributes) {
      let value = attributes[key];
      if (value) {
        domElt.setAttribute(key, value);
      }
    }
    elt = $(domElt);
  }

  /*else 
    let str = '<' + tagName + ' ';
    for (let key in attributes) {
      let value = attributes[key];
      if (value) {
        str = str + key + "='" + value + "' ";
      }
    }
    str = str + '></' + tagName + '>';
    elt = $(str);
  */

  /*if( !(elt.get(0) instanceof PulseComponent) ){
    console.log("Created element is not an instance of PulseComponent");
  }*/

  return elt;

  /*
  let domElt = document.createElement(tagName);
  for (let key in attributes) {
    let value = attributes[key];
    if(value){
      domElt.setAttribute(key, value);
    }
  }
  return $(domElt);*/
}

/**
 * Check if xTagName exists in body. If not, create it - useful to call addModification
 *
 * @memberof module:pulseUtility
 * @function getOrCreateSingleton
 *
 * @param {string} xTagName
 * @param {json} attributes (can be undefined)
 * @return {xTag} true searched element
 */
exports.getOrCreateSingleton = function (xTagName, attributes) {
  let attr = (null == attributes) ? {} : attributes;
  let tag = $('body').find(xTagName);
  if (tag.length == 0) {
    tag = createjQueryElementWithAttribute(xTagName, attr);
    $('body').append(tag);
  }
  if (tag.length > 0) {
    return tag[0];
  }
  return null; // Hope never !
}

/**
 * Check if DOM element has class
 *
 * @memberof module:pulseUtility
 * @function hasClass
 *
 * @param {DOMElement} element
 * @param {string} className
 * @return {Boolean} true if given element has class name, false otherwise
 */
exports.hasClass = function (element, className) {
  return element.className && new RegExp('(^|\\s)' + className + '(\\s|$)').test(element.className);
}

/** Create a cookie
 * 
 * @memberof module:pulseUtility
 * @function createCookie
 *
 */
var createCookie = exports.createCookie = function (name, value, days) {
  let expires;
  if (days && days > 0) {
    let date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = '; expires=' + date.toGMTString();
  }
  else {
    expires = ''; // == Expire = end of session
  }
  document.cookie = name + '=' + value + expires + '; path=/';
  // ';path=/' == global path to share with reporting
}

/** Read a cookie
 * 
 * @memberof module:pulseUtility
 * @function readCookie
 */
var readCookie =
  exports.readCookie = function (name) {
    let nameEQ = name + '=';
    let ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) == ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

var eraseCookie =
  exports.eraseCookie = function (name) {
    // erase cookie is done in x-checkcurrenttime.js
    createCookie(name, '', -1);
  }

/** change page in url
 * 
 * @memberof module:pulseUtility
 * @function changePageName
 */
exports.changePageName = function (href, newPageName) {
  //let href = window.location.href; // ".../pagename.html?xxx"
  let splitUrl = href.split('?');
  if (splitUrl.length < 1) {
    return href; // No change
  }
  let posPt = splitUrl[0].lastIndexOf('.');
  let posSlash = splitUrl[0].lastIndexOf('/');
  if ((posPt != -1) && (posSlash != -1)) { // Found both
    let crtPage = (splitUrl[0].slice(posSlash + 1, posPt));
    splitUrl[0] = splitUrl[0].replace(crtPage, newPageName);

    return splitUrl.join('?');
  }
  return href;
}

/** get current page
 * 
 * @memberof module:pulseUtility
 * @function getCurrentPageName
 */
exports.getCurrentPageName = function () {
  let href = window.location.href; // ".../pagename.html?xxx"
  let splitUrl = href.split('?');
  if (splitUrl.length < 1) {
    return '';
  }
  let posPt = splitUrl[0].lastIndexOf('.');
  let posSlash = splitUrl[0].lastIndexOf('/');
  if ((posPt != -1) && (posSlash != -1)) { // Found both
    return (splitUrl[0].slice(posSlash + 1, posPt));
  }
  return '';
}

/**
 * Create a convenient object that can store and retrieve data attached to divisions having specific ids
 * Used (at least) by customdialog and machine selection
 */
exports.createDataManager = function (idName) {
  return {
    _idName: idName,
    _id: 0,
    _data: [],
    createNewId: function () {
      this._data[this._id] = {};
      return this._id++;
    },
    initializeIdAttribute: function (selector, id) {
      $(selector).attr(this._idName, id);
    },
    getId: function (selector) {
      if ($(selector).length) {
        let attribute = $(selector).attr(this._idName);
        if (attribute == undefined || attribute === false) {
          // Search in parents
          let parent = $(selector)[0].closest('[' + this._idName + ']');
          if ($(parent).length > 0) {
            attribute = $(parent).attr(this._idName);
          }
          if (attribute == undefined || attribute === false) {
            throw "Selector '" + selector + "' has no attribute '" + this._idName + "'";
          }
        }
        let id = parseInt(attribute);
        if (id < 0 || id >= this._id) {
          throw 'Bad ' + this._idName + " '" + id + "' for selector '" + selector + "'";
        }
        return id;
      }
      else {
        throw "Selector '" + selector + "'doesn't exist";
      }
    },
    get: function (id) {
      return this._data[id];
    },
    set: function (id, field, data) {
      this._data[id][field] = data;
    },
    reset: function (id) {
      this._data[id] = null;
    }
  };
}

exports.addToolTip = function (element, text) {
  // Set the tooltip text
  // Replace $(element).attr('title', text); EVEN in a part of svg

  $(element).attr('tooltip', text);

  // Trigger the display
  $(element).hover(function () {
    // Hover over code
    let tooltip = $(this).attr('tooltip');
    if (tooltip != null && tooltip.length > 0) {
      $(this).removeAttr('title'); // In case it is defined by error to avoid 2 tooltips
      if ($('.mastertooltip').length == 0 && !$(this).hasClass('tooltip_disabled')) {
        $('<p class="mastertooltip"></p>')
          .text(tooltip)
          .appendTo('body')
          .fadeIn(400);
      }
    }
  }, function () {
    // Hover out code
    $('.mastertooltip').remove();
  }).mousemove(function (e) {
    // X
    if (e.pageX <= $(window).width() / 2) {
      let mousex = e.pageX + 20; // Get X coordinates
      $('.mastertooltip').css({ left: mousex });
    }
    else {
      let mousex = e.pageX - 20
        - $('.mastertooltip').width(); // Get X coordinates
      $('.mastertooltip').css({ left: mousex });
    }

    // Y
    if (e.pageY + $('.mastertooltip').height() + 10
      <= $(window).height()) {
      let mousey = e.pageY + 10; // Get Y coordinates
      $('.mastertooltip').css({ top: mousey });
    }
    else {
      // To be tested !!!
      let mousey = e.pageY - 10 - $('.mastertooltip').height(); // Get Y coordinates
      $('.mastertooltip').css({ top: mousey });
    }
  });
}

exports.removeToolTip = function (element) {
  $(element).removeAttr('title');
  $('.mastertooltip').remove();
}

exports.cloneWithNewMachineId = function (boxtocloneid, newMachineid) {
  // Copy
  let copy = $('#' + boxtocloneid).clone(true);
  // remove boxtocloneid
  $(copy).removeAttr('id');
  // Remove all classes linked to cloned component is done in clearDynamicStateContent
  // == (init state)

  // Set machineid (after all 'remove' to be ready to display)
  $(copy).attr('machine-id', newMachineid);
  $(copy).find('*').attr('machine-id', newMachineid);

  return copy;
}

exports.cloneWithNewGroupId = function (boxtocloneid, newGroupid, isMachine) {
  // Copy
  let copy = $('#' + boxtocloneid).clone(true);
  // remove boxtocloneid
  $(copy).removeAttr('id');
  // Remove all classes linked to cloned component is done in clearDynamicStateContent
  // == (init state)

  // Set group-id (after all 'remove' to be ready to display)
  $(copy).attr('group', newGroupid); // not group-id to be able to use getConfigOrAttribute
  $(copy).find('*').attr('group', newGroupid);
  if (isMachine == true) {
    $(copy).find('*').attr('machine-id', newGroupid);
  }
  return copy;
}

exports.getTextChangeContext = function (self) {
  let textchangecontext = '';
  if (self.element.hasAttribute('textchange-context')) {
    textchangecontext = self.element.getAttribute('textchange-context');
    if (textchangecontext.search('machine-id') != -1) {
      textchangecontext += '_' + self.element.getAttribute('machine-id');
    }
    if (textchangecontext.search('group') != -1) {
      textchangecontext += '_' + self.element.getAttribute('group');
    }
  }
  return textchangecontext;
}
