// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

'use strict';

/**
 * @module pulseComponent
 * @requires module:pulseConfig
 * @requires module:pulseService
 * @requires module:eventBus
 */
var pulseConfig = require('pulseConfig');
var pulseLogin = require('pulseLogin');
var pulseService = require('pulseService');
var pulseUtility = require('pulseUtility');
var state = require('state');
var eventBus = require('eventBus');

/**
 * Base class for any web component 
 */
class WebComponent { // extends HTMLElement if customElements.define is used directly
  /**
   * Constructor
   *
   * @param  {Element} element - DOM element 
   */
  constructor(element) {
    this.methods = {};
    this._element = element;
  }

  /**
   * Associated DOM element
   *
   * @return {Element} element
   */
  get element () {
    return this._element;
  }

  /**
   * Callback that is called  when the custom element is connected to the DOM document
   */
  connectedCallback () {
  }

  /**
   * Callback that is called when the custom element is disconnected from the DOM document
   * return true if DOM should be destroyed and will never come again
   */
  disconnectedCallback () {
    return true;
  }

  /**
   * attribute changed callback for x-tag or custom element
   *
   * @param {string} attr - Name of the attribute
   * @param {string} oldVal - Old attribute value
   * @param {string} newVal - New attribute value
   */
  attributeChangedCallback (attr, oldVal, newVal) {
  }
}

/**
 * This class represents a super-class of all Pulse components.
 * 
 * @extends module:pulseComponent~WebComponent
 */
class PulseComponent extends WebComponent {
  /**
   * Constructor
   *
   * @param  {...any} args 
   */
  constructor(...args) {
    const self = super(...args);
    self._connected = false;
    self._connectedOnce = false;
    return self;
  }

  /**
   * Is the associated custom element connected to the DOM document ?
   *
   * @return {boolean} connected
   */
  get connected () {
    return this._connected;
  }

  /**
   * Has the associated custom element been connected once to the DOM document ?
   *
   * @return {boolean} connectedOnce
   */
  get connectedOnce () {
    return this._connectedOnce;
  }

  /**
   * Callback that is called  when the custom element is connected to the DOM document
   */
  connectedCallback () {
    super.connectedCallback();
    this._connected = true;
    this._connectedOnce = true;
  }

  /**
   * Callback that is called when the custom element is disconnected from the DOM document
   * return true if DOM should be destroyed and will never come again
   */
  disconnectedCallback () {
    this._connected = false;
    return super.disconnectedCallback();
  }

  /**
   * attribute changed callback for x-tag or custom element
   *
   * @param {string} attr - Name of the attribute
   * @param {string} oldVal - Old attribute value
   * @param {string} newVal - New attribute value
   */
  attributeChangedCallback (attr, oldVal, newVal) {
    if (this._connectedOnce) {
      this.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
    }
  }

  /**
   * attribute changed callback for x-tag or custom element only when the component has already been connected once
   *
   * @param {string} attr - Name of the attribute
   * @param {string} oldVal - Old attribute value
   * @param {string} newVal - New attribute value
   */
  attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
  }

  /**
   * Get some information on the web component instance, including its id and class if they are defined
   *
   * @return {string} Infos on component instance
   */
  getInfo () {
    let str = 'undefined';
    if (this.element != null) {
      str = this.element.tagName;
      if (this.element.hasAttribute('id')) {
        str += `[id:${this.element.getAttribute('id')}]`;
      }
      if (this.element.hasAttribute('class')) {
        str += `[class:${this.element.getAttribute('class')}]`;
      }
    }
    else {
      str += ' this.element;'
      console.warn('component.getInfo: this.element is null. Should never happen. Excepted when removed');
    }
    return str;
  }

  /**
   * Add a css class
   *
   * @param {string} cssClass - Name of the CSS class
   */
  addClass (cssClass) {
    $(this.element).addClass(cssClass);
  }

  /**
   * Remove a css class
   *
   * @param {string} cssClass - Name of the CSS class
   */
  removeClass (cssClass) {
    $(this.element).removeClass(cssClass);
  }

  /**
   * Get translation
   *
   * @param {string} key - config Key (ex: 'tag.threshold')
   * @param {*} defaultValue - default value in case nothing in found in attribute or pulseConfig
   * @returns {*} Configuration or attribute value
   */
  getTranslation (key, defaultValue) {
    // TODO : Catch exception + log + return default
    let translation = PULSE_COMPONENT_TRANSLATION;
    if (!pulseUtility.isNotDefined(translation)) {
      let nameTag = '';
      if (!pulseUtility.isNotDefined(this.element)) {
        nameTag = this.element.tagName.toLowerCase();
        if (0 == nameTag.indexOf('x-')) {
          nameTag = nameTag.substring(2);
        }
      }
      if ((pulseUtility.isNotDefined(key)) || (key === '')) {
        translation = translation[nameTag];
      }
      else {
        let listOfKeys = key.split('.');
        //toFind = translation[nameTag][keyS];
        translation = translation[nameTag];
        if ((!pulseUtility.isNotDefined(translation)) && (translation !== '')) {
          for (let i = 0; i < listOfKeys.length; i++) {
            translation = translation[listOfKeys[i]];
            if ((pulseUtility.isNotDefined(translation)) || (translation === '')) {
              //debugger;
              break;
            }
          }
        }
        if (pulseUtility.isNotDefined(translation)) {
          // toFind = translation[keyS];
          translation = PULSE_COMPONENT_TRANSLATION;
          for (let i = 0; i < listOfKeys.length; i++) {
            translation = translation[listOfKeys[i]];
            if ((pulseUtility.isNotDefined(translation))
              || (translation === '')) {
              //debugger;
              break;
            }
          }
        }
      }
    }

    if (pulseUtility.isNotDefined(translation)) {
      // TODO alert if debug mode
      //debugger;
      return defaultValue;
    }
    else {
      return translation;
    }
  }

  /**
   * Get config or attribute (if any attribute overload config)
   *
   * @param {string} key - config Key (ex: 'tag.threshold')
   * @param {*} defaultValue - default value in case nothing in found in attribute or pulseConfig
   * @returns {*} Configuration or attribute value
   */
  getConfigOrAttribute (key, defaultValue) {
    let listOfKeys = key.split('.'); // Ex: 'ANY_tagName.realKey'

    if (listOfKeys.length < 1) {
      return defaultValue;
    }

    let lastKey = listOfKeys[listOfKeys.length - 1];

    if (!pulseUtility.isNotDefined(this.element)) { // To avoid erreur when deleted
      // 1- ATTRIBUTE : Get LAST key or ONLY 
      if (this.element.hasAttribute(lastKey)) {
        return this.element.getAttribute(lastKey);
      }

      // 2- CONFIG
      let elementShortName = this.element.tagName.toLowerCase();
      elementShortName = elementShortName.slice(2);
      // 1- Search for xtag.refreshingXXX.XXXrate (for example)
      let retVal = pulseConfig.getString(elementShortName + '.' + key, 'undefDefautValue');
      if ('undefDefautValue' != retVal)
        return retVal;

      if (listOfKeys.length >= 2 && listOfKeys[0] != elementShortName) {
        //let lastKey = listOfKeys[listOfKeys.length - 1];
        // 2- Search for xtag.XXXrate (for example)
        retVal = pulseConfig.getString(elementShortName + '.' + lastKey, 'undefDefautValue');
        if ('undefDefautValue' != retVal)
          return retVal;
      }
    }
    // 3-Search for refreshingXXX.XXXrate (for example)
    return pulseConfig.getString(key, defaultValue);
  }

  /**
   * Get config or attribute (if any attribute overload config)
   *
   * @param {string} key - config Key (ex: 'tag.threshold')
   * @param {*} defaultValue - default value in case nothing in found in attribute or pulseConfig
   * @returns {*} Configuration or attribute value
   */
  getConfigOrAttributeFreeType (key, defaultValue) {
    let listOfKeys = key.split('.'); // Ex: 'ANY_tagName.realKey'

    if (listOfKeys.length < 1) {
      return defaultValue;
    }

    let elementShortName = this.element.tagName.toLowerCase();
    elementShortName = elementShortName.slice(2);
    // 1- Search for xtag.refreshingXXX.XXXrate (for example)
    let retVal = pulseConfig.get(elementShortName + '.' + key);
    if (undefined != retVal)
      return retVal;

    if (listOfKeys.length >= 2 && listOfKeys[0] != elementShortName) {
      let lastKey = listOfKeys[listOfKeys.length - 1];
      // 2- Search for xtag.XXXrate (for example)
      retVal = pulseConfig.get(elementShortName + '.' + lastKey);
      if (undefined != retVal)
        return retVal;
    }

    // 3-Search for refreshingXXX.XXXrate (for example)
    return pulseConfig.get(key, defaultValue);
  }
}


/**
 * Pulse component that implements the state machine pattern
 *
 * @extends module:pulseComponent~PulseComponent
 */
class PulseStateComponent extends PulseComponent {
  /**
   * Constructor
   *
   * @param  {...any} args 
   */
  constructor(...args) {
    const self = super(...args);
    // By default the component will be removed from DOM only once AND die :
    self._fullDeleteWhenDisconnect = true;
    self._stateContext = null;
    self._stateKey = null;
    self._getInitializedState = function (context, key) {
      return null;
    }
    self._pendingPostAction = function () { }
    return self;
  }

  /**
   * Clear extra classes linked to states
   *
   */
  clearDynamicStateContent () {
    let classes = this.element.className;

    if (classes != undefined && classes != '') {
      let class_names = classes.split(' ');
      for (let i = 0; i < class_names.length; i++) {
        let tmp_class = class_names[i];
        if (0 == tmp_class.indexOf('pulse-component-')) {
          // -loading -not-applicable -warning -error 
          $(this.element).removeClass(tmp_class);
        }
        if (0 == tmp_class.indexOf('pulsecomponent-')) {
          // pulsecomponent-context-Initialized -ParamValidation -Loaded ... 
          // pulsecomponent-key-Loading -Validating -Error ...
          $(this.element).removeClass(tmp_class);
        }
      }
    }
  }

