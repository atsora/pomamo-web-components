// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @file Module to manipulate ranges
 * @module pulseRange
 **/

/* FOR better understanding : Separate comment - hope it is not parsed
 * 
 * // Between x-tag == attribute + event + sent to web services
 * rangeString = '[isostring, isostring)'
 * 
 * // Tmp for compatibility
 * stringRange.lower = isostring 
 * stringRange.upper = isostring 
 * 
 * // Intern use only
 * dateRange.lower = Date()
 * dateRange.upper = Date()
 * 
 * // Conversion / Creation
 * pulseRange.createDateRangeFromString
 * pulseRange.createStringRangeFromString
 * pulseUtility.createSingleRangeForWebService
 * 
 * // Use :
 * pulseUtility.convertDateRangeForWebService
 * 
 */

/**
 * Generic class range
 *
 * @class
 */
class Range {
  /**
   * Constructor: create an empty range
   */
  constructor() {
    this._lower = null;
    this._lowerInclusive = false;
    this._upper = null;
    this._upperInclusive = false;
    this._empty = true;
  }

  /**
   * Lower value of the range
   * 
   * If the range is empty, an exception 'empty range' is raised
   */
  get lower () {
    if (this._empty) {
      console.error('Range.lower: empty range');
      throw 'empty range';
    }
    return this._lower;
  }
  set lower (l) {
    this._lower = l;
    if (this._lower == null) {
      this._lowerInclusive = false;
    }
    this._empty = false;
  }

  /** 
   * Is the lower value inclusive ?
   * 
   * If the range is empty, false is returned
   */
  get lowerInclusive () {
    return !this._empty && (this._lower != null) && this._lowerInclusive;
  }
  set lowerInclusive (li) {
    this._lowerInclusive = li;
  }

  /**
   * Upper value of the range
   * 
   * If the range is empty, an exception 'empty range' is raised
   */
  get upper () {
    if (this._empty) {
      console.error('Range.upper: empty range');
      throw 'empty range';
    }
    return this._upper;
  }
  set upper (u) {
    this._upper = u;
    if (this._upper == null) {
      this._upperInclusive = false;
    }
    this._empty = false;
  }

  /** 
   * Is the upper value inclusive ?
   * 
   * If the range is empty, false is returned
   */
  get upperInclusive () {
    return !this._empty && (this._upper != null) && this._upperInclusive;
  }
  set upperInclusive (ui) {
    this._upperInclusive = ui;
  }

  /** Inclusivity: [] or () or [) or (]
   * 
   * @return {string}
   */
  get inclusivity () {
    let s;
    if (this.lowerInclusive) {
      s = '[';
    }
    else {
      s = '(';
    }
    if (this.upperInclusive) {
      s += ']';
    }
    else {
      s += ')';
    }
    return s;
  }

  /** Set the inclusivity parsing a string: '(' and ')' is for exclusive, '[' and ']' is for inclusive
   * @param {string} inclusivity - Inclusivity string to parse: [] or [) or (] or ()
   */
  parseInclusivity (inclusivity) {
    if (inclusivity.length != 2) {
      console.error(`parseInclusivity: invalid inclusivity ${inclusivity}`);
      throw 'Invalid inclusivity'
    }
    switch (inclusivity.charAt(0)) {
      case '[':
        this._lowerInclusive = true;
        break;
      case '(':
        this._lowerInclusive = false;
        break;
      default:
        console.error(`parseInclusivity: invalid lower inclusivity in ${inclusivity}`);
        throw 'Invalid inclusivity';
    }
    switch (inclusivity.charAt(1)) {
      case ']':
        this._upperInclusive = true;
        break;
      case ')':
        this._upperInclusive = false;
        break;
      default:
        console.error(`parseInclusivity: invalid upper inclusivity in ${inclusivity}`);
        throw 'Invalid inclusivity';
    }
  }

