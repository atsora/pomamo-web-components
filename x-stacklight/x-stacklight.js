// Copyright (C) 2009-2023 Lemoine Automation Technologies
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
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>').addClass('stacklight');
      $(this.element).append(this._content);

      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this._content).append(loaderDiv);

      // Create DOM - message for error
      this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this._content).append(messageDiv);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      $(this._content).find('.stacklight-svg').remove(); // Remove Old SVG
      $(this.element).empty();
      
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
        console.error('missing attribute machine-id in Stacklight.element');
        this.setError('missing machine-id'); // delayed error message
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        //'Machine Id has incorrect value', 'BAD_ID');
        // Immediat display :
        this.switchToKey('Error', () => this.displayError('Machine Id has incorrect value'), () => this.removeError());
        return;
      }

      this.switchToNextContext();
    }

    displayError (message) {
      $(this._content).find('.stacklight-svg').remove();
    }

    removeError () {
      // Do nothing
    }

    get refreshRate () {
      return 1000 * Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));
    }

    getShortUrl () {
      let url = 'CncValue/Current?FieldIds=126&MachineId='
        + this.element.getAttribute('machine-id');
      // 126 == stacklight
      return url;
    }

    refresh (data) {
      $(this._content).find('.stacklight-svg').remove(); // Remove Old SVG

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
        let borderHeight = 45; // Trait droit sur les cotes < sliceHeight
        let firstSliceY = yRadius + sliceHeight - borderHeight;

        // CREATE SVG
        let svg = pulseSvg.createBase(
          $(this.element).parent().width(),
          $(this.element).parent().height() / 2, // 50% to avoid scrollbar on IE & Edge
          'top',
          2 * xRadius,
          2 * yRadius + 5 * sliceHeight);
        svg.setAttribute('class', 'stacklight-svg');
        $(this._content).append(svg);

        // Top margin
        let topMargin = (val.length - 5) * sliceHeight / 2;

        // Top Ellipse
        let topEllipse = pulseSvg.createEllipse(xRadius, yRadius - topMargin,
          xRadius, yRadius, 'stacklight-top');

        //topEllipse.setAttribute('filter', 'url(#innerShadow)'); // Moved to CSS
        svg.appendChild(topEllipse);

        // Slices
        for (let i = 0; i < val.length; i++) {
          // val.Status == "on" "flashing" "off" // fill-opacity = 1 ou moins ou animate
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
      //$(this._content).css('display', 'inline-block');
      $(this._content).empty(); // To remove svg

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
