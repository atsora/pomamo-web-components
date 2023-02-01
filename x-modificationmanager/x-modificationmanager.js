// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-modificationmanager
 * @requires module:pulseComponent
 */

var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseService = require('pulseService');
var eventBus = require('eventBus');
var pulseRange = require('pulseRange');

/**
 * Build a custom tag <x-modificationmanager> with 0 attribute
 */
(function () {

  class SingleModification {
    /**
       * Constructor
       * @param {modif} == revisionid,range,kind,machineid,initModifications,pendingModifications}
       * @param {modificationManager} == parent
       */
    constructor(modif, modificationManager, path) {
      this.modif = modif;
      this._modificationManager = modificationManager;
      this._path = path;

      this._possibleNbFails = 150; // == 150 seconds before ignoring in case of error
      this._refreshRate = 1000; // 1 second

      // log : NEW modification
      console.log('modificationmanager : NEW (mach=' + modif.machineid
        + ',kind=' + modif.kind + ',rev=' + modif.revisionid);
      //+ ',range=' + this.modif.ranges[0]; -> NO becausse range.toString is badly defined

      // Tell all xtags
      eventBus.EventBus.dispatchToAll('modificationEvent', modif);

      this.methods = { // To prepare export
        addModification: this.addModification,
        getModifications: this.getModifications
      }; 

      this._askWebService();
    }

    /**
   * Ask web service for modifications
   * @param {!Object} modif 
   */
    _askWebService () {
      let url = this._path
        + 'GetPendingModificationsFromRevision?Id=' + this.modif.revisionid;

      let thisModif = this;
      pulseService.runAjaxSimple(url,
        this._getPendingModificationSuccess.bind(thisModif),
        this._getPendingModificationError.bind(thisModif),
        this._getPendingModificationFail.bind(thisModif));
    }

    /**
     * Web service - success
     * @param {!Object} data 
     */
    _getPendingModificationSuccess (data) {
      if (this.modif.initModifications == undefined) {
        this.modif.initModifications = data.Number;
      }
      if (this.modif.pendingModifications != data.Number) {
        // log : modification change
        console.log('modificationmanager : CHANGE pending='
          + this.modif.pendingModifications + '->' + data.Number
          + ' /total=' + this.modif.initModifications
          + ' (mach=' + this.modif.machineid
          + ', kind=' + this.modif.kind + ', rev=' + this.modif.revisionid);
        //+ ',range=' + this.modif.ranges[0]; -> NO becausse range.toString is badly defined
        this.modif.pendingModifications = data.Number;
      }

      //  ALWAYS Send Message
      eventBus.EventBus.dispatchToAll('modificationEvent', this.modif);

      // Re-start timer
      if (data.Number == 0) { // No more modif
        // Kill me
        this._modificationManager.removeModification(this.modif.revisionid);
        // log : end of modification
        console.log('modificationmanager : END (mach=' + this.modif.machineid
          + ',kind=' + this.modif.kind + ',rev=' + this.modif.revisionid);
        //+ ',range=' + this.modif.ranges[0]; -> NO becausse range.toString is badly defined
      }
      else { // Continue modif
        setTimeout(function () {
          this._askWebService();
        }.bind(this), this._refreshRate);
      }
    }

    
    _getPendingModificationError (data) {
      if (this._possibleNbFails <= 0) {
        // Kill me
        this._modificationManager.removeModification(this.modif.revisionid);
      }
      else {
        this._possibleNbFails--;
        // Restart timer
        setTimeout(function () {
          this._askWebService();
        }.bind(this), this._refreshRate);
      }
    }
    /**
     * Web service - error OR fail
     * @param {!String} url 
     * @param {!Boolean} isTimeout, 
     * @param {!Object} xhrStatus 
     */
    _getPendingModificationFail (url, isTimeout, xhrStatus) {
      if (this._possibleNbFails <= 0) {
        // Kill me
        this._modificationManager.removeModification(this.modif.revisionid);
      }
      else {
        this._possibleNbFails--;
        // Restart timer
        setTimeout(function () {
          this._askWebService();
        }.bind(this), this._refreshRate);
      }
    }

  } // end class SingleModification


  class ModificationManagerComponent extends pulseComponent.PulseParamInitializedComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      self.methods = {
        addModification: self.addModification,
        getModifications: self.getModifications
      };

      // Map [revisionid] = SingleModification
      // How to use map : https://www.zendevs.xyz/les-nouveaux-objets-set-et-map-en-javascript-es6/
      self._mapOfModifications = new Map();

      return self;
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
    }

    initialize () {
      // Attributes
      // Listener and dispatchers

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create NO DOM -> revisionprogress... will display if needed

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      super.clearInitialization();
    }

    validateParameters () {
      // Additional checks with attribute param

      this.switchToNextContext();
    }

    displayError (message) {
      // Nothing
    }

    removeError () {
      // Nothing
    }

    /*
     * Add a modification to check - private method
     *
     * @param {!integer} revisionid - Id of the revision (access to modifications in database)
     * @param {!integer} kind - can be 'reason', 'MST', 'serialnumber'...
     * @param {!integer} machineid
     * @param {![pulseRange:Range]} arrayofpulseRange - Range of the modification
     * @returns {!Boolean} true = success
     */
    addModification (revisionid, kind, machineid, arrayOfPulseRanges) {
      let modif = {
        revisionid: revisionid,
        machineid: machineid,
        kind: kind,
        ranges: arrayOfPulseRanges,
        initModifications: undefined, // pending modifications the first time
        pendingModifications: undefined
      };
      let singleModif = new SingleModification(modif, this, this.getConfigOrAttribute('path', ''));
      this._mapOfModifications.set(revisionid, singleModif);
      return true;
    }

    /**
     * Remove a modification 
     *
     * @param {!integer} revisionid - Id of the revision (access to modifications in database)
     * @returns {!Boolean} true = success
     */
    removeModification (revisionid) {
      this._mapOfModifications.delete(revisionid);
      return true;
    }

    /**
     * Get existing modifications
     *
     * @param {!integer} kind - can be 'reason', 'mos', 'serialnumber'...
     * @param {!integer} machineid
     * @param {!pulseRange:Range} range - optional range (modif.ranges[i] should be included in this range)
     * @returns {!Object} list of modifications
     */
    getModifications (kind, machineid, range) {
      let returnedMap = new Map();

      for (let modif of this._mapOfModifications) {
        if ((modif[1].modif.kind == kind)
          && (modif[1].modif.machineid == machineid)) {
          let addModif = false;
          for (let i = 0; i < modif[1].modif.ranges.length; i++) {
            if ((pulseUtility.isNotDefined(range)
              || !(pulseRange.intersects(modif[1].modif.ranges[i], range)).isEmpty())) {
              addModif = true;
            }
          }
          if (addModif)
            returnedMap.set(modif[0], modif[1].modif);
        }
      }
      return returnedMap;
    }

    // Callback events
    /**
     * Event callback in case a config is updated: (re-)start the component
     *
     * @param {*} event
     */
    onConfigChange (event) {
      // Default = do nothing
    }
  }

  pulseComponent.registerElement('x-modificationmanager', ModificationManagerComponent);
})();
