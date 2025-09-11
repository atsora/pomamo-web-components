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

/**
 * Build a custom tag <x-periodtoolbar> to display a period bar component with buttons. This tag gets following attribute :
 *  period-context : String (or range)
 *  displayshiftrange
 */
(function () {

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
        let btn = $('<li></li>').addClass('periodtoolbar-li-btn').append(svg);
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
      if (hidePeriodButton) homeBtn.hide();
      homeBtn.click(function () {
        self._clickOnButton('home')
      });

      let dayBtn = _addButtonToToolbar(periodButtonsDiv, 'periodtoolbar-day', 'day', true);
      if (hidePeriodButton) dayBtn.hide();
      dayBtn.click(function () {
        self._clickOnButton('day')
      });

      let shiftBtn = _addButtonToToolbar(periodButtonsDiv, 'periodtoolbar-shift', 'shift', true);
      if (hidePeriodButton) shiftBtn.hide();
      shiftBtn.click(function () {
        self._clickOnButton('shift')
      });

      let weekBtn = _addButtonToToolbar(periodButtonsDiv, 'periodtoolbar-week', 'week', true);
      if (hidePeriodButton) weekBtn.hide();
      weekBtn.click(function () {
        self._clickOnButton('week')
      });

      let monthBtn = _addButtonToToolbar(periodButtonsDiv, 'periodtoolbar-month', 'month', true);
      if (hidePeriodButton) monthBtn.hide();
      monthBtn.click(function () {
        self._clickOnButton('month')
      });

      let quarterBtn = _addButtonToToolbar(periodButtonsDiv, 'periodtoolbar-quarter', 'quarter', true);
      if (hidePeriodButton) quarterBtn.hide();
      quarterBtn.click(function () {
        self._clickOnButton('quarter')
      });

      let semesterBtn = _addButtonToToolbar(periodButtonsDiv, 'periodtoolbar-semester', 'semester', true);
      if (hidePeriodButton) semesterBtn.hide();
      semesterBtn.click(function () {
        self._clickOnButton('semester')
      });

      let yearBtn = _addButtonToToolbar(periodButtonsDiv, 'periodtoolbar-year', 'year', true);
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

      // Normal text display
      let display = $('<div></div>').addClass('periodtoolbar-display')
        .addClass('periodtoolbar-editable');
      display.html(''); // pulseUtility.displayDateRange(this._dateRange));
      display.click(function () {
        self._displayToolBarSettingDialog()
      });

      let periodselection_btn = $('<li></li>').addClass('periodtoolbar-li-text')
        .append(display);
      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').css('display', 'none');
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
    _rangeHaveChanged(forcedDisplay) {
      if (typeof forcedDisplay != 'undefined') { // if not defined, do not update
        if (forcedDisplay != '') {
          $(this.element).find('.periodtoolbar-display').html(forcedDisplay);
        }
        else { // empty string = default range display
          let display = pulseUtility.displayDateRange(this._dateRange);
          if (this._rangeType == 'shift') {
            let parts = display.split(" - ");
            if (parts.length == 2) {
              let label = this._displayLabel || '';
              let html = `
            <div class="periodtoolbar-display-left">${parts[0]}</div>
            <div class="periodtoolbar-display-center">${label}</div>
            <div class="periodtoolbar-display-right">${parts[1]}</div>
          `;
              $(this.element).find('.periodtoolbar-display').html(html);
            }
            else {
              $(this.element).find('.periodtoolbar-display').html(display);
            }
          }
          // (this._dateRange); DO NOT WORK -> need Date, given isostring
          else {
            $(this.element).find('.periodtoolbar-display').html(display);
          }

        }
      }

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

    _updateButtonsSelection() {
      $(this.element).find('.selected').removeClass('selected');
      if (this._rangeType != '') {
        $(this.element).find('#' + this._rangeType).addClass('selected');
      }
    }

    /**
     * Set MIN / MAX for begin & end DateTimePicker according to attributes
     */
    _setBeginEndBound(beginValue, endValue) {
      // BEGIN
      if (this.element.hasAttribute('min-begin')) {
        $(this._beginDTP)[0].setAttribute('mindatetime',
          this.element.getAttribute('min-begin'));
      }
      else {
        $(this._beginDTP)[0].removeAttribute('mindatetime');
      }
      if (this.element.hasAttribute('max-begin')) {
        $(this._beginDTP)[0].setAttribute('maxdatetime',
          this.element.getAttribute('max-begin'));
      }
      else if (this.element.hasAttribute('max-end')) {
        $(this._beginDTP)[0].setAttribute('maxdatetime',
          this.element.getAttribute('max-end'));
      }
      else {
        $(this._beginDTP)[0].removeAttribute('maxdatetime');
      }
      $(this._beginDTP)[0].setAttribute('defaultdatetime',
        pulseUtility.convertDateForWebService(beginValue));

      // END
      if (this.element.hasAttribute('min-end')) {
        $(this._endDTP)[0].setAttribute('mindatetime',
          this.element.getAttribute('min-end'));
      }
      else {
        if (this.element.hasAttribute('min-begin')) {
          $(this._endDTP)[0].setAttribute('mindatetime',
            this.element.getAttribute('min-begin'));
        }
        else {
          $(this._endDTP)[0].removeAttribute('mindatetime');
        }
      }
      if (this.element.hasAttribute('max-end')) {
        $(this._endDTP)[0].setAttribute('maxdatetime',
          this.element.getAttribute('max-end'));
      }
      else {
        $(this._endDTP)[0].removeAttribute('maxdatetime');
      }
      $(this._endDTP)[0].setAttribute('defaultdatetime',
        pulseUtility.convertDateForWebService(endValue));
    } // end _setBeginEndBound

    /**
     * Callback (called after validate button)
     */
    _callback_validate_settings() {
      if (!this._beginDTP[0].isValid()) {
        pulseCustomDialog.openError(this.getTranslation('startNotValidError', 'Start date/time is not valid'));
        return false;
      }
      if (!this._endDTP[0].isValid()) {
        pulseCustomDialog.openError(this.getTranslation('endNotValidError', 'End date/time is not valid'));
        return false;
      }
      if (null == this._endDTP[0].getISOValue()) {
        pulseCustomDialog.openError(this.getTranslation('endNotValidError', 'End date/time is not valid'));
        return false;
      }

      let beginDateTime = new Date(this._beginDTP[0].getISOValue());
      let endDateTime = new Date(this._endDTP[0].getISOValue());

      // Is min date in the limits?
      if (this.element.hasAttribute('min-begin') &&
        this.element.getAttribute('min-begin') !== null) {
        let minBeginDate = new Date(this.element.getAttribute('min-begin'));
        if (beginDateTime < minBeginDate) {
          pulseCustomDialog.openError(this.getTranslation('startBeforeMinError', 'Start date/time is before minimum allowed date/time'));
          return false;
        }
      }
      if (this.element.hasAttribute('max-begin') &&
        this.element.getAttribute('max-begin') != null) {
        let maxBeginDate = new Date(this.element.getAttribute('max-begin'));
        if (beginDateTime > maxBeginDate) {
          pulseCustomDialog.openError(this.getTranslation('startAfterMaxError', 'Start date/time is after maximum allowed date/time'));
          return false;
        }
      }
      // Is max date in the limits?
      if (this.element.hasAttribute('min-end') &&
        this.element.getAttribute('min-end') != null) {
        let minEndDate = new Date(this.element.getAttribute('min-end'));
        if ((endDateTime) && (endDateTime < minEndDate)) {
          pulseCustomDialog.openError(this.getTranslation('endBeforeMinError', 'End date/time is before minimum allowed date/time'));
          return false;
        }
      }
      if (this.element.hasAttribute('max-end') &&
        this.element.getAttribute('max-end') != null) {
        let maxEndDate = new Date(this.element.getAttribute('max-end'));
        if ((endDateTime) && (endDateTime > maxEndDate)) {
          pulseCustomDialog.openError(this.getTranslation('endAfterMaxError', 'End date/time is after maximum allowed date/time'));
          return false;
        }
      }

      // Check the range
      if (endDateTime) {
        if (endDateTime < beginDateTime) {
          pulseCustomDialog.openError(this.getTranslation('endBeforeStartError', 'End date/time is before start date/time'));
          return false;
        }
        else {
          if (beginDateTime < endDateTime) {
            // Do nothing = it is OK
          }
          else {
            pulseCustomDialog.openError(this.getTranslation('emptyPeriodError', 'Empty period'));
            return false;
          }
        }
      }

      let newDateRange = pulseRange.createDefaultInclusivity(beginDateTime, endDateTime);

      if (undefined == this._dateRange
        || (!pulseRange.equals(newDateRange, this._dateRange, (a, b) => (a >= b) && (a <= b)))) {
        this._dateRange = newDateRange;
        this._rangeType = ''; // to remove "shift" zoom
        this._rangeHaveChanged('');
        this._updateButtonsSelection(); //  to show button as they should
      }

      this._switchToNormalOrLoadedWhenManual();

      return true;
    } // end _callback_validate_settings

    /**
     * Display to change date time range - copy datetimerange
     */
    _displayToolBarSettingDialog() { // TO Re-do
      if ($(this.element).hasClass('pulse-component-loading')) {
        // If any button is disabled, stop allowing clicks
        return;
      }

      // Warning message
      this._warningtext = $('<span></span>').addClass('datetimerange-dialog-span-warning');
      let warningdiv = $('<div></div>').addClass('datetimerange-dialog-div-warning')
        .append(this._warningtext);

      // Begin DTP //
      let begintimepickerOptions = {};
      begintimepickerOptions.defaultdatetime = pulseUtility.convertDateForWebService(this._dateRange.lower);
      begintimepickerOptions.nullable = false;
      if (this.element.hasAttribute('min-begin')) {
        begintimepickerOptions.mindatetime = this.element.getAttribute('min-begin');
      }
      if (this.element.hasAttribute('max-begin')) {
        begintimepickerOptions.maxdatetime = this.element.getAttribute('max-begin');
      }
      else {
        if (this.element.hasAttribute('max-end')) {
          begintimepickerOptions.maxdatetime = this.element.getAttribute('max-end');
        }
      }

      this._beginDTP = pulseUtility.createjQueryElementWithAttribute('x-datetimepicker',
        begintimepickerOptions);
      this._beginDTP[0].addEventListener('change',
        this.onChangeDateTime.bind(this), false);

      let beginDiv = $('<div"></div>').addClass('datetimepicker-begindiv').append(this._beginDTP);

      // End DTP // 
      let endtimepickerOptions = {};
      endtimepickerOptions.defaultdatetime = pulseUtility.convertDateForWebService(this._dateRange.upper);
      endtimepickerOptions.nullable = false;
      if (this.element.hasAttribute('min-end')) {
        endtimepickerOptions.mindatetime = this.element.getAttribute('min-end');
      }
      else {
        if (this.element.hasAttribute('min-begin')) {
          endtimepickerOptions.mindatetime = this.element.getAttribute('min-begin');
        }
      }
      if (this.element.hasAttribute('max-end')) {
        endtimepickerOptions.maxdatetime = this.element.getAttribute('max-end');
      }

      this._endDTP = pulseUtility.createjQueryElementWithAttribute('x-datetimepicker',
        endtimepickerOptions);
      this._endDTP[0].addEventListener('change',
        this.onChangeDateTime.bind(this), false);
      let endDiv = $('<div"></div>').addClass('datetimepicker-enddiv').append(this._endDTP);

      // ADD BOUNDS
      this._setBeginEndBound(this._dateRange.lower, this._dateRange.upper);

      //
      let divinputbegin = $('<div></div>').addClass('datetimerange-dialog-divinputbegin')
        .append(beginDiv);
      let divinputend = $('<div></div>').addClass('datetimerange-dialog-divinputend')
        .append(endDiv);
      let divinput = $('<div></div>').addClass('datetimerange-dialog-divinput')
        .append(divinputbegin).append(divinputend)
        .append(warningdiv);

      var self = this;
      let dialogId = pulseCustomDialog.initialize(divinput, {
        title: this.getTranslation('dialogTitle', 'Setting date/time range'),
        onOk: function () { // Validate
          if (self._callback_validate_settings()) {
            //pulseCustomDialogs.closeDialog(divinput);
          }
        },
        autoClose: true,
        autoDelete: true
      });
      pulseCustomDialog.open('#' + dialogId);
    }

    // END of PRIVATE methods

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
      let toolbar = $('<ol></ol>').addClass('periodtoolbar-toolbar');
      this._appendButtons(toolbar);
      let div = $('<div></div>').addClass('periodtoolbar').append(toolbar);
      $(this.element).append(div);

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
      $(this.element).find('.periodtoolbar-display').html('');
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
      $(this.element).find('.periodtoolbar-display').html('');
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
      /*if (data.Display && data.Display != '') {
        let m_dayString = pulseUtility.getDisplayDay(data.DayRange.Begin)
        this._rangeHaveChanged(m_dayString + ':' + data.Display);
       // DO NOT DISPLAY SHIFT only ANYMORE = data.RangeDisplay); -- YZ 2016/02
      }*/

      // Send message
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

    /**
     * Callback called when datetime is modified
     * To display warning message or not
     */
    onChangeDateTime() {
      if (!this._beginDTP[0].isValid() || !this._endDTP[0].isValid()) {
        this._warningtext.html('Please, input valid dates');
        return;
      }
      if (null == this._endDTP[0].getISOValue()) {
        // Should NEVER happen !
        this._warningtext.html('Please define END');
        return;
      }
      let begin = new Date(this._beginDTP[0].getISOValue());
      let end = new Date(this._endDTP[0].getISOValue());
      if (end < begin) {
        this._warningtext.html('WARNING ! Begin of period is after end');
        return;
      }
      if (end > begin) { // '==' not implemented
        this._warningtext.html(''); // == Normal
        return;
      }
      else {
        this._warningtext.html('WARNING ! Empty period');
        return;
      }
    }
  }

  pulseComponent.registerElement('x-periodtoolbar', periodtoolbarComponent, ['period-context', 'displayshiftrange', 'range', 'hide-period-buttons', 'hide-zooms']);
})();
