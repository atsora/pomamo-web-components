// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseSvg = require('pulseSvg');
var pulseConfig = require('pulseConfig');

require('x-machinedisplay/x-machinedisplay');

(function () {
  class AncestorsComponent extends pulseComponent.PulseParamInitializedComponent {
    constructor(...args) {
      const self = super(...args);
      self._content = undefined;
      return self;
    }

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
