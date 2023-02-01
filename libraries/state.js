// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module state
 * @requires module:pulseService
 */
var pulseService = require('pulseService'); // for runAjax only -> to remove ?
var pulseConfig = require('pulseConfig'); // Verify useLogin
var eventBus = require('eventBus'); // to create path listener
var pulseLogin = require('pulseLogin');

/**
 * Base class for the states that are used by a PulseStateComponent to implement the state machine pattern
 *
 * @see module:pulseComponent~PulseStateComponent
 */
class State {
  /**
   * Constructor
   * 
   * @param {string} context - State context
   * @param {string} key - State key
   * @param {PulseStateComponent} component - Associated Pulse state component
   */
  constructor(context, key, component) {
    if (new.target === State) throw TypeError('new of abstract class State');
    this._context = context;
    this._key = key;
    this._component = component;
    this._previousStateContext = undefined;
    this._previousStateKey = undefined;
  }

  /**
   * Associated context
   * 
   * @returns {string}
   */
  get context () {
    return this._context;
  }

  /**
   * Associated key 
   * 
   * @returns {string}
   */
  get key () {
    return this._key;
  }

  /**
   * Associated pulse state component
   *
   * @return {PulseStateComponent}
   */
  get component () {
    return this._component;
  }

  /**
   * Previous state context, before this state is active (after enter() is called)
   *
   * @return {string} previous state context
   */
  get previousStateContext () {
    return this._previousStateContext;
  }

  /**
 * Previous state key, before this state is active (after enter() is called)
 *
 * @return {string} previous state key
 */
  get previousStateKey () {
    return this._previousStateKey;
  }

  /**
   * Function that is called when the component enters this state
   *
   * @param {string} previousStateContext - Previous state context
   * @param {string} previousStateKey - Previous state key
   */
  enter (previousStateContext, previousStateKey) {
    this._previousStateContext = previousStateContext;
    this._previousStateKey = previousStateKey;
    this.component.addClass('pulsecomponent-context-' + this.context);
    this.component.addClass('pulsecomponent-key-' + this.key);
  }

  /**
   * Function that is called when the component exists this state
   * 
   * @param {string} nextStateContext - Next state context
   * @param {string} nextStateKey - Next state key
   */
  exit (nextStateContext, nextStateKey) {
    this.component.removeClass('pulsecomponent-context-' + this.context);
    this.component.removeClass('pulsecomponent-key-' + this.key);
  }

  /**
   * Function that is called when the component stays in this state
   */
  stay () {
  }
}

/**
 * Class for the LAST state before destruction used by all PulseStateComponent
 */
class BeforeDestructionState extends State {
  /**
   * Constructor
   * 
   * @param {string} context - State context
   * @param {string} key - State key
   * @param {PulseStateComponent} component - Associated Pulse state component
   */
  constructor(context, key, component) {
    super(context, key, component);
    this._component = null; // No reference
  }

  enter (previousStateContext, previousStateKey) {
    this._previousStateContext = previousStateContext;
    this._previousStateKey = previousStateKey;
    // Do nothing more = no call to super
  }

  /**
   * Function that is called when the component exists this state
   * 
   * @param {string} nextStateContext - Next state context
   * @param {string} nextStateKey - Next state key
   */
  exit (nextStateContext, nextStateKey) {
    // Do nothing = no call to super
  }
}

/**
 * Initial state. The next state is either the next context or the Error state
 * 
 * When this state is entered:
 * - if {@link module:pulseComponent~PulseInitializedComponent#isInitialized} returns true, {@link module:pulseComponent~PulseInitializedComponent#clearInitialization} is called first.
 * - then {@link module:pulseComponent~PulseInitializedComponent#initialize} is called.
 *
 * @extends module:state~State
 */
class InitialState extends State {
  /**
   * Switch to the next context or to the Error  state
   * 
   * @override
   */
  enter (previousStateContext, previousStateKey) {
    this.component.clearDynamicStateContent(); // To clear state classes in case of clone

    super.enter(previousStateContext, previousStateKey);
    if (this.component.isInitialized()) {
      this.component.clearInitialization();
    }

    this.component.initialize();

    // Prepare listener to check config change - After initialize
    eventBus.EventBus.addGlobalEventListener(this.component,
      'configChangeEvent',
      this.component.onConfigChange.bind(this.component));
  }
}

