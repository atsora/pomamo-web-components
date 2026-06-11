// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-productiontrackertable
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */
import * as pulseComponent from 'pulsecomponent';
import * as pulseUtility from 'pulseUtility';
import * as pulseRange from 'pulseRange';
import * as eventBus from 'eventBus';

(function () {

  /**
   * `<x-productiontrackertable>` — tabular summary of actual vs. goal
   * production over a date range, hourly buckets.
   *
   * Polls `ProductionTracker?GroupId=<group>&Range=<range>` and bins the
   * response into `_hourlyData` (`Map<range, { actual, target, isStatic }>`).
   * Renders one row per bucket with the actual and target counts. Reacts
   * to `dateTimeRangeChangeEvent` on `period-context` and to
   * `machineIdChangeSignal` on `machine-context` (updates `machine-id`).
   *
   * @element x-productiontrackertable
   * @attr {string} group           group id
   * @attr {number} machine-id      machine id
   * @attr {string} range           ISO datetime range `begin;end`
   * @attr {string} period-context  event-bus context for `dateTimeRangeChangeEvent`
   * @attr {string} machine-context event-bus context for `machineIdChangeSignal`
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
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
      this.element.replaceChildren();

      // Create DOM - Content
      this._content = document.createElement('div');
      this._content.classList.add('productiontrackertable-content');

      // Create DOM - Loader
      let loader = document.createElement('div');
      loader.classList.add('pulse-loader');
      loader.innerHTML = this.getTranslation('loadingDots', ' Loading...');
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
      this.element.replaceChildren();
      this._table = undefined;
      this._messageSpan = undefined;
      this._content = undefined;

      if (this._resizeObserver) {
        this._resizeObserver.disconnect();
        this._resizeObserver = undefined;
      }

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
        this.setError(this.getTranslation('error.missingRange', 'Missing range'));
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
        this.setError(this.getTranslation('error.emptyRange', 'Empty range'));
        return;
      }

      this.switchToNextContext();
    }

    displayError (message) {
      this._messageSpan.innerHTML = message;

      if (this._table) {
        this._table.remove();
      }
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
      this._messageSpan.innerHTML = '';
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
      this._content.replaceChildren();
      this._table = undefined;

      this._resetAllData();
    }

    /**
     * SVG-like ratio scaling: measure the table's natural dimensions at a reference font (16px),
     * compute the scale factor that makes it fit the wrapper, then apply the scaled font.
     *
     * Modes:
     * - 'contain' (default, attribute `fit-mode` absent or 'contain'): aspect-fit (preserveAspectRatio="meet").
     *   The most limiting of width or height drives the scale; the other dimension may have empty space.
     * - 'scroll-y' (attribute `fit-mode="scroll-y"`): scale by width only. Height may overflow → vertical scroll
     *   inside `.productiontrackertable-content` (overflow: auto).
     *
     * Width: requires the table to have a stable natural ratio. With `white-space: nowrap` on cells
     * (set in component LESS) and content-sized columns, the natural ratio is stable across font sizes.
     */
    _resize () {
      if (!this._table) return;
      const wrapperH = this.element.clientHeight;
      const wrapperW = this.element.clientWidth;
      if (wrapperH === 0 || wrapperW === 0) return;

      const BASE = 16;
      // Auto-detect mode: 'contain' inside .appcontext-live (cell is height-bounded),
      // else 'scroll-y' (page mode: scale by width, height grows; outer 60vh cap triggers scroll).
      // Explicit `fit-mode` attribute still wins.
      const fitModeAttr = this.element.getAttribute('fit-mode');
      const fitMode = fitModeAttr || (this.element.closest('.appcontext-live') ? 'contain' : 'scroll-y');

      // Pass 1: measure at reference font, apply initial scale with safety margin.
      this._table.style.fontSize = BASE + 'px';
      const natW = this._table.scrollWidth;
      const natH = this._table.scrollHeight;
      if (natW === 0 || natH === 0) return;

      const scale1 = fitMode === 'scroll-y'
        ? wrapperW / natW
        : Math.min(wrapperW / natW, wrapperH / natH);
      let font = Math.max(5, Math.min(BASE * 1.9, BASE * scale1 * 0.95));
      this._table.style.fontSize = font + 'px';

      // Pass 2: verify the rendered grid actually fits. If it still overflows, tighten.
      // Subtract 1px from wrapper dimensions to absorb subpixel rounding (scrollWidth/Height return integers).
      if (fitMode !== 'scroll-y') {
        const realW = this._table.scrollWidth;
        const realH = this._table.scrollHeight;
        if (realW > 0 && realH > 0) {
          const overflowScale = Math.min((wrapperW - 1) / realW, (wrapperH - 1) / realH);
          if (overflowScale < 1) {
            font = Math.max(5, font * overflowScale);
            this._table.style.fontSize = font + 'px';
          }
        }
      }
    }

    /**
     * Observe the wrapper dimensions so the table re-scales on layout changes
     * (subgroup count change, viewport resize, etc).
     */
    _ensureResizeObserver () {
      if (this._resizeObserver) return;
      if (typeof ResizeObserver === 'undefined') return;
      this._resizeObserver = new ResizeObserver(() => {
        // Defer to next frame to avoid loops with our own font-size mutation.
        if (this._resizePending) return;
        this._resizePending = true;
        requestAnimationFrame(() => {
          this._resizePending = false;
          this._resize();
        });
      });
      this._resizeObserver.observe(this.element);
    }

    _draw () {
      if ((this._content == undefined) || (this._content == null)) {
        return;
      }

      if (this._data) {
        let showreservecapacity = this.getConfigOrAttribute('showreservecapacity', false);

        if ((this._table == undefined) || (this._table == null)) {
          // FIRST Time = create table and fill data
          this._table = document.createElement('div');
          this._table.className = 'productiontrackertable-table';
          this._content.appendChild(this._table);

          // Resize text
          //this._resize();

          // Header 1 - hourly / summary
          let text = document.createElement('div');
          text.className = 'text-position';
          text.innerHTML = this.getTranslation('hourly', 'hourly');
          let hourly = document.createElement('div');
          hourly.className = 'header header-hourly';
          hourly.appendChild(text);

          text = document.createElement('div');
          text.className = 'text-position';
          text.innerHTML = this.getTranslation('cumulative', 'cumulative');
          let summary = document.createElement('div');
          summary.className = 'header header-summary';
          summary.appendChild(text);
          this._table.appendChild(hourly);
          this._table.appendChild(summary);

          if (showreservecapacity == 'true') {
            this._table.classList.add('with-reserve-capacity');

            // Reserve capacity columns headers
            text = document.createElement('div');
            text.className = 'text-position';
            text.innerHTML = this.getTranslation('partsToMachine', 'parts to machine');
            let parts = document.createElement('div');
            parts.className = 'header header-capacity';
            parts.appendChild(text);

            text = document.createElement('div');
            text.className = 'text-position';
            text.innerHTML = this.getTranslation('capacity', 'capacity');
            let capacity = document.createElement('div');
            capacity.className = 'header header-capacity';
            capacity.appendChild(text);

            text = document.createElement('div');
            text.className = 'text-position';
            text.innerHTML = this.getTranslation('reserveCapacity', 'reserve capacity');
            let reserve = document.createElement('div');
            reserve.className = 'header header-capacity';
            reserve.appendChild(text);
            this._table.appendChild(parts);
            this._table.appendChild(capacity);
            this._table.appendChild(reserve);
          }

          // Header 2 - (Actual / Target ) x 2
          text = document.createElement('div');
          text.className = 'text-position';
          text.innerHTML = this.getTranslation('actual', 'actual');
          let hrActual = document.createElement('div');
          hrActual.className = 'header header-hourly-actual';
          hrActual.appendChild(text);

          text = document.createElement('div');
          text.className = 'text-position';
          text.innerHTML = this.getTranslation('target', 'target');
          let hrTarget = document.createElement('div');
          hrTarget.className = 'header header-target-actual';
          hrTarget.appendChild(text);

          text = document.createElement('div');
          text.className = 'text-position';
          text.innerHTML = this.getTranslation('actual', 'actual');
          let sumActual = document.createElement('div');
          sumActual.className = 'header header-summary-actual';
          sumActual.appendChild(text);

          text = document.createElement('div');
          text.className = 'text-position';
          text.innerHTML = this.getTranslation('target', 'target');
          let sumTarget = document.createElement('div');
          sumTarget.className = 'header header-summary-target';
          sumTarget.appendChild(text);
          this._table.appendChild(hrActual);
          this._table.appendChild(hrTarget);
          this._table.appendChild(sumActual);
          this._table.appendChild(sumTarget);

          if (showreservecapacity == 'true') {
            // Reserve capacity columns values at start in headers
            let parts = document.createElement('div');
            parts.className = 'text-position';
            this._globalTarget = this._data.GlobalTarget;
            parts.innerHTML = Math.round(this._globalTarget);
            let hrParts = document.createElement('div');
            hrParts.className = 'header header-capacity-value';
            hrParts.appendChild(parts);

            let capa = document.createElement('div');
            capa.className = 'text-position';
            this._globalCapacity = this._data.ProductionCapacity;
            capa.innerHTML = Math.round(this._globalCapacity);
            let hrCapa = document.createElement('div');
            hrCapa.className = 'header header-capacity-value';
            hrCapa.appendChild(capa);

            let reserve = document.createElement('div');
            reserve.className = 'text-position';
            reserve.innerHTML = Math.round(this._globalCapacity - this._globalTarget);
            let hrReserve = document.createElement('div');
            hrReserve.className = 'header header-capacity-value';
            hrReserve.appendChild(reserve);
            this._table.appendChild(hrCapa);
            this._table.appendChild(hrParts);
            this._table.appendChild(hrReserve);
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
        let thresholdredproduction = this.getConfigOrAttribute('thresholdredproduction', 60);
        let thresholdtargetproduction = this.getConfigOrAttribute('thresholdtargetproduction', 80);

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
          let hourlyActualForThisRange = this._table.querySelector('.hourly-actual[range="' + isoRange + '"]');

          if (!hourlyActualForThisRange) {
            // Not defined = create rows
            // Create DOM
            let text = document.createElement('div');
            text.className = 'text-range';
            text.innerHTML = pulseUtility.displayDateRange(isoRange, false);
            let rangeHeader = document.createElement('div');
            rangeHeader.className = 'header-range header';
            rangeHeader.setAttribute('range', isoRange);
            rangeHeader.appendChild(text);
            let hActual = document.createElement('div');
            hActual.className = 'hourly-actual';
            hActual.setAttribute('range', isoRange);
            let hTarget = document.createElement('div');
            hTarget.className = 'hourly-target';
            hTarget.setAttribute('range', isoRange);
            let sActual = document.createElement('div');
            sActual.className = 'summary-actual';
            sActual.setAttribute('range', isoRange);
            let sTarget = document.createElement('div');
            sTarget.className = 'summary-target';
            sTarget.setAttribute('range', isoRange);
            this._table.appendChild(rangeHeader);
            this._table.appendChild(hActual);
            this._table.appendChild(hTarget);
            this._table.appendChild(sActual);
            this._table.appendChild(sTarget);

            // Fill data in DOM - rounded
            text = document.createElement('div');
            text.className = 'text-position';
            text.innerHTML = Math.round(actual);
            hActual.appendChild(text);
            text = document.createElement('div');
            text.className = 'text-position';
            text.innerHTML = Math.round(target);
            hTarget.appendChild(text);
            text = document.createElement('div');
            text.className = 'text-position';
            text.innerHTML = Math.round(cumulActual);
            sActual.appendChild(text);
            text = document.createElement('div');
            text.className = 'text-position';
            text.innerHTML = Math.round(cumulTarget);
            sTarget.appendChild(text);

            // Add color when needed
            // color : actual / target
            if (!pulseUtility.isNotDefined(target) && target > 0) {
              let ratio = actual / target;
              if (ratio < thresholdredproduction / 100) {
                hActual.classList.add('bad-efficiency');
              }
              else {
                if (ratio < thresholdtargetproduction / 100) {
                  hActual.classList.add('mid-efficiency');
                }
                else {
                  hActual.classList.add('good-efficiency');
                }
              }
            }
            // color : cumulActual / cumulTarget
            if (!pulseUtility.isNotDefined(cumulTarget) && target > 0) {
              let ratio = cumulActual / cumulTarget;
              if (ratio < thresholdredproduction / 100) {
                sActual.classList.add('bad-efficiency');
              }
              else {
                if (ratio < thresholdtargetproduction / 100) {
                  sActual.classList.add('mid-efficiency');
                }
                else {
                  sActual.classList.add('good-efficiency');
                }
              }
            }

            if (showreservecapacity == 'true') {
              let partsDiv = document.createElement('div');
              partsDiv.className = 'remaining-parts';
              partsDiv.setAttribute('range', isoRange);
              let capacityDiv = document.createElement('div');
              capacityDiv.className = 'remaining-capacity';
              capacityDiv.setAttribute('range', isoRange);
              let reserveDiv = document.createElement('div');
              reserveDiv.className = 'reserve-capacity';
              reserveDiv.setAttribute('range', isoRange);
              this._table.appendChild(partsDiv);
              this._table.appendChild(capacityDiv);
              this._table.appendChild(reserveDiv);

              text = document.createElement('div');
              text.className = 'text-position';
              text.innerHTML = Math.round(remainingParts);
              partsDiv.appendChild(text);
              text = document.createElement('div');
              text.className = 'text-position';
              text.innerHTML = Math.round(remainingCapacity);
              capacityDiv.appendChild(text);
              text = document.createElement('div');
              text.className = 'text-position';
              text.innerHTML = Math.round(reserveCapacity);
              reserveDiv.appendChild(text);
            }
          }
          else {
            // cells are defined, fill them - rounded !!!
            let textPos = hourlyActualForThisRange.querySelector('.text-position');
            if (textPos) textPos.innerHTML = Math.round(actual);

            let hTarget = this._table.querySelector('.hourly-target[range="' + isoRange + '"]');
            if (hTarget) {
              textPos = hTarget.querySelector('.text-position');
              if (textPos) textPos.innerHTML = Math.round(target);
            }

            let sActual = this._table.querySelector('.summary-actual[range="' + isoRange + '"]');
            if (sActual) {
              textPos = sActual.querySelector('.text-position');
              if (textPos) textPos.innerHTML = Math.round(cumulActual);
            }

            let sTarget = this._table.querySelector('.summary-target[range="' + isoRange + '"]');
            if (sTarget) {
              textPos = sTarget.querySelector('.text-position');
              if (textPos) textPos.innerHTML = Math.round(cumulTarget);
            }

            if (showreservecapacity == 'true') {
              let remainingParts = this._table.querySelector('.remaining-parts[range="' + isoRange + '"]');
              if (remainingParts) {
                textPos = remainingParts.querySelector('.text-position');
                if (textPos) textPos.innerHTML = Math.round(remainingParts);
              }
              let remainingCap = this._table.querySelector('.remaining-capacity[range="' + isoRange + '"]');
              if (remainingCap) {
                textPos = remainingCap.querySelector('.text-position');
                if (textPos) textPos.innerHTML = Math.round(remainingCapacity);
              }
              let reserveCap = this._table.querySelector('.reserve-capacity[range="' + isoRange + '"]');
              if (reserveCap) {
                textPos = reserveCap.querySelector('.text-position');
                if (textPos) textPos.innerHTML = Math.round(reserveCapacity);
              }
            }

            // Add color when needed
            hourlyActualForThisRange.classList.remove('bad-efficiency', 'mid-efficiency', 'good-efficiency');
            // color : actual / target
            if (!pulseUtility.isNotDefined(target) && target > 0) {
              let ratio = actual / target;
              if (ratio < thresholdredproduction / 100) {
                hourlyActualForThisRange.classList.add('bad-efficiency');
              }
              else {
                if (ratio < thresholdtargetproduction / 100) {
                  hourlyActualForThisRange.classList.add('mid-efficiency');
                }
                else {
                  hourlyActualForThisRange.classList.add('good-efficiency');
                }
              }
            }
            // color : cumulActual / cumulTarget
            if (!pulseUtility.isNotDefined(cumulTarget) && target > 0) {
              let ratio = cumulActual / cumulTarget;

              let summaryActualForThisRange = this._table.querySelector('.summary-actual[range="' + isoRange + '"]');

              if (ratio < thresholdredproduction / 100) {
                summaryActualForThisRange.classList.add('bad-efficiency');
              }
              else {
                if (ratio < thresholdtargetproduction / 100) {
                  summaryActualForThisRange.classList.add('mid-efficiency');
                }
                else {
                  summaryActualForThisRange.classList.add('good-efficiency');
                }
              }
            }

          }
        } // end for

        // Resize text according to wrapper dimensions (SVG-like aspect-ratio fit)
        this._resize();
        this._ensureResizeObserver();

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
        || (event.target.config == 'thresholdtargetproduction')) {

        if (this._table == undefined) {
          return;
        }
        // Prepare color limits
        let thresholdredproduction = this.getConfigOrAttribute('thresholdredproduction', 60);
        let thresholdtargetproduction = this.getConfigOrAttribute('thresholdtargetproduction', 80);

        // Remove colors
        let hourlyActuals = this._table.querySelectorAll('.hourly-actual');
        let summaryActuals = this._table.querySelectorAll('.summary-actual');
        hourlyActuals.forEach(el => el.classList.remove('bad-efficiency', 'mid-efficiency', 'good-efficiency'));
        summaryActuals.forEach(el => el.classList.remove('bad-efficiency', 'mid-efficiency', 'good-efficiency'));

        // Add colors when needed
        for (let iAct = 0; iAct < hourlyActuals.length; iAct++) {
          // Get range
          let isoRange = hourlyActuals[iAct].getAttribute('range');
          // Find actual / target div
          let hourlyTargetForThisRange = this._table.querySelector('.hourly-target[range="' + isoRange + '"]');
          let summaryActualForThisRange = this._table.querySelector('.summary-actual[range="' + isoRange + '"]');
          let summaryTargetForThisRange = this._table.querySelector('.summary-target[range="' + isoRange + '"]');

          // Find actual / target values
          let actualEl = hourlyActuals[iAct].querySelector('.text-position');
          let actual = actualEl ? actualEl.innerText : 0;
          let targetEl = hourlyTargetForThisRange ? hourlyTargetForThisRange.querySelector('.text-position') : null;
          let target = targetEl ? targetEl.innerText : 0;
          let cumulActualEl = summaryActualForThisRange ? summaryActualForThisRange.querySelector('.text-position') : null;
          let cumulActual = cumulActualEl ? cumulActualEl.innerText : 0;
          let cumulTargetEl = summaryTargetForThisRange ? summaryTargetForThisRange.querySelector('.text-position') : null;
          let cumulTarget = cumulTargetEl ? cumulTargetEl.innerText : 0;

          // Add colors
          // color : actual / target
          if (!pulseUtility.isNotDefined(target) && target > 0) {
            let ratio = actual / target;
            if (ratio < thresholdredproduction / 100) {
              hourlyActuals[iAct].classList.add('bad-efficiency');
            }
            else {
              if (ratio < thresholdtargetproduction / 100) {
                hourlyActuals[iAct].classList.add('mid-efficiency');
              }
              else {
                hourlyActuals[iAct].classList.add('good-efficiency');
              }
            }
          }
          // color : cumulActual / cumulTarget
          if (!pulseUtility.isNotDefined(cumulTarget) && target > 0) {
            let ratio = cumulActual / cumulTarget;

            let summaryActualForThisRange = this._table.querySelector('.summary-actual[range="' + isoRange + '"]');

            if (ratio < thresholdredproduction / 100) {
              summaryActualForThisRange.classList.add('bad-efficiency');
            }
            else {
              if (ratio < thresholdtargetproduction / 100) {
                summaryActualForThisRange.classList.add('mid-efficiency');
              }
              else {
                summaryActualForThisRange.classList.add('good-efficiency');
              }
            }
          }
        }
      }
    }

  }

  pulseComponent.registerElement('x-productiontrackertable', ProductionTrackerTableComponent, ['machine-id', 'range', 'group', 'period-context']);
})();
