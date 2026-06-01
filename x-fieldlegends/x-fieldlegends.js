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
      this.element.replaceChildren();

      // Create DOM - Content
      this._content = document.createElement('div');
      this._content.className = 'fieldlegends';
      this.element.appendChild(this._content);

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
      this.element.replaceChildren();

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
      this._content.style.display = 'none';
      // Note that you can use the CSS class .pulse-component-error or .pulse-component-warning instead
    }

    removeError () {
      this._content.style.display = '';
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
      this._content.replaceChildren();

      for (let iField = 0; iField < data.Items.length; iField++) {
        let item = data.Items[iField];

        let titleSpan = document.createElement('span');
        titleSpan.innerHTML = item.Field.Display;
        let divTitle = document.createElement('div');
        divTitle.className = 'pulse-legend-title';
        divTitle.appendChild(titleSpan);
        let divElements = document.createElement('div');
        divElements.className = 'pulse-legend-elements';
        let divOneLegend = document.createElement('div');
        divOneLegend.className = 'pulse-legend-onelegend';
        divOneLegend.appendChild(divTitle);
        divOneLegend.appendChild(divElements);

        for (let iLegend = 0; iLegend < item.Legends.length; iLegend++) {
          let legend = item.Legends[iLegend];
          let divIcon = document.createElement('div');
          divIcon.className = 'pulse-legend-icon';
          let svg = pulseSvg.createColoredLegend(legend.Color);
          if (svg != null) {
            svg.setAttribute('class', 'fieldlegends-icon');
            divIcon.appendChild(svg);
          }

          let span = document.createElement('span');
          span.innerHTML = legend.Display;
          let divLabel = document.createElement('div');
          divLabel.className = 'pulse-legend-label';
          divLabel.appendChild(span);

          let divElement = document.createElement('div');
          divElement.className = 'pulse-legend-element';
          divElement.appendChild(divIcon);
          divElement.appendChild(divLabel);

          divElements.appendChild(divElement);
        }
        for (let i = 0; i < 4; i++) {
          let divElement = document.createElement('div');
          divElement.className = 'pulse-legend-empty-element-to-align';
          divElements.appendChild(divElement);
        }

        this._content.appendChild(divOneLegend);

        // Hack for resize legend
        document.querySelector('.legend-content')?.dispatchEvent(new Event('resize'));
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
