// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/* Singleton class to manage events sent between pulse components */

var EventBusClass = {};
EventBusClass = function () {
  this.listeners = {};
  this.globalListeners = {};
};
EventBusClass.prototype = {
  /**
    * Add a signal listener for a given context on event bus for 1 component=scope
    *
    * @function addEventListener
    * @param {Object} scope listener scope (= this in callback = xtag class)
    * @param {String} signal generic name of signal to listen on event bus
    * @param {String} context context concern by signal sent (ex:period-context)
    * @param {Method} callback callback to call
  */
  addEventListener: function (scope, signal, context, callback) {
    // hope (context != 'undefined' && context != '') {
    if (typeof this.listeners[signal] == 'undefined') {
      this.listeners[signal] = {};
    }
    if (typeof this.listeners[signal][context] == 'undefined') {
      this.listeners[signal][context] = [];
    }
    this.listeners[signal][context].push({ scope: scope, callback: callback });
    console.log(`${scope.getInfo ? scope.getInfo() : ''}: add listener event=${signal}_${context}`);
  },
  /**
    * Add a signal listener for all contexts on event bus for 1 component=scope
    *
    * @function addGlobalEventListener
    * @param {Object} scope listener scope (= this in callback)
    * @param {String} signal generic name of signal to listen on event bus
    * @param {Method} callback callback to call
  */
  addGlobalEventListener: function (scope, signal, callback) {
    // global listener = for all contexts
    if (typeof this.globalListeners[signal] == 'undefined') {
      this.globalListeners[signal] = [];
    }
    this.globalListeners[signal].push({ scope: scope, callback: callback });
    console.log(`${scope.getInfo ? scope.getInfo() : ''}: add global listener signal=${signal} DONE`);
  },
  /**
    * Remove all signal listeners for all contexts on event bus for 1 component=scope
    *
    * @function removeEventListenerBySignal
    * @param {Object} scope listener scope (= this in callback)
    * @param {String} signal generic name of signal to listen on event bus
  */
  removeEventListenerBySignal: function (scope, signal) {
    if (typeof this.listeners[signal] != 'undefined') {
      for (let context in this.listeners[signal]) {
        // For ALL founded contexts : remove listeners
        if (typeof this.listeners[signal][context] != 'undefined') {
          let newArray = [];
          for (let i = 0; i < this.listeners[signal][context].length; i++) {
            let listener = this.listeners[signal][context][i];
            if (listener.scope != scope) {
              newArray.push(listener);
            }
            else {
              console.log(`${scope.getInfo ? scope.getInfo() : ''}: remove listener signal=${signal} context=${context}`);
            }
          }
          this.listeners[signal][context] = newArray;
        }
      }
    }
    // Global listeners
    if (typeof this.globalListeners[signal] != 'undefined') {
      let newArray = [];
      for (let i = 0; i < this.globalListeners[signal].length; i++) {
        let listener = this.globalListeners[signal][i];
        if (listener.scope != scope) {
          newArray.push(listener);
        }
        else {
          console.log(`${scope.getInfo ? scope.getInfo() : ''}: remove global listener signal=${signal}`);
        }
      }
      this.globalListeners[signal] = newArray;
    }
    //console.log(`${scope.getInfo ? scope.getInfo() : ''}: remove listeners by signal=${signal} DONE`);
  },

  /**
  * Remove all signal listeners for all contexts on event bus for 1 component=scope
  *
  * @function removeEventListenerByScope
  * @param {Object} scope listener scope (= this in callback)
  */
  removeEventListenerByScope: function (scope) {
    for (let signal in this.listeners) {
      for (let context in this.listeners[signal]) {
        // For ALL founded signal + contexts : remove listeners
        if (typeof this.listeners[signal][context] != 'undefined') {
          let newArray = [];
          for (let i = 0; i < this.listeners[signal][context].length; i++) {
            let listener = this.listeners[signal][context][i];
            if (listener.scope != scope) {
              newArray.push(listener);
            }
            else {
              console.log(`${scope.getInfo ? scope.getInfo() : ''}: remove listener signal=${signal} context=${context}`);
            }
          }
          this.listeners[signal][context] = newArray;
        }
      }
    }
    // Global listeners
    for (let signal in this.globalListeners) {
      let newArray = [];
      for (let i = 0; i < this.globalListeners[signal].length; i++) {
        let listener = this.globalListeners[signal][i];
        if (listener.scope != scope) {
          newArray.push(listener);
        }
        else {
          console.log(`${scope.getInfo ? scope.getInfo() : ''}: remove global listener signal=${signal}`);
        }
      }
      this.globalListeners[signal] = newArray;
    }
    //console.log(`${scope.getInfo ? scope.getInfo() : ''}: remove (all) listeners DONE`);
  },
  /**
    * Dispatch a signal for a given context on event bus
    *
    * @function dispatchToContext
    * @param {String} signal generic name of signal to dispatch to on event bus
    * @param {String} context context concern by signal sent (ex:period-context)
    * @param {Object} target main information to give to listeners
  */
  dispatchToContext: function (signal, context, target) {
    console.log(`dispatch to listeners signal=${signal} context=${context}`);
    let event = {
      /*signal: signal,
      context: context,
      type: signal + '_' + context,*/
      target: target
    };
    let args = [];
    var numOfArgs = arguments.length;
    for (var i = 0; i < numOfArgs; i++) {
      args.push(arguments[i]);
    }
    args = args.length > 3 ? args.splice(3, args.length - 1) : [];
    args = [event].concat(args);
    if (typeof this.listeners[signal] != 'undefined') {
      if (typeof this.listeners[signal][context] != 'undefined') {
        let numOfCallbacks = this.listeners[signal][context].length;
        for (let i = 0; i < numOfCallbacks; i++) {
          let listener = this.listeners[signal][context][i];
          if (listener && listener.callback) {
            listener.callback.apply(listener.scope, args);
          }
        }
      }
    }
    // WARNING :
    // Global listeners DO NOT receive this event with context to allow "local" communication.
    // For example : page Running (no context) + Details
  },
  /**
    * Dispatch a signal to GLOBAL context on event bus
    *
    * @function dispatchToGlobalOnly
    * @param {String} signal generic name of signal to dispatch to on event bus
    * @param {Object} target main information to give to listeners
  */
  dispatchToGlobalOnly: function (signal, target) {
    let event = {
      /*signal: signal,
      context: '',
      type: signal,*/
      target: target
    };
    let args = [];
    var numOfArgs = arguments.length;
    for (var i = 0; i < numOfArgs; i++) {
      args.push(arguments[i]);
    }
    args = args.length > 2 ? args.splice(2, args.length - 1) : [];
    args = [event].concat(args);
    // + global
    if (typeof this.globalListeners[signal] != 'undefined') {
      let numOfCallbacks = this.globalListeners[signal].length;
      for (let i = 0; i < numOfCallbacks; i++) {
        let listener = this.globalListeners[signal][i];
        if (listener && listener.callback) {
          listener.callback.apply(listener.scope, args);
        }
      }
    }
  },
  /**
    * Dispatch a signal to ALL contexts on event bus
    *
    * @function dispatchToAll
    * @param {String} signal generic name of signal to dispatch to on event bus
    * @param {Object} target main information to give to listeners
  */
  dispatchToAll: function (signal, target) {
    let event = {
      /*signal: signal,
      context: '',
      type: signal,*/
      target: target
    };
    let args = [];
    var numOfArgs = arguments.length;
    for (var i = 0; i < numOfArgs; i++) {
      args.push(arguments[i]);
    }
    args = args.length > 2 ? args.splice(2, args.length - 1) : [];
    args = [event].concat(args);
    if (typeof this.listeners[signal] != 'undefined') {
      for (let context in this.listeners[signal]) {
        // For ALL founded contexts : dispatch
        if (typeof this.listeners[signal][context] != 'undefined') {
          let numOfCallbacks = this.listeners[signal][context].length;
          for (let i = 0; i < numOfCallbacks; i++) {
            let listener = this.listeners[signal][context][i];
            if (listener && listener.callback) {
              listener.callback.apply(listener.scope, args);
            }
          }
        }
      }
    }
    // + global
    if (typeof this.globalListeners[signal] != 'undefined') {
      let numOfCallbacks = this.globalListeners[signal].length;
      for (let i = 0; i < numOfCallbacks; i++) {
        let listener = this.globalListeners[signal][i];
        if (listener && listener.callback) {
          listener.callback.apply(listener.scope, args);
        }
      }
    }
  },
};

exports.EventBus = new EventBusClass();
