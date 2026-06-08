// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
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
require('x-datetimerange/x-datetimerange');

(function () {

  /**
   * `<x-periodtoolbar>` — toolbar to pick and navigate a date range
   * (home / day / week / month / custom, previous / next, zoom in/out).
   *
   * When `displayshiftrange === 'true'` (or a shift-aligned range type is
   * chosen), fetches `GetRangeAround?RangeType=<type>&RangeSize=<n>&Around=<now>`
   * to compute the boundaries; otherwise builds a rolling window locally.
   * Renders the row of buttons plus an embedded `x-datetimerange` for manual
   * selection. The embedded `x-datetimerange` owns the canonical range:
   * it dispatches `dateTimeRangeChangeEvent` on `period-context` after every
   * change and replies to `askForDateTimeRangeEvent` on the same context.
   * `x-periodtoolbar` only pushes new ranges (fetched from `RangeAround`) into
   * the dtr via `setAttribute('range', …)`. The `hide-period-buttons` /
   * `hide-zooms` attributes drop the corresponding button groups.
   *
   * @element x-periodtoolbar
   * @attr {string}  period-context      event-bus context for `dateTimeRangeChangeEvent`
   * @attr {string}  range               initial ISO range `begin;end`
   * @attr {boolean} displayshiftrange   align ranges to shift boundaries from the server
   * @attr {boolean} hide-period-buttons hide day/week/month buttons
   * @attr {boolean} hide-zooms          hide the zoom-in/out buttons
   * @fires dateTimeRangeChangeEvent     `{ daterange: DateRange, stringrange: any }` — on `period-context`
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
        let svg = document.createElement('div');
        svg.classList.add('periodtoolbar-btn', btnClass);
        if (btnId != null) {
          svg.setAttribute('id', btnId);
        }
        if ((isSelectable != null) && (true == isSelectable)) {
          svg.classList.add('selectablebutton')
        }
        let btn = document.createElement('div');
        btn.classList.add('periodtoolbar-li-btn');
        btn.appendChild(svg);
        toolbar.appendChild(btn);
        pulseSvg.inlineBackgroundSvg(svg);
        return btn;
      }

      let periodButtonsDiv = document.createElement('div');
      periodButtonsDiv.className = 'content-period-buttons';
      toolbar.appendChild(periodButtonsDiv);



      const hidePeriodButton = this.element.hasAttribute('hide-period-buttons');
      const hideZooms = this.element.hasAttribute('hide-zooms');

      var self = this;

      let homeBtn = _addButtonToToolbar(periodButtonsDiv, 'periodtoolbar-home');
      pulseUtility.addToolTip(homeBtn, this.getTranslation('homeBtn', 'home'));
      if (hidePeriodButton) homeBtn.style.display = 'none';
      homeBtn.addEventListener('click', function () {
        self._clickOnButton('home')
      });

      let dayBtn = _addButtonToToolbar(periodButtonsDiv, 'periodtoolbar-day', 'day', true);
      pulseUtility.addToolTip(dayBtn, this.getTranslation('dayBtn', 'day'));
      if (hidePeriodButton) dayBtn.style.display = 'none';
      dayBtn.addEventListener('click', function () {
        self._clickOnButton('day')
      });

      let shiftBtn = _addButtonToToolbar(periodButtonsDiv, 'periodtoolbar-shift', 'shift', true);
      pulseUtility.addToolTip(shiftBtn, this.getTranslation('shiftBtn', 'shift'));
      if (hidePeriodButton) shiftBtn.style.display = 'none';
      shiftBtn.addEventListener('click', function () {
        self._clickOnButton('shift')
      });

      let weekBtn = _addButtonToToolbar(periodButtonsDiv, 'periodtoolbar-week', 'week', true);
      pulseUtility.addToolTip(weekBtn, this.getTranslation('weekBtn', 'week'));
      if (hidePeriodButton) weekBtn.style.display = 'none';
      weekBtn.addEventListener('click', function () {
        self._clickOnButton('week')
      });

      let monthBtn = _addButtonToToolbar(periodButtonsDiv, 'periodtoolbar-month', 'month', true);
      pulseUtility.addToolTip(monthBtn, this.getTranslation('monthBtn', 'month'));
      if (hidePeriodButton) monthBtn.style.display = 'none';
      monthBtn.addEventListener('click', function () {
        self._clickOnButton('month')
      });

      let quarterBtn = _addButtonToToolbar(periodButtonsDiv, 'periodtoolbar-quarter', 'quarter', true);
      pulseUtility.addToolTip(quarterBtn, this.getTranslation('quarterBtn', 'quarter'));
      if (hidePeriodButton) quarterBtn.style.display = 'none';
      quarterBtn.addEventListener('click', function () {
        self._clickOnButton('quarter')
      });

      let semesterBtn = _addButtonToToolbar(periodButtonsDiv, 'periodtoolbar-semester', 'semester', true);
      pulseUtility.addToolTip(semesterBtn, this.getTranslation('semesterBtn', 'semester'));
      if (hidePeriodButton) semesterBtn.style.display = 'none';
      semesterBtn.addEventListener('click', function () {
        self._clickOnButton('semester')
      });

      let yearBtn = _addButtonToToolbar(periodButtonsDiv, 'periodtoolbar-year', 'year', true);
      pulseUtility.addToolTip(yearBtn, this.getTranslation('yearBtn', 'year'));
      if (hidePeriodButton) yearBtn.style.display = 'none';
      yearBtn.addEventListener('click', function () {
        self._clickOnButton('year')
      });

      let prevBtn = _addButtonToToolbar(toolbar, 'periodtoolbar-prev');
      prevBtn.addEventListener('click', function () {
        self._goToPreviousPeriod()
      });

      /* KEEP NEXT comment - can be used to restore button for range selection*/
      /*let periodSelectionBtn = _addButtonToToolbar(toolbar, 'periodtoolbar-periodselection');
      periodSelectionBtn.click(function(){
                           let xdatetimerange = pulseUtility.createElementWithAttribute("x-datetimerange", {
                             range: this._dateRange.lower+";"+this._dateRange.upper
                           });
                           let datetimerange_div = $("<div></div>").addClass("dialog-datetimerange").append(xdatetimerange);
                           let dialog = $("<div></div>").addClass("selectdaterange-dialog").append(datetimerange_div);
                           pulseCustomDialogs.openBackValidateAutoCloseDialog ($(this),
                             "Select", // TODO: i18n
                             dialog,
                             function () {
                               this._shiftIsDisplayed = false;
                               let range = xdatetimerange[0].getAttribute('range');
                               let pos = range.indexOf(";");
                               this._dateRange.lower = range.substr(0, pos);//xdatetimerange[0].getAttribute('begin');
                               this._dateRange.upper = range.substr(pos+1, range.length - (pos+1) ); // xdatetimerange[0].getAttribute('end');
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
      this._embeddedDtr = pulseUtility.createElementWithAttribute('x-datetimerange', dtrAttrs);

      let periodselection_btn = document.createElement('div');
      periodselection_btn.classList.add('periodtoolbar-li-text');
      periodselection_btn.appendChild(this._embeddedDtr);
      // Create DOM - Loader
      let loader = document.createElement('div');
      loader.classList.add('pulse-loader');
      loader.innerHTML = this.getTranslation('loadingDots', 'Loading...');
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.classList.add('pulse-loader-div');
      loaderDiv.appendChild(loader);
      periodselection_btn.appendChild(loaderDiv);
      // Create DOM - message for error
      this._messageSpan = document.createElement('span');
      this._messageSpan.classList.add('pulse-message');
      this._messageSpan.innerHTML = '';
      let messageDiv = document.createElement('div');
      messageDiv.classList.add('pulse-message-div');
      messageDiv.appendChild(this._messageSpan);
      periodselection_btn.appendChild(messageDiv);
      toolbar.appendChild(periodselection_btn);

      let nextBtn = _addButtonToToolbar(toolbar, 'periodtoolbar-next');
      nextBtn.addEventListener('click', function () {
        self._goToNextPeriod()
      });

      let zoomButtonsDiv = document.createElement('div');
      zoomButtonsDiv.className = 'content-zoom-buttons';
      toolbar.appendChild(zoomButtonsDiv);

      let zoomInBtn = _addButtonToToolbar(zoomButtonsDiv, 'periodtoolbar-zoomin');
      if (hideZooms) zoomInBtn.style.display = 'none';
      zoomInBtn.addEventListener('click', function () {
        self._zoomin()
      });

      let zoomOutBtn = _addButtonToToolbar(zoomButtonsDiv, 'periodtoolbar-zoomout');
      if (hideZooms) zoomOutBtn.style.display = 'none';
      zoomOutBtn.addEventListener('click', function () {
        self._zoomout()
      });
    }

    // If the component is currently loading, store `action` as the pending
    // action and watch the class list; when `pulse-component-loading` is removed,
    // fire the latest pending action. Returns true if the call should be deferred
    // (caller must early-return), false if the action can run immediately.
    // Only the latest pending action is kept — fast successive clicks all
    // collapse to the last user intent.
    _deferIfLoading(action) {
      if (!this.element.classList.contains('pulse-component-loading')) return false;
      this._pendingAction = action;
      if (this._loadingObserver) return true;
      this._loadingObserver = new MutationObserver(() => {
        if (this.element.classList.contains('pulse-component-loading')) return;
        const pending = this._pendingAction;
        this._pendingAction = null;
        this._loadingObserver.disconnect();
        this._loadingObserver = null;
        if (pending) pending();
      });
      this._loadingObserver.observe(this.element, { attributes: true, attributeFilter: ['class'] });
      return true;
    }

    _clickOnButton(buttonName) {
      if (this._deferIfLoading(() => this._clickOnButton(buttonName))) return;

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
      if (this._deferIfLoading(() => this._goToPreviousPeriod())) return;

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
      if (this._deferIfLoading(() => this._goToNextPeriod())) return;

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
      if (this._deferIfLoading(() => this._zoomin())) return;

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
      if (this._deferIfLoading(() => this._zoomout())) return;

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
          this._embeddedDtr.setAttribute('range', stringrange);

          // Sync shift label: when on shift mode and we have a label, show it; otherwise show the range
          if (this._rangeType == 'shift' && this._displayLabel) {
            this._embeddedDtr.setAttribute('shift-label', this._displayLabel);
          }
          else {
            this._embeddedDtr.removeAttribute('shift-label');
          }
        }

        // Legacy fallback: if a forcedDisplay is provided, override the displayed text.
        // Only used by callers that pass a non-empty string (rare).
        if (forcedDisplay != '') {
          let displayEl = this.element.querySelector('.datetimerange-display');
          if (displayEl) {
            displayEl.innerHTML = forcedDisplay;
          }
        }
      }
    }

    _updateButtonsSelection() {
      let selected = this.element.querySelector('.selected');
      if (selected) {
        selected.classList.remove('selected');
      }
      if (this._rangeType != '') {
        let btn = this.element.querySelector('#' + this._rangeType);
        if (btn) {
          btn.classList.add('selected');
        }
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
          // The embedded x-datetimerange is now the sole responder to
          // askForDateTimeRangeEvent on this context — see initialize().
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

      // Note: x-periodtoolbar does NOT listen to askForDateTimeRangeEvent —
      // the embedded x-datetimerange (created in _appendButtons) owns the
      // canonical range and is the sole responder on the shared period-context.
      //
      // We DO listen to dateTimeRangeChangeEvent so our cached `_dateRange`
      // (used for refreshRate and previous/next navigation) follows the dtr.
      // The dtr's `_dispatchSignal` only fires on actual mutation so the
      // listener doesn't loop on our own setAttribute('range', …) pushes.
      if (this.element.hasAttribute('period-context')) {
        eventBus.EventBus.addEventListener(this,
          'dateTimeRangeChangeEvent',
          this.element.getAttribute('period-context'),
          this.onDateTimeRangeChange.bind(this));
      }

      // In case of clone, need to be empty :
      this.element.replaceChildren();

      // Create DOM - Loader + Message -> Included in button
      // Create DOM - Content
      let toolbar = document.createElement('div');
      toolbar.classList.add('periodtoolbar');
      this._appendButtons(toolbar);
      this.element.appendChild(toolbar);

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
      this.element.replaceChildren();

      //this._messageSpan = undefined;
      //this._content = undefined;

      if (this._loadingObserver) {
        this._loadingObserver.disconnect();
        this._loadingObserver = null;
      }
      this._pendingAction = null;

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
      let displayEl = this.element.querySelector('.datetimerange-display');
      if (displayEl) {
        displayEl.innerHTML = '';
      }
      this._messageSpan.innerHTML = message;
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
      // When reloading, disable ALL buttons as a visual loading hint.
      // We intentionally do NOT clear .datetimerange-display: if the AJAX
      // returns the same range as before, the dtr's `range` setter early-exits
      // on equality and never re-renders, leaving the cleared display empty
      // for good (visible when toggling between day/shift while already on
      // today's range).
      let btns = this.element.querySelectorAll('.periodtoolbar-btn');
      btns.forEach(btn => btn.classList.add('disabled'));

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
      let btns = this.element.querySelectorAll('.periodtoolbar-btn');
      btns.forEach(btn => btn.classList.remove('disabled'));

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
     * Keep `_dateRange` in sync with the embedded x-datetimerange (the source
     * of truth on `period-context`). Fired both when we push a range through
     * setAttribute('range', …) and when the user picks a new range in the
     * dtr's dialog. The dtr only dispatches on real mutation, so this never
     * loops with our own pushes.
     *
     * @param {{ target: { daterange: any, stringrange: any } }} event
     */
    onDateTimeRangeChange(event) {
      let payload = event.target || event;
      if (!payload) return;
      let incoming = payload.stringrange || payload.daterange;
      if (!incoming) return;
      if (typeof incoming === 'string') {
        incoming = pulseRange.createDateRangeFromString(incoming);
      }
      if (!incoming) return;
      if (this._dateRange
        && pulseRange.equals(incoming, this._dateRange, (a, b) => (a >= b) && (a <= b))) {
        return;
      }
      this._dateRange = incoming;
    }

  }

  pulseComponent.registerElement('x-periodtoolbar', periodtoolbarComponent, ['period-context', 'displayshiftrange', 'range', 'hide-period-buttons', 'hide-zooms']);
})();
