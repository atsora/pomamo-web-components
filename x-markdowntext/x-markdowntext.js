// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-markdowntext
 * @requires module:pulseComponent
 */

var pulseComponent = require('pulsecomponent');
//var pulseUtility = require('pulseUtility');

(function () {

  class markDownTextComponent extends pulseComponent.PulseInitializedComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      self.methods = {
        setText: self.setText // used by reporting
      };

      // DOM - not here
      self._content = undefined;

      return self;
    }

    setText (textToDisplay) {
      $(this._content).empty();

      if (textToDisplay == null) {
        console.warn('Please FILL markdown text ! ');
      }
      else {
        // See use here : https://www.npmjs.com/package/markdown-it
        var MarkdownIt = require('markdown-it');
        let md = new MarkdownIt();
        let result = md.render(textToDisplay);

        $(this._content).append(
          $('<div></div>').addClass('markdowntext-maindiv').html(result)
        );
      }
    }

    //get content () { return this._content; } // Optional

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      /*
      switch (attr) {
        case 'machine-id':
          break;
        default:
          break;
      }
      */
    }

    initialize () {
      this.addClass('pulse-text'); // Mandatory for loader

      // Update here some internal parameters

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>').addClass('markdowntext-content');
      $(this.element).append(this._content);

      // Create DOM - NO Loader / No message

      // listeners/dispatchers / None

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      $(this.element).empty();

      //this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

  }

  pulseComponent.registerElement('x-markdowntext', markDownTextComponent, []);
})();