  /**
   * To be overridden if necessary
   * 
   * @returns {boolean} is the component visible ?
   */
  get isVisible () {
    if ($(this.element).hasClass('pulse-nodisplay')) { // 'x-check...'
      return true;
    }
    if (!this._connected) {
      return false;
    }

    if ($(this.element).is(':visible')) {
      return true;
    }

    // If x-tag is in foreignObject in svg => define as visible !
    if ($(this.element).hasClass('pulse-added-in-svg')) {
      return true;
    }

    // The following code is a little bit tricky because on Chrome:
    // - $(this.element).is(':visible') only works on block elements, else false is always returned
    // - the x-tag element is always inline
    let display = this.element.currentStyle
      ? this.element.currentStyle.display // IE
      : window.getComputedStyle(this.element, null).display;
    switch (display) {
      case 'block':
        return false;
      default:
        break;
    }
    // - Because the x-tag element is always inline on Chrome,
    //   visit all the children and try to find among them a block element
    let blockElementFound = false;
    for (let child of this.element.children) {
      let childDisplay = child.currentStyle
        ? child.currentStyle.display // IE
        : window.getComputedStyle(child, null).display;
      switch (childDisplay) {
        case 'block':
          blockElementFound = true;
          if ($(child).is(':visible')) {
            return true;
          }
          else {
            break;
          }
        default:
          break;
      }
    }
    if (blockElementFound) {
      console.log('isVisible: fallback, all the block element children are not visible, return false');
      return false;
    }
    else {
      console.log('isVisible: fallback, no block element in children, return true');
      return true;
    }
  }

  /**
   * Callback that is called  when the custom element is connected to the DOM document
   */
  connectedCallback () {
    super.connectedCallback();
  }

  /**
   * Callback that is called when the custom element is disconnected from the DOM document
   * return true if DOM should be destroyed and will never come again
   */
  disconnectedCallback () {
    return super.disconnectedCallback();
  }

  /**
   * Method to use when the component can be remove / re- append to DOM
   * (for example in setupmachine)
   */
  disableDeleteWhenDisconnect () {
    this._fullDeleteWhenDisconnect = false;
  }

  /**
   * Method to use when disableDeleteWhenDisconnect have been called
   * to restore delete (for example in setuplist for children)
   */
  restoreDeleteWhenDisconnect () {
    this._fullDeleteWhenDisconnect = true;
  }

  /**
   * @returns {!string} current state context
   */
  get stateContext () {
    if (null == this._stateContext) {
      debugger; // eslint-disable-line no-debugger
      throw 'No defined state context';
    }
    return this._stateContext;
  }

  /**
   * @returns {!string} Current state key
   */
  get stateKey () {
    if (null == this._stateKey) {
      debugger; // eslint-disable-line no-debugger
      throw 'No defined state key';
    }
    return this._stateKey;
  }

  /** 
   * Define the states
   * 
   * @param {!string} context - Context
   * @param {!string} key - Key
   * @returns {!State} Created states
   *
   * @function defineState
   */

  /**
   * Define the start context
   *
   * @returns {!string} Start context
   *
   * @function startContext
   */

  /**
   * Define for each context the start key
   * 
   * @param {!string} context - Context
   * @returns {string} Start key
   * 
   * @function getStartKey
   */

  /**
   * Define which context should be considered once a context is completed
   * 
   * @param {!string} context - Context
   * @returns {string} Next context
   * 
   * @function getNextContext
   */

  /**
   * Action callback
   * 
   * @callback actionCallback
   */

  /**
  * Method to execute when you enter a context
  * 
  * @param {!string} context - Context
  * @returns {actionCallback}
  */
  enterContext (context) {
    return (function () { });
  }

  /**
   * Method to execute when you exit a context
   * 
   * @param {!string} context - Context
   * @returns {actionCallback}
   */
  exitContext (context) {
    return (function () { });
  }

  /**
   * Has a state been already initialized to this component ?
   * 
   * @returns {boolean} 
   */
  get isStarted () {
    return (null != this._stateContext) && (null != this._stateKey);
  }

  /**
   * Get a state (initialize it if necessary)
   * 
   * @param {!string} context - context 
   * @param {!string} key - key
   * @returns {State} state
   */
  getState (context, key) {
    let initializedState = this._getInitializedState(context, key);
    if (null != initializedState) {
      return initializedState;
    }
    else { // null == initializedState
      let state = this.defineState(context, key);
      let previousGetInitializedState = this._getInitializedState;
      let newGetInitializedState = function (c, k) {
        if ((c == context) && (k == key)) {
          return state;
        }
        else {
          return previousGetInitializedState(c, k);
        }
      };
      this._getInitializedState = newGetInitializedState;
      return state;
    }
  }

  /**
   * @returns {!State} current state
   */
  get state () {
    return this.getState(this.stateContext, this.stateKey);
  }

  /** 
   * Switch to state method, where the context and the key cannot be null
   * 
   * @param {!string} c - State context
   * @param {!string} k - State key
   * @param {!actionCallback} preAction - Pre-action
   * @param {!actionCallback} postAction - Post-action
  */
  _switchToState (c, k, preAction, postAction) {
    if ((null == this._stateContext) && (null == this._stateKey)) {
      let enterContext = this.enterContext(c);
      enterContext();
      this._stateContext = c;
      this._stateKey = k;
      preAction.bind(this)();
      let newState = this.getState(c, k);
      newState.enter(null, null);
      this._pendingPostAction = postAction.bind(this);
    }
    else if ((null == this._stateContext) || (null == this._stateKey)) {
      console.error('Only one context/key defined');
      debugger; // eslint-disable-line no-debugger
      throw 'Only one context/key defined';
    }
    else if ((this.stateContext == c) && (this.stateKey == k)) {
      this._pendingPostAction.bind(this)();
      this._pendingPostAction = function () { }
      preAction.bind(this)();
      let state = this.getState(c, k);
      state.stay();
      this._pendingPostAction = postAction.bind(this);
    }
    else {
      this.state.exit(c, k);
      let oldContext = this.stateContext;
      let oldKey = this.stateKey;
      this._pendingPostAction.bind(this)();
      this._pendingPostAction = function () { }
      if (oldContext != c) {
        let exitContext = this.exitContext(oldContext);
        exitContext();
        let enterContext = this.enterContext(c);
        enterContext();
      }
      this._stateContext = c;
      this._stateKey = k;
      preAction.bind(this)();
      let newState = this.getState(c, k);
      newState.enter(oldContext, oldKey);
      this._pendingPostAction = postAction.bind(this);
    }
  }

  /** Remain in the same context, but switch to the state with the specified key
   * 
   * @param {!string} k - New state key
   * @param {!actionCallback} preAction - Pre-action
   * @param {!actionCallback} postAction - Post-action
   */
  _switchToKey (k, preAction, postAction) {
    if (null == this._stateContext) {
      this._switchToState(this.startContext, k, preAction, postAction);
    }
    else {
      this._switchToState(this.stateContext, k, preAction, postAction);
    }
  }

  /**
   * Switch to a next state
   *
   * @param {?string} context - Context of the new state or null/undefined
   * @param {?string} key - Key of the new state or null/undefined
   * @param {?actionCallback} preActionParam - Pre-action
   * @param {?actionCallback} postActionParam - Post-action
   */
  switchToState (context, key, preActionParam, postActionParam) {
    let preAction;
    if (null == preActionParam) {
      preAction = function () { }
    }
    else {
      preAction = preActionParam;
    }
    let postAction;
    if (null == postActionParam) {
      postAction = function () { }
    }
    else {
      postAction = postActionParam;
    }
    if ((null == context) && (null == key)) {
      console.error('switchToState called with no context and no key');
      debugger; // eslint-disable-line no-debugger
      throw 'switchToState with no context/key';
    }
    else if (null == key) { // && (null != context)
      let k = this.getStartKey(context);
      this._switchToState(context, k, preAction, postAction);
    }
    else if (null == context) { // && (null != key)
      this._switchToKey(key, preAction, postAction);
    }
    else { // (null != context) && (null != key)
      this._switchToState(context, key, preAction, postAction);
    }
  }

  /**
   * Switch to the specified context
   * 
   * @param {!string} context - New context to switch to
   * @param {?actionCallback} preActionParam - Pre-action
   * @param {?actionCallback} postActionParam - Post-action
   */
  switchToContext (context, preActionParam, postActionParam) {
    this.switchToState(context, null, preActionParam, postActionParam);
  }

  /**
   * Switch to the state of the specified key while remaining in the same context
   * 
   * @param {!string} key - New state key
   * @param {?actionCallback} preActionParam - Pre-action
   * @param {?actionCallback} postActionParam - Post-action
   */
  switchToKey (key, preActionParam, postActionParam) {
    this.switchToState(null, key, preActionParam, postActionParam);
  }

  /**
   * Consider the current context is completed, switch to the next one
   * 
   * @param {?actionCallback} preActionParam - Pre-action
   * @param {?actionCallback} postActionParam - Post-action
   */
  switchToNextContext (preActionParam, postActionParam) {
    let nextContext;
    if (null == this._stateContext) {
      nextContext = this.startContext;
    }
    else {
      nextContext = this.getNextContext(this.stateContext);
    }
    this.switchToContext(nextContext, preActionParam, postActionParam);
  }
}


/**
 * Abstract pulse component with an initialization phase
 *
 * Available contexts: Initialization, Reset, Initialized
 *
 * Some state flows:
 * Default flow: Initialization:Initializing -> Initialized:Standard
 * Initialization error flow: Initialization:Initializing -> Initialization:Error
 * Reset flow: Initialized:Standard -> Reset:Initializing -> Initialized:Standard
 *
 * State implementations:
 * - Initialization:Initializing - {@link module:state~InitialState}
 * - Reset:Initializing - {@link module:state~ResetState}
 * - Initialized:Standard - {@link module:state~StaticState}
 * - *:Error - {@link module:state~ErrorState}
 * 
 * @extends module:pulseComponent~PulseStateComponent
 * 
* @graph Initialized_ContextFlow
@g 
@g      Initialized component: context flow
@g 
@g         +----------------+     +-------------+
@g     ==> | Initialization | ==> | Initialized |
@g         +----------------+     +-------------+
@g                                  ^
@g                                  H
@g                                  H
@g         +----------------+       H
@g     ..> |     Reset      | ======#
@g         +----------------+
* @graph Initialization_StateFlow
@g 
@g  Initialization context: state flow
@g 
@g           +--------------+
@g       ==> | Initializing | ==>
@g           +--------------+
@g             |
@g             |
@g             v
@g           +--------------+
@g           |    Error     |
@g           +--------------+
 */
class PulseInitializedComponent extends PulseStateComponent {
  /**
   * Constructor
   * 
   * @param  {...any} args 
   */
  constructor(...args) {
    const self = super(...args);

    self._errorMessage = '';
    return self;
  }

  /**
   * @override
   */
  get startContext () {
    return 'Initialization';
  }

  /**
   * @override
   * 
   * @param {!string} context - Context
   * @return {!string} key
   */
  getStartKey (context) {
    switch (context) {
      case 'Initialization':
      case 'Reset':
        return 'Initializing';
      case 'Initialized':
        return 'Standard';
    }
  }

