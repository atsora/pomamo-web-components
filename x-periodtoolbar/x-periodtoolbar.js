// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2025 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Definition of tag x-periodtoolbar used to display datetime range.
 * This tag allow <em>zoom in</em> and <em>zoom out</em> through current datetime range.
 * It is also possible to go to previous or next period.
 *
 * @module x-periodtoolbar
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 * @requires module:pulseRange
 * @requires module:pulseSvg
 * @requires module:pulseCustomDialog
 */

var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseRange = require('pulseRange');
var pulseSvg = require('pulseSvg');
var pulseCustomDialog = require('pulseCustomDialog');
var eventBus = require('eventBus');
var state = require('state');

require('x-datetimepicker/x-datetimepicker');

(function () {

  /**
   * `<x-periodtoolbar>` — toolbar with navigation buttons for selecting and browsing time periods.
   *
   * When `displayshiftrange` is enabled, polls `RangeAround?RangeType=<type>&RangeSize=<n>&Around=<now>`
   * to obtain shift boundaries; otherwise computes a rolling window locally.
   * Renders previous/next/zoom navigation buttons and dispatches `dateTimeRangeChangeEvent` on `period-context`.
   * Includes a `x-datetimepicker` for manual date selection.
   *
   * Attributes:
   *   period-context     - event bus context for `dateTimeRangeChangeEvent`
   *   displayshiftrange  - (optional) if `'true'`, aligns range to shift boundaries from the server
   *
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
  class periodtoolbarComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      self._rangeSize = 1;
      self._rangeType = 'day';
      self._around = undefined; // tmp moment, to use in url - reset when success

      self._daterange = undefined;

      // DOM -> never in contructor
      self._content = undefined;

      return self;
    }

    _appendButtons(toolbar) {
      let _addButtonToToolbar = function (toolbar, btnClass, btnId, isSelectable) {
        let svg = $('<div></div>').addClass('periodtoolbar-btn').addClass(btnClass).attr('id', btnId);
        if (btnId != null) {
          svg.attr('id', btnId);
        }
        if ((isSelectable != null) && (true == isSelectable)) {
          svg.addClass('selectablebutton')
        }
        let btn = $('<div></div>').addClass('periodtoolbar-li-btn').append(svg);
        toolbar.append(btn);
        pulseSvg.inlineBackgroundSvg(svg);
        return btn;
      }

      let periodButtonsDiv = $('<div class="content-period-buttons"></div>');
      toolbar.append(periodButtonsDiv);



      const hidePeriodButton = this.element.hasAttribute('hide-period-buttons');
      const hideZooms = this.element.hasAttribute('hide-zooms');

      var self = this;

      let homeBtn = _addButtonToToolbar(periodButtonsDiv, 'periodtoolbar-home');
      pulseUtility.addToolTip(homeBtn, this.getTranslation('homeBtn', 'home'));
      if (hidePeriodButton) homeBtn.hide();
      homeBtn.click(function () {
        self._clickOnButton('home')
      });

      let dayBtn = _addButtonToToolbar(periodButtonsDiv, 'periodtoolbar-day', 'day', true);
      pulseUtility.addToolTip(dayBtn, this.getTranslation('dayBtn', 'day'));
      if (hidePeriodButton) dayBtn.hide();
      dayBtn.click(function () {
        self._clickOnButton('day')
      });

      let shiftBtn = _addButtonToToolbar(periodButtonsDiv, 'periodtoolbar-shift', 'shift', true);
      pulseUtility.addToolTip(shiftBtn, this.getTranslation('shiftBtn', 'shift'));
      if (hidePeriodButton) shiftBtn.hide();
      shiftBtn.click(function () {
        self._clickOnButton('shift')
      });

      let weekBtn = _addButtonToToolbar(periodButtonsDiv, 'periodtoolbar-week', 'week', true);
      pulseUtility.addToolTip(weekBtn, this.getTranslation('weekBtn', 'week'));
      if (hidePeriodButton) weekBtn.hide();
      weekBtn.click(function () {
        self._clickOnButton('week')
      });

      let monthBtn = _addButtonToToolbar(periodButtonsDiv, 'periodtoolbar-month', 'month', true);
      pulseUtility.addToolTip(monthBtn, this.getTranslation('monthBtn', 'month'));
      if (hidePeriodButton) monthBtn.hide();
      monthBtn.click(function () {
        self._clickOnButton('month')
      });

      let quarterBtn = _addButtonToToolbar(periodButtonsDiv, 'periodtoolbar-quarter', 'quarter', true);
      pulseUtility.addToolTip(quarterBtn, this.getTranslation('quarterBtn', 'quarter'));
      if (hidePeriodButton) quarterBtn.hide();
      quarterBtn.click(function () {
        self._clickOnButton('quarter')
      });

      let semesterBtn = _addButtonToToolbar(periodButtonsDiv, 'periodtoolbar-semester', 'semester', true);
      pulseUtility.addToolTip(semesterBtn, this.getTranslation('semesterBtn', 'semester'));
      if (hidePeriodButton) semesterBtn.hide();
      semesterBtn.click(function () {
        self._clickOnButton('semester')
      });

      let yearBtn = _addButtonToToolbar(periodButtonsDiv, 'periodtoolbar-year', 'year', true);
      pulseUtility.addToolTip(yearBtn, this.getTranslation('yearBtn', 'year'));
      if (hidePeriodButton) yearBtn.hide();
      yearBtn.click(function () {
        self._clickOnButton('year')
      });

      let prevBtn = _addButtonToToolbar(toolbar, 'periodtoolbar-prev');
      prevBtn.click(function () {
        self._goToPreviousPeriod()
      });

      /* KEEP NEXT comment - can be used to restore button for range selection*/
      /*let periodSelectionBtn = _addButtonToToolbar(toolbar, 'periodtoolbar-periodselection');
      periodSelectionBtn.click(function(){
                           let xdatetimerange = pulseUtility.createjQueryElementWithAttribute("x-datetimerange", {
                             range: this._dateRange.lower+";"+this._dateRange.upper
                           });
                           let datetimerange_div = $("<div></div>").addClass("dialog-datetimerange").append(xdatetimerange);
                           let dialog = $("<div></div>").addClass("selectdaterange-dialog").append(datetimerange_div);
                           pulseCustomDialogs.openBackValidateAutoCloseDialog ($(this),
                             "Select", // TODO: i18n
                             dialog,
                             function () {
                               this._shiftIsDisplayed = false;
                               let range = $(xdatetimerange[0]).attr('range');
                               let pos = range.indexOf(";");
                               this._dateRange.lower = range.substr(0, pos);//$(xdatetimerange[0]).attr('begin');
                               this._dateRange.upper = range.substr(pos+1, range.length - (pos+1) ); // $(xdatetimerange[0]).attr('end');
                               this._rangeHaveChanged();
                             });
                         });*/

      // Embedded x-datetimerange — replaces the legacy hand-rolled label + dialog.
      // The embedded component handles both the clickable display and the dialog;
      // it dispatches dateTimeRangeChangeEvent on the shared period-context after OK.
      let dtrAttrs = {
        'hide-buttons': 'true',
        'display-mode': 'shift',
        'dialog-title': this.getTranslation('dialogTitle', 'Setting date/time range')
      };
      if (this.element.hasAttribute('period-context')) {
        dtrAttrs['period-context'] = this.element.getAttribute('period-context');
      }
      ['min-begin', 'max-begin', 'min-end', 'max-end'].forEach(a => {
        if (this.element.hasAttribute(a)) {
          dtrAttrs[a] = this.element.getAttribute(a);
        }
      });
      this._embeddedDtr = pulseUtility.createjQueryElementWithAttribute('x-datetimerange', dtrAttrs);

      let periodselection_btn = $('<div></div>').addClass('periodtoolbar-li-text')
        .append(this._embeddedDtr);
      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html(this.getTranslation('loadingDots', 'Loading...')).css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      periodselection_btn.append(loaderDiv);
      // Create DOM - message for error
      this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      periodselection_btn.append(messageDiv);
      toolbar.append(periodselection_btn);

      let nextBtn = _addButtonToToolbar(toolbar, 'periodtoolbar-next');
      nextBtn.click(function () {
        self._goToNextPeriod()
      });

      let zoomButtonsDiv = $('<div class="content-zoom-buttons"></div>');
      toolbar.append(zoomButtonsDiv);

      let zoomInBtn = _addButtonToToolbar(zoomButtonsDiv, 'periodtoolbar-zoomin');
      if (hideZooms) zoomInBtn.hide();
      zoomInBtn.click(function () {
        self._zoomin()
      });

      let zoomOutBtn = _addButtonToToolbar(zoomButtonsDiv, 'periodtoolbar-zoomout');
      if (hideZooms) zoomOutBtn.hide();
      zoomOutBtn.click(function () {
        self._zoomout()
      });
    }

    _clickOnButton(buttonName) {
      if ($(this.element).hasClass('pulse-component-loading')) {
        // If any button is disabled, stop allowing clicks
        return;
      }

      this._rangeSize = 1;
      this._around = undefined;

      if (buttonName != 'home') {
        this._rangeType = buttonName;

        let m_begin = moment(this._dateRange.lower);
        let m_end = moment(this._dateRange.upper);
        // If range exists use it, else use now (= default)
        if (m_begin.isValid() && m_end.isValid()) { // Always, else use now
          // Middle of display
          let m_around = moment(this._dateRange.lower);
          m_around = m_around.add(((m_end.diff(m_begin)) / 2), 'milliseconds');
          if (m_around > moment()) { // To avoid future
            m_around = moment();
          }
          this._around = m_around;
        }
        this._updateButtonsSelection();

        this.switchToContext('Reload'); // to call Ajax request
      }
      else {
        // HOME BUTTON :
        //this._rangeType = 'day';
        this._around = undefined; // moment(); // Now

        if (this._rangeType != '') {
          this._updateButtonsSelection();
          this.switchToContext('Reload'); // to call Ajax request
          return;
        }
        // Else no call to ajax request
        // Manual calc
        let m_begin = moment(this._dateRange.lower);
        let m_end = moment(this._dateRange.upper);
        //let now = moment();
        if (m_begin.isValid() && m_end.isValid()) { // Always
          let diffInMs = m_end.diff(m_begin);

          let new_begin = moment().subtract(diffInMs / 2, 'milliseconds');
          let new_end = moment().add(diffInMs / 2, 'milliseconds');
          this._dateRange.lower = pulseUtility.convertMomentToDateTimeString(new_begin);
          this._dateRange.upper = pulseUtility.convertMomentToDateTimeString(new_end);
          this._rangeHaveChanged('');
          this._updateButtonsSelection();

          this._switchToNormalOrLoadedWhenManual();
        }
      }
    }

    _goToPreviousPeriod() {
      if ($(this.element).hasClass('pulse-component-loading')) {
        // If any button is disabled, stop allowing clicks
        return;
      }

      let m_begin = moment(this._dateRange.lower);
      let m_end = moment(this._dateRange.upper);
      if (m_begin.isValid() && m_end.isValid()) { // Always
        if (this._rangeType && this._rangeType != '') {
          // Auto
          let m_around = moment(this._dateRange.lower);
          if (this._rangeType == 'shift') {
            m_around = m_around.add(-30000, 'milliseconds'); // -30 sec for previous shift display
          }
          else {
            m_around = m_around.add(-((moment(this._dateRange.upper).diff(moment(this._dateRange.lower))) / 2), 'milliseconds'); // middle of PREV display
          }
          this._around = m_around;
          this.switchToContext('Reload'); // to call Ajax request
          return;
        }
        else {
          // Manually
          m_begin = m_begin.add(m_begin.diff(m_end));
          this._dateRange.upper = this._dateRange.lower;
          this._dateRange.lower = pulseUtility.convertMomentToDateTimeString(m_begin);
          this._rangeHaveChanged('');

          this._around = undefined;

          this._switchToNormalOrLoadedWhenManual();
        }
      }
    }

    _goToNextPeriod() {
      if ($(this.element).hasClass('pulse-component-loading')) {
        // If any button is disabled, stop allowing clicks
        return;
      }

      let m_begin = moment(this._dateRange.lower);
      let m_end = moment(this._dateRange.upper);
      if (m_begin.isValid() && m_end.isValid()) { // Always
        if (this._rangeType && this._rangeType != '') {
          // Auto
          let m_around = moment(this._dateRange.upper);
          if (this._rangeType == 'shift') {
            m_around = m_around.add(30000, 'milliseconds'); // + 30 sec for shift display
          }
          else {
            m_around = m_around.add(((moment(this._dateRange.upper).diff(moment(this._dateRange.lower))) / 2), 'milliseconds'); // middle of NEXT display
          }
          this._around = m_around;
          this.switchToContext('Reload'); // to call Ajax request
          return;
        }
        else {
          // Manually
          let m_now = moment();
          if (m_end <= m_now) { // Avoid future
            m_end.add(m_end.diff(m_begin));
            this._dateRange.lower = this._dateRange.upper;
            this._dateRange.upper = pulseUtility.convertMomentToDateTimeString(m_end);
            this._rangeHaveChanged('');

            this._around = undefined;
            this._switchToNormalOrLoadedWhenManual();
          }
        }
      }
    }

    _zoomin() {
      if ($(this.element).hasClass('pulse-component-loading')) {
        // If any button is disabled, stop allowing clicks
        return;
      }

      if (this._rangeType && this._rangeType != '') {
        if (this._rangeSize <= 1 || this._rangeType == 'shift') {
          this._rangeType = '';
          this._rangeSize = 0;
          this._around = undefined;
        }
        else {
          // Auto
          this._rangeSize = this._rangeSize / 2;

          let m_begin = moment(this._dateRange.lower);
          let m_end = moment(this._dateRange.upper);

          let m_around = moment();
          if (m_begin.isValid() && m_end.isValid()) { // Always
            // Middle of display
            m_around = moment(this._dateRange.lower);
            m_around = m_around.add(((m_end.diff(m_begin)) / 2), 'milliseconds');
          }
          this._around = m_around;
          this.switchToContext('Reload'); // to call Ajax request
          return;
        }
      }

      // Manual Zoom
      let m_begin = moment(this._dateRange.lower);
      let m_end = moment(this._dateRange.upper);
      if (m_begin.isValid() && m_end.isValid()) { // Always
        let diffInMs = m_end.diff(m_begin);

        let nowWasDisplayed = false;
        if ((m_begin < moment()) && (moment() < m_end))
          nowWasDisplayed = true;

        if (diffInMs <= 1 * 60 * 1000)
          return; // No zoom less than 1 min

        m_begin = m_begin.add(diffInMs / 4, 'milliseconds');
        if (moment() < m_begin) { // Avoid future
          m_begin = moment(this._dateRange.lower);
          m_end = m_end.add(-diffInMs / 2, 'milliseconds');
        }
        else {
          m_end = m_end.add(-diffInMs / 4, 'milliseconds');
          if (nowWasDisplayed) { // Try to include now again
            if (m_end < moment()) {
              m_begin = m_begin.add(diffInMs / 4, 'milliseconds');
              m_end = m_end.add(diffInMs / 4, 'milliseconds');
            }
          }
        }
        // Beautify display (= avoid msec / sec)
        m_begin = m_begin.set({ 'milliseconds': 0 });
        m_end = m_end.set({ 'milliseconds': 0 });
        m_begin = m_begin.set({ 'seconds': 0 });
        m_end = m_end.set({ 'seconds': 0 });

        if (diffInMs / 2 >= 4 * 60 * 60 * 1000) { // 4 hrs -> set 15/30/45 minutes
          let min = m_begin.get('minute');
          let roundedMin = 15 * Math.round(min / 15);
          m_begin = m_begin.add(roundedMin - min, 'minutes');

          min = m_end.get('minute');
          roundedMin = 15 * Math.round(min / 15);
          m_end = m_end.add(roundedMin - min, 'minutes');

          if (nowWasDisplayed) { // Try to include now again
            if (moment() < m_begin) {
              m_begin = m_begin.add(-15, 'minutes');
              m_end = m_begin.add(-15, 'minutes');
            }
            else if (m_end < moment()) {
              m_begin = m_begin.add(15, 'minutes');
              m_end = m_begin.add(15, 'minutes');
            }
          }
        }
        else if (diffInMs / 2 >= 1 * 60 * 60 * 1000) { // 1 hrs -> set 5/10/15... minutes
          let min = m_begin.get('minute');
          let roundedMin = 5 * Math.round(min / 5);
          m_begin = m_begin.add(roundedMin - min, 'minutes');

          min = m_end.get('minute');
          roundedMin = 5 * Math.round(min / 5);
          m_end = m_end.add(roundedMin - min, 'minutes');
          if (nowWasDisplayed) { // Try to include now again
            if (moment() < m_begin) {
              m_begin = m_begin.add(-5, 'minutes');
              m_end = m_begin.add(-5, 'minutes');
            }
            else if (m_end < moment()) {
              m_begin = m_begin.add(5, 'minutes');
              m_end = m_begin.add(5, 'minutes');
            }
          }
        }
        // END Beautify

        this._dateRange.lower = pulseUtility.convertMomentToDateTimeString(m_begin);
        this._dateRange.upper = pulseUtility.convertMomentToDateTimeString(m_end);
        this._rangeHaveChanged('');
        this._updateButtonsSelection();

        this._switchToNormalOrLoadedWhenManual();
      }
    }

    _zoomout() {
      if ($(this.element).hasClass('pulse-component-loading')) {
        // If any button is disabled, stop allowing clicks
        return;
      }

      if (this._rangeType && this._rangeType != '') {
        if (this._rangeSize > 4 || this._rangeType == 'shift') {
          this._rangeType = '';
          this._rangeSize = 0;
          this._around = undefined;
        }
        else {
          // Auto
          this._rangeSize = this._rangeSize * 2;
          let m_begin = moment(this._dateRange.lower);
          let m_end = moment(this._dateRange.upper);

          let m_around = moment();
          if (m_begin.isValid() && m_end.isValid()) { // Always
            // Middle of display
            m_around = moment(this._dateRange.lower);
            m_around = m_around.add(((m_end.diff(m_begin)) / 2), 'milliseconds');
          }
          // To un-clic button ???
          //this._rangeType = ''; this._rangeSize = 0;
          this._updateButtonsSelection();

          this._around = m_around;
          this.switchToContext('Reload'); // to call Ajax request
          return;
        }
      }
      // Manual Zoom
      let m_begin = moment(this._dateRange.lower);
      let m_end = moment(this._dateRange.upper);
      if (m_begin.isValid() && m_end.isValid()) { // Always
        let diffInMs = m_end.diff(m_begin);
        m_begin = m_begin.add(-diffInMs / 2, 'milliseconds');
        m_end = m_end.add(diffInMs / 2, 'milliseconds');

        // Beautify display (= avoid msec / sec)
        m_begin = m_begin.set({ 'milliseconds': 0 });
        m_end = m_end.set({ 'milliseconds': 0 });
        m_begin = m_begin.set({ 'seconds': 0 });
        m_end = m_end.set({ 'seconds': 0 });

        if (diffInMs * 2 >= 4 * 60 * 60 * 1000) { // 4 hrs -> set 15/30/45 minutes
          let min = m_begin.get('minute');
          let roundedMin = 15 * Math.round(min / 15);
          m_begin = m_begin.add(roundedMin - min, 'minutes');

          min = m_end.get('minute');
          roundedMin = 15 * Math.round(min / 15);
          m_end = m_end.add(roundedMin - min, 'minutes');
        }
        else if (diffInMs * 2 >= 1 * 60 * 60 * 1000) { // 1 hrs -> set 5/10/15... minutes
          let min = m_begin.get('minute');
          let roundedMin = 5 * Math.round(min / 5);
          m_begin = m_begin.add(roundedMin - min, 'minutes');

          min = m_end.get('minute');
          roundedMin = 5 * Math.round(min / 5);
          m_end = m_end.add(roundedMin - min, 'minutes');
        }
        // END Beautify

        this._dateRange.lower = pulseUtility.convertMomentToDateTimeString(m_begin);
        this._dateRange.upper = pulseUtility.convertMomentToDateTimeString(m_end);
        this._rangeHaveChanged('');
        this._updateButtonsSelection();

        this._switchToNormalOrLoadedWhenManual();
      }
    }

    // this._dateRange must be set just before
    // Pushes the new range to the embedded x-datetimerange (which mirrors the display
    // and dispatches dateTimeRangeChangeEvent on the shared period-context). The
    // forcedDisplay parameter is kept for API compat but is now used only as
    // a one-shot raw HTML override on the embedded display zone.
    _rangeHaveChanged(forcedDisplay) {
      if (typeof forcedDisplay != 'undefined') {
        if (this._embeddedDtr && this._dateRange) {
          // Sync the range attribute (string in the [lower,upper) form expected by x-datetimerange)
          let stringrange = pulseUtility.convertDateRangeForWebService(this._dateRange);
          this._embeddedDtr[0].setAttribute('range', stringrange);

          // Sync shift label: when on shift mode and we have a label, show it; otherwise show the range
          if (this._rangeType == 'shift' && this._displayLabel) {
            this._embeddedDtr[0].setAttribute('shift-label', this._displayLabel);
          }
          else {
            this._embeddedDtr[0].removeAttribute('shift-label');
          }
        }

        // Legacy fallback: if a forcedDisplay is provided, override the displayed text.
        // Only used by callers that pass a non-empty string (rare).
        if (forcedDisplay != '') {
          $(this.element).find('.datetimerange-display').html(forcedDisplay);
        }
      }
    }

    _updateButtonsSelection() {
      $(this.element).find('.selected').removeClass('selected');
      if (this._rangeType != '') {
        $(this.element).find('#' + this._rangeType).addClass('selected');
      }
    }

    // END of PRIVATE methods
    // (Range-setting dialog & validation moved to <x-datetimerange> embedded above.)

    /**
     * @override
     *
     * @param {!string} context - Context
     * @return {!string} key
     */
    getStartKey(context) {
      switch (context) {
        case 'Loaded':
          return 'Standard';
        default:
          return super.getStartKey(context);
      }
    }

    /**
     * @override
     *
     * @param {!string} context - Context
     * @param {!string} key - Key
     * @returns {!State} Created states
     */
    defineState(context, key) {
      switch (context) {
        case 'Loaded': // == Refresh until click on button == NO !!! At end of display, switch to next period ///  used ONLY FOR range NOT around now
          return new state.StaticState(context, key, this);
        default:
          return super.defineState(context, key);
      }
    }

    attributeChangedWhenConnectedOnce(attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'period-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'askForDateTimeRangeEvent');
            eventBus.EventBus.addEventListener(this,
              'askForDateTimeRangeEvent', newVal,
              this.onAskForDateTimeChange.bind(this));
          }
          this.start(); // To re-validate parameters
          break;
        case 'displayshiftrange':
          {
            if (this.isInitialized()) {
              if (newVal) {
                // Get Current Shift
                this._clickOnButton('shift');
              }
              else {
                this.start();
              }
            }
          }
          break;
        case 'range':
          { // FOR DEMO / TESTS + details
            if (undefined == this._dateRange) { // Not defined yet
              this._dateRange = pulseRange.createDateRangeFromString(newVal);
              this._rangeHaveChanged('');
            }
          }
          break;
        default:
      }
    }

    initialize() {
      this.addClass('pulse-text');

      // listeners
      if (this.element.hasAttribute('period-context')) {
        eventBus.EventBus.addEventListener(this,
          'askForDateTimeRangeEvent',
          this.element.getAttribute('period-context'),
          this.onAskForDateTimeChange.bind(this));
      }
      else {
        eventBus.EventBus.addGlobalEventListener(this,
          'askForDateTimeRangeEvent',
          this.onAskForDateTimeChange.bind(this));
      }

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Loader + Message -> Included in button
      // Create DOM - Content
      let toolbar = $('<div></div>').addClass('periodtoolbar');
      this._appendButtons(toolbar);
      $(this.element).append(toolbar);

      if (this.element.hasAttribute('range')) { // FOR DEMO / TESTS / DOCS
        let newValue = this.element.getAttribute('range');
        this._dateRange = pulseRange.createDateRangeFromString(newValue);
        this._rangeType = '';
        this._around = undefined;
        this._rangeHaveChanged('TEST');

        this._updateButtonsSelection();

        // Initialization OK => switch to the context loaded
        this.switchToContext('Loaded'); // to STOP calling Ajax request
        return;

      }
      else { // NORMAL
        if (this.getConfigOrAttribute('displayshiftrange', 'false') == 'true') {
          // Like click on shift - this._clickOnButton('shift');
          this._rangeSize = 1;
          this._rangeType = 'shift';
          this._around = undefined;
        }
        else {
          // Like click on home - this._clickOnButton('home');
          //this._rangeSize = 1;
          //this._rangeType = 'day';
          this._around = undefined;
        }
      }
      this._updateButtonsSelection();

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization() {
      // Parameters
      // DOM
      $(this.element).empty();

      //this._messageSpan = undefined;
      //this._content = undefined;

      super.clearInitialization();
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters() {
      /* Not mandatory anymore
      if (!this.element.hasAttribute('period-context')) {
        console.error('missing attribute period-context in periodtoolbar');
        this.setError('missing period-context'); // delayed error message
        return;
      }*/
      // Additional checks with attribute param

      //this._setRangeFromAttribute();
      // Check the range is valid -> NO

      this.switchToNextContext();
    }

    displayError(message) {
      // Forward to x-message ?
      // Clear the display zone of the embedded x-datetimerange (next setAttribute('range') refills it)
      $(this.element).find('.datetimerange-display').html('');
      $(this._messageSpan).html(message);
    }

    removeError() {
      this.displayError(''); // Forward to x-message ?
    }

    get refreshRate() {
      // Return here the refresh rate in ms. (for AUTO refresh at end of period)
      let now = moment();
      let inOneWeek = moment().add(7, 'days');
      let m_beginOfDisplay = moment(this._dateRange.lower);
      let m_endOfDisplay = moment(this._dateRange.upper);

      if ((m_beginOfDisplay.diff(now, 'milliseconds') >= 0)
        || (m_endOfDisplay.diff(now, 'milliseconds') < 0)) { // now not included in range
        m_endOfDisplay = inOneWeek; // avoid "infinite value"
      }
      else { // now is in range
        m_endOfDisplay = moment.min(m_endOfDisplay, inOneWeek); // earliest To avoid "infinite value" and strange behavior
      }

      let msUntilEndOfTimer = m_endOfDisplay.diff(now, 'milliseconds');
      if (msUntilEndOfTimer < 0) { // Hope it never happens
        msUntilEndOfTimer = 10 * 60 * 1000; // 10 min
      }
      else {
        msUntilEndOfTimer = msUntilEndOfTimer + 5 * 1000; // + 5 seconds to always display something
      }
      return msUntilEndOfTimer;
    }

    // Overload to always refresh value
    /*get isVisible () {
      return true;
    }*/

    getShortUrl() { // Return the Web Service URL without path
      // When reloading, remove current text + disable ALL buttons
      // (Clears the display zone of the embedded x-datetimerange.)
      $(this.element).find('.datetimerange-display').html('');
      $(this.element).find('.periodtoolbar-btn').addClass('disabled');

      let url = 'RangeAround?RangeType=' + this._rangeType + '&RangeSize=' + this._rangeSize;
      if (this._around != undefined) {
        let iso_around = pulseUtility.convertMomentToDateTimeString(this._around);
        url = url + '&Around=' + iso_around;
      }
      return url;
    }

    refresh(data) {
      // Update the component with data returned by the web service in case of success

      // Fill this._dateRange is already done to define next context
      if (data && data.Display) {
        this._displayLabel = data.Display;
      } else {
        this._displayLabel = '';
      }
      this._rangeHaveChanged('');
      // The dateTimeRangeChangeEvent is dispatched by the embedded x-datetimerange
      // (when its 'range' attribute changes) — no need to dispatch again here.
    }

    manageSuccess(data) {
      // Enable again buttons
      $(this.element).find('.periodtoolbar-btn').removeClass('disabled');

      // Store range (to ISO string)
      this._dateRange = pulseRange.createStringRangeFromString(data.DateTimeRange);

      let m_begin = moment(this._dateRange.lower);
      let m_end = moment(this._dateRange.upper);
      let now = moment();
      if (now.isAfter(m_end)) { // Past data displayed
        this.switchToContext('Loaded', () => this.refresh(data)); // to STOP calling Ajax request
        return;
      }
      else {
        if (now.isAfter(m_begin)) { // begin < now < end
          // Reset to display current data
          this._around = undefined;
        }
        // else = future data
      }
      if (this._around == undefined) {
        this.switchToContext('Normal', () => this.refresh(data)); // Refresh = display around now
        return;
      }
      else {
        this.switchToContext('Loaded', () => this.refresh(data)); // to STOP calling Ajax request
      }
    }

    /* Instead of calling web service with an URL. Go to next period to see next period (when not a day shift or... ) */
    _runAlternateGetData() {
      if (this._rangeType && this._rangeType != '') {
        return false;
      }
      // Manual zoom -> switch to next period
      this._goToNextPeriod();
      //this.switchToNextContext();
      return true;
    }

    /* NORMAL ==  for current display, go to next at end of period = reset refresh rate
       LOADED == fixed display */
    _switchToNormalOrLoadedWhenManual() {
      let m_begin = moment(this._dateRange.lower);
      let m_end = moment(this._dateRange.upper);
      let now = moment();
      if (now.isAfter(m_end)) { // Past data displayed
        this.switchToContext('Loaded', () => this.refresh(null)); // to STOP calling Ajax request
        return;
      }
      else {
        if (now.isAfter(m_begin)) { // begin < now < end
          // Reset to display current data
          this.switchToContext('Normal'); // Refresh = display around now
          return;
        }
        // else = future data
      }
      if (this._around == undefined) {
        this.switchToContext('Normal'); // Refresh = display around now
        return;
      }
      else {
        this.switchToContext('Loaded', () => this.refresh(null)); // to STOP calling Ajax request
      }
    }

    // Callback events
    /**
     * Event bus callback triggered when the date/time range is asked
     *
     * @param {Object} event
     */
    onAskForDateTimeChange(event) {
      if (this._dateRange) { // To avoid loop and problems
        if (this.element.hasAttribute('period-context')) {
          eventBus.EventBus.dispatchToContext('dateTimeRangeChangeEvent',
            this.element.getAttribute('period-context'),
            {
              daterange: pulseRange.createDateRangeDefaultInclusivity(this._dateRange.lower, this._dateRange.upper),
              stringrange: this._dateRange
            });
        }
        else {
          eventBus.EventBus.dispatchToAll('dateTimeRangeChangeEvent', {
            daterange: pulseRange.createDateRangeDefaultInclusivity(this._dateRange.lower, this._dateRange.upper),
            stringrange: this._dateRange
          });
        }
      }
    }

    /**
     * Event callback in case a config is updated: (re-)start the component
     *
     * @param {*} event
     */
    onConfigChange(event) {
      if (event.target.config == 'displayshiftrange')
        this.start();
    }

  }

  pulseComponent.registerElement('x-periodtoolbar', periodtoolbarComponent, ['period-context', 'displayshiftrange', 'range', 'hide-period-buttons', 'hide-zooms']);
})();
