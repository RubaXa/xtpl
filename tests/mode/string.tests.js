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

	const xtpl = xtplModule.default;
	const stringMode = stringModeModule.default;
	const pageFrag = xtpl.parse(`html\n\thead > title | foo\n\tbody > h1.title | Bar`);
	const pageExpected = [
		'<html>',
		'  <head>',
		'    <title>foo</title>',
		'  </head>',
		'  <body>',
		'    <h1 class="title">Bar</h1>',
		'  </body>',
		'</html>'
	];

	function fromString(input, scope) {
		return xtpl.fromString(input, {mode: stringMode(), scope: scope});
	}

	QUnit.module('xtpl / mode / string')

	QUnit.test('page', function (assert) {
		const template = xtpl.compile(pageFrag, {mode: stringMode()});

		assert.equal(typeof template, 'function')
		assert.deepEqual(template(), pageExpected.map(line => line.trim()).join(''));
	});

	QUnit.test('page / prettify', function (assert) {
		const templatePrettify = xtpl.compile(pageFrag, {mode: stringMode({prettify: true})});

		assert.equal(typeof templatePrettify, 'function')
		assert.deepEqual(templatePrettify(), pageExpected.join('\n'), 'prettify');
	});


	QUnit.test('interpolate', function (assert) {
		const template = fromString('h1.title-${size} | Hi, ${user}!', ['user', 'size']);

		assert.codeEqual(template, 'var __ROOT = "<h1 class=\\\"title-" + (size) + "\\\">Hi, " + (user) + "!</h1>";');
		assert.deepEqual(template({user: 'xtpl', size: 'xxl'}), '<h1 class="title-xxl">Hi, xtpl!</h1>');
	});

	QUnit.test('nesting', function (assert) {
		const template = fromString('.btn > .&__text');
		assert.codeEqual(template, 'var __ROOT = "<div class=\\\"btn\\\"><div class=\\\"btn__text\\\"></div></div>";');
	});

	QUnit.test('nesting + interpolate', function (assert) {
		const template = fromString('.${x} > .&__text', ['x']);
		
		assert.codeEqual(template, 'var __ROOT = \"<div class=\\\"\" + (x) + \"\\\"><div class=\\\"\" + (x) + \"__text\\\"></div></div>\";');
		assert.equal(template({x: 'ico'}), '<div class=\"ico\"><div class=\"ico__text\"></div></div>');
	});

	QUnit.test('nesting + hidden_class', function (assert) {
		const template = fromString('.foo > %-bar > .&__ico + .&__txt');
		assert.equal(template(), '<div class=\"foo\"><div class=\"foo-bar__ico\"></div><div class=\"foo-bar__txt\"></div></div>');
	});

	QUnit.test('self nesting', function (assert) {
		const template = fromString('.foo\n  class.&_small: true');
		assert.equal(template(), '<div class=\"foo foo_small\"></div>');
	});

	QUnit.test('self nesting + interpolate', function (assert) {
		const template = fromString('.foo\n  class.&_${mode}: true', ['mode']);
		assert.equal(template({mode: 'bar'}), '<div class=\"foo foo_bar\"></div>');
	});

	QUnit.test('IF statement', function (assert) {
		const template = fromString('foo\nif (x)\n  bar', ['x']);

		assert.equal(template({}), '<foo></foo>');
		assert.equal(template({x: false}), '<foo></foo>');
		assert.equal(template({x: true}), '<foo></foo><bar></bar>');
	});

	QUnit.test('IF/ELSE statement', function (assert) {
		const template = fromString('if (x)\n  a\nelse\n  b', ['x']);

		assert.equal(template({x: true}), '<a></a>');
		assert.equal(template({x: false}), '<b></b>');
	});

	QUnit.test('IF/ELSE IF/ELSE statement', function (assert) {
		const template = fromString('if (x == 1)\n  a\nelse if (x == 2)\n  b\nelse\n  c', ['x']);

		assert.equal(template({x: 1}), '<a></a>');
		assert.equal(template({x: 2}), '<b></b>');
		assert.equal(template({}), '<c></c>');
	});
});
