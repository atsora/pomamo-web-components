// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

var pulseConfig = require('pulseConfig');

//pulseConfig.setGlobal('path', 'http://localhost:8082/');


//////////////////////////////
// LEFT PANEL = NAVIGATION  //
//////////////////////////////
var openNavigationPanel = function (fast) {
  $('.menuicon').addClass('tooltip_disabled');
  if ($('#navigationpanelbtn').hasClass('disabled'))
    return;
  if (fast)
    $('#pulse-panel-navigation').addClass('notransition');
  else
    $('#pulse-panel-navigation').removeClass('notransition');
  $('#pulse-inner').removeClass('pulse-panel-navigation-collapsed');
  $('#navigationpanelbtn').addClass('activated');
};

var closeNavigationPanel = function (fast) {
  $('.menuicon').removeClass('tooltip_disabled');
  if (fast)
    $('#pulse-panel-navigation').addClass('notransition');
  else
    $('#pulse-panel-navigation').removeClass('notransition');
  $('#pulse-inner').addClass('pulse-panel-navigation-collapsed');
  $('#navigationpanelbtn').removeClass('activated');
};

var populateNavigationPanel = function () {

  // First init open/close panel
  // Click to show / hide the navigation panel
  $('#navigationpanelbtn').click(function (e) {
    if ($('#pulse-inner').hasClass('pulse-panel-navigation-collapsed')) {
      // is closed -> open
      openNavigationPanel();
      if ($(window).width() <= 685)
        closeParameterPanel(false);
    }
    else { // is opened -> close
      closeNavigationPanel(false);
    }
  });

  // Real populate
  let currentPage = window.location.href.replace(/(.*\/)([^\\]*)(\.html.*)/, '$2');

  let displayedPages = tagConfig.displayedPages;

  if (displayedPages == null || displayedPages.length == 0) {
    $('#pulse-panel-navigation').hide();
    $('#navigationpanelbtn').addClass('disabled');
    if (currentPage != 'index')
      window.location = 'index.html';
    return; // Nothing to display
  }
  let allDisplayedPages = displayedPages;

  $('#navigationpanelbtn').removeClass('disabled');

  // Menu type
  let textOrNothing = true;
  if (!textOrNothing) {
    $('#pulse-inner').addClass('navigation-always-visible');
  }

  let mapTextMenu = {};
  //allDisplayedPages.unshift('home');
  let ul = $('#navbar > ul');
  for (let i = 0; i < allDisplayedPages.length; i++) {
    let pageName = allDisplayedPages[i].pageName;

    let title = allDisplayedPages[i].title;
    let subtitle = allDisplayedPages[i].subTitle;
    if (title == undefined || title == '') {
      title = pageName;
      if (subtitle == undefined) subtitle = '';
    }
    else {
      if (subtitle == undefined || subtitle == '') subtitle = pageName
    }

    let li = null;
    let selection = (pageName == currentPage);
    if (textOrNothing) {
      if (subtitle == '') {
        li = $('<li data="' + pageName + '"><span class="menutext">' + title + '</span></li>');
      }
      else {
        if (title in mapTextMenu) {
          li = mapTextMenu[title];
          li.find('ul').append(
            $('<li ' + (selection ? ' class="selected" ' : '') + 'data="' + pageName + '">' + subtitle + '</li>')
          );
        }
        else {
          li = $('<li class="expandable"><span class="menutext">' + title + '</span><ul><li ' + (selection ? ' class="selected" ' : '') + 'data="' + pageName + '">' + subtitle + '</li></ul></li>');
          mapTextMenu[title] = li;
        }
      }
    }
    else {
      if (subtitle != '')
        title += ' (' + subtitle + ')';
      li = $('<li data="' + pageName + '"><div class="menuicon"></div><span class="menutext">' + title + '</span></li>');
      li.find('.menuicon').css('background-image', 'url(images/' + pageName + '-icon.svg)');
      //pulseUtility.addToolTip(li.find('.menuicon'), title);
    }

    // Current selection
    if (selection) {
      li.addClass('selected');
    }
    ul.append(li);

    // DO NOT load the icon
    //pulseSvg.inlineBackgroundSvg('li[data="' + pageName + '"] .menuicon');
  }
};

