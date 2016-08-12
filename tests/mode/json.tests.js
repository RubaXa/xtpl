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
		return xtpl.fromString(input, {mode: jsonMode(), scope: scope})();
	}

	QUnit.module('xtpl / mode / json')

	QUnit.test('| foo', function (assert) {
		const template = fromString('|foo');

		assert.codeEqual(template, 'return __S1');
		assert.deepEqual(template(), {children: 'foo', tag: void 0});
		assert.ok(template() === template(), 'strict equal');
	});

	QUnit.test('| ${x}', function (assert) {
		const template = fromString('|${x}', ['x']);

		assert.deepEqual(template({x: 'foo'}), {children: 'foo', tag: void 0});
		assert.deepEqual(template({x: 'bar'}), {children: 'bar', tag: void 0});
		assert.ok(template() !== template(), 'not strict equal');
	});

	QUnit.test('.foo', function (assert) {
		const template = fromString('.foo');

		assert.codeEqual(template, 'return __S1');
		assert.deepEqual(template(), {children: {tag: 'div', attrs: {class:'foo'}}, tag: void 0});
		assert.ok(template() === template(), 'strict equal');
	});

	QUnit.test('${x}', function (assert) {
		const template = fromString('${x}', ['x']);

		assert.deepEqual(template({x: 'a'}), {children: {tag: 'a'}, tag: void 0});
		assert.deepEqual(template({x: 'b'}), {children: {tag: 'b'}, tag: void 0});
		assert.ok(template() !== template(), 'not strict equal');
	});

	QUnit.test('${x} > a', function (assert) {
		const template = fromString('${x} > a', ['x']);

		assert.deepEqual(template({x: 'i'}), {children: {tag: 'i', children: {tag: 'a'}}, tag: void 0});
		assert.deepEqual(template({x: 'b'}), {children: {tag: 'b', children: {tag: 'a'}}, tag: void 0});
		assert.ok(template().children.children === template().children.children, 'children is strict equal');
	});

	QUnit.test('b + i', function (assert) {
		const template = fromString('b + i');

		assert.codeEqual(template, 'return __S1');
		assert.deepEqual(template(), {children: [{tag: 'b'}, {tag: 'i'}], tag: void 0});
		assert.ok(template() === template(), 'strict equal');
	});

	QUnit.test('IF statement', function (assert) {
		const template = fromString('if (x)\n  b', ['x']);

		assert.deepEqual(template(), {children: [], tag: void 0});
		assert.deepEqual(template({x: 1}), {children: [{tag: 'b'}], tag: void 0});
	});

	QUnit.test('IF/ELSE statement', function (assert) {
		const template = fromString('if (x)\n  a\nelse\n  b', ['x']);

		assert.deepEqual(template({x: 1}), {children: [{tag: 'a'}], tag: void 0});
		assert.deepEqual(template(), {children: [{tag: 'b'}], tag: void 0});
		assert.ok(template().children[0] === template().children[0], 'strict equal');
	});

	QUnit.test('IF/ELSE IF/ELSE statement', function (assert) {
		const template = fromString('if (x == 1)\n  a\nelse if (x == 2)\n  b\nelse\n  i', ['x']);

		assert.deepEqual(template({x: 1}), {children: [{tag: 'a'}], tag: void 0});
		assert.deepEqual(template({x: 2}), {children: [{tag: 'b'}], tag: void 0});
		assert.deepEqual(template(), {children: [{tag: 'i'}], tag: void 0});
		assert.ok(template().children[0] === template().children[0], 'strict equal');
	});

	QUnit.test('FOR statement', function (assert) {
		const template = fromString('ul > for (val in data)\n  li | ${val}', ['data']);

		assert.deepEqual(template({data: [1, 2]}), {children: [{tag: 'ul', children: [
			{tag: 'li', children: 1},
			{tag: 'li', children: 2},
		]}], tag: void 0});
	});

	QUnit.test('page', function (assert) {
		const template = fromString([
			'html',
			'  head',
			'    title | ${title}',
			'    script[src="core.js"]',
			'  body',
			'    h1 | Welcome',
			'    p | Hi, ${user}!',
		].join('\n'), ['title', 'user']);

		assert.deepEqual(template({title: 'Home', user: 'xtpl'}), {
			tag: undefined,
			children: {
				tag: "html",
				children: [{
					tag: "head",
					children: [{tag: "title", children: "Home"}, {tag: "script", attrs: {src: "core.js"}}]
				},
				{
					tag: "body",
					children: [{tag: "h1", children: "Welcome"}, {tag: "p", children: "Hi, xtpl!"}],
				}]
				
			}
		});

		assert.ok(template().children !== template().children, 'not strict equal');
		assert.ok(template().children.children[0].children[0] !== template().children.children[0].children[0], 'head > title: not strict equal');
		assert.ok(template().children.children[0].children[1] === template().children.children[0].children[1], 'head > script: strict equal');
		assert.ok(template().children.children[1].children[0] === template().children.children[1].children[0], 'body > h1: strict equal');
		assert.ok(template().children.children[1].children[1] !== template().children.children[1].children[1], 'body > p: not strict equal');
	});

});
