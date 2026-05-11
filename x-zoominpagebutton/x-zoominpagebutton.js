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

  /**
   * `<x-zoominpagebutton>` — icon button that drills down into a sub-group.
   *
   * Fetches `Machine/GroupZoomIn?GroupId=...` to check if the group has children.
   * Hidden if the group is dynamic or has no children; shown otherwise.
   * On click, navigates to the same page with the target group as `group` parameter,
   * pushing the current group as an `ancestorN` parameter.
   *
   * Attributes:
   *   group      - target group id to zoom into
   *   machine-id - fallback if no `group` attribute
   *
   * @extends pulseComponent.PulseParamAutoPathSingleRequestComponent
   */
  class ZoomInPageButtonComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
    /**
     * @param {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      // DOM
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
          let url = window.location.href;
          let newgroupid = $(this.element).attr('group');
          let currentgroupids = pulseConfig.getArray('group');

          // Focus mode: clicking zoom-in on a currently selected group (single drill-in
          // or one element of a multi-selection comparison) drops the comparison and
          // starts a fresh ancestor chain rooted at newgroupid.
          let isFocusOnSelection = currentgroupids.includes(newgroupid);

          url = pulseUtility.removeURLParameter(url, 'group');
          url = pulseUtility.changeURLParameter(url, 'machine', '');
          if (isFocusOnSelection) {
            url = pulseUtility.removeURLParameterContaining(url, 'ancestor');
          }

          if (url.includes('?')) url += '&';
          else url += '?';
          url += 'group=' + newgroupid;

          if (isFocusOnSelection) {
            url += '&ancestor1=' + newgroupid;
          }
          else {
            // Continue chain: append currentgroupids[0] as next ancestor.
            // Note: after a drill-in (ancestor1=X), continuing to a child produces
            // ancestor1=X&ancestor2=X — this looks duplicated in the URL but is
            // intentional: ancestor1 renders as the home icon (no name) and
            // ancestor2 renders the X machinedisplay name in the breadcrumb.
            let ancestorNb = 1;
            while (url.includes('ancestor' + ancestorNb)) {
              ancestorNb++;
            }
            url += '&ancestor' + ancestorNb + '=' + currentgroupids[0];
          }

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
          this.setError(this.getTranslation('error.selectMachine', 'Please select a machine')); // delayed error message
          return;
        }
      }

      this.switchToNextContext();
    }

    /**
     * REST endpoint: `Machine/GroupZoomIn?GroupId=<group>&Details=true`
     *
     * @returns {string} Short URL without base path.
     */
    getShortUrl () {
      let group = this.getConfigOrAttribute('group');
      let url = 'Machine/GroupZoomIn?GroupId=' + group;
      url += '&Details=true'; // WARNING ! Maybe remove (bug in web service) --201907
      return url;
    }

    /**
     * Shows the button only if the group has static children.
     * Dynamic groups and empty groups keep the button hidden.
     *
     * @param {{ Dynamic: boolean, Children: Array }} data
     */
    refresh (data) {
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