var setNavigationLinks = function () {
  // Open or hide sub menu
  $('#navbar > ul > li.expandable > span').click(function () {
    let previousState = $(this).parent().find('ul').is(':visible');
    $('#navbar > ul > li > ul').hide();
    if (!previousState)
      $(this).parent().find('ul').show();
  });

  let fullURL = window.location.pathname;
  $('#navbar li').each(function () {
    // Highlight the right navigation link, depending on the url
    if (fullURL.indexOf('/' + $(this).attr('data') + '.html') !== -1) {
      $(this).addClass('selected');

      // Open and select the parent li if possible
      let grandParent = $(this).parent().parent();
      if (grandParent.hasClass('expandable')) {
        grandParent.addClass('selected');
        grandParent.find('ul').css('display', 'block');
      }
    }

    // Function called on click on left menu
    $(this).click(function () {
      let attribute = $(this).attr('data');
      if (attribute != null && attribute != '' && fullURL.indexOf('/' + attribute + '.html') == -1) {
        // Build the url with the role and the machines kept in memory
        let newfullURL = fullURL.substring(0, fullURL.lastIndexOf('/') + 1) + attribute + '.html';

        // Groups allowed for the page?

        window.location.href = newfullURL;
      }
    });
  });
}

/////////////////////////
// RIGHT PANEL = THEME //
/////////////////////////

var openParameterPanel = function (fast) {
  if ($('#configpanelbtn').hasClass('disabled'))
    return;
  if (fast)
    $('#pulse-panel-parameter').addClass('notransition');
  else
    $('#pulse-panel-parameter').removeClass('notransition');
  $('#pulse-inner').removeClass('pulse-panel-parameter-collapsed');
  $('#configpanelbtn').addClass('activated');
};

var closeParameterPanel = function (fast) {
  if (fast)
    $('#pulse-panel-parameter').addClass('notransition');
  else
    $('#pulse-panel-parameter').removeClass('notransition');
  $('#pulse-inner').addClass('pulse-panel-parameter-collapsed');
  $('#configpanelbtn').removeClass('activated');
};

var populateConfigPanel = function () {
  // Click to show / hide the parameter panel
  $('#configpanelbtn').click(function (e) {
    if ($('#pulse-inner').hasClass('pulse-panel-parameter-collapsed')) {
      openParameterPanel();
      if ($(window).width() <= 685)
        closeNavigationPanel(false);
    }
    else {
      closeParameterPanel(false);
    }
  });

  // Real populate
};

////////////////////
// THEME MANAGER  //
////////////////////

var themeManager = {
  
  load: function (name) {
    let oldTheme = pulseConfig.getString('theme', 'dark'); // first of ALL

    // Save the new value -- before ALL to happen even when an error occurs
    pulseConfig.setGlobal('theme', name);

    // Page name, for a style specific to the page
    let pageName = window.location.href.replace(/(.*\/)([^\\]*)(\.html.*)/, '$2');

    // version -> Not here !

    // Load the new theme
    $('head').append('<link rel="stylesheet" type="text/css" href="./styles/style_' + name + '/' + pageName + '.css">');

    // Unload the previous theme
    if (oldTheme != name) {
      $('link[rel=stylesheet][href*="./styles/style_' + oldTheme + '/' + pageName + '.css"]').remove();
    }
  },
  current: function () {
    return pulseConfig.getString('theme', 'dark');
  }
};

var initTheme = function () {
  $('#darkthemebtn').prop('checked', (themeManager.current() == 'dark'));
  $('#darkthemebtn').click(function () {
    themeManager.load(themeManager.current() == 'light' ? 'dark' : 'light'); // Idea: create a toggle function?
  });
}

///////////////////
// MAIN function //
///////////////////

$(document).ready(function () {
  // Populate panels
  populateConfigPanel();
  // Prepare the navigation menu
  populateNavigationPanel();
  setNavigationLinks();

  // Theme
  initTheme();

  // Close panels AT start (excepted index ?)
  closeParameterPanel(true);
  closeNavigationPanel(true);

});