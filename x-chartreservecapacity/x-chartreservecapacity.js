// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2025 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-chartreservecapacity
 * @requires module:pulseComponent
 */
var pulseComponent = require('pulsecomponent');
var pulseConfig = require('pulseConfig');
var pulseSvg = require('pulseSvg');
var pulseUtility = require('pulseUtility');

(function () {

  /**
   * `<x-chartreservecapacity>` — bar chart of reserve-capacity utilization for the
   * current shift, grouped by group.
   *
   * Polls `Operation/ReserveCapacityCurrentShiftChartByGroup` (filtered by `group`
   * config when set, otherwise by `machine-id`) on a 5-minute refresh and renders
   * an SVG bar chart via `pulseSvg.createBarChart`. Bar values can be clamped via
   * the `minchartvalue` / `maxchartvalue` configs.
   *
   * @element x-chartreservecapacity
   * @attr {number} machine-id  (optional) machine id, used when `group` config is unset
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
  class ChartReserveCapacityComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      self._content = undefined;
      self._shiftDisplay = undefined;
      self._whenDiv = undefined;
      self._charContent = undefined;

      // DOM: never in constructor, use the initialize method instead

      return self;
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'group':
        case 'machine-id':
          this.start();
          break;
        default:
          break;
      }
    }

    initialize () {
      this.addClass('pulse-bigdisplay');

      // Update here some internal parameters

      // In case of clone, need to be empty :
      this.element.replaceChildren();

      // Create DOM - Content
      let headerContent = document.createElement('div');
      headerContent.className = 'chartreservecapacity-header';
      this._shiftDisplay = document.createElement('div');
      this._shiftDisplay.className = 'chartreservecapacity-shift-div';
      this._whenDiv = document.createElement('div');
      this._whenDiv.className = 'chartreservecapacity-now-div';
      headerContent.appendChild(this._shiftDisplay);
      headerContent.appendChild(this._whenDiv);

      this._charContent = document.createElement('div');
      this._charContent.className = 'pulse-chart-content';
      let chartPosition = document.createElement('div');
      chartPosition.className = 'chartreservecapacity-chart-position';
      chartPosition.appendChild(this._charContent);

      this._content = document.createElement('div');
      this._content.className = 'chartreservecapacity-content';
      this._content.appendChild(headerContent);
      this._content.appendChild(chartPosition);
      this.element.appendChild(this._content);

      // Create DOM - Loader
      let loader = document.createElement('div');
      loader.className = 'pulse-loader';
      loader.innerHTML = 'Loading...';
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.className = 'pulse-loader-div';
      loaderDiv.appendChild(loader);
      this._content.appendChild(loaderDiv);

      // Create DOM - message for error
      this._messageSpan = document.createElement('span');
      this._messageSpan.className = 'pulse-message';
      this._messageSpan.innerHTML = '';
      this._messageDiv = document.createElement('div');
      this._messageDiv.className = 'pulse-message-div';
      this._messageDiv.appendChild(this._messageSpan);
      this._content.appendChild(this._messageDiv);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    /**
      * Clear anything that was done during intialization, so that initialize can be called once again.
      * Remove all the dispatchers and listeners.
      * Please note that no state switch is done here
    */
    clearInitialization () {
      // Parameters

      // DOM
      this.element.replaceChildren();
      this._content = undefined;
      this._charContent = undefined;

      super.clearInitialization();
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters () {
      let groups = this.getConfigOrAttribute('group');
      if (pulseUtility.isNotDefined(groups) || groups == '') {
        // list of machines is defined ?
        //let machines = this.getConfigOrAttribute('machine', ''); -> Not defined
        if (!this.element.hasAttribute('machine-id')) {
          console.warn('missing attribute group or machine in x-groupsingroup');
          // Delayed display :
          this.setError(this.getTranslation('error.selectMachineGroup', 'Please select a machine or a group of machines')); // delayed error message
          // Immediate display :
          //this.switchToKey('Error', () => this.displayError(this.getTranslation('error.selectMachineGroup', 'Please select a machine or a group of machines'), () => this.removeError());

          return;
        }
      }

      this.switchToNextContext();
    }

    displayError (message) {
      this._messageSpan.innerHTML = message;
      // Note that you can use the CSS class .pulse-component-error or .pulse-component-warning instead
      this._messageDiv.classList.add('force-visibility');
    }

    removeError () {
      this.displayError('');
      this._messageDiv.classList.remove('force-visibility');
    }

    get refreshRate () {
      // return 1000*Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds',10));
      return 1000 * 60 * 5; // 5 min
    }

    getShortUrl () {
      let url = 'Operation/ReserveCapacityCurrentShiftChartByGroup';
      let groups = this.getConfigOrAttribute('group');

      if (pulseUtility.isNotDefined(groups) || groups == '') {
        // list of machines is defined ?
        if (this.element.hasAttribute('machine-id')) {
          let machine = this.element.getAttribute('machine-id');
          if (pulseUtility.isNotDefined(machine) || machine == '') {
            return ''; // Should never happen !
          }
          url += '?GroupIds=' + machine;
          return url;
        }
        else {
          return ''; // Should never happen !
        }
      }
      else {
        url += '?ParentGroupId=' + groups;
        return url;
      }
    }

    refresh (data) {
      // Update the component with data which is returned by the web service in case of success
      // For example:
      //$(this._content).html(data.Name);
      this._data = data;

      // Header
      if (!pulseUtility.isNotDefined(data.Shift)
        && !pulseUtility.isNotDefined(data.Shift.Display)) {
        this._shiftDisplay.innerHTML = data.Shift.Display;
      }
      else {
        this._shiftDisplay.innerHTML = '';
      }
      if (!pulseUtility.isNotDefined(data.DateTime)) {
        this._whenDiv.innerHTML = pulseUtility.displayDate(data.DateTime, false);
      }
      else {
        this._whenDiv.innerHTML = '';
      }

      if (pulseUtility.isNotDefined(data.ChartData)
        || data.ChartData.length == 0) {
        this.displayError('No data available');
        pulseSvg.removeBarChart(this._charContent, 'chartreservecapacity-svg');
        return;
      }
      else {
        this.removeError();
      }
      //data.Shift.ShiftDisplay
      //data.Day
      //data.DateTime

      // Fill Graph
      this._options = {
        //minValue
        //maxValue
        //mainTitle: 'main',
        //leftTitle: 'left',
        //bottomTitle: 'bottom',
        //sourceText: 'src',
        drawHorizontalGrid: true
        //drawVerticalLines
      }

      let minVal = this.getConfigOrAttribute('minchartvalue', '');
      let maxVal = this.getConfigOrAttribute('maxchartvalue', '');
      if ('' != minVal) {
        this._options.minValue = minVal;
      }
      if ('' != maxVal) {
        this._options.maxValue = maxVal;
      }

      // Prepare date for graph
      this._graphData = [];
      for (let i = 0; i < data.ChartData.length; i++) {
        let capa = data.ChartData[i].ReserveCapacity;
        let boundedCapa = capa;
        if (('' != minVal) && (capa < minVal)) {
          boundedCapa = minVal;
        }
        if (('' != maxVal) && (boundedCapa > maxVal)) {
          boundedCapa = maxVal;
        }
        let singleData = {
          xDisplay: data.ChartData[i].GroupDisplay,
          value: capa,
          boundedValue: boundedCapa
        };
        this._graphData.push(singleData);

        // Min / Max = auto
        /*if (minValue > capa) {
          minValue = capa;
        }
        if (maxValue < capa) {
          maxValue = capa;
        }*/
      }

      pulseSvg.createBarChart(this._charContent, 'chartreservecapacity-svg', this._graphData, this._options);

      // Resize
      var self = this;
      window.addEventListener('resize', function () {
        pulseSvg.createBarChart(self._charContent, 'chartreservecapacity-svg', self._graphData, self._options);
      });
    }

    // Callback events

    /**
     * Event callback in case a config is updated: (re-)start the component
     *
     * @param {*} event
     */
    onConfigChange (event) {
      if ((event.target.config == 'machine')
        || (event.target.config == 'group')) {
        // Clean ancestors
        this._ignoreAncestors = true;
        // Re-load
        this.start();
      }
      if ((event.target.config == 'minchartvalue')
        || (event.target.config == 'maxchartvalue')) {
        // Re-load
        this.start();
        // FYI : Do not only resize chart because of bounded values
      }
    }
  }

  pulseComponent.registerElement('x-chartreservecapacity', ChartReserveCapacityComponent,
    ['group', 'machine-id']);
})();