// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-stacklight
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 * @requires module:pulseSvg
 */
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseSvg = require('pulseSvg');

//var active_img = './images/mode_active.png';
/*
function hexToRGB(hex)
{
  if ( hex == null ) {
    return { R: 0x00, G: 0x00, B: 0x00 }; // default black
  }
  let long = parseInt(hex.replace(/^#/, ""), 16);
  return {
    R: (long >>> 16) & 0xff,
    G: (long >>> 8) & 0xff,
    B: long & 0xff
  };
}
*/

(function () {

  /**
   * `<x-stacklight>` — SVG stack-light tower for one machine.
   *
   * Polls `CncValue/Current?FieldIds=126&MachineId=<id>` (field 126 is the
   * stack-light). Data older than
   * `maximumElapsedTimeCurrentCncvalue` is treated as not-available and
   * the tower switches to an 'N/A' state. Fresh data is rendered as a
   * top ellipse plus one path per light slice, decorated with
   * `stacklight-<status>` and `stacklight-color-<Color>` classes.
   *
   * @element x-stacklight
   * @attr {number} machine-id (required) machine id
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
  class StacklightComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
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

    get content () { return this._content; } // Optional

    /**
      Replace _runAjaxWhenIsVisible when NO url should be called
      return true if something is done, false if _runAjaxWhenIsVisible should be called
    */
    _runAlternateGetData () { return false; } // Optional

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
          this.start();
          break;
        default:
          break;
      }
    }

    initialize () {
      this.addClass('pulse-icon');

      // Update here some internal parameters

      // listeners/dispatchers

      // In case of clone, need to be empty :
      this.element.replaceChildren();

      // Create DOM - Content
      this._content = document.createElement('div');
      this._content.className = 'stacklight';
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
      let messageDiv = document.createElement('div');
      messageDiv.className = 'pulse-message-div';
      messageDiv.appendChild(this._messageSpan);
      this._content.appendChild(messageDiv);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      let svg = this._content.querySelector('.stacklight-svg');
      if (svg) {
        svg.remove();
      }
      this.element.replaceChildren();

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

      this.switchToNextContext();
    }

    displayError (message) {
      let svg = this._content.querySelector('.stacklight-svg');
      if (svg) {
        svg.remove();
      }
    }

    removeError () {
      // Do nothing
    }

    /**
     * Refresh interval: `currentRefreshSeconds` config * 1000 (default 10 s).
     *
     * @returns {number} Interval in ms.
     */
    get refreshRate () {
      return 1000 * Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));
    }

    /**
     * REST endpoint: `CncValue/Current?FieldIds=126&MachineId=<id>` (field 126 = stacklight).
     *
     * @returns {string} Short URL without base path.
     */
    getShortUrl () {
      let url = 'CncValue/Current?FieldIds=126&MachineId='
        + this.element.getAttribute('machine-id');
      // 126 == stacklight
      return url;
    }

    /**
     * Renders the SVG stacklight tower from `data.ByMachineModule[0].ByField[0].Value.Lights`.
     * Each light: an SVG `<path>` slice with status/color CSS classes.
     * Removes any existing `.stacklight-svg` before drawing.
     *
     * @param {{ ByMachineModule: Array<{ ByField: Array<{ Value: { Lights: Array<{ Status: string, Color: string }> } }> }> }} data
     */
    refresh (data) {
      let svg = this._content.querySelector('.stacklight-svg'); // Remove Old SVG
      if (svg) svg.remove();

      // data.ByMachineModule[0].MachineModule -> only 1 module
      if ((!pulseUtility.isNotDefined(data.ByMachineModule)) &&
        (data.ByMachineModule.length > 0) &&
        (!pulseUtility.isNotDefined(data.ByMachineModule[0])) &&
        (!pulseUtility.isNotDefined(data.ByMachineModule[0].ByField)) &&
        (data.ByMachineModule[0].ByField.length > 0) &&
        (!pulseUtility.isNotDefined(data.ByMachineModule[0].ByField[0])) &&
        (!pulseUtility.isNotDefined(data.ByMachineModule[0].ByField[0].Value)) &&
        (!pulseUtility.isNotDefined(data.ByMachineModule[0].ByField[0].Value.Lights))) {
        let val = data.ByMachineModule[0].ByField[0].Value.Lights;

        // Drawing variables
        let xRadius = 50;
        let yRadius = 15;
        let sliceHeight = 50;
        let borderHeight = 45; // Straight line on sides < sliceHeight
        let firstSliceY = yRadius + sliceHeight - borderHeight;

        // CREATE SVG
        let parentWidth = this.element.parentElement ? this.element.parentElement.offsetWidth : 0;
        let parentHeight = this.element.parentElement ? this.element.parentElement.offsetHeight / 2 : 0;
        let svg = pulseSvg.createBase(
          parentWidth,
          parentHeight, // 50% to avoid scrollbar on IE & Edge
          'top',
          2 * xRadius,
          2 * yRadius + 5 * sliceHeight);
        svg.setAttribute('class', 'stacklight-svg');
        this._content.appendChild(svg);

        // Top margin
        let topMargin = (val.length - 5) * sliceHeight / 2;

        // Top Ellipse
        let topEllipse = pulseSvg.createEllipse(xRadius, yRadius - topMargin,
          xRadius, yRadius, 'stacklight-top');

        //topEllipse.setAttribute('filter', 'url(#innerShadow)'); // Moved to CSS
        svg.appendChild(topEllipse);

        // Slices
        for (let i = 0; i < val.length; i++) {
          // val.Status == "on" "flashing" "off" // fill-opacity = 1 or less or animate
          let sliceClasses = 'stacklight-slice' + ' '
            + 'stacklight-' + val[i].Status + ' '
            + 'stacklight-color-' + val[i].Color;
          let slice = document.createElementNS(pulseSvg.get_svgNS(), 'path');
          slice.setAttribute('d', 'm0 ' + (firstSliceY + i * sliceHeight - topMargin) + ' ' +
            'a' + xRadius + ' ' + yRadius + ', 0, 0, 0, ' + (2 * xRadius) + ' 0 ' +
            'v ' + borderHeight + ' ' +
            'a' + xRadius + ' ' + yRadius + ', 0, 0, 1, -' + (2 * xRadius) + ' 0 ' +
            'Z');
          slice.setAttribute('class', sliceClasses);
          //slice.setAttribute('fill', 'url(#'+gradientName+')');
          svg.appendChild(slice);
        }
      }
      // Callback events

    }

    manageSuccess (data) {
      // Clear
      //this._content.style.display = 'inline-block';
      this._content.replaceChildren(); // To remove svg

      if ((!pulseUtility.isNotDefined(data.ByMachineModule)) &&
        (data.ByMachineModule.length > 0) &&
        (!pulseUtility.isNotDefined(data.ByMachineModule[0])) &&
        (!pulseUtility.isNotDefined(data.ByMachineModule[0].ByField)) &&
        (data.ByMachineModule[0].ByField.length > 0) &&
        (!pulseUtility.isNotDefined(data.ByMachineModule[0].ByField[0]))) {

        let field = data.ByMachineModule[0].ByField[0];
        this._lastCncValueDate = field.DateTime;

        if (this._lastCncValueDate) {
          let delay = moment().diff(moment(this._lastCncValueDate)); //result in s
          if (delay > this.maximumElapsedTimeCurrentCncvalue) {
            let noDataTooOld = this.getTranslation('noDataTooOld', 'N/A ');
            this.switchToContext('NotAvailable', () => this.displayError(noDataTooOld));
            return;
          }
        }
      }
      this.switchToNextContext(() => this.refresh(data));
    }
  }

  pulseComponent.registerElement('x-stacklight', StacklightComponent, ['machine-id']);
})();
