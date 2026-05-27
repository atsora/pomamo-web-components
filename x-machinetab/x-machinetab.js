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

  /**
   * `<x-machinetab>` — clickable tab representing a single machine in a sidebar list.
   *
   * Polls `CurrentReason?MachineId=<id>` and applies the reason color as a right border.
   * Renders: colored mode bar + machine name (`x-machinedisplay`) + icon row.
   *
   * Icons displayed (driven by `componentsToDisplay` config):
   *  - `x-currenticonunansweredreason` — shown if `x-lastmachinestatus` is in the layout
   *  - `x-currenticonworkinformation` — shown if `x-lastworkinformation` is in the layout
   *  - `x-currenticonnextstop` — shown if `x-cycleprogressbar` is in the layout
   *  - `x-currenticoncncalarm` — shown if colored bar + `showcoloredbar.cncalarm` config
   *
   * Clicking the tab dispatches `machineIdChangeSignal` on `machine-context` and scrolls to top.
   * Responds to `machineIdChangeSignal` to auto-activate/deactivate based on matching machine id.
   * Responds to `askForMachineIdSignal` to re-broadcast the active machine id.
   *
   * Attributes:
   *   machine-id      - (required) integer machine id
   *   active          - `'true'` adds `active` CSS class to the tab cell
   *   machine-context - event bus context for machine selection
   *   period-context  - (optional) forwarded to icon components
   *   status-context  - (optional) forwarded to icon components
   *
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
  class MachineTabComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    constructor(...args) {
      const self = super(...args);

      // DOM -> never in constructor
      self._content = undefined;
      self._machineContent = undefined;
      self._iconsDiv = undefined;

      return self;
    }

    get content() {
      return this._content;
    }

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
            }
            else {
              this.element._isActive = false;
              $(this._machineContent).removeClass('active');
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

            eventBus.EventBus.removeEventListenerBySignal(this,
              'askForMachineIdSignal');
            eventBus.EventBus.addEventListener(this,
              'askForMachineIdSignal', newVal,
              this.onAskForMachineId.bind(this));

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
      // listeners/dispatchers
      if (this.element.hasAttribute('machine-context')) {
        eventBus.EventBus.addEventListener(this,
          'machineIdChangeSignal',
          this.element.getAttribute('machine-context'),
          this.onMachineIdChange.bind(this));

        eventBus.EventBus.addEventListener(this,
          'askForMachineIdSignal',
          this.element.getAttribute('machine-context'),
          this.onAskForMachineId.bind(this));
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
      let icons = ['x-currenticonunansweredreason', 'x-currenticonworkinformation', 'x-currenticonnextstop', 'x-currenticoncncalarm'];
      this._iconsDiv = $('<div></div>').addClass('machinetab-icons');
      for (let i = 0; i < icons.length; i++) {
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
        this.clickMachineTab();
      }
      else {
        // Auto-activate the first machinetab inside an x-grouparray, x-grouplist,
        // x-groupgrid or x-machinetabnav wrapper (resolver-autonomous containers).
        let xgroup = $(this.element).parents('x-grouparray, x-grouplist, x-groupgrid, x-machinetabnav');
        if (xgroup.length != 0) {
          let allTabs = $(xgroup).find('x-machinetab');
          if (allTabs.length != 0) {
            let firstMachineTab = allTabs[0];
            if (this.element == firstMachineTab) {
              $(this._machineContent).addClass('active');
              this.clickMachineTab();
            }
          }
        }
      }

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
    }

    clearInitialization() {
      $(this.element).empty();

      this._iconsDiv = undefined;
      this._machineContent = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters() {
      if (!this.element.hasAttribute('machine-id')) {
        this.setError(this.getTranslation('error.selectMachine', 'Please select a machine'));
        return;
      }
      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        this.switchToKey('Error',
          () => this.displayError(this.getTranslation('error.invalidMachineId', 'Invalid machine-id')),
          () => this.removeError());
        return;
      }

      this.switchToNextContext();
    }

    displayError(message) {
      $(this._content).addClass('machinetab-modecolor-undefined');
    }

    removeError() {
      // Do nothing
    }

    /**
     * Refresh interval: `currentRefreshSeconds` config * 1000 (default 10 s).
     *
     * @returns {number} Interval in ms.
     */
    get refreshRate() {
      return 1000 * Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));
    }

    /**
     * REST endpoint: `CurrentReason?MachineId=<id>`
     *
     * @returns {string} Short URL without base path.
     */
    getShortUrl() {
      return 'CurrentReason?MachineId=' + this.element.getAttribute('machine-id');
    }

    /**
     * Applies the current reason color as `border-right-color` on the mode bar div.
     *
     * @param {{ Reason: { Color: string } }} data
     */
    refresh(data) {
      $(this._content)
        .removeClass('machinetab-modecolor-undefined')
        .css('border-right-color', data.Reason.Color);
    }

    // Callback events

    onMachineIdChange(event) {
      if (this.element.getAttribute('machine-id') == event.target.newMachineId) {
        this.element.setAttribute('active', 'true');
      }
      else {
        this.element.setAttribute('active', 'false');
      }
    }

    onAskForMachineId() {
      if (this.element.querySelector('.active')) {
        eventBus.EventBus.dispatchToContext('requestMachineIdSignal',
          this.element.getAttribute('machine-context'),
          { machineId: Number(this.element.getAttribute('machine-id')) });
      }
    }

    clickMachineTab(e) {
      this.changeSelectedMachine();
    }

    /**
     * Dispatches `machineIdChangeSignal` on `machine-context` with this tab's machine id,
     * then smoothly scrolls the main content area to the top.
     */
    changeSelectedMachine() {
      eventBus.EventBus.dispatchToContext('machineIdChangeSignal',
        this.element.getAttribute('machine-context'),
        { newMachineId: Number(this.element.getAttribute('machine-id')) });

      $('.pulse-mainarea-full').animate({ scrollTop: 0 }, 'slow');
    }

  }

  pulseComponent.registerElement('x-machinetab', MachineTabComponent, ['machine-id', 'active', 'machine-context', 'period-context', 'status-context']);
})();
