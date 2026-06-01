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

  /**
   * `<x-toollifemachine>` — tool-life summary for one machine.
   *
   * Polls `ToolLivesByMachine?MachineId=<id>&MaxExpirationTime=<seconds>`
   * (interval = `refreshingRate.currentRefreshSeconds`, default 10 s) and
   * renders one row per tool — number, label, remaining-life percentage,
   * expiration time — bucketed and styled by the
   * `toollabelname` / `toollabelsselections` configs (also driving the
   * "expired-only" filter). Reacts to `machineIdChangeSignal` on
   * `machine-context`.
   *
   * @element x-toollifemachine
   * @attr {number} machine-id      (required) machine id
   * @attr {string} machine-context event-bus context for `machineIdChangeSignal`
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
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
      let singletool = document.createElement('div');
      singletool.className = 'toollifemachine-singletool-div';
      singletool.appendChild(spanOrLink);

      if ('true' == this.getConfigOrAttribute('displayremainingcyclesbelowtool')
        || true == this.getConfigOrAttribute('displayremainingcyclesbelowtool')) {
        if (!pulseUtility.isNotDefined(RemainingCycles)) {
          let remainingCycles = document.createElement('span');
          remainingCycles.className = 'toollifemachine-remaining-cycles-span';
          remainingCycles.innerHTML = RemainingCycles;
          singletool.appendChild(remainingCycles);
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
            this._operationDiv.replaceChildren();
            this._toolsDiv.replaceChildren();

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
            let links = this.element.querySelectorAll('.toollifemachine-linkreport');
            links.forEach(link => link.setAttribute('href', fullLink));
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
      this.element.replaceChildren();

      // Create DOM
      // DOM - OPERATION
      this._operationDiv = document.createElement('div');
      this._operationDiv.className = 'pulse-cellbar-first pulse-cellbar-current-data'; // Operation is added later

      // Next expiration
      /*let spanNextExp = document.createElement('span');
      spanNextExp.className = 'toollifemachine-next-expiration-span';
      let divNextExp = document.createElement('div');
      divNextExp.className = 'toollifemachine-next-expiration';
      divNextExp.appendChild(spanNextExp);*/

      // Link to report
      this._linkInErrorString = this.getConfigOrAttribute('reportpath', 'http://lctr:8080/pulsereporting/'); // Default
      let reportName = this.getConfigOrAttribute('toolReport', 'Tool/CurrentTools');
      this._linkInErrorString += '/viewer?__report=/' +
        reportName + '.rptdesign&PulseMachines=' +
        this.element.getAttribute('machine-id') +
        '&ShowAll=false';

      // DOM - Tools
      this._toolsDiv = document.createElement('div');
      this._toolsDiv.className = 'pulse-cellbar-last toollifemachine-tools';
      // DOM - Tools in ERROR
      /*let divToolsInError = document.createElement('div');
      divToolsInError.className = 'toollifemachine-tools-in-error';
      // DOM - Tools in WARNING or SOON expired
      let divToolsSoonExp = document.createElement('div');
      divToolsSoonExp.className = 'toollifemachine-tools-soon-expired';*/

      // Main bar
      this._content = document.createElement('div');
      this._content.className = 'pulse-cellbar-main'; // was pulse-component-main
      this._content.appendChild(this._operationDiv);
      this._content.appendChild(this._toolsDiv);

      this.element.appendChild(this._content);

      // Create DOM - message for error
      this._messageSpan = document.createElement('span');
      this._messageSpan.className = 'pulse-message';
      this._messageSpan.innerHTML = '';
      let messageDiv = document.createElement('div');
      messageDiv.className = 'pulse-message-div';
      messageDiv.appendChild(this._messageSpan);
      this.element.appendChild(messageDiv);

      // Create DOM - Loader
      let loader = document.createElement('div');
      loader.className = 'pulse-loader';
      loader.innerHTML = this.getTranslation('loadingDots', 'Loading...');
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.className = 'pulse-loader-div';
      loaderDiv.appendChild(loader);
      this.element.appendChild(loaderDiv);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      this.element.replaceChildren();

      this._operationDiv = undefined;
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
        this.setError(this.getTranslation('error.selectMachine', 'Please select a machine')); // delayed error message
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        //'Machine Id has incorrect value', 'BAD_ID');
        // Immediat display :
        this.switchToKey('Error', () => this.displayError(this.getTranslation('error.invalidMachineId', 'Invalid machine-id')), () => this.removeError());
        return;
      }

      // RANGE... is it mandatory ?

      this.switchToNextContext();
    }

    displayError (message) {
      this._messageSpan.innerHTML = message;

      // clean
      //this._toolsDiv.replaceChildren();
      //this._operationDiv.replaceChildren(); // tmp Hack waiting for REAL overlay
    }

    removeError () {
      this._messageSpan.innerHTML = '';
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

      let crtSoonTitle = document.createElement('div');
      crtSoonTitle.className = 'toollifemachine-soon-title';
      crtSoonTitle.appendChild(svg);
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
      this._toolsDiv.replaceChildren(); // Tools

      // Left Block = operation
      this._operationDiv.replaceChildren();
      if (data.Operation && data.Operation.DocumentLink) {
        let linkOperation = document.createElement('a');
        linkOperation.className = 'toollifemachine-operation-span-or-link';
        linkOperation.innerHTML = this._current_display;
        //.attr('href', ???); -> DoneLater
        linkOperation.setAttribute('target', '_blank'); // To open in a new tab
        linkOperation.setAttribute('href', data.Operation.DocumentLink);
        this._operationDiv.appendChild(linkOperation);
      }
      else {
        let spanOperation = document.createElement('span');
        spanOperation.className = 'toollifemachine-operation-span-or-link';
        spanOperation.innerHTML = this._current_display;
        this._operationDiv.appendChild(spanOperation);
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
          let linkTool = document.createElement('a');
          linkTool.className = 'toollifemachine-tool-span toollifemachine-tool-in-error-span toollifemachine-linkreport';
          linkTool.innerHTML = data.Tools[iTool].Display;
          linkTool.setAttribute('href', fullLink);
          linkTool.setAttribute('target', '_blank'); // To open in a new tab

          if (data.Tools[iTool].Group) {
            linkTool.classList.add('toollifemachine-tool-isgroup');
          }
          else {
            if (data.Tools[iTool].ActiveSisterTool)
              linkTool.classList.add('toollifemachine-tool-active');
            if (data.Tools[iTool].ValidSisterTools)
              linkTool.classList.add('toollifemachine-tool-validsistertool');
          }

          //this._toolsDiv.style.display = '';
          this._toolsDiv.appendChild(this._createDivForSingleTool(linkTool, data.Tools[iTool].RemainingCycles));
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
              line.setAttribute('y2', '45');
              line.setAttribute('class', 'toollife-separator-line');
              svg.appendChild(line);
              this._toolsDiv.appendChild(svg);
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

                  this._toolsDiv.appendChild(crtSoonTitle);
                  noToolSinceLastTitle = true;
                }
                iRange++;
              }
              if (iRange >= this._displayRanges.length) {
                break; // break for
              }
              if (diffTimeMSec < this._displayRanges[iRange].minutes * 1000 * 60) { // should be true here
                // add span
                let spanTool = document.createElement('span');
                spanTool.className = 'toollifemachine-tool-span';
                spanTool.innerHTML = data.Tools[iTool].Display;
                if (data.Tools[iTool].Warning) {
                  spanTool.classList.add('toollifemachine-tool-warn-span');
                }
                if (data.Tools[iTool].Group) {
                  spanTool.classList.add('toollifemachine-tool-isgroup');
                }
                else {
                  if (data.Tools[iTool].ActiveSisterTool)
                    spanTool.classList.add('toollifemachine-tool-active');
                  if (data.Tools[iTool].ValidSisterTools)
                    spanTool.classList.add('toollifemachine-tool-validsistertool');
                }
                this._toolsDiv.appendChild(this._createDivForSingleTool(spanTool, data.Tools[iTool].RemainingCycles));
                noToolSinceLastTitle = false;
              }
            }
            else { // NO daterange
              if (data.Tools[iTool].Warning) { // Warning without time - free display
                let spanTool = document.createElement('span');
                spanTool.className = 'toollifemachine-tool-span';
                spanTool.innerHTML = data.Tools[iTool].Display;
                spanTool.classList.add('toollifemachine-tool-warn-span');

                if (data.Tools[iTool].Group) {
                  spanTool.classList.add('toollifemachine-tool-isgroup');
                }
                else {
                  if (data.Tools[iTool].ActiveSisterTool)
                    spanTool.classList.add('toollifemachine-tool-active');
                  if (data.Tools[iTool].ValidSisterTools)
                    spanTool.classList.add('toollifemachine-tool-validsistertool');
                }

                this._toolsDiv.appendChild(this._createDivForSingleTool(spanTool, data.Tools[iTool].RemainingCycles));
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
          this._toolsDiv.appendChild(crtSoonTitle);
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
      let links = this.element.querySelectorAll('.toollifemachine-linkreport');
      links.forEach(link => link.setAttribute('href', fullLink));
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