/**
 * Initial state for auto path components. (create listener)
 * The next state is either the next context or the Error state
 * 
 * When this state is entered:
 * - if {@link module:pulseComponent~PulseInitializedComponent#isInitialized} returns true, {@link module:pulseComponent~PulseInitializedComponent#clearInitialization} is called first.
 * - then {@link module:pulseComponent~PulseInitializedComponent#initialize} is called.
 *
 * @extends module:state~State
 */
class AutoPathInitialState extends State { // +/- idem Initial State
  /**
   * Switch to the next context or to the Error  state
   * 
   * @override
   */
  enter (previousStateContext, previousStateKey) {
    this.component.clearDynamicStateContent(); // To clear state classes in case of clone

    super.enter(previousStateContext, previousStateKey);
    if (this.component.isInitialized()) {
      this.component.clearInitialization();
    }

    this.component.initialize();

    // Listener to check server access == AFTER initialize
    eventBus.EventBus.addGlobalEventListener(this.component,
      'serverProbablyOffStopRefresh',
      this.component.onServerOffStopRefresh.bind(this.component));
    eventBus.EventBus.addGlobalEventListener(this.component,
      'serverProbablyAvailable',
      this.component.onServerAvailableChange.bind(this.component));

    // Prepare listener to check path change
    eventBus.EventBus.addGlobalEventListener(this.component,
      'pathChangeEvent',
      this.component.onPathChange.bind(this.component));

    // Prepare listener to check config change
    eventBus.EventBus.addGlobalEventListener(this.component,
      'configChangeEvent',
      this.component.onConfigChange.bind(this.component));
  }
}

/**
 * Reset state. State when the pulse component must be reset.
 * The next state is either the next context or the Error state
 * 
 * When this state is entered {@link module:pulseComponent~PulseInitializedComponent#reset} is called.
 * 
 * @extends module:state~State
 */
class ResetState extends State {
  /**
   * Switch to the next context or to the Error state
   * 
   * @override
   */
  enter (previousStateContext, previousStateKey) {
    super.enter(previousStateContext, previousStateKey);
    this.component.reset();
  }
}

/**
 * Static state.
 * It does not switch automatically to any other state
 *
 * @extends module:state~State
 */
class StaticState extends State {
}

/**
 * No action state.
 * The next state is directly the state that is given in the argument of the constructor. Nothing else special is done.
 *
 * @extends module:state~State
 */
class NoActionState extends State { // eslint-disable-line no-unused-vars
  /**
   * Constructor
   * 
   * @param {?string} nextContext - Context of the next state
   * @param {?string} nextKey - Key of the next state
   * @param {string} context - State context
   * @param {string} key - State key
   * @param {PulseStateComponent} component - Pulse state component
   */
  constructor(nextContext, nextKey, context, key, component) {
    super(context, key, component);
    this._nextContext = nextContext;
    this._nextKey = nextKey;
  }

  /**
   * Switch to the state that was given to the argument of the constructor
   *
   * @override
   */
  enter (previousStateContext, previousStateKey) {
    super.enter(previousStateContext, previousStateKey);
    if ((null == this._nextContext) && (null == this._nextKey)) {
      this.component.switchToNextContext();
    }
    else {
      this.component.switchToState(this._nextContext, this._nextKey);
    }
  }
}

/**
 * Callback that returns a number of ms to wait
 * 
 * @callback delayCallback
 * @param {PulseStateComponent} component - Pulse state component
 * @return {number} delay in ms
 */

/**
 * Wait state.
 * Switch to the next state after a specified time
 *
 * @extends module:state~State
 */
class WaitState extends State {
  /**
   * Constructor
   * 
   * @param {?string} nextContext - Context of the next state
   * @param {?string} nextKey - Key of the next state
   * @param {?actionCallback} preAction - Pre-action
   * @param {?actionCallback} postAction - Post-action
   * @param {delayCallback} delayCallback - Callback to get the delay before switching to the specified next state
   * @param {string} context - State context
   * @param {string} key - State key
   * @param {PulseStateComponent} component - Pulse state component
   */
  constructor(nextContext, nextKey, preAction, postAction, delayCallback, context, key, component) {
    super(context, key, component);
    this._nextContext = nextContext;
    this._nextKey = nextKey;
    this._preAction = preAction;
    this._postAction = postAction;
    this.delayCallback = delayCallback; // in ms
    this._active = false;
    this._timeoutId = null;
  }