  /**
   * @override
   */
  getNextContext (context) {
    switch (context) {
      case 'Initialization':
      case 'Reset':
        return 'Initialized';
      case 'Initialized':
        console.log(`No next context for ${context}`);
        debugger; // eslint-disable-line no-debugger
        throw 'No next context';
    }
  }

  defineState (context, key) {
    switch (context) {
      case 'BeforeDestructionState':
        return new state.BeforeDestructionState(context, key, this);
      case 'Initialized':
        return new state.StaticState(context, key, this);
      default: {
        switch (key) {
          case 'Initializing':
            switch (context) {
              case 'Initialization':
                return new state.InitialState(context, key, this);
              case 'Reset':
                return new state.ResetState(context, key, this);
              default:
                console.error(`State not defined for context=${context} and key=${key}`);
                debugger; // eslint-disable-line no-debugger
                throw 'State not defined';
            }
          case 'Error':
            return new state.ErrorState(context, key, this);
          default:
            console.error(`State not defined for context=${context} and key=${key}`);
            debugger; // eslint-disable-line no-debugger
            throw 'State not defined';
        }
      }
    }
  }

  /**
   * Method to override by the inherited class
   *
   * @override
   */
  initialize () { // To override
    if (new.target === PulseSingleRequestComponent) throw TypeError('initialize of abstract class PulseInitializedComponent');
  }

  /**
   * Clear anything that was done during intialization, so that initialize can be called once again.
   * Remove all the dispatchers and listeners.
   * Please note that no state switch is done here
   */
  clearInitialization () {
    // Remove all the listeners 
    eventBus.EventBus.removeEventListenerByScope(this);
  }

  /**
   * Check if the component is initialized, meaning its state is defined and not 'initial' or 'init_error' - means initialize () has been called.
   *
   * @return {boolean} The component is initialized
   */
  isInitialized () {
    return this.isStarted && (this.stateContext != 'Initialization') && (this.stateContext != 'Reset');
  }

  /**
   * @override
   */
  connectedCallback () {
    super.connectedCallback();
    if (!this.isStarted) {
      this.start();
    }
  }

  /**
   * Callback that is called when the custom element is disconnected from the DOM document
   * return true if DOM should be destroyed and will never come again
   */
  disconnectedCallback () {
    if (this.isStarted) {
      let disableDeleteElements = $(this.element).hasClass('disableDeleteWhenDisconnect');
      //if (disableDeleteElements.length == 0) {
      if (!disableDeleteElements) {
        if (this._fullDeleteWhenDisconnect) {
          // BUG ON Chrome
          // could be if (!navigator.userAgent.includes('Chrome')) { // Bug on Chrome - remove
          if (this.isInitialized()) {
            this.clearInitialization(); // To reset listeners

            super.disconnectedCallback();

            this.switchToState('BeforeDestructionState', 'BeforeDestructionState');

            this._element = null; // remove reference to class to help garbage collector
            return true;
          }
        }
      }
    }
    super.disconnectedCallback();
    return false; // can come back in DOM (re-order list...)
  }

  /**
   * Add the class 'pulse-component-error' to the component.
   * Used by the error state
   */
  enterErrorState () {
    this.addClass('pulse-component-error');
  }

  /**
   * Remove the display message and remove the 'pulse-component-error' class from the component.
   * Used by the error state
   */
  exitErrorState () {
    this.removeClass('pulse-component-error');
  }

  /**
   * Reset the component itself. Set the next state at the end of the method
   */
  reset () {
    this.switchToNextContext();
  }

  /**
   * Error message that is set by the setError method
   * 
   * @return {string} error message
   */
  get errorMessage () {
    return this._errorMessage;
  }

  /**
  * Set an error on the component without displaying it
  * 
  * @param {string} message - Error message to set
  */
  setError (message) {
    this._errorMessage = message;
  }

  /**
   * Show the error that has been previously stored
   */
  showError () {
    this.displayError(this.errorMessage);
  }

  /**
   * Display the error message
   * To be overridden by the sub-class
   *
   * @param {string} message - Error message to display
   */
  displayError (message) { // To override
    if (new.target === PulseInitializedComponent) throw TypeError('displayError of abstract class PulseInitializedComponent');
  }

  /**
   * Stop displaying the error message
   * To be overridden by the sub-class
   */
  removeError () { // To override
    if (new.target === PulseInitializedComponent) throw TypeError('removeError of abstract class PulseInitializedComponent');
  }

  /**
   * (Re-)start loading the component.
   * Switch to state 'reset' or 'initial' or 'reload'
   * whether the component has already been initialized or not
   */
  start () {
    if (this.isInitialized()) { // including 'Stop' Context
      this.switchToContext('Reset');
    }
    else {
      this.switchToContext(this.startContext);
    }
  }

  /**
   * Default event callback in case a config is updated: (re-)start the component
   * 
   * @param {*} event 
   */
  onConfigChange (event) {
    // Default = do nothing
    // Example :
    //if ( event.target.config == 'myConfig')
    //  this.start();
  }
}

/**
 * Abstract pulse component for components that potentially run Ajax requests
 *
 * @extends module:pulseComponent~PulseInitializedComponent
 * 
* @graph Request_StateFlow
@g 
@g        Request (Load, Normal, Reload, NotAvailable...) context: state flow
@g 
@g 
@g           +---------------------------------------------------+
@g           |                                                   |
@g           |                                                   |
@g           |    +----------------------------------------------+-----------------+
@g           |    |                                              |                 |
@g           |    |                                              |                 |
@g           |    |    +-----------------------+                 |                 |
@g           v    v    |                       v                 |                 |
@g         +-------------+     +-------+     +-----------+     +----------------+  |
@g     ==> |             | --> |       | --> |           | --> | TransientError |  |
@g         |             |     |       |     |           |     +----------------+  |
@g         |             |     |       |     |           |       ^                 |
@g         |   Loading   | <-- | Delay | <-- | Temporary |       |                 |
@g         |             |     |       |     |           |       |                 |
@g         |             |     |       |     |           |       |                 |
@g         |             |     |       | -+  |           | ------+-----------------+
@g         +-------------+     +-------+  |  +-----------+       |
@g           H                            |                      |
@g           H                            +----------------------+
@g           v
 */
class PulseRequestComponent extends PulseInitializedComponent {
  /**
   * Constructor
   * 
   * @param  {...any} args 
   */
  constructor(...args) {
    const self = super(...args);
    self.states = undefined; // Abstract
    self._timeout = undefined;
    self._defaultDelayRate = 10000; // 10s
    self._defaultTransientErrorDelay = 3 * 60 * 1000; // 3 minutes
    return self;
  }

  /**
   * Timeout for the ajax requests. Default is undefined.
   *
   * @return {number} Timeout in ms
   */
  get timeout () {
    return this._timeout;
  }
  /**
   * Set the timeout of the ajax requests
   *
   * @param {number} timeout - Timeout in ms
   */
  set timeout (timeout) {
    this._timeout = timeout;
  }

  /**
   * Delay in ms to wait in case of a delay error.
   * Default is 10s.
   *
   * @return {number} Delay rate in ms
   */
  get delayRate () {
    return this._defaultDelayRate;
  }

  /**
   * Delay in ms before switching to a transient error.
   * Default is 5 minutes.
   *
   * @return {number} Delay in ms
   */
  get transientErrorDelay () {
    return Number(this.getConfigOrAttribute('stopRefreshingRate.freezeMinutes', this._defaultTransientErrorDelay / 60 / 1000)) * 60 * 1000;
  }

  /**
   * Url to use by the Ajax request.
   * To be overridden
   *
   * @return {string} Url to use in the ajax request
   */
  get url () { // To override
    if (new.target === PulseRequestComponent) throw TypeError('url of abstract class PulseRequestComponent');
  }

  /**
   * Add the CSS class 'pulse-component-warning' in case the component enters a TransientErrorState
   */
  enterTransientErrorState () {
    this.addClass('pulse-component-warning');
  }

  /**
   * Remove the CSS class 'pulse-component-warning' and the error message in case the component exits a TransientErrorState
   */
  exitTransientErrorState () {
    this.removeClass('pulse-component-warning');
  }

  /**
   * Do nothing special in case of reload.
   * To be overridden if necessary.
   */
  beforeReload () {
    // Default: do nothing special
  }

  /**
   * Method that is called when the next context is loaded.
   * To be overridden
   *
   * @param {Object} data - Ajax request response
   */
  refresh (data) { // To override
    if (new.target === PulseRequestComponent) throw TypeError('refresh of abstract class PulseRequestComponent');
  }

  /**
   * Method that is called in case of Ajax request success.
   * 
   * @param {Object} data 
   */
  manageSuccess (data) {
    this.switchToNextContext(() => this.refresh(data));
  }

  /**
   * Method that is called in case the Ajax request returns an error.
   * The Status property of the returned answer is processed by the manageErrorStatus methods.
   *
   * @param {Object} data - Ajax error response
   */
  manageError (data) {
    if (typeof data === 'undefined') {
      console.error('manageError: data is undefined');
      this.switchToKey('Error', () => this.displayError('undefined error data'), () => this.removeError());
      return;
    }
    let status = data.Status;
    if (typeof status === 'undefined') {
      console.error('manageError: data.Status is undefined');
      this.switchToKey('Error', () => this.displayError('undefined error data status'), () => this.removeError());
      return;
    }

    // New error status
    if (this.manageErrorStatus(status, data.ErrorMessage)) {
      return;
    }

    console.error(`manageError: data status ${status} is unknown, message=${data.ErrorMessage}`);
    let errorMessage;
    if (typeof (status) != 'undefined') {
      errorMessage = `unknown status ${status}, ${data.ErrorMessage}`;
    }
    else {
      errorMessage = data.ErrorMessage;
    }
    this.switchToKey('Error', () => this.displayError(errorMessage, () => this.removeError()));
  }

  /**
   * Retry immediately the Ajax request.
   * 
   * @param {string} message - Error message
   */
  retryImmediately (message) {
    if (this.stateKey == 'TransientError') {
      this.switchToKey('TransientError', () => this.displayError(message), () => this.removeError());
    }
    else {
      this.switchToKey('Temporary', () => this.setError(message), () => this.setError(''));
    }
  }

  /**
   * Retry with a delay the Ajax request.
   * 
   * @param {string} message - Error message
   */
  retryWithDelay (message) {
    if (this.stateKey == 'TransientError') {
      this.switchToKey('TransientError', () => this.displayError(message), () => this.removeError());
    }
    else {
      this.switchToKey('Delay', () => this.setError(message), () => this.setError(''));
    }
  }

