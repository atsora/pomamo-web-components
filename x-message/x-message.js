// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-message
 * @requires module:pulseComponent
 */

var pulseComponent = require('pulsecomponent');
var pulseConfig = require('pulseConfig');
var pulseSvg = require('pulseSvg');
var pulseUtility = require('pulseUtility');
var eventBus = require('eventBus');

(function () {

  /**
   * `<x-message>` — floating notification stack driven by the event bus.
   *
   * Listens globally to `showMessageSignal` (creates or updates a
   * `.message-alert`, keyed by `id`) and `clearMessageSignal` (removes the
   * alert with the matching `id`). On init, if `pulseConfig.get('loginError')`
   * is non-empty, a single error alert with id `LOGIN_ERROR` is rendered
   * and the config entry is cleared.
   *
   * The payload of `showMessageSignal` supports:
   * ```js
   * {
   *   id?: string,            // dedup key; same id updates the existing alert
   *   message?: string,       // HTML; `\n` becomes `<br>`
   *   time?: number,          // seconds before auto-dismiss (omit = permanent)
   *   level?: 'error' | 'warning' | 'info' | 'default',
   *   clickToClose?: boolean, // adds a close button + click-to-remove
   *   reloadURL?: string,     // appends a "Reload" `<a>`
   *   internalLAT?: string    // extra hidden span carried as debug payload
   * }
   * ```
   *
   * @element x-message
   * @method showMessage     create or update one alert
   * @method clearMessage    remove the alert with the given id
   * @method clearAllMessage remove every alert
   * @extends pulseComponent.PulseInitializedComponent
   */
  class MessageComponent extends pulseComponent.PulseInitializedComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      self._content = undefined;
      self._timerId = null;

      return self;
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
    }

    initialize () {
      // Listener and dispatchers
      eventBus.EventBus.addGlobalEventListener(this,
        'showMessageSignal',
        this.onShowMessage.bind(this));
      eventBus.EventBus.addGlobalEventListener(this,
        'clearMessageSignal',
        this.onClearMessage.bind(this));

      // In case of clone, need to be empty :
      this.element.replaceChildren();

      // Create DOM - Content
      this._content = document.createElement('div');
      this._content.className = 'xmessage';
      // Create DOM - No Loader
      // Create DOM - No message for error

      this.element.appendChild(this._content);

      // Check if login error exists
      let err = pulseConfig.get('loginError', '');
      if (err != '') {
        // Display
        let messageInfo = {
          'id': 'LOGIN_ERROR',
          'message': err,
          'level': 'error',
          'clickToClose': true
        };
        // Same as : eventBus.EventBus.dispatchToAll('showMessageSignal', messageInfo);
        this.showMessage(messageInfo);

        // Remove tmp storage
        pulseConfig.setGlobal('loginError', '');
      }

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // STOP timer
      if (this._timerId) {
        clearTimeout(this._timerId);
        this._timerId = null;
      }

      // Parameters
      // DOM
      this.element.replaceChildren();

      //this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }


    /**
     * Creates or updates a message alert element inside `.xmessage`.
     * If a message with the same `data.id` already exists, updates its text in place.
     * Otherwise creates a new `.message-alert` div with the appropriate level class.
     *
     * @param {{ id?: string, message?: string, level?: string, time?: number, clickToClose?: boolean, reloadURL?: string, internalLAT?: string }} data
     */
    showMessage (data) {
      console.log('component x-message showMessage function!');
      let notFound = true;
      if (!pulseUtility.isNotDefined(data.id)) {
        // if a message with same id already exists, get it and replace text
        let allAlerts = this._content.querySelectorAll('.message-alert');
        for (let i = 0; i < allAlerts.length; i++) {
          if (allAlerts[i].hasAttribute('message-id'))
            if (allAlerts[i].getAttribute('message-id') == data.id) {
              notFound = false;

              let elem = allAlerts[i];
              if (data.message) {
                //elem.innerHTML = data.message.replace(/\n/g, '<br />');
                let msgspan = elem.querySelector('.message-span');
                if (!msgspan) {
                  msgspan = document.createElement('span');
                  msgspan.className = 'message-span';
                  elem.appendChild(msgspan);
                }
                msgspan.innerHTML = data.message.replace(/\n/g, '<br />');
              }

              if (data.internalLAT) {
                let internspan = elem.querySelector('.hidden-span');
                if (!internspan) {
                  internspan = document.createElement('span');
                  internspan.className = 'hidden-span';
                  elem.appendChild(internspan);
                }
                internspan.innerHTML = data.internalLAT.replace(/\n/g, '<br />');
              }
            }
        }
      }
      if (notFound) {
        // if not found create new
        let elem = document.createElement('div');
        elem.className = 'message-alert';

        // Unique Id
        let elemId = 'pulseMessage' + new Date().getTime() + '' + parseInt(Math.random() * 10000, 10);
        elem.id = elemId;
        this._content.appendChild(elem);

        //let closeButton = document.createElement('span');
        //closeButton.className = 'message-closebtn';
        //onclick="this.parentElement.style.display='none';"
        //elem.appendChild(closeButton);

        if (data.message) {
          let msgspan = document.createElement('span');
          msgspan.className = 'message-span';
          msgspan.innerHTML = data.message.replace(/\n/g, '<br />');
          elem.appendChild(msgspan);
          //elem.innerHTML = data.message.replace(/\n/g, '<br />');
        }

        if (data.internalLAT) {
          let internspan = document.createElement('span');
          internspan.className = 'hidden-span';
          internspan.innerHTML = data.internalLAT.replace(/\n/g, '<br />');
          elem.appendChild(internspan);
        }

        let className = 'xmessage-default';
        switch (data.level) {
          case 'error':
            className = 'xmessage-error';
            break;
          case 'warning':
            className = 'xmessage-warning';
            break;
          case 'info':
            className = 'xmessage-info';
            break;
          default:
            className = 'xmessage-default';
        }

        elem.classList.add(className);

        if (data.id)
          elem.setAttribute('message-id', data.id);

        if (data.clickToClose == true) {
          elem.classList.add('closable');
          elem.addEventListener('click', function () {
            this.remove();
          });
          // Button "close"
          var closeBtn = document.createElement('div');
          closeBtn.className = 'message-close';
          elem.appendChild(closeBtn);
          pulseSvg.inlineBackgroundSvg(closeBtn);
        }

        if (!pulseUtility.isNotDefined(data.reloadURL)) {
          let button = document.createElement('a');
          button.className = 'message-reload-button';
          button.innerHTML = 'Reload';
          button.setAttribute('href', data.reloadURL);
          /*button.addEventListener('click', function () {
            // RELOAD
            window.open(data.reloadURL, '_self');
          });*/
          elem.appendChild(button);
        }

        if (data.time) {
          var alert = elem;
          this._timerId = setTimeout(function () {
            alert.remove();
          }, data.time * 1000);
        }
      }
    }

    /**
     * Removes the message alert element with the given `id` attribute.
     *
     * @param {string} id
     */
    clearMessage (id) {
      if (id) {
        // if a message with same id already exists, remove it
        let allAlerts = this._content.querySelectorAll('.message-alert');
        for (let i = 0; i < allAlerts.length; i++) {
          if (allAlerts[i].hasAttribute('message-id'))
            if (allAlerts[i].getAttribute('message-id') == id) {
              let elem = allAlerts[i];
              elem.remove();
            }
        }
      }
    }

    /** Removes all message alert elements from the container. */
    clearAllMessage () {
      let alerts = this._content.querySelectorAll('.message-alert');
      alerts.forEach(alert => alert.remove());
    }

    /**
     * Event bus callback for `showMessageSignal`. Delegates to `showMessage`.
     *
     * @param {{ target: object }} event
     */
    onShowMessage (event) {
      let data = event.target;
      this.showMessage(data);
    }

    /**
     * Event bus callback for `clearMessageSignal`. Delegates to `clearMessage(data.id)`.
     *
     * @param {{ target: { id: string } }} event
     */
    onClearMessage (event) {
      let data = event.target;
      this.clearMessage(data.id);
    }
  }

  pulseComponent.registerElement('x-message', MessageComponent);
})();