  /**
   * Is the state still active ?
   * (exit has not been called yet)
   *
   * @return {boolean} The state is active
   */
  get active () {
    return this._active;
  }

  /**
   * @override
   */
  enter (previousStateContext, previousStateKey) {
    super.enter(previousStateContext, previousStateKey);
    this._active = true;
    this._clearTimeout();
    let delay = this.delayCallback(this.component);
    this._timeoutId = setTimeout(this._switch.bind(this), delay);
  }

  /**
   * @override
   */
  exit (nextStateContext, nextStateKey) {
    super.exit(nextStateContext, nextStateKey);
    this._active = false;
    this._clearTimeout();
  }

  /**
   * @override
   */
  stay () {
    super.stay();
    this._active = true;
    this._clearTimeout();
    let delay = this.delayCallback(this.component);
    this._timeoutId = setTimeout(this._switch.bind(this), delay);
  }

  _clearTimeout () {
    if (null != this._timeoutId) {
      window.clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
  }

  /**
   * Once the time is completed, switch to the next state
   */
  _switch () {
    if (this.active) {
      if ((null == this._nextContext) && (null == this._nextKey)) {
        this.component.switchToNextContext(this._preAction, this._postAction);
      }
      else {
        this.component.switchToState(this._nextContext, this._nextKey, this._preAction, this._postAction);
      }
    }
  }
}

/**
 * (Event) Parameter validation state with a timeout.
 * The event/live parameters are checked by the ValidateParameters methods of the web component.
 * 
 * In case they are ok, switch to the next context.
 * 
 * After some time, if the parameters could not be validated,
 * the web component is automatically switched to an error state
 * 
 * If the web component does not contain any ValidateParameters method, switch to the next context at once.
 *
 * When this state is entered {@link module:pulseComponent~PulseParamInitializedComponent#validateParameters} is called.
 * 
 * @extends module:state~WaitState
 */
class ParamValidationTimeoutState extends WaitState { // eslint-disable-line no-unused-vars
  /**
   * Constructor
   * 
   * @param {delayCallback} delayCallback - Callback to get the delay before switching to the error state
   * @param {string} context - State context
   * @param {string} key - State key
   * @param {PulseStateComponent} component - Pulse state component
   */
  constructor(delayCallback, context, key, component) {
    super(null, 'Error', () => this.component.showError(), () => this.component.removeError(), delayCallback, context, key, component);
  }

  /**
   * If validateParameters is a method of the component, run it.
   * Else switch to the next context.
   * 
   * @override
   */
  enter (previousStateContext, previousStateKey) {
    super.enter(previousStateContext, previousStateKey);
    this._validate();
  }

  /**
   * @override
   */
  exit (nextStateContext, nextStateKey) {
    super.exit(nextStateContext, nextStateKey);
  }

  /**
   * @override
   */
  stay () {
    super.stay();
    this._validate();
  }

  _validate () {
    if (this.component.updatePathFromConfigOrAttribute) { // Here this is optional, to make it mandatory use state ParamAndPathValidationTimeoutState
      if (!this.component.updatePathFromConfigOrAttribute()) {
        console.log('waiting attribute path');
        this.component.setError('Waiting for path');
        return;
      }
    }
    if (this.component.validateParameters) {
      this.component.validateParameters();
    }
    else {
      console.warn(`${this.component.getInfo ? this.component.getInfo() : ''}: validateParameters is not defined, it should probably inherit from base component with no parameter validation instead`);
      this.component.switchToNextContext();
    }
  }
}

/**
 * (Event) Parameter validation state with a timeout + wait for url path
 * The event/live parameters are checked by the ValidateParameters methods of the web component.
 * 
 * In case they are ok, switch to the next context.
 * 
 * After some time, if the parameters could not be validated,
 * the web component is automatically switched to an error state
 * 
 * If the web component does not contain any ValidateParameters method, switch to the next context at once.
 *
 * When this state is entered {@link module:pulseComponent~PulseParamInitializedComponent#validateParameters} is called.
 * 
 * @extends module:state~ParamValidationTimeoutState
 */
class ParamAndPathValidationTimeoutState extends ParamValidationTimeoutState {
  /**
   * Constructor
   * 
   * @param {delayCallback} delayCallback - Callback to get the delay before switching to the error state
   * @param {string} context - State context
   * @param {string} key - State key
   * @param {PulseStateComponent} component - Pulse state component
   */
  constructor(delayCallback, context, key, component) {
    super(delayCallback, context, key, component);
  }