  /**
   * Default method to manage the new error status
   * To be overridden in case of a non-standard behavior of the component.
   *
   * @param {string} status - Error response status
   * @param {string} message - Error response message
   * @return {boolean} The status was processed
   */
  manageErrorStatus (status, message) {
    switch (status) {
      case 'AuthorizationError': {
        if (pulseLogin.tokenNeedRefresh()) {
          pulseLogin.refreshToken();

          // Delayed display : (should never happen excepted maybe in checklogin)
          this.retryWithDelay('Authentication Error. Please retry');
        }
        else {
          pulseConfig.setGlobal('loginError', 'Authentication Error. Please retry');
          // Clean all cookies linked to login
          pulseLogin.cleanLoginRole();

          // Goto page login with an error message to be displayed
          if (!pulseConfig.isLoginPage()) { // If not in page login
            pulseConfig.goToPageLogin();
            return true;
          }
        }
      } break;
      case 'MissingConfiguration': {
        // Send Message to display on top
        let messageInfo = {
          'id': 'WARNING_MISSING_INFO',
          'level': 'warning',
          'clickToClose': true,
          'time': 45, // seconds to display message
          'message': pulseConfig.pulseTranslate('missingconfiguration', 'Missing configuration')
            + ': ' + message + ' \r\n'
            + pulseConfig.pulseTranslate('contactsupport',
              'Please contact the support team'),
          'internalLAT': 'status:' + status + '. Full message: ' + message
            + '(' + this.element.tagName + ')'
        };
        eventBus.EventBus.dispatchToAll('showMessageSignal', messageInfo);

        this.switchToKey('Error', () => this.displayError(message), () => this.removeError());
        return true;
      }
      case 'WrongRequestParameter':
      case 'UnexpectedError': {
        // Send Message to display on top
        let messageInfo = {
          'id': 'ERROR_CALL_SUPPORT',
          'level': 'error', // or 'warning', ?
          'clickToClose': true,
          'time': 45, // seconds to display message
          'message': 'ERROR : ' + pulseConfig.pulseTranslate('contactsupport',
            'please contact the support team'),
          'internalLAT': 'status:' + status + '. Full message : ' + message
            + '(' + this.element.tagName + ')'
        };
        eventBus.EventBus.dispatchToAll('showMessageSignal', messageInfo);

        this.switchToKey('Error', () => this.displayError(message), () => this.removeError());
        return true;
      }
      case 'NotApplicable':
        this.manageNotApplicable();
        return true;
      case 'ProcessingDelay':
        this.retryWithDelay(message);
        return true;
      case 'TransientProcessError':
      case 'Stale':
        this.retryImmediately(message);
        return true;
      case 'DatabaseConnectionError': { // = database unavailable
        // Stop all refresh :
        let target = {
          //url: url,
          source: this.element.tagName,
          when: new Date()
        };
        eventBus.EventBus.dispatchToAll('databaseProbablyDisconnected', target);

        if (!this.element.tagName.toUpperCase().includes('X-CHECK') // if ((this.element.tagName != 'X-CHECKSERVERACCESS')
          && (this.element.tagName.toUpperCase() != 'X-MESSAGE')) {
          this.switchToKey('Error', () => this.displayError(message), () => this.removeError());
        }
        else {
          // DO NOT DO this !!! Next context is not available if context = stop
          //this.switchToNextContext(() => this.refresh());
          this.switchToContext('Normal'); // Do not use "start" because it could not exit loading state
        }
        return true;
      }
      case 'PulseMaintenance': { // = maintenance is started (server may be off soon)
        // Stop all refresh :
        let target = {
          //url: url,
          source: this.element.tagName,
          when: new Date()
        };

        eventBus.EventBus.dispatchToAll('pulseMaintenance', target);

        if (!this.element.tagName.toUpperCase().includes('X-CHECK') // if ((this.element.tagName != 'X-CHECKSERVERACCESS')
          && (this.element.tagName.toUpperCase() != 'X-MESSAGE')) {
          // With empty message
          this.switchToKey('Error', () => this.displayError(''), () => this.removeError());
        }
        else { // == Ignore ???
          // DO NOT DO this !!! Next context is not available if context = stop
          //this.switchToNextContext(() => this.refresh());
          //if (this.element.tagName == 'X-CHECKSERVERACCESS') {
            this.switchToContext('Normal'); // Else can stay in Loading context and never check again
          //}
        }
        return true;
      }
      default:
        return false;
    }
  }

  /**
   * Manage the case when the component data does not apply
   * Switch by default to the state 'NotApplicable' and add the class pulse-component-not-applicable
   */
  manageNotApplicable () {
    this.addClass('pulse-component-not-applicable');
    this.switchToContext('NotApplicable');
  }

  /**
   * Manage an Old NO_DATA error status.
   * By default, run the retryWithDelay method, but override this method in case one the following services is used:
   * GetListOfShiftSlotService, GetMachineStatusByIWP, GetShiftAround/After/Before, GetFieldLegendsForMachine,
   * GetMachinePerformanceDay(V2), GetModeColor, GetMachineStatus, GetReasonSlots(V3)
   * 
   * @param {string} message - Error message
   */
  manageOldNoData (message) {
    // Default: delay
    this.retryWithDelay(message);
    // But:
    // - GetListOfShiftSlotService: not applicable
    // - GetMachineStatusByIWP: not applicable
    // - GetShiftAround/After/Before: not applicable
    // - GetFieldLegendsForMachine: not applicable
    // - GetMachinePerformanceDay(V2): delay or permanent
    // - GetModeColor: delay or permanent
    // - GetMachineStatus: delay or permament
    // - GetReasonSlots(V3): delay or permanent
  }

  /**
   * Manage an Ajax failure.
   * Either retry with delay in case of a time out or switch to an 'error' state else
   *
   * @param {boolean} isTimeout - Time out
   * @param {number} xhrStatus - XMLHttpRequest.status of the Ajax request
   */
  manageFailure (isTimeout, xhrStatus) {
    if (isTimeout) {
      this.retryWithDelay('time out');
    }
    else {
      let message = pulseService.getAjaxErrorMessage(xhrStatus);
      if ((xhrStatus == '0') || (xhrStatus == '500') || (xhrStatus == '504')) {
        this.retryWithDelay(message);
      }
      else {
        this.switchToKey('Error', () => this.displayError(message), () => this.removeError());
      }
    }
  }

  /**
   * Method that is called when the 'loading' state is entered.
   * By default add the css class 'pulse-component-loading'.
   */
  startLoading () {
    this.addClass('pulse-component-loading');
  }

  /**
   * Method that is called when the 'loading' state is exited.
   * By default remove the css class 'pulse-component-loading'.
   */
  endLoading () {
    this.removeClass('pulse-component-loading');
  }

  /**
   * Default event callback in case server is off : STOP the component
   * 
   * @param {*} event 
   */
  onServerOffStopRefresh (event) {
    if (!this.element.tagName.toUpperCase().includes('X-CHECK')) {// if (this.element.tagName != 'X-CHECKSERVERACCESS') {
      //if (this.stateContext != 'Loaded') {
      this.displayError(''); // Empty to hide all texts
      this._serverIsOff = true;
      this.switchToContext('Stop');
      //}
    }
  }

  /**
   * Default event callback in case server is available: (re-)start the component
   * 
   * @param {*} event 
   */
  onServerAvailableChange (event) {
    // NOT NEEDED because of _serverIsOff 
    //if (!this.element.tagName.toUpperCase().includes('X-CHECK')) { // if (this.element.tagName != 'X-CHECKSERVERACCESS') {
    if (true == this._serverIsOff) {
      this._serverIsOff = false;
      this.start();
    }
    //}
  }

}

/**
 * Abstract class for Pulse components that run a single Ajax request during the loading phase
 *
 * Available contexts: Initialization, Reset, Load, Loaded, Reload, Stop, NotApplicable
 *
 * Available states: Initializing, Error, Loading, Standard, Temporary, Delay, TransientError, Error
 *
 * Some state flows:
 * Default flow: Initialization:Initializing -> Load:Loading -> Loaded:Standard
 * Initialization error flow: Initialization:Initializing -> Initialization:Error
 * Ajax transient error flow: Initialization:Initializing -> Load:Loading -> Load:Temporary -> ... -> Load:TransientError
 *
 * State implementations:
 * - Initialization:Initializing - {@link module:state~InitialState}
 * - Reset:Initializing - {@link module:state~ResetState}
 * - Loaded:Standard - {@link module:state~StaticState}
 * - Stop:Standard - {@link module:state~StopState}
 * - Load:Loading - {@link module:state~LoadState}
 * - Reload:Loading - {@link module:state~ReloadState}
 * - *:Temporary - {@link module:state~TemporaryState}
 * - *:Delay - {@link module:state~DelayState}
 * - *:TransientError - {@link module:state~TransientErrorState}
 * - NotApplicable:Standard - {@link module:state~NotApplicableState}
 * - *:Error - {@link module:state~ErrorState}
 * 
 * @extends module:pulseComponent~PulseRequestComponent
 * 
* @graph SingleRequest_ContextFlow
@g 
@g             Single request component: context flow
@g 
@g                                +---------------+
@g                                | NotApplicable |
@g                                +---------------+
@g                                  ^
@g                                  |
@g                                  |
@g         +----------------+     +---------------+     +--------+
@g     ==> | Initialization | ==> |     Load      | ==> | Loaded |
@g         +----------------+     +---------------+     +--------+
@g                                  ^                     ^
@g                                  H                     H
@g                                  H                     H
@g         +----------------+       H                     H
@g     ..> |     Reset      | ======#                     H
@g         +----------------+                             H
@g         +----------------+     +---------------+       H
@g     ..> |      Stop      | --> |    Reload     | ======#
@g         +----------------+     +---------------+
@g                                  ^
@g                                  :
@g                                  :
* @graph Initialization_StateFlow
@g 
@g  Initialization context: state flow
@g 
@g           +--------------+
@g       ==> | Initializing | ==>
@g           +--------------+
@g             |
@g             |
@g             v
@g           +--------------+
@g           |    Error     |
@g           +--------------+
* @graph Request_StateFlow
@g 
@g        Request (Load, Normal, Reload, NotAvailable...) context: state flow
@g 
@g 
@g           +---------------------------------------------------+
@g           |                                                   |
@g           |                                                   |
@g           |    +----------------------------------------------+-----------------+
@g           |    |                                              |                 |
@g           |    |                                              |                 |
@g           |    |    +-----------------------+                 |                 |
@g           v    v    |                       v                 |                 |
@g         +-------------+     +-------+     +-----------+     +----------------+  |
@g     ==> |             | --> |       | --> |           | --> | TransientError |  |
@g         |             |     |       |     |           |     +----------------+  |
@g         |             |     |       |     |           |       ^                 |
@g         |   Loading   | <-- | Delay | <-- | Temporary |       |                 |
@g         |             |     |       |     |           |       |                 |
@g         |             |     |       |     |           |       |                 |
@g         |             |     |       | -+  |           | ------+-----------------+
@g         +-------------+     +-------+  |  +-----------+       |
@g           H                            |                      |
@g           H                            +----------------------+
@g           v
 */
