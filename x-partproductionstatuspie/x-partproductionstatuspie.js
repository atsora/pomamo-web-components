// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-partproductionstatuspie
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 * @requires module:pulseSvg
 */
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseSvg = require('pulseSvg');
var pulseConfig = require('pulseConfig');
var eventBus = require('eventBus');

(function () {
  class PartProductionStatusPieComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
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
      //
      self._height = '100%'; //30; //defaultHeight); -> for compatibility
      //this._barwidth = 100; // Default

      //  Used sizes
      self._circleRadius = 80.0;
      self._xyPosition = 95.0; // Center != Rayon ext -> + margin
      self._ringWidth = 25.0; // in %
      self._middleRadius = self._circleRadius * (1.0 - self._ringWidth / 100.0);
      self._dashWidth = 3.0; // %
      self._dashCircleRadius = self._middleRadius * (1.0 - 0.5 * self._dashWidth / 100.0);
      self._halfLineWidth = 0.0018; // in %

      // To help understand code. Please do not remove :
      //this._activeEvent == true  <=> past event   <=> until <= 0
      //this._activeEvent == false <=> future event <=> until >= 0
      self._untilNextMSec = 0;

      return self;
    }

    //get content () { return this._content; } // Optional

    // -> animate
    _startDashTimeRefreshTimer (seconds) {
      this._stopDashTimeRefreshTimer();
      console.log('PartProductionStatusPie(' + this.element.getAttribute('machine-id') + ') '
        + ' Start timer(' + seconds + ')');
      // Re-start timer
      var self = this;
      this._dashTimeRefreshTimer = setTimeout(
        function () {
          /*console.log('PartProductionStatusPie(' + self.element.getAttribute('machine-id')
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
        //
      }
      else {
        //let thresholdClass = '';
        // Find Status Color
        if (!this._activeEvent) {
          // this._severity // this._textBottomClass;
          if (this._untilNextMSec / 1000 < this._threshold2) {
            //thresholdClass = 'threshold2';
            // Change text color
            $(this.element).find('.time-in-pie').removeClass('threshold1');
            $(this.element).find('.time-in-pie').addClass('class', 'threshold2');
          }
          else if (this._untilNextMSec / 1000 < this._threshold1) {
            //thresholdClass = 'threshold1';
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

      }
    }

    _checkTimeAndAnimateTimeAndDash () {
      let animateTimeAndDash = true;
      let stopDashAnimation = false;

      // Stop timer
      this._stopDashTimeRefreshTimer();

      // Check RemainingTime
      if (!pulseUtility.isNotDefined(this._eventDateTime)) {
        this._untilNextMSec = this._eventDateTime.getTime()
          - ((new Date()).getTime() + this._diffServerTimeMinusNowMSec); // == NOW - diff == nowOnServer

        // Active event + negative time -> NEVER
        if (this._activeEvent) {
          if (this._untilNextMSec >= 0) {
            console.error('PartProductionStatusPie(' + this.element.getAttribute('machine-id') + ') '
              + ' time & dash = no animation + ' + (-this._untilNextMSec) + ' < 0');
            this._untilNextMSec = 0;
            animateTimeAndDash = false;
          }
        }
        // Coming event 
        if (!this._activeEvent) {
          if (this._pauseWhenMachiningNotRunning && this._notRunningCanCancelAnimation) {
            console.error('PartProductionStatusPie(' + this.element.getAttribute('machine-id') + ') '
              + ' time & dash = no animation. PauseWhenMachiningNotRunning');
            animateTimeAndDash = false;
          }
          if (this._untilNextMSec < 0) {
            if (!this._possiblyLate) { // not possibly late -> stop
              console.error('PartProductionStatusPie(' + this.element.getAttribute('machine-id') + ') '
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
        /* else {
         // Show completion ??? Show it be added ? Maybe use something like "big display"
        }*/
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

      console.log('PartProductionStatusPie(' + this.element.getAttribute('machine-id') + ') '
        + ' - sec=' + seconds
        + ' - sBNextCg=' + this._secondsBeforeNextChange
        + ' - sForDash=' + secondsForDash
        + ' - sBMinCg=' + this._secondsBeforeMinuteChange);

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
          console.log('PartProductionStatusPie(' + this.element.getAttribute('machine-id') + ') '
            + ' animate dash sec=' + secondsForDash + ' during=' + this._secondsBeforeDashEnd);
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
        console.error('PartProductionStatusPie(' + this.element.getAttribute('machine-id') + ') '
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

    // Draw arc : no or background colored - Never animated
    _drawArc (svg) {
      if (this._ringStrokeClass == 'completion-stroke-noinfo') {
        // 'BACKGROUND' color
        /*let circleBk = pulseSvg.createSegmentOnDonut(
          this._xyPosition, this._xyPosition, this._circleRadius,
          'transparent', 'donut-ring-background',
          null, this._ringWidth);
        svg.appendChild(circleBk);*/

        return; // Default == no colored ring
      }

      // 'colored' ring
      let coloredCircle = pulseSvg.createSegmentOnDonut(
        this._xyPosition, this._xyPosition, this._circleRadius,
        'transparent', this._ringStrokeClass,
        null, this._ringWidth); // == full ring
      svg.appendChild(coloredCircle);

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

    _fillProductionText () {
      if (!this._data)
        return; // For access using onConfigChange

      let textPercent = '';
      let production = '';

      let productionDisplay = $(this.element).find('.production-in-pie');

      if (!pulseUtility.isNotDefined(this._data.NbPiecesDoneDuringShift)) {
        // Trunk with 2 decimal if needed
        let done = Math.floor(this._data.NbPiecesDoneDuringShift * 100) / 100;
        production = done;
        if (!pulseUtility.isNotDefined(this._data.GoalNowShift)) {
          if ('actualonly' != this.getConfigOrAttribute('productionpercentinpie')) {
            // Trunk with 2 decimal if needed
            let goal = Math.floor(this._data.GoalNowShift * 100) / 100;
            production += ' / ' + goal;

            if (this._data.GoalNowShift > 0) {
              let thresholdunitispart = this.getConfigOrAttribute('thresholdunitispart', 'true');
              let thresholdredproduction = this.getConfigOrAttribute('thresholdredproduction', 0);
              let thresholdorangeproduction = this.getConfigOrAttribute('thresholdorangeproduction', 0);
              // colors and efficiency
              let diff = this._data.GoalNowShift - this._data.NbPiecesDoneDuringShift;
              let multiplier = (thresholdunitispart == 'true') ? 1 : (100.0 / this._data.GoalNowShift);
              let previousClass = productionDisplay[0].getAttribute('class');
              previousClass.replace(' bad-efficiency', '');
              previousClass.replace(' mid-efficiency', '');
              previousClass.replace(' good-efficiency', '');
              if ((diff * multiplier) > thresholdredproduction) {
                productionDisplay[0].setAttribute('class', previousClass + ' bad-efficiency');
                //$(productionDisplay).addClass('bad-efficiency').removeClass('mid-efficiency').removeClass('good-efficiency');
              }
              else {
                if ((diff * multiplier) > thresholdorangeproduction) {
                  productionDisplay[0].setAttribute('class', previousClass + ' mid-efficiency');
                  //$(productionDisplay).addClass('mid-efficiency').removeClass('bad-efficiency').removeClass('good-efficiency');
                }
                else {
                  productionDisplay[0].setAttribute('class', previousClass + ' good-efficiency');
                  //$(productionDisplay).addClass('good-efficiency').removeClass('mid-efficiency').removeClass('bad-efficiency');
                }
              }
            }
            else {
              $(productionDisplay).removeClass('good-efficiency').removeClass('mid-efficiency').removeClass('bad-efficiency');
            }
          }
          if ('true' == this.getConfigOrAttribute('productionpercentinpie')) {
            if (Number(this._data.GoalNowShift) > 0) {
              let percent = 100.0 * this._data.NbPiecesDoneDuringShift / this._data.GoalNowShift;
              // Trunk
              percent = Math.floor(percent);
              textPercent = percent + '%';
            }
          }
        }
      }
      if ('' == textPercent) {
        $(productionDisplay).text(production);
        $(this.element).find('.second-production-in-pie').text('');
      }
      else {
        $(productionDisplay).text(textPercent);
        if ('true' != this.getConfigOrAttribute('hidesecondproductiondisplay')) {
          $(this.element).find('.second-production-in-pie').text(production);
        }
      }
    }

    _createTextInTheMiddle (svg, topTextToDisplay, bottomTextToDisplay/*, production*/) {
      // Show text + positions -> GROUP
      let middleAvailableWidth = Math.sqrt(2 * this._middleRadius * this._middleRadius);
      let topTextWidth = middleAvailableWidth / 2;
      let bottomTextWidth = middleAvailableWidth;
      let smallTextWidth = middleAvailableWidth / 2;
      let topTextHeight = middleAvailableWidth / 5;
      let bottomTextHeight = middleAvailableWidth / 3;
      let smallTextHeight = middleAvailableWidth / 5;
      let topTextBottom = this._xyPosition - middleAvailableWidth / 4; // + middleAvailableWidth/4;
      let bottomTextBottom = this._xyPosition + middleAvailableWidth / 5; // + middleAvailableWidth*4/5;
      let smallTextBottom = bottomTextBottom + smallTextHeight / 2 + smallTextHeight;

      if (pulseUtility.isNotDefined(this._eventDateTime)) { // == no active or coming event 
        // BIG production (ex: 2/3)
        let bigTextGroup = document.createElementNS(pulseSvg.get_svgNS(), 'g');
        let bigRect = document.createElementNS(pulseSvg.get_svgNS(), 'rect');
        bigRect.setAttribute('x', this._xyPosition - bottomTextWidth / 2);
        bigRect.setAttribute('y', this._xyPosition - bottomTextHeight / 2);
        bigRect.setAttribute('width', bottomTextWidth);
        bigRect.setAttribute('height', bottomTextHeight);
        bigRect.setAttribute('fill', 'transparent');
        bigTextGroup.appendChild(bigRect);
        // BIG production display
        let displayBig = document.createElementNS(pulseSvg.get_svgNS(), 'text');
        displayBig.setAttribute('x', '50%');
        displayBig.setAttribute('y', this._xyPosition + bottomTextHeight / 2);
        displayBig.setAttribute('text-anchor', 'middle');
        //displayBig.setAttribute('alignment-baseline', 'baseline'); // 'middle'); = KO with Chrome
        displayBig.setAttribute('font-weight', 'bold');
        displayBig.setAttribute('font-size', bottomTextHeight);
        //displayBig.setAttribute('class', this._textBottomClass); inline below
        displayBig.setAttribute('class', 'big-production-in-pie production-in-pie');// + this._textBottomClass);
        displayBig.textContent = ''; // production
        bigTextGroup.appendChild(displayBig);

        svg.appendChild(bigTextGroup);

        // return; -> later
      } // else Message + time + dash + small production

      // Show text + positions -> RECT
      // Message
      let topTextGroup = document.createElementNS(pulseSvg.get_svgNS(), 'g');
      let rectTop = document.createElementNS(pulseSvg.get_svgNS(), 'rect');
      rectTop.setAttribute('x', this._xyPosition - topTextWidth / 2);
      rectTop.setAttribute('y', topTextBottom - topTextHeight);
      rectTop.setAttribute('width', topTextWidth);
      rectTop.setAttribute('height', topTextHeight);
      rectTop.setAttribute('fill', 'transparent');
      topTextGroup.appendChild(rectTop);
      // Show text + positions -> TEXT
      // Text top line
      let displayTop = document.createElementNS(pulseSvg.get_svgNS(), 'text');
      displayTop.setAttribute('x', '50%');
      displayTop.setAttribute('y', topTextBottom);
      displayTop.setAttribute('class', 'text-top');
      displayTop.setAttribute('text-anchor', 'middle');
      //displayTop.setAttribute('alignment-baseline', 'baseline'); // 'middle'); = KO with Chrome
      topTextGroup.appendChild(displayTop);

      if (pulseUtility.isNotDefined(this._eventDateTime)) { // == no active or coming event
        displayTop.setAttribute('class', 'second-production-in-pie');
        displayTop.setAttribute('font-size', 13);

        svg.appendChild(topTextGroup);
        return;
      }
      else {
        displayTop.setAttribute('font-weight', 'bold');
        // Adapt font-size depending on the number of characters (approximately)
        let fontsize = topTextHeight;
        if (topTextToDisplay.length > 8)
          fontsize -= (topTextToDisplay.length - 8);
        if (fontsize < 11)
          fontsize = 11;
        displayTop.setAttribute('font-size', fontsize);
        displayTop.textContent = topTextToDisplay;
      }

      // Time
      let bottomTextGroup = document.createElementNS(pulseSvg.get_svgNS(), 'g');
      let rectBottom = document.createElementNS(pulseSvg.get_svgNS(), 'rect');
      rectBottom.setAttribute('x', this._xyPosition - bottomTextWidth / 2);
      rectBottom.setAttribute('y', bottomTextBottom - bottomTextHeight);
      rectBottom.setAttribute('width', bottomTextWidth);
      rectBottom.setAttribute('height', bottomTextHeight);
      rectBottom.setAttribute('fill', 'transparent');
      bottomTextGroup.appendChild(rectBottom);
      // Text bottom line (= time)
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

      //smallTextBottom = bottomTextBottom + middleAvailableWidth / 4 + smallTextHeight

      // SMALL production
      let smallBottomTextGroup = document.createElementNS(pulseSvg.get_svgNS(), 'g');
      let smallRectBottom = document.createElementNS(pulseSvg.get_svgNS(), 'rect');
      smallRectBottom.setAttribute('x', this._xyPosition - smallTextWidth / 2);
      smallRectBottom.setAttribute('y', smallTextBottom - smallTextHeight);
      smallRectBottom.setAttribute('width', smallTextWidth);
      smallRectBottom.setAttribute('height', smallTextHeight);
      smallRectBottom.setAttribute('fill', 'transparent');
      smallBottomTextGroup.appendChild(smallRectBottom);
      // SMALL production display
      let displaySmall = document.createElementNS(pulseSvg.get_svgNS(), 'text');
      displaySmall.setAttribute('x', '50%');
      displaySmall.setAttribute('y', smallTextBottom);
      displaySmall.setAttribute('text-anchor', 'middle');
      //displaySmall.setAttribute('alignment-baseline', 'baseline'); // 'middle'); = KO with Chrome
      displaySmall.setAttribute('font-weight', 'bold');
      displaySmall.setAttribute('font-size', smallTextHeight);
      //displaySmall.setAttribute('class', this._textBottomClass); inline below
      displaySmall.setAttribute('class', 'small-production-in-pie production-in-pie');// + this._textBottomClass);
      displaySmall.textContent = ''; // production
      smallBottomTextGroup.appendChild(displaySmall);

      // Append
      svg.appendChild(topTextGroup);
      svg.appendChild(bottomTextGroup);
      svg.appendChild(smallBottomTextGroup);
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
        //console.log('PartProductionStatusPie(' + this.element.getAttribute('machine-id')
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
        //console.log('PartProductionStatusPie(' + this.element.getAttribute('machine-id')
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
      this._ringStrokeClass = 'completion-stroke-noinfo';

      // Remove 'activeeventinpie' (LevelName==Error) in .tile
      $(this.element).parents('.tile').removeClass('activeeventinpie-Error');

      // Timer
      this._stopDashTimeRefreshTimer();
      this._dashTimeRefreshTimer = null;

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

      // Text bottom + dash animation
      this._textBottomClass = '';
      this._needChangeDash = true; // Try to avoid refreshing dash circle when not needed... fails
      this._secondsBeforeNextChange = 0;
      this._secondsBeforeMinuteChange = 0;
      this._secondsBeforeDashEnd = 0;
      this._pauseWhenMachiningNotRunning = false;

      this._longText = '';
    }

    _forwardWorkInfo () {
      if (!this._data) {
        eventBus.EventBus.dispatchToContext('operationChangeEvent',
          this.element.getAttribute('machine-id'),
          {});
      }
      else {
        // Forward workinfo data to external display
        //if (this.element.hasAttribute('machine-id')) { Always
        eventBus.EventBus.dispatchToContext('operationChangeEvent',
          this.element.getAttribute('machine-id'),
          { workinformations: this._data.WorkInformations });
      }
    }

    _draw () {
      // Clean SVG
      if ((this._pie == undefined) || (this._pie == null)) {
        return;
      }
      $(this._pie).find('.partproductionstatuspie-svg').remove(); // Remove Old SVG

      // Restore default == this._restoreDefaultValues (); DONE just before

      // CREATE SVG 
      let svg = pulseSvg.createBase(this._height, // == width
        this._height, // height
        'donut', 2 * this._xyPosition, 2 * this._xyPosition);
      svg.setAttribute('class', 'partproductionstatuspie-svg');
      $(this._pie).prepend(svg); // Before message

      let g = document.createElementNS(pulseSvg.get_svgNS(), 'g');
      svg.appendChild(g);

      // PIE - rotate
      $(g).css('transform-origin', 'center');
      $(g).css('transform', 'rotate(-90deg)');

      // Circle background
      let circleBk = pulseSvg.createSegmentOnDonut(
        this._xyPosition, this._xyPosition, this._circleRadius,
        'transparent', 'partproductionstatuspie-invisible-bk',
        null, this._ringWidth);
      g.appendChild(circleBk);

      // Circle in the middle (to allow writing something)
      let circleMiddle = pulseSvg.createCircle(this._xyPosition, this._xyPosition,
        this._middleRadius, 'transparent', 'donut-hole');
      g.appendChild(circleMiddle);

      if (this._data) {
        // FIND texts to display + remaining/elapsed times + COLORS
        let topTextToDisplay = this._findTopTextAndStoreEventData();

        // Check if current is Running
        if (this._data.Running == false) {
          this._notRunningCanCancelAnimation = true;
        }

        // Draw ring
        this._drawArc(g);

        // Text
        this._createTextInTheMiddle(svg, topTextToDisplay, '');

        this._fillProductionText(); // production-in-pie

        if (!pulseUtility.isNotDefined(this._eventDateTime)) { // == active or coming event -> possible dash
          // Create Dash with no animation to position it -> animation is done later
          this._createFixedDashCircle(g);

          // check time, display, color, animate... AFTER TIME-text and DASH-circle creation
          this._checkTimeAndAnimateTimeAndDash();
        }

      } // end if (this._data)

      this._forwardWorkInfo();
    } // end _draw


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
        case 'machine-context':
          eventBus.EventBus.removeEventListenerBySignal(this, 'machineIdChangeSignal');
          eventBus.EventBus.addEventListener(this,
            'machineIdChangeSignal', newVal,
            this.onMachineIdChange.bind(this));
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
      if (this.element.hasAttribute('machine-context')) {
        eventBus.EventBus.addEventListener(this,
          'machineIdChangeSignal',
          this.element.getAttribute('machine-context'),
          this.onMachineIdChange.bind(this));
      }

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
      this._pie = $('<div></div>').addClass('partproductionstatuspie-progresspie');
      //let divNextstop = $('<div></div>').addClass('partproductionstatuspie-nextstop');
      this._content = $('<div></div>').addClass('partproductionstatuspie-content')
        .append(this._pie);

      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').css('display', 'none');
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
      let group = this.getConfigOrAttribute('group');
      if ((pulseUtility.isNotDefined(group)) || (group == '')) {
        // machine-id
        if (!this.element.hasAttribute('machine-id')) {
          console.error('missing attribute machine-id in PartProductionStatusPie.element');
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
      //$(this.element).find('.partproductionstatuspie-progresspie').hide();
      /*if ('NO_DATA' == statusString) {
        errorMessage = 'No available next stop information';
      }*/
      //+ SVG ? Non
    }

    removeError () {
      $(this._messageSpan).html('');
      //$(this.element).find('.partproductionstatuspie-progresspie').show();
    }

    get refreshRate () {
      return 1000 * Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));
    }

    getShortUrl () {
      this._stopDashTimeRefreshTimer();

      let url = 'Operation/ProductionMachiningStatus?';
      if (this.element.hasAttribute('machine-id')) {
        url += 'MachineId='
          + this.element.getAttribute('machine-id');
      }
      else {
        if (this.element.hasAttribute('group')) {
          url += 'GroupId='
            + this.element.getAttribute('group');
        }
      }
      url += '&IncludeEvents=true';
      return url;
    }

    refresh (data) {
      this._restoreDefaultValues();
      this._data = data;
      $(this.element).find('.partproductionstatuspie-progresspie').show();

      this._draw();
    }

    manageNotApplicable () {
      // By default switch to context NotApplicable and add the class pulse-component-not-applicable
      //super.manageNotApplicable();

      // Immediat error display :
      this.switchToKey('Error', () => this.displayError('No production information for this machine / group'), () => this.removeError());
    }

    /**
       * @override
       */
    manageError (data) {
      // Reset
      super.manageError(data);
    }

    /**
     * @override
     */
    manageFailure (isTimeout, xhrStatus) {
      if (!isTimeout) {
        // Reset
      }
      super.manageFailure(isTimeout, xhrStatus);
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

    /**
      * Event callback in case a config is updated: (re-)start the component
      * 
      * @param {*} event 
      */
    onConfigChange (event) {
      if (event.target.config == 'hidesecondproductiondisplay')
        this._fillProductionText();

      if (event.target.config == 'productionpercentinpie')
        this._fillProductionText();

      if ((event.target.config == 'thresholdunitispart')
        || (event.target.config == 'thresholdredproduction')
        || (event.target.config == 'thresholdorangeproduction')) {
        //this.start();
        this._fillProductionText();
      }

    }

  }

  pulseComponent.registerElement('x-partproductionstatuspie', PartProductionStatusPieComponent, ['machine-id', 'group', 'textchange-context', 'threshold1', 'threshold2', 'machine-context']);
})();
