// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-workexplorer 
 * @requires module:pulseComponent
 */
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseService = require('pulseService');
var pulseCustomDialog = require('pulseCustomDialog');

(function () {

  class WorkExplorerComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      // DOM - not here
      self._content = undefined;
      self._parents = undefined;
      self._title = undefined;
      self._titleKind = undefined;
      self._titleDisplay = undefined;
      self._reloadBtn = undefined;
      self._children = undefined;
      self._properties = undefined;
      self._buttons = undefined;

      // data
      self._data = undefined;
      self._workStructure = undefined;

      return self;
    }

    //get content () { return this._content; } // Optional

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'kind':
        case 'id':
          this.start();
          break;
        default:
          break;
      }
    }

    initialize () {
      // Update here some internal parameters

      // Listeners and dispatchers

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html(this.getTranslation('loadingDots', 'Loading...')).css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this.element).append(loaderDiv);
      // Create DOM - message for error
      this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this.element).append(messageDiv);

      // Create DOM - Content
      this._content = $('<div></div>').addClass('workexplorer-content');
      $(this.element).append(this._content);

      let header = $('<div></div>').addClass('workexplorer-header');
      this._content.append(header);
      let main = $('<div></div>').addClass('workexplorer-main');
      this._content.append(main);

      // Create DOM - Parents
      this._parents = $('<div></div>').addClass('workexplorer-parents-list');
      let parentsZone = $('<div></div>').addClass('workexplorer-parents');
      parentsZone.append(this._parents);
      header.append(parentsZone);
      // Create DOM - Title
      this._titleKind = $('<div></div>').addClass('workexplorer-title-kind');
      this._titleDisplay = $('<div></div>').addClass('workexplorer-title-display');
      this._title = $('<div></div>').addClass('workexplorer-title');
      this._title.append(this._titleKind).append(this._titleDisplay);
      this._reloadBtn = $('<button></button>').addClass('workexplorer-button-reload')
        .html('Reload');
      this._title.append(this._reloadBtn);
      this._reloadBtn.click(
        function () {
          this.start();
        }.bind(this));
      header.append(this._title);
      this._reloadBtn.hide();
      // Create DOM - children
      this._children = $('<div></div>').addClass('workexplorer-children-list');
      let childrenZone = $('<div></div>').addClass('workexplorer-children');
      childrenZone.append(this._children);
      header.append(childrenZone);
      // Create DOM - Hidden for display
      let hidden = $('<div></div>').addClass('workexplorer-left-hidden');
      main.append(hidden);
      // Create DOM - Properties
      this._properties = $('<div></div>').addClass('workexplorer-properties');
      main.append(this._properties);
      // Create DOM - Buttons
      this._buttons = $('<div></div>').addClass('workexplorer-buttons');
      main.append(this._buttons);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    validateParameters () {
      /*if (!this.element.hasAttribute('kind')) { -> NO ! choose
        console.error('missing attribute kind in workexplorer.element');
        // Immediat display :
        this.switchToKey('Error', () => this.displayError('invalid kind'), () => this.removeError());
        return;
      }*/

      this.switchToNextContext();
    }

    displayError (message) {
      // Code here to display the error message
      $(this._messageSpan).html(message);
      $(this._content).hide();
    }

    removeError () {
      // Code here to remove the error message.
      $(this._messageSpan).html('');
      $(this._content).show();
    }

    getShortUrl () {
      let url = 'WorkStructure';
      if (this.element.hasAttribute('kind')) {
        url += '?Kind=' + this.element.getAttribute('kind');
      }
      return url;
    }

    _showKindSelection () {
      for (let iData = 0; iData < this._data.length; iData++) {
        let kind = this._data[iData].Kind;
        let btn = $('<div></div>').addClass('workexplorer-kind-button');
        btn.attr('kind', kind).html(kind);
        this._titleKind.append(btn);
      }

      $(this._titleKind).find('.workexplorer-kind-button').click(function () {
        let kind = $(this).attr('kind');
        $(this).closest('x-workexplorer')[0].setAttribute('kind', kind);
      });
    }

    refresh (data) {
      // Clean
      this._parents.empty();
      this._titleKind.empty();
      this._titleDisplay.html('');
      this._reloadBtn.hide();
      //this._title.empty(); NEVER ! Maybe revision
      this._children.empty();
      this._properties.empty();
      this._buttons.empty();

      this._data = data;
      this._workStructure = undefined;

      if (this.element.hasAttribute('kind')) {
        let kind = this.element.getAttribute('kind');
        // Find kind in list
        for (let iData = 0; iData < data.length; iData++) {
          if (kind == data[iData].Kind) {
            this._workStructure = data[iData];
          }
        }
      }
      if ((data.length != 1) || this._workStructure == undefined) {
        // Wait for single kind selection
        this._showKindSelection();
        return;
      }

      // Fill according to structure
      //this._workStructure.Kind 'Operation'

      // PROPERTIES
      if (this._workStructure.Properties) { // Hope always
        for (let iProp = 0; iProp < this._workStructure.Properties.length; iProp++) {
          let prop = this._workStructure.Properties[iProp];

          // including 'Name' / 'Code'...

          let propDiv = $('<div></div>').addClass('workexplorer-prop').addClass(prop.Key);

          let label = $('<label></label>').addClass('workexplorer-label').html(prop.Label);
          label.attr('for', prop.Key);
          propDiv.append(label);

          let value = $('<div></div>').addClass('workexplorer-value');

          switch (prop.Format) {
            case 'String': {
              let input = $('<input></input>').addClass('workexplorer-string');
              input.attr('type', 'text');
              // limits
              if (prop.Limits) {
                if (prop.Limits.Maxsize) {
                  // Max number of chars
                  input.attr('maxlength', prop.Limits.Maxsize);
                }
              }
              if (prop.Default) {
                //input.attr('default', prop.Default);
                input.value = prop.Default;
              }
              value.append(input);
            } break;
            case 'URL': {
              let input = $('<input></input>').addClass('workexplorer-URL');
              input.attr('type', 'url'); // URL -> check format ? Auto
              if (prop.Default) {
                //input.attr('default', prop.Default);
                input.value = prop.Default;
              }
              value.append(input);
            } break;
            case 'Integer': {
              let input = $('<input></input>').addClass('workexplorer-integer');
              value.attr('type', 'number');
              // limits
              if (prop.Limits) {
                //value.attr('limits', prop.Limits);
                if (prop.Limits.Min) {
                  input.attr('min', prop.Limits.Min);
                }
                if (prop.Limits.Max) {
                  input.attr('max', prop.Limits.Max);
                }
                if (prop.Limits.Step) {
                  input.attr('step', prop.Limits.Step);
                }
              }
              if (prop.Default) {
                //input.attr('default', prop.Default);
                input.value = prop.Default;
              }
              value.append(input);
            } break;
            case 'Float': { // ????? text ?
              let input = $('<input></input>').addClass('workexplorer-float');
              value.attr('type', 'number');
              // limits
              if (prop.Limits) {
                //value.attr('limits', prop.Limits);
                if (prop.Limits.Min) {
                  input.attr('min', prop.Limits.Min);
                }
                if (prop.Limits.Max) {
                  input.attr('max', prop.Limits.Max);
                }
              }
              if (prop.Default) {
                //input.attr('default', prop.Default);
                input.value = prop.Default;
              }
              value.append(input);
            } break;
            case 'Duration': {
              // Days
              let days = $('<input></input>').addClass('workexplorer-days');
              days.attr('type', 'number');
              // limits
              if (prop.Limits) {
                if (prop.Limits.Min) {
                  days.attr('min', prop.Limits.Min);
                }
                if (prop.Limits.Max) {
                  days.attr('max', prop.Limits.Max);
                  if (prop.Limits.Max < 24 * 60 * 60) { // 24h
                    days.hide();
                  }
                }
                /*if (prop.Limits.Step) {
                  days.attr('step', prop.Limits.Step);
                }*/
              }
              if (prop.Default) {
                //value.attr('default', prop.Default);
                if (prop.Default <= 24 * 60 * 60) { // 24h
                  days.attr('default', 0);
                }
                else {
                  days.attr('default', Math.floor(prop.Default / (24 * 60 * 60)));
                }
              }
              if (prop.Required) {
                days.addClass('required');
              }
              if (prop.ReadOnly && true == prop.ReadOnly) {
                days.addClass('readonly');
              }
              days.attr('name', prop.Key);
              days.attr('propformat', prop.Format);
              value.append(days);

              // span 'days'
              let unit = $('<span></span>').addClass('workexplorer-unit').html('days');
              value.append(unit);
              if (prop.Limits) {
                if (prop.Limits.Max) {
                  days.attr('max', prop.Limits.Max);
                  if (prop.Limits.Max < 24 * 60 * 60) { // 24h
                    unit.hide();
                  }
                }
              }

              // Time
              let time = $('<input></input>').addClass('workexplorer-duration');
              time.attr('type', 'time');
              // limits
              if (prop.Limits) {
                if (prop.Limits.Min) {
                  time.attr('min', pulseUtility.secondsToHHMMSS(prop.Limits.Min));
                }
                if (prop.Limits.Max) {
                  if (prop.Limits.Max < 24 * 60 * 60) { // 24h
                    time.attr('max', pulseUtility.secondsToHHMMSS(prop.Limits.Max));
                  }
                }
                if (prop.Limits.Step) {
                  // TO DO : seconds ? -> to do
                }
                if (prop.Limits.Nullable) {
                  // TO DO : Add check box 'No Value'
                }
              }
              if (prop.Default) {
                if (prop.Default < 24 * 60 * 60) { // 24h
                  time.attr('default', pulseUtility.secondsToHHMMSS(prop.Default));
                }
                else {
                  time.attr('default', pulseUtility.secondsToHHMMSS(prop.Default % (24 * 60 * 60)));
                  //time.value(pulseUtility.secondsToHHMMSS(prop.Default % (24 * 60 * 60)));
                }
              }
              value.append(time);
            } break;
            case 'Enum': {
              let input = $('<select></select>').addClass('workexplorer-enum');
              // limits
              if (prop.Limits) {
                //value.attr('limits', prop.Limits);
                if (prop.Limits.Enum) {
                  for (let iEnum = 0; iEnum < prop.Limits.Enum.length; iEnum++) {
                    let display = prop.Limits.Enum[iEnum];
                    input.append('<option id="workexplorer-' + display + '" value="' + display + '">' + display + '</option>');
                  }
                }
                if (prop.Default) {
                  // Set default selection
                  input.val(prop.Default);
                }
              }
              value.append(input);
            } break;
            case 'Boolean': {
              let input = $('<input></input>').addClass('workexplorer-bool');
              input.attr('type', 'checkbox');
              if (prop.Limits) {
                if (prop.Limits.Nullable) {
                  // TO DO : Add check box 'No Value'
                }
              }
              if (prop.Default) {
                input.prop('checked', prop.Default);
              }
              value.append(input);
            } break;
            case 'Table': {
              // Not defined yet !
              let span = $('<span></span>').html('Not defined yet ! ');
              value.append(span);
            } break;

          } // end switch format

          // Common
          if (prop.Required) {
            value.addClass('required');
          }
          if (prop.ReadOnly && true == prop.ReadOnly) {
            value.addClass('readonly');
          }
          value.attr('name', prop.Key);
          value.attr('propformat', prop.Format);
          propDiv.append(value);

          // Commmon : unit
          if (prop.Unit) {
            let unit = $('<span></span>').addClass('workexplorer-unit').html(prop.Unit);
            value.append(unit);
          }

          // Common + add change button - disabled for the moment
          if (!prop.ReadOnly) { // false or undefined
            value = $('<div></div>').addClass('workexplorer-prop-button');
            value.attr('name', prop.Key);
            value.attr('propformat', prop.Format);
            propDiv.append(value);
          }

          this._properties.append(propDiv);

        }
      }

      // Parents
      //this._workStructure.ParentKind ???

      // Children
      //this._workStructure.ChildKind ???

      // Buttons
      // If 'id' is not defined -> 'NEW'
      if (!this.element.hasAttribute('id')) {
        let newBtn = $('<button></button>').addClass('workexplorer-button-new').html('Save New');
        this._buttons.append(newBtn);

        newBtn.click(
          function () {
            this._saveNew();
          }.bind(this));
      }
      //this._workStructure.Actions -> LATER !!!

      // if 'id' is defined -> read values to fill fields
      if (this.element.hasAttribute('id')) {
        let url = this.getConfigOrAttribute('path', '')
          + 'WorkRead?Kind=' + this.element.getAttribute('kind')
          + '&Id=' + this.element.getAttribute('id');

        pulseService.runAjaxSimple(url,
          this._readSuccess.bind(this),
          this._readError.bind(this),
          this._readFail.bind(this));
      }
    }

    _readFail (url, isTimeout, xhrStatus) {
      // Do Nothing ?:
      this.switchToKey('Error', () => this.displayError('invalid id - failure'), () => this.removeError());
    }
    _readError (data) {
      // Do Nothing ?:
      this.switchToKey('Error', () => this.displayError('invalid id - error'), () => this.removeError());
    }
    _readSuccess (data) {
      // data.Id == attr
      // data.Kind == attr

      // HEADER : title / revisions
      this._titleDisplay.html(data.Display);
      this._reloadBtn.show();

      // PARENTS
      this._parents.empty();
      if (data.Parents) {
        for (let iParent = 0; iParent < data.Parents.length; iParent++) {
          let selection = $('<div></div>').addClass('workexplorer-single-parent')
            .attr('Id', data.Parents[iParent].Id)
            .attr('Kind', data.Parents[iParent].Kind);
          if (data.Parents[iParent].Order) {
            selection.attr('Order', data.Parents[iParent].Order);
            $(selection).css('order', data.Parents[iParent].Order);
          }

          let row = $('<div></div>').addClass('workexplorer-parent-row');
          //row.append($('<div class="reorderHighlight"></div>'));  // smartphone ?
          //row.append($('<div class="reorderUpButton"></div>'));   // smartphone ?
          //row.append($('<div class="reorderDownButton"></div>')); // smartphone ?
          //row.append($('<div class="reorderButton"></div>'));

          let spanDisplay = $('<span></span>').addClass('workexplorer-parent-display')
            .html(data.Parents[iParent].Display);
          $(spanDisplay).attr('kind', data.Parents[iParent].Id);
          $(spanDisplay).attr('itemid', data.Parents[iParent].Kind);

          //let removeButton = $('<div></div>').addClass('remove-button');
          row.append(spanDisplay); //.append(removeButton);

          selection.append(row);
          this._parents.append(selection);

          // click = reload page with new display
          spanDisplay.click(
            function () {
              let kind = $(this).attr('kind');
              let itemid = $(this).attr('itemid');

              let href = window.location.href;
              href = pulseUtility.changeURLParameter(href, 'kind', kind);
              href = pulseUtility.changeURLParameter(href, 'id', itemid);
              window.location.href = href;
            });
        }
      }
      // CHILDREN
      this._children.empty();
      if (data.Children) {
        for (let iChild = 0; iChild < data.Children.length; iChild++) {
          data.Children[iChild].Id;
          data.Children[iChild].Kind;
          data.Children[iChild].Display;
          data.Children[iChild].Order;

          let selection = $('<div></div>').addClass('workexplorer-child')
            .attr('Id', data.Children[iChild].Id)
            .attr('Kind', data.Children[iChild].Kind);
          if (data.Children[iChild].Order) {
            selection.attr('Order', data.Children[iChild].Order);
            $(selection).css('order', data.Children[iChild].Order);
          }

          let row = $('<div></div>').addClass('workexplorer-child-row');
          //row.append($('<div class="reorderHighlight"></div>'));  // smartphone ?
          //row.append($('<div class="reorderUpButton"></div>'));   // smartphone ?
          //row.append($('<div class="reorderDownButton"></div>')); // smartphone ?
          //row.append($('<div class="reorderButton"></div>'));

          let spanDisplay = $('<span></span>').addClass('workexplorer-child-display')
            .html(data.Children[iChild].Display);
          $(spanDisplay).attr('kind', data.Children[iChild].Id);
          $(spanDisplay).attr('itemid', data.Children[iChild].Kind);
          //let removeButton = $('<div></div>').addClass('remove-button');
          row.append(spanDisplay); //.append(removeButton);

          selection.append(row);
          this._children.append(selection);

          // click = reload page with new display
          spanDisplay.click(
            function () {
              let kind = $(this).attr('kind');
              let itemid = $(this).attr('itemid');

              let href = window.location.href;
              href = pulseUtility.changeURLParameter(href, 'kind', kind);
              href = pulseUtility.changeURLParameter(href, 'id', itemid);
              window.location.href = href;
            });
        }
      }
      // PROPERTIES
      if (data.Properties) {
        for (let iProp = 0; iProp < data.Properties.length; iProp++) {
          let prop = data.Properties[iProp];

          // Find
          let valueDiv = $(this._properties).find('.workexplorer-value[name="' + prop.Key + '"]');
          let inputDiv = $(valueDiv).find('input');

          // Special set value
          if ('Boolean' == valueDiv.attr('propformat')) {
            inputDiv.prop('checked', prop.Value);
          }
          else if ('Duration' == valueDiv.attr('propformat')) {
            let days = $(valueDiv).find('.workexplorer-days');
            let duration = $(valueDiv).find('.workexplorer-duration');
            duration[0].value = pulseUtility.secondsToHHMMSS(prop.Value % (24 * 60 * 60));
            days[0].value = Math.floor(prop.Value / (24 * 60 * 60));
          }
          else if ('Enum' == valueDiv.attr('propformat')) {
            // Get the select element
            //let selectElement = document.getElementsByTagName('select');
            let selectElement = $(valueDiv).find('select')[0];
            // Get the options.
            let selectOptions = selectElement.options;
            // Loop through these options using a for loop.
            for (let j = 0; j < selectOptions.length; j++) {
              let opt = selectOptions[j]
              // If the option of value is equal to the option we want to select.
              if (opt.value == prop.Value) {
                // Select the option and break out of the for loop.
                selectElement.selectedIndex = j;
                break;
              }
            }
          }
          else { // Default
            // Default set value (text, number...)
            inputDiv.val(prop.Value);
            // same as inputDiv.value = prop.Value;
          }
        }
      }
    }

    _saveNew () {
      // Get parents
      let parents = [];

      let parentsDiv = this._parents.find('.workexplorer-single-parent');
      for (let iP = 0; iP < parentsDiv.length; iP++) {
        let aParent = {
          'Id': parentsDiv[iP].attr('Id'),
          'Kind': parentsDiv[iP].attr('Kind')
          //,'Order': parentsDiv[iP].attr('Order')
        };
        parents.push(aParent);
      }

      // Get children
      let children = [];

      let childrenDiv = this._children.find('.workexplorer-child');
      for (let iChild = 0; iChild < childrenDiv.length; iChild++) {
        let aChild = {
          'Id': childrenDiv[iChild].attr('Id'),
          'Kind': childrenDiv[iChild].attr('Kind')
          //,'Order': childrenDiv[iChild].attr('Order')
        };
        children.push(aChild);
      }

      // Get properties
      let properties = [];
      if (this._workStructure.Properties) { // Hope always
        for (let iProp = 0; iProp < this._workStructure.Properties.length; iProp++) {
          let prop = this._workStructure.Properties[iProp];
          let key = prop.Key;
          let propDiv = this._properties.find('.' + key);
          let value = null;
          switch (prop.Format) {
            case 'String': {
              value = propDiv.find('input').value;
              // limits
              if (prop.Limits) {
                if (prop.Limits.Maxsize) {
                  // Max number of chars
                  if (value.length > prop.Limits.Maxsize) {
                    pulseCustomDialog.openError('Check limits');
                    return;
                  }
                }
              }
            } break;
            case 'URL': {
              value = propDiv.find('input').value;
            } break;
            case 'Integer': {
              value = propDiv.find('input').value;
              // limits
              if (prop.Limits) {
                if (prop.Limits.Min) {
                  if (value < prop.Limits.Min) {
                    pulseCustomDialog.openError('Check limits');
                    return;
                  }
                }
                if (prop.Limits.Max) {
                  if (value > prop.Limits.Max) {
                    pulseCustomDialog.openError('Check limits');
                    return;
                  }
                }
              }
            } break;
            case 'Float': {
              value = propDiv.find('input').value;
              // limits
              if (prop.Limits) {
                if (prop.Limits.Min) {
                  if (value < prop.Limits.Min) {
                    pulseCustomDialog.openError('Check limits');
                    return;
                  }
                }
                if (prop.Limits.Max) {
                  if (value > prop.Limits.Max) {
                    pulseCustomDialog.openError('Check limits');
                    return;
                  }
                }
              }
            } break;
            case 'Duration': {
              let days = propDiv.find('.workexplorer-days').value;
              let time = propDiv.find('.workexplorer-time').value;

              value = pulseUtility.HHMMSStoSeconds(time) + days * 24 * 60 * 60;
              // limits
              if (prop.Limits) {
                if (prop.Limits.Min) {
                  if (value < prop.Limits.Min) {
                    pulseCustomDialog.openError('Check limits');
                    return;
                  }
                }
                if (prop.Limits.Max) {
                  if (value > prop.Limits.Max) {
                    pulseCustomDialog.openError('Check limits');
                    return;
                  }
                }

              }
              if (prop.Required) {
                // ???
              }
            } break;
            case 'Enum': {
              let select = propDiv.find('select');
              value = select.options[select.selectedIndex].value;
            } break;
            case 'Boolean': {
              value = propDiv.find('input').prop('checked');
            } break;
            default: {
              // Do nothing
            }

          } // end switch format

          if (prop.Required && null == value) {
            pulseCustomDialog.openError('Fill mandatory field ! ');
            return;
          }

          let newProp = {
            'Key': key,
            'Value': value
          };
          properties.push(newProp);
        } //end for
      }

      var WorkNewJSON = {
        'Kind': this.element.getAttribute('kind'), //'Operation',
        'Parents': parents,
        'Children': children,
        'Properties': properties
      };

      // POST

      let url = this.getConfigOrAttribute('path', '') + 'WorkNew/Post'
        + '?Kind=' + this.element.getAttribute('kind');

      let timeout = this.timeout;
      pulseService.postAjax(0, url,
        { 'WorkToWrite': WorkNewJSON },
        timeout,
        this._saveNewSuccess.bind(this),
        this._saveNewError.bind(this),
        this._saveNewFail.bind(this));
    }


    // Called when successfully saved
    _saveNewSuccess (ajaxToken, data) {
      console.log('_saveSuccess');
      //console.info('Reason revision id=' + data.Revision.Id);

      // RE-LOAD
      let href = window.location.href;
      href = pulseUtility.changeURLParameter(href, 'kind', data.Kind);
      href = pulseUtility.changeURLParameter(href, 'id', data.Id);
      window.location.href = href;
    }

    _saveNewError (ajaxToken, data) {
      // ignore ajaxToken
      let errorMessage = 'Error';
      if (typeof data === 'undefined') {
        errorMessage = 'undefined error data';
      }
      else {
        let status = data.Status;
        if (typeof status === 'undefined') {
          errorMessage = 'undefined error data status';
        }
        else {
          if (typeof (status) != 'undefined') {
            errorMessage = `unknown status ${status}, ${data.ErrorMessage}`;
          }
          else {
            errorMessage = data.ErrorMessage;
          }
        }
      }
      pulseCustomDialog.openError(errorMessage);
      return;
    }

    _saveNewFail (ajaxToken, url, isTimeout, xhrStatus) {
      // ignore ajaxToken
      if (isTimeout) {
        pulseCustomDialog.openError('Timeout');
      }
      else {
        let message = pulseService.getAjaxErrorMessage(xhrStatus);
        pulseCustomDialog.openError(message);
      }
    }


    // Callback events

    /**
     * Event callback in case a config is updated: (re-)start the component
     *
     * @param {*} event
     */
    onConfigChange (event) {
      // Default = do nothing
    }
  }

  pulseComponent.registerElement('x-workexplorer', WorkExplorerComponent, ['kind', 'id']);
})();
