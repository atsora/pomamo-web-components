// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-motionpercentage
 * @requires module:pulseComponent
 */

var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
//var pulseSvg = require('pulseSvg');
var eventBus = require('eventBus');

/**
 * Build a custom tag <x-motionpercentage> to display % utilization. This tag gets following attributes :
 *  motion-context : String (to get % directly)
 *  machine-id : complete motion-context when using x-grouparray
 *  machine-context : to change machine-id
 * 
 */
(function () {

  class MotionPercentageComponent extends pulseComponent.PulseParamInitializedComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      self._content = undefined;
      // default
      //self._svg = null;
      self._textSpan = undefined;
      self._motionpercentage = undefined;


      return self;
    }

    //get content () { return this._content; }

    _display () {
      let display = '';
      if (pulseUtility.isNumeric(this._motionpercentage) == true) {
        display = this._motionpercentage.toFixed(0) + '%';
      }
      $(this._textSpan).html(display);

      /*      if (this._svg == null) { // Create SVG for easy resize
              let width = 120;
              let height = 20;
              let halfTextWidth = 30;
      
              this._svg = pulseSvg.createBase(width, height, 'text-svg',
                width, height);
              this._svg.setAttribute('class', 'motionpercentage-svg');
              //this._svg.setAttribute('width', '100%');
              //this._svg.setAttribute('height', '100%');
              $(this._content).append(this._svg);
      
              // Show text + positions -> RECT
              let textGroup = document.createElementNS(pulseSvg.get_svgNS(), 'g');
              //textGroup.setAttribute('width', '100%');
              //textGroup.setAttribute('height', '100%');
      
              // Rect
              let rect = document.createElementNS(pulseSvg.get_svgNS(), 'rect');
              rect.setAttribute('x', 0);
              rect.setAttribute('y', 0);
              rect.setAttribute('width', '100%');
              rect.setAttribute('height', '100%');
              rect.setAttribute('fill', 'pink'); // 'transparent');
              textGroup.appendChild(rect);
              // text svg
              this._textSvg = document.createElementNS(pulseSvg.get_svgNS(), 'text');
              this._textSvg.setAttribute('x', width / 2 - halfTextWidth);
              this._textSvg.setAttribute('y', 3 * height / 4); // Base of text
              this._textSvg.setAttribute('class', 'text-svg');
              //this._textSvg.setAttribute('text-anchor', 'middle'); / Do not works as it should :/ 
              this._textSvg.setAttribute('font-weight', 'bold');
              this._textSvg.setAttribute('font-size', '20px');
              this._textSvg.textContent = '%';
              textGroup.appendChild(this._textSvg);
      
              this._svg.appendChild(textGroup);
            }
      
            this._textSvg.textContent = display;
            */
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
          if (this.isInitialized()) {
            let context = this.element.getAttribute('motion-context');
            eventBus.EventBus.removeEventListenerBySignal(this,
              'motionChangeEvent');
            eventBus.EventBus.addEventListener(this,
              'motionChangeEvent',
              context + ((newVal == '') ? '' : ('_' + newVal)),
              this.onMotionChange.bind(this));
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
        case 'motion-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'paramChangeSignal');
            let mach = '';
            if (this.element.hasAttribute('machine-id')) {
              mach = '_' + this.element.getAttribute('machine-id');
            }
            eventBus.EventBus.addEventListener(this,
              'paramChangeSignal',
              newVal + mach,
              this.onMotionChange.bind(this));
          }
          break;
        default:
          break;
      }
    }

    initialize () {
      this.addClass('pulse-smalltext');

      // Attributes
      if (!this.element.hasAttribute('motion-context')) {
        console.error('missing attribute motion-context');
        // Initialization error => switch to the Error state
        this.switchToKey('Error', () => this.displayError('missing attribute motion-context'), () => this.removeError());
        return;
      }

      // Listener and dispatchers
      let context = this.element.getAttribute('motion-context');
      if (this.element.hasAttribute('machine-id')) {
        context += '_' + this.element.getAttribute('machine-id');
      }
      eventBus.EventBus.addEventListener(this,
        'motionChangeEvent', context,
        this.onMotionChange.bind(this));

      if (this.element.hasAttribute('machine-context')) {
        eventBus.EventBus.addEventListener(this,
          'machineIdChangeSignal',
          this.element.getAttribute('machine-context'),
          this.onMachineIdChange.bind(this));
      }

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Loader (?)
      /*let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this._content).append(loaderDiv);*/
      // Create DOM - Content
      this._content = $('<div></div>').addClass('motionpercentage');
      $(this.element).append(this._content);

      // + Text span
      this._textSpan = $('<span></span>').addClass('motionpercentage-text');
      $(this._content).append(this._textSpan);

      /*
            // Create SVG for easy resize
            let width = 120;
            let height = 20;
            let halfTextWidth = 30;
      
            /*
            let svg = pulseSvg.createBase(this._height, this._height,
              'donut', 2 * this._xyPosition, 2 * this._xyPosition);
            svg.setAttribute('class', 'cycleprogresspie-svg');
            $(this._pie).append(svg); //
      
            this._svg = pulseSvg.createBase(width, height, 'text-svg',
              width, height);
            this._svg.setAttribute('class', 'motionpercentage-svg');
            //this._svg.setAttribute('width', '100%');
            //this._svg.setAttribute('height', '100%');
            $(this._content).append(this._svg);
      
            // Show text + positions -> RECT
            let textGroup = document.createElementNS(pulseSvg.get_svgNS(), 'g');
            //textGroup.setAttribute('width', '100%');
            //textGroup.setAttribute('height', '100%');
            this._svg.appendChild(textGroup);
            
            // Rect
            let rect = document.createElementNS(pulseSvg.get_svgNS(), 'rect');
            rect.setAttribute('x', 0);
            rect.setAttribute('y', 0);
            rect.setAttribute('width', '100%');
            rect.setAttribute('height', '100%');
            rect.setAttribute('fill', 'pink'); // 'transparent');
            textGroup.appendChild(rect);
            // text svg
            this._textSvg = document.createElementNS(pulseSvg.get_svgNS(), 'text');
            this._textSvg.setAttribute('x', width/2- halfTextWidth);
            this._textSvg.setAttribute('y', 3*height/4); // Base of text
            this._textSvg.setAttribute('class', 'text-svg');
            //this._textSvg.setAttribute('text-anchor', 'middle'); / Do not works as it should :/ 
            this._textSvg.setAttribute('font-weight', 'bold');
            this._textSvg.setAttribute('font-size', '20px');
            this._textSvg.textContent = '%';
            textGroup.appendChild(this._textSvg);
      */
      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      $(this.element).empty();

      //this._messageSpan = undefined;
      this._textSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    validateParameters () {
      if (!this.element.hasAttribute('motion-context')) {
        console.error('missing attribute motion-context in MotionPercentage.element');
        this.setError('missing motion-context'); // delayed error message
        return;
      }
      // Additional checks with attribute param

      this.switchToNextContext();
    }

    // Callback events
    onMachineIdChange (event) {
      this.element.setAttribute('machine-id', event.target.newMachineId);
    }

    // Callback events
    onMotionChange (event) {
      if (!pulseUtility.isNotDefined(event.target.MotionPercent)) {
        this._motionpercentage = Number(event.target.MotionPercent * 100);
      }
      else {
        this._motionpercentage = null;
      }
      this._display();
    }
  }

  pulseComponent.registerElement('x-motionpercentage', MotionPercentageComponent, ['machine-id', 'machine-context', 'motion-context']);
})();
