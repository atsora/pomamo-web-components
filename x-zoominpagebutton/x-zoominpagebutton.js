// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
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
   * `<x-zoominpagebutton>` — icon button that drills down from a tile
   * into one of its sub-groups.
   *
   * Fetches `Machine/GroupZoomIn?GroupId=<group>&Details=true` to decide
   * whether the button is shown: hidden when the group is dynamic
   * (`Dynamic === true`) or has no children, shown otherwise. Clicking
   * navigates to the current URL with the picked group as the `group`
   * query parameter, clearing the `machine` parameter and pushing the
   * previously-selected group as the next `ancestor<N>` parameter (the
   * ancestor is the picked group itself when it was part of the previous
   * selection, otherwise the first id of that selection).
   *
   * @element x-zoominpagebutton
   * @attr {string} group      target group id to zoom into
   * @attr {number} machine-id fallback when `group` is absent
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
      this.element.replaceChildren();

      // Create DOM - Content
      this._content = document.createElement('div');
      this._content.className = 'zoom-in-page';
      this.element.appendChild(this._content);
      // Create DOM - Loader - Not useful
      // Create DOM - message for error - Not useful

      // Color :
      pulseSvg.inlineBackgroundSvg(this._content);

      // Tooltip
      //this._content.setAttribute('tooltip', 'group details');
      pulseUtility.addToolTip(this._content, 'group details');

      // Click: drill into newgroupid, appending the previously-selected
      // group as the next ancestor.
      this._content.addEventListener('click', (e) => {
        let url = window.location.href;
        let newgroupid = this.element.getAttribute('group');
        let currentgroupids = pulseConfig.getArray('group');

        url = pulseUtility.removeURLParameter(url, 'group');
        url = pulseUtility.changeURLParameter(url, 'machine', '');

        if (url.includes('?')) url += '&';
        else url += '?';
        url += 'group=' + newgroupid;

        let ancestorNb = 1;
        while (url.includes('ancestor' + ancestorNb)) {
          ancestorNb++;
        }
        // When zooming on a tile that is itself one of the currently selected
        // groups (drill-in on a multi-selection sibling, or self-zoom on the
        // single selection), the ancestor must be that group, not the first
        // of the selection — otherwise multi-select [A, ALL] + zoom on ALL
        // would wrongly produce ancestor=A.
        let ancestorValue = currentgroupids.includes(newgroupid)
          ? newgroupid
          : currentgroupids[0];
        url += '&ancestor' + ancestorNb + '=' + ancestorValue;

        window.location.href = url;
      });

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
        this._content.style.display = 'none';
      }
      else {
        if (data.Children.length == 0)
          this._content.style.display = 'none';
        else
          this._content.style.display = '';
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
