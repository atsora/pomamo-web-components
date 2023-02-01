// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-toollifemachine
 * @requires module:pulseComponent
 * @requires module:pulseRange
 * @requires module:pulseUtility
 */
var pulseComponent = require('pulsecomponent');
var pulseRange = require('pulseRange');
var pulseUtility = require('pulseUtility');
var pulseConfig = require('pulseConfig');
var pulseSvg = require('pulseSvg');
var eventBus = require('eventBus');

/*
 * WARNING for migration : USE
 * 
this.disableDeleteWhenDisconnect ();
this.restoreDeleteWhenDisconnect ():
 */

(function () {

  class ToolLifeMachineComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      this._range = pulseRange.createEmpty(); // To avoid errors;
      this._showexpiredonly = false;

      // DOM - not here
      self._content = undefined;

      return self;
    }

    get content () {
      return this._content;
    } // Optional

    /*getOldestExpiration () {
      return this._getOldestExpiration;
    }*/

    _changeToolLabelName () {
      let labelsArray = [];
      let toollabelname = this.getConfigOrAttribute('toollabelname');
      let toollabelsselections = this.getConfigOrAttributeFreeType('toollabelsselections');
      for (let iTool = 0; iTool < toollabelsselections.length; iTool++) {
        let label = toollabelsselections[iTool];
        if (toollabelname == label.name) { // Found
          labelsArray = label.labels;
          this._showexpiredonly = label.showexpiredonly;
        }
      }
      this._fillDisplayRangesFromLabelArray(labelsArray);
    }

    _fillDisplayRangesFromLabelArray (labelsArray) {
      this._displayRanges = [{
        display: '',
        minutes: 0
      }];
      for (let indexLabel = 0; indexLabel < labelsArray.length; indexLabel++) {
        let min = labelsArray[indexLabel];
        if (min < 60) {
          this._displayRanges.push({
            display: min + 'min',
            minutes: min
          });
        }
        else if (90 == min) {
          this._displayRanges.push({
            display: '1h30',
            minutes: min
          });
        }
        else {
          let hrs = min / 60.0;
          this._displayRanges.push({
            display: hrs + 'h',
            minutes: min
          });
        }
      } // end for
    }

    _createDivForSingleTool (spanOrLink, RemainingCycles) {
      let toolNameDiv = $('<div></div>').addClass('toollifemachine-tool-name-div')
        .append(spanOrLink);
      let singletool = $('<div></div>')
        .addClass('toollifemachine-singletool-div')
        .append(toolNameDiv);

      if ('true' == this.getConfigOrAttribute('displayremainingcyclesbelowtool')
        || true == this.getConfigOrAttribute('displayremainingcyclesbelowtool')) {
        if (!pulseUtility.isNotDefined(RemainingCycles)) {
          let remainingCycles = $('<span></span>').addClass('toollifemachine-remaining-cycles-span')
            .html(RemainingCycles);
          let remainingCyclesDiv = $('<div></div>').addClass('toollifemachine-remaining-cycles-div')
            .append(remainingCycles);
          singletool.append(remainingCyclesDiv);
        }
      }

      return singletool;
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
          if (this.isInitialized()) {
            //reset component interface
            $(this._operationDiv).empty();
            $(this._toolsDiv).empty();

            // Change link
            this._linkInErrorString =
              this.getConfigOrAttribute('reportpath', 'http://lctr:8080/pulsereporting/'); // Default
            let reportName = this.getConfigOrAttribute('toolReport', 'Tool/CurrentTools');
            this._linkInErrorString = this._linkInErrorString +
              '/viewer?__report=/' + reportName +
              '.rptdesign&PulseMachines=' + newVal + '&ShowAll=false';

            let fullLink = '';
            if (!this._range.isEmpty()) {
              fullLink = this._linkInErrorString +
                '&WebAppParamsDateTime=explicit_' +
                pulseUtility.convertDateForReport(this._range.lower) + '_' +
                pulseUtility.convertDateForReport(this._range.upper);
              //fullLink += '&PulseMinDateTime=' + pulseUtility.convertDateForReport(this._range.lower);
              //fullLink += '&PulseMaxDateTime=' + pulseUtility.convertDateForReport(this._range.upper);
            }
            else {
              fullLink = this._linkInErrorString +
                '&WebAppParamsDateTime=current_1_day';
            }
            $(this.element).find('.toollifemachine-linkreport').attr('href', fullLink);
            // End change link

            this.start();
          }
          break;
        case 'machine-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'machineIdChangeSignal');
            eventBus.EventBus.addEventListener(this,
              'machineIdChangeSignal',
              newVal,
              this.onMachineIdChange.bind(this));
          }
          break;
        case 'period-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'dateTimeRangeChangeEvent');
            eventBus.EventBus.addEventListener(this,
              'dateTimeRangeChangeEvent', newVal,
              this.onDateTimeRangeChange.bind(this));

            eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
              newVal);
          }
          this.start(); // To re-validate parameters
          break;
        case 'toollabelname':
          // RE-init displayRanges
          if (!pulseUtility.isNotDefined(newVal)) {
            this._changeToolLabelName();
          }
          break;
        default:
          break;
      }
    }

    initialize () {
      this.addClass('pulse-lastbar');

      // Update here some internal parameters

      // listeners/dispatchers
      if (this.element.hasAttribute('machine-context')) {
        eventBus.EventBus.addEventListener(this,
          'machineIdChangeSignal',
          this.element.getAttribute('machine-context'),
          this.onMachineIdChange.bind(this));
      }

      if (this.element.hasAttribute('period-context')) {
        eventBus.EventBus.addEventListener(this,
          'dateTimeRangeChangeEvent',
          this.element.getAttribute('period-context'),
          this.onDateTimeRangeChange.bind(this));

        eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
          this.element.getAttribute('period-context'));
      }
      else {
        eventBus.EventBus.addGlobalEventListener(this,
          'dateTimeRangeChangeEvent',
          this.onDateTimeRangeChange.bind(this));

        eventBus.EventBus.dispatchToAll('askForDateTimeRangeEvent');
      }

      // Init LABELS
      this._changeToolLabelName();

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM
      // DOM - OPERATION
      this._operationDiv = $('<div></div>')
        .addClass('pulse-cellbar-first')
        .addClass('pulse-cellbar-current-data'); // Operation is added later

      this._between = $('<div></div>')
        .addClass('pulse-cellbar-between');

      // Next expiration
      /*let spanNextExp = $('<span></span>').addClass('toollifemachine-next-expiration-span');
      let divNextExp = $('<div></div>')
                        .addClass('toollifemachine-next-expiration') 
                        .append(spanNextExp);*/

      // Link to report
      this._linkInErrorString = this.getConfigOrAttribute('reportpath', 'http://lctr:8080/pulsereporting/'); // Default
      let reportName = this.getConfigOrAttribute('toolReport', 'Tool/CurrentTools');
      this._linkInErrorString += '/viewer?__report=/' +
        reportName + '.rptdesign&PulseMachines=' +
        this.element.getAttribute('machine-id') +
        '&ShowAll=false';

      // DOM - Tools
      this._toolsDiv = $('<div></div>')
        .addClass('pulse-cellbar-last')
        .addClass('toollifemachine-tools');
      // DOM - Tools in ERROR
      /*let divToolsInError = $('<div></div>')
        .addClass('toollifemachine-tools-in-error');
      // DOM - Tools in WARNING or SOON expired
      let divToolsSoonExp = $('<div></div>')
        .addClass('toollifemachine-tools-soon-expired');*/

      // Main bar
      this._content = $('<div></div>')
        .addClass('pulse-cellbar-main') // was pulse-component-main
        .append(this._operationDiv).append(this._between)
        .append(this._toolsDiv);

      $(this.element).append(this._content);

      // Create DOM - message for error
      this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this.element).append(messageDiv);

      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this.element).append(loaderDiv);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      $(this.element).empty();

      this._operationDiv = undefined;
      this._between = undefined;
      this._toolsDiv = undefined;
      this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters () {
      // machine-id
      if (!this.element.hasAttribute('machine-id')) {
        console.error('missing attribute machine-id in ToollifeMachine.element');
        this.setError('missing machine-id'); // delayed error message
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        //'Machine Id has incorrect value', 'BAD_ID');
        // Immediat display :
        this.switchToKey('Error', () => this.displayError('Machine Id has incorrect value'), () => this.removeError());
        return;
      }

      // RANGE... is it mandatory ?

      this.switchToNextContext();
    }

    displayError (message) {
      $(this._messageSpan).html(message);

      // clean
      //$(this._toolsDiv).empty();
      //$(this._operationDiv).empty(); // tmp Hack waiting for REAL overlay
    }

    removeError () {
      $(this._messageSpan).html('');
    }

    get refreshRate () {
      return 2 * 1000 *
        Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));
    }

    getShortUrl () {
      let url = 'ToolLivesByMachine?MachineId=' +
        this.element.getAttribute('machine-id');
      // Ignore un-needed tools
      url += '&MaxExpirationTime=' +
        this._displayRanges[this._displayRanges.length - 1].minutes * 60; // in seconds
      return url;
    }

    _createSoonTitleSVG (textDisplay) {
      let h = 40;
      let w = 20;

      let svg = document.createElementNS(pulseSvg.get_svgNS(), 'svg');
      //svg.setAttribute('width', this.barwidth); // NO ! for auto-adapt
      //svg.setAttribute('height', this._height);
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.setAttribute('class', 'toollifemachine-soon-title-svg');

      // CREATE GROUP (to display rect AND text)
      let g = document.createElementNS(pulseSvg.get_svgNS(), 'g');
      g.setAttribute('width', w);
      g.setAttribute('height', h);

      // CREATE rect
      let rect = document.createElementNS(pulseSvg.get_svgNS(), 'rect');
      rect.setAttribute('x', 0);
      rect.setAttribute('y', 0);
      rect.setAttribute('width', w);
      rect.setAttribute('height', h);
      rect.setAttribute('class', 'toollifemachine-soon-title-svg-background');
      g.appendChild(rect);

      // Add Text
      let display = document.createElementNS(pulseSvg.get_svgNS(), 'text');
      display.setAttribute('class', 'toollifemachine-soon-title-svg-text');
      display.setAttribute('x', w / 2);
      display.setAttribute('y', h / 2);
      //display.setAttribute('fill', this._data[i].fgColor);
      display.setAttribute('text-anchor', 'middle');
      display.setAttribute('alignment-baseline', 'central');
      //display.setAttribute('font-size', this._height / 2);
      //display.setAttribute('font-weight', 'bold');
      display.setAttribute('transform', 'translate(-' + w / 3 + ', 30) rotate(-90)');
      display.textContent = textDisplay;
      g.appendChild(display);

      svg.appendChild(g);

      let crtSoonTitle = $('<div></div>').addClass('toollifemachine-soon-title')
        .append(svg);
      return crtSoonTitle;
    }

    refresh (data) {
      this.removeError();

      this._current_display = this.getTranslation(
        'noOperation', 'No Operation');
      if (data.Operation && data.Operation.Display) {
        this._current_display = data.Operation.Display;
      }
      //if there is no slot, display ???

      // Synchro / server time
      this._diffServerTimeMinusNowMSec =
        pulseConfig.getInt('diffServerTimeMinusNowMSec', 0);
      this._serverNow = new Date(
        (new Date()).getTime() + this._diffServerTimeMinusNowMSec);

      // Clean
      $(this._toolsDiv).empty(); // Tools

      // Left Block = operation
      $(this._operationDiv).empty();
      if (data.Operation && data.Operation.DocumentLink) {
        let linkOperation = $('<a></a>').addClass('toollifemachine-operation-span-or-link')
          .html(this._current_display);
        //.attr('href', ???); -> DoneLater
        linkOperation.attr('target', '_blank'); // To open in a new tab
        linkOperation.attr('href', data.Operation.DocumentLink);
        $(this._operationDiv).append(linkOperation);
      }
      else {
        let spanOperation = $('<span></span>')
          .addClass('toollifemachine-operation-span-or-link')
          .html(this._current_display);
        $(this._operationDiv).append(spanOperation);
      }

      // To order display between machines
      this._getOldestExpiration = null;
      if (0 < data.Tools.length) { // to order rows if usefull... see toollifelist
        if (data.Tools[0].ExpirationDateTimeRange) {
          let range = pulseRange.createStringRangeFromString(data.Tools[0].ExpirationDateTimeRange);
          this._getOldestExpiration = range.lower;
        }
      }

      // Right block : Tools
      let iRange = 0;
      let noToolSinceLastTitle = true;
      let nbExpiredTools = 0;
      let nbNotExpiredTools = 0;
      let fullLink = this._linkInErrorString;
      if (!this._range.isEmpty()) {
        fullLink += '&WebAppParamsDateTime=explicit_' +
          pulseUtility.convertDateForReport(this._range.lower) + '_' +
          pulseUtility.convertDateForReport(this._range.upper);
        //fullLink += '&PulseMinDateTime=' + pulseUtility.convertDateForReport(this._range.lower);
        //fullLink += '&PulseMaxDateTime=' + pulseUtility.convertDateForReport(this._range.upper);
      }
      else {
        fullLink += '&WebAppParamsDateTime=current_1_day';
      }
      for (let iTool = 0; iTool < data.Tools.length; iTool++) {
        if (data.Tools[iTool].Expired) {
          nbExpiredTools += 1;
          let linkTool = $('<a></a>').addClass('toollifemachine-tool-span')
            .addClass('toollifemachine-tool-in-error-span')
            .addClass('toollifemachine-linkreport')
            .html(data.Tools[iTool].Display);
          linkTool.attr('href', fullLink);
          linkTool.attr('target', '_blank'); // To open in a new tab

          if (data.Tools[iTool].Group) {
            linkTool.addClass('toollifemachine-tool-isgroup');
          }
          else {
            if (data.Tools[iTool].ActiveSisterTool)
              linkTool.addClass('toollifemachine-tool-active');
            if (data.Tools[iTool].ValidSisterTools)
              linkTool.addClass('toollifemachine-tool-validsistertool');
          }

          //$(this._toolsDiv).show();
          $(this._toolsDiv)
            .append(this._createDivForSingleTool(linkTool, data.Tools[iTool].RemainingCycles));
        }
        else { // Not expired
          if (!this._showexpiredonly) {
            if (nbNotExpiredTools == 0 && nbExpiredTools > 0) {
              // Add separator
              let svg = document.createElementNS(pulseSvg.get_svgNS(), 'svg');
              svg.setAttribute('viewBox', '0 0 2 45');
              svg.setAttribute('preserveAspectRatio', 'none');

              svg.setAttribute('width', 2);
              //svg.setAttribute('height', '45px'); // 100% in css ?
              svg.setAttribute('class', 'toollife-separator-svg');
              // CREATE LINE
              let line = document.createElementNS(pulseSvg.get_svgNS(), 'line');
              //line.setAttribute('stroke', 'white'); // color -> CSS
              line.setAttribute('stroke-width', '2px'); // = width
              line.setAttribute('x1', '0');
              line.setAttribute('y1', '0');
              line.setAttribute('x2', '0');
              line.setAttribute('y2', '45px');
              line.setAttribute('class', 'toollife-separator-line');
              svg.appendChild(line);
              $(this._toolsDiv).append(svg);
            }
            nbNotExpiredTools += 1;
            if (data.Tools[iTool].ExpirationDateTimeRange) {
              let range = pulseRange.createStringRangeFromString(data.Tools[iTool].ExpirationDateTimeRange);

              let expDate = new Date(range.lower);
              let diffTimeMSec = expDate.getTime() - this._serverNow.getTime();
              while ((iRange < this._displayRanges.length) &&
                (diffTimeMSec >= this._displayRanges[iRange].minutes * 1000 * 60)) {
                // Display Range limit
                if (this._displayRanges[iRange].display != '') {
                  //toollifemachine-soon-title-svg
                  let crtSoonTitle = this._createSoonTitleSVG(this._displayRanges[iRange].display);

                  $(this._toolsDiv).append(crtSoonTitle);
                  noToolSinceLastTitle = true;
                }
                iRange++;
              }
              if (iRange >= this._displayRanges.length) {
                break; // break for
              }
              if (diffTimeMSec < this._displayRanges[iRange].minutes * 1000 * 60) { // should be true here
                // add span
                let spanTool = $('<span></span>').addClass('toollifemachine-tool-span')
                  .html(data.Tools[iTool].Display);
                if (data.Tools[iTool].Warning) {
                  spanTool.addClass('toollifemachine-tool-warn-span');
                }
                if (data.Tools[iTool].Group) {
                  spanTool.addClass('toollifemachine-tool-isgroup');
                }
                else {
                  if (data.Tools[iTool].ActiveSisterTool)
                    spanTool.addClass('toollifemachine-tool-active');
                  if (data.Tools[iTool].ValidSisterTools)
                    spanTool.addClass('toollifemachine-tool-validsistertool');
                }
                $(this._toolsDiv)
                  .append(this._createDivForSingleTool(spanTool, data.Tools[iTool].RemainingCycles));
                noToolSinceLastTitle = false;
              }
            }
            else { // NO daterange
              if (data.Tools[iTool].Warning) { // Warning without time - free display
                let spanTool = $('<span></span>').addClass('toollifemachine-tool-span')
                  .html(data.Tools[iTool].Display);
                spanTool.addClass('toollifemachine-tool-warn-span');

                if (data.Tools[iTool].Group) {
                  spanTool.addClass('toollifemachine-tool-isgroup');
                }
                else {
                  if (data.Tools[iTool].ActiveSisterTool)
                    spanTool.addClass('toollifemachine-tool-active');
                  if (data.Tools[iTool].ValidSisterTools)
                    spanTool.addClass('toollifemachine-tool-validsistertool');
                }

                $(this._toolsDiv)
                  .append(this._createDivForSingleTool(spanTool, data.Tools[iTool].RemainingCycles));
              }
            }
          }
        }
      }
      if (noToolSinceLastTitle == false) {
        // Display Range limit if needed
        if ((this._displayRanges[iRange].display != '') &&
          (iRange < this._displayRanges.length)) {
          let crtSoonTitle = this._createSoonTitleSVG(this._displayRanges[iRange].display);
          $(this._toolsDiv).append(crtSoonTitle);
        }
      }

    }

    // Callback events

    /**
     * Event bus callback triggered when 'machine-id' changes
     *
     * @param {Object} event
     */
    onMachineIdChange (event) {
      this.element.setAttribute('machine-id', event.target.newMachineId);
    }

    /**
     * Event bus callback triggered when the date/time range changes
     *
     * @param {Object} event
     */
    onDateTimeRangeChange (event) {
      // Set range
      this._range = event.target.daterange;

      // Refresh Links
      let fullLink = this._linkInErrorString;
      if (!this._range.isEmpty()) {
        fullLink += '&WebAppParamsDateTime=explicit_' +
          pulseUtility.convertDateForReport(this._range.lower) + '_' +
          pulseUtility.convertDateForReport(this._range.upper);
        /*'&PulseMinDateTime=' + pulseUtility.convertDateForReport(this._range.lower);
        fullLink += '&PulseMaxDateTime=' + pulseUtility.convertDateForReport(this._range.upper);*/
      }
      else {
        fullLink += '&WebAppParamsDateTime=current_1_day';
      }
      $(this.element).find('.toollifemachine-linkreport').attr('href', fullLink);
    }

    /**
      * Event callback in case a config is updated: (re-)start the component
      * 
      * @param {*} event 
      */
    onConfigChange (event) {
      if (event.target.config == 'toollabelname') {
        this._changeToolLabelName();
        this.start();
      }
      if (event.target.config == 'displayremainingcyclesbelowtool') {
        this.start();
      }
    }

  }

  pulseComponent.registerElement('x-toollifemachine', ToolLifeMachineComponent, ['machine-id', 'machine-context', 'period-context', 'toollabelname']);
})();
