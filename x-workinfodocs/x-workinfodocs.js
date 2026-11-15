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

/**
 * Kinds of work information that may have documents
 */
export const DOC_KINDS = ['Operation', 'Part', 'Component'];

/**
 * The operation and the part (or the component) of work informations of the web
 * service (`{ Kind, Value, Id }`), among the ones that have an `Id`
 *
 * @param {Array<{Kind: string, Value: string, Id: number}>} workinformations
 * @returns {{operation: Object, component: Object, lastIndex: number}} `lastIndex`: index
 *   of the last of them, -1 when none of them has an id
 */
export function findWorkInfoDocItems (workinformations) {
  let result = { operation: null, component: null, lastIndex: -1 };
  (workinformations || []).forEach((workinformation, index) => {
    if (!workinformation || !DOC_KINDS.includes(workinformation.Kind)
      || pulseUtility.isNotDefined(workinformation.Id)) {
      return;
    }
    if (workinformation.Kind == 'Operation') {
      result.operation = workinformation;
    }
    else {
      result.component = workinformation;
    }
    result.lastIndex = index;
  });
  return result;
}

/**
 * Set (or remove, with null) an attribute, only when it changes: a change of id
 * sends a new request
 */
function setAttributeIfChanged (element, name, value) {
  if (value === null) {
    if (element.hasAttribute(name)) {
      element.removeAttribute(name);
    }
  }
  else if (element.getAttribute(name) !== value) {
    element.setAttribute(name, value);
  }
}

/**
 * Update an x-workinfodocs (created when `docs` is not defined) for the operation and
 * the part (or component) of work informations of the web service
 *
 * @param {HTMLElement|undefined} docs - existing x-workinfodocs, to keep (no new request
 *   when the ids do not change)
 * @param {Object} items - result of findWorkInfoDocItems
 * @param {HTMLElement} [host] - component that displays it, to copy its `path` attribute
 * @returns {HTMLElement} the x-workinfodocs
 */
export function updateWorkInfoDocs (docs, items, host) {
  if (!docs) {
    docs = document.createElement('x-workinfodocs');
  }
  let operation = items.operation;
  let component = items.component;
  setAttributeIfChanged(docs, 'operation-id', operation ? String(operation.Id) : null);
  setAttributeIfChanged(docs, 'operation-display', operation ? (operation.Value || '') : null);
  setAttributeIfChanged(docs, 'component-id', component ? String(component.Id) : null);
  setAttributeIfChanged(docs, 'component-display', component ? (component.Value || '') : null);
  setAttributeIfChanged(docs, 'component-kind', component ? component.Kind : null);
  if (host && host.hasAttribute('path')) {
    setAttributeIfChanged(docs, 'path', host.getAttribute('path'));
  }
  return docs;
}

/**
 * Put an x-workinfodocs at the right of the text of a cell: the text goes into a span
 * `workinfodocs-value`, that keeps its '...' when the cell is too narrow, and the cell
 * gets the class `workinfodocs-cell` (see x-workinfodocs.less)
 *
 * @param {HTMLElement} cell
 * @param {HTMLElement} docs - x-workinfodocs
 */
export function appendWorkInfoDocsToCell (cell, docs) {
  let text = document.createElement('span');
  text.className = 'workinfodocs-value';
  text.append(...cell.childNodes);
  cell.classList.add('workinfodocs-cell');
  cell.append(text, docs);
}

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