class PulseSingleRequestComponent extends PulseRequestComponent {
  /**
   * Constructor
   *
   * @param  {...any} args 
   */
  constructor(...args) {
    const self = super(...args);
    return self;
  }

  /**
   * @override
   * 
   * @param {!string} context - Context
   * @return {!string} key
   */
  getStartKey (context) {
    switch (context) {
      case 'Initialization':
      case 'Reset':
        return 'Initializing';
      case 'Load':
      case 'Reload':
        return 'Loading';
      case 'Loaded':
      case 'Stop':
      case 'NotApplicable':
        return 'Standard';
    }
  }

  /**
   * @override
   */
  getNextContext (context) {
    switch (context) {
      case 'Initialization':
      case 'Reset':
        return 'Load';
      case 'Load':
      case 'Reload':
        return 'Loaded';
      case 'Loaded':
      case 'Stop':
      case 'NotApplicable':
        console.error(`No next context for ${context}`);
        debugger; // eslint-disable-line no-debugger
        throw 'No next context';
    }
  }

  defineState (context, key) {
    switch (context) {
      case 'BeforeDestructionState':
        return new state.BeforeDestructionState(context, key, this);
      case 'Loaded':
        return new state.StaticState(context, key, this);
      case 'Stop':
        return new state.StopState(context, key, this);
      case 'NotApplicable':
        return new state.NotApplicableState(context, key, this);
      default: {
        switch (key) {
          case 'Initializing':
            switch (context) {
              case 'Initialization':
                return new state.InitialState(context, key, this);
              case 'Reset':
                return new state.ResetState(context, key, this);
              default:
                console.error(`State not defined for context=${context} and key=${key}`);
                debugger; // eslint-disable-line no-debugger
                throw 'State not defined';
            }
          case 'Error':
            return new state.ErrorState(context, key, this);
          case 'Loading':
            switch (context) {
              case 'Load':
                return new state.LoadState(context, key, this);
              case 'Reload':
                return new state.ReloadState(context, key, this);
              default:
                console.error(`State not defined for context=${context} and key=${key}`);
                debugger; // eslint-disable-line no-debugger
                throw 'State not defined';
            }
          case 'Temporary':
            return new state.TemporaryState(c => 1000., context, key, this);
          case 'Delay':
            return new state.DelayState(c => c.delayRate, context, key, this);
          case 'TransientError':
            return new state.TransientErrorState(c => c.delayRate, context, key, this);
          default:
            console.error(`State not defined for context=${context} and key=${key}`);
            debugger; // eslint-disable-line no-debugger
            throw 'State not defined: ' + key;
        }
      }
    }
  }

  enterContext (context) {
    switch (context) {
      case 'Load':
      case 'Reload':
        this.startLoading();
        break;
      default:
        break;
    }
    return super.enterContext(context);
  }

  exitContext (context) {
    switch (context) {
      case 'Load':
      case 'Reload':
        this.endLoading();
        break;
      default:
        break;
    }
    return super.exitContext(context);
  }
}

/**
 * Abstract class for Pulse components that run an ajax request regularly, each time it needs to be refreshed
 *
 * Available contexts: Initialization, Reset, Load, Normal, Reload, Stop, NotAvailable, NotApplicable
 *
 * Available states: Initializing, Error, Loading, Standard, Temporary, Delay, TransientError, Error
 *
 * Some state flows:
 * Default flow: Initialization:Initializing -> Load:Loading -> Normal:Loading -> Normal:Loading -> ...
 * Initialization error flow: Initialization:Initializing -> Initialization:Error
 * Ajax transient error flow: Normal:Loading -> Normal:Temporary -> Normal:Temporary -> ... -> Normal:TransientError
 * Ajax delay error flow: Normal:Loading -> Normal:Delay -> Normal:Delay -> ... -> Normal:TransientError
 * Not available flow: Normal:Loading -> NotAvailable:Loading -> ... -> Normal:Loading
 *
 * State implementations:
 * - Initialization:Initializing - {@link module:state~InitialState}
 * - Reset:Initializing - {@link module:state~ResetState}
 * - Stop:Standard - {@link module:state~StopState}
 * - Normal:Loading - {@link module:state~NormalRequestState}
 * - NotAvailable:Loading - {@link module:state~NotAvailableState}
 * - Load:Loading - {@link module:state~LoadState}
 * - Reload:Loading - {@link module:state~ReloadState}
 * - *:Temporary - {@link module:state~TemporaryState}
 * - *:Delay - {@link module:state~DelayState}
 * - *:TransientError - {@link module:state~TransientErrorState}
 * - NotApplicable:Standard - {@link module:state~NotApplicableState}
 * - *:Error - {@link module:state~ErrorState}
 * 
 * @extends module:pulseComponent~PulseRequestComponent
 * 
* @graph Refreshing_ContextFlow
@g 
@g                                   Refreshing component: context flow
@g 
@g 
@g                                       +--------------------------------------------------+
@g                                       |                                                  |
@g                                       |                                                  |
@g                                       |              #====#         +----------+         |
@g                                       |              v    H         v          |         v
@g              +----------------+     +--------+     +--------+     +--------------+     +---------------+
@g          ==> | Initialization | ==> |        | ==> |        | --> |              | --> | NotApplicable |
@g              +----------------+     |        |     |        |     |              |     +---------------+
@g                                     |        |     |        |     |              |
@g                                     |  Load  |     | Normal | <== | NotAvailable |
@g                                     |        |     |        |     |              |
@g              +----------------+     |        |     |        |     |              |
@g          ..> |     Reset      | ==> |        |     |        |     |              |
@g              +----------------+     +--------+     +--------+     +--------------+
@g                                       |              ^              ^
@g   +-----------------------------------+              H              |
@g   |                                                  H              |
@g   |          +----------------+     +--------+       H              |
@g   |      ..> |      Stop      | --> | Reload | ======#              |
@g   |          +----------------+     +--------+                      |
@g   |                                   ^                             |
@g   |                                   :                             |
@g   |                                   :                             |
@g   |                                                                 |
@g   |                                                                 |
@g   |                                                                 |
@g   |                                                                 |
@g   +-----------------------------------------------------------------+
* @graph Initialization_StateFlow
@g 
@g  Initialization context: state flow
@g 
@g           +--------------+
@g       ==> | Initializing | ==>
@g           +--------------+
@g             |
@g             |
@g             v
@g           +--------------+
@g           |    Error     |
@g           +--------------+
* @graph Request_StateFlow
@g 
@g        Request (Load, Normal, Reload, NotAvailable...) context: state flow
@g 
@g 
@g           +---------------------------------------------------+
@g           |                                                   |
@g           |                                                   |
@g           |    +----------------------------------------------+-----------------+
@g           |    |                                              |                 |
@g           |    |                                              |                 |
@g           |    |    +-----------------------+                 |                 |
@g           v    v    |                       v                 |                 |
@g         +-------------+     +-------+     +-----------+     +----------------+  |
@g     ==> |             | --> |       | --> |           | --> | TransientError |  |
@g         |             |     |       |     |           |     +----------------+  |
@g         |             |     |       |     |           |       ^                 |
@g         |   Loading   | <-- | Delay | <-- | Temporary |       |                 |
@g         |             |     |       |     |           |       |                 |
@g         |             |     |       |     |           |       |                 |
@g         |             |     |       | -+  |           | ------+-----------------+
@g         +-------------+     +-------+  |  +-----------+       |
@g           H                            |                      |
@g           H                            +----------------------+
@g           v
 */
class PulseRefreshingComponent extends PulseRequestComponent {
  /**
   * Constructor
   * 
   * @param  {...any} args 
   */
  constructor(...args) {
    const self = super(...args);
    self._refreshRate = undefined;
    return self;
  }

  /**
   * @override
   * 
   * @param {!string} context - Context
   * @return {!string} key
   */
  getStartKey (context) {
    switch (context) {
      case 'Initialization':
      case 'Reset':
        return 'Initializing';
      case 'Load':
      case 'Reload':
      case 'Normal':
      case 'NotAvailable':
        return 'Loading';
      case 'Stop':
      case 'NotApplicable':
        return 'Standard';
    }
  }

  /**
   * @override
   */
  getNextContext (context) {
    switch (context) {
      case 'Initialization':
      case 'Reset':
        return 'Load';
      case 'Load':
      case 'Reload':
      case 'Normal':
      case 'NotAvailable':
        return 'Normal';
      case 'Stop':
      case 'NotApplicable':
        console.error(`No next context for ${context}`);
        debugger; // eslint-disable-line no-debugger
        throw 'No next context';
    }
  }

  defineState (context, key) {
    switch (context) {
      case 'BeforeDestructionState':
        return new state.BeforeDestructionState(context, key, this);
      case 'Stop':
        return new state.StopState(context, key, this);
      case 'NotApplicable':
        return new state.NotApplicableState(context, key, this);
      default: {
        switch (key) {
          case 'Initializing':
            switch (context) {
              case 'Initialization':
                return new state.InitialState(context, key, this);
              case 'Reset':
                return new state.ResetState(context, key, this);
              default:
                console.error(`State not defined for context=${context} and key=${key}`);
                debugger; // eslint-disable-line no-debugger
                throw 'State not defined';
            }
          case 'Error':
            return new state.ErrorState(context, key, this);
          case 'Loading':
            switch (context) {
              case 'Load':
                return new state.LoadState(context, key, this);
              case 'Reload':
                return new state.ReloadState(context, key, this);
              case 'Normal':
                return new state.NormalRequestState(c => c.refreshRate, context, key, this);
              case 'NotAvailable':
                return new state.NotAvailableState(c => c.refreshRate, context, key, this);
              default:
                console.error(`State not defined for context=${context} and key=${key}`);
                debugger; // eslint-disable-line no-debugger
                throw 'State not defined';
            }
          case 'Temporary':
            return new state.TemporaryState(c => 1000., context, key, this);
          case 'Delay':
            return new state.DelayState(c => c.delayRate, context, key, this);
          case 'TransientError':
            return new state.TransientErrorState(c => c.delayRate, context, key, this);
          default:
            console.error(`State not defined for context=${context} and key=${key}`);
            debugger; // eslint-disable-line no-debugger
            throw 'State not defined';
        }
      }
    }
  }

  enterContext (context) {
    switch (context) {
      case 'Load':
      case 'Reload':
        this.startLoading();
        break;
      default:
        break;
    }
    return super.enterContext(context);
  }

  exitContext (context) {
    switch (context) {
      case 'Load':
      case 'Reload':
        this.endLoading();
        break;
      default:
        break;
    }
    return super.exitContext(context);
  }

