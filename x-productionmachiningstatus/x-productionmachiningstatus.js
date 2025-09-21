// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-productionmachiningstatus
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var eventBus = require('eventBus');

(function () {

  class ProductionMachiningStatusComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      // DOM -> never in contructor
      self._content = undefined; // Optional
      self._displayedWorkInformations = null;

      return self;
    }

    get content () { return this._content; } // Optional

    _orderUsingShiftEfficiency () {
      let parentsToOrder = $(this.element).parents('.group-single');
      $(parentsToOrder).css('order', Math.round(100.0 * this._shiftEfficiency));
    }

    /**
      *Update display of workinformation data
      *
      *@param workInformations list of workinformation
      *@param config
      */
    _displayWorkInformations (workInformations) {
      // 1 - Verify if display need to be changed
      let needToRefresh = pulseUtility.isNotDefined(this._displayedWorkInformations);
      if (!needToRefresh) {
        needToRefresh = (this._displayedWorkInformations.length != workInformations.length);
      }
      let index = 0;
      while ((!needToRefresh) && (index < workInformations.length)) {
        if (this._displayedWorkInformations[index].Kind != workInformations[index].Kind) {
          needToRefresh = true;
        }
        if (this._displayedWorkInformations[index].Value != workInformations[index].Value) {
          needToRefresh = true;
        }
        index++
      }


      if (needToRefresh) {
        // empty
        $(this._content).find('.pulse-cellbar-first').remove();

        for (const workInformation of workInformations) {
          // workinformation value is defined
          if (workInformation.Value) {
            let div = $('<div></div>');
            div.addClass('pulse-cellbar-first')
              .addClass('pulse-cellbar-current-data')
              .attr('kind', workInformation.Kind);
            div.html(workInformation.Value);
            div.insertBefore(this._between);
          }
        } // end for
        this._displayedWorkInformations = workInformations;
      }
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'bar-style':
          if (newVal == 'true') {
            $(this.element).addClass('pulse-lastbar');
            $(this.element).removeClass('pulse-text');
          }
          else {
            $(this.element).addClass('pulse-text');
            $(this.element).removeClass('pulse-lastbar');
          }
          break;
        case 'machine-id':
          // Empty excepted message and loaded
          $(this._content).find('.pulse-cellbar-first, .pulse-cellbar-last').remove();
          this._displayedWorkInformations = null;

          this.start();
          break;
        case 'display-context':
          this.start(); // To re-validate parameters
          break;
        default:
          break;
      }
    }

    initialize () {
      this.addClass('pulse-text'); // == default

      // Update here some internal parameters

      if (this.element.getAttribute('bar-style') == 'true') {
        $(this.element).addClass('pulse-lastbar');
      }
      else {
        $(this.element).addClass('pulse-text');
      }

      // listeners/dispatchers

      // In case of clone, need to be empty :
      $(this.element).empty();
      this._displayedWorkInformations = null;

      // Create DOM
      this._between = $('<div></div>').addClass('pulse-cellbar-between');
      // Main
      this._content = $('<div></div>')
        .addClass('pulse-cellbar-main').append(this._between);
      $(this.element).append(this._content);

      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html(this.getTranslation('loadingDots', 'Loading...')).css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this.element).append(loaderDiv);

      // Create DOM - message for error
      this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this.element).append(messageDiv);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      $(this.element).empty();
      this._displayedWorkInformations = null;

      this._between = undefined;
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
      // Empty excepted message and loaded
      //$(this._content).find('.pulse-cellbar-first, .pulse-cellbar-last').remove();
      //this._displayedWorkInformations = workInformations;


      $(this._messageSpan).html(message);

      if (this.element.hasAttribute('display-context')) {
        eventBus.EventBus.dispatchToContext('displayChangeEvent',
          this.element.getAttribute('display-context'),
          {
            Display: '',
            ClassToAdd: '',
            ClassToRemove: 'good-efficiency mid-efficiency bad-efficiency'
          });
      }

      this._shiftEfficiency = 999999.9; // = display last
      this._orderUsingShiftEfficiency();
    }

    removeError () {
      $(this._messageSpan).html('');
    }

    get refreshRate () {
      return 1000 * Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));
    }

    getShortUrl () {
      /* To restore if needed :
      let hideglobal = this.element.hasAttribute('hideglobal') ? this.element.getAttribute('hideglobal') : true; // Default = HIDE global
      */

      let url = 'Operation/ProductionMachiningStatus?MachineId='
        + this.element.getAttribute('machine-id')
        + '&Option=' + 'TrackTask';

      return url;
    }

    refresh (data) {
      this.removeError(); // Should have been done before...

      if (data.NotAvailable) {
        this.displayError(this.getTranslation('notavailable', 'Not Available'));
        return;
      }

      //if there is no slot, display ???
      this._displayWorkInformations(data.WorkInformations);

      // For external display
      let classToAdd = ''; // "bad-efficiency"
      let classToRemove = '';

      let doneGoal = '&nbsp';
      if (data.NbPiecesDoneDuringShift != undefined) {
        doneGoal = Math.floor(data.NbPiecesDoneDuringShift * 100) / 100 + ' / '; // Trunk with 2 decimal if needed
      }
      if (data.GoalNowShift != undefined) {
        if (doneGoal == '&nbsp') {
          doneGoal = Math.floor(data.GoalNowShift * 100) / 100; // Trunk with 2 decimal if needed
        }
        else {
          doneGoal += Math.floor(data.GoalNowShift * 100) / 100; // Trunk with 2 decimal if needed
        }
      }

      if ((data.GoalNowShift) && (0 < data.GoalNowShift)) {
        this._shiftEfficiency = data.NbPiecesDoneDuringShift / data.GoalNowShift;

        let thresholdunitispart = this.getConfigOrAttribute('thresholdunitispart', 'true');
        let thresholdredproduction = this.getConfigOrAttribute('thresholdredproduction', 0);
        let thresholdorangeproduction = this.getConfigOrAttribute('thresholdorangeproduction', 0);
        // colors
        let diff = data.GoalNowShift - data.NbPiecesDoneDuringShift;
        let multiplier = (thresholdunitispart == 'true') ? 1 : (100.0 / data.GoalNowShift);
        if ((diff * multiplier) > thresholdredproduction) {
          classToAdd = 'bad-efficiency';
          classToRemove = 'mid-efficiency good-efficiency';
        }
        else {
          if ((diff * multiplier) > thresholdorangeproduction) {
            classToAdd = 'mid-efficiency';
            classToRemove = 'bad-efficiency good-efficiency';
          }
          else {
            classToAdd = 'good-efficiency';
            classToRemove = 'mid-efficiency bad-efficiency';
          }
        }
        if (data.NbPiecesDoneDuringShift == 0) {
          this._shiftEfficiency = 0 - data.GoalNowShift; // 0/50 should be before 0/10
        }
      }
      else {
        this._shiftEfficiency = data.NbPiecesDoneDuringShift + 100; // +100 = Display undefined last
        classToRemove = 'good-efficiency mid-efficiency bad-efficiency';
      }

      if (this.element.hasAttribute('display-context')) {
        // External display
        eventBus.EventBus.dispatchToContext('displayChangeEvent',
          this.element.getAttribute('display-context'),
          {
            Display: doneGoal,
            ClassToAdd: classToAdd,
            ClassToRemove: classToRemove
          });
      }
      else {
        // clean
        $(this._content).find('.pulse-cellbar-last').remove();

        let shiftDiv = $('<div></div>')
          .addClass('pulse-cellbar-last')
          //.addClass('pulse-cellbar-past-data') // No, because not clickable
          .addClass('pulse-cellbar-left-border')
          .addClass('productionmachiningstatus-shift');

        if (data.NbPiecesDoneDuringShift != undefined) {
          // Shift display
          let shiftSpan = $('<span></span>')
            .addClass('productionmachiningstatus-shiftspan');
          $(shiftSpan).html(doneGoal);
          let linkReport = $('<a></a>').addClass('productionmachiningstatus-linkreport'); // Keep <a> it to quickly restore any link here
          linkReport.attr('target', '_blank'); // To open in a new tab
          linkReport.append($('<span>Shift</span>')
            .addClass('productionmachiningstatus-shiftlabel'));
          if (data.Shift && data.Shift.Display) {
            $(linkReport).html(data.Shift.Display);
          }
          else {
            $(linkReport).html('Out of shift');
          }

          shiftDiv.append(linkReport).append(shiftSpan);
        }
        if ('' != classToAdd)
          $(shiftDiv).addClass(classToAdd); //bad-efficiency...
        shiftDiv.insertAfter(this._between);
      }

      this._orderUsingShiftEfficiency(); // Always
    }

    // Callback events

    /**
     * Event bus callback triggered when param changes
     *
     * @param {Object} event
     */
    onMachineIdChange (event) {
      this.element.setAttribute('machine-id', event.target.newMachineId);
    }

    /**
      * Event callback in case a config is updated: (re-)start the component
      * 
      * @param {*} event 
      */
    onConfigChange (event) {
      if ((event.target.config == 'thresholdunitispart')
        || (event.target.config == 'thresholdredproduction')
        || (event.target.config == 'thresholdorangeproduction')) {
        this.start();
      }
    }

  }

  pulseComponent.registerElement('x-productionmachiningstatus', ProductionMachiningStatusComponent, ['bar-style', 'machine-id', 'display-context']);
})();
