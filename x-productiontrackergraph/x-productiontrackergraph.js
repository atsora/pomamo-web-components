// Copyright (C) 2025 Atsora Solutions

/**
 * @module x-productiontrackergraph
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseRange = require('pulseRange');
var eventBus = require('eventBus');

// Add "type": "module" in package.json to use import
//import Chart from 'chart.js/auto'
const Chart = require('chart.js/auto');

(function () {
  class ProductionTrackerGraphComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      this._chartInstance = undefined;

      self._content = undefined;
      self._graph = undefined;
      self._messageSpan = undefined;

      self._hourlyLabels = [];
      // TODO: check...
      // Map [range] = {actual=x, target=y, isStatic}
      // How to use map : https://www.zendevs.xyz/les-nouveaux-objets-set-et-map-en-javascript-es6/
      self._hourlyData = new Map();
      self._resetAllData();

      return self;
    }

    attributeChangedWhenConnectedOnce(attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
        case 'group':
          if (this.isInitialized()) {
            this.start();
          } break;
        case 'machine-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'machineIdChangeSignal');
            eventBus.EventBus.addEventListener(this,
              'machineIdChangeSignal',
              newVal,
              this.onMachineIdChange.bind(this));
          }
          break;

        // for tests
        case 'range': {
          if (this._range == undefined) {
            let newRange = pulseRange.createStringRangeFromString(newVal);
            if (newRange.isValid()) {
              this._range = newRange;
            }
          }
        } break;
        case 'period-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'dateTimeRangeChangeEvent');
            eventBus.EventBus.addEventListener(this,
              'dateTimeRangeChangeEvent',
              newVal,
              this.onDateTimeRangeChange.bind(this));

            if (!this.element.hasAttribute('range')) {
              eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
                this.element.getAttribute('period-context'));
            }
          }
          break;
        default:
          break;
      }
    }

    initialize() {
      this.addClass('atsora-productiontrackergraph');

      // In case of clone, need to be empty :
      if (this._content) {
        this._content.innerHTML = '';
      }

      // Listener and dispatchers
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
      }
      else {
        eventBus.EventBus.addGlobalEventListener(this,
          'dateTimeRangeChangeEvent',
          this.onDateTimeRangeChange.bind(this));
      }

      if (this.element.hasAttribute('range')) {
        this._range = pulseRange.createStringRangeFromString(
          this.element.getAttribute('range'));
      }
      else {
        if (this.element.hasAttribute('period-context')) {
          eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
            this.element.getAttribute('period-context'));
        }
        else {
          eventBus.EventBus.dispatchToAll('askForDateTimeRangeEvent');
        }
      }

      if (!this._themeBtnListener) {
        this._themeBtnListener = () => {
          if (this._chartInstance) {
            setTimeout(() => this._updateColor(), 100);
          }
        };
        const btn = document.getElementById('darkthemebtn');
        if (btn) {
          btn.addEventListener('click', this._themeBtnListener);
        }
      }


      // Create DOM - Content
      this._content = this.document.createElement('div');
      this._content.className = 'productiontrackergraph-content';


      // Loader
      let loader = this.document.createElement('div');
      loader.className = 'pulse-loader';
      loader.innerHTML = 'Loading...';
      loader.style.display = 'none';
      // TODO: check if loaderDiv is necessary
      let loaderDiv = this.document.createElement('div');
      loaderDiv.className = 'pulse-loader-div';
      loaderDiv.appendChild(loader);
      this._content.appendChild(loaderDiv);

      // Message for errors
      this._messageSpan = this.document.createElement('span');
      this._messageSpan.className = 'pulse-message';
      this._messageSpan.innerHTML = '';
      let messageDiv = this.document.createElement('div');
      messageDiv.className = 'pulse-message-div';
      messageDiv.appendChild(this._messageSpan);
      this._content.appendChild(messageDiv);

      // Graph
      this._graph = this.document.createElement('canvas');
      this._content.appendChild(this._graph);

      this.element.appendChild(this._content);

      if (this.element.hasAttribute('range')) {
        this._parseDate(this.element.getAttribute('range'));
      }

      this.switchToNextContext();
    }

    clearInitialization() {
      if (this._chartInstance) {
        this._chartInstance.destroy();
        this._chartInstance = undefined;
      }
      // Parameters

      // DOM
      if (this._content) {
        this._content.innerHTML = '';
      }

      this._graph = undefined;
      this._messageSpan = undefined;
      this._content = undefined;

      this._resetAllData();

      // Remove listeners
      const btn = document.getElementById('darkthemebtn');
      if (btn && this._themeBtnListener) {
        btn.removeEventListener('click', this._themeBtnListener);
        this._themeBtnListener = null;
      }

      super.clearInitialization();
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters() {

      // Check the range is valid
      if (this._range == undefined) {
        console.log('waiting attribute range in ProductionTrackerGraph.element');

        // For tests
        if (this.element.hasAttribute('range')) {
          let newRange = pulseRange.createStringRangeFromString(
            this.element.getAttribute('range'));
          this._range = newRange;
          this.switchToNextContext();
          return;
        }
        return;
      }

      if (!this.element.hasAttribute('group')) {
        console.error('missing attribute machine or group in MachineDisplayComponent.element');
        this.switchToKey('Error', () => this.displayError(this.getTranslation('invalidMachineGroup', 'Invalid machine or group')), () => this.removeError());
        return;
      }



      this.switchToNextContext();
    }

    displayError(message) {
      if ('' === message) {
        this._content.removeAttribute('error-message');
      }
      else {
        this._content.setAttribute('error-message', message);
      }

      this._messageSpan.innerHTML = message;

      if (this._chartInstance) {
        this._chartInstance.destroy();
        this._chartInstance = undefined;
      }

      if (this._graph && this._graph.parentNode) {
        this._graph.replaceChildren();
        this._graph.parentNode.removeChild(this._graph);
      }
      this._graph = undefined;

      this._resetAllData();
    }

    _resetAllData() {
      this._data = undefined;

      // TODO: ...
      this._hourlyData.clear();
      this._rangeToReturn = undefined;

      // Clean storage
      this._staticCumulActual = 0;
      this._staticCumulTarget = 0;
    }

    removeError() {
      this._messageSpan.innerHTML = '';
      this._content.removeAttribute('error-message');
    }

    get refreshRate() {
      return 1000 * Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));
    }

    getShortUrl() {
      let url = 'ProductionTracker?';
      if (this.element.hasAttribute('group')) {
        url += 'GroupId='
          + this.element.getAttribute('group') + '&';
      }
      url += 'Range=' + this._getRangeToAsk();
      return url;
    }

    _getRangeToAsk() {
      if (this._rangeToReturn == undefined)
        this._rangeToReturn = this._range;

      if (this._rangeToReturn.upper != this._range.upper)
        this._rangeToReturn = this._range;

      // Check Static ranges
      for (let data of this._hourlyData) {
        if (data[1].isStatic) { // Value
          let staticRange = pulseRange.convertToDateRange(data[0]); // Key
          if (this._rangeToReturn.lower <= staticRange.lower) {
            this._rangeToReturn.lower = staticRange.upper;
          }
        }
      }

      return pulseUtility.convertDateRangeForWebService(this._rangeToReturn);
    }

    refresh(data) {
      this._data = data;

      this._draw();
    }

    _cleanDisplay() {
      if (this._chartInstance) {
        this._chartInstance.destroy();
        this._chartInstance = undefined;
      }
      if (this._graph && this._graph.parentNode) {
        this._graph.replaceChildren();
        this._graph.parentNode.removeChild(this._graph);
      }
      this._graph = undefined;

      this._resetAllData();
    }

    _resize() {
      if (this._graph != undefined) {
        // TODO: ...neeeded???
        // check x-productiontrackergraph
      }
    }

    _updateColor() {
      if (!this._chartInstance) {
        this._draw();
      }
      else {
        const axisColor = getComputedStyle(document.documentElement).getPropertyValue('--chart_axis_color');
        const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--chart_grid_color');
        const lineColor = getComputedStyle(document.documentElement).getPropertyValue('--color_green');
        const barColor = getComputedStyle(document.documentElement).getPropertyValue('--color_blue');

        // Axes
        this._chartInstance.options.scales.x.ticks.color = axisColor;
        this._chartInstance.options.scales.x.grid.color = gridColor;
        this._chartInstance.options.scales.y.ticks.color = axisColor;
        this._chartInstance.options.scales.y.grid.color = gridColor;
        this._chartInstance.options.scales.y.title.color = axisColor;

        // Datasets (line + bars)
        if (this._chartInstance.data.datasets[0]) {
          this._chartInstance.data.datasets[0].borderColor = lineColor;
          this._chartInstance.data.datasets[0].backgroundColor = lineColor;
        }
        if (this._chartInstance.data.datasets[1]) {
          this._chartInstance.data.datasets[1].backgroundColor = barColor;
        }

        this._chartInstance.update();
      }
    }

    _draw() {
      if ((this._content == undefined) || (this._content == null)) {
        return;
      }
      if (this._data) {

        if ((this._graph == undefined) || (this._graph == null)) {
          // Create graph
          this._graph = this.document.createElement('canvas');
          this._graph.className = 'productiontrackergraph-graph';
          this._content.appendChild(this._graph);
        }

        // Prepare data for graph
        let labels = [];
        let actualData = [];
        let targetData = [];
        for (let i = 0; i < this._hourlyLabels.length; i++) {
          if (i < this._data.HourlyData.length) {
            labels.push(pulseUtility.displayRangeLowerTime(
              this._data.HourlyData[i].Range, false));
            actualData.push(this._data.HourlyData[i].Actual);
            targetData.push(this._data.HourlyData[i].Target);
          }
          else {
            labels.push(this._hourlyLabels[i]);
          }
        }

        // TODO: target for the full hour
        // Create chart      
        if (this._chartInstance) {
          this._chartInstance.data.labels = labels;
          this._chartInstance.data.datasets[1].data = actualData;
          this._chartInstance.data.datasets[0].data = targetData;
          this._chartInstance.options.scales.y.suggestedMax = Math.ceil((Math.max(...targetData) || 1) * 1.1);

          this._chartInstance.update();
        }
        else {
          this._chartInstance = new Chart(this._graph, {
            data: {
              labels: labels,
              datasets: [
                {
                  type: 'line',
                  label: '',
                  data: targetData,
                  borderColor: getComputedStyle(document.documentElement).getPropertyValue('--color_green'),
                  backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--color_green'),
                  pointStyle: false,
                  fill: false
                },
                {
                  type: 'bar',
                  label: '',
                  data: actualData,
                  borderWidth: 0,
                  borderColor: 'rgba(2, 48, 2, 1)',
                  backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--color_blue')
                }

              ]
            },
            options: {
              responsive: true,
              plugins: {
                color: getComputedStyle(document.documentElement).getPropertyValue('--chart_axis_color'),
                legend: {
                  display: false // No legend
                }
              },
              scales: {
                x: {
                  title: {
                    display: false,
                  },
                  ticks: {
                    color: getComputedStyle(document.documentElement).getPropertyValue('--chart_axis_color')
                  },
                  grid: {
                    color: getComputedStyle(document.documentElement).getPropertyValue('--chart_grid_color')
                  }
                },
                y: {
                  beginAtZero: true,
                  suggestedMax: Math.ceil((Math.max(...targetData) || 1) * 1.1), // target + 10%, rounds up to the next integer
                  title: {
                    display: true,
                    text: this.getTranslation('parts', 'parts'),
                    align: 'end',
                    color: getComputedStyle(document.documentElement).getPropertyValue('--chart_axis_color')
                  },
                  ticks: {
                    color: getComputedStyle(document.documentElement).getPropertyValue('--chart_axis_color')
                  },
                  grid: {
                    color: getComputedStyle(document.documentElement).getPropertyValue('--chart_grid_color')
                  }
                }
              }
            }
          });
        }
      }
    }

    /**
       * @override
       */
    manageError(data) {
      // Reset
      super.manageError(data);
    }

    /**
     * @override
     */
    manageFailure(isTimeout, xhrStatus) {
      if (!isTimeout) {
        if (xhrStatus == '404') {
          this.switchToKey('Error', () => this.displayError(
            'An optional package is maybe not installed'), () => this.removeError());
          return;
        }
      }

      super.manageFailure(isTimeout, xhrStatus);
    }

    // Create hourly labels from range
    _parseDate(rangeString) {
      // Parse the range string: '[2020-05-05T08:00:00.000Z,2020-05-05T16:00:00.000Z)'
      let range;

      // If it's already a Range object
      if (typeof rangeString === 'object' && rangeString.lower && rangeString.upper) {
        range = rangeString;
      } else {
        // Convert string to Range object
        range = pulseRange.createStringRangeFromString(rangeString);
      }

      if (!range || !range.lower || !range.upper) {
        console.error('Invalid range:', rangeString);
        return [];
      }

      // Get start and end dates
      const startDate = new Date(range.lower);
      const endDate = new Date(range.upper);

      // Array to store hourly labels
      const hourlyLabels = [];

      // Create a copy of start date to iterate
      let currentHour = new Date(startDate);

      // Round down to the start of the hour
      currentHour.setMinutes(0, 0, 0);

      // Iterate hour by hour
      while (currentHour < endDate) {
        let nextHour = new Date(currentHour);
        nextHour.setHours(nextHour.getHours() + 1);

        // Don't go past the end date
        if (nextHour > endDate) {
          nextHour = new Date(endDate);
        }

        // Create range string in the format expected by displayRangeLowerTime
        // Format: [2020-05-05T08:00:00Z,2020-05-05T09:00:00Z
        const hourRangeString = '[' + currentHour.toISOString().replace('.000Z', 'Z') +
          ',' + nextHour.toISOString().replace('.000Z', 'Z') + ',)';

        // Use pulseUtility.displayRangeLowerTime to format the hour
        hourlyLabels.push(pulseUtility.displayRangeLowerTime(hourRangeString, false));

        // Move to next hour
        currentHour = nextHour;
      }

      this._hourlyLabels = hourlyLabels;
    }

    // Callback events

    /**
     * Event bus callback triggered when the date/time range changes
     *
     * @param {Object} event
     */
    onDateTimeRangeChange(event) {
      let newRange = event.target.daterange;

      if (newRange.upper == null) { // No empty end
        newRange.upper = Date();
      }

      this._range = newRange;
      this.element.removeAttribute('range'); // In case it is used... for test only

      this._parseDate(newRange);

      //this._resetAllData(); included below
      this._cleanDisplay();

      this.start(); // To try validate again

    }

    /**
      * Event callback in case a config is updated: (re-)start the component
      * 
      * @param {*} event 
      */
    onConfigChange(event) {
      if ((event.target.config == 'machine')
        || (event.target.config == 'group')) {
        // Resize text... in 1 second
        // TODO: not needed?
        setTimeout(this._resize.bind(this), 1000);
      }
    }

    onMachineIdChange(event) {
      this.element.setAttribute('group', event.target.newMachineId);
    }

  }

  pulseComponent.registerElement('x-productiontrackergraph', ProductionTrackerGraphComponent, ['machine-id', 'group', 'period-context', 'range', 'machine-context']);
})();
