// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-cycleprogresspie
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 * @requires module:pulseSvg
 */
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseSvg = require('pulseSvg');
var pulseConfig = require('pulseConfig');
var eventBus = require('eventBus');
//var state = require('state');

(function () {
  class CycleProgressPieComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      // DOM -> never in contructor
      self._pie = undefined;
      self._messageSpan = undefined;
      self._content = undefined;

      self._height = '100%'; //30; //defaultHeight); -> for compatibility
      //this._barwidth = 100; // Default

      //  Used sizes : Keep strange values to have better rounded values for circumference
      self._circleRadius = 79.57747;
      self._xyPosition = 95.0; // Center != Rayon ext -> + margin
      self._ringWidth = 25.0; // in %
      self._middleRadius = this._circleRadius * (1.0 - this._ringWidth / 100.0);
      self._dashWidth = 3.0; // %
      self._dashCircleRadius = 58.887;
      self._halfLineWidth = 0.0018; // in %
      // tmp
      self._dashcircle = undefined;
      self._ringStrokeClass = '';

      // To help understand code. Please do not remove :
      //this._activeEvent == true  <=> past event   <=> until <= 0
      //this._activeEvent == false <=> future event <=> until >= 0
      self._untilNextMSec = 0; // this._eventDateTime - 'now'
      // proche de animationSeconds = this._animationEndServerDateTimev (= end cycle or seq) - 'now'

      // Timer
      self._dashTimeRefreshTimer = null;

      // Server time diff
      self._diffServerTimeMinusNowMSec = 0;

      // From reveived data:
      self._data = null;
      // data.event
      self._activeEvent = null;
      //self._untilNextMSec = null; // 0
      self._severity = '';
      self._eventKind = '';
      self._eventDateTime = null;
      self._possiblyLate = false;

      //  Circle animation
      self._notRunningCanCancelAnimation = false;
      self._completion = null;
      self._endOfCyclePercent = 1;
      self._animationEndPercent = null;
      self._animationEndServerDateTime = null;
      // Text bottom + dash animation
      self._textBottomClass = '';
      self._needChangeDash = true;
      self._secondsBeforeNextChange = 0;
      self._secondsBeforeMinuteChange = 0;
      self._secondsBeforeDashEnd = 0;
      self._pauseWhenMachiningNotRunning = false;

      self._longText = '';

      // Threslhold
      self._threshold1 = 600
      self._threshold2 = 180;

      return self;
    }

    //get content () { return this._content; } // Optional

    // -> animate : text / dash ....

    // internal use. Prefer calling _displayCompletionTextAndAnimate
    _loopdisplayCompletionTextAndAnimate () {
      this._displayedCompletion += 1;
      $(this.element).find('.time-in-pie').text(this._displayedCompletion + ' %');

      if (this._completionTextAnimationEnd > this._displayedCompletion) {
        this._textPercentRefreshTimer = setTimeout(
          this._loopdisplayCompletionTextAndAnimate.bind(this),
          1000 * this._completionTextSecondsBetweenAnimations);
      }
      else {
        this._stopCompletionTextTimer();
      }
    }

    _stopCompletionTextTimer () {
      if (this._textPercentRefreshTimer) {
        clearTimeout(this._textPercentRefreshTimer);
      }
      this._textPercentRefreshTimer = null;
    }

    _displayCompletionTextAndAnimate () {
      // Display
      let completionToDisplay = 100.0 * this._completion; // ==  bounded this._data.Completion
      this._displayedCompletion = Math.round(completionToDisplay);
      $(this.element).find('.time-in-pie').text(this._displayedCompletion + ' %');

      // Check if text animation is needed
      if (this._currentArcAnimationEnd != null && this._currentArcAnimationEnd != null) {
        this._completionTextAnimationEnd = Math.round(100.0 * this._currentArcAnimationEnd);

        // if end not reached - prepare text animation
        if (this._completionTextAnimationEnd > this._displayedCompletion) {
          let nbOfAnimations = this._completionTextAnimationEnd - this._displayedCompletion;
          this._completionTextSecondsBetweenAnimations =
            this._currentArcAnimationSeconds / (nbOfAnimations);

          this._textPercentRefreshTimer = setTimeout(
            this._loopdisplayCompletionTextAndAnimate.bind(this),
            1000 * this._completionTextSecondsBetweenAnimations);
        }
      }
    }

    // animate dash
    _startDashTimeRefreshTimer (seconds) {
      this._stopDashTimeRefreshTimer();
      console.log('CycleProgressPie(' + this.element.getAttribute('machine-id') + ') '
        + ' Start timer(' + seconds + ')');
      // Re-start timer
      var self = this;
      this._dashTimeRefreshTimer = setTimeout(
        function () {
          /*console.log('CycleProgressPie(' + self.element.getAttribute('machine-id')
            + ' timer called');*/
          self._checkTimeAndAnimateTimeAndDash();
        },
        1000 * seconds);
    }

    _stopDashTimeRefreshTimer () {
      if (this._dashTimeRefreshTimer) {
        clearTimeout(this._dashTimeRefreshTimer);
        this._dashTimeRefreshTimer = null;
      }
    }

    _translateSecondsToTextAndDisplay (seconds) {
      if (Math.abs(seconds) < 60) {
        let text = seconds + 's';
        $(this.element).find('.time-in-pie').text(text);
      }
      else { // HH:mm display
        let mins = Math.abs(seconds) / 60; // Should be enough
        if (this._activeEvent)
          mins = Math.floor(Math.abs(seconds) / 60);
        else
          mins = Math.ceil(Math.abs(seconds) / 60); // ex : 100 sec -> display 2 min
        let hours = Math.floor(mins / 60);
        mins = mins % 60;

        let text = ((seconds >= 0) ? '' : '-') + hours + ':' + (mins > 9 ? '' + mins : '0' + mins);
        $(this.element).find('.time-in-pie').text(text);
      }
    }

    _setTimeColorAndDispatch () {
      if (pulseUtility.isNotDefined(this._eventDateTime)) {
        eventBus.EventBus.dispatchToContext('nextStopStatusChange',
          this.element.getAttribute('status-context'), {});
      }
      else {
        let thresholdClass = '';
        // Find Status Color
        if (!this._activeEvent) {
          // this._severity // this._textBottomClass;
          if (this._untilNextMSec / 1000 < this._threshold2) {
            thresholdClass = 'threshold2';
            // Change text color
            $(this.element).find('.time-in-pie').removeClass('threshold1');
            $(this.element).find('.time-in-pie').addClass('class', 'threshold2');
          }
          else if (this._untilNextMSec / 1000 < this._threshold1) {
            thresholdClass = 'threshold1';
            // Change text color
            $(this.element).find('.time-in-pie').removeClass('threshold2');
            $(this.element).find('.time-in-pie').addClass('class', 'threshold1');
          }
          else {
            // Change text color
            $(this.element).find('.time-in-pie').removeClass('threshold1');
            $(this.element).find('.time-in-pie').removeClass('threshold2');
          }
        }
        else {
          // Change text color
          $(this.element).find('.time-in-pie').removeClass('threshold1');
          $(this.element).find('.time-in-pie').removeClass('threshold2');
        }

        // Dispatch message for machine-tab
        eventBus.EventBus.dispatchToContext('nextStopStatusChange',
          this.element.getAttribute('status-context'),
          {
            'untilNextStopMSec': this._untilNextMSec,
            'thresholdClass': thresholdClass,
            'severity': this._severity,
            'eventKind': this._eventKind
          });
      }
    }

    _checkTimeAndAnimateTimeAndDash () {
      let animateTimeAndDash = true;
      let stopDashAnimation = false;

      // Stop timer
      this._stopDashTimeRefreshTimer();

      // Check RemainingTime
      if (!pulseUtility.isNotDefined(this._eventDateTime)) {
        let serverNow = new Date((new Date()).getTime() + this._diffServerTimeMinusNowMSec);
        this._untilNextMSec = this._eventDateTime.getTime()
          - serverNow.getTime(); // == NOW - diff == nowOnServer

        // Active event + negative time -> NEVER
        if (this._activeEvent) {
          if (this._untilNextMSec >= 0) {
            console.error('CycleProgressPie(' + this.element.getAttribute('machine-id') + ') '
              + ' time & dash = no animation + ' + (-this._untilNextMSec) + ' < 0');
            this._untilNextMSec = 0;
            animateTimeAndDash = false;
          }
        }
        // Coming event 
        if (!this._activeEvent) {
          if (this._pauseWhenMachiningNotRunning && this._notRunningCanCancelAnimation) {
            console.error('CycleProgressPie(' + this.element.getAttribute('machine-id') + ') '
              + ' time & dash = no animation. PauseWhenMachiningNotRunning');
            animateTimeAndDash = false;
          }
          if (this._untilNextMSec < 0) {
            if (!this._possiblyLate) { // not possibly late -> stop
              console.error('CycleProgressPie(' + this.element.getAttribute('machine-id') + ') '
                + ' time & dash = no animation + ' + (-this._untilNextMSec) + ' < 0 and not possibly late');
              this._untilNextMSec = 0;
              animateTimeAndDash = false;
            }
            else { // Allowed late -> no dash
              stopDashAnimation = true; // Stop only Dash, not text
              //-> Could be changed later with dash in the opposite direction
            }
          }
        }
      }
      // Color + dispatch
      this._setTimeColorAndDispatch(); // Warning ! Uses _untilNextMSec

      // No event == no displayed time in circle
      if (pulseUtility.isNotDefined(this._eventDateTime)) { // == no active or coming event
        if (pulseUtility.isNotDefined(this._data.Completion)) {
          $(this.element).find('.time-in-pie').text('');
          //$(this._dashcircle).css('animation-duration', '0s');
        }
        else {
          // Show completion % text in the middle
          this._displayCompletionTextAndAnimate();
        }
        return;
      }

      // Check time to display inside + display
      let seconds = parseInt(this._untilNextMSec / 1000, 10);
      //this._secondsBeforeNextChange = seconds % 10;
      let secondsForDash = 0;

      // Find dash info + refresh time
      if (this._activeEvent) { // growing time
        seconds = -seconds; // Always positive display

        let durationToDisplayInSec = Math.floor(seconds / 10) * 10;
        if (Math.abs(durationToDisplayInSec) > 60) {
          durationToDisplayInSec = Math.floor(seconds / 60) * 60;
        }
        this._translateSecondsToTextAndDisplay(durationToDisplayInSec);

        // if (seconds > 0) { always
        this._secondsBeforeNextChange = 10 - seconds % 10;
        secondsForDash = seconds % 60;

        this._secondsBeforeMinuteChange = 60 - secondsForDash;
        this._secondsBeforeDashEnd = 60 - secondsForDash;
      }
      else { // WARNING durationSec can be positive or negative - decreasing time
        let durationToDisplayInSec = Math.ceil(seconds / 10) * 10;
        if (Math.abs(durationToDisplayInSec) > 60) {
          durationToDisplayInSec = Math.ceil(seconds / 60) * 60;
        }
        this._translateSecondsToTextAndDisplay(durationToDisplayInSec);

        if (seconds > 0) {
          this._secondsBeforeNextChange = seconds % 10 + 1;
          secondsForDash = seconds % 60;
          this._secondsBeforeMinuteChange = secondsForDash + 1;
          if (secondsForDash == 0)
            secondsForDash = 60;
          this._secondsBeforeDashEnd = secondsForDash;
        }
        else {
          this._secondsBeforeNextChange = 11 + seconds % 10;
          if (this._secondsBeforeNextChange == 11)
            this._secondsBeforeNextChange = 1;

          secondsForDash = 0; // No negative dash -> TO DO : 11 + seconds % 10; ?
          //stopDashAnimation = true; done before
          this._secondsBeforeMinuteChange = 61 + seconds % 60;
          if (this._secondsBeforeMinuteChange == 61)
            this._secondsBeforeMinuteChange = 1;
          this._secondsBeforeDashEnd = 0; // No animation when <0 for the moment
        }
      }

      /*console.log('CycleProgressPie(' + this.element.getAttribute('machine-id') + ') '
        + ' DASH - sec=' + seconds
        + ' - sBNextCg=' + this._secondsBeforeNextChange
        + ' - sForDash=' + secondsForDash
        + ' - sBMinCg=' + this._secondsBeforeMinuteChange);*/

      if (this._needChangeDash == true) {
        // DRAW dash circle
        if (!animateTimeAndDash || stopDashAnimation) {
          // No animation
          $(this._dashcircle).css('animation-duration', '0s');
          // Fixed dash circle
          pulseSvg.initFixedDashCircleDasharray(this._dashcircle,
            this._dashCircleRadius, secondsForDash);
        }
        else {
          //console.log('CycleProgressPie(' + this.element.getAttribute('machine-id') + ') '
          //  + ' animate DASH sec=' + secondsForDash + ' during=' + this._secondsBeforeDashEnd);
          // Animate dash circle
          let keyframeName = 'cycleprogress-dash-' + this.element.getAttribute('machine-id') + '-' + secondsForDash + 's';
          if (this._activeEvent) {
            keyframeName += '-increase';
          }
          pulseSvg.createStyleDashCircleRotation(this._dashcircle, // this, 
            keyframeName, secondsForDash, this._dashCircleRadius, this._activeEvent);

          $(this._dashcircle).css('animation-timing-function', 'linear');
          $(this._dashcircle).css('animation-duration', this._secondsBeforeDashEnd + 's');
          $(this._dashcircle).css('animation-name', keyframeName);
        }
      }
      /*else {
        console.error('CycleProgressPie(' + this.element.getAttribute('machine-id') + ') '
          + 'NO DASH refresh');
      }*/

      if (Math.abs(seconds) >= 80) { // < 1 min == display HH:mm
        this._needChangeDash = true;
        if (this._secondsBeforeNextChange != this._secondsBeforeMinuteChange) {
          this._secondsBeforeNextChange = this._secondsBeforeMinuteChange;
        }
      }
      else { // Display seconds (sometimes no dash refresh after timer)
        if (this._secondsBeforeNextChange != this._secondsBeforeMinuteChange) {
          this._needChangeDash = false; // After next timer 
        }
        else {
          this._needChangeDash = true;
        }
      }

      if (animateTimeAndDash) {
        // Start timer to update data
        this._startDashTimeRefreshTimer(this._secondsBeforeNextChange);
      }
    }

    _getAdjustedCompletion (realBeginOfDisplay, realEndOfDisplay) {
      if (this._completion == null)
        return this._completion;

      //console.log('CycleProgressPie(' + this.element.getAttribute('machine-id')
      //  + '): AdjustedCompletion START - from ' + this._completion);

      let adjustedCompletion = this._completion;
      // Ajusted using animation
      if (this._animationEndPercent != null
        && this._animationEndPercent != 0 // If == 0, do not adjust
        && this._animationEndServerDateTime != null) {
        let serverDataDate = new Date(this._data.DataTime);

        if (this._animationEndServerDateTime.getTime() <= serverDataDate.getTime()) {
          // _animationEndServerDateTime COULD be before DataDate ! -> correct 
          adjustedCompletion = this._animationEndPercent; // Go to end of completion !
          console.log('CycleProgressPie(' + this.element.getAttribute('machine-id')
            + '): DataDate after animation end');
        }
        else if (this._animationEndServerDateTime.getTime() <= this._serverNow.getTime()) {
          // _animationEndServerDateTime COULD be before serverNow ! -> correct it !
          adjustedCompletion = this._animationEndPercent; // Go to end of completion !
          console.log('CycleProgressPie(' + this.element.getAttribute('machine-id')
            + '): now after animation end');
        }
        else if (this._serverNow.getTime() < serverDataDate.getTime()) {
          // serverDataDate SHOULD NOT be after serverNow ! No adjustement !
          adjustedCompletion = this._completion;
          console.log('CycleProgressPie(' + this.element.getAttribute('machine-id')
            + '): now before Data date');
          if (this._animationEndPercent <= adjustedCompletion)
            adjustedCompletion = this._animationEndPercent;
        }
        else {
          // peu importe : if (this._serverNow.getTime() <= serverDataDate.getTime()) {
          // Calculate Completion at 'now'
          adjustedCompletion = this._animationEndPercent
            - (this._animationEndPercent - this._completion)
            * (this._animationEndServerDateTime.getTime() - this._serverNow.getTime())
            / (this._animationEndServerDateTime.getTime() - serverDataDate.getTime());

          if (this._animationEndPercent <= adjustedCompletion)
            adjustedCompletion = this._animationEndPercent;
        }
      }

      console.log('CycleProgressPie(' + this.element.getAttribute('machine-id')
        + '): adjustedCompletion=' + adjustedCompletion
        + ' from completion= ' + this._completion
        + ' animationEnd= ' + this._animationEndPercent
        + ' anim end= ' + pulseUtility.convertDayForWebService(this._animationEndServerDateTime)
        + ' server now=' + pulseUtility.convertDayForWebService(this._serverNow)
        + ' DataTime= ' + this._data.DataTime);

      // Move completion in the segment if necessary
      if (adjustedCompletion < realBeginOfDisplay)
        return realBeginOfDisplay;
      if (adjustedCompletion >= realEndOfDisplay)
        return realEndOfDisplay;

      return adjustedCompletion;
    }

    // Draw arc : blue + background colored - animated when needed
    // shorten using this._halfLineWidth at begin & end
    // from, to, completion, endOfAnimation => in percent (== between 0 & 1)
    _drawArc (svg, from, to) {
      let realBegin = (from < 0) ? 0 : from;
      let realEnd = (to > 1) ? 1 : to;

      let realBeginOfDisplay = realBegin + this._halfLineWidth;
      let realEndOfDisplay = realEnd - this._halfLineWidth;

      let realEndOfAnimation = null;
      let animationSeconds = 0;

      if (realBeginOfDisplay > realEndOfDisplay) {
        console.log('CycleProgressPie(' + this.element.getAttribute('machine-id')
          + '): drawArc begindisplay (' + realBeginOfDisplay
          + ') > enddisplay (' + realEndOfDisplay
          + ') NO DRAW -exit');
        return; // Not possible end before begin
      }

      // Here to be the nearest from real diplay and common for AdjustedCompl & animation
      this._serverNow = new Date((new Date()).getTime() + this._diffServerTimeMinusNowMSec);

      // Find split beween 'blue' and 'background' colors
      let completionInSegment = null;
      if (this._completion != null) {
        completionInSegment = this._getAdjustedCompletion(realBeginOfDisplay, realEndOfDisplay); //!=this._completion;

        //console.log('CycleProgressPie(' + this.element.getAttribute('machine-id')
        //+ '): Adjusted completion = ' + completionInSegment);
      }
      else {
        console.log('CycleProgressPie(' + this.element.getAttribute('machine-id')
          + '): drawArc = NO COMPLETION exit');
        return;
      }

      // Find animation END % + durationUntil
      if (!this._notRunningCanCancelAnimation
        && (this._animationEndPercent != null)
        && (this._animationEndServerDateTime != null)) {
        if ((completionInSegment != null)
          && (completionInSegment < realEndOfDisplay)) {
          // Betweeen completion & end 
          if (completionInSegment < this._animationEndPercent) {
            animationSeconds =
              (new Date(this._animationEndServerDateTime).getTime() - this._serverNow.getTime()
              ) / 1000;

            if (animationSeconds <= 0)
              animationSeconds = 0;
            else {
              realEndOfAnimation = Math.min(
                this._animationEndPercent, realEndOfDisplay);
            }
          }
        }
      }

      // 1- BACKGROUND
      if (completionInSegment != null
        && completionInSegment < realEndOfDisplay) {

        let beginOfBk = realBeginOfDisplay; //Math.max(completionInSegment, realBeginOfDisplay);
        let endOfBk = realEndOfDisplay;
        if (beginOfBk < endOfBk) { // To avoid unwanted full ring
          //console.log('CycleProgressPie(' + this.element.getAttribute('machine-id')
          //+ '): drawArc Background from ' + beginOfBk + ' to ' + endOfBk);

          let circleBk = pulseSvg.createSegmentOnDonut(
            this._xyPosition, this._xyPosition, this._circleRadius,
            'transparent', 'donut-ring-background',
            null, this._ringWidth,
            beginOfBk, endOfBk - beginOfBk);

          if (circleBk != null) {
            /* Remove background animation
            if (realEndOfAnimation != null
              && beginOfBk < realEndOfAnimation
              && realEndOfAnimation <= endOfBk) {
              // Animate Bk
              let keyframeNameBk = 'cycleprogress-pie-bk-'
                + this.element.getAttribute('machine-id');
              pulseSvg.createStyleForSegmentOnDonutMovingBegin(circleBk, //this, 
                keyframeNameBk, this._circleRadius,
                beginOfBk, // begin from
                realEndOfAnimation, // to Begin
                endOfBk - beginOfBk, // init width
                endOfBk - realEndOfAnimation); // toWidth
              $(circleBk).css('animation-timing-function', 'linear');
              $(circleBk).css('animation-duration', animationSeconds + 's');
              $(circleBk).css('animation-name', keyframeNameBk);
            }*/
            svg.appendChild(circleBk);
          }
        }
      }
      // 2- 'BLUE' ring
      if ((completionInSegment != null)
        && (realBeginOfDisplay <= completionInSegment)) {

        let beginOfBlue = realBeginOfDisplay;
        let endOfBlue = Math.min(completionInSegment, realEndOfDisplay);

        let circleProgress = pulseSvg.createSegmentOnDonut(
          this._xyPosition, this._xyPosition, this._circleRadius,
          'transparent', this._ringStrokeClass,
          null, this._ringWidth,
          beginOfBlue, endOfBlue - beginOfBlue);

        if (circleProgress != null) {
          console.log('CycleProgressPie(' + this.element.getAttribute('machine-id')
            + '): drawArc from ' + 100.0 * beginOfBlue + ' to ' + 100.0 * endOfBlue);

          if (animationSeconds > 0) {
            if (realEndOfAnimation != null
              && endOfBlue < realEndOfAnimation
              && realEndOfAnimation <= realEndOfDisplay) {
              let keyframeName = 'cycleprogress-pie-'
                + this.element.getAttribute('machine-id');

              this._currentArcAnimationSeconds = animationSeconds;
              this._currentArcAnimationEnd = realEndOfAnimation;

              let roundedAnimSec = Math.ceil(animationSeconds);
              console.log('CycleProgressPie(' + this.element.getAttribute('machine-id')
                + '): drawArc animation '
                + ' from ' + 100 * endOfBlue + '%'
                + ' until ' + 100 * realEndOfAnimation + '% - speed '
                + roundedAnimSec + 'sec');

              pulseSvg.createStyleForSegmentOnDonut(circleProgress, //this, 
                keyframeName, this._circleRadius,
                (endOfBlue - beginOfBlue), // fromWidth
                realEndOfAnimation - beginOfBlue); // toWidth
              $(circleProgress).css('animation-timing-function', 'linear');
              $(circleProgress).css('animation-duration', roundedAnimSec + 's');
              $(circleProgress).css('animation-name', keyframeName);
            }
            /*else {
              console.log('CycleProgressPie(' + this.element.getAttribute('machine-id') + '): no REAL animation');
            }*/
          }
          svg.appendChild(circleProgress);
        }
      }
      else {
        console.log('CycleProgressPie(' + this.element.getAttribute('machine-id')
          + '): drawArc do nothing - completionInSegment (' + completionInSegment
          + '!= null && realBeginOfDisplay (' + realBeginOfDisplay
          + ') <= completionInSegment (' + completionInSegment + ')');
      }
    } // end _drawArc

    _createFixedDashCircle (svg) {
      let circumference = 2 * Math.PI * this._dashCircleRadius;
      let dashSize = circumference / (60 * 2);

      this._dashcircle = pulseSvg.createCircle(
        this._xyPosition, this._xyPosition, this._dashCircleRadius,
        'transparent', this._ringStrokeClass,
        null, this._dashWidth);
      //this._dashcircle.setAttribute('stroke-linecap', "round"); // Not here
      //this._dashcircle.setAttribute('stroke-dasharray', 
      //circumference.toFixed(0) + ' ' + 0); // Filled 100% // Empty 0% = end position
      this._dashcircle.setAttribute('stroke-dasharray',
        0 + ' ' + circumference.toFixed(0)); // Filled 0% // Empty 100% = end position = default
      //this._dashcircle.setAttribute('stroke-dashoffset',
      //  circumference * 0.25); // Begin on top
      svg.appendChild(this._dashcircle);

      let bkColoredCircle = pulseSvg.createCircle(
        this._xyPosition, this._xyPosition, this._dashCircleRadius,
        'transparent', 'cycleprogress-dashed',
        null, this._dashWidth + 2);
      bkColoredCircle.setAttribute('class', 'stroke-color-as-background');
      bkColoredCircle.setAttribute('stroke-dasharray', dashSize.toFixed(0));
      bkColoredCircle.setAttribute('stroke-dashoffset', (dashSize / 2).toFixed(0));
      bkColoredCircle.setAttribute('filter', 'none');
      svg.appendChild(bkColoredCircle);
    }

    _createTextInTheMiddle (svg, topTextToDisplay, bottomTextToDisplay) {
      // Show text + positions -> GROUP
      let middleAvailableWidth = Math.sqrt(2 * this._middleRadius * this._middleRadius);
      let topTextWidth = middleAvailableWidth / 2;
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
      topTextGroup.appendChild(displayTop);

      // Text bottom line
      let displayBottom = document.createElementNS(pulseSvg.get_svgNS(), 'text');
      displayBottom.setAttribute('x', '50%');
      displayBottom.setAttribute('y', bottomTextBottom);
      displayBottom.setAttribute('text-anchor', 'middle');
      //displayBottom.setAttribute('alignment-baseline', 'baseline'); // 'middle'); = KO with Chrome
      displayBottom.setAttribute('font-weight', 'bold');
      displayBottom.setAttribute('font-size', bottomTextHeight);
      //displayBottom.setAttribute('class', this._textBottomClass); inline below
      displayBottom.setAttribute('class', 'time-in-pie ' + this._textBottomClass);
      displayBottom.textContent = bottomTextToDisplay;
      bottomTextGroup.appendChild(displayBottom);

      // Append
      svg.appendChild(topTextGroup);
      svg.appendChild(bottomTextGroup);
    }

    _findTopTextAndStoreEventData () {
      // EVENTS
      if (this._data.ActiveEvents && this._data.ActiveEvents.length > 0) {
        // Manage active events (STOPPED)
        let event = this._data.ActiveEvents[0];
        this._eventDateTime = new Date(event.DateTime);
        this._activeEvent = true;
        this._possiblyLate = false; // event.PossiblyLate; // Pasde sens
        this._eventKind = 'activeevent';
        this._textBottomClass = ' activeevent' + ' ' + event.Severity.LevelName;
        this._ringStrokeClass = 'completion-stroke-activeevent' + ' ' + event.Severity.LevelName;
        this._severity = event.Severity.LevelName;
        //LevelName = Error <-> Level Value > 50 maybe translate... one day
        //console.log('CycleProgressPie(' + this.element.getAttribute('machine-id')
        //          + '): Active event = ' + event.Message);

        // Find & display LongText
        if (!pulseUtility.isNotDefined(event.LongText)) {
          this._longText = event.LongText;
        }
        if (this.element.hasAttribute('textchange-context')) {
          let textchangecontext = pulseUtility.getTextChangeContext(this);
          eventBus.EventBus.dispatchToContext('textChangeEvent', textchangecontext,
            { text: this._longText });
        }

        // Change parent to allow css = Add 'activeeventinpie' (LevelName==Error) in .tile
        if ('Error' == this._severity)
          $(this.element).parents('.tile').addClass('activeeventinpie-' + this._severity);

        return event.Message; // STOPPED / No cycle since...
      }
      else if (this._data.ComingEvents && this._data.ComingEvents.length > 0) {
        // Manage coming events (Stop in / End in...)
        let event = this._data.ComingEvents[0];
        this._eventDateTime = new Date(event.DateTime);
        this._activeEvent = false;
        this._possiblyLate = event.PossiblyLate;
        this._eventKind = 'comingevent';
        this._textBottomClass = ' comingevent' + ' ' + event.Severity.LevelName;
        this._ringStrokeClass = 'completion-stroke-comingevent' + ' ' + event.Severity.LevelName;
        this._severity = event.Severity.LevelName;
        if (!pulseUtility.isNotDefined(event.PauseWhenMachiningNotRunning))
          // should be ready from 5.20
          this._pauseWhenMachiningNotRunning = event.PauseWhenMachiningNotRunning;
        //console.log('CycleProgressPie(' + this.element.getAttribute('machine-id')
        //+ '): Coming event = ' + event.Message);

        // Find & display LongText
        if (!pulseUtility.isNotDefined(event.LongText)) {
          this._longText = event.LongText;
        }
        if (this.element.hasAttribute('textchange-context')) {
          let textchangecontext = pulseUtility.getTextChangeContext(this);
          eventBus.EventBus.dispatchToContext('textChangeEvent', textchangecontext,
            { text: this._longText });
        }

        return event.Message; // stop soon / End of cycle soon...
      }
      else { // NO EVENT
        //console.log('CycleProgressPie(' + this.element.getAttribute('machine-id')
        //+ '): No event');

        // Find & display LongText
        this._longText = '';
        if (this.element.hasAttribute('textchange-context')) {
          let textchangecontext = pulseUtility.getTextChangeContext(this);
          eventBus.EventBus.dispatchToContext('textChangeEvent', textchangecontext,
            { text: this._longText });
        }

        return '';
      }
    }

    _restoreDefaultValues () {
      // Display
      this._ringStrokeClass = 'completion-stroke-noinfo'

      // Remove 'activeeventinpie' (LevelName==Error) in .tile
      $(this.element).parents('.tile').removeClass('activeeventinpie-Error');

      // Timers
      this._stopDashTimeRefreshTimer();
      this._dashTimeRefreshTimer = null;
      this._stopCompletionTextTimer();
      this._textPercentRefreshTimer = null;

      // Check Server time diff
      this._diffServerTimeMinusNowMSec = pulseConfig.getInt('diffServerTimeMinusNowMSec', 0);

      // From reveived data:
      this._data = null;
      // data.event
      this._activeEvent = null;
      this._untilNextMSec = null; // 0
      this._severity = '';
      this._eventKind = '';
      this._eventDateTime = null;
      this._possiblyLate = false;

      //  Circle animation
      // Cancel anim completion + cancel dash+time animation in case of comingevent.pauseWhenNotRunning
      this._notRunningCanCancelAnimation = false;
      this._completion = null;
      this._endOfCyclePercent = 1; // Can be overload if all seq < 100%
      this._animationEndPercent = null;
      this._animationEndServerDateTime = null;
      // Cancel % text animation
      this._displayedCompletion = null;
      this._currentArcAnimationSeconds = null;
      this._currentArcAnimationEnd = null;
      this._completionTextAnimationEnd = null;
      this._completionTextSecondsBetweenAnimations = null;

      // Text bottom + dash animation
      this._textBottomClass = '';
      this._needChangeDash = true; // Try to avoid refreshing dash circle when not needed... fails
      this._secondsBeforeNextChange = 0;
      this._secondsBeforeMinuteChange = 0;
      this._secondsBeforeDashEnd = 0;
      this._pauseWhenMachiningNotRunning = false;

      this._longText = '';
    }

    _draw () {
      // Clean SVG
      if ((this._pie == undefined) || (this._pie == null)) {
        return;
      }
      $(this._pie).find('.cycleprogresspie-svg').remove(); // Remove Old SVG

      // Restore default == this._restoreDefaultValues (); DONE just before

      console.log('CycleProgressPie(' + this.element.getAttribute('machine-id')
        + '): start draw - compl= ' + this._data.Completion
        + ' - DataTime= ' + this._data.DataTime);

      // CREATE SVG 
      let svg = pulseSvg.createBase(this._height, // == width
        this._height, // height
        'donut', 2 * this._xyPosition, 2 * this._xyPosition);
      svg.setAttribute('class', 'cycleprogresspie-svg');
      $(this._pie).prepend(svg); // Before message

      let g = document.createElementNS(pulseSvg.get_svgNS(), 'g');
      svg.appendChild(g);
      // PIE - rotate
      $(g).css('transform-origin', 'center');
      $(g).css('transform', 'rotate(-90deg)');

      // Circle background
      let circleBorder = pulseSvg.createSegmentOnDonut(
        this._xyPosition, this._xyPosition, this._circleRadius+1,
        'transparent', 'cycleprogresspie-cicrcle-border',
        null, this._ringWidth, 0, 1);
      g.appendChild(circleBorder);

      let circleBorderIns = pulseSvg.createSegmentOnDonut(
        this._xyPosition, this._xyPosition, this._circleRadius-1,
        'transparent', 'cycleprogresspie-cicrcle-border',
        null, this._ringWidth, 0, 1);
      g.appendChild(circleBorderIns);
      
      let circleBk = pulseSvg.createSegmentOnDonut(
        this._xyPosition, this._xyPosition, this._circleRadius,
        'transparent', 'cycleprogresspie-invisible-bk',
        null, this._ringWidth, 0, 1);
      g.appendChild(circleBk);

      

      // Circle in the middle (to allow writing something)
      let circleMiddle = pulseSvg.createCircle(this._xyPosition, this._xyPosition,
        this._middleRadius, 'transparent', 'donut-hole');
      g.appendChild(circleMiddle);

      if (this._data) {
        let topTextToDisplay = this._findTopTextAndStoreEventData();

        // Find completion to show progress on circle (= main completion)
        if (pulseUtility.isNotDefined(this._data.Completion)) {
          console.error('CycleProgressPie(' + this.element.getAttribute('machine-id') + '): NO completion = NO animation (probably between cycles)');
          this._completion = null;
        }
        else {
          // La donnée reçue peut dépasser 1 (== 100 % )
          this._completion = Math.max(0.0, this._completion = Math.min(1.0, this._data.Completion));
          // Warning : use adjusted Completion if received data are late

          //console.log('CycleProgressPie(' + this.element.getAttribute('machine-id') + '): completion= ' + this._completion);

          // FIND texts to display + remaining/elapsed times + COLORS

          // Local variables
          let iMod = 0;
          let undefinedEndPercent = false;
          let previousSequenceEnd = 0;
          let previousDrawingEnd = 0;

          if ((1 == this._data.ByMachineModule.length)
            && (this._data.ByMachineModule[iMod].Sequences.length > 0)) {
            // 1! module + defined sequences -> split 'blue' ring
            let maxNbSeq = this._data.ByMachineModule[iMod].Sequences.length;

            // Verify if lastSeq.EndPercent == 100% (if more, do not display pie)
            let lastSeqEndPercent = this._data.ByMachineModule[iMod].Sequences[maxNbSeq - 1].EndPercent;
            if (!pulseUtility.isNotDefined(lastSeqEndPercent)
              && lastSeqEndPercent != 0) {
              if (lastSeqEndPercent <= 1) {
                this._endOfCyclePercent = lastSeqEndPercent;

                // Default -> can be over-written below
                this._animationEndPercent = this._endOfCyclePercent;
                this._animationEndServerDateTime = new Date(this._data.EstimatedCycleEndDateTime);

                console.log('CycleProgressPie(' + this.element.getAttribute('machine-id')
                  + '): anim end = end cycl ' + this._animationEndPercent
                  + ' until ' + this._data.EstimatedCycleEndDateTime);
              }
              //else { // Ignore if more than 1 -> an error should be displayed in cog (done in C#)
              //this._endOfCyclePercent = null; // Do not display circle !?!
              //console.warn('CycleProgressPie(' + this.element.getAttribute('machine-id')
              //+ '): last seq end percent badly defined');
              //}
            }

            // Check if current is Machining
            if (this._data.ByMachineModule[iMod].Current.Kind == 'Machining'
              && !this._data.Running) {
              this._notRunningCanCancelAnimation = true;
              //console.log('CycleProgressPie(' + this.element.getAttribute('machine-id')
              //+ '): not running cancel animation');
            }

            // Normal display blue (or red) circle
            for (let iSeq = 0; (iSeq < maxNbSeq) && !undefinedEndPercent; iSeq++) {
              let seq = this._data.ByMachineModule[iMod].Sequences[iSeq];

              if (pulseUtility.isNotDefined(seq.EndPercent))
                undefinedEndPercent = true;
              else {
                if (seq.IsCurrent) {
                  if (seq.EndPercent <= this._animationEndPercent) {
                    // even if (this._data.ByMachineModule[iMod].Current.Completion > 1) {

                    if (pulseUtility.isNotDefined(seq.StandardDuration)) {
                      undefinedEndPercent = true;

                      console.log('CycleProgressPie(' + this.element.getAttribute('machine-id')
                        + '): No StandardDuration -> No animation');
                    }
                    else {
                      // Find End Of Current Seq -> to animate
                      this._animationEndPercent = seq.EndPercent;
                      // Calcul de backup si on ne peut pas avoir mieux :
                      this._animationEndServerDateTime = new Date(
                        new Date(this._data.ByMachineModule[iMod].Current.Begin).getTime()
                        + seq.StandardDuration * 1000
                      );

                      // Calculate end of sequence date time (= end of animation) IF AVAILABLE
                      // Using remaining time until end of sequence, including maybe late has happen
                      if (!pulseUtility.isNotDefined(seq.BeginPercent)) {
                        if (seq.EndPercent > seq.BeginPercent
                          && seq.EndPercent >= this._data.ByMachineModule[iMod].Current.Completion) {
                          this._animationEndServerDateTime = new Date(
                            new Date(this._data.DataTime).getTime()
                            + 1000 * seq.StandardDuration
                            * (seq.EndPercent - this._data.ByMachineModule[iMod].Current.Completion)
                            / (seq.EndPercent - seq.BeginPercent)
                          );
                        }
                      }

                      // _animationEndServerDateTime COULD be before DataDate or serverNow -> correction done in adjusted completion == no animation

                      console.log('CycleProgressPie(' + this.element.getAttribute('machine-id')
                        + '): animation overload until seq end (1 module) = ' + this._animationEndPercent
                        + ' until ' + this._animationEndServerDateTime.toISOString());
                    }
                  }
                }
              }

              // seq.Kind can also be : 'OptionalStop', Machining or NonMachining
              if (seq.Kind == 'Stop') {
                //console.log('CycleProgressPie(' + this.element.getAttribute('machine-id')
                //+ '): Stop call to drawArc');
                // Draw when STOP to manage splits between arcs
                this._drawArc(g, previousDrawingEnd, previousSequenceEnd);

                previousDrawingEnd = seq.EndPercent;
              } // end STOP

              previousSequenceEnd = seq.EndPercent;
            } // end for iSeq

            // Draw LAST segment -> COMMON == GOTO _BELOW_
          } // end 1 module, many seq
          else if (1 < this._data.ByMachineModule.length) {
            // More than 1 module == 1! arc

            //this._endOfCyclePercent = 1; // info
            // Default -> can be over-written below
            this._animationEndPercent = this._endOfCyclePercent;
            this._animationEndServerDateTime = new Date(this._data.EstimatedCycleEndDateTime);

            console.log('CycleProgressPie(' + this.element.getAttribute('machine-id')
              + '): anim end = end cycl ' + this._animationEndPercent
              + ' until ' + this._data.EstimatedCycleEndDateTime
              + ' multi-modules');

            // Check end of animation in seq listS
            let globalMachining = false;
            //let oneNotMachining = false;
            // Define sooner end of progress for many machine modules
            for (let iMod = 0; (iMod < this._data.ByMachineModule.length)
              && !undefinedEndPercent; iMod++) {
              for (let iSeq = 0; (iSeq < this._data.ByMachineModule[iMod].Sequences.length)
                && !undefinedEndPercent; iSeq++) {
                let seq = this._data.ByMachineModule[iMod].Sequences[iSeq];
                if (pulseUtility.isNotDefined(seq.EndPercent))
                  undefinedEndPercent = true;

                if (seq.IsCurrent) {
                  if (seq.Kind == 'Machining')
                    globalMachining = true;
                  /*else
                    oneNotMachining = true;*/
                  if (seq.EndPercent <= this._animationEndPercent) {
                    if (this._completion < 1) { // else division by 0
                      if (this._animationEndPercent < this._completion) { // Animation positive uniquement
                        this._animationEndPercent = this._completion; // Permet l'affichage de la completion globale
                      }
                      else {
                        this._animationEndPercent = seq.EndPercent;

                        let dataDate = new Date(this._data.DataTime);
                        //if (this._animationEndServerDateTime >= dataDate) { // Managed in adjusted completion
                        let cycleEndDate = new Date(this._data.EstimatedCycleEndDateTime);
                        this._animationEndServerDateTime = new Date(
                          cycleEndDate.getTime()
                          - ((cycleEndDate.getTime() - dataDate.getTime()
                            * (1 - this._animationEndPercent)
                            / (1 - this._completion)))
                        );

                        console.log('CycleProgressPie(' + this.element.getAttribute('machine-id')
                          + '): animation overload until seq end (x modules) = '
                          + this._animationEndPercent
                          + ' until ' + this._animationEndServerDateTime.toISOString());
                      }
                    }
                  }
                }
              } // End for seq
            } // End for module
            /*if (oneNotMachining){
              globalMachining = false;
            }*/

            //this._data.Running can be undefined -> null
            if (globalMachining
              && (this._data.Running == null || !this._data.Running)) {
              this._notRunningCanCancelAnimation = true; // == Cancel animation
            }

            // Show % completion - Draw = GOTO _BELOW_
            /*this._drawArc(svg, 0, this._endOfCyclePercent);*/
          }
          else { // 1 module but 0 sequence - or no module
            /*if (!this._data.Running) { -> Not for the moment dixit NR -- 2019 02
              console.log('CycleProgressPie(' + this.element.getAttribute('machine-id')
                + '): not running cancel animation (1 mod 0 seq)');
              this._notRunningCanCancelAnimation = true;
            }*/

            this._animationEndPercent = this._endOfCyclePercent;
            this._animationEndServerDateTime = new Date(this._data.EstimatedCycleEndDateTime);

            console.log('CycleProgressPie(' + this.element.getAttribute('machine-id')
              + '): BLUE IN - NO module ? anim end = end cycle = ' + this._animationEndPercent
              + ' until ' + this._animationEndServerDateTime.toISOString());

            // Draw = GOTO _BELOW_
          }

          // DRAW LAST ARC [LABEL _BELOW_ -> See GOTO :P]
          if (previousDrawingEnd < this._endOfCyclePercent) {
            // Draw LAST segment
            //console.log('CycleProgressPie(' + this.element.getAttribute('machine-id')
            //+ '): last call to drawArc');
            this._drawArc(g, previousDrawingEnd, this._endOfCyclePercent);
          }
        } // End _completion != null

        // Text
        this._createTextInTheMiddle(svg, topTextToDisplay, '');

        // Create Dash with no animation to position it -> animation is done later
        this._createFixedDashCircle(g);

        // check time, display, color, animate... AFTER TIME-text and DASH-circle creation
        this._checkTimeAndAnimateTimeAndDash();

        this._findAndDisplayErrorsWarnings(svg);
      } // end if (this._data)
    } // end _draw

    _findAndDisplayErrorsWarnings (svg) {
      if (!pulseUtility.isNotDefined(this._data.Errors) && this._data.Errors.length > 0 && this._data.Errors[0] != '') {
        let errorimg = this._getCogPath();
        errorimg.setAttribute('class', 'cycleprogresspie-error-image');
        pulseUtility.addToolTip(errorimg, this._data.Errors[0]);
        svg.appendChild(errorimg);

        console.log('CycleProgressPie(' + this.element.getAttribute('machine-id')
          + '): Warnings: ' + this._data.Errors[0]);
      }
      else if (!pulseUtility.isNotDefined(this._data.Warnings) && this._data.Warnings.length > 0 && this._data.Warnings[0] != '') {
        let errorimg = this._getCogPath();
        errorimg.setAttribute('class', 'cycleprogresspie-warn-image');
        pulseUtility.addToolTip(errorimg, this._data.Warnings[0]);
        svg.appendChild(errorimg);

        console.log('CycleProgressPie(' + this.element.getAttribute('machine-id')
          + '): Warnings: ' + this._data.Warnings[0]);
      }
    }

    // Display Errors / Warnings
    _getCogPath () {
      let path = document.createElementNS(pulseSvg.get_svgNS(), 'path');
      path.setAttribute('d', 'M 657 256 C 637.667 256 625.667 265.333 621 284 C 612.333 317.333 602.667 379.333 592 470 C 560.667 480 530.333 492.667 501 508 L 363 401 C 354.333 394.333 345.667 391 337 391 C 322.333 391 290.833 414.833 242.5 462.5 C 194.167 510.167 161.333 546 144 570 C 138 578.667 135 586.333 135 593 C 135 601 138.333 609 145 617 C 189.667 671 225.333 717 252 755 C 235.333 785.667 222.333 816.333 213 847 L 27 875 C 19.667 876.333 13.333 880.667 8 888 C 2.667 895.333 0 903 0 911 L 0 1133 C 0 1141.667 2.667 1149.5 8 1156.5 C 13.333 1163.5 20.333 1167.667 29 1169 L 212 1196 C 221.333 1228.667 235 1261.667 253 1295 C 241 1311.667 223 1335.167 199 1365.5 C 175 1395.833 158 1418 148 1432 C 142.667 1439.333 140 1447 140 1455 C 140 1463.667 142.333 1471.333 147 1478 C 173 1514 228 1570 312 1646 C 319.333 1653.333 327.667 1657 337 1657 C 347 1657 355.333 1654 362 1648 L 503 1541 C 530.333 1555 560.333 1567.333 593 1578 L 621 1762 C 621.667 1770.667 625.5 1777.833 632.5 1783.5 C 639.5 1789.167 647.667 1792 657 1792 L 879 1792 C 898.333 1792 910.333 1782.667 915 1764 C 923.667 1730.667 933.333 1668.667 944 1578 C 975.333 1568 1005.667 1555.333 1035 1540 L 1173 1648 C 1182.333 1654 1191 1657 1199 1657 C 1213.667 1657 1245 1633.333 1293 1586 C 1341 1538.667 1374 1502.667 1392 1478 C 1398 1471.333 1401 1463.667 1401 1455 C 1401 1446.333 1397.667 1438 1391 1430 C 1343 1371.333 1307.333 1325.333 1284 1292 C 1297.333 1267.333 1310.333 1237 1323 1201 L 1508 1173 C 1516 1171.667 1522.667 1167.333 1528 1160 C 1533.333 1152.667 1536 1145 1536 1137 L 1536 915 C 1536 906.333 1533.333 898.5 1528 891.5 C 1522.667 884.5 1515.667 880.333 1507 879 L 1324 851 C 1314 819 1300.333 786.333 1283 753 C 1295 736.333 1313 712.833 1337 682.5 C 1361 652.167 1378 630 1388 616 C 1393.333 608.667 1396 601 1396 593 C 1396 583.667 1393.667 576.333 1389 571 C 1365 537 1310 480.333 1224 401 C 1216 394.333 1207.667 391 1199 391 C 1189 391 1181 394 1175 400 L 1033 507 C 1005.667 493 975.667 480.667 943 470 L 915 286 C 914.333 277.333 910.5 270.167 903.5 264.5 C 896.5 258.833 888.333 256 879 256 L 657 256 z M 768 642.16992 A 377.49155 381.83051 0 0 1 1145.4922 1024 A 377.49155 381.83051 0 0 1 768 1405.8301 A 377.49155 381.83051 0 0 1 390.50781 1024 A 377.49155 381.83051 0 0 1 768 642.16992 z M 700.14062 776.51562 C 696.10786 777.58125 692.11596 778.74575 688.16602 780.01172 C 693.12908 778.81847 696.83113 777.8844 699.35156 777.25 C 699.6138 777.00415 699.87811 776.76114 700.14062 776.51562 z M 647.54492 962.80859 C 646.84834 962.90678 642.99243 969.88636 633.44141 989.8418 C 635.39083 988.51922 636.89277 987.64232 638.42578 987.03125 C 642.44024 978.22601 648.61015 962.65845 647.54492 962.80859 z M 598.4043 1019.0742 C 597.81115 1019.4306 597.21765 1019.785 596.63867 1020.166 C 594.66425 1021.4653 591.02825 1027.7572 592.61328 1026.0039 C 594.63166 1023.7712 596.526 1021.4297 598.4043 1019.0742 z M 762.48242 1087.7793 C 760.62813 1088.2628 758.60343 1088.8092 757.44141 1089.0371 C 761.87092 1089.1143 760.20168 1089.1647 762.48242 1087.7793 z M 633.50195 1131.9805 C 631.76813 1133.3442 630.03247 1134.7112 628.58984 1136.2832 C 627.08418 1137.9239 631.56069 1134.2685 633.50195 1131.9805 z ');
      path.setAttribute('transform', 'scale(0.01) translate(8750, 12500)');

      // The transparent circle is needed so that the interior of the cog triggers the tooltip
      let circle = pulseSvg.createCircle(775, 1025, 600, 'transparent');
      circle.setAttribute('transform', 'scale(0.01) translate(8750, 12500)');

      let g = document.createElementNS(pulseSvg.get_svgNS(), 'g');
      g.appendChild(path);
      g.appendChild(circle);

      return g;
    }

    /**
     * @override
     * 
     * @param {!string} context - Context
     * @return {!string} key
     */
    /*getStartKey (context) {
      switch (context) {
        case 'Loaded':
          return 'Standard';
        default:
          return super.getStartKey(context);
      }
    }*/

    /**
     * @override
     * 
     * @param {!string} context - Context
     * @param {!string} key - Key
     * @returns {!State} Created states
     */
    /*defineState (context, key) {
      switch (context) {
        case 'Loaded': // == No Refresh until click on button 'Start'
          return new state.StaticState(context, key, this);
        default:
          return super.defineState(context, key);
      }
    }*/

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
        case 'group': // Not fully defined yet
          // Check 'textchange-context'
          if (this.isInitialized()) {
            // machine-id change
            this._drawEmpty();

            // Check 'textchange-context'
            if (this.element.hasAttribute('textchange-context')) {
              let textchangecontext = pulseUtility.getTextChangeContext(this);
              eventBus.EventBus.removeEventListenerBySignal(this,
                'askForTextChangeEvent');
              eventBus.EventBus.addEventListener(this,
                'askForTextChangeEvent', textchangecontext,
                this.onTextChange.bind(this));
            }
            this.start();
          } break;
        case 'textchange-context':
          if (this.isInitialized()) {
            let textchangecontext = pulseUtility.getTextChangeContext(this);
            eventBus.EventBus.removeEventListenerBySignal(this, 'askForTextChangeEvent');
            eventBus.EventBus.addEventListener(this,
              'askForTextChangeEvent', textchangecontext,
              this.onAskForTextChange.bind(this));

            eventBus.EventBus.dispatchToContext('textChangeEvent', textchangecontext,
              { text: this._yellowSinceText });
          }
          this.start(); // To re-validate parameters
          break;
        case 'threshold1':
          if (pulseUtility.isInteger(newVal)) {
            this._threshold1 = Number(newVal);
          }
          if (this._threshold2 > this._threshold1) {
            let inter = this._threshold2
            this._threshold2 = this._threshold1;
            this._threshold1 = inter;
          }
          //this.start();
          break;
        case 'threshold2':
          if (pulseUtility.isInteger(newVal)) {
            this._threshold1 = Number(newVal);
          }
          if (this._threshold2 > this._threshold1) {
            let inter = this._threshold2
            this._threshold2 = this._threshold1;
            this._threshold1 = inter;
          }
          //this.start();
          break;
        /* Should add :
        case 'machine-context':
          eventBus.EventBus.removeEventListenerBySignal(this, 'machineIdChangeSignal');
          eventBus.EventBus.addEventListener(this, 
            'machineIdChangeSignal', newVal,
            this.onMachineIdChange.bind(this));
          break;*/
        case 'status-context': // 'nextStopStatusChange'
          break;
        default:
          break;
      }
    }

    initialize () {
      this.addClass('pulse-piegauge');

      let defaultThreshold1 = 600; // in seconds -> same as tagConfig !
      let defaultThreshold2 = 180; // in seconds -> same as tagConfig !
      this._threshold1 = Number(this.getConfigOrAttribute('threshold1', defaultThreshold1));
      this._threshold2 = Number(this.getConfigOrAttribute('threshold2', defaultThreshold2));
      if (this._threshold2 > this._threshold1) {
        let inter = this._threshold2
        this._threshold2 = this._threshold1;
        this._threshold1 = inter;
      }

      // Update here some internal parameters

      // listeners/dispatchers
      /* To add
      if (this.element.hasAttribute('machine-context')) {
        eventBus.EventBus.addEventListener(this, 
          'machineIdChangeSignal',
          this.element.getAttribute('machine-context'),
          this.onMachineIdChange.bind(this));
      }*/

      if (this.element.hasAttribute('textchange-context')) {
        let textchangecontext = pulseUtility.getTextChangeContext(this);
        eventBus.EventBus.addEventListener(this,
          'askForTextChangeEvent', textchangecontext,
          this.onAskForTextChange.bind(this));

        eventBus.EventBus.dispatchToContext('textChangeEvent', textchangecontext,
          { text: this._longText });
      }

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content
      this._pie = $('<div></div>').addClass('cycleprogresspie-progresspie');
      //let divNextstop = $('<div></div>').addClass('cycleprogresspie-nextstop');
      this._content = $('<div></div>').addClass('cycleprogresspie-content')
        .append(this._pie);

      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html(this.getTranslation('loadingDots', 'Loading...')).css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this._content).append(loaderDiv);

      // Create DOM - message for error
      this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this._content).append(messageDiv);

      $(this.element)
        .append(this._content);

      /*
      $(window).resize(function () {
        this._draw();
      });
      divProgresspie.resize(function () {
        this._draw();
      });*/

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // STOP timer
      if (this._dashTimeRefreshTimer) {
        clearTimeout(this._dashTimeRefreshTimer);
        this._dashTimeRefreshTimer = null;
      }

      // Parameters
      // DOM
      $(this.element).empty();
      this._pie = undefined;
      this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters () {
      if (!this.element.hasAttribute('group')) {
        // machine-id
        if (!this.element.hasAttribute('machine-id')) {
          this.setError('missing machine-id'); // delayed error message
          return;
        }
        if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
          //'Machine Id has incorrect value', 'BAD_ID');
          // Immediat display :
          this.switchToKey('Error', () => this.displayError('Machine Id has incorrect value'), () => this.removeError());
          return;
        }
      }

      this.switchToNextContext();
    }

    displayError (message) {
      $(this._messageSpan).html(message);
      //$(this.element).find('.cycleprogresspie-progresspie').hide();
      /*if ('NO_DATA' == statusString) {
        errorMessage = 'No available next stop information';
      }*/
      //+ SVG ? Non
    }

    removeError () {
      $(this._messageSpan).html('');
      //$(this.element).find('.cycleprogresspie-progresspie').show();
    }

    get refreshRate () {
      let refreshMs = 1000 * Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));

      if ((this._untilNextMSec > 0) // == 0 <==> No next event
        && (this._untilNextMSec < (refreshMs - 1000))) { // Next event in less than default rate
        refreshMs = this._untilNextMSec + 1000;
        //console.log('CycleProgressPie(' + this.element.getAttribute('machine-id') + ') '
        //  + ' refreshRate = _untilNextMSec + 1 = ' + refreshMs);
      }

      if (this._animationEndServerDateTime != null) {
        let serverNow = new Date((new Date()).getTime() + this._diffServerTimeMinusNowMSec);
        let animationMSeconds =
          (new Date(this._animationEndServerDateTime).getTime() - serverNow.getTime());
        if (animationMSeconds < (refreshMs - 1000)) {
          if (animationMSeconds > 0) {
            // Next end of cycle or sequence is sooner
            refreshMs = animationMSeconds + 1000;
            //console.log('CycleProgressPie(' + this.element.getAttribute('machine-id') + ') '
            //  + ' refreshRate = animationMSeconds + 1 = ' + refreshMs);
          }
          else {
            // When animation end is before now. Ask every second.
            refreshMs = 1000;
            //console.log('CycleProgressPie(' + this.element.getAttribute('machine-id') + ') '
            //  + ' refreshRate = 1');
          }
        }
      }

      return refreshMs;
    }

    getShortUrl () {
      this._stopDashTimeRefreshTimer();

      let url = 'CycleProgress?';
      if (this.element.hasAttribute('machine-id')) {
        url += 'MachineId='
          + this.element.getAttribute('machine-id');
      }
      else {
        url += 'GroupId='
          + this.element.getAttribute('group');
      }
      url += '&IncludeEvents=true';
      return url;
    }

    refresh (data) {
      if (this._data == undefined
        || this._data.DataTime != data.DataTime) {
        this._restoreDefaultValues();
        this._data = data;
        // Now on server - stored at reception and later too to have smooth display
        this._serverNow = new Date((new Date()).getTime() + this._diffServerTimeMinusNowMSec);

        $(this.element).find('.cycleprogresspie-progresspie').show();

        this._draw();
      }
    }

    /**
       * @override
       */
    manageError (data) {
      // Reset
      eventBus.EventBus.dispatchToContext('nextStopStatusChange',
        this.element.getAttribute('status-context'), {});
      super.manageError(data);
    }

    /**
     * @override
     */
    manageFailure (isTimeout, xhrStatus) {
      if (!isTimeout) {
        // Reset
        eventBus.EventBus.dispatchToContext('nextStopStatusChange',
          this.element.getAttribute('status-context'), {});
      }
      super.manageFailure(isTimeout, xhrStatus);
    }

    manageNotApplicable () {
      // TODO -> hide something ? -> To be checked 2019-06

      super.manageNotApplicable(); // To hide
    }

    // Callback events

    /**
     * Event bus callback triggered when param changes
     *
     * @param {Object} event
     */
    onMachineIdChange (event) {
      this.element.setAttribute('machine-id', event.target.newMachineId);
    }

    /**
     * Event bus callback triggered when param changes
     *
     * @param {Object} event
     */
    onAskForTextChange (event) {
      let textchangecontext = pulseUtility.getTextChangeContext(this);
      eventBus.EventBus.dispatchToContext('textChangeEvent', textchangecontext,
        { text: this._longText });
    }
  }

  pulseComponent.registerElement('x-cycleprogresspie', CycleProgressPieComponent, ['machine-id', 'group', 'textchange-context', 'threshold1', 'threshold2', 'status-context']);
})();
