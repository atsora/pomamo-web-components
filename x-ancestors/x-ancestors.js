// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

import * as pulseComponent from 'pulsecomponent';
import * as pulseUtility from 'pulseUtility';
import * as pulseSvg from 'pulseSvg';
import * as pulseConfig from 'pulseConfig';

import 'x-machinedisplay/x-machinedisplay';

(function () {

  /**
   * `<x-ancestors>` — breadcrumb navigation bar for the group hierarchy.
   *
   * Reads `ancestor1`, `ancestor2`, … from the URL (group ids) plus the current
   * `group` config and renders a chain of links. `ancestor1` is the home link with
   * an inlined SVG icon; `ancestor2+` are links each wrapping an `<x-machinedisplay>`;
   * the final element is the current group, rendered as non-clickable text — or as
   * a re-clickable link at root level for a reload effect. Each generated href
   * rewrites the URL with that ancestor as `group=` and accumulates `ancestorN=`
   * params for upstream context.
   *
   * @element x-ancestors
   * @attr {string} group       current group id (final element display)
   * @attr {string} ancestor1   root group id (home icon link)
   * @attr {string} ancestor2…  intermediate group ids (breadcrumb links)
   * @attr {string} AppContext  forwarded into every generated link
   * @extends pulseComponent.PulseInitializedComponent
   */
  class AncestorsComponent extends pulseComponent.PulseInitializedComponent {
    /**
     * @param {...any} args
     */
    constructor(...args) {
      const self = super(...args);
      self._content = undefined;
      return self;
    }

    initialize () {
      this.addClass('pulse-text');
      this.element.replaceChildren();
      this._content = document.createElement('div');
      this._content.className = 'ancestors-content';
      this.element.appendChild(this._content);

      let baseUrl = window.location.href.split('?')[0];
      let appContext = pulseUtility.getURLParameter(window.location.href, 'AppContext');
      let baseParams = '';
      if (appContext) baseParams += 'AppContext=' + appContext + '&';

      // Fetching current group for comparison
      let currentGroup = this.getConfigOrAttribute('group', '');

      // Read ancestors directly from URL (not pulseConfig) to avoid stale
      // page-specific localStorage values (e.g. when home click strips ancestor1
      // from URL but localStorage still has it).
      let ancestorNb = 1;
      let ancestorVal = pulseUtility.getURLParameter(window.location.href, 'ancestor' + ancestorNb) || '';
      let accumulatedAncestorsQuery = '';

      while ('' != ancestorVal) {
        // Do not break when ancestorVal == currentGroup: self-referencing URLs
        // like ?group=X&ancestor1=X are intentional (drill-in to view a group's
        // children) and must render both the home link for X and X as the final
        // current-group name.

        let divMachine = document.createElement('a');
        divMachine.className = 'ancestors-machine-div ancestors-' + ancestorNb;

        let href = baseUrl + '?' + baseParams + accumulatedAncestorsQuery + 'group=' + ancestorVal;
        divMachine.setAttribute('href', href);

        if (ancestorNb > 1) {
          let xtag = pulseUtility.createElementWithAttribute('x-machinedisplay', {
            'group': ancestorVal
          });
          divMachine.appendChild(xtag);
        }
        this._content.appendChild(divMachine);

        if (ancestorNb == 1) pulseSvg.inlineBackgroundSvg(divMachine);

        accumulatedAncestorsQuery += 'ancestor' + ancestorNb + '=' + ancestorVal + '&';
        ancestorNb++;
        ancestorVal = pulseUtility.getURLParameter(window.location.href, 'ancestor' + ancestorNb) || '';
      }

      // --- Final element (current group) ---

      let divMachine;

      // If it's level 1 (Home), we want it to remain a clickable link
      // to allow "reloading" the root page even if we're already there.
      if (ancestorNb == 1) {
        divMachine = document.createElement('a');
        // Link points to current group (reload effect)
        let href = baseUrl + '?' + baseParams + 'group=' + currentGroup;
        divMachine.setAttribute('href', href);
      }
      else {
        // For levels > 1, the last element remains non-clickable text
        divMachine = document.createElement('div');
      }

      divMachine.className = 'ancestors-machine-div ancestors-' + ancestorNb;

      this._content.appendChild(divMachine);

      if (ancestorNb == 1) {
        pulseSvg.inlineBackgroundSvg(divMachine);
      }
      else {
        let xtag = pulseUtility.createElementWithAttribute('x-machinedisplay', {
          'group': currentGroup
        });
        divMachine.appendChild(xtag);
      }

      this.switchToNextContext();
    }
  }

  pulseComponent.registerElement('x-ancestors', AncestorsComponent, []);
})();