  /**
   * Refresh rate in ms
   *
   * @return {number} Refresh rate in ms
   */
  get refreshRate () {
    return this._refreshRate;
  }
  /**
   * Set the refresh rate
   *
   * @param {number} refreshRate - Refresh rate in ms
   */
  set refreshRate (refreshRate) {
    this._refreshRate = refreshRate;
  }

}

/**
 * Abstract pulse component with an initialization phase and a parameter validation phase
 *
 * Available contexts: Initialization, ParamValidation, Reset, Initialized
 * Available states: Initializing, Validating, Error, Standard
 *
 * Some state flows:
 * Default flow: Initialization:Initializing -> ParamValidation:Validating -> Initialized:Standard
 * Initialization error flow: Initialization:Initializing -> Initialization:Error
 * Reset flow: Initialized:Standard -> Reset:Initializing -> ParamValidation:Validating -> Initialized:Standard
 *
 * State implementations:
 * - Initialization:Initializing - {@link module:state~InitialState}
 * - Reset:Initializing - {@link module:state~ResetState}
 * - ParamValidation:Validating - {@link module:state~ParamValidationTimeoutState}
 * - Initialized:Standard - {@link module:state~StaticState}
 * - *:Error - {@link module:state~ErrorState}
 * 
 * @extends module:pulseComponent~PulseInitializedComponent
 * 
* @graph ParamInitialized_ContextFlow
@g 
@g                  Initialized component: context flow
@g 
@g         +----------------+     +-----------------+     +-------------+
@g     ==> | Initialization | ==> | ParamValidation | ==> | Initialized |
@g         +----------------+     +-----------------+     +-------------+
@g                                  ^
@g                                  H
@g                                  H
@g         +----------------+       H
@g     ..> |     Reset      | ======#
@g         +----------------+
* @graph Initialization_StateFlow
@g 
@g  Initialization context: state flow
@g 
@g           +--------------+
@g       ==> | Initializing | ==>
@g           +--------------+
@g             |
@g             |
@g             v
@g           +--------------+
@g           |    Error     |
@g           +--------------+
* @graph ParamValidation_StateFlow
@g 
@g  ParamValidation context: state flow
@g 
@g             +------------+
@g         ==> | Validating | ==>
@g             +------------+
@g               |
@g               |
@g               v
@g             +------------+
@g             |   Error    |
@g             +------------+
 */
class PulseParamInitializedComponent extends PulseInitializedComponent {
  /**
   * Constructor
   *
   * @param  {...any} args 
   */
  constructor(...args) {
    const self = super(...args);
    return self;
  }

  /**
   * @override
   * 
   * @param {!string} context - Context
   * @return {!string} key
   */
  getStartKey (context) {
    switch (context) {
      case 'ParamValidation':
        return 'Validating';
      default:
        return super.getStartKey(context);
    }
  }

  /**
   * @override
   */
  getNextContext (context) {
    switch (context) {
      case 'Initialization':
      case 'Reset':
        return 'ParamValidation';
      case 'ParamValidation':
        return 'Initialized';
      default:
        return super.getNextContext(context);
    }
  }

  defineState (context, key) {
    switch (context) {
      case 'BeforeDestructionState':
        return new state.BeforeDestructionState(context, key, this);
      case 'ParamValidation':
        switch (key) {
          case 'Validating':
            return new state.ParamValidationTimeoutState(c => 30000., context, key, this); // timeout = 30s
          case 'Error':
            return new state.ErrorState(context, key, this);
          default:
            console.error(`State not defined for context=${context} and key=${key}`);
            debugger; // eslint-disable-line no-debugger
            throw 'State not defined';
        }
      default:
        return super.defineState(context, key);
    }
  }

  enterContext (context) {
    if ((context == 'ParamValidation') && this.startLoading) {
      this.startLoading();
    }
    return super.enterContext(context);
  }

  exitContext (context) {
    if ((context == 'ParamValidation') && this.endLoading) {
      this.endLoading();
    }
    return super.exitContext(context);
  }
}

/**
 * Abstract class for Pulse components with a (event) parameter validation phase
 * that run a single Ajax request during the loading phase
 *
 * Available contexts: Initialization, ParamValidation, Reset, Load, Loaded, Reload, Stop, NotApplicable
 *
 * Available states: Initializing, Error, Validating, Loading, Standard, Temporary, Delay, TransientError, Error
 *
 * Some state flows:
 * Default flow: Initialization:Initializing -> ParamValidation:Validating -> Load:Loading -> Loaded:Standard
 * Initialization error flow: Initialization:Initializing -> Initialization:Error
 * Ajax transient error flow: Initialization:Initializing -> Load:Loading -> Load:Temporary -> ... -> Load:TransientError
 *
 * State implementations:
 * - Initialization:Initializing - {@link module:state~InitialState}
 * - Reset:Initializing - {@link module:state~ResetState}
 * - ParamValidation:Validating - {@link module:state~ParamValidationTimeoutState}
 * - Loaded:Standard - {@link module:state~StaticState}
 * - Stop:Standard - {@link module:state~StopState}
 * - Load:Loading - {@link module:state~LoadState}
 * - Reload:Loading - {@link module:state~ReloadState}
 * - *:Temporary - {@link module:state~TemporaryState}
 * - *:Delay - {@link module:state~DelayState}
 * - *:TransientError - {@link module:state~TransientErrorState}
 * - NotApplicable:Standard - {@link module:state~NotApplicableState}
 * - *:Error - {@link module:state~ErrorState}
 * 
 * @extends module:pulseComponent~PulseSingleRequestComponent
 * 
* @graph ParamSingleRequest_ContextFlow
@g 
@g        Single request and param autoPath single request component: context flow
@g 
@g         +----------------+     +-----------------+     +---------------+     +--------+
@g     ==> | Initialization | ==> | ParamValidation | ==> |     Load      | ==> | Loaded |
@g         +----------------+     +-----------------+     +---------------+     +--------+
@g                                  ^                       |                     ^
@g                                  H                       |                     H
@g                                  H                       v                     H
@g         +----------------+       H                     +---------------+       H
@g     ..> |     Reset      | ======#                     | NotApplicable |       H
@g         +----------------+                             +---------------+       H
@g         +----------------+     +-----------------+                             H
@g     ..> |      Stop      | --> |     Reload      | ============================#
@g         +----------------+     +-----------------+
@g                                  ^
@g                                  :
@g                                  :
* @graph Initialization_StateFlow
@g 
@g  Initialization context: state flow
@g 
@g           +--------------+
@g       ==> | Initializing | ==>
@g           +--------------+
@g             |
@g             |
@g             v
@g           +--------------+
@g           |    Error     |
@g           +--------------+
* @graph ParamValidation_StateFlow
@g 
@g  ParamValidation context: state flow
@g 
@g             +------------+
@g         ==> | Validating | ==>
@g             +------------+
@g               |
@g               |
@g               v
@g             +------------+
@g             |   Error    |
@g             +------------+
* @graph Request_StateFlow
@g 
@g        Request (Load, Normal, Reload, NotAvailable...) context: state flow
@g 
@g 
@g           +---------------------------------------------------+
@g           |                                                   |
@g           |                                                   |
@g           |    +----------------------------------------------+-----------------+
@g           |    |                                              |                 |
@g           |    |                                              |                 |
@g           |    |    +-----------------------+                 |                 |
@g           v    v    |                       v                 |                 |
@g         +-------------+     +-------+     +-----------+     +----------------+  |
@g     ==> |             | --> |       | --> |           | --> | TransientError |  |
@g         |             |     |       |     |           |     +----------------+  |
@g         |             |     |       |     |           |       ^                 |
@g         |   Loading   | <-- | Delay | <-- | Temporary |       |                 |
@g         |             |     |       |     |           |       |                 |
@g         |             |     |       |     |           |       |                 |
@g         |             |     |       | -+  |           | ------+-----------------+
@g         +-------------+     +-------+  |  +-----------+       |
@g           H                            |                      |
@g           H                            +----------------------+
@g           v
 */
class PulseParamSingleRequestComponent extends PulseSingleRequestComponent {
  /**
   * Constructor
   *
   * @param  {...any} args 
   */
  constructor(...args) {
    const self = super(...args);
    return self;
  }

  /**
   * @override
   * 
   * @param {!string} context - Context
   * @return {!string} key
   */
  getStartKey (context) {
    switch (context) {
      case 'ParamValidation':
        return 'Validating';
      default:
        return super.getStartKey(context);
    }
  }

  /**
   * @override
   */
  getNextContext (context) {
    switch (context) {
      case 'Initialization':
      case 'Reset':
        return 'ParamValidation';
      case 'ParamValidation':
        return 'Load';
      default:
        return super.getNextContext(context);
    }
  }

  /**
   * @override
   * 
   * @param {!string} context - Context
   * @param {!string} key - Key
   * @returns {!State} Created states
   */
  defineState (context, key) {
    switch (context) {
      case 'ParamValidation':
        switch (key) {
          case 'Validating':
            return new state.ParamValidationTimeoutState(c => 30000., context, key, this); // timeout = 30s
          case 'Error':
            return new state.ErrorState(context, key, this);
          default:
            console.error(`State not defined for context=${context} and key=${key}`);
            debugger; // eslint-disable-line no-debugger
            throw 'State not defined';
        }
      default:
        return super.defineState(context, key);
    }
  }

  enterContext (context) {
    if (context == 'ParamValidation') {
      this.startLoading();
    }
    return super.enterContext(context);
  }

  exitContext (context) {
    if ((context == 'ParamValidation') && this.endLoading) {
      this.endLoading();
    }
    return super.exitContext(context);
  }
}

