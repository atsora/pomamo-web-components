// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-fieldlegends
 * @requires module:pulseComponent
 */

var pulseUtility = require('pulseUtility');
var pulseComponent = require('pulsecomponent');
var pulseSvg = require('pulseSvg');
var eventBus = require('eventBus');

(function () {

  /**
   * `<x-fieldlegends>` — legend panel for CNC value fields covering one or
   * more machines.
   *
   * Fetches `CncValueLegend/Get?MachineIds=<ids>` (prefers `machine-ids` over
   * `machine-id`) and renders one group per returned field — a field title
   * plus a colored square SVG (built via `pulseSvg.createColoredLegend`) and
   * label per legend entry, followed by 4 filler divs for flex alignment.
   * Listens to `machineListChanged` globally to refresh `machine-ids`. Always
   * reports `isVisible === true`, and stays silent (no error banner, no AJAX)
   * when no machine is selected.
   *
   * @element x-fieldlegends
   * @attr {number} machine-id  single machine id (used when `machine-ids` is absent)
   * @attr {string} machine-ids comma-separated machine id list (takes priority)
   * @extends pulseComponent.PulseParamAutoPathSingleRequestComponent
   */
  class fieldlegendsComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      // DOM - not here
      self._content = undefined;

      return self;
    }

    get content () {
      return this._content;
    } // Optional

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
          this.start();
          break;
        case 'machine-ids':
          this.start();
          break;
        default:
          break;
      }
    }

    initialize () {
      this.addClass('pulse-text');

      // listeners/dispatchers
      eventBus.EventBus.addGlobalEventListener(this,
        'machineListChanged', this.onMachineListChanged.bind(this));

      // Late-arrival sync: if x-machineselection has already emitted
      // machineListChanged synchronously during its own initialize() (early-emit
      // for the machine config case), x-fieldlegends connecting later in DOM
      // order would miss the event entirely. Pull the resolved list now if ready.
      try {
        let ms = document.querySelector('x-machineselection');
        if (ms && typeof ms.isReady === 'function' && ms.isReady()) {
          let ids = ms.getResolvedMachineIds();
          if (ids && ids.length > 0) {
            this.element.setAttribute('machine-ids', ids.join(','));
          }
        }
      } catch (e) { /* no machineselection on this page */ }

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>').addClass('fieldlegends');
      $(this.element).append(this._content);

      // Create DOM - Loader - probably not in legends... to verify
      /*let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this._content).append(loaderDiv);
      // Create DOM - message for error
      this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this._content).append(messageDiv);*/

      // Listener and dispatchers

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      $(this.element).empty();

      //this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    validateParameters () {
      let machineIds = this.element.getAttribute('machine-ids');
      let machineId = this.element.getAttribute('machine-id');
      if (machineIds && machineIds.trim() !== '') {
        // Success — has a non-empty machine list
        this.switchToNextContext();
        return;
      }
      if (machineId && machineId.trim() !== '') {
        // Success — has a non-empty single machine id
        this.switchToNextContext();
        return;
      }
      // No machine selected: stay silent (no banner, no empty-MachineIds AJAX
      // which the backend rejects) and let the surrounding UI report the lack
      // of selection.
      this.switchToKey('Error', () => this.displayError(''), () => this.removeError());
    }

    displayError (message) {
      $(this._content).hide();
      // Note that you can use the CSS class .pulse-component-error or .pulse-component-warning instead
    }

    removeError () {
      $(this._content).show();
    }

    // Overload to always refresh value
    get isVisible () {
      return true;
    }

    /**
     * REST endpoint: `CncValueLegend/Get?MachineIds=<ids>` (supports single or multi machine).
     *
     * @returns {string} Short URL without base path.
     */
    getShortUrl () {
      if (this.element.hasAttribute('machine-ids') &&
        (!pulseUtility.isNotDefined(this.element.getAttribute('machine-ids')))) {
        return 'CncValueLegend/Get?MachineIds=' + this.element.getAttribute('machine-ids');
      }
      else if (this.element.hasAttribute('machine-id') &&
        (!pulseUtility.isNotDefined(this.element.getAttribute('machine-id')))) {
        return 'CncValueLegend/Get?MachineIds=' + this.element.getAttribute('machine-id');
      }
      return '';
    }

    /**
     * Renders one legend group per item in `data.Items`.
     * Each group: field title + colored square SVGs + labels + 4 filler alignment divs.
     * Triggers `.legend-content` resize after each group.
     *
     * @param {{ Items: Array<{ Field: { Display: string }, Legends: Array<{ Color: string, Display: string }> }> }} data
     */
    refresh (data) {
      $(this._content).empty();

      for (let iField = 0; iField < data.Items.length; iField++) {
        let item = data.Items[iField];

        let titleSpan = $('<span></span>').html(item.Field.Display);
        let divTitle = $('<div></div>').addClass('pulse-legend-title')
          .append(titleSpan);
        let divElements = $('<div></div>').addClass('pulse-legend-elements');
        let divOneLegend = $('<div></div>').addClass('pulse-legend-onelegend')
          .append(divTitle).append(divElements);

        for (let iLegend = 0; iLegend < item.Legends.length; iLegend++) {
          let legend = item.Legends[iLegend];
          let divIcon = $('<div></div>').addClass('pulse-legend-icon');
          let svg = pulseSvg.createColoredLegend(legend.Color);
          if (svg != null) {
            svg.setAttribute('class', 'fieldlegends-icon');
            divIcon.append(svg);
          }

          let span = $('<span></span>').html(legend.Display);
          let divLabel = $('<div></div>').addClass('pulse-legend-label').append(span);

          let divElement = $('<div></div>').addClass('pulse-legend-element');
          divElement.append(divIcon).append(divLabel);

          divElements.append(divElement);
        }
        for (let i = 0; i < 4; i++) {
          let divElement = $('<div></div>').addClass('pulse-legend-empty-element-to-align');
          divElements.append(divElement);
        }

        $(this._content).append(divOneLegend);

        // Hack for resize legend
        $('.legend-content').resize();
      }
    }

    // Callback events

    /**
     * Event bus callback triggered when x-machineselection resolves a new machine list.
     *
     * @param {Object} event
     */
    onMachineListChanged (event) {
      let ids = (event.target && event.target.ids) || event.ids || [];
      this.element.setAttribute('machine-ids', ids.join(','));
    }

  }

  pulseComponent.registerElement('x-fieldlegends', fieldlegendsComponent, ['machine-id', 'machine-ids']);
})();