  /** Is the range empty
   * @return {boolean} The range is empty
   */
  isEmpty () {
    if (this._empty) {
      return true;
    }
    else if (this._upper != null && this._lower != null) {
      if (this._upper < this._lower) {
        return true;
      }
      else if (this._upper == this._lower && (!this._upperInclusive || !this._lowerInclusive)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Callback to convert an object to a string
   * 
   * @callback toStringCallback
   * @param {Object} - Object to convert
   * @return {string} Result
   */

  /** To string conversion
   * @param {toStringCallback} boundToString - method to call to convert the lower or upper value to a string
   * @return {string}
   */
  toString (boundToString) {
    if (this.isEmpty()) {
      return 'empty';
    }
    else {
      return `${this.lowerInclusive ? '[' : '('}${(this.lower != null) ? boundToString(this.lower) : ''},${(this.upper != null) ? boundToString(this.upper) : ''}${!this.upperInclusive ? ')' : ']'}`;
    }
  }
}

/** Create an empty range
 * 
 * @memberof module:pulseRange
 * @function createEmpty
 * 
 * @return {Range} empty range
 */
var createEmpty = exports.createEmpty = function () {
  return new Range();
}

/** Create a range with the default inclusivity [)
 * 
 * @memberof module:pulseRange
 * @function createDefaultInclusivity
 * 
 * @param {*} lower - Lower value
 * @param {*} upper - Upper value
 * @return {Range} Range
 */
var createDefaultInclusivity = exports.createDefaultInclusivity = function (lower, upper) {
  let r = new Range();
  r.lower = lower;
  r.upper = upper;
  r.lowerInclusive = true;
  r.upperInclusive = false;
  return r;
}

/** Create a range
 * 
 * @memberof module:pulseRange
 * @function create
 * 
 * @param {*} lower - Lower value
 * @param {*} upper - Upper value
 * @param {string} inclusivity - Inclusivity: () or [] or [) or (]
 * @return {Range} Range
 */
var create = exports.create = function (lower, upper, inclusivity) {
  let r = new Range();
  r.lower = lower;
  r.upper = upper;
  r.parseInclusivity(inclusivity);
  return r;
}

/** Callback to parse a string
 * 
 * @callback parseCallback
 * @param {string} - string to parse
 * @return {Object} new object
 */

/** Extended method to parse a bound, considering null values
 * 
 * @param {string} arg - string to parse
 * @param {parseCallback} parseBound - Function to call to parse not empty lower and upper values
 * @return {Object} object returned by parseBound
 */
var parseBoundExt = function (arg, parseBound) {
  let s = arg.trim();
  if ((s.length == 0) || (s == '-oo') || (s == '+oo')) {
    return null;
  }
  else {
    return parseBound(s);
  }
}

/** Create a range from a string (parse it)
 * 
 * @memberof module:pulseRange
 * @function _createFromString
 * 
 * @param {string} arg - string to parse
 * @param {parseCallback} parseBound - Function to call to parse the lower and the upper values
 * @return {Range} Range
 */
var _createFromString =
  //exports.createFromString = 
  function (arg, parseBound) {
    let s = arg.trim();

    if (s == '' || s == 'empty') {
      return createEmpty();
    }

    if (s.length < 3) {
      console.error(`createFromString: ${s} is too short`);
      throw 'Invalid string length';
    }

    let pos = s.indexOf(',');
    if (pos == -1) {
      pos = s.indexOf(';');
    }
    if (pos == -1) {
      console.error('no separator');
      throw 'Invalid range, no separator';
    }
    else { // pos != -1
      let r = new Range();
      let lowerLimitChars = ['[', '('];
      let firstChar = s.charAt(0);
      if (lowerLimitChars.indexOf(firstChar) != -1) { // char found
        r.lowerInclusive = (firstChar == '[');
        let lower = s.substr(1, pos - 1);
        r.lower = parseBoundExt(lower, parseBound);
      }
      else {
        console.warn('Invalid lower limit in ' + arg);
        r.lowerInclusive = true;
        let lower = s.substr(0, pos).trim();
        r.lower = parseBoundExt(lower, parseBound);
      }
      let upperLimitChars = [']', ')'];
      let lastChar = s.charAt(s.length - 1);
      if (upperLimitChars.indexOf(lastChar) != -1) { // char found
        r.upperInclusive = (lastChar == ']');
        let upper = s.substr(pos + 1, s.length - 1 - (pos + 1));
        r.upper = parseBoundExt(upper, parseBound);
      }
      else {
        console.warn('Invalid upper limit in ' + arg);
        r.upperInclusive = false;
        let upper = s.substr(pos + 1, s.length - (pos + 1));
        r.upper = parseBoundExt(upper, parseBound);
      }
      return r;
    }
  }

/** Range where the bounds are native Javascript dates
 * 
 * @extends Range
 */
class DateRange extends Range {
  /** Constructor: create a DateRange from a string Range or a Date range
   * 
   * @override
   * 
   * @param {Range} r - Range to convert to a DateRange
   */
  constructor(r) {
    super();
    if (!r.isEmpty()) {
      let l;
      if (typeof r.lower == 'undefined') {
        l = null;
      }
      else if (typeof r.lower == 'string') {
        let trimmed = r.lower.trim();
        if ((trimmed == '') || (trimmed == '-oo')) {
          l = null;
        }
        else {
          l = new Date(r.lower);
        }
      }
      else {
        l = r.lower;
      }
      let u;
      if (typeof r.upper == 'undefined') {
        u = null;
      }
      else if (typeof r.upper == 'string') {
        let trimmed = r.upper.trim();
        if ((trimmed == '') || (trimmed == '+oo')) {
          u = null;
        }
        else {
          u = new Date(r.upper);
        }
      }
      else {
        u = r.upper;
      }
      super.lower = l;
      super.upper = u;
      super.lowerInclusive = r.lowerInclusive;
      super.upperInclusive = r.upperInclusive;
    }
  }
}
exports.DateRange = DateRange;

/** Create a native Javascript Date range from a string (calling new Date ())
 * 
 * @memberof module:pulseRange
 * @function createDateRangeFromString
 * 
 * @param {string} arg - String to parse
 * @return {DateRange} Range
 */
var createDateRangeFromString = exports.createDateRangeFromString = function (arg) {
  return new DateRange(_createFromString(arg, s => new Date(s)));
}

/** Create a native Javascript Date range with the default inclusivity
 * [) in case lower and upper are different and [] in case lower and upper are the same
 * 
 * In case lower or upper is a string, they are automatically converted to a Date
 * 
 * @memberof module:pulseRange
 * @function createDateRangeDefaultInclusivity
 * 
 * @param {string|Date} lower - Lower value
 * @param {string|Date} upper - Upper value
 * @return {DateRange} Range
 */
exports.createDateRangeDefaultInclusivity = function (lower, upper) {
  let l;
  if ((typeof lower == 'undefined') || (lower == 'null')) {
    l = null;
  }
  else if (typeof lower == 'string') {
    let trimmed = lower.trim();
    if ((trimmed == '') || (trimmed == '-oo')) {
      l = null;
    }
    else {
      l = new Date(lower);
    }
  }
  else {
    l = lower;
  }
  let u;
  if ((typeof upper == 'undefined') || (upper == 'null')) {
    u = null;
  }
  else if (typeof upper == 'string') {
    let trimmed = upper.trim();
    if ((trimmed == '') || (trimmed == '+oo')) {
      u = null;
    }
    else {
      u = new Date(upper);
    }
  }
  else {
    u = upper;
  }
  if ((l >= u) && (l <= u)) {
    return new DateRange(create(l, u, '[]'));
  }
  else {
    return new DateRange(create(l, u, '[)'));
  }
}

/** Create a native Javascript Date range
 * 
 * In case lower or upper is a string, they are automatically converted to a Date
 * 
 * @memberof module:pulseRange
 * @function createDateRange
 * 
 * @param {string|Date} lower - Lower value
 * @param {string|Date} upper - Upper value
 * @param {string} inclusivity - Inclusivity: [] or () or [) or (]
 * @return {DateRange} Range
 */
exports.createDateRange = function (lower, upper, inclusivity) {
  return new DateRange(create(lower, upper, inclusivity));
}

/** Convert a string or Date range to a Date range
 * 
 * @memberof module:pulseRange
 * @function convertToDateRange
 * 
 * @param {Range} range - string or Date range
 * @return {DateRange} Date range
 */
exports.convertToDateRange = function (range) {
  if (typeof range == 'string')
    return createDateRangeFromString(range);
  return new DateRange(range);
}

/** Range where the bounds are strings
 * 
 * @extends Range
 */
class StringRange extends Range {
  /** Constructor: create a StringRange from a Range
   * 
   * @override
   * 
   * @param {Range} r - Range to convert to a StringRange
   */
  constructor(r) {
    super();
    if (!r.isEmpty()) {
      let l;
      if (typeof r.lower == 'undefined') {
        l = null;
      }
      else if (typeof r.lower == 'string') {
        let trimmed = r.lower.trim();
        if ((trimmed == '') || (trimmed == '-oo')) {
          l = null;
        }
        else {
          l = r.lower;
        }
      }
      else if (r.lower == null) {
        l = null;
      }
      else {
        l = r.lower.toString();
      }
      let u;
      if (typeof r.upper == 'undefined') {
        r = null;
      }
      else if (typeof r.upper == 'string') {
        let trimmed = r.upper.trim();
        if ((trimmed == '') || (trimmed == '+oo')) {
          u = null;
        }
        else {
          u = r.upper;
        }
      }
      else if (r.upper == null) {
        u = null;
      }
      else {
        u = r.upper.toString();
      }
      super.lower = l;
      super.upper = u;
      super.lowerInclusive = r.lowerInclusive;
      super.upperInclusive = r.upperInclusive;
    }
  }
}

/** Create a string range (no conversion of the lower and upper values)
 * 
 * @memberof module:pulseRange
 * @function createStringRangeFromString
 * 
 * @param {string} arg - String to parse
 * @return {StringRange} range
 */
exports.createStringRangeFromString = function (arg) {
  return new StringRange(_createFromString(arg, s => s));
}

/** Callback to compare two objects
 * 
 * @callback eqCallback
 * @param {Object} - first object
 * @param {Object} - second object
 * @return {boolean} Equality comparison between the two objects
 */

/** Check the equality between two bound objects
  * 
  * Note that the bounds must be both lower or both upper
  * 
  * @memberof module:pulseRange
  * @function boundEquals
  * 
 * @param {Object} a - First bound to compare
 * @param {Object} b - Second bound to compare
 * @param {eqCallback} eq - Method to use to compare the bounds in case they are not null
 * @return {boolean} Equality
  */
var boundEquals = exports.boundEquals = function (a, b, eq) {
  if (null == a) {
    return (null == b);
  }
  else if (null == b) {
    return false;
  }
  else { // x and y not null
    return eq(a, b);
  }
}

/** Check the equality of the range
 * 
 * @memberof module:pulseRange
 * @function equals
 * 
 * @param {Range} a - First range to compare
 * @param {Range} b - Second range to compare
 * @param {eqCallback} eq - Method to use to compare the lower and upper values (when not null)
 * @return {boolean} Equality
 */
var equals = exports.equals = function (a, b, eq) {
  if (a === b) {
    return true;
  }
  if ((null == a) && (null == b)) {
    return true;
  }
  if ((null == a) || (null == b)) {
    return false;
  }
  if (a.isEmpty() && b.isEmpty()) {
    return true;
  }
  else if (a.isEmpty() || b.isEmpty()) {
    return false;
  }
  return boundEquals(a.lower, b.lower, eq) && boundEquals(a.upper, b.upper, eq)
    && (a.lowerInclusive == b.lowerInclusive)
    && (a.upperInclusive == b.upperInclusive);
}

/** Check the equality of the range with a default value equality comparison (>= && <=)
 * 
 * @param {Range} a - First range to compare
 * @param {Range} b - Second range to compare
 * @return {boolean} Equality
 */
exports.equalsDefault = function (a, b) {
  return equals(a, b, (a, b) => (a >= b) && (b <= a)); // Because for native javascript Date, a==b does not work
}

/** Overlap operator
 * 
 * If the operator can't be applied, false is returned
 * 
 * @memberof module:pulseRange
 * @function overlaps
 * 
 * @param {Range} a - first range
 * @param {Range} b - second range
 * @return true if a and b overlap
 */
var overlaps = exports.overlaps = function (a, b) {
  if (a.isEmpty() || b.isEmpty()) {
    console.warn('overlaps: empty, return false');
    return false;
  }
  else if ((null == a.lower) && (null == a.upper)) { // (,) => true
    return true;
  }
  else if (null == a.lower) { // (,... => compare upper only
    if (null == b.lower) {
      return true;
    }
    else if ((a.upper >= b.lower) && (a.upper <= b.lower)) { // Consider inclusivity. // Note: == does not work with Date
      return b.lowerInclusive && a.upperInclusive;
    }
    else if (b.lower < a.upper) {
      return true;
    }
    else {
      return false;
    }
  }
  else if (null == a.upper) { // ...,) => compare lower only
    if (null == b.upper) {
      return true;
    }
    if (a.lower < b.upper) {
      return true;
    }
    else if ((a.lower >= b.upper) && (a.lower <= b.upper)) { // Consider inclusivity. // Note: == does not work with Date
      return b.upperInclusive && a.lowerInclusive;
    }
    else {
      return false;
    }
  }
  else { // [(...,...)]
    if ((null != b.upper) && (null != b.lower)) {
      if ((b.lower >= a.upper) && (b.lower <= a.upper)) { // Note: == does not work with Date
        return b.lowerInclusive && a.upperInclusive;
      }
      else if ((b.upper >= a.lower) && (b.upper <= a.lower)) { // Note: == does not work with Date
        return b.upperInclusive && a.lowerInclusive;
      }
      else {
        return (b.lower < a.upper) && (a.lower < b.upper);
      }
    }
    else { // Reverse it ! In b, there is -oo or +oo
      return overlaps(b, a);
    }
  }
}

/** Intersects two ranges
 * 
 * @memberof module:pulseRange
 * @function intersects
 * 
 * @param {Range} a - first range
 * @param {Range} b - second range
 * @return {Range} Intersection of the two ranges
 */
exports.intersects = function (a, b) {
  if (!overlaps(a, b)) {
    // toString(no param) == undefined -> ignore log
    return createEmpty();
  }
  else { // Overlap ok
    let lower;
    let lowerInclusive;
    if (null == a.lower) {
      lower = b.lower;
      lowerInclusive = b.lowerInclusive;
    }
    else if (null == b.lower) {
      lower = a.lower;
      lowerInclusive = a.lowerInclusive;
    }
    else if ((a.lower >= b.lower) && (a.lower <= b.lower)) { // Note: == does not work with Date
      lower = a.lower;
      lowerInclusive = a.lowerInclusive && b.lowerInclusive;
    }
    else if (a.lower < b.lower) {
      lower = b.lower;
      lowerInclusive = b.lowerInclusive;
    }
    else {
      lower = a.lower;
      lowerInclusive = a.lowerInclusive
    }

    let upper;
    let upperInclusive;
    if (null == a.upper) {
      upper = b.upper;
      upperInclusive = b.upperInclusive;
    }
    else if (null == b.upper) {
      upper = a.upper;
      upperInclusive = a.upperInclusive;
    }
    else if ((a.upper >= b.upper) && (a.upper <= b.upper)) { // Note: == does not work with Date
      upper = a.upper;
      upperInclusive = a.upperInclusive && b.upperInclusive;
    }
    else if (a.upper < b.upper) {
      upper = a.upper;
      upperInclusive = a.upperInclusive;
    }
    else {
      upper = b.upper;
      upperInclusive = b.upperInclusive;
    }

    let r = createDefaultInclusivity(lower, upper);
    r.lowerInclusive = lowerInclusive;
    r.upperInclusive = upperInclusive;
    return r;
  }
}