define([
	'qunit',
	'xtpl',
	'xtpl/mode/string',
	'../qunit.assert.codeEqual'
], function (
	QUnit,
	xtplModule,
	stringModeModule
) {
	'use strict';

	var xtpl = xtplModule.default;
	var stringMode = stringModeModule.default;
	var pageExpected = [
		'<html>',
		'  <head>',
		'    <title>foo</title>',
		'  </head>',
		'  <body>',
		'    <h1 class="title">Bar</h1>',
		'  </body>',
		'</html>',
		''
	];

	function fromString(input, scope) {
		return xtpl.fromString(input, {mode: stringMode(), scope: scope})();
	}

	QUnit.module('xtpl / mode / string')

	QUnit.test('doctype', function (assert) {
		var template = fromString(`!html`);
		assert.equal(template(), '<!DOCTYPE html>');
	});

	QUnit.test('page / prettify', function (assert) {
		var pageFrag = xtpl.parse(`html\n\thead > title | foo\n\tbody > h1.title | Bar`);
		var templatePrettify = xtpl.compile(pageFrag, {mode: stringMode({prettify: true})})();

		assert.equal(typeof templatePrettify, 'function')
		assert.deepEqual(templatePrettify(), pageExpected.join('\n'), 'prettify');
	});


	QUnit.test('interpolate', function (assert) {
		var template = fromString('h1.title-${size} | Hi, ${user}!', ['user', 'size']);
		assert.codeEqual(template, 'var __ROOT = "<h1 class=\\\"title-" + __STDLIB_HTML_ENCODE(size) + "\\\">Hi, " + __STDLIB_HTML_ENCODE(user) + "!</h1>";\n\treturn __ROOT');
	});

	QUnit.test('nesting', function (assert) {
		var template = fromString('.btn > .&__text');
		assert.codeEqual(template, 'var __ROOT = "<div class=\\\"btn\\\"><div class=\\\"btn__text\\\"></div></div>";\n\treturn __ROOT');
	});

	QUnit.test('nesting + interpolate', function (assert) {
		var template = fromString('.${x} > .&__text', ['x']);
		assert.codeEqual(template, 'var __ROOT = \"<div class=\\\"\" + __STDLIB_HTML_ENCODE(x) + \"\\\"><div class=\\\"\" + __STDLIB_HTML_ENCODE(x) + \"__text\\\"></div></div>\";\n\treturn __ROOT');
	});

	QUnit.test('panel = [title] + default slot', function (assert) {
		var template = fromString([
			'panel = [title]',
			'  h1 | ${title}',
			'  p > __default()',
			'panel[title="?!"]',
			'panel[title="Wow!"]',
			'  | Done',
		].join('\n'));

		assert.equal(template(), '<h1>?!</h1><p></p><h1>Wow!</h1><p>Done</p>');
	});

	QUnit.test('panel = [title] + content slot', function (assert) {
		var template = fromString([
			'panel = [title]',
			'  content(title.toUpperCase(), "?")',
			'panel[title="wow!"]',
			'  content = (text, chr)',
			'    p | ${text}${chr}',
		].join('\n'));

		assert.equal(template(), '<p>WOW!?</p>');
	});

	QUnit.test('panel = [title] + content slot (+ default)', function (assert) {
		var template = fromString([
			'panel = [title]',
			'  content(title.toUpperCase(), "?")',
			'  content = (text, chr)',
			'    | ${text}${chr}',
			'h1 > panel[title="wow"]',
			'h2 > panel[title="xyz"]',
			'  content = (text)',
			'    | ${text.split("").reverse().join("")}',
		].join('\n'));

		assert.equal(template(), '<h1>WOW?</h1><h2>ZYX</h2>');
	});

	QUnit.test('panel = [title] + super', function (assert) {
		var template = fromString([
			'panel = [title]',
			'  content(title)',
			'  content = (text)',
			'    | ${text}',
			'panel[title="xyz"]',
			'  content = (text)',
			'    p > super.content(text.toUpperCase()) + | !'
		].join('\n'));

		assert.equal(template(), '<p>XYZ!</p>');
	});
});
