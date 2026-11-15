// Copyright (C) 2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-workinfodocs
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */
import * as pulseComponent from 'pulsecomponent';
import * as pulseUtility from 'pulseUtility';

(function () {

  // Font Awesome Free 6.7.2 book (CC BY 4.0), see the LICENSE of pomamo-web-app
  const BOOK_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" aria-hidden="true"><path fill="currentColor" d="M96 0C43 0 0 43 0 96L0 416c0 53 43 96 96 96l288 0 32 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l0-64c17.7 0 32-14.3 32-32l0-320c0-17.7-14.3-32-32-32L384 0 96 0zm0 384l256 0 0 64L96 448c-17.7 0-32-14.3-32-32s14.3-32 32-32zm32-240c0-8.8 7.2-16 16-16l192 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-192 0c-8.8 0-16-7.2-16-16zm16 48l192 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-192 0c-8.8 0-16-7.2-16-16s7.2-16 16-16z"/></svg>';

  /**
   * `<x-workinfodocs>` — book button that opens the documents of an operation and/or
   * of a part (or a component), displayed only when at least one document is attached
   * to them.
   *
   * Sends `Doc/WorkInfoDocCount?OperationId=<id>&ComponentId=<id>` once, when it starts
   * and each time `operation-id` or `component-id` changes (no periodic refresh: the
   * operation of a machine rarely changes, and the web service caches the answer). The
   * host gets the class `workinfodocs-visible` when `DocCount` > 0, else it stays hidden,
   * also on an error (the button is only a shortcut: an older web service without this
   * service shows nothing).
   *
   * A click dispatches the window event `atsora:open-workinfo-docs`
   * (`detail: { items: [{ kind, id, display }] }`), that vue_bridge.js of the web app
   * handles: it opens the documents dialog of the Vue app (atracking-opexplorer).
   *
   * Moved in the DOM by its parent (x-lastworkinformation puts it in the cell of the
   * work information): it carries the class `disableDeleteWhenDisconnect`.
   *
   * @element x-workinfodocs
   * @attr {number} operation-id      id of the operation (its active revision carries the documents)
   * @attr {number} component-id      id of the component, or of the part (same id)
   * @attr {string} operation-display display name of the operation, for the dialog
   * @attr {string} component-display display name of the part or component, for the dialog
   * @attr {string} component-kind    `Part` (default) or `Component`, for the dialog
   * @extends pulseComponent.PulseParamAutoPathSingleRequestComponent
   */
  class WorkInfoDocsComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
    constructor(...args) {
      const self = super(...args);

      // DOM -> never in constructor
      self._button = undefined;

      return self;
    }

    get content () { return this._button; }

    _hasId (attr) {
      return this.element.hasAttribute(attr) && pulseUtility.isInteger(Number(this.element.getAttribute(attr)))
        && (this.element.getAttribute(attr) !== '');
    }

    _setVisible (visible) {
      this.element.classList.toggle('workinfodocs-visible', visible);
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'operation-id':
        case 'component-id':
          if ((oldVal !== newVal) && this.isInitialized()) {
            this._setVisible(false);
            this.start();
          }
          break;
        default:
          break;
      }
    }

    initialize () {
      this.element.classList.add('disableDeleteWhenDisconnect');

      // In case of clone, need to be empty
      this.element.replaceChildren();

      this._button = document.createElement('button');
      this._button.type = 'button';
      this._button.className = 'workinfodocs-button';
      this._button.title = this.getTranslation('documents', 'Documents');
      this._button.setAttribute('aria-label', this._button.title);
      this._button.innerHTML = BOOK_ICON;
      this._button.addEventListener('click', this._open.bind(this));
      this.element.appendChild(this._button);

      this._setVisible(false);
      this.switchToNextContext();
    }

    clearInitialization () {
      this.element.replaceChildren();
      this._button = undefined;
      this._setVisible(false);

      super.clearInitialization();
    }

    reset () {
      this._setVisible(false);
      this.switchToNextContext();
    }

    validateParameters () {
      if (!this._hasId('operation-id') && !this._hasId('component-id')) {
        // Nothing to look for: hidden, without any message
        this.switchToKey('Error', () => this.displayError(''), () => this.removeError());
        return;
      }

      this.switchToNextContext();
    }

    displayError (message) {
      this._setVisible(false);
    }

    removeError () {
    }

    getShortUrl () {
      let parameters = [];
      if (this._hasId('operation-id')) {
        parameters.push('OperationId=' + this.element.getAttribute('operation-id'));
      }
      if (this._hasId('component-id')) {
        parameters.push('ComponentId=' + this.element.getAttribute('component-id'));
      }
      return 'Doc/WorkInfoDocCount?' + parameters.join('&');
    }

    refresh (data) {
      this._setVisible((data != null) && (Number(data.DocCount) > 0));
    }

    /**
     * The work informations of the dialog: the operation first, then the part
     *
     * @returns {Array<{kind: string, id: string, display: string}>}
     */
    _items () {
      let items = [];
      if (this._hasId('operation-id')) {
        items.push({
          kind: 'Operation',
          id: this.element.getAttribute('operation-id'),
          display: this.element.getAttribute('operation-display') || ''
        });
      }
      if (this._hasId('component-id')) {
        items.push({
          kind: this.element.getAttribute('component-kind') || 'Part',
          id: this.element.getAttribute('component-id'),
          display: this.element.getAttribute('component-display') || ''
        });
      }
      return items;
    }

    _open (event) {
      event.stopPropagation();
      let items = this._items();
      if (items.length > 0) {
        window.dispatchEvent(new CustomEvent('atsora:open-workinfo-docs', { detail: { items: items } }));
      }
    }
  }

  pulseComponent.registerElement('x-workinfodocs', WorkInfoDocsComponent,
    ['operation-id', 'component-id', 'operation-display', 'component-display', 'component-kind']);
})();
