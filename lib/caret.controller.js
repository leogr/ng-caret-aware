'use strict';

goog.provide('leodido.controller.Caret');

goog.require('leodido.constants');
goog.require('leodido.typedef.Selection');



/**
 * Caret controller
 *
 * @param {!angular.Scope} $scope
 * @param {!angular.JQLite} $element
 * @param {!angular.Attributes} $attrs
 * @constructor
 * @ngInject
 */
leodido.controller.Caret = function($scope, $element, $attrs) {
  leodido.constants.DEBUG && console.log('CaretController::ctor');
  // Privates
  /** @type {HTMLInputElement|HTMLTextAreaElement} */
  var target = $element[0];
  /**
   * @type {!string}
   */
  var namespace;
  /**
   * @type {!number}
   */
  var startVal = 0;
  /**
   * Set namespace of directive instance and its init value on the scope
   *
   * @param {!string} ns
   * @return {!leodido.controller.Caret}
   */
  var setNamespace = function(ns) {
    namespace = ns || leodido.constants.CARETAWARE_DEFAULT_NS;
    $scope[namespace] = startVal;
    return self;
  };
  /**
   * @type {{selectionRange: !boolean, textRange: !boolean}}
   */
  var support = {
    selectionRange: ('setSelectionRange' in target) || ('selectionStart' in target),
    textRange: ('createTextRange' in target) || ('selection' in document)
  };
  /**
   * Get the textual value of the caret aware element
   *
   * @return {!angular.JQLite|string}
   */
  var getValue = function() {
    return target.value || '';
  };
  /**
   * Get a valid position
   *
   * @param {!number} pos
   * @return {!number}
   */
  var getIndex = function(pos) {
    // TODO? replace space with non breaking spaces .replace(/\s/g, '\u00a0')
    // TODO? alternatively use .replace(/(?:\r\n|\r)+/g, \n)
    var value = getValue().replace(/\r/g, ''),
        len = value.length,
        position = ~~pos;
    // Enforce boundaries
    if (position < startVal) {
      position = len + pos;
    } else if (position > len) {
      position = len;
    }
    return position;
  };
  // Polyfills
  var self = this;
  /**
   * @type {!Function}
   */
  var getPositionPolyfill;
  /**
   * @type {!Function}
   */
  var getSelectionPolyfill;
  /**
   * @type {!Function}
   */
  var setPositionPolyfill;
  //
  switch (true) {
    case support.selectionRange:
      // HTML5, Chrome, Mozilla, jsdom, et. al
      getSelectionPolyfill = function() {
        var start = target.selectionStart;
        var end = target.selectionEnd;
        var len = end - start;
        return {
          start: start,
          end: end,
          length: len,
          text: target.value.substr(start, len)
        };
      };
      setPositionPolyfill = function(pos) {
        pos = getIndex(pos);
        target.focus();
        // NOTE
        // A bug exists
        // https://code.google.com/p/chromium/issues/detail?id=32865
        // http://stackoverflow.com/questions/12047648/setselectionrange-with-on-click-in-chrome-does-not-select-on-second-click
        target.setSelectionRange(pos, pos);
        // On some browser (e.g. Firefox) changing selection range does not update instantly the target
        // So we try to force the update of position
        target.selectionStart = pos;
        target.selectionEnd = pos;
        $scope[self.getNamespace()] = pos;
      };
      break;
    case support.textRange:
      // IE < 9
      getSelectionPolyfill = function() {
        target.focus();
        var rng = document.selection.createRange();
        if (rng === null) {
          return {
            start: 0,
            end: target.value.length,
            length: 0
          };
        }
        var trng1 = target.createTextRange();
        var trng2 = trng1.duplicate();
        trng1.moveToBookmark(rng.getBookmark());
        trng2.setEndPoint('EndToStart', trng1);
        var start = trng2.text.length;
        var text = rng.text;
        var len = text.length;
        return {
          start: start,
          end: start + len,
          length: len,
          text: text
        };
      };
      setPositionPolyfill = function(pos) {
        pos = getIndex(pos);
        var range = target.createTextRange();
        range.move('character', pos);
        range.select();
        $scope[self.getNamespace()] = pos;
      };
      break;
    default:
      // not supported, unknown
      getSelectionPolyfill = function() {
        return {
          start: startVal,
          end: startVal,
          length: startVal,
          text: ''
        };
      };
      setPositionPolyfill = function() {
      };
  }
  getPositionPolyfill = function() {
    return getSelectionPolyfill().end;
  };
  // Set namespace from attribute on startup and instantiate caret position to 0
  setNamespace($attrs[leodido.constants.CARETAWARE_DIRECTIVE_NAME]);
  // Privileged methods and public API
  /**
   * Retrieve the namespace of the directive instance
   *
   * @return {!string}
   */
  self.getNamespace = function() {
    return namespace;
  };
  /**
   * Manually set the caret position
   *
   * @param {!number} pos
   * @return {!leodido.controller.Caret}
   * @throws TypeError
   */
  self.setPosition = function(pos) {
    if (!isNaN(parseFloat(pos)) && isFinite(pos)) {
      setPositionPolyfill(pos);
      return self;
    }
    throw new TypeError('Position MUST be numeric.');
  };
  /**
   * Retrieve the (start) caret position
   *
   * @return {!number}
   */
  self.getPosition = getPositionPolyfill;
  /**
   * Retrive information about the current selection
   *
   * @return {!leodido.typedef.Selection}
   */
  self.getSelection = getSelectionPolyfill;
  // Force exports
  goog.exportProperty(self, 'getNamespace', self.getNamespace);
  goog.exportProperty(self, 'setPosition', self.setPosition);
  goog.exportProperty(self, 'getPosition', self.getPosition);
  // NOTE: getSelection not explicitly exported: it is protected by the compiler because it is not used internally
};
