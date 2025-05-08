// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-checkserveraccess
 * @requires module:pulseComponent
 */
var pulseComponent = require('pulsecomponent');
var eventBus = require('eventBus');
var pulseSvg = require('pulseSvg');
var pulseConfig = require('pulseConfig');

(function () {

  class CheckServerAccessComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {

    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      self._databaseIsDisconnected = false;
      self._serverProbablyOff = false;
      this._serverProbablyDisconnected = false;

      return self;
    }


    initialize () {
      this.addClass('pulse-nodisplay');
      
      // In case of clone, need to be empty :
      $(this.element).empty();
      this._databaseIsDisconnected = false;

      // listeners
      eventBus.EventBus.addGlobalEventListener(this, 'serverProbablyDisconnected',
        this.onServerProbablyDisconnectedChange.bind(this));
      eventBus.EventBus.addGlobalEventListener(this, 'databaseProbablyDisconnected',
        this.onDatabaseDisconnectedChange.bind(this));
      eventBus.EventBus.addGlobalEventListener(this, 'pulseMaintenance',
        this.onPulseMaintenance.bind(this));

      // Create DOM - None

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    /**
      * Clear anything that was done during intialization, so that initialize can be called once again.
      * Remove all the dispatchers and listeners.
      * Please note that no state switch is done here
    */
    clearInitialization () {
      // DOM
      $(this.element).empty();

      this._databaseIsDisconnected = false;

      super.clearInitialization();
    }

    reset () { // Optional implementation = called after 'start'
      // Code here to clean the component when the component has been initialized
      // for example after a parameter change
      //this.removeError();
      // Empty this._content

      // this._databaseIsDisconnected = false;... Surtout pas ! le restart passe ici

      this.switchToNextContext();
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters () {
      this.switchToNextContext();
    }

    manageError (data) {
      super.manageError(data);
    }

    displayError (message) {
      // Not here !!! Can be called anywhere else
    }

    displayErrorAndStopAll () {
      // No display but send message for outside display

      let messageInfo = {
        'id': 'NO_SERVER', // same as clear
        'message': this.getTranslation('errorServerAccess', 'Please check server access'), // server OR database
        'level': 'error', // or 'warning', ?
        'clickToClose': false
      };

      if (this._databaseIsDisconnected) {
        messageInfo.message = this.getTranslation('errorDatabaseAccess', 'Please check database access');
      }

      eventBus.EventBus.dispatchToAll('showMessageSignal', messageInfo);

      // Store state
      this._serverProbablyOff = true;
      eventBus.EventBus.dispatchToAll('serverProbablyOffStopRefresh', {});
    }

    removeError () {
      // Do nothing
      //this._databaseIsDisconnected = false; ... Surtout pas ! le restart passe ici
    }

    get refreshRate () {
      return 1000 * Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));
    }

    get transientErrorDelay () {
      //return Number(1000); // == 1sec // DO NOT USE freezeMinutes == too long *
      let basicFreezeMinutes = this.getConfigOrAttribute('stopRefreshingRate.freezeMinutes', this._defaultTransientErrorDelay / 60 / 1000);
      let fastRefreshRate = 1000 * Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));
      return (Number(basicFreezeMinutes) * 60 * 1000)
        - 2 * fastRefreshRate; // To refresh faster than other components = avoid long 'Not Connected' display
    }

    getShortUrl () {
      let url = 'Data/Computer/GetLctr?Cache=No'; // was 'Test';
      return url;
    }

    manageSuccess (data) {
      // Hide message
      let messageInfo = {
        'id': 'NO_SERVER' // same as show
      };
      eventBus.EventBus.dispatchToAll('clearMessageSignal', messageInfo);

      // Hide 'Maintenance' - always to be sure !
      pulseSvg.hidePulseMaintenance();

      if (this._databaseIsDisconnected || this._serverProbablyOff) {
        this._databaseIsDisconnected = false;
        this._serverProbablyOff = false;

        // start to load data again (database / server or maintenance END )
        eventBus.EventBus.dispatchToAll('serverProbablyAvailable', {});
      }
      else { // Call here too to avoid frozen display
        // start to load data again (database / server or maintenance END )
        eventBus.EventBus.dispatchToAll('serverProbablyAvailable', {});
      }
      this._serverProbablyDisconnected = false;

      // Stop context
      this.switchToContext('Stop');
    }

    // Callback events

    /**
     * Event bus callback triggered when receivving event server probably diconnected
     *
     * @param {Object} event
     */
    onServerProbablyDisconnectedChange (event) {
      /* DO NOT REMOVE : here is how to find origin of info : */
      /*let target = event.target;
      let url = event.target.url;
      let source = event.target.source;
      let when = event.target.when;*/

      if (false == this._serverProbablyDisconnected) {
        this._serverProbablyDisconnected = true;
        this._serverProbablyDisconnectedSince = new Date();
      }
      else { // = if (this._serverProbablyDisconnected == true)
        let now = new Date();
        let elapsedMSec = now.getTime() - this._serverProbablyDisconnectedSince.getTime();

        // Display after 1 minute == when we are sure that many services failed, for example
        let Min = 1;
        if (elapsedMSec >= Min * 60 * 1000) {
          // Check my self if it is true

          // DO NOT removed comment yet -- 2022 02
          // The following code will be executed if server is REALLY disconnected = manageError
          // Store state
          //this._serverProbablyOff = true;
          // Stop All components
          //eventBus.EventBus.dispatchToAll('serverProbablyOffStopRefresh', {}); -> NO
          //this.displayError(''); // == display message AND Call onServerOffStopRefresh
          this.displayErrorAndStopAll();
        }
        if (this.stateContext == 'Stop') {
          // Start checking again
          this.start();
        }
      }
    }

    /**
     * Event bus callback triggered when receivving event server probably diconnected
     *
     * @param {Object} event
     */
    onDatabaseDisconnectedChange (event) {
      /* DO NOT REMOVE : here is how to find origin of info : */
      /*let target = event.target;
      let url = event.target.url;
      let source = event.target.source;
      let when = event.target.when;*/

      this._databaseIsDisconnected = true;

      //this.displayError(''); // == display message AND Call onServerOffStopRefresh
      this.displayErrorAndStopAll();

      if (this.stateContext == 'Stop') {
        // Start checking again
        this.start();
      } // else continue
    }

    /**
     * Event bus callback triggered when receivving event pulse maintenance
     *
     * @param {Object} event
     */
    onPulseMaintenance (event) {
      /* DO NOT REMOVE : here is how to find origin of info : */
      /*let target = event.target;
      let url = event.target.url;
      let source = event.target.source;
      let when = event.target.when;*/

      // Display 'Maintenance' if not already done
      pulseSvg.showPulseMaintenance();

      // Store state
      this._serverProbablyOff = true;
      // Stop All components
      eventBus.EventBus.dispatchToAll('serverProbablyOffStopRefresh', {});
      if (this.stateContext == 'Stop') {
        // Start checking again
        this.start();
      }  // else continue

    }

    /**
     * Default event callback in case server is off : OVERLOAD - Do nothing
     * 
     * @param {*} event 
     */
    onServerOffStopRefresh (event) {
      // Nothing -> to keep == overload default
      //console.log('checkserveraccess.onServerOffStopRefresh');
    }

    /**
     * Default event callback in case server is available: OVERLOAD - Do nothing
     * 
     * @param {*} event 
     */
    onServerAvailableChange (event) {
      // Nothing -> to keep == overload default
    }

    // Not added, included in previous ones
    // onDatabaseOffStopRefresh
    // onDatabaseAvailableChange 

  }

  pulseComponent.registerElement('x-checkserveraccess', CheckServerAccessComponent);
})();
