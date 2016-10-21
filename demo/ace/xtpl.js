define('ace/mode/xtpl', ['require', 'exports', 'module'], function (require, exports) {
	'use strict';

	var oop = require('ace/lib/oop');
	var TextMode = require('ace/mode/text').Mode;
	var XTPLHighlightRules = require('ace/mode/xtpl_highlight_rules').XTPLHighlightRules;

	function XTPLMode() {
		this.HighlightRules = XTPLHighlightRules;
	}

	oop.inherits(XTPLMode, TextMode);

	(function() {
		// Extra logic goes here. (see below)
	}).call(XTPLMode.prototype);

	// Export
	exports.Mode = XTPLMode;
});
