// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-loginconnection
 * @requires module:pulseComponent
 */

var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
//var pulseService = require('pulseService');
var pulseLogin = require('pulseLogin');
var pulseConfig = require('pulseConfig');
var pulseSvg = require('pulseSvg');

require('x-loginpassword/x-loginpassword');

/**
 * Build a custom tag <x-loginconnection> with no attribute
 */
(function () {

  class LoginConnectionComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      // Parameters

      self._content = undefined;

      return self;
    }

    //get content () { return this._content; }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        default:
          break;
      }
    }

    _getLogin () {
      // For debug
      if (this.element.hasAttribute('PulseLogin')) {
        return this.element.getAttribute('PulseLogin');
      }
      // Normal
      return pulseLogin.getLogin();
    }

    initialize () {
      // Attributes

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Loader -> Not needed here

      // Create DOM - LOGIN Content
      this._loginPass = pulseUtility.createjQueryElementWithAttribute('x-loginpassword', {});

      this._loginContent = $('<div></div>').addClass('loginconnection-login-content')
        .append(this._loginPass); //.append(loginLabel).append(passLabel);
      this._content = $('<div></div>').addClass('loginconnection-content')
        .append(this._loginContent);

      this._loginOauthContent = $('<div></div>').addClass('loginconnection-login-oauth-content');
      this._content.append(this._loginOauthContent);
      this._loginOauthContent.hide();

      // Create DOM - message for error
      this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      this._messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this._content).append(this._messageDiv);

      // Add button AFTER message
      /*this._loginButton = $('<button></button>').addClass('loginconnection-login-button')
        .html('Log in');
      let divBtn = $('<div></div>').addClass('loginconnection-login-button-div')
        .append(this._loginButton);
      this._loginContent.append(divBtn);*/

      $(this.element).append(this._content);

      // Press on buttons
      //this._defineClickButtons();

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    validateParameters () {
      this.switchToNextContext();
    }

    displayError (message) {
      $(this._messageDiv).show();
      $(this._messageSpan).html(message);
    }

    removeError () {
      $(this._messageDiv).hide();
      $(this._messageSpan).html('');
    }

    getShortUrl () {
      // Return the Web Service URL here without path
      return 'User/AuthenticationMethods';
    }

    manageError (data) {
      pulseLogin.cleanAuthentication();
      super.manageError();
    }

    refresh (data) {
      pulseLogin.cleanAuthentication();
      if (!data.UserPasswordAuthentication) {
        this._loginContent.hide();
      }
      else {
        this._loginContent.show();
      }
      let tmpAuth = data.OAuth2Methods;
      /*[
        {
          'AuthenticationName': 'Facedebook',
          'AuthenticationKind': 'FacebookOauth2',
          'StateRequired': true,
          'LoginRequired': false,
          'AuthenticationUrl': ''
        },
        {
          'AuthenticationName': 'Git hub',
          'AuthenticationKind': 'GithubOauth2',
          'StateRequired': true,
          'LoginRequired': true,
          'AuthenticationUrl': ''
        }
      ];*/

      if (tmpAuth.length == 0) {
        this._loginOauthContent.hide();
      }
      else {
        this._loginOauthContent.empty();
        this._loginOauthContent.show();
      }
      for (let iMeth = 0; iMeth < tmpAuth.length; iMeth++) {
        // Main
        let authDiv = $('<div></div>').addClass('loginconnection-oauth');
        $(this._loginOauthContent).append(authDiv);

        // Attributes for click
        authDiv.attr('AuthenticationKind', tmpAuth[iMeth].AuthenticationKind);
        authDiv.attr('AuthenticationName', tmpAuth[iMeth].AuthenticationName);
        authDiv.attr('StateRequired', tmpAuth[iMeth].StateRequired);
        authDiv.attr('LoginRequired', tmpAuth[iMeth].LoginRequired);
        authDiv.attr('AuthenticationUrl', tmpAuth[iMeth].AuthenticationUrl);

        // Image
        let authImage = $('<div></div>').addClass('loginconnection-oauth-image');

        let imgUrl = 'images/login-' + tmpAuth[iMeth].AuthenticationKind + '.svg';
        authImage.css('backgroundImage', 'url(' + imgUrl + ')');
        authImage.src = imgUrl;

        authDiv.append(authImage);

        // Moved LATER pulseSvg.inlineBackgroundSvg(authImage);

        // Name
        let authNameDisplay = $('<span></span>').addClass('loginconnection-oauth-name')
          .html(this.getTranslation('connectWith', 'Connect with ')
           + tmpAuth[iMeth].AuthenticationName);
        authDiv.append(authNameDisplay);

        // Login if required
        if (tmpAuth[iMeth].LoginRequired) {
          let loginEdit = $('<input></input>').addClass('loginconnection-oauth-login-input')
            .attr('type', 'text');
          let loginLabel = $('<label></label>').addClass('loginconnection-oauth-login-label')
            .html(this.getTranslation('user', 'User:'))
            .append(loginEdit);
          authDiv.append(loginLabel);
        }

        // Click
        authNameDisplay.click(
          function (e) {
            let div = $(e.target).closest('.loginconnection-oauth');

            let AuthenticationKind = div[0].getAttribute('AuthenticationKind');
            let AuthenticationName = div[0].getAttribute('AuthenticationName');
            let StateRequired = div[0].getAttribute('StateRequired');
            let LoginRequired = div[0].getAttribute('LoginRequired');
            let AuthenticationUrl = div[0].getAttribute('AuthenticationUrl');
            let login = '';

            if ("true" == LoginRequired) {
              let loginEdits = $(div).find('.loginconnection-oauth-login-input');
              if (loginEdits.length > 0)
                login = loginEdits[0].val();
              // replace in URL
              AuthenticationUrl = AuthenticationUrl.replace('{{login}}', login);
            }

            // Store AuthenticationKind / AuthenticationName' / 'State':
            let state = pulseLogin.storeAuthentication(AuthenticationKind,
              AuthenticationName, StateRequired, login);

            if ("true" == StateRequired) {
              // replace in URL
              AuthenticationUrl = AuthenticationUrl.replace('{{state}}', state);
            }

            window.location.href = AuthenticationUrl;
          }
        );

        // Click
        authImage.click(
          function (e) {
            let div = $(e.target).closest('.loginconnection-oauth');

            let AuthenticationKind = div[0].getAttribute('AuthenticationKind');
            let AuthenticationName = div[0].getAttribute('AuthenticationName');
            let StateRequired = div[0].getAttribute('StateRequired');
            let LoginRequired = div[0].getAttribute('LoginRequired');
            let AuthenticationUrl = div[0].getAttribute('AuthenticationUrl');
            let login = '';

            if ("true" == LoginRequired) {
              let loginEdits = $(div).find('.loginconnection-oauth-login-input');
              if (loginEdits.length > 0)
                login = loginEdits[0].val();
              // TODO : Replace in URL
              //AuthenticationUrl = AuthenticationUrl.replace('%%login%%', login);
              // ? If login not defined = error ?
            }

            // Store AuthenticationKind / AuthenticationName / State:
            let state = pulseLogin.storeAuthentication(AuthenticationKind,
              AuthenticationName, StateRequired, login);

            if ("true" == StateRequired) {
              // TODO : Replace in URL
              //AuthenticationUrl = AuthenticationUrl.replace('%%state%%', state);
              // ? If state not defined = error ?
            }

            window.location.href = AuthenticationUrl;
          }
        );

        // if only ONE way to connect, use it !
        if (!data.UserPasswordAuthentication
          && tmpAuth.length == 1) {
          authImage.click();
        }

        // Later to hope colored displayed
        pulseSvg.inlineBackgroundSvg(authImage);
      }
    }

    /**
     * Event callback in case a config is updated: (re-)start the component
     *
     * @param {*} event
     */
    onConfigChange (event) {
      //if ( event.target.config == 'myConfig')
      //  this.start();
    }

  }

  pulseComponent.registerElement('x-loginconnection', LoginConnectionComponent);
})();
