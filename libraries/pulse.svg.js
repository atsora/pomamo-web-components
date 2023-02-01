// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

var pulseUtility = require('pulseUtility');
var _svgNS = 'http://www.w3.org/2000/svg';

/**
 * Return _svgNS for unique global definition
 */
exports.get_svgNS = function () {
  return _svgNS;
}

/**
 * Create and return radial gradient def
 * to display stacklight
 *
 * @memberof module:pulseSvg
 * @function createRadialGradientDef
 *
 * @return pattern def
 */
exports.createRadialGradientDef = function (color, newId) {
  let def = document.createElementNS(_svgNS, 'defs');

  let stop0 = document.createElementNS(_svgNS, 'stop');
  stop0.setAttribute('offset', '0%');
  stop0.setAttribute('style', 'stop-color:#DFDFDF;stop-opacity:1');
  let stop1 = document.createElementNS(_svgNS, 'stop');
  stop1.setAttribute('offset', '100%');
  stop1.setAttribute('style', 'stop-color:' + color + ';stop-opacity:1');

  let gradient = document.createElementNS(_svgNS, 'radialGradient');
  gradient.setAttribute('id', newId);
  gradient.setAttribute('cx', '40%');
  gradient.setAttribute('cy', '40%');
  gradient.setAttribute('r', '30%'); // defaut 50 ?
  gradient.setAttribute('fx', '50%');
  gradient.setAttribute('fy', '40%'); //50
  gradient.appendChild(stop0);
  gradient.appendChild(stop1);

  def.appendChild(gradient);
  return def;
}

/**
 * Create and return pattern def
 * to display patterns for MOS and other bars
 *
 * @memberof module:pulseSvg
 * @function createPatternDef
 *
 * @return pattern def
 */
exports.createPatternDef = function (patternName, color, newName) {
  let def = document.createElementNS(_svgNS, 'defs');
  let pattern = document.createElementNS(_svgNS, 'pattern');
  pattern.setAttribute('id', newName);
  pattern.setAttribute('x', 6);
  pattern.setAttribute('y', 6);
  pattern.setAttribute('width', 10);
  pattern.setAttribute('height', 10);
  pattern.setAttribute('patternUnits', 'userSpaceOnUse');
  if (patternName.substring(0, 7) == 'circles') {
    //if ( patternName.startsWith('circles') ) { Removed because IE fails
    let size = patternName.substr(8);
    let circle = document.createElementNS(_svgNS, 'circle');
    circle.setAttribute('cx', size / 2);
    circle.setAttribute('cy', size / 2);
    circle.setAttribute('r', size / 2);
    circle.setAttribute('style', 'stroke: none; fill: ' + color);
    pattern.appendChild(circle);
  }
  if (patternName.substring(0, 4) == 'dots') {
    //if ( patternName.startsWith('dots') ) { Removed because IE fails
    let size = patternName.substr(5);
    let rect = document.createElementNS(_svgNS, 'rect');
    rect.setAttribute('x', 0);
    rect.setAttribute('y', 0);
    rect.setAttribute('width', size);
    rect.setAttribute('height', size);
    rect.setAttribute('style', 'stroke: none; fill: ' + color);
    pattern.appendChild(rect);
  }
  if (patternName.substring(0, 17) == 'horizontal-stripe') {
    //if ( patternName.startsWith('horizontal-stripe') ) { Removed because IE fails
    let size = patternName.substr(18);
    let rect = document.createElementNS(_svgNS, 'rect');
    rect.setAttribute('x', 0);
    rect.setAttribute('y', 0);
    rect.setAttribute('width', 10); // Full width
    rect.setAttribute('height', size);
    rect.setAttribute('style', 'stroke: none; fill: ' + color);
    pattern.appendChild(rect);
  }
  if (patternName.substring(0, 15) == 'vertical-stripe') {
    //if ( patternName.startsWith('vertical-stripe') ) { Removed because IE fails
    let size = patternName.substr(16);
    let rect = document.createElementNS(_svgNS, 'rect');
    rect.setAttribute('x', 0);
    rect.setAttribute('y', 0);
    rect.setAttribute('width', size);
    rect.setAttribute('height', 10); // Full width
    rect.setAttribute('style', 'stroke: none; fill: ' + color);
    pattern.appendChild(rect);
  }
  if (patternName.substring(0, 14) == 'diagonal-strip') {
    //if ( patternName.startsWith('diagonal-stripe') ) { Removed because IE fails
    let size = patternName.substr(16);
    let line = document.createElementNS(_svgNS, 'line');
    line.setAttribute('x1', 0);
    line.setAttribute('y1', 10);
    line.setAttribute('x2', 10);
    line.setAttribute('y2', 0);
    line.setAttribute('style', 'stroke:' + color + ';stroke-width:' + size);
    pattern.appendChild(line);
    let line2 = document.createElementNS(_svgNS, 'line');
    line2.setAttribute('x1', -10);
    line2.setAttribute('y1', 10);
    line2.setAttribute('x2', 10);
    line2.setAttribute('y2', -10);
    line2.setAttribute('style', 'stroke:' + color + ';stroke-width:' + size);
    pattern.appendChild(line2);
    let line3 = document.createElementNS(_svgNS, 'line');
    line3.setAttribute('x1', 0);
    line3.setAttribute('y1', 20);
    line3.setAttribute('x2', 20);
    line3.setAttribute('y2', 0);
    line3.setAttribute('style', 'stroke:' + color + ';stroke-width:' + size);
    pattern.appendChild(line3);
  }

  def.appendChild(pattern);
  return def;
}

/**
 * Create and return SVG simple rect
 *
 * @memberof module:pulseSvg
 * @function createRect
 *
 * @return SVG rect
 */
var createRect = exports.createRect = function (x, y, width, height, color, mainClass) {
  let svg = document.createElementNS(_svgNS, 'svg');
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);

  // CREATE SVG rect
  let rect = document.createElementNS(_svgNS, 'rect');
  svg.appendChild(rect);
  if (x == null)
    x = 0;
  if (y == null)
    y = 0;
  rect.setAttribute('x', x);
  rect.setAttribute('y', y);
  rect.setAttribute('width', width);
  rect.setAttribute('height', height);
  if (color != null)
    rect.setAttribute('fill', color);
  if (mainClass != null)
    rect.setAttribute('class', mainClass);

  return svg;
}

/**
 * Create base SVG to insert others SVG elements
 *
 * @memberof module:pulseSvg
 *
 * @function createBase
 * 
 * @param {Integer} width  
 * @param {Integer} height  
 * @param {string} mainClass  class to set
 * @param {Integer} viewBoxWidth  optional
 * @param {Integer} viewBoxHeight  optional
 * @return {Object} SVG
 */
var createBase = exports.createBase = function (width, height, mainClass, viewBoxWidth, viewBoxHeight) {
  let svg = document.createElementNS(_svgNS, 'svg');
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('class', mainClass);
  if ((!pulseUtility.isNotDefined(viewBoxWidth)) &&
    (!pulseUtility.isNotDefined(viewBoxHeight))) {
    svg.setAttribute('viewBox', '0 0 '
      + viewBoxWidth + ' '
      + viewBoxHeight);
  }
  return svg;
}

/**
 *
 * Create SVG ellipse
 *
 * @memberof module:pulseSvg
 *
 * @function createEllipse
 * 
 * @param {Integer} xMiddle
 * @param {Integer} yMiddle
 * @param {Integer} xRadius
 * @param {Integer} yRadius
 * @param {String} mainClass  class to set
 
 * @returns {Object} SVG
 */
exports.createEllipse = function (xMiddle, yMiddle, xRadius, yRadius, mainClass) {
  let ellipse = document.createElementNS(_svgNS, 'ellipse');
  ellipse.setAttribute('cx', xMiddle);
  ellipse.setAttribute('cy', yMiddle);
  ellipse.setAttribute('rx', xRadius);
  ellipse.setAttribute('ry', yRadius);
  ellipse.setAttribute('class', mainClass);
  return ellipse;
}

/**
 * Create SVG circle
 *
 * @memberof module:pulseSvg
 *
 * @function createCircle
 * 
 * @param {Integer} xMiddle
 * @param {Integer} yMiddle
 * @param {Integer} radius
 * @param {string} fillColor
 * @param {string} mainClass  class to set
 * @param {string} strokeColor
 * @param {Integer} strokeWidth
 
 * @return {Object} SVG
 */
exports.createCircle = function (xMiddle, yMiddle, radius, fillColor, mainClass, strokeColor, strokeWidth) {
  let circle = document.createElementNS(_svgNS, 'circle');
  circle.setAttribute('cx', xMiddle);
  circle.setAttribute('cy', yMiddle);
  circle.setAttribute('r', radius);
  if (!pulseUtility.isNotDefined(fillColor)) {
    circle.setAttribute('fill', fillColor);
  }
  circle.setAttribute('class', mainClass);
  if (!pulseUtility.isNotDefined(strokeWidth)) {
    circle.setAttribute('stroke-width', strokeWidth);
  }
  if (!pulseUtility.isNotDefined(strokeColor)) {
    circle.setAttribute('stroke', strokeColor);
  }
  return circle;
}
/**
 * Create SVG segment on donut
 *
 * @memberof module:pulseSvg
 *
 * @function changeSegmentOnDonutEnd
 * to be called after createSegmentOnDonut to only change end position
 * 
 * @param {DOM} circleProgress
 * @param {Integer} radius
 * @param {Double} widthPercent percent for the segment length
 * @param {string} mainClass  class to set (optional)
 
 * @return {Object} SVG
 */
exports.
  changeSegmentOnDonutEnd = function (circleProgress, radius, widthPercent, mainClass) {
    let circumference = 2.0 * Math.PI * radius;
    if (widthPercent >= 0.0) { // Keep '<=' and not '<' only to allow progress
      circleProgress.setAttribute('stroke-dasharray',
        (circumference * widthPercent).toFixed(0) + ' ' +
        (circumference * (1.0 - widthPercent)).toFixed(0)); //'85 15');
    }

    if (mainClass)
      circleProgress.setAttribute('class', mainClass);

    return circleProgress;
  }

/**
 * Create SVG segment on donut
 *
 * @memberof module:pulseSvg
 *
 * @function createSegmentOnDonut
 * 
 * @param {Integer} xMiddle
 * @param {Integer} yMiddle
 * @param {Integer} radius
 * @param {string} fillColor
 * @param {string} mainClass  class to set
 * @param {string} strokeColor
 * @param {Integer} strokeWidth in %
 * @param {Double} beginPercent percent for the begin of the segment
 * @param {Double} widthPercent percent for the segment length
 
 * @return {Object} SVG
 */
exports.createSegmentOnDonut = function (xMiddle, yMiddle, radius, fillColor, mainClass,
  strokeColor, strokeWidth, beginPercent, widthPercent) {
  if (widthPercent < 0) {
    return null;
  }
  //let magicCircleRadius = 15.91549430918954;
  let circumference = 2.0 * Math.PI * radius; // == 100 if magicCircleRadius is used

  let circleProgress = document.createElementNS(_svgNS, 'circle');
  circleProgress.setAttribute('cx', xMiddle);
  circleProgress.setAttribute('cy', yMiddle);
  circleProgress.setAttribute('r', radius);
  if (!pulseUtility.isNotDefined(fillColor)) {
    circleProgress.setAttribute('fill', fillColor);
  }
  circleProgress.setAttribute('class', mainClass);
  if (!pulseUtility.isNotDefined(strokeColor)) {
    circleProgress.setAttribute('stroke', strokeColor);
  }
  circleProgress.setAttribute('stroke-width', strokeWidth);
  // 2*pi*R = 2*3.14*radius = 100
  if (widthPercent >= 0.0) { // Keep '<=' and not '<' only to allow progress
    circleProgress.setAttribute('stroke-dasharray',
      (circumference * widthPercent).toFixed(0) + ' ' +
      (circumference * (1.0 - widthPercent)).toFixed(0)); //'85 15');
    circleProgress.setAttribute('stroke-dashoffset',
      (circumference * (1.0 - beginPercent)).toFixed(0));
    // was 25 = on top (+100 to avoid <0)
    // now = 0 = on the right - need rotate (+100 to avoid <0)
  }

  return circleProgress;
}

/**
 * Create SVG line on a donut
 *
 * @memberof module:pulseSvg
 *
 * @function createLineOnDonut
 * 
 * @param {Integer} xMiddle
 * @param {Integer} yMiddle
 * @param {Integer} middleRadius
 * @param {Integer} externRadius
 * @param {Double} percentPosition
 * @param {string} color
 * @param {string} strokeWidth
 
 * @return {Object} SVG
 */
exports.createLineOnDonut = function (xMiddle, yMiddle, middleRadius, externRadius,
  percentPosition, color, width, dasharray) {
  let angle = (percentPosition - 0.25) * 2 * Math.PI;
  let aLine = document.createElementNS(_svgNS, 'line');
  aLine.setAttribute('x1', xMiddle + middleRadius * Math.cos(angle));
  aLine.setAttribute('y1', yMiddle + middleRadius * Math.sin(angle));
  aLine.setAttribute('x2', xMiddle + externRadius * Math.cos(angle));
  aLine.setAttribute('y2', yMiddle + externRadius * Math.sin(angle));
  aLine.setAttribute('stroke-width', width);
  if (!pulseUtility.isNotDefined(color)) {
    aLine.setAttribute('stroke', color);
  }
  if (!pulseUtility.isNotDefined(dasharray)) {
    aLine.setAttribute('stroke-dasharray', dasharray.toFixed(0));
  }
  return aLine;
}

/**
 * Create SVG style to rotate a dash circle.
 * Rotation from beginSeconds until 60sec (if increase) else until 0 sec
 *
 * @memberof module:pulseSvg
 *
 * @function createStyleDashCircleRotation
 * 
 * @param {jQuery} caller x-tag component
 * @param {Number} circleRadius radius
 * @param {Number} beginSeconds between 0 and 60
 */
exports.initFixedDashCircleDasharray =
  function (caller, circleRadius, beginSeconds) {
    let fullPathLength = 2 * Math.PI * circleRadius; // circumference
    caller.setAttribute('stroke-dasharray',
      (fullPathLength * beginSeconds / 60).toFixed(0) + ' '
      + (fullPathLength * (60 - beginSeconds) / 60).toFixed(0));
  }

/**
 * Create SVG style to rotate a dash circle.
 * Rotation from beginSeconds until 60sec (if increase) else until 0 sec
 *
 * @memberof module:pulseSvg
 *
 * @function createStyleDashCircleRotation
 * 
 * @param {jQuery} caller x-tag component
 * @param {string} keyFrameName
 * @param {Number} circleRadius radius
 * @param {Boolean} increase rotation direction
 * @param {Number} beginSeconds between 0 and 60
 */
exports.createStyleDashCircleRotation =
  function (caller, keyFrameName, beginSeconds, circleRadius, increase) {
    let fullPathLength = 2 * Math.PI * circleRadius; // circumference
    let style = document.createElement('style');
    style.type = 'text/css';
    /* RR - if one day we need dots to the left for negative values
    let keyFrames = '\
    @keyframes '+ keyFrameName +' {\
      from {\
        stroke-dasharray: '+fullPathLength*beginSeconds/60+' '
                           +fullPathLength*(60-beginSeconds)/60+';\
        stroke-dashoffset: '+fullPathLength*(1.25-(60-beginSeconds)/60)+';\
      }\
      to {\
        stroke-dasharray: '+fullPathLength+' 0;\
        stroke-dashoffset: '+fullPathLength*1.25+';\
      }\
    }';*/
    let keyFrames;
    if (increase) {
      keyFrames = '\
    @keyframes '+ keyFrameName + ' {\
      from {\
        stroke-dasharray: '+ (fullPathLength * beginSeconds / 60).toFixed(0) + ' '
        + (fullPathLength * (60 - beginSeconds) / 60).toFixed(0) + ';\
      }\
      to {\
        stroke-dasharray: '+ fullPathLength.toFixed(0) + ' 0;\
      }\
    }';
    }
    else {
      keyFrames = '\
    @keyframes '+ keyFrameName + ' {\
      from {\
        stroke-dasharray: '+ (fullPathLength * beginSeconds / 60).toFixed(0) + ' '
        + (fullPathLength * (60 - beginSeconds) / 60).toFixed(0) + ';\
      }\
      to {\
        stroke-dasharray: 0 ' + fullPathLength.toFixed(0) + ';\
      }\
    }';
    }
    style.innerHTML = keyFrames; //.replace(/A_DYNAMIC_VALUE/g, "180deg");
    caller.appendChild(style);
  }

/**
 * Create SVG style to animate a segment.
 * Rotation from fromWidth to toWidth
 *
 * @memberof module:pulseSvg
 *
 * @function createStyleForSegmentOnDonut
 * 
 * @param {jQuery} caller x-tag component
 * @param {string} keyFrameName
 * @param {Number} circleRadius radius in %
 * @param {Number} fromWidth segment width in %
 * @param {Number} toWidth segment width after animation
 * 
 * @return {Object} SVG style
 */
exports.createStyleForSegmentOnDonut =
  function (caller, keyFrameName, circleRadius, fromWidth, toWidth) {
    let circumference = 2 * Math.PI * circleRadius; // = full path length
    let style = document.createElement('style');
    style.type = 'text/css';

    let keyFrames = '\
  @keyframes '+ keyFrameName + ' {\
    from {\
      stroke-dasharray: '+ (circumference * fromWidth).toFixed(0) + ' '
      + (circumference * (1.0 - fromWidth)).toFixed(0) + ';\
    }\
    to {\
      stroke-dasharray: '+ (circumference * toWidth).toFixed(0) + ' '
      + (circumference * (1.0 - toWidth)).toFixed(0) + ';\
    }\
  }';
    style.innerHTML = keyFrames;
    caller.appendChild(style);

    //console.log('CycleProgressPie(' + this.element.getAttribute('machine-id')
    // + '): append style - keyFrames = ' + keyFrames);

    return style;
  }

/**
 * Create SVG style to animate a segment.
 * Rotation until to toWidth (from must be defined in main svg)
 *
 * @memberof module:pulseSvg
 *
 * @function createStyleForEndAnimationOnDonut
 * 
 * @param {jQuery} caller x-tag component
 * @param {string} keyFrameName
 * @param {Number} circleRadius radius in %
 * @param {Number} toWidth segment width after animation in %
 */
/*exports.createStyleForEndAnimationOnDonut =
function (caller, keyFrameName, circleRadius, toWidth) {
  let circumference = 2 * Math.PI * circleRadius; // = full path length
  let style = document.createElement('style');
  style.type = 'text/css';

  let keyFrames = '\
@keyframes '+ keyFrameName + ' {\
  to {\
    stroke-dasharray: '+ (circumference * toWidth).toFixed(0) + ' '
    + (circumference * (1.0 - toWidth)).toFixed(0) + ';\
  }\
}';
  style.innerHTML = keyFrames;
  caller.appendChild(style);
}*/

/**
 * Create SVG style to animate a segment.
 * Rotation of BEGIN from fromWidth to toWidth
 *
 * @memberof module:pulseSvg
 *
 * @function createStyleForSegmentOnDonutMovingBegin
 * 
 * @param {jQuery} caller x-tag component
 * @param {string} keyFrameName
 * @param {Number} circleRadius radius
 * @param {Number} fromBegin segment begin
 * @param {Number} toBegin segment begin after animation
 * @param {Number} fromWidth segment width
 * @param {Number} toWidth segment width after animation
 */
exports.createStyleForSegmentOnDonutMovingBegin =
  function (caller, keyFrameName, circleRadius, fromBegin, toBegin, fromWidth, toWidth) {
    let circumference = 2 * Math.PI * circleRadius; // = full path length
    let style = document.createElement('style');
    style.type = 'text/css';

    let keyFrames = '\
  @keyframes '+ keyFrameName + ' {\
    from {\
      stroke-dasharray: '+ (circumference * fromWidth).toFixed(0) + ' '
      + (circumference * (1.0 - fromWidth)).toFixed(0) + ';\
      stroke-dashoffset: '+ (circumference * (1.0 - fromBegin)).toFixed(0) + ';\
    }\
    to {\
      stroke-dasharray: '+ (circumference * toWidth).toFixed(0) + ' '
      + (circumference * (1.0 - toWidth)).toFixed(0) + ';\
      stroke-dashoffset: '+ (circumference * (1.0 - toBegin)).toFixed(0) + ';\
    }\
  }';
    style.innerHTML = keyFrames;
    caller.appendChild(style);
  }

/**
 * Create SVG segment on gauge
 *
 * @memberof module:pulseSvg
 *
 * @function createSegmentOnGauge
 * 
 * @param {Integer} xMiddle
 * @param {Integer} yMiddle
 * @param {Integer} radius
 * @param {string} fillColor
 * @param {string} mainClass  class to set
 * @param {string} strokeColor
 * @param {Integer} strokeWidth
 * @param {Double} beginPercent percent for the begin of the segment
 * @param {Double} widthPercent percent for the segment length
 
 * @return {Object} SVG
 */
exports.createSegmentOnGauge = function (xMiddle, yMiddle, radius, fillColor, mainClass,
  strokeColor, strokeWidth, beginPercent, widthPercent) {
  //let magicCircleRadius = 15.91549430918954;
  let circumference = 2 * Math.PI * radius; // == 100 if magicCircleRadius is used

  let circleProgress = document.createElementNS(_svgNS, 'circle');
  circleProgress.setAttribute('cx', xMiddle);
  circleProgress.setAttribute('cy', yMiddle);
  circleProgress.setAttribute('r', radius);
  if (!pulseUtility.isNotDefined(fillColor)) {
    circleProgress.setAttribute('fill', fillColor);
  }
  circleProgress.setAttribute('class', mainClass);
  if (!pulseUtility.isNotDefined(strokeColor)) {
    circleProgress.setAttribute('stroke', strokeColor);
  }
  circleProgress.setAttribute('stroke-width', strokeWidth);
  // 2*pi*R = 2*3.14*radius = 100
  $(circleProgress).css('stroke-dasharray',
    (circumference * (widthPercent / 2.0)).toFixed(0) + ' ' +
    (circumference * (1.0 - (widthPercent / 2.0))).toFixed(0)); //'85 15');
  $(circleProgress).css('stroke-dashoffset',
    (circumference * (1.25 - (beginPercent / 2.0 + 0.75))).toFixed(0));
  return circleProgress;
}

/**
 * Create SVG line on a gauge
 *
 * @memberof module:pulseSvg
 *
 * @function createLineOnGauge
 * 
 * @param {Integer} xMiddle
 * @param {Integer} yMiddle
 * @param {Integer} middleRadius
 * @param {Integer} externRadius
 * @param {Double} percentPosition
 * @param {string} strokeColor
 * @param {string} strokeWidth
 
 * @return {Object} SVG
 */
