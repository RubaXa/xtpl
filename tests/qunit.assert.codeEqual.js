define(['qunit'], function (QUnit) {
	QUnit.assert.codeEqual = function (template, expected, message) {
		var actual = template.toString().match(/\/\/ CODE:START([\s\S]+)\/\/ CODE:END/) || [, ''];
		QUnit.assert.equal(actual[1].trim().replace(/ *(return )/, '$1'), expected, message)
	};
});