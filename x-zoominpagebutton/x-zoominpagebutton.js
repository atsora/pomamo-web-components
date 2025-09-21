// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-zoominpagebutton
 * @requires module:pulseComponent
 */
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseConfig = require('pulseConfig');
var pulseSvg = require('pulseSvg');

(function () {

  class ZoomInPageButtonComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
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

    //get content () { return this._content; } // Optional

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        default:
          break;
      }
    }

    initialize () {
      this.addClass('pulse-icon');

      // Listener and dispatchers

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>').addClass('zoom-in-page');
      $(this.element).append(this._content);
      // Create DOM - Loader - Not useful
      // Create DOM - message for error - Not useful

      // Color :
      pulseSvg.inlineBackgroundSvg(this._content);

      // Tooltip
      //this._content.attr('tooltip', 'group details');
      pulseUtility.addToolTip(this._content, 'group details');

      // Click
      $(this._content).click(
        function (e) {
          // Go to same page with new groupid
          let url = window.location.href;
          let newgroupid = $(this.element).attr('group');
          let currentgroupids = pulseConfig.getArray('group')//pulseUtility.getURLParameterValues(url, 'group'); == not enough
          // Remove current group
          url = pulseUtility.removeURLParameter(url, 'group');
          // Remove machine, because not known
          url = pulseUtility.changeURLParameter(url, 'machine', '');
          // Add new group
          if (url.includes('?')) url += '&';
          else url += '?';
          url += 'group=' + newgroupid;
          // Manage ancestor(s)
          let ancestorNb = 1;
          while (url.includes('ancestor' + ancestorNb)) {
            ancestorNb++;
          }
          url += '&ancestor' + ancestorNb + '=' + currentgroupids[0];
          // Display new page
          window.location.href = url;

        }.bind(this));

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    validateParameters () {
      if (!this.element.hasAttribute('group')) {
        // machine-id
        if (!this.element.hasAttribute('machine-id')) {
          this.setError('missing machine-id'); // delayed error message
          return;
        }
      }

      this.switchToNextContext();
    }

    getShortUrl () {
      // Return the Web Service URL here without path
      let group = this.getConfigOrAttribute('group');
      let url = 'Machine/GroupZoomIn?GroupId=' + group;
      url += '&Details=true'; // WARNING ! Maybe remove (bug in web service) --201907
      return url;
    }

    refresh (data) {
      // Change visibility
      if (true == data.Dynamic) {
        // Hide for the moment -- 202001
        $(this._content).hide();
      }
      else {
        if (data.Children.length == 0)
          $(this._content).hide();
        else
          $(this._content).show();
      }
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

  pulseComponent.registerElement('x-zoominpagebutton', ZoomInPageButtonComponent);
})();