  _validate () {
    // Check the path is valid
    if (this.component.updatePathFromConfigOrAttribute) {
      if (!this.component.updatePathFromConfigOrAttribute()) {
        console.log('waiting attribute path');
        this.component.setError('Waiting for path');
        return;
      }
    }
    else { // !this.component.updatePathFromConfigOrAttribute
      console.error('missing method updatePathFromConfigOrAttribute in component');
      debugger; // eslint-disable-line no-debugger
      throw 'missing method updatePathFromConfigOrAttribute';
    }
    if (this.component.validateParameters) {
      this.component.validateParameters();
    }
    else {
      console.warn(`${this.component.getInfo ? this.component.getInfo() : ''}: validateParameters is not defined, it should probably inherit from base component with no parameter validation instead`);
      this.component.switchToNextContext();
    }
  }
}

/**
 * Request state
 * 
 * After a specified delay, an Ajax method is called to refresh the component.
 * The URL used by the Ajax request () is the property url of the pulse component.
 *
 * @extends module:state~State
 */
class RequestState extends State {
  /**
   * Constructor
   * 
   * @param {delayCallback} delayCallback - Callback to get the initial delay before the Ajax method is called
   * @param {string} context - State context
   * @param {string} key - State key
   * @param {PulseStateComponent} component - Pulse state component
   */
  constructor(delayCallback, context, key, component) {
    if (new.target === RequestState) throw TypeError('new of abstract class RequestState');
    super(context, key, component);
    this.delayCallback = delayCallback; // in ms
    this._token = 0;
    this._active = false;
    this._timeoutId = null;
  }

  /**
   * Token that is incremented each time the enter or stay method is called
   *
   * @return {number}
   */
  get token () {
    return this._token;
  }
  /**
   * Increment the token
   * @see token
   */
  incrementToken () {
    this._token += 1;
  }

  /**
   * Is the state still active ?
   * (exit has not been called yet)
   *
   * @return {boolean} The state is active
   */
  get active () {
    return this._active;
  }

  /**
   * Url to use by the Ajax request.
   * Default is url of the component.
   * It can be overridden by the reload_url of the component.
   *
   * @return {string} Url to use in the ajax request
   */
  get url () {
    return this.component.url;
  }

  /**
   * After an initial delay, returned by the delay callback, initiate the Ajax request
   *
   * @override
   */
  enter (previousStateContext, previousStateKey) {
    super.enter(previousStateContext, previousStateKey);
    this.incrementToken();
    this._active = true;
    this._clearTimeout();
    let delay = this.delayCallback(this.component);
    this._timeoutId = setTimeout(this._runGetData.bind(this), delay, this.token);
  }

  /**
   * @override
   */
  exit (nextStateContext, nextStateKey) {
    super.exit(nextStateContext, nextStateKey);
    this._active = false;
    this._clearTimeout();
  }

  /**
   * After an initial delay, returned by the delay callback, initiate the Ajax request
   *
   * @override
   */
  stay () {
    super.stay();
    this.incrementToken();
    this._active = true;
    this._clearTimeout();
    let delay = this.delayCallback(this.component);
    this._timeoutId = setTimeout(this._runGetData.bind(this), delay, this.token);
  }

