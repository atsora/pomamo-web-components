// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-machinetab
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseConfig = require('pulseConfig');
var eventBus = require('eventBus');

require('x-machinedisplay/x-machinedisplay');
require('x-currenticonunansweredreason/x-currenticonunansweredreason');
require('x-currenticonnextstop/x-currenticonnextstop');
require('x-currenticonworkinformation/x-currenticonworkinformation');
require('x-currenticoncncalarm/x-currenticoncncalarm');

(function () {

  class MachineTabComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
    * Constructor
    * 
    * @param  {...any} args 
    */
    constructor(...args) {
      const self = super(...args);

      // DOM -> never in contructor
      self._content = undefined;
      self._machineContent = undefined;
      self._iconsDiv = undefined;

      // Default display config
      self._showWorkInfo = false;
      self._showReason = false;
      self._showNextStop = false;
      self._showAlert = false;

      return self;
    }

    get content() {
      return this._content;
    } // Optional

    attributeChangedWhenConnectedOnce(attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'machine-id':
          if (this.isInitialized()) {
            let xicon = $(this._iconsDiv).find('.machinetab-icon');
            for (let iIcon = 0; iIcon < xicon.length; iIcon++) {
              xicon[iIcon].setAttribute('machine-id', newVal);
            }
            this.start();
          }
          break;
        case 'active':
          if (this.isInitialized()) {
            if (newVal == 'true') {
              $(this._machineContent).addClass('active');
              if (!this.element._isActive) {
                this.element._isActive = true;
                this.changeSelectedMachine();
              }    
              //$(this).find(".pulse-icon-content").addClass("active"); // To change icon display -> done in icon
            }
            else {
              this.element._isActive = false;
              $(this._machineContent).removeClass('active');
              //$(this).find(".pulse-icon-content").removeClass("active"); // To change icon display -> done in icon
            }
            let xicon = $(this._iconsDiv).find('.machinetab-icon');
            for (let iIcon = 0; iIcon < xicon.length; iIcon++) {
              xicon[iIcon].setAttribute('active', newVal);
            }
            this.start();
          }
          break;
        case 'machine-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'machineIdChangeSignal');
            eventBus.EventBus.addEventListener(this,
              'machineIdChangeSignal', newVal,
              this.onMachineIdChange.bind(this));

            let xicon = $(this._iconsDiv).find('.machinetab-icon');
            for (let iIcon = 0; iIcon < xicon.length; iIcon++) {
              xicon[iIcon].setAttribute('machine-context', newVal);
            }
          }
          break;
        case 'period-context':
          if (this.isInitialized()) {
            let xicon = $(this._iconsDiv).find('.machinetab-icon');
            for (let iIcon = 0; iIcon < xicon.length; iIcon++) {
              xicon[iIcon].setAttribute('period-context', newVal);
            }
          }
          break;
        case 'status-context':
          if (this.isInitialized()) {
            let xicon = $(this._iconsDiv).find('.machinetab-icon');
            for (let iIcon = 0; iIcon < xicon.length; iIcon++) {
              xicon[iIcon].setAttribute('status-context', newVal);
            }
          }
          break;
        default:
          break;
      }
    }

    initialize() {
      //this.addClass('pulse-bigdisplay'); // No loading display (done in machinedisplay)

      // Update here some internal parameters

      // listeners/dispatchers
      if (this.element.hasAttribute('machine-context')) {
        eventBus.EventBus.addEventListener(this,
          'machineIdChangeSignal',
          this.element.getAttribute('machine-context'),
          this.onMachineIdChange.bind(this));
      }

      this.element._isActive = false; // to know if the tab is already active

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>')
        .addClass('machinetab-modecolor')
        .addClass('machinetab-modecolor-undefined'); // default
      // DOM - machine display
      let machDisplayDiv = $('<div></div>')
        .addClass('machinetab-machine');
      let xmachinedisplay = pulseUtility.createjQueryElementWithAttribute('x-machinedisplay', {
        'machine-id': this.element.getAttribute('machine-id')
      });
      $(machDisplayDiv).append(xmachinedisplay);

      // DOM - icons
      let icons = ['x-currenticonunansweredreason', 'x-currenticonworkinformation', 'x-currenticonnextstop', 'x-currenticoncncalarm']; // Not an attribute anymore
      this._iconsDiv = $('<div></div>').addClass('machinetab-icons');
      for (let i = 0; i < icons.length; i++) {
        if (icons[i] != '') {
          let xicon;
          if (this.element.hasAttribute('period-context')) {
            xicon = pulseUtility.createjQueryElementWithAttribute(icons[i], {
              'machine-id': this.element.getAttribute('machine-id'),
              'machine-context': this.element.getAttribute('machine-context'),
              'period-context': this.element.getAttribute('period-context'),
              'status-context': this.element.getAttribute('status-context')
            });
          }
          else {
            xicon = pulseUtility.createjQueryElementWithAttribute(icons[i], {
              'machine-id': this.element.getAttribute('machine-id'),
              'machine-context': this.element.getAttribute('machine-context'),
              'status-context': this.element.getAttribute('status-context')
            });
          }
          $(xicon).addClass('machinetab-icon');
          $(this._iconsDiv).append(xicon);
        }
      }

      this._machineContent = $('<div></div>')
        .addClass('machinetab-machine-cell')
        .append(machDisplayDiv).append(this._iconsDiv);
      this._machineContent.click(
        function (e) {
          this.clickMachineTab(e);
        }.bind(this)
      );

      if ((this.element.hasAttribute('active')) &&
        (this.element.getAttribute('active') == 'true')) {
        $(this._machineContent).addClass('active');
      }
      else {
        // Try to find automatically if thsi machinetab is the first in a x-grouparray
        let xgroup = $(this.element).parents('x-grouparray');
        if (xgroup.length != 0) {
          let allTabs = $(xgroup).find('x-machinetab');
          if (allTabs.length != 0) { // Always
            let firstMachineTab = allTabs[0];
            if (this.element == firstMachineTab) {
              $(this._machineContent).addClass('active');
              // Send message to others
              this.clickMachineTab();
            }
          }
        }
      }

      // Create DOM - Loader -> in machine display
      /*let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this._content).append(loaderDiv);*/

      // Create DOM - message for error -> in machine display
      /*this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this.element).append(messageDiv);*/

      $(this.element).append(this._content).append(this._machineContent);

      // Show / Hide icons
      let componentsToDisplay = pulseConfig.getArray('componentsToDisplay', []);

      let posFound = componentsToDisplay.indexOf('x-lastmachinestatus');
      if (-1 == posFound) {
        $(this.element).find('x-currenticonunansweredreason').hide();
      }
      else {
        $(this.element).find('x-currenticonunansweredreason').show();
      }

      posFound = componentsToDisplay.indexOf('x-lastworkinformation');
      if (-1 == posFound) {
        $(this.element).find('x-currenticonworkinformation').hide();
      }
      else {
        $(this.element).find('x-currenticonworkinformation').show();
      }

      posFound = componentsToDisplay.indexOf('x-cycleprogressbar');
      if (-1 == posFound) {
        $(this.element).find('x-currenticonnextstop').hide();
      }
      else {
        $(this.element).find('x-currenticonnextstop').show();
      }

      posFound = componentsToDisplay.indexOf('coloredbar');
      if (-1 == posFound) {
        posFound = componentsToDisplay.indexOf('coloredbarwithpercent');
      }
      if (-1 == posFound) {
        $(this.element).find('x-currenticoncncalarm').hide();
      }
      else {
        let showBar = pulseConfig.getBool('showcoloredbar.cncalarm', false);
        if (showBar)
          $(this.element).find('x-currenticoncncalarm').show();
        else
          $(this.element).find('x-currenticoncncalarm').hide();
      }

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization() {
      // Parameters
      // DOM
      $(this.element).empty();

      this._iconsDiv = undefined;
      this._machineContent = undefined;
      //this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters() {
      // machine-id
      if (!this.element.hasAttribute('machine-id')) {
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

    displayError(message) {
      $(this._content)
        .addClass('machinetab-modecolor-undefined');
    }

    removeError() {
      // Do nothing
    }

    get refreshRate() {
      return 1000 * Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));
    }

    getShortUrl() {
      let url = 'CurrentReason?MachineId=' +
        this.element.getAttribute('machine-id');
      return url;
    }

    refresh(data) {
      $(this._content)
        .removeClass('machinetab-modecolor-undefined')
        .css('border-right-color', data.Reason.Color);
    }

    // Callback events

    /**
     * Event bus callback triggered when param changes
     *
     * @param {Object} event
     */
    onMachineIdChange(event) {
      if (this.element.getAttribute('machine-id') == event.target.newMachineId) {
        this.element.setAttribute('active', 'true');
      }
      else {
        this.element.setAttribute('active', 'false');
      }
    }

    /**
     * DOM event callback triggered on a click anywhere on machine tab
     *
     * @param {event} e - DOM event
     */
    clickMachineTab(e) {
      this.changeSelectedMachine();
    }

    changeSelectedMachine() {
      eventBus.EventBus.dispatchToContext('machineIdChangeSignal',
        this.element.getAttribute('machine-context'),
        {
          newMachineId: Number(this.element.getAttribute('machine-id'))
        });

      // Scroll to top :
      // fast ==> $('.pulse-mainarea').scrollTop(0);
      $('.pulse-mainarea-full').animate({
        scrollTop: 0
      }, 'slow');
      // slower ==> $('.pulse-mainarea').animate({ scrollTop: 0 }, 2000);
    }

  }

  pulseComponent.registerElement('x-machinetab', MachineTabComponent, ['machine-id', 'active', 'machine-context', 'period-context', 'status-context']);
})();
