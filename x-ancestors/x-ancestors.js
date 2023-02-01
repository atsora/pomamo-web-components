// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-ancestors
 * @requires module:pulseComponent
 */

var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseSvg = require('pulseSvg');

require('x-machinedisplay/x-machinedisplay');

/**
 * Build a custom tag <x-ancestors> with no attribute
 */
(function () {

  class AncestorsComponent extends pulseComponent.PulseParamInitializedComponent {
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

    /*attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
    }*/

    initialize () {
      this.addClass('pulse-text');

      // Attributes

      // Listener and dispatchers

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>').addClass('ancestors-content');
      $(this.element).append(this._content);

      // Create link(s) - remove all ancestors and groups
      let link = window.location.href;
      link = pulseUtility.removeURLParameter(link, 'group');
      link = pulseUtility.removeURLParameterContaining(link, 'ancestor');
      link = pulseUtility.changeURLParameter(link, 'machine', '');

      // Find ancestor(s)
      let ancestorNb = 1;
      let ancestor = this.getConfigOrAttribute(('ancestor' + ancestorNb), '');
      while ('' != ancestor) {
        let divMachine = $('<a></a>').addClass('ancestors-machine-div')
          .addClass('ancestors-' + ancestorNb);
        // Link to same page with less ancestors + group
        if (link.includes('?')) {
          // only group is in selection, hope next page will use group only (and not machines)
          $(divMachine).attr('href', link + '&group=' + ancestor);
        }
        else {
          // only group is in selection, hope next page will use group only (and not machines)
          $(divMachine).attr('href', link + '?group=' + ancestor);
        }

        if (ancestorNb > 1) {
          let xtag = pulseUtility.createjQueryElementWithAttribute('x-machinedisplay', {
            'group': ancestor
          });
          divMachine.append(xtag);
        }

        $(this._content).append(divMachine);

        if (ancestorNb == 1) {
          // First link == home
          pulseSvg.inlineBackgroundSvg(divMachine);
        }

        // Prepare next links : Add ancestor in link
        if (link.includes('?')) {
          link += '&ancestor' + ancestorNb + '=' + ancestor;
        }
        else {
          link += '?ancestor' + ancestorNb + '=' + ancestor;
        }
        ancestorNb++;
        ancestor = this.getConfigOrAttribute(('ancestor' + ancestorNb), '');
      }

      // Add last 'group' or machine == MAIN title
      let divMachine = $('<div></div>').addClass('ancestors-machine-div')
        .addClass('ancestors-' + ancestorNb);
      $(this._content).append(divMachine);
      //// Add NO link
      //// Add home display or main title
      if (ancestorNb == 1) {
        // First link == home
        pulseSvg.inlineBackgroundSvg(divMachine);
      }
      else { // if (ancestorNb > 1) { main title
        let xtag = pulseUtility.createjQueryElementWithAttribute('x-machinedisplay', {});
        divMachine.append(xtag);
      }

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

  }

  pulseComponent.registerElement('x-ancestors', AncestorsComponent, []);
})();