  _clearTimeout () {
    if (null != this._timeoutId) {
      window.clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
  }

  /**
   * Once the time is completed and the component is visible, run the ajax request
   *
   * @param {number} requestToken - Token number to be returned by the ajax request
   */
  _runAjaxWhenIsVisible (requestToken) {
    // Normal behavior
    if (this.active && this._checkToken(requestToken)) {
      if (this.component.isVisible) {
        let useLogin = pulseConfig.getBool('useLogin', false);
        if (useLogin) {
          pulseLogin.refreshTokenIfNeeded();
        }

        if (this.component.postData) { // savereason for example of use
          let jsondata = this.component.postData();
          pulseService.postAjax(this.token, this.url, jsondata, this.component.timeout, this._success.bind(this), this._error.bind(this), this._fail.bind(this));
        }
        else { // Normal behavior
          pulseService.runAjax(this.token, this.url, this.component.timeout, this._success.bind(this), this._error.bind(this), this._fail.bind(this));
        }
      }
      else { // Not visible: postpone it when it is visible again
        this._clearTimeout();
        this._timeoutId = setTimeout(this._runGetData.bind(this), 200, this.token);
      }
    }
  }

  /**
   * Once the time is completed and the component is visible, get data
   * (running ajax request or component._runAlternateGetData if defined)
   *
   * @param {number} requestToken - Token number to be returned by the ajax request
   */
  _runGetData (requestToken) {
    // Special behavior to get data without using url (ex : periodmanager, periodtoolbar)
    if (typeof (this.component._runAlternateGetData) != 'undefined') {
      if (this.component._runAlternateGetData()) {
        return;
      }
    }
    // Normal behavior
    this._runAjaxWhenIsVisible(requestToken);
  }

  /**
   * Callback that is run once the Ajax request is successful.
   * The refresh method of the Pulse component is run if the token matches.
   *
   * @param {number} ajaxToken - Token that is associated to the ajax request
   * @param {Object} data - Data returned by the ajax request
   */
  _success (ajaxToken, data) {
    if (this.active && this._checkToken(ajaxToken)) {
      this.component.manageSuccess(data);
    }
    else {
      console.warn('Success but token changed, ignore it');
    }
  }

  /**
   * Callback that is run if the ajax request returns an error data.
   * The manageError method of the Pulse component is run if the token matches.
   *
   * @param {number} ajaxToken - Token that is associated to the ajax request
   * @param {Object} data - Error data that is returned by the ajax request
   */
  _error (ajaxToken, data) {
    if (this.active && this._checkToken(ajaxToken)) {
      this.component.manageError(data);
      // Stop all refresh :  databaseProbablyDisconnected -> done in manageErrorStatus
    }
    else {
      console.warn('Error but token changed, ignore it');
    }
  }

  /**
   * Callback that is run if the ajax request fails.
   * The manageFailure method of the Pulse component is run if the token matches.
   *
   * @param {number} ajaxToken - Token that is associated to the ajax request
   * @param {string} url - URL used in the ajax request
   * @param {boolean} isTimeout - The ajax request ended in time out
   * @param {number} xhrStatus - XMLHttpRequest.status of the Ajax request
   */
  _fail (ajaxToken, url, isTimeout, xhrStatus) {
    if (this.active && this._checkToken(ajaxToken)) {
      this.component.manageFailure(isTimeout, xhrStatus);
      // Stop all refresh :
      let target = {
        url: url,
        source: this.component.element.tagName,
        when: new Date()
      };

      // NO Filter == Always !
      //if (!this.component.element.tagName.toUpperCase().includes('X-CHECK') ) { // != 'X-CHECKSERVERACCESS') {
      eventBus.EventBus.dispatchToAll('serverProbablyDisconnected', target);
      //}
    }
    else {
      console.warn('Failure but token changed, ignore it');
    }
  }

  /**
   * Check the token is still valid
   *
   * @param {number} ajaxToken - Token
   * @return {boolean} The token is still valid
   */
  _checkToken (ajaxToken) {
    return ajaxToken === this.token;
  }
}

/**
 * Load state. The initial ajax request was sent, but no normal data has been loaded yet.
 * The ajax request is sent right now.
 *
 * @extends module:state~RequestState
 */
class LoadState extends RequestState {
  /**
   * @override
   *
   * @param {string} context - State context
   * @param {string} key - State key
   * @param {PulseStateComponent} component - Pulse state component
   */
  constructor(context, key, component) {
    super(c => 0., context, key, component); // TODO: adapt the refresh rate in case it remains in the loading state
  }
}

/**
 * Normal refreshing state.S
 * 
 * @extends module:state~RequestState
 */
class NormalRequestState extends RequestState {
}

/**
 * Reload state. The component is in a state when the data must be reloaded right now.
 * The default delay is 0ms here.
 *
 * @extends module:state~RequestState
 */
class ReloadState extends RequestState {
  /**
   * @override
   *
   * @param {string} context - State context
   * @param {string} key - State key
   * @param {PulseStateComponent} component - Pulse state component
   */
  constructor(context, key, component) {
    super(c => 0., context, key, component); // TODO: adapt the refresh rate in case it remains in reload state
  }

  /**
   * The beforeReload method of the Pulse component is first run if defined
   *
   * @override
   */
  enter (previousStateContext, previousStateKey) {
    if (this.component.beforeReload) {
      this.component.beforeReload();
    }
    super.enter(previousStateContext, previousStateKey);
  }
}

/**
 * Not available state. The data is not available right now (it may be in the future)
 *
 * @extends module:state~RequestState
 */
class NotAvailableState extends RequestState {
}

/**
 * Temporary error state. A temporary error happened.
 *
 * @extends module:state~RequestState
 */
class TemporaryState extends RequestState {
  /**
   * @override
   */
  enter (previousStateContext, previousStateKey) {
    this._enter_date_time = new Date();
    super.enter(previousStateContext, previousStateKey);
  }

