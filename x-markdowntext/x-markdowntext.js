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

  /**
   * `<x-markdowntext>` — renders a Markdown string as HTML.
   *
   * Imperative API only: there is no HTML attribute and no AJAX. Calling
   * `setText(md)` clears the content and re-renders the parsed result of
   * `markdown-it` (loaded lazily on first call) into
   * `.markdowntext-maindiv`. Passing `null` logs a warning and leaves the
   * container empty.
   *
   * @element x-markdowntext
   * @method setText writes a Markdown string into the component
   * @extends pulseComponent.PulseInitializedComponent
   */
  class markDownTextComponent extends pulseComponent.PulseInitializedComponent {
    /**
     * @param {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      self.methods = {
        setText: self.setText
      };

      // DOM
      self._content = undefined;

      return self;
    }

    /**
     * Renders Markdown text into the component content div.
     * Uses `markdown-it` to parse and render the input string.
     * Clears any previous content before rendering.
     *
     * @param {string|null} textToDisplay - Markdown string, or null (logs a warning).
     */
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
