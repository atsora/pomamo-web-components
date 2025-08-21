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

      self._content = undefined;
      self._graph = undefined;
      self._messageSpan = undefined;

      // TODO: check...
      // Map [range] = {actual=x, target=y, isStatic}
      // How to use map : https://www.zendevs.xyz/les-nouveaux-objets-set-et-map-en-javascript-es6/
      self._hourlyData = new Map();
      self._resetAllData();

      return self;
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
        case 'group':
          if (this.isInitialized()) {
            this.start();
          } break;
          // TODO: ???
        /* case 'machine-context': -> maybe create a new group-context ?
          eventBus.EventBus.removeEventListenerBySignal(this, 'machineIdChangeSignal');
          eventBus.EventBus.addEventListener(this,
            'machineIdChangeSignal', newVal,
            this.onMachineIdChange.bind(this));
          break;*/
        case 'period-context': {
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'dateTimeRangeChangeEvent');
            eventBus.EventBus.addEventListener(this,
              'dateTimeRangeChangeEvent', newVal,
              this.onDateTimeRangeChange.bind(this));
          }
          this.start();
        } break;
        // for tests
        case 'range': {
          if (this._range == undefined) {
            let newRange = pulseRange.createStringRangeFromString(newVal);
            if (newRange.isValid()) {
              this._range = newRange;
            }
          }
        } break;
        default:
          break;
      }
    }

    initialize () {
      // TODO: class?
      this.addClass('atsora-productiontrackergraph');

      // In case of clone, need to be empty :
      this.element.replaceChildren();

      // Update here some internal parameters
      // For tests
      if (this.element.hasAttribute('range')) {
        if (this._range == undefined) {
          let newRange = pulseRange.createStringRangeFromString(
            this.element.getAttribute('range'));
          this._range = newRange;
        }
      }

      // Create DOM - Content
      this._content = this.document.createElement('div');
      this._content.className = 'productiontrackergraph-content';
      this.element.appendChild(this._content);

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

      this.switchToNextContext();
    }

    clearInitialization () {
      // Parameters

      // DOM
      this.element.replaceChildren();

      this._graph = undefined;
      this._messageSpan = undefined;
      this._content = undefined;

      this._resetAllData();

      super.clearInitialization();
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters () {
      // TODO: check group?
      //let group = this.getConfigOrAttribute('group');
      //if ((pulseUtility.isNotDefined(group)) || (group == '')) { }

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

        if (this.element.hasAttribute('period-context')) {
          eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
            this.element.getAttribute('period-context'));
        }
        else {
          eventBus.EventBus.dispatchToAll('askForDateTimeRangeEvent');
        }
        this.setError('missing range');
        return;
      }

      if (this._range.isEmpty()) {
        console.error('empty range');
        if (this.element.hasAttribute('period-context')) {
          eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
            this.element.getAttribute('period-context'));
        }
        else {
          eventBus.EventBus.dispatchToAll('askForDateTimeRangeEvent');
        }
        this.setError('empty range');
        return;
      }

      this.switchToNextContext();
    }

    displayError (message) {
      if ('' === message) {
        this._content.removeAttribute('error-message');
      }
      else {
        this._content.setAttribute('error-message', message);
      }

      this._messageSpan.innerHTML = message;

      this._graph.replaceChildren();
      this._graph = undefined;

      this._resetAllData();
    }

    _resetAllData () {
      this._data = undefined;

      // TODO: ...
      this._hourlyData.clear();
      this._rangeToReturn = undefined;

      // Clean storage
      this._staticCumulActual = 0;
      this._staticCumulTarget = 0;
    }

    removeError () {
      this._messageSpan.innerHTML = '';
      this._content.removeAttribute('error-message');
    }

    get refreshRate () {
      return 1000 * Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));
    }

    getShortUrl () {
      let url = 'ProductionTracker?';
      if (this.element.hasAttribute('group')) {
        url += 'GroupId='
          + this.element.getAttribute('group') + '&';
      }
      url += 'Range=' + this._getRangeToAsk();
      return url;
    }

    _getRangeToAsk () {
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

    refresh (data) {
      this._data = data;

      this._draw();
    }

    _cleanDisplay () {
      this._content.replaceChildren();
      this._graph = undefined;

      this._resetAllData();
    }

    _resize () {
      if (this._graph != undefined) {
        // TODO: ...neeeded???
        // check x-productiontrackergraph
      }
    }

    _draw () {
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
        for (let i = 0; i < this._data.HourlyData.length; i++) {
          labels.push(pulseUtility.displayRangeLowerTime(
            this._data.HourlyData[i].Range, false));
          actualData.push(this._data.HourlyData[i].Actual);
          targetData.push(this._data.HourlyData[i].Target);
        }
        // TODO: target for the full hour
        // Create chart
        // TODO: max y
        new Chart(this._graph, {
          data: {
            labels: labels,
            datasets: [
              {
                type: 'bar',
                label: '', // No legend
                data: actualData,
                borderWidth: 0, // No border
                borderColor: 'rgba(2, 48, 2, 1)',
                backgroundColor: 'rgba(29, 214, 29, 1)'
              },
              {
                type: 'line',
                label: '', // No legend
                data: targetData,
                borderColor: 'rgba(16, 25, 102, 1)',
                backgroundColor: 'rgba(59, 177, 255, 1)',
                pointStyle: false,
                fill: false
              }
            ]
          },
          options: {
            responsive: true,
            plugins: {
              color: 'rgba(235, 235, 235, 1)',
              legend: {
                display: false // No legend
              }
            },
            scales: {
              x: {
                title: {
                  display: false,
                }
              },
              y: {
                beginAtZero: true,
                // suggesgtedMax: 100, // TODO:
                title: {
                  display: true,
                  text: 'Parts', // TODO: translate
                  align: 'end'
                }
              }
            }
          }
        });
      }
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
        if (xhrStatus == '404') {
          this.switchToKey('Error', () => this.displayError(
            'An optional package is maybe not installed'), () => this.removeError());
          return;
        }
      }

      super.manageFailure(isTimeout, xhrStatus);
    }

    // Callback events

    /**
     * Event bus callback triggered when the date/time range changes
     *
     * @param {Object} event
     */
    onDateTimeRangeChange (event) {
      let newRange = event.target.daterange;
      if (newRange.upper == null) { // No empty end
        newRange.upper = Date();
      }
      if ((this._range == undefined) ||
        (!pulseRange.equals(newRange, this._range, (a, b) => (a >= b) && (a <= b)))) {
        this._range = newRange;
        this.element.removeAttribute('range'); // In case it is used... for test only

        //this._resetAllData(); included below
        this._cleanDisplay();

        this.start(); // To try validate again
      }
    }

    /**
      * Event callback in case a config is updated: (re-)start the component
      * 
      * @param {*} event 
      */
    onConfigChange (event) {
      if ((event.target.config == 'machine')
        || (event.target.config == 'group')) {
        // Resize text... in 1 second
        // TODO: not needed?
        setTimeout(this._resize.bind(this), 1000);
      }
    }

  }

  pulseComponent.registerElement('x-productiontrackergraph', ProductionTrackerGraphComponent, ['machine-id', 'group', 'period-context']);
})();