  /**
   * @override
   */
  exit (nextStateContext, nextStateKey) {
    this._enter_date_time = undefined;
    super.exit(nextStateContext, nextStateKey);
  }

  stay () {
    console.assert(typeof (this._enter_date_time) != 'undefined');
    let age = new Date() - this._enter_date_time;
    if (this.component.transientErrorDelay < age) {
      this.component.switchToKey('TransientError', this.component.showError, this.component.removeError);
    }
    else {
      super.stay();
    }
  }
}

/**
 * Delay error state. A temporary error that can remain active potentially a long time happened.
 *
 * @extends module:state~RequestState
 */
class DelayState extends RequestState {
  /**
   * @override
   */
  enter (previousStateContext, previousStateKey) {
    this._enter_date_time = new Date();
    super.enter(previousStateContext, previousStateKey);
  }

  /**
   * @override
   */
  exit (nextStateContext, nextStateKey) {
    this._enter_date_time = undefined;
    super.exit(nextStateContext, nextStateKey);
  }

  stay () {
    console.assert(typeof (this._enter_date_time) != 'undefined');
    let age = new Date() - this._enter_date_time;
    if (this.component.transientErrorDelay < age) {
      this.component.switchToKey('TransientError', this.component.showError, this.component.removeError);
    }
    else {
      super.stay();
    }
  }
}

/**
 * Transient error state. State to use when many temporary or delay states already occurred.
 * Then the pulse component can be switch to a warning state.
 *
 * @extends module:state~RequestState
 */
class TransientErrorState extends RequestState {
  /**
   * If defined, the enterTransientErrorState method of the Pulse component is run
   *
   * @override
   */
  enter (previousStateContext, previousStateKey) {
    super.enter(previousStateContext, previousStateKey);
    if (this.component.enterTransientErrorState) {
      this.component.enterTransientErrorState();
    }
  }

  /**
   * If defined, the exitTransientErrorState method of the Pulse component is run
   *
   * @override
   */
  exit (nextStateContext, nextStateKey) {
    if (this.component.exitTransientErrorState) {
      this.component.exitTransientErrorState();
    }
    super.exit(nextStateContext, nextStateKey);
  }
}

/**
 * Error state.
 *
 * @extends module:state~State
 */
class ErrorState extends State {
  /**
   * If defined, the enterErrorState method of the Pulse component is run
   *
   * @override
   */
  enter (previousStateContext, previousStateKey) {
    super.enter(previousStateContext, previousStateKey);
    if (this.component.enterErrorState) {
      this.component.enterErrorState();
    }
  }

  /**
   * If defined, the exitErrorState method of the Pulse component is run
   *
   * @override
   */
  exit (nextStateContext, nextStateKey) {
    if (this.component.exitErrorState) {
      this.component.exitErrorState();
    }
    super.exit(nextStateContext, nextStateKey);
  }
}

/**
 * Not applicable state. 
 *
 * @extends module:state~State
 */
class NotApplicableState extends State {
}

/**
 * Stop state. State to use when a component should stop refresh. 
 * For example, when web services are not available.
 *
 * @extends module:state~State
 */
class StopState extends State {
}


exports.State = State;
exports.BeforeDestructionState = BeforeDestructionState;
exports.InitialState = InitialState;
exports.AutoPathInitialState = AutoPathInitialState;
exports.ParamAndPathValidationTimeoutState = ParamAndPathValidationTimeoutState;
exports.ResetState = ResetState;
exports.StaticState = StaticState;
exports.NoActionState = NoActionState;
exports.WaitState = WaitState;
exports.ParamValidationTimeoutState = ParamValidationTimeoutState;
exports.RequestState = RequestState;
exports.LoadState = LoadState;
exports.NormalRequestState = NormalRequestState;
exports.ReloadState = ReloadState;
exports.NotAvailableState = NotAvailableState;
exports.TemporaryState = TemporaryState;
exports.DelayState = DelayState;
exports.TransientErrorState = TransientErrorState;
exports.ErrorState = ErrorState;
exports.NotApplicableState = NotApplicableState;
exports.StopState = StopState;
