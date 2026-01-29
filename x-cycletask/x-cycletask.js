// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-cycletask
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 * @requires module:pulseSvg
 */
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseSvg = require('pulseSvg');
var pulseConfig = require('pulseConfig');

(function () {
  class CycleTaskComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      // DOM
      self._pie = undefined;
      self._messageSpan = undefined;
      self._content = undefined;

      self._height = '100%'; 

      //  Used sizes : to have better rounded values for circumference
      self._circleRadius = 79.57747;
      self._xyPosition = 95.0; // Center != Rayon ext -> + margin
      self._ringWidth = 25.0; // in %
      self._middleRadius = this._circleRadius * (1.0 - this._ringWidth / 100.0);

      // Timer
      self._dashTimeRefreshTimer = null;

      // Server time diff
      self._diffServerTimeMinusNowMSec = 0;

      // Task (GraphQL)
      self._taskName = '';
      self._taskStartDateTime = null;
      self._taskEndDateTime = null;
      self._hasTaskInstance = false;

      // Donuts (SVG rings)
      // - _taskStateRing: always full ring, only color changes (grey/white/red)
      // - _taskProgressRing: reserved for the visual timer/progress (2nd donut)
      self._taskStateRing = null;
      self._taskProgressRing = null;

      return self;
    }

    _removeAllChildren (element) {
      if (pulseUtility.isNotDefined(element)) {
        return;
      }
      while (element.firstChild) {
        element.removeChild(element.firstChild);
      }
    }

    _setTextContent (selector, text) {
      let el = this.element.querySelector(selector);
      if (!el) {
        return;
      }
      el.textContent = pulseUtility.isNotDefined(text) ? '' : String(text);
    }

    _showElement (selector) {
      let el = this.element.querySelector(selector);
      if (!el) {
        return;
      }
      el.style.display = '';
    }

    _applyEllipsisToSvgText(textElement, fullText, maxWidth) {
      if (pulseUtility.isNotDefined(textElement)
        || pulseUtility.isNotDefined(fullText)
        || !(maxWidth > 0)
        || typeof textElement.getComputedTextLength !== 'function') {
        return;
      }

      // Ensure we start from the full text
      textElement.textContent = String(fullText);

      // If it already fits, nothing to do
      try {
        if (textElement.getComputedTextLength() <= maxWidth) {
          return;
        }
      }
      catch (e) {
        // Some browsers may throw if not rendered yet; we'll retry later
      }

      const ellipsis = '…';
      const original = String(fullText);

      // Binary search the maximum prefix length that fits with ellipsis
      let low = 0;
      let high = original.length;
      let best = 0;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const candidate = (mid > 0 ? original.slice(0, mid) : '') + ellipsis;
        textElement.textContent = candidate;

        let lengthOk = false;
        try {
          lengthOk = textElement.getComputedTextLength() <= maxWidth;
        }
        catch (e) {
          // If measurement fails (not rendered), bail out.
          textElement.textContent = original;
          return;
        }

        if (lengthOk) {
          best = mid;
          low = mid + 1;
        }
        else {
          high = mid - 1;
        }
      }

      textElement.textContent = (best > 0 ? original.slice(0, best) : '') + ellipsis;
    }

    _setExclusiveClass(circle, knownClasses, classToAdd) {
      if (pulseUtility.isNotDefined(circle) || pulseUtility.isNotDefined(circle.classList)) {
        return;
      }

      for (let i = 0; i < knownClasses.length; i++) {
        circle.classList.remove(knownClasses[i]);
      }

      if (!pulseUtility.isNotDefined(classToAdd) && classToAdd !== '') {
        circle.classList.add(classToAdd);
      }
    }

    _applyTaskStateRingClass(serverNow) {
      this._setExclusiveClass(
        this._taskStateRing,
        ['cycletask-taskstate-none', 'cycletask-taskstate-inprogress', 'cycletask-taskstate-negative'],
        this._getTaskStateRingClass(serverNow)
      );
    }

    _applyTaskProgressRingClass(serverNow) {
      this._setExclusiveClass(
        this._taskProgressRing,
        ['cycletask-taskprogress-empty', 'cycletask-taskprogress-active'],
        this._getTaskProgressRingClass(serverNow)
      );
    }

    _getTaskStateRingProgress(serverNow) {
      // Donut #1 must remain visible even when waiting for a task
      return 1;
    }

    _getTaskStateRingClass (serverNow) {
      if (pulseUtility.isNotDefined(this._taskStartDateTime)
        || pulseUtility.isNotDefined(this._taskEndDateTime)) {
        return 'cycletask-taskstate-none';
      }

      // Negative timer == after end
      if (serverNow.getTime() > this._taskEndDateTime.getTime()) {
        return 'cycletask-taskstate-negative';
      }

      // White only if task is in progress
      if (this._taskStartDateTime.getTime() <= serverNow.getTime()
        && serverNow.getTime() <= this._taskEndDateTime.getTime()) {
        return 'cycletask-taskstate-inprogress';
      }

      // Task exists but not in progress yet => keep grey
      return 'cycletask-taskstate-none';
    }

    _getTaskProgressRingClass (serverNow) {
      if (pulseUtility.isNotDefined(this._taskStartDateTime)
        || pulseUtility.isNotDefined(this._taskEndDateTime)) {
        return 'cycletask-taskprogress-empty';
      }

      if (this._taskStartDateTime.getTime() <= serverNow.getTime()
        && serverNow.getTime() <= this._taskEndDateTime.getTime()) {
        return 'cycletask-taskprogress-active';
      }

      return 'cycletask-taskprogress-empty';
    }

    _updateTaskStateRing (serverNow) {
      if (pulseUtility.isNotDefined(this._taskStateRing)) {
        return;
      }

      // Full ring when a task exists, empty when there is no task
      pulseSvg.changeSegmentOnDonutEnd(this._taskStateRing, this._circleRadius, this._getTaskStateRingProgress(serverNow));
      this._applyTaskStateRingClass(serverNow);
    }

    _updateTaskProgressRing (serverNow) {
      if (pulseUtility.isNotDefined(this._taskProgressRing)) {
        return;
      }

      let progress = 0.0;
      if (!pulseUtility.isNotDefined(this._taskStartDateTime)
        && !pulseUtility.isNotDefined(this._taskEndDateTime)
        && (this._taskStartDateTime.getTime() <= serverNow.getTime())
        && (serverNow.getTime() <= this._taskEndDateTime.getTime())) {
        let totalMSec = this._taskEndDateTime.getTime() - this._taskStartDateTime.getTime();
        totalMSec = Math.max(1000, totalMSec);
        let remainingMSec = this._taskEndDateTime.getTime() - serverNow.getTime();
        progress = 1.0 - (remainingMSec / totalMSec);
        progress = Math.max(0.0, Math.min(1.0, progress));
      }

      // Progress is driven by stroke-dasharray; classes are managed directly on the element
      pulseSvg.changeSegmentOnDonutEnd(this._taskProgressRing, this._circleRadius, progress);
      this._applyTaskProgressRingClass(serverNow);
    }

    _updateTaskTimerAndSchedule () {
      this._stopDashTimeRefreshTimer();

      let serverNow = new Date((new Date()).getTime() + this._diffServerTimeMinusNowMSec);

      // Always keep the state ring updated (grey/white/red)
      this._updateTaskStateRing(serverNow);
      this._updateTaskProgressRing(serverNow);

      if (pulseUtility.isNotDefined(this._taskStartDateTime)
        || pulseUtility.isNotDefined(this._taskEndDateTime)) {
        // No task => show Loading, no timer
        if (!this._hasTaskInstance) {
          this._setTextContent('.time-in-pie', this.getTranslation('loading', 'Loading'));
        }
        else {
          this._setTextContent('.time-in-pie', '');
        }
        return;
      }
      let target = null;

      if (serverNow.getTime() < this._taskStartDateTime.getTime()) {
        // Countdown to task start
        target = this._taskStartDateTime;
      }
      else {
        // Countdown to task end (can become negative after end)
        target = this._taskEndDateTime;
      }

      let seconds = Math.trunc((target.getTime() - serverNow.getTime()) / 1000);
      this._translateSecondsToTextAndDisplay(seconds);

      // Refresh every second for a smooth timer
      this._dashTimeRefreshTimer = setTimeout(
        this._updateTaskTimerAndSchedule.bind(this),
        1000);
    }

    _stopDashTimeRefreshTimer() {
      if (this._dashTimeRefreshTimer) {
        clearTimeout(this._dashTimeRefreshTimer);
        this._dashTimeRefreshTimer = null;
      }
    }

    _translateSecondsToTextAndDisplay(seconds) {
      if (Math.abs(seconds) < 60) {
        let text = seconds + 's';
        this._setTextContent('.time-in-pie', text);
      }
      else { // HH:mm display
        let mins = Math.abs(seconds) / 60; // Should be enough
        if (seconds < 0) {
          // For negative timers, do not over-round
          mins = Math.floor(Math.abs(seconds) / 60);
        }
        else {
          mins = Math.ceil(Math.abs(seconds) / 60); // ex : 100 sec -> display 2 min
        }
        let hours = Math.floor(mins / 60);
        mins = mins % 60;

        let text = ((seconds >= 0) ? '' : '-') + hours + ':' + (mins > 9 ? '' + mins : '0' + mins);
        this._setTextContent('.time-in-pie', text);
      }
    }

    _createTextInTheMiddle(svg, topTextToDisplay, bottomTextToDisplay) {
      // Show text + positions -> GROUP
      let middleAvailableWidth = Math.sqrt(2 * this._middleRadius * this._middleRadius);
      // Keep the title inside the donut: give it most of the available width and
      // truncate it with an ellipsis based on the rendered width.
      let topTextWidth = middleAvailableWidth * 0.90;
      let bottomTextWidth = middleAvailableWidth;
      let topTextHeight = middleAvailableWidth / 5;
      let bottomTextHeight = middleAvailableWidth / 3; // Was 2, but sometimes text was over pie
      let topTextBottom = this._xyPosition - middleAvailableWidth / 4; // + middleAvailableWidth/4;
      let bottomTextBottom = this._xyPosition + middleAvailableWidth / 4; // + middleAvailableWidth*4/5;

      // Show text + positions -> RECT
      let topTextGroup = document.createElementNS(pulseSvg.get_svgNS(), 'g');
      let rectTop = document.createElementNS(pulseSvg.get_svgNS(), 'rect');
      rectTop.setAttribute('x', this._xyPosition - topTextWidth / 2);
      rectTop.setAttribute('y', topTextBottom - topTextHeight);
      rectTop.setAttribute('width', topTextWidth);
      rectTop.setAttribute('height', topTextHeight);
      rectTop.setAttribute('fill', 'transparent');
      topTextGroup.appendChild(rectTop);

      let bottomTextGroup = document.createElementNS(pulseSvg.get_svgNS(), 'g');
      let rectBottom = document.createElementNS(pulseSvg.get_svgNS(), 'rect');
      rectBottom.setAttribute('x', this._xyPosition - bottomTextWidth / 2);
      rectBottom.setAttribute('y', bottomTextBottom - bottomTextHeight);
      rectBottom.setAttribute('width', bottomTextWidth);
      rectBottom.setAttribute('height', bottomTextHeight);
      rectBottom.setAttribute('fill', 'transparent');
      bottomTextGroup.appendChild(rectBottom);

      // Show text + positions -> TEXT
      // Text top line
      let displayTop = document.createElementNS(pulseSvg.get_svgNS(), 'text');
      displayTop.setAttribute('x', '50%');
      displayTop.setAttribute('y', topTextBottom);
      displayTop.setAttribute('class', 'text-top');
      displayTop.setAttribute('text-anchor', 'middle');
      //displayTop.setAttribute('alignment-baseline', 'baseline'); // 'middle'); = KO with Chrome
      displayTop.setAttribute('font-weight', 'bold');

      // Adapt font-size depending on the number of characters (approximately)
      let fontsize = topTextHeight;
      if (topTextToDisplay.length > 8)
        fontsize -= (topTextToDisplay.length - 8);
      if (fontsize < 11)
        fontsize = 11;
      displayTop.setAttribute('font-size', fontsize);
      displayTop.textContent = topTextToDisplay;

      // Tooltip with the full title
      let topTitle = document.createElementNS(pulseSvg.get_svgNS(), 'title');
      topTitle.textContent = topTextToDisplay;
      displayTop.appendChild(topTitle);

      // Ellipsis to keep text inside the allocated width
      const maxTitleWidth = Math.max(0, topTextWidth - 2);
      // Try immediately (works if SVG is already in DOM), and retry next frame otherwise.
      this._applyEllipsisToSvgText(displayTop, topTextToDisplay, maxTitleWidth);
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
          this._applyEllipsisToSvgText(displayTop, topTextToDisplay, maxTitleWidth);
        });
      }

      topTextGroup.appendChild(displayTop);

      // Text bottom line
      let displayBottom = document.createElementNS(pulseSvg.get_svgNS(), 'text');
      displayBottom.setAttribute('x', '50%');
      displayBottom.setAttribute('y', bottomTextBottom);
      displayBottom.setAttribute('text-anchor', 'middle');
      //displayBottom.setAttribute('alignment-baseline', 'baseline'); // 'middle'); = KO with Chrome
      displayBottom.setAttribute('font-weight', 'bold');
      displayBottom.setAttribute('font-size', bottomTextHeight);
      displayBottom.setAttribute('class', 'time-in-pie');
      displayBottom.textContent = bottomTextToDisplay;
      bottomTextGroup.appendChild(displayBottom);

      // Append
      svg.appendChild(topTextGroup);
      svg.appendChild(bottomTextGroup);
    }

    _restoreDefaultValues() {
      this._stopDashTimeRefreshTimer();
      this._dashTimeRefreshTimer = null;

      this._taskName = '';
      this._taskStartDateTime = null;
      this._taskEndDateTime = null;
      this._hasTaskInstance = false;
      this._taskStateRing = null;
      this._taskProgressRing = null;

      this._diffServerTimeMinusNowMSec = pulseConfig.getInt('diffServerTimeMinusNowMSec', 0);
    }

    _draw() {
      // Clean SVG
      if ((this._pie == undefined) || (this._pie == null)) {
        return;
      }
      // Remove Old SVG
      this._pie.querySelectorAll('.cycletask-svg').forEach(n => n.remove());

      // CREATE SVG
      let svg = pulseSvg.createBase(this._height, // == width
        this._height, // height
        'donut', 2 * this._xyPosition, 2 * this._xyPosition);
      svg.setAttribute('class', 'cycletask-svg');
      this._pie.insertBefore(svg, this._pie.firstChild);

      let g = document.createElementNS(pulseSvg.get_svgNS(), 'g');
      svg.appendChild(g);

      // PIE - rotate (so the ring starts at the top like the original component)
      g.setAttribute('transform', 'rotate(-90 ' + this._xyPosition + ' ' + this._xyPosition + ')');

      // Donut #1 (state ring): grey if no task, white if task exists, red if timer is negative
      let serverNow = new Date((new Date()).getTime() + this._diffServerTimeMinusNowMSec);
      this._taskStateRing = pulseSvg.createSegmentOnDonut(
        this._xyPosition, this._xyPosition, this._circleRadius,
        'transparent', '',
        null, this._ringWidth, 0, this._getTaskStateRingProgress(serverNow));
      g.appendChild(this._taskStateRing);
      this._applyTaskStateRingClass(serverNow);

      // Donut #2 (reserved): visual progress/timer ring (kept empty for now)
      this._taskProgressRing = pulseSvg.createSegmentOnDonut(
        this._xyPosition, this._xyPosition, this._circleRadius,
        'transparent', '',
        null, this._ringWidth, 0, 0);
      g.appendChild(this._taskProgressRing);
      this._applyTaskProgressRingClass(serverNow);

      // Circle in the middle (to allow writing something)
      let circleMiddle = pulseSvg.createCircle(this._xyPosition, this._xyPosition,
        this._middleRadius, 'transparent', 'donut-hole');
      g.appendChild(circleMiddle);

      // Texts: top = task name, middle = timer (updated asynchronously)
      this._createTextInTheMiddle(svg, this._taskName || '', '');
      this._updateTaskTimerAndSchedule();
    } // end _draw

    initialize() {
      this.addClass('pulse-piegauge');

      // In case of clone, need to be empty :
      this._removeAllChildren(this.element);

      // Create DOM - Content
      this._pie = document.createElement('div');
      this._pie.classList.add('cycletask-progresspie');

      this._content = document.createElement('div');
      this._content.classList.add('cycletask-content');
      this._content.appendChild(this._pie);

      // Create DOM - Loader
      let loader = document.createElement('div');
      loader.classList.add('pulse-loader');
      loader.innerHTML = this.getTranslation('loadingDots', 'Loading...');
      loader.style.display = 'none';

      let loaderDiv = document.createElement('div');
      loaderDiv.classList.add('pulse-loader-div');
      loaderDiv.appendChild(loader);
      this._content.appendChild(loaderDiv);

      // Create DOM - message for error
      this._messageSpan = document.createElement('span');
      this._messageSpan.classList.add('pulse-message');
      this._messageSpan.innerHTML = '';

      let messageDiv = document.createElement('div');
      messageDiv.classList.add('pulse-message-div');
      messageDiv.appendChild(this._messageSpan);
      this._content.appendChild(messageDiv);

      this.element.appendChild(this._content);


      this.switchToNextContext();
      return;
    }

    attributeChangedWhenConnectedOnce(attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
          if (this.isInitialized()) {
            this.start();
          }
          break;
        default:
          break;
      }
    }

    clearInitialization() {
      this._stopDashTimeRefreshTimer();

      // DOM
      this._removeAllChildren(this.element);
      this._pie = undefined;
      this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters() {
      if (!this.element.hasAttribute('machine-id')) {
        this.setError('missing machine-id');
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        this.switchToKey('Error', () => this.displayError('invalid machine-id'), () => this.removeError());
        return;
      }
      this.switchToNextContext();
    }

    displayError(message) {
      if (!pulseUtility.isNotDefined(this._messageSpan)) {
        this._messageSpan.innerHTML = message;
      }
    }

    removeError() {
      if (!pulseUtility.isNotDefined(this._messageSpan)) {
        this._messageSpan.innerHTML = '';
      }
    }

    get refreshRate() {
      return 1000 * Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));
    }

    getShortUrl() {
      return 'graphql';
    }

    postData() {
      let request = `query ($machineId: ID!) { taskInstanceByMachineId(machineId: $machineId) { start end taskTemplate { name } } }`;
      return {
        query: request,
        variables: {
          machineId: this.element.getAttribute('machine-id')
        }
      };
    }

    refresh(data) {
      // GraphQL responses typically are: { data: { taskInstanceByMachineId: { start, end, taskTemplate: { name } } } }
      let taskInstance = null;
      if (!pulseUtility.isNotDefined(data) && !pulseUtility.isNotDefined(data.data)) {
        taskInstance = data.data.taskInstanceByMachineId || data.data.taskInstance;
      }
      else if (!pulseUtility.isNotDefined(data)) {
        taskInstance = data.taskInstanceByMachineId || data.taskInstance;
      }

      if (pulseUtility.isNotDefined(taskInstance)) {
        this._restoreDefaultValues();
        // No task: no timer countdown; show Loading in the center
        this._hasTaskInstance = false;
        this._showElement('.cycletask-progresspie');
        this._draw();
        return;
      }

      let nextName = (taskInstance.taskTemplate && taskInstance.taskTemplate.name)
        ? taskInstance.taskTemplate.name
        : '';
      let nextStart = taskInstance.start;
      let nextEnd = taskInstance.end;

      let hasChanged =
        (this._taskName !== nextName)
        || (pulseUtility.isNotDefined(this._taskStartDateTime) || this._taskStartDateTime.toISOString() !== nextStart)
        || (pulseUtility.isNotDefined(this._taskEndDateTime) || this._taskEndDateTime.toISOString() !== nextEnd);

      if (hasChanged) {
        this._restoreDefaultValues();
        this._hasTaskInstance = true;
        this._taskName = nextName;
        this._taskStartDateTime = pulseUtility.isNotDefined(nextStart) ? null : new Date(nextStart);
        this._taskEndDateTime = pulseUtility.isNotDefined(nextEnd) ? null : new Date(nextEnd);

        this._showElement('.cycletask-progresspie');
        this._draw();
      }
    }
  }

  pulseComponent.registerElement('x-cycletask', CycleTaskComponent, ['machine-id']);
})();
