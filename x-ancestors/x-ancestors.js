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
   *  - Loop stops when an ancestor value matches the current `group` config.
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
     * Stops when an ancestor equals the current `group` or when no more ancestors exist.
     * Appends the final current-group element as non-clickable (or re-clickable at root).
     */
    initialize () {
      this.addClass('pulse-text');
      $(this.element).empty();
      this._content = $('<div></div>').addClass('ancestors-content');
      $(this.element).append(this._content);

      let baseUrl = window.location.href.split('?')[0];
      let appContext = pulseUtility.getURLParameter(window.location.href, 'AppContext');
      let baseParams = '';
      if (appContext) baseParams += 'AppContext=' + appContext + '&';

      // Récupération du groupe actuel pour comparaison
      let currentGroup = this.getConfigOrAttribute('group', '');

      let ancestorNb = 1;
      let ancestorVal = this.getConfigOrAttribute(('ancestor' + ancestorNb), '');
      let accumulatedAncestorsQuery = '';

      while ('' != ancestorVal) {
        // Si l'ancêtre est égal au groupe actuel, on arrête la boucle
        // On affichera cet élément dans le bloc "Final" ci-dessous
        if (ancestorVal == currentGroup) {
          break;
        }

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
        ancestorVal = this.getConfigOrAttribute(('ancestor' + ancestorNb), '');
      }

      // --- ÉLÉMENT FINAL (Groupe Actuel) ---

      let divMachine;

      // MODIFICATION ICI :
      // Si c'est le niveau 1 (Home), on veut que ça reste un lien cliquable
      // pour permettre de "recharger" la page racine même si on y est déjà.
      if (ancestorNb == 1) {
        divMachine = $('<a></a>');
        // Le lien pointe vers le groupe actuel (effet de reload)
        let href = baseUrl + '?' + baseParams + 'group=' + currentGroup;
        $(divMachine).attr('href', href);
      }
      else {
        // Pour les niveaux > 1, le dernier élément reste du texte non cliquable
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
        let xtag = pulseUtility.createjQueryElementWithAttribute('x-machinedisplay', {});
        divMachine.append(xtag);
      }

      this.switchToNextContext();
    }
  }

  pulseComponent.registerElement('x-ancestors', AncestorsComponent, []);
})();