/**
 * Abstract class for Pulse components with a (event) parameter validation phase + Path validation is automatic
 * that run a single Ajax request during the loading phase
 *
 * Available contexts: Initialization, ParamValidation, Reset, Load, Loaded, Reload, Stop, NotApplicable
 *
 * Available states: Initializing, Error, Validating, Loading, Standard, Temporary, Delay, TransientError, Error
 *
 * Some state flows:
 * Default flow: Initialization:Initializing -> ParamValidation:Validating -> Load:Loading -> Loaded:Standard
 * Initialization error flow: Initialization:Initializing -> Initialization:Error
 * Ajax transient error flow: Initialization:Initializing -> Load:Loading -> Load:Temporary -> ... -> Load:TransientError
 *
 * State implementations:
 * - Initialization:Initializing - {@link module:state~InitialState}
 * - Reset:Initializing - {@link module:state~ResetState}
 * - ParamValidation:Validating - {@link module:state~ParamValidationTimeoutState}
 * - Loaded:Standard - {@link module:state~StaticState}
 * - Stop:Standard - {@link module:state~StopState}
 * - Load:Loading - {@link module:state~LoadState}
 * - Reload:Loading - {@link module:state~ReloadState}
 * - *:Temporary - {@link module:state~TemporaryState}
 * - *:Delay - {@link module:state~DelayState}
 * - *:TransientError - {@link module:state~TransientErrorState}
 * - NotApplicable:Standard - {@link module:state~NotApplicableState}
 * - *:Error - {@link module:state~ErrorState}
 * 
 * @extends module:pulseComponent~PulseParamSingleRequestComponent
 * 
* @graph ParamSingleRequest_ContextFlow
@g 
@g        Single request and param autoPath single request component: context flow
@g 
@g         +----------------+     +-----------------+     +---------------+     +--------+
@g     ==> | Initialization | ==> | ParamValidation | ==> |     Load      | ==> | Loaded |
@g         +----------------+     +-----------------+     +---------------+     +--------+
@g                                  ^                       |                     ^
@g                                  H                       |                     H
@g                                  H                       v                     H
@g         +----------------+       H                     +---------------+       H
@g     ..> |     Reset      | ======#                     | NotApplicable |       H
@g         +----------------+                             +---------------+       H
@g         +----------------+     +-----------------+                             H
@g     ..> |      Stop      | --> |     Reload      | ============================#
@g         +----------------+     +-----------------+
@g                                  ^
@g                                  :
@g                                  :
* @graph Initialization_StateFlow
@g 
@g  Initialization context: state flow
@g 
@g           +--------------+
@g       ==> | Initializing | ==>
@g           +--------------+
@g             |
@g             |
@g             v
@g           +--------------+
@g           |    Error     |
@g           +--------------+
* @graph ParamValidation_StateFlow
@g 
@g  ParamValidation context: state flow
@g 
@g             +------------+
@g         ==> | Validating | ==>
@g             +------------+
@g               |
@g               |
@g               v
@g             +------------+
@g             |   Error    |
@g             +------------+
* @graph Request_StateFlow
@g 
@g        Request (Load, Normal, Reload, NotAvailable...) context: state flow
@g 
@g 
@g           +---------------------------------------------------+
@g           |                                                   |
@g           |                                                   |
@g           |    +----------------------------------------------+-----------------+
@g           |    |                                              |                 |
@g           |    |                                              |                 |
@g           |    |    +-----------------------+                 |                 |
@g           v    v    |                       v                 |                 |
@g         +-------------+     +-------+     +-----------+     +----------------+  |
@g     ==> |             | --> |       | --> |           | --> | TransientError |  |
@g         |             |     |       |     |           |     +----------------+  |
@g         |             |     |       |     |           |       ^                 |
@g         |   Loading   | <-- | Delay | <-- | Temporary |       |                 |
@g         |             |     |       |     |           |       |                 |
@g         |             |     |       |     |           |       |                 |
@g         |             |     |       | -+  |           | ------+-----------------+
@g         +-------------+     +-------+  |  +-----------+       |
@g           H                            |                      |
@g           H                            +----------------------+
@g           v
 */
class PulseParamAutoPathSingleRequestComponent extends PulseParamSingleRequestComponent {
  /**
   * Constructor
   * 
   * @param  {...any} args 
   */
  constructor(...args) {
    const self = super(...args);
    self._path = '';
    return self;
  }

  /**
   * Associated path
   * 
   * @returns {!string} path
   */
  get path () {
    return this._path;
  }

  /**
   * Update the path from the configuration or the attribute
   * 
   * @returns {boolean} the path is defined (not empty and not null)
   */
  updatePathFromConfigOrAttribute () {
    this._path = this.getConfigOrAttribute('path', '');
    return (typeof (this.path) != 'undefined') && ('' != this.path);
  }

  /**
   * @override
   * 
   * @param {!string} context - Context
   * @param {!string} key - Key
   * @returns {!State} Created states
   */
  defineState (context, key) {
    switch (context) {
      case 'ParamValidation':
        switch (key) {
          case 'Validating':
            return new state.ParamAndPathValidationTimeoutState(c => 30000., context, key, this); // timeout = 30s
          default:
            return super.defineState(context, key);
        }
      case 'Initialization':
        switch (key) {
          case 'Initializing':
            return new state.AutoPathInitialState(context, key, this);
          default:
            return super.defineState(context, key);
        }
      default:
        return super.defineState(context, key);
    }
  }

  /**
   * Short Url (with the path) to use in the Ajax request.
   * To be overridden
   *
   * @return {string} Url to use in the ajax request
   */
  getShortUrl () { // To override
    if (new.target === PulseParamAutoPathSingleRequestComponent)
      throw TypeError('url of abstract class PulseParamAutoPathSingleRequestComponent');
  }

  /**
   * Url to use by the Ajax request.
   *
   * @return {!string} Url to use in the ajax request
   */
  get url () {
    console.assert((typeof (this.path) != 'undefined') && ('' != this.path));
    if ((typeof (this.path) == 'undefined') || ('' == this.path)) { // This should not happen: the path should be not empty after the param validation context
      console.error('empty path');
      debugger; // eslint-disable-line no-debugger
      throw 'empty path';
    }
    return this.path + this.getShortUrl();
  }

  /**
   * Default event callback in case a path is updated: (re-)start the component
   * (to go through the param validation state again)
   * 
   * @param {*} event 
   */
  onPathChange (event) {
    this.start();
  }

}

/**
 * Abstract class for Pulse components with a (event) parameter validation phase
 * that run an ajax request regularly, each time it needs to be refreshed
 *
 * Available contexts: Initialization, ParamValidation, Reset, Load, Normal, Reload, Stop, NotAvailable, 
 *
 * Available states: Initializing, Error, Validating, Loading, Standard, Temporary, Delay, TransientError, Error
 *
 * Some state flows:
 * Default flow: Initialization:Initializing -> ParamValidation:Validating -> Load:Loading -> Normal:Loading -> Normal:Loading -> ...
 * Initialization error flow: Initialization:Initializing -> Initialization:Error
 * Ajax transient error flow: Normal:Loading -> Normal:Temporary -> Normal:Temporary -> ... -> Normal:TransientError
 * Ajax delay error flow: Normal:Loading -> Normal:Delay -> Normal:Delay -> ... -> Normal:TransientError
 * Not available flow: Normal:Loading -> NotAvailable:Loading -> ... -> Normal:Loading
 *
 * State implementations:
 * - Initialization:Initializing - {@link module:state~InitialState}
 * - Reset:Initializing - {@link module:state~ResetState}
 * - ParamValidation:Validating - {@link module:state~ParamValidationTimeoutState}
 * - Stop:Standard - {@link module:state~StopState}
 * - Normal:Loading - {@link module:state~NormalRequestState}
 * - NotAvailable:Loading - {@link module:state~NotAvailableState}
 * - Load:Loading - {@link module:state~LoadState}
 * - Reload:Loading - {@link module:state~ReloadState}
 * - *:Temporary - {@link module:state~TemporaryState}
 * - *:Delay - {@link module:state~DelayState}
 * - *:TransientError - {@link module:state~TransientErrorState}
 * - NotApplicable:Standard - {@link module:state~NotApplicableState}
 * - *:Error - {@link module:state~ErrorState}
 *
 * @extends module:pulseComponent~PulseRefreshingComponent
 * 
* @graph ParamRefreshing_ContextFlow
@g 
@g                             Refreshing and param autoPath refreshing component: context flow
@g 
@g 
@g                                                          +------------------------------------------------+
@g                                                          |                                                |
@g                                                          |                                                |
@g                                                          |            #====#         +----------+         |
@g                                                          |            v    H         v          |         v
@g         +----------------+     +-----------------+     +------+     +--------+     +--------------+     +---------------+
@g     ==> | Initialization | ==> | ParamValidation | ==> | Load | ==> |        | --> |              | --> | NotApplicable |
@g         +----------------+     +-----------------+     +------+     |        |     |              |     +---------------+
@g                                  ^                       |          |        |     |              |
@g                                  H                       |          | Normal | <== | NotAvailable |
@g                                  H                       |          |        |     |              |
@g         +----------------+       H                       |          |        |     |              |
@g     ..> |     Reset      | ======#                       |          |        |     |              |
@g         +----------------+                               |          +--------+     +--------------+
@g                                                          |            ^              ^
@g                                                          |            H              |
@g                                                          |            H              |
@g         +----------------+     +-----------------+       |            H              |
@g     ..> |      Stop      | --> |     Reload      | ======+============#              |
@g         +----------------+     +-----------------+       |                           |
@g                                  ^                       |                           |
@g                                  :                       +---------------------------+
@g                                  :
* @graph Initialization_StateFlow
@g 
@g  Initialization context: state flow
@g 
@g           +--------------+
@g       ==> | Initializing | ==>
@g           +--------------+
@g             |
@g             |
@g             v
@g           +--------------+
@g           |    Error     |
@g           +--------------+
* @graph ParamValidation_StateFlow
@g 
@g  ParamValidation context: state flow
@g 
@g             +------------+
@g         ==> | Validating | ==>
@g             +------------+
@g               |
@g               |
@g               v
@g             +------------+
@g             |   Error    |
@g             +------------+
* @graph Request_StateFlow
@g 
@g        Request (Load, Normal, Reload, NotAvailable...) context: state flow
@g 
@g 
@g           +---------------------------------------------------+
@g           |                                                   |
@g           |                                                   |
@g           |    +----------------------------------------------+-----------------+
@g           |    |                                              |                 |
@g           |    |                                              |                 |
@g           |    |    +-----------------------+                 |                 |
@g           v    v    |                       v                 |                 |
@g         +-------------+     +-------+     +-----------+     +----------------+  |
@g     ==> |             | --> |       | --> |           | --> | TransientError |  |
@g         |             |     |       |     |           |     +----------------+  |
@g         |             |     |       |     |           |       ^                 |
@g         |   Loading   | <-- | Delay | <-- | Temporary |       |                 |
@g         |             |     |       |     |           |       |                 |
@g         |             |     |       |     |           |       |                 |
@g         |             |     |       | -+  |           | ------+-----------------+
@g         +-------------+     +-------+  |  +-----------+       |
@g           H                            |                      |
@g           H                            +----------------------+
@g           v
 */
class PulseParamRefreshingComponent extends PulseRefreshingComponent {
  /**
   * Constructor
   *
   * @param  {...any} args 
   */
  constructor(...args) {
    const self = super(...args);
    return self;
  }

  /**
   * @override
   * 
   * @param {!string} context - Context
   * @return {!string} key
   */
  getStartKey (context) {
    switch (context) {
      case 'ParamValidation':
        return 'Validating';
      default:
        return super.getStartKey(context);
    }
  }

  /**
   * @override
   */
  getNextContext (context) {
    switch (context) {
      case 'Initialization':
      case 'Reset':
        return 'ParamValidation';
      case 'ParamValidation':
        return 'Load';
      default:
        return super.getNextContext(context);
    }
  }

  /**
   * @override
   * 
   * @param {!string} context - Context
   * @param {!string} key - Key
   * @returns {!State} Created states
   */
  defineState (context, key) {
    switch (context) {
      case 'ParamValidation':
        switch (key) {
          case 'Validating':
            return new state.ParamValidationTimeoutState(c => 30000., context, key, this); // timeout = 30s
          case 'Error':
            return new state.ErrorState(context, key, this);
          default:
            console.error(`State not defined for context=${context} and key=${key}`);
            debugger; // eslint-disable-line no-debugger
            throw 'State not defined';
        }
      default:
        return super.defineState(context, key);
    }
  }

  /**
   * @override
   */
  enterContext (context) {
    if (context == 'ParamValidation') {
      this.startLoading();
    }
    return super.enterContext(context);
  }

  exitContext (context) {
    if ((context == 'ParamValidation') && this.endLoading) {
      this.endLoading();
    }
    return super.exitContext(context);
  }
}


/**
 * Abstract class for Pulse components with a (event) parameter validation phase + Path validation is automatic
 * that run an ajax request regularly, each time it needs to be refreshed
 *
 * Available contexts: Initialization, ParamValidation, Reset, Load, Normal, Reload, Stop, NotAvailable, NotApplicable
 *
 * Available states: Initializing, Error, Validating, Loading, Standard, Temporary, Delay, TransientError, Error
 *
 * Some state flows:
 * Default flow: Initialization:Initializing -> ParamValidation:Validating -> Load:Loading -> Normal:Loading -> Normal:Loading -> ...
 * Initialization error flow: Initialization:Initializing -> Initialization:Error
 * Ajax transient error flow: Normal:Loading -> Normal:Temporary -> Normal:Temporary -> ... -> Normal:TransientError
 * Ajax delay error flow: Normal:Loading -> Normal:Delay -> Normal:Delay -> ... -> Normal:TransientError
 * Not available flow: Normal:Loading -> NotAvailable:Loading -> ... -> Normal:Loading
 *
 * State implementations:
 * - Initialization:Initializing - {@link module:state~InitialState}
 * - Reset:Initializing - {@link module:state~ResetState}
 * - ParamValidation:Validating - {@link module:state~ParamValidationTimeoutState}
 * - Stop:Standard - {@link module:state~StopState}
 * - Normal:Loading - {@link module:state~NormalRequestState}
 * - NotAvailable:Loading - {@link module:state~NotAvailableState}
 * - Load:Loading - {@link module:state~LoadState}
 * - Reload:Loading - {@link module:state~ReloadState}
 * - *:Temporary - {@link module:state~TemporaryState}
 * - *:Delay - {@link module:state~DelayState}
 * - *:TransientError - {@link module:state~TransientErrorState}
 * - NotApplicable:Standard - {@link module:state~NotApplicableState}
 * - *:Error - {@link module:state~ErrorState}
 *
 * @extends module:pulseComponent~PulseRefreshingComponent
 * 
* @graph ParamRefreshing_ContextFlow
@g 
@g                             Refreshing and param autoPath refreshing component: context flow
@g 
@g 
@g                                                          +------------------------------------------------+
@g                                                          |                                                |
@g                                                          |                                                |
@g                                                          |            #====#         +----------+         |
@g                                                          |            v    H         v          |         v
@g         +----------------+     +-----------------+     +------+     +--------+     +--------------+     +---------------+
@g     ==> | Initialization | ==> | ParamValidation | ==> | Load | ==> |        | --> |              | --> | NotApplicable |
@g         +----------------+     +-----------------+     +------+     |        |     |              |     +---------------+
@g                                  ^                       |          |        |     |              |
@g                                  H                       |          | Normal | <== | NotAvailable |
@g                                  H                       |          |        |     |              |
@g         +----------------+       H                       |          |        |     |              |
@g     ..> |     Reset      | ======#                       |          |        |     |              |
@g         +----------------+                               |          +--------+     +--------------+
@g                                                          |            ^              ^
@g                                                          |            H              |
@g                                                          |            H              |
@g         +----------------+     +-----------------+       |            H              |
@g     ..> |      Stop      | --> |     Reload      | ======+============#              |
@g         +----------------+     +-----------------+       |                           |
@g                                  ^                       |                           |
@g                                  :                       +---------------------------+
@g                                  :
* @graph Initialization_StateFlow
@g 
@g  Initialization context: state flow
@g 
@g           +--------------+
@g       ==> | Initializing | ==>
@g           +--------------+
@g             |
@g             |
@g             v
@g           +--------------+
@g           |    Error     |
@g           +--------------+
* @graph ParamValidation_StateFlow
@g 
@g  ParamValidation context: state flow
@g 
@g             +------------+
@g         ==> | Validating | ==>
@g             +------------+
@g               |
@g               |
@g               v
@g             +------------+
@g             |   Error    |
@g             +------------+
* @graph Request_StateFlow
@g 
@g        Request (Load, Normal, Reload, NotAvailable...) context: state flow
@g 
@g 
@g           +---------------------------------------------------+
@g           |                                                   |
@g           |                                                   |
@g           |    +----------------------------------------------+-----------------+
@g           |    |                                              |                 |
@g           |    |                                              |                 |
@g           |    |    +-----------------------+                 |                 |
@g           v    v    |                       v                 |                 |
@g         +-------------+     +-------+     +-----------+     +----------------+  |
@g     ==> |             | --> |       | --> |           | --> | TransientError |  |
@g         |             |     |       |     |           |     +----------------+  |
@g         |             |     |       |     |           |       ^                 |
@g         |   Loading   | <-- | Delay | <-- | Temporary |       |                 |
@g         |             |     |       |     |           |       |                 |
@g         |             |     |       |     |           |       |                 |
@g         |             |     |       | -+  |           | ------+-----------------+
@g         +-------------+     +-------+  |  +-----------+       |
@g           H                            |                      |
@g           H                            +----------------------+
@g           v
 */
class PulseParamAutoPathRefreshingComponent extends PulseParamRefreshingComponent {
  /**
   * Constructor
   * 
   * @param  {...any} args 
   */
  constructor(...args) {
    const self = super(...args);
    self._path = '';
    return self;
  }

  /**
   * Associated path
   * 
   * @returns {!string} path
   */
  get path () {
    return this._path;
  }

  /**
   * Update the path from the configuration or the attribute
   * 
   * @returns {boolean} the path is defined (not empty and not null)
   */
  updatePathFromConfigOrAttribute () {
    this._path = this.getConfigOrAttribute('path', '');
    return (typeof (this.path) != 'undefined') && ('' != this.path);
  }

  /**
   * @override
   * 
   * @param {!string} context - Context
   * @param {!string} key - Key
   * @returns {!State} Created states
   */
  defineState (context, key) {
    switch (context) {
      case 'ParamValidation':
        switch (key) {
          case 'Validating':
            return new state.ParamAndPathValidationTimeoutState(c => 30000., context, key, this); // timeout = 30s
          default:
            return super.defineState(context, key);
        }
      case 'Initialization':
        switch (key) {
          case 'Initializing':
            return new state.AutoPathInitialState(context, key, this);
          default:
            return super.defineState(context, key);
        }
      default:
        return super.defineState(context, key);
    }
  }

  /**
   * Url to use by the Ajax request.
   * To be overridden
   *
   * @return {string} Url to use in the ajax request
   */
  getShortUrl () { // To override
    if (new.target === PulseParamAutoPathRefreshingComponent)
      throw TypeError('url of abstract class PulseParamAutoPathRefreshingComponent');
  }

  /**
   * Url to use by the Ajax request.
   *
   * @return {string} Url to use in the ajax request
   */
  get url () {
    console.assert((typeof (this.path) != 'undefined') && ('' != this.path));
    if ((typeof (this.path) == 'undefined') || ('' == this.path)) { // This should not happen: the path should be not empty after the param validation context
      console.error('empty path');
      debugger; // eslint-disable-line no-debugger
      throw 'empty path';
    }
    return this.path + this.getShortUrl();
  }

  /**
   * Default event callback in case a path is updated: (re-)start the component
   * (to go through the param validation state again)
   * 
   * @param {*} event 
   */
  onPathChange (event) {
    this.start();
  }
}

exports.PulseComponent = PulseComponent;
exports.PulseInitializedComponent = PulseInitializedComponent;
exports.PulseSingleRequestComponent = PulseSingleRequestComponent;
exports.PulseRefreshingComponent = PulseRefreshingComponent;
exports.PulseParamInitializedComponent = PulseParamInitializedComponent;
exports.PulseParamSingleRequestComponent = PulseParamSingleRequestComponent;
exports.PulseParamAutoPathSingleRequestComponent = PulseParamAutoPathSingleRequestComponent;
exports.PulseParamRefreshingComponent = PulseParamRefreshingComponent;
exports.PulseParamAutoPathRefreshingComponent = PulseParamAutoPathRefreshingComponent;

/**
 * Register a custom element
 *
 * @param {string} tagName - Element tag name
 * @param {class} componentClass - Sub-class of PulseComponent to use
 * @param {?string[]} attributes - [Optional] Observed attributes
 */
exports.registerElement = function (tagName, componentClass, attributes) {
  let attrs = (typeof attributes !== 'undefined') ? attributes : [];

  class C extends HTMLElement {
    constructor(...args) {
      const self = super();
      self._webComponent = new componentClass(self);
      let componentMethods = self._webComponent.methods;
      for (let methodKey in componentMethods) {
        if (componentMethods.hasOwnProperty(methodKey)) {
          this[methodKey] = componentMethods[methodKey].bind(self._webComponent);
        }
      }
      return self;
    }

    /**
     * Associated web component
     *
     * @return {Element} associated web component
     */
    get webComponent () {
      return this._webComponent;
    }

    connectedCallback () {
      this._webComponent.connectedCallback();
    }

    disconnectedCallback () {
      if (this._webComponent != null) {
        if (this._webComponent.disconnectedCallback()) {
          // switch to context destroy
          this._webComponent = null; // remove reference to help gargabe collector
        }
      }
    }

    attributeChangedCallback (attr, oldVal, newVal) {
      if (this._webComponent != null) {
        if (typeof this._webComponent.attributeChangedCallback === 'function') {
          this._webComponent.attributeChangedCallback(attr, oldVal, newVal);
        }
      }
    }

    static get observedAttributes () {
      return attrs;
    }
  }
  //  Note: there is a polyfill for browsers that don't support customElements.define from w3c
  customElements.define(tagName, C);
}
