// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-workexplorer 
 * @requires module:pulseComponent
 */
import * as pulseComponent from 'pulsecomponent';
import * as pulseUtility from 'pulseUtility';
import * as pulseService from 'pulseService';
import pulseCustomDialog from 'pulseCustomDialog';

(function () {

  /**
   * `<x-workexplorer>` — hierarchical browser for the
   * work-order / component / operation tree.
   *
   * Fetches `WorkStructure?Kind=<kind>[&Id=<id>]` and renders the
   * current level with a title row, a parents/children breakdown and an
   * action bar; navigating into a child sets `id` / `kind` and triggers
   * a new fetch. Leaves can open the work-order assignment dialog via
   * `pulseCustomDialog`.
   *
   * @element x-workexplorer
   * @attr {string} kind starting work-structure kind
   * @attr {string} id   id of the currently focused node
   * @extends pulseComponent.PulseParamAutoPathSingleRequestComponent
   */
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
      this.element.replaceChildren();

      // Create DOM - Loader
      let loader = document.createElement('div');
      loader.classList.add('pulse-loader');
      loader.innerHTML = this.getTranslation('loadingDots', 'Loading...');
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.classList.add('pulse-loader-div');
      loaderDiv.appendChild(loader);
      this.element.appendChild(loaderDiv);
      // Create DOM - message for error
      this._messageSpan = document.createElement('span');
      this._messageSpan.classList.add('pulse-message');
      this._messageSpan.innerHTML = '';
      let messageDiv = document.createElement('div');
      messageDiv.classList.add('pulse-message-div');
      messageDiv.appendChild(this._messageSpan);
      this.element.appendChild(messageDiv);

      // Create DOM - Content
      this._content = document.createElement('div');
      this._content.classList.add('workexplorer-content');
      this.element.appendChild(this._content);

      let header = document.createElement('div');
      header.classList.add('workexplorer-header');
      this._content.appendChild(header);
      let main = document.createElement('div');
      main.classList.add('workexplorer-main');
      this._content.appendChild(main);

      // Create DOM - Parents
      this._parents = document.createElement('div');
      this._parents.classList.add('workexplorer-parents-list');
      let parentsZone = document.createElement('div');
      parentsZone.classList.add('workexplorer-parents');
      parentsZone.appendChild(this._parents);
      header.appendChild(parentsZone);
      // Create DOM - Title
      this._titleKind = document.createElement('div');
      this._titleKind.classList.add('workexplorer-title-kind');
      this._titleDisplay = document.createElement('div');
      this._titleDisplay.classList.add('workexplorer-title-display');
      this._title = document.createElement('div');
      this._title.classList.add('workexplorer-title');
      this._title.appendChild(this._titleKind);
      this._title.appendChild(this._titleDisplay);
      this._reloadBtn = document.createElement('button');
      this._reloadBtn.classList.add('workexplorer-button-reload');
      this._reloadBtn.innerHTML = this.getTranslation('reload', 'Reload');
      this._title.appendChild(this._reloadBtn);
      this._reloadBtn.addEventListener('click',
        function () {
          this.start();
        }.bind(this));
      header.appendChild(this._title);
      this._reloadBtn.style.display = 'none';
      // Create DOM - children
      this._children = document.createElement('div');
      this._children.classList.add('workexplorer-children-list');
      let childrenZone = document.createElement('div');
      childrenZone.classList.add('workexplorer-children');
      childrenZone.appendChild(this._children);
      header.appendChild(childrenZone);
      // Create DOM - Hidden for display
      let hidden = document.createElement('div');
      hidden.classList.add('workexplorer-left-hidden');
      main.appendChild(hidden);
      // Create DOM - Properties
      this._properties = document.createElement('div');
      this._properties.classList.add('workexplorer-properties');
      main.appendChild(this._properties);
      // Create DOM - Buttons
      this._buttons = document.createElement('div');
      this._buttons.classList.add('workexplorer-buttons');
      main.appendChild(this._buttons);

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
      this._messageSpan.innerHTML = message;
      this._content.style.display = 'none';
    }

    removeError () {
      // Code here to remove the error message.
      this._messageSpan.innerHTML = '';
      this._content.style.display = '';
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
        let btn = document.createElement('div');
        btn.classList.add('workexplorer-kind-button');
        btn.setAttribute('kind', kind);
        btn.innerHTML = kind;
        this._titleKind.appendChild(btn);
      }

      let buttons = this._titleKind.querySelectorAll('.workexplorer-kind-button');
      buttons.forEach(btn => {
        btn.addEventListener('click', function () {
          let kind = this.getAttribute('kind');
          this.closest('x-workexplorer').setAttribute('kind', kind);
        });
      });
    }

    refresh (data) {
      // Clean
      this._parents.replaceChildren();
      this._titleKind.replaceChildren();
      this._titleDisplay.innerHTML = '';
      this._reloadBtn.style.display = 'none';
      //this._title.replaceChildren(); NEVER ! Maybe revision
      this._children.replaceChildren();
      this._properties.replaceChildren();
      this._buttons.replaceChildren();

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

          let propDiv = document.createElement('div');
          propDiv.classList.add('workexplorer-prop');
          propDiv.classList.add(prop.Key);

          let label = document.createElement('label');
          label.classList.add('workexplorer-label');
          label.innerHTML = prop.Label;
          label.setAttribute('for', prop.Key);
          propDiv.appendChild(label);

          let value = document.createElement('div');
          value.classList.add('workexplorer-value');

          switch (prop.Format) {
            case 'String': {
              let input = document.createElement('input');
              input.classList.add('workexplorer-string');
              input.setAttribute('type', 'text');
              // limits
              if (prop.Limits) {
                if (prop.Limits.Maxsize) {
                  // Max number of chars
                  input.setAttribute('maxlength', prop.Limits.Maxsize);
                }
              }
              if (prop.Default) {
                //input.setAttribute('default', prop.Default);
                input.value = prop.Default;
              }
              value.appendChild(input);
            } break;
            case 'URL': {
              let input = document.createElement('input');
              input.classList.add('workexplorer-URL');
              input.setAttribute('type', 'url'); // URL -> check format ? Auto
              if (prop.Default) {
                //input.setAttribute('default', prop.Default);
                input.value = prop.Default;
              }
              value.appendChild(input);
            } break;
            case 'Integer': {
              let input = document.createElement('input');
              input.classList.add('workexplorer-integer');
              value.setAttribute('type', 'number');
              // limits
              if (prop.Limits) {
                //value.setAttribute('limits', prop.Limits);
                if (prop.Limits.Min) {
                  input.setAttribute('min', prop.Limits.Min);
                }
                if (prop.Limits.Max) {
                  input.setAttribute('max', prop.Limits.Max);
                }
                if (prop.Limits.Step) {
                  input.setAttribute('step', prop.Limits.Step);
                }
              }
              if (prop.Default) {
                //input.setAttribute('default', prop.Default);
                input.value = prop.Default;
              }
              value.appendChild(input);
            } break;
            case 'Float': { // ????? text ?
              let input = document.createElement('input');
              input.classList.add('workexplorer-float');
              value.setAttribute('type', 'number');
              // limits
              if (prop.Limits) {
                //value.setAttribute('limits', prop.Limits);
                if (prop.Limits.Min) {
                  input.setAttribute('min', prop.Limits.Min);
                }
                if (prop.Limits.Max) {
                  input.setAttribute('max', prop.Limits.Max);
                }
              }
              if (prop.Default) {
                //input.setAttribute('default', prop.Default);
                input.value = prop.Default;
              }
              value.appendChild(input);
            } break;
            case 'Duration': {
              // Days
              let days = document.createElement('input');
              days.classList.add('workexplorer-days');
              days.setAttribute('type', 'number');
              // limits
              if (prop.Limits) {
                if (prop.Limits.Min) {
                  days.setAttribute('min', prop.Limits.Min);
                }
                if (prop.Limits.Max) {
                  days.setAttribute('max', prop.Limits.Max);
                  if (prop.Limits.Max < 24 * 60 * 60) { // 24h
                    days.style.display = 'none';
                  }
                }
                /*if (prop.Limits.Step) {
                  days.setAttribute('step', prop.Limits.Step);
                }*/
              }
              if (prop.Default) {
                //value.setAttribute('default', prop.Default);
                if (prop.Default <= 24 * 60 * 60) { // 24h
                  days.setAttribute('default', 0);
                }
                else {
                  days.setAttribute('default', Math.floor(prop.Default / (24 * 60 * 60)));
                }
              }
              if (prop.Required) {
                days.classList.add('required');
              }
              if (prop.ReadOnly && true == prop.ReadOnly) {
                days.classList.add('readonly');
              }
              days.setAttribute('name', prop.Key);
              days.setAttribute('propformat', prop.Format);
              value.appendChild(days);

              // span 'days'
              let unit = document.createElement('span');
              unit.classList.add('workexplorer-unit');
              unit.innerHTML = 'days';
              value.appendChild(unit);
              if (prop.Limits) {
                if (prop.Limits.Max) {
                  days.setAttribute('max', prop.Limits.Max);
                  if (prop.Limits.Max < 24 * 60 * 60) { // 24h
                    unit.style.display = 'none';
                  }
                }
              }

              // Time
              let time = document.createElement('input');
              time.classList.add('workexplorer-duration');
              time.setAttribute('type', 'time');
              // limits
              if (prop.Limits) {
                if (prop.Limits.Min) {
                  time.setAttribute('min', pulseUtility.secondsToHHMMSS(prop.Limits.Min));
                }
                if (prop.Limits.Max) {
                  if (prop.Limits.Max < 24 * 60 * 60) { // 24h
                    time.setAttribute('max', pulseUtility.secondsToHHMMSS(prop.Limits.Max));
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
                  time.setAttribute('default', pulseUtility.secondsToHHMMSS(prop.Default));
                }
                else {
                  time.setAttribute('default', pulseUtility.secondsToHHMMSS(prop.Default % (24 * 60 * 60)));
                  //time.value = pulseUtility.secondsToHHMMSS(prop.Default % (24 * 60 * 60));
                }
              }
              value.appendChild(time);
            } break;
            case 'Enum': {
              let input = document.createElement('select');
              input.classList.add('workexplorer-enum');
              // limits
              if (prop.Limits) {
                //value.setAttribute('limits', prop.Limits);
                if (prop.Limits.Enum) {
                  for (let iEnum = 0; iEnum < prop.Limits.Enum.length; iEnum++) {
                    let display = prop.Limits.Enum[iEnum];
                    let option = document.createElement('option');
                    option.setAttribute('id', 'workexplorer-' + display);
                    option.setAttribute('value', display);
                    option.textContent = display;
                    input.appendChild(option);
                  }
                }
                if (prop.Default) {
                  // Set default selection
                  input.value = prop.Default;
                }
              }
              value.appendChild(input);
            } break;
            case 'Boolean': {
              let input = document.createElement('input');
              input.classList.add('workexplorer-bool');
              input.setAttribute('type', 'checkbox');
              if (prop.Limits) {
                if (prop.Limits.Nullable) {
                  // TO DO : Add check box 'No Value'
                }
              }
              if (prop.Default) {
                input.checked = prop.Default;
              }
              value.appendChild(input);
            } break;
            case 'Table': {
              // Not defined yet !
              let span = document.createElement('span');
              span.innerHTML = 'Not defined yet ! ';
              value.appendChild(span);
            } break;

          } // end switch format

          // Common
          if (prop.Required) {
            value.classList.add('required');
          }
          if (prop.ReadOnly && true == prop.ReadOnly) {
            value.classList.add('readonly');
          }
          value.setAttribute('name', prop.Key);
          value.setAttribute('propformat', prop.Format);
          propDiv.appendChild(value);

          // Commmon : unit
          if (prop.Unit) {
            let unit = document.createElement('span');
            unit.classList.add('workexplorer-unit');
            unit.innerHTML = prop.Unit;
            value.appendChild(unit);
          }

          // Common + add change button - disabled for the moment
          if (!prop.ReadOnly) { // false or undefined
            value = document.createElement('div');
            value.classList.add('workexplorer-prop-button');
            value.setAttribute('name', prop.Key);
            value.setAttribute('propformat', prop.Format);
            propDiv.appendChild(value);
          }

          this._properties.appendChild(propDiv);

        }
      }

      // Parents
      //this._workStructure.ParentKind ???

      // Children
      //this._workStructure.ChildKind ???

      // Buttons
      // If 'id' is not defined -> 'NEW'
      if (!this.element.hasAttribute('id')) {
        let newBtn = document.createElement('button');
        newBtn.classList.add('workexplorer-button-new');
        newBtn.innerHTML = this.getTranslation('saveNew', 'Save New');
        this._buttons.appendChild(newBtn);

        newBtn.addEventListener('click',
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
      this._titleDisplay.innerHTML = data.Display;
      this._reloadBtn.style.display = '';

      // PARENTS
      this._parents.replaceChildren();
      if (data.Parents) {
        for (let iParent = 0; iParent < data.Parents.length; iParent++) {
          let selection = document.createElement('div');
          selection.classList.add('workexplorer-single-parent');
          selection.setAttribute('Id', data.Parents[iParent].Id);
          selection.setAttribute('Kind', data.Parents[iParent].Kind);
          if (data.Parents[iParent].Order) {
            selection.setAttribute('Order', data.Parents[iParent].Order);
            selection.style.order = data.Parents[iParent].Order;
          }

          let row = document.createElement('div');
          row.classList.add('workexplorer-parent-row');
          //row.appendChild(document.createElement('div')).className = 'reorderHighlight';  // smartphone ?
          //row.appendChild(document.createElement('div')).className = 'reorderUpButton';   // smartphone ?
          //row.appendChild(document.createElement('div')).className = 'reorderDownButton'; // smartphone ?
          //row.appendChild(document.createElement('div')).className = 'reorderButton';

          let spanDisplay = document.createElement('span');
          spanDisplay.classList.add('workexplorer-parent-display');
          spanDisplay.innerHTML = data.Parents[iParent].Display;
          spanDisplay.setAttribute('kind', data.Parents[iParent].Id);
          spanDisplay.setAttribute('itemid', data.Parents[iParent].Kind);

          //let removeButton = document.createElement('div'); removeButton.className = 'remove-button';
          row.appendChild(spanDisplay); //row.appendChild(removeButton);

          selection.appendChild(row);
          this._parents.appendChild(selection);

          // click = reload page with new display
          spanDisplay.addEventListener('click',
            function () {
              let kind = this.getAttribute('kind');
              let itemid = this.getAttribute('itemid');

              let href = window.location.href;
              href = pulseUtility.changeURLParameter(href, 'kind', kind);
              href = pulseUtility.changeURLParameter(href, 'id', itemid);
              window.location.href = href;
            });
        }
      }
      // CHILDREN
      this._children.replaceChildren();
      if (data.Children) {
        for (let iChild = 0; iChild < data.Children.length; iChild++) {
          data.Children[iChild].Id;
          data.Children[iChild].Kind;
          data.Children[iChild].Display;
          data.Children[iChild].Order;

          let selection = document.createElement('div');
          selection.classList.add('workexplorer-child');
          selection.setAttribute('Id', data.Children[iChild].Id);
          selection.setAttribute('Kind', data.Children[iChild].Kind);
          if (data.Children[iChild].Order) {
            selection.setAttribute('Order', data.Children[iChild].Order);
            selection.style.order = data.Children[iChild].Order;
          }

          let row = document.createElement('div');
          row.classList.add('workexplorer-child-row');
          //row.appendChild(document.createElement('div')).className = 'reorderHighlight';  // smartphone ?
          //row.appendChild(document.createElement('div')).className = 'reorderUpButton';   // smartphone ?
          //row.appendChild(document.createElement('div')).className = 'reorderDownButton'; // smartphone ?
          //row.appendChild(document.createElement('div')).className = 'reorderButton';

          let spanDisplay = document.createElement('span');
          spanDisplay.classList.add('workexplorer-child-display');
          spanDisplay.innerHTML = data.Children[iChild].Display;
          spanDisplay.setAttribute('kind', data.Children[iChild].Id);
          spanDisplay.setAttribute('itemid', data.Children[iChild].Kind);
          //let removeButton = document.createElement('div'); removeButton.className = 'remove-button';
          row.appendChild(spanDisplay); //row.appendChild(removeButton);

          selection.appendChild(row);
          this._children.appendChild(selection);

          // click = reload page with new display
          spanDisplay.addEventListener('click',
            function () {
              let kind = this.getAttribute('kind');
              let itemid = this.getAttribute('itemid');

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
          let valueDiv = this._properties.querySelector('.workexplorer-value[name="' + prop.Key + '"]');
          let inputDiv = valueDiv.querySelector('input');

          // Special set value
          if ('Boolean' == valueDiv.getAttribute('propformat')) {
            inputDiv.checked = prop.Value;
          }
          else if ('Duration' == valueDiv.getAttribute('propformat')) {
            let days = valueDiv.querySelector('.workexplorer-days');
            let duration = valueDiv.querySelector('.workexplorer-duration');
            duration.value = pulseUtility.secondsToHHMMSS(prop.Value % (24 * 60 * 60));
            days.value = Math.floor(prop.Value / (24 * 60 * 60));
          }
          else if ('Enum' == valueDiv.getAttribute('propformat')) {
            // Get the select element
            //let selectElement = this._properties.querySelectorAll('select');
            let selectElement = valueDiv.querySelector('select');
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
            inputDiv.value = prop.Value;
            // same as inputDiv.value = prop.Value;
          }
        }
      }
    }

    _saveNew () {
      // Get parents
      let parents = [];

      let parentsDiv = this._parents.querySelectorAll('.workexplorer-single-parent');
      for (let iP = 0; iP < parentsDiv.length; iP++) {
        let aParent = {
          'Id': parentsDiv[iP].getAttribute('Id'),
          'Kind': parentsDiv[iP].getAttribute('Kind')
          //,'Order': parentsDiv[iP].getAttribute('Order')
        };
        parents.push(aParent);
      }

      // Get children
      let children = [];

      let childrenDiv = this._children.querySelectorAll('.workexplorer-child');
      for (let iChild = 0; iChild < childrenDiv.length; iChild++) {
        let aChild = {
          'Id': childrenDiv[iChild].getAttribute('Id'),
          'Kind': childrenDiv[iChild].getAttribute('Kind')
          //,'Order': childrenDiv[iChild].getAttribute('Order')
        };
        children.push(aChild);
      }

      // Get properties
      let properties = [];
      if (this._workStructure.Properties) { // Hope always
        for (let iProp = 0; iProp < this._workStructure.Properties.length; iProp++) {
          let prop = this._workStructure.Properties[iProp];
          let key = prop.Key;
          let propDiv = this._properties.querySelector('.' + key);
          let value = null;
          switch (prop.Format) {
            case 'String': {
              value = propDiv.querySelector('input').value;
              // limits
              if (prop.Limits) {
                if (prop.Limits.Maxsize) {
                  // Max number of chars
                  if (value.length > prop.Limits.Maxsize) {
                    pulseCustomDialog.openDialog('Check limits', { type: 'Error' });
                    return;
                  }
                }
              }
            } break;
            case 'URL': {
              value = propDiv.querySelector('input').value;
            } break;
            case 'Integer': {
              value = propDiv.querySelector('input').value;
              // limits
              if (prop.Limits) {
                if (prop.Limits.Min) {
                  if (value < prop.Limits.Min) {
                    pulseCustomDialog.openDialog('Check limits', { type: 'Error' });
                    return;
                  }
                }
                if (prop.Limits.Max) {
                  if (value > prop.Limits.Max) {
                    pulseCustomDialog.openDialog('Check limits', { type: 'Error' });
                    return;
                  }
                }
              }
            } break;
            case 'Float': {
              value = propDiv.querySelector('input').value;
              // limits
              if (prop.Limits) {
                if (prop.Limits.Min) {
                  if (value < prop.Limits.Min) {
                    pulseCustomDialog.openDialog('Check limits', { type: 'Error' });
                    return;
                  }
                }
                if (prop.Limits.Max) {
                  if (value > prop.Limits.Max) {
                    pulseCustomDialog.openDialog('Check limits', { type: 'Error' });
                    return;
                  }
                }
              }
            } break;
            case 'Duration': {
              let days = propDiv.querySelector('.workexplorer-days').value;
              let time = propDiv.querySelector('.workexplorer-time').value;

              value = pulseUtility.HHMMSStoSeconds(time) + days * 24 * 60 * 60;
              // limits
              if (prop.Limits) {
                if (prop.Limits.Min) {
                  if (value < prop.Limits.Min) {
                    pulseCustomDialog.openDialog('Check limits', { type: 'Error' });
                    return;
                  }
                }
                if (prop.Limits.Max) {
                  if (value > prop.Limits.Max) {
                    pulseCustomDialog.openDialog('Check limits', { type: 'Error' });
                    return;
                  }
                }

              }
              if (prop.Required) {
                // ???
              }
            } break;
            case 'Enum': {
              let select = propDiv.querySelector('select');
              value = select.options[select.selectedIndex].value;
            } break;
            case 'Boolean': {
              value = propDiv.querySelector('input').checked;
            } break;
            default: {
              // Do nothing
            }

          } // end switch format

          if (prop.Required && null == value) {
            pulseCustomDialog.openDialog('Fill mandatory field ! ', { type: 'Error' });
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
      pulseCustomDialog.openDialog(errorMessage, { type: 'Error' });
      return;
    }

    _saveNewFail (ajaxToken, url, isTimeout, xhrStatus) {
      // ignore ajaxToken
      if (isTimeout) {
        pulseCustomDialog.openDialog('Timeout', { type: 'Error' });
      }
      else {
        let message = pulseService.getAjaxErrorMessage(xhrStatus);
        pulseCustomDialog.openDialog(message, { type: 'Error' });
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
