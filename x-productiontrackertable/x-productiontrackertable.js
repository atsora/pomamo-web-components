// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-productiontrackertable
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseRange = require('pulseRange');
var eventBus = require('eventBus');

(function () {
  class ProductionTrackerTableComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      // DOM -> never in contructor
      self._table = undefined;
      self._messageSpan = undefined;
      self._content = undefined;

      // Map [range] = {actual=x, target=y, isStatic}
      // How to use map : https://www.zendevs.xyz/les-nouveaux-objets-set-et-map-en-javascript-es6/
      self._hourlyData = new Map();
      self._resetAllData();

      return self;
    }

    //get content () { return this._content; } // Optional

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id': // Avoid, should use group
        case 'group':
          // Check 'textchange-context'
          if (this.isInitialized()) {
            this.start();
          } break;
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
        // FOR TESTS ONLY
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
      this.addClass('pulse-piegauge');

      // Update here some internal parameters
      // FOR TESTS ONLY
      if (this.element.hasAttribute('range')) {
        if (this._range == undefined) {
          let newRange = pulseRange.createStringRangeFromString(
            this.element.getAttribute('range'));
          this._range = newRange;
        }
      }

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>').addClass('productiontrackertable-content');

      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html(this.getTranslation('loadingDots', ' Loading...')).css('display', 'none');
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

      // Listeners
      if (this.element.hasAttribute('period-context')) {
        eventBus.EventBus.addEventListener(this, 'dateTimeRangeChangeEvent',
          this.element.getAttribute('period-context'),
          this.onDateTimeRangeChange.bind(this), this);
      }
      else {
        eventBus.EventBus.addGlobalEventListener(this,
          'dateTimeRangeChangeEvent',
          this.onDateTimeRangeChange.bind(this));
      }

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      $(this.element).empty();
      this._table = undefined;
      this._messageSpan = undefined;
      this._content = undefined;

      this._resetAllData();

      super.clearInitialization();
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters () {
      //let group = this.getConfigOrAttribute('group');
      //if ((pulseUtility.isNotDefined(group)) || (group == '')) { }

      // Check the range is valid
      if (this._range == undefined) {
        console.log('waiting attribute range in ProductionTrackerTable.element');

        // FOR TESTS ONLY
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
      $(this._messageSpan).html(message);

      $(this._table).remove();
      this._table = undefined;

      this._resetAllData();
    }

    _resetAllData () {
      this._data = undefined;
      this._hourlyData.clear();
      this._rangeToReturn = undefined;

      // Clean storage
      this._staticCumulActual = 0;
      this._staticCumulTarget = 0;
      this._staticCumulProductionCapacity = 0;
    }

    removeError () {
      $(this._messageSpan).html('');
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
      let showreservecapacity = this.getConfigOrAttribute('showreservecapacity', false);
      if (showreservecapacity == 'true') {
        url += '&ProductionCapacity=true&GlobalTarget=true';
      }
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
      //$(this._table).show();

      this._draw();
    }

    _cleanDisplay () {
      $(this._content).empty();
      this._table = undefined;

      this._resetAllData();
    }

    _resize () {
      if (this._table != undefined) {
        // Height
        let parentHeight = $(this.element).parent().height();
        let hourlyActuals = $(this._table).find('.hourly-actual');
        let nbRows = hourlyActuals.length + 3; // header = +/- 3 rows
        let lineH = 35;
        let coeffHeight = 1;
        if (parentHeight < nbRows * lineH) {
          coeffHeight = parentHeight / (nbRows * lineH);
        }

        // width
        let parentWidth = $(this.element).parent().width();
        let vw = $('body').width();
        let tmpVM;
        let showreservecapacity = this.getConfigOrAttribute('showreservecapacity', false);
        if (showreservecapacity == 'true') {
          tmpVM = Math.round(10000 * coeffHeight * 1.5 * parentWidth / vw)
            / 10000;
        }
        else {
          tmpVM = Math.round(10000 * coeffHeight * 2 * parentWidth / vw)
            / 10000;
        }
        let tmpREM = Math.round(10000 * coeffHeight * 0.2500) / 10000;  // default = 0.2500
        this._table.css('font-size', 'clamp(0.5rem, ' + tmpREM + 'rem + '
          + tmpVM + 'vw, 1.9rem)');
      }
    }

    _draw () {
      if ((this._content == undefined) || (this._content == null)) {
        return;
      }

      if (this._data) {
        let showreservecapacity = this.getConfigOrAttribute('showreservecapacity', false);

        if ((this._table == undefined) || (this._table == null)) {
          // FIRST Time = create table and fill data
          this._table = $('<div></div>').addClass('productiontrackertable-table');
          this._content.append(this._table);

          // Resize text
          //this._resize();

          // Header 1 - hourly / summary
          let text = $('<div></div>').addClass('text-position').html('hourly');
          let hourly = $('<div></div>').addClass('header').addClass('header-hourly')
            .append(text);

          text = $('<div></div>').addClass('text-position').html('cumulative');
          let summary = $('<div></div>').addClass('header').addClass('header-summary')
            .append(text);
          this._table.append(hourly).append(summary);

          if (showreservecapacity == 'true') {
            this._table.addClass('with-reserve-capacity');

            // Reserve capacity columns headers
            text = $('<div></div>').addClass('text-position').html('parts to machine'); // Remaining parts to machine
            let parts = $('<div></div>').addClass('header').addClass('header-capacity')
              .append(text);

            text = $('<div></div>').addClass('text-position').html('capacity'); // Remaining capacity
            let capacity = $('<div></div>').addClass('header').addClass('header-capacity')
              .append(text);

            text = $('<div></div>').addClass('text-position').html('reserve capacity');
            let reserve = $('<div></div>').addClass('header').addClass('header-capacity')
              .append(text);
            this._table.append(parts).append(capacity).append(reserve);
          }

          // Header 2 - (Actual / Target ) x 2
          text = $('<div></div>').addClass('text-position')
            .html(this.getTranslation('actual', 'actual'));
          let hrActual = $('<div></div>').addClass('header')
            .addClass('header-hourly-actual')
            .append(text);

          text = $('<div></div>').addClass('text-position')
            .html(this.getTranslation('target', 'target'));
          let hrTarget = $('<div></div>').addClass('header')
            .addClass('header-target-actual')
            .append(text);

          text = $('<div></div>').addClass('text-position')
            .html(this.getTranslation('actual', 'actual'));
          let sumActual = $('<div></div>').addClass('header')
            .addClass('header-summary-actual')
            .append(text);

          text = $('<div></div>').addClass('text-position')
            .html(this.getTranslation('target', 'target'));
          let sumTarget = $('<div></div>').addClass('header')
            .addClass('header-summary-target')
            .append(text);
          this._table.append(hrActual).append(hrTarget)
            .append(sumActual).append(sumTarget);

          if (showreservecapacity == 'true') {
            // Reserve capacity columns values at start in headers
            let parts = $('<div></div>').addClass('text-position');
            this._globalTarget = this._data.GlobalTarget;
            parts.html(Math.round(this._globalTarget));
            let hrParts = $('<div></div>').addClass('header')
              .addClass('header-capacity-value')
              .append(parts);

            let capa = $('<div></div>').addClass('text-position');
            this._globalCapacity = this._data.ProductionCapacity;
            capa.html(Math.round(this._globalCapacity));
            let hrCapa = $('<div></div>').addClass('header')
              .addClass('header-capacity-value')
              .append(capa);

            let reserve = $('<div></div>').addClass('text-position');
            reserve.html(Math.round(this._globalCapacity - this._globalTarget));
            let hrReserve = $('<div></div>').addClass('header')
              .addClass('header-capacity-value')
              .append(reserve);
            this._table.append(hrCapa).append(hrParts).append(hrReserve);
          }

          // Clean storage
          this._staticCumulActual = 0;
          this._staticCumulTarget = 0;
          this._staticCumulProductionCapacity = 0;
        }

        let cumulActual = this._staticCumulActual;
        let cumulTarget = this._staticCumulTarget;
        let cumulProductionCapacity = this._staticCumulProductionCapacity;

        // Prepare colors
        let thresholdunitispart = this.getConfigOrAttribute('thresholdunitispart', 'true');
        let thresholdredproduction = this.getConfigOrAttribute('thresholdredproduction', 0);
        let thresholdorangeproduction = this.getConfigOrAttribute('thresholdorangeproduction', 0);

        // Add  or change rows
        for (let i = 0; i < this._data.HourlyData.length; i++) {
          // Read Data
          let actual = this._data.HourlyData[i].Actual;
          let target = this._data.HourlyData[i].Target;
          let isoRange = this._data.HourlyData[i].Range;
          let isStatic = this._data.HourlyData[i].Static;
          //let rangeAsString = range.toString(d => d.toISOString());

          let productionCapacity = this._data.HourlyData[i].ProductionCapacity;

          // Store
          this._hourlyData.set(isoRange, {
            actual: actual,
            target: target,
            isStatic: isStatic,
            productionCapacity: productionCapacity
          });

          // Caculate totals
          cumulActual += actual;
          cumulTarget += target;
          cumulProductionCapacity += productionCapacity;
          if (isStatic) {
            this._staticCumulActual += actual;
            this._staticCumulTarget += target;
            this._staticCumulProductionCapacity += productionCapacity;
          }

          let remainingParts = this._globalTarget - cumulActual;
          let remainingCapacity = this._globalCapacity - cumulProductionCapacity;
          let reserveCapacity = remainingCapacity - remainingParts;

          // Update DOM
          let hourlyActualForThisRange = $(this._table).find('.hourly-actual[range="' + isoRange + '"]'); // " is mandatory because of range format

          if (hourlyActualForThisRange.length == 0) {
            // Not defined = create rows
            // Create DOM
            let text = $('<div></div>').addClass('text-range').html(pulseUtility.displayDateRange(isoRange, false));
            let rangeHeader = $('<div></div>').addClass('header-range').addClass('header')
              .attr('range', isoRange)
              .append(text);
            let hActual = $('<div></div>').addClass('hourly-actual')
              .attr('range', isoRange);
            let hTarget = $('<div></div>').addClass('hourly-target')
              .attr('range', isoRange);
            let sActual = $('<div></div>').addClass('summary-actual')
              .attr('range', isoRange);
            let sTarget = $('<div></div>').addClass('summary-target')
              .attr('range', isoRange);
            this._table.append(rangeHeader).append(hActual).append(hTarget)
              .append(sActual).append(sTarget);

            // Fill data in DOM - rounded
            text = $('<div></div>').addClass('text-position').html(Math.round(actual));
            hActual.append(text);
            text = $('<div></div>').addClass('text-position').html(Math.round(target));
            hTarget.append(text);
            text = $('<div></div>').addClass('text-position').html(Math.round(cumulActual));
            sActual.append(text);
            text = $('<div></div>').addClass('text-position').html(Math.round(cumulTarget));
            sTarget.append(text);

            // Add color when needed
            // color : actual / target
            if (!pulseUtility.isNotDefined(target) && target > 0) {
              let diff = target - actual;
              let multiplier = (thresholdunitispart == 'true') ? 1 : (100.0 / target);
              if ((diff * multiplier) > thresholdredproduction) {
                $(hActual).addClass('bad-efficiency');
              }
              else {
                if ((diff * multiplier) > thresholdorangeproduction) {
                  $(hActual).addClass('mid-efficiency');
                }
                else {
                  $(hActual).addClass('good-efficiency');
                }
              }
            }
            // color : cumulActual / cumulTarget
            if (!pulseUtility.isNotDefined(cumulTarget) && target > 0) {
              let diff = cumulTarget - cumulActual;
              let multiplier = (thresholdunitispart == 'true') ? 1 : (100.0 / cumulTarget);
              if ((diff * multiplier) > thresholdredproduction) {
                $(sActual).addClass('bad-efficiency');
              }
              else {
                if ((diff * multiplier) > thresholdorangeproduction) {
                  $(sActual).addClass('mid-efficiency');
                }
                else {
                  $(sActual).addClass('good-efficiency');
                }
              }
            }

            if (showreservecapacity == 'true') {
              let partsDiv = $('<div></div>').addClass('remaining-parts')
                .attr('range', isoRange);
              let capacityDiv = $('<div></div>').addClass('remaining-capacity')
                .attr('range', isoRange);
              let reserveDiv = $('<div></div>').addClass('reserve-capacity')
                .attr('range', isoRange);
              this._table.append(partsDiv).append(capacityDiv).append(reserveDiv);

              text = $('<div></div>').addClass('text-position').html(Math.round(remainingParts));
              partsDiv.append(text);
              text = $('<div></div>').addClass('text-position').html(Math.round(remainingCapacity));
              capacityDiv.append(text);
              text = $('<div></div>').addClass('text-position').html(Math.round(reserveCapacity));
              reserveDiv.append(text);
            }
          }
          else {
            // cells are defined, fill them - rounded !!!
            $(hourlyActualForThisRange).find('.text-position')
              .html(Math.round(actual));
            $(this._table).find('.hourly-target[range="' + isoRange + '"]')
              .find('.text-position')
              .html(Math.round(target));
            $(this._table).find('.summary-actual[range="' + isoRange + '"]')
              .find('.text-position')
              .html(Math.round(cumulActual));
            $(this._table).find('.summary-target[range="' + isoRange + '"]')
              .find('.text-position')
              .html(Math.round(cumulTarget));

            if (showreservecapacity == 'true') {
              $(this._table).find('.remaining-parts[range="' + isoRange + '"]')
                .find('.text-position')
                .html(Math.round(remainingParts));
              $(this._table).find('.remaining-capacity[range="' + isoRange + '"]')
                .find('.text-position')
                .html(Math.round(remainingCapacity));
              $(this._table).find('.reserve-capacity[range="' + isoRange + '"]')
                .find('.text-position')
                .html(Math.round(reserveCapacity));
            }

            // Add color when needed
            $(hourlyActualForThisRange).removeClass('bad-efficiency')
              .removeClass('mid-efficiency').removeClass('good-efficiency');
            // color : actual / target
            if (!pulseUtility.isNotDefined(target) && target > 0) {
              let diff = target - actual;
              let multiplier = (thresholdunitispart == 'true') ? 1 : (100.0 / target);
              if ((diff * multiplier) > thresholdredproduction) {
                $(hourlyActualForThisRange).addClass('bad-efficiency');
              }
              else {
                if ((diff * multiplier) > thresholdorangeproduction) {
                  $(hourlyActualForThisRange).addClass('mid-efficiency');
                }
                else {
                  $(hourlyActualForThisRange).addClass('good-efficiency');
                }
              }
            }
            // color : cumulActual / cumulTarget
            if (!pulseUtility.isNotDefined(cumulTarget) && target > 0) {
              let diff = cumulTarget - cumulActual;
              let multiplier = (thresholdunitispart == 'true') ? 1 : (100.0 / cumulTarget);

              let summaryActualForThisRange = $(this._table).find('.summary-actual[range="' + isoRange + '"]');

              if ((diff * multiplier) > thresholdredproduction) {
                $(summaryActualForThisRange).addClass('bad-efficiency');
              }
              else {
                if ((diff * multiplier) > thresholdorangeproduction) {
                  $(summaryActualForThisRange).addClass('mid-efficiency');
                }
                else {
                  $(summaryActualForThisRange).addClass('good-efficiency');
                }
              }
            }

          }
        } // end for

        // Resize text according to parent size AND nb of displayed lines
        this._resize();

      } // end if (this._data)
    } // end _draw

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
        setTimeout(this._resize.bind(this), 1000);
      }
      if (event.target.config == 'showreservecapacity') {
        //this._resetAllData(); included below
        this._cleanDisplay();
        this.start();
      }
      if ((event.target.config == 'thresholdunitispart')
        || (event.target.config == 'thresholdredproduction')
        || (event.target.config == 'thresholdorangeproduction')) {

        if (this._table == undefined) {
          return;
        }
        // Prepare color limits
        let thresholdunitispart = this.getConfigOrAttribute('thresholdunitispart', 'true');
        let thresholdredproduction = this.getConfigOrAttribute('thresholdredproduction', 0);
        let thresholdorangeproduction = this.getConfigOrAttribute('thresholdorangeproduction', 0);

        // Remove colors
        let hourlyActuals = $(this._table).find('.hourly-actual');
        let summaryActuals = $(this._table).find('.summary-actual');
        hourlyActuals.removeClass('bad-efficiency')
          .removeClass('mid-efficiency').removeClass('good-efficiency');
        summaryActuals.removeClass('bad-efficiency')
          .removeClass('mid-efficiency').removeClass('good-efficiency');

        // Add colors when needed
        for (let iAct = 0; iAct < hourlyActuals.length; iAct++) {
          // Get range
          let isoRange = hourlyActuals[iAct].getAttribute('range');
          // Find actual / target div
          let hourlyTargetForThisRange = $(this._table).find('.hourly-target[range="' + isoRange + '"]');
          let summaryActualForThisRange = $(this._table).find('.summary-actual[range="' + isoRange + '"]');
          let summaryTargetForThisRange = $(this._table).find('.summary-target[range="' + isoRange + '"]');

          // Find actual / target values
          let actual = $(hourlyActuals[iAct]).find('.text-position')[0].innerText;
          let target = $(hourlyTargetForThisRange).find('.text-position')[0].innerText;
          let cumulActual = $(summaryActualForThisRange).find('.text-position')[0].innerText;
          let cumulTarget = $(summaryTargetForThisRange).find('.text-position')[0].innerText;

          // Add colors
          // color : actual / target
          if (!pulseUtility.isNotDefined(target) && target > 0) {
            let diff = target - actual;
            let multiplier = (thresholdunitispart == 'true') ? 1 : (100.0 / target);
            if ((diff * multiplier) > thresholdredproduction) {
              $(hourlyActuals[iAct]).addClass('bad-efficiency');
            }
            else {
              if ((diff * multiplier) > thresholdorangeproduction) {
                $(hourlyActuals[iAct]).addClass('mid-efficiency');
              }
              else {
                $(hourlyActuals[iAct]).addClass('good-efficiency');
              }
            }
          }
          // color : cumulActual / cumulTarget
          if (!pulseUtility.isNotDefined(cumulTarget) && target > 0) {
            let diff = cumulTarget - cumulActual;
            let multiplier = (thresholdunitispart == 'true') ? 1 : (100.0 / cumulTarget);

            let summaryActualForThisRange = $(this._table).find('.summary-actual[range="' + isoRange + '"]');

            if ((diff * multiplier) > thresholdredproduction) {
              $(summaryActualForThisRange).addClass('bad-efficiency');
            }
            else {
              if ((diff * multiplier) > thresholdorangeproduction) {
                $(summaryActualForThisRange).addClass('mid-efficiency');
              }
              else {
                $(summaryActualForThisRange).addClass('good-efficiency');
              }
            }
          }
        }
      }
    }

  }

  pulseComponent.registerElement('x-productiontrackertable', ProductionTrackerTableComponent, ['machine-id', 'group', 'period-context']);
})();