exports.createLineOnGauge = function (xMiddle, yMiddle, middleRadius, externRadius,
  percentPosition, strokeColor, width, dasharray) {
  let angle = (percentPosition / 2 + 0.5) * 2 * Math.PI;
  let aLine = document.createElementNS(_svgNS, 'line');
  aLine.setAttribute('x1', xMiddle + middleRadius * Math.cos(angle));
  aLine.setAttribute('y1', yMiddle + middleRadius * Math.sin(angle));
  aLine.setAttribute('x2', xMiddle + externRadius * Math.cos(angle));
  aLine.setAttribute('y2', yMiddle + externRadius * Math.sin(angle));
  aLine.setAttribute('stroke-width', width);
  if (!pulseUtility.isNotDefined(strokeColor)) {
    aLine.setAttribute('stroke', strokeColor);
  }
  if (!pulseUtility.isNotDefined(dasharray)) {
    aLine.setAttribute('stroke-dasharray', dasharray.toFixed(0));
  }
  return aLine;
}

/**
 * Inline the svg specified as background-image of a div
 * The original background-image is removed and the inline svg is inserted in the element
 * @param {string} selector 
 * @param {function} callbackAfterInline (can be undefined)
 */
var inlineBackgroundSvg = exports.inlineBackgroundSvg = function (selector, callbackAfterInline) {
  // Check if SVG is supported and selector is valid
  if (typeof SVGRect == 'undefined' || $(selector) == null)
    return;

  // Try to change the image as long as the css is not loaded yet
  function checkBackgroundImage (selector) {
    let backgroundImage = $(selector).css('background-image');
    if (backgroundImage == null || !backgroundImage.includes('url')) {
      window.setTimeout(checkBackgroundImage, 100, selector);
    }
    else {
      // Request the SVG file
      let src = backgroundImage.replace('url(', '').replace(')', '').replace(/\"/gi, '');

      // Append the SVG to the target
      var ajaxReq = new XMLHttpRequest();
      ajaxReq.onload = function (e, d) {
        //if (ajaxReq.statusText == 'OK') { statusText == '' using https / Ford
        if (ajaxReq.status == 200) {
          $(selector).css('background-image', 'none');
          $(selector).append(ajaxReq.responseText);

          // Callback
          if (pulseUtility.isFunction(callbackAfterInline)) {
            callbackAfterInline();
          }
        }
      };
      ajaxReq.open('GET', src, true);
      ajaxReq.send();
    }
  }
  checkBackgroundImage(selector);
};

/* Get a class to know the icon FOR machine modes
*/
exports.getMachineModeClass = function (machineModeCategory) {
  let classBegin = 'pulse-mode-category-';
  switch (machineModeCategory) {
    case 1:
      return classBegin + 'inactive';
    case 2:
      return classBegin + 'active';
    case 3:
      return classBegin + 'error';
    case 4:
      return classBegin + 'unknown';
    case 5:
      return classBegin + 'eco';
    case 6:
      return classBegin + 'stopping';
    default:
      return null;
  }
}

/* Create an icon for colored legend. 
 * The color can be defined by a color OR class.
*/
exports.createColoredLegend = function (color, mainClass) {
  return createRect(0, 0, 15, 15, color, mainClass);
}

/**
 * Display maintenance screen
 *
 * @memberof module:pulseSvg
 *
 * @function showPulseMaintenance
 * 
 */
exports.showPulseMaintenance = function () {
  // if already exists, do nothing
  {
    let pulseMaintenance = $('body').find('.pulse-maintenance');
    if (pulseMaintenance.length != 0) {
      $(pulseMaintenance[0]).show();
      return;
    }
  }

  // else CREATE
  let text = $('<div></div>').addClass('pulse-maintenance-text')
    .html('The system is currently under maintenance');
  let svg = $('<div></div>').addClass('pulse-maintenance-svg');
  let centeredDiv = $('<div></div>').addClass('pulse-maintenance-centered-div')
    .append(svg).append(text);

  let shadow = $('<div></div>').addClass('pulse-maintenance-shadow');
  let box = $('<div></div>').addClass('pulse-maintenance-display-box')
    .append(centeredDiv);

  let pulseMaintenance = $('<div></div>').addClass('pulse-maintenance')
    .append(shadow).append(box);

  //pulseSvg.
  inlineBackgroundSvg(svg);

  // Create a div Maintenance
  $('body').append(pulseMaintenance);
}
/*
.pulse-maintenance-svg{
.create_svg('pulse-maintenance', @color_text, @color_text)
}
 */
/**
 * HIDE maintenance screen
 *
 * @memberof module:pulseSvg
 *
 * @function hidePulseMaintenance
 * 
 */
exports.hidePulseMaintenance = function () {
  //$('body').find('.pulse-maintenance').remove();
  $('body').find('.pulse-maintenance').hide();
}


/**
 * remove BAR chart created using next method
 *
 * @memberof module:pulseSvg
 *
 * @function createBarChart
 * @param {DOM} parent
 * @param {string} svgClass
 */
var removeBarChart = exports.removeBarChart = function (parent, svgClass) {
  if (parent == undefined) {
    return;
  }
  // clear svg
  let svg = $(parent).find('.' + svgClass);
  d3.selectAll(svg.toArray()).remove();
  $(parent).remove('.' + svgClass);
}

/**
 * create BAR chart
 *
 * @memberof module:pulseSvg
 *
 * @function createBarChart
 * @param {DOM} parent
 * @param {string} svgClass
 * @param {Object} chartData
 * @param {Object} options
 * 
 *  chartData = [
 *    {
 *      xDisplay: 'Rust',
 *       value: 78.9 -> value to display
 *       boundedValue -> value to draw in case of fixed height
 *    },{ ...}];
 *
 *  options = { // Each can be undefined
 *    minValue : number
 *    maxValue : number
 *    mainTitle : string
 *    leftTitle : string
 *    bottomTitle : string
 *    sourceText : string
 *    drawHorizontalGrid : bool, default false
 *    drawVerticalGrid : bool, default false
 *  }
 */
exports.createBarChart = function (parent, svgClass, chartData, options) {
  if (parent == undefined) {
    return;
  }
  removeBarChart(parent, svgClass);

  let minValue = 0;
  let maxValue = 0;

  // Automatic bounds
  for (let i = 0; i < chartData.length; i++) {
    let value = chartData[i].value;
    // Min / Max
    if (minValue > value) {
      minValue = value;
    }
    if (maxValue < value) {
      maxValue = value;
    }
  }
  // Cut display if needed
  if (!pulseUtility.isNotDefined(options.minValue)
    && '' != options.minValue) {
    if (minValue < options.minValue) {
      minValue = options.minValue;
    }
  }
  if (!pulseUtility.isNotDefined(options.maxValue)
    && '' != options.maxValue) {
    if (maxValue > options.maxValue) {
      maxValue = options.maxValue;
    }
  }

  // Minimum (was Default) size
  var chartMargin = 60;
  var chartWidth = 300;  //1000;
  var chartHeight = 240; //600;

  // Adapt size to parent's
  let pWidth = parent.width();
  let pHeight = parent.height();
  if (chartWidth < pWidth) {
    chartWidth = pWidth;
  }
  if (chartHeight < pHeight) {
    chartHeight = pHeight;
  }

  // Remove margin
  chartWidth -= 2 * chartMargin;
  chartHeight -= 2 * chartMargin;

  // Create BAR chart
  let svg = d3.selectAll(parent.toArray()).append('svg')
    .attr('class', svgClass);
  svg.attr('viewBox', '0 0 '
    + (chartWidth + 2 * chartMargin) // viewBoxWidth 
    + ' '
    + (chartHeight + 2 * chartMargin)); // + viewBoxHeight

  // Move to manage margin
  let chart = svg.append('g')
    .attr('transform', `translate(${chartMargin}, ${chartMargin})`);

  // Y Scale according to displayed values (linear scale)
  // X and Y Scale - scaleBand is in d3-scale, it splits range into bands
  let xScale = d3.scaleBand()
    .range([0, chartWidth])
    .domain(chartData.map((s) => s.xDisplay))
    .padding(0.2); // or 0.4
  let yScale = d3.scaleLinear()
    .range([chartHeight, 0])
    .domain([minValue, maxValue]);

  // Draw X axis
  // Ticks at bottom
  chart.append('g')
    .attr('class', 'x-bottom-axis')
    .attr('transform', `translate(0, ${chartHeight})`)
    .call(d3.axisBottom(xScale));

  // Draw X axis // Line at 0 (can be bottom, but not always)
  svg.append('g')
    .attr('class', 'x-0-axis')
    .append('line')
    .attr('y1', chartMargin + yScale(0))
    .attr('y2', chartMargin + yScale(0))
    .attr('x1', chartMargin)
    .attr('x2', chartMargin + chartWidth);

  // Left Y axis
  chart.append('g')
    .call(d3.axisLeft(yScale));

  if (options.drawVerticalGrid) {
    // vertical grid lines
    let makeXLines = () => d3.axisBottom()
      .scale(xScale)

    // vertical grid lines
    chart.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(makeXLines()
        .tickSize(-chartHeight, 0, 0)
        .tickFormat('')
      )
  }

  if (options.drawHorizontalGrid) {
    // Horizontal grid lines
    let makeYLines = () => d3.axisLeft()
      .scale(yScale);

    chart.append('g')
      .attr('class', 'grid')
      .call(makeYLines()
        .tickSize(-chartWidth, 0, 0)
        .tickFormat('')
      );
  }

  // Draw data
  let barGroups = chart.selectAll()
    .data(chartData)
    .enter()
    .append('g');


  // g.value replaced with boundedValue
  barGroups
    .append('rect')
    //.attr('class', 'bar')
    .attr('class', (g) => (g.boundedValue > 0) ? 'bar positive' : 'bar negative')
    .attr('x', (g) => xScale(g.xDisplay))
    // can be .attr(’x’, (actual, index, array) => xScale(actual.value))
    .attr('y', (g) => (g.boundedValue > 0) ? yScale(g.boundedValue) : yScale(0))
    .attr('height', (g) => Math.abs(yScale(g.boundedValue) - yScale(0)))
    .attr('width', xScale.bandwidth());
  /*.on('mouseenter', function (actual, i) {
})
.on('mouseleave', function () {
}) */

  // Add text with value in bar - Not ready yet - Could be added
  /*barGroups
    .append('text')
    .attr('class', 'value')
    .attr('x', (a) => xScale(a.xDisplay) + xScale.bandwidth() / 2)
    .attr('y', (a) => yScale(a.value) + 30)
    .attr('text-anchor', 'middle')
    .text((a) => `${a.value}%`);*/

  if (!pulseUtility.isNotDefined(options.leftTitle)) {
    // Add left legend
    svg
      .append('text')
      .attr('class', 'label')
      .attr('x', -(chartHeight / 2) - chartMargin)
      .attr('y', chartMargin / 2.4)
      .attr('transform', 'rotate(-90)')
      .attr('text-anchor', 'middle')
      .text('Left legend');
  }
  if (!pulseUtility.isNotDefined(options.bottomTitle)) {
    // Add bottom legend
    svg.append('text')
      .attr('class', 'label')
      .attr('x', chartWidth / 2 + chartMargin)
      .attr('y', chartHeight + chartMargin * 1.7)
      .attr('text-anchor', 'middle')
      .text('Bottom legend');
  }
  if (!pulseUtility.isNotDefined(options.mainTitle)) {
    // Add main title
    svg.append('text')
      .attr('class', 'title')
      .attr('x', chartWidth / 2 + chartMargin)
      .attr('y', 40)
      .attr('text-anchor', 'middle')
      .text('Main title');
  }
  if (!pulseUtility.isNotDefined(options.sourceText)) {
    // Add bottom source text
    svg.append('text')
      .attr('class', 'source')
      .attr('x', chartWidth - chartMargin / 2)
      .attr('y', chartHeight + chartMargin * 1.7)
      .attr('text-anchor', 'start')
      .text('Source: ' + options.sourceText);
  }
  // Make it interactive
  /*svgElement
    .on('mouseenter', function (actual, i) {
      d3.select(this).attr(‘opacity’, 0.5)
    })
    .on('mouseleave’, function (actual, i) {
    d3.select(this).attr(‘opacity’, 1)
});
d3.mouse -> to get coordinate, show tooltip ...
*/

}

/**
 * create missing data (red dot)
 *
 * @memberof module:pulseSvg
 *
 * @function createMissingdata
 * @param {DOM} parent
 */
exports.createMissingdata = function (parent) {
  // To add in version 12
  let radius = 4;

  //createBase
  let svg = document.createElementNS(_svgNS, 'svg');
  svg.setAttribute('width', 2 * radius);
  svg.setAttribute('height', 2 * radius);
  svg.setAttribute('class', 'pulse-missing-data');
  svg.setAttribute('viewBox', '0 0 ' + 2 * radius + ' ' + 2 * radius);
  // Append
  $(parent).append(svg);

  // createCircle / could be an image
  let circle = document.createElementNS(_svgNS, 'circle');

  // = function (xMiddle, yMiddle, radius, fillColor, mainClass, strokeColor, strokeWidth) {
  circle.setAttribute('cx', radius);
  circle.setAttribute('cy', radius);
  circle.setAttribute('r', radius);
  circle.setAttribute('class', 'pulse-missing-data-circle');
  //circle.setAttribute('fill', 'red');
  //circle.setAttribute('stroke-width', '1px');      
  //circle.setAttribute('stroke', strokeColor);

  svg.appendChild(circle);
}