// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseSvg = require('pulseSvg');
var pulseConfig = require('pulseConfig');

require('x-machinedisplay/x-machinedisplay');

(function () {

  /**
   * `<x-ancestors>` — breadcrumb navigation bar for group hierarchy.
   *
   * Reads `ancestor1`, `ancestor2`, ... config/attributes (group IDs) and the current
   * `group` config to build a series of clickable breadcrumb links. Each link navigates
   * to the page with that ancestor as the `group` parameter, preserving accumulated
   * ancestor context in the URL query string.
   *
   * Rendering rules:
   *  - `ancestor1` (level 1 / home): rendered as an `<a>` with an SVG icon (no x-machinedisplay).
   *  - `ancestor2+`: rendered as `<a>` elements containing `<x-machinedisplay>` tags.
   *  - The final element (current group, when not at root): rendered as a non-clickable `<div>`
   *    with an `<x-machinedisplay>` inside.
   *  - If at root level (ancestorNb == 1): final element is a re-clickable `<a>` (reload effect).
   *  - Self-referencing URLs (?group=X&ancestor1=X), produced by drill-in zooms on a container
   *    group, render both the home link for X and the non-clickable X name.
   *
   * Attributes/Configs:
   *   group       - current group id (used for comparison and final element display)
   *   ancestor1   - root group id (home icon)
   *   ancestor2+  - intermediate group ids (x-machinedisplay breadcrumb links)
   *   AppContext  - passed through to all generated links
   *
   * @extends pulseComponent.PulseParamInitializedComponent
   */
  class AncestorsComponent extends pulseComponent.PulseParamInitializedComponent {
    /**
     * @param {...any} args
     */
    constructor(...args) {
      const self = super(...args);
      self._content = undefined;
      return self;
    }

    /**
     * Builds the breadcrumb DOM by iterating `ancestor1`, `ancestor2`, ... configs.
     * Appends the final current-group element as non-clickable (or re-clickable at root).
     */
    validateParameters () {}

    initialize () {
      this.addClass('pulse-text');
      $(this.element).empty();
      this._content = $('<div></div>').addClass('ancestors-content');
      $(this.element).append(this._content);

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
        // Note: we do not break when ancestorVal == currentGroup.
        // Self-referencing URLs like ?group=X&ancestor1=X are intentional
        // (e.g. drill-in to view a group's children on managementinformationterminal):
        // we still want to render X as the home link AND the current group name in the final block.

        let divMachine = $('<a></a>')
          .addClass('ancestors-machine-div')
          .addClass('ancestors-' + ancestorNb);

        let href = baseUrl + '?' + baseParams + accumulatedAncestorsQuery + 'group=' + ancestorVal;
        $(divMachine).attr('href', href);

        if (ancestorNb > 1) {
          let xtag = pulseUtility.createjQueryElementWithAttribute('x-machinedisplay', {
            'group': ancestorVal
          });
          divMachine.append(xtag);
        }
        $(this._content).append(divMachine);

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
        divMachine = $('<a></a>');
        // Link points to current group (reload effect)
        let href = baseUrl + '?' + baseParams + 'group=' + currentGroup;
        $(divMachine).attr('href', href);
      }
      else {
        // For levels > 1, the last element remains non-clickable text
        divMachine = $('<div></div>');
      }

      divMachine
        .addClass('ancestors-machine-div')
        .addClass('ancestors-' + ancestorNb);

      $(this._content).append(divMachine);

      if (ancestorNb == 1) {
        pulseSvg.inlineBackgroundSvg(divMachine);
      }
      else {
        let xtag = pulseUtility.createjQueryElementWithAttribute('x-machinedisplay', {
          'group': currentGroup
        });
        divMachine.append(xtag);
      }

      this.switchToNextContext();
    }
  }

  pulseComponent.registerElement('x-ancestors', AncestorsComponent, []);
})();
