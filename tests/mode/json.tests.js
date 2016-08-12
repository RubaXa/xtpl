define([
	'qunit',
	'xtpl',
	'xtpl/mode/json',
	'../qunit.assert.codeEqual'
], function (
	QUnit,
	xtplModule,
	jsonModeModule
) {
	'use strict';

	const xtpl = xtplModule.default;
	const jsonMode = jsonModeModule.default;
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
		return xtpl.fromString(input, {mode: jsonMode(), scope: scope});
	}

	QUnit.module('xtpl / mode / json')

	QUnit.test('|foo', function (assert) {
		const template = fromString('|foo');

		assert.codeEqual(template, 'var __S1 = {tag: undefined, children: \"foo\"};\nreturn __S1');
		assert.deepEqual(template(), {children: 'foo', tag: void 0});
	});

	QUnit.test('.foo', function (assert) {
		const template = fromString('.foo');

		assert.codeEqual(template, 'var __S1 = {tag: undefined, children: {tag: \"div\", attrs: {\"class\": \"foo\"}}};\nreturn __S1');
		assert.deepEqual(template(), {children: {tag: 'div', attrs: {class:'foo'}}, tag: void 0});
	});

	QUnit.test('b + i', function (assert) {
		const template = fromString('b + i');

		assert.codeEqual(template, 'var __S1 = {tag: undefined, children: [{tag: \"b\"}, {tag: \"i\"}]};\nreturn __S1');
		assert.deepEqual(template(), {children: [{tag: 'b'}, {tag: 'i'}], tag: void 0});
	});

	QUnit.test('IF statement', function (assert) {
		const template = fromString('if (x)\n  b', ['x']);

		assert.deepEqual(template(), {children: [], tag: void 0});
		assert.deepEqual(template({x: 1}), {children: [{tag: 'b'}], tag: void 0});
	});

	QUnit.test('IF/ELSE statement', function (assert) {
		const template = fromString('if (x)\n  b\nelse\n  |?', ['x']);

		assert.deepEqual(template(), {children: ['?'], tag: void 0});
		assert.deepEqual(template({x: 1}), {children: [{tag: 'b'}], tag: void 0});
	});

	QUnit.test('IF/ELSE IF/ELSE statement', function (assert) {
		const template = fromString('if (x == 1)\n  a\nelse if (x == 2)\n  b\nelse\n  |?', ['x']);

		assert.deepEqual(template({x: 1}), {children: [{tag: 'a'}], tag: void 0});
		assert.deepEqual(template({x: 2}), {children: [{tag: 'b'}], tag: void 0});
		assert.deepEqual(template(), {children: ['?'], tag: void 0});
	});

	// QUnit.test('page', function (assert) {
	// 	const template = xtpl.compile(pageFrag, {mode: jsonMode()});

	// 	assert.equal(typeof template, 'function')
	// 	assert.deepEqual(template(), null);
	// });

});
