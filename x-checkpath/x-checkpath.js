// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-checkpath
 * @requires module:pulseComponent
 */
var pulseComponent = require('pulsecomponent');
var pulseConfig = require('pulseConfig');
var eventBus = require('eventBus');

(function () {

  class CheckPathComponent extends pulseComponent.PulseParamSingleRequestComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      self._content = undefined;

      return self;
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
    }

    initialize () {
      this.addClass('pulse-nodisplay');

      //this.addClass('pulse-bigdisplay');

      // Create DOM - Loader (DO NOT REMOVE code => will be used once the global error message will display info)
      // To display BIG LOADING on the whole page - removed FOR THE MOMENT
      // DO NOT REMOVE THESE 2 LINES !!!
      /*let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this._content).append(loaderDiv);*/
      // Create DOM - Content
      //this._content = $('<div></div>').addClass('pulse-checkpath-content');

      // Listener

      // Initialization OK => switch to the next context
      this.switchToNextContext();
    }

    validateParameters () {
      // Additional checks with attribute param
     
      let skip = this.getConfigOrAttribute('skipWebServiceAddress', 'false');

      if ( skip == true || skip == 'true' ) {
        let mainpath = this.getConfigOrAttribute('mainpath', ''); // Probably ""
        if (mainpath != '') {
          // '/' at the end ?
          let lastChar = mainpath.charAt(mainpath.length - 1);
          if (lastChar != '/') {
            mainpath = mainpath + '/';
          }
          let oldpath = this.getConfigOrAttribute('path', '');
          if (oldpath != mainpath) { // Reload only if different, else endless reload at beginning when server is stopped.
            pulseConfig.setGlobal('path', mainpath); // SessionStorage
            // Warn all components to reload :
            eventBus.EventBus.dispatchToAll('pathChangeEvent', {});
          }
        }
        this.setError('Skip web service path');
      }
      else{
        this.switchToNextContext();
      }
    }

    // Overload to always refresh value
    get isVisible () {
      if (!this._connected) { // == is connected
        return false;
      }
      return true;
    }

    get url () {
      let mainpath = this.getConfigOrAttribute('mainpath', ''); // Probably ""
      if (mainpath == '') {
        let href = window.location.href;
        // Hack for local path (on dev computers)
        if ('file' == href.slice(0, 4)) {
          mainpath = 'https://localhost:5000/';
        }
        else {
          // Search in Page URL : http://lctr/RtdWebApp/...
          let posSlash = href.indexOf('/', 8);  // = more than 7<->length of http://
          if (posSlash != -1) {
            mainpath = href.slice(0, posSlash) + ':5001/'; // https://lctr:5001
            if ( mainpath.indexOf('https') != -1 ) {
              // path do not include 'https'
              if ( mainpath.startsWith('http') ) {
                // Add 's' after http
                mainpath = 'https' + mainpath.slice(4);
              }
            }
          }
        }
      }
      // '/' at the end ?
      let lastChar = mainpath.charAt(mainpath.length - 1);
      if (lastChar != '/') {
        mainpath += '/';
      }
      // Return the Web Service URL here
      return mainpath + 'WebServiceAddress/';
    }

    refresh (data) {
      let previousPath = this.getConfigOrAttribute('path', '');

      let secondarypath = data.Url;
      if (secondarypath.length > 1) {
        // '/' at the end ?
        let lastChar = secondarypath.charAt(secondarypath.length - 1);
        if (lastChar != '/') {
          secondarypath = secondarypath + '/';
        }
      }
      pulseConfig.setGlobal('path', secondarypath); // SessionStorage
      if (secondarypath != previousPath) {
        // Warn all components to reload :
        console.log('dispatch path change event');
        eventBus.EventBus.dispatchToAll('pathChangeEvent', {});
      }
    }

    manageError (data) {
      /* NO Message here, because it can happens if WebServiceAddress is badly configured
      var messageInfo = {
        'id': 'MAINPATH',
        'message': pulseConfig.pulseTranslate('check.PleaseCheckServerOrPath', 'Please check server access (or path)'),
        // Keep or mainpath here. Because it is probably linked to path when the message comes from here --RR
        'level': 'error',
        'time': 20 // seconds to display message
      };
      messageInfo.clickToClose = true;
      eventBus.EventBus.dispatchToAll('showMessageSignal',
        messageInfo);*/

      // In case of error, try to use mainpath defined in config
      let mainpath = this.getConfigOrAttribute('mainpath', ''); // Probably ""
      if (mainpath != '') {
        // '/' at the end ?
        let lastChar = mainpath.charAt(mainpath.length - 1);
        if (lastChar != '/') {
          mainpath = mainpath + '/';
        }
        let oldpath = this.getConfigOrAttribute('path', '');
        if (oldpath != mainpath) { // Reload only if different, else endless reload at beginning when server is stopped.
          pulseConfig.setGlobal('path', mainpath); // SessionStorage
          // Warn all components to reload :
          eventBus.EventBus.dispatchToAll('pathChangeEvent', {});
        }
      }

      super.manageError(data);
    }

    manageFailure (isTimeout, xhrStatus) {
      var messageInfo = {
        'id': 'PATH',
        'message': pulseConfig.pulseTranslate('check.PleaseCheckServerOrPath', 'Please check server access (or path)'),
        // Keep 'or path' here. Because it is probably linked to path when the message comes from here --RR
        'level': 'error',
        'time': 20 // seconds to display message
      };
      messageInfo.clickToClose = true;
      eventBus.EventBus.dispatchToAll('showMessageSignal',
        messageInfo);

      // In case of error, try to use mainpath defined in config
      let mainpath = this.getConfigOrAttribute('mainpath', ''); // Probably ""
      if (mainpath != '') {
        // '/' at the end ?
        let lastChar = mainpath.charAt(mainpath.length - 1);
        if (lastChar != '/') {
          mainpath = mainpath + '/';
        }
        let oldpath = this.getConfigOrAttribute('path', '');
        if (oldpath != mainpath) { // Reload only if different, else endless reload at beginning when server is stopped.
          pulseConfig.setGlobal('path', mainpath); // SessionStorage
          // Warn all components to reload :
          eventBus.EventBus.dispatchToAll('pathChangeEvent', {});
        }
      }

      super.manageFailure(isTimeout, xhrStatus);
    }
  }

  pulseComponent.registerElement('x-checkpath', CheckPathComponent);
})();
