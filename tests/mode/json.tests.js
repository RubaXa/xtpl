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

	QUnit.test('.foo > .&_bar', function (assert) {
		const template = fromString('.foo > .&_bar');

		assert.deepEqual(template(), {
			tag: undefined,
			children: {
				tag: 'div',
				attrs: {class: 'foo'},
				children: {tag: 'div', attrs: {class: 'foo_bar'}}
			}
		});
		assert.ok(template() === template(), 'strict equal');
	});

	QUnit.test('.foo > %-bar > .&__qux', function (assert) {
		const template = fromString('.foo > %-bar > .&__qux');

		assert.deepEqual(template(), {
			tag: undefined,
			children: {
				tag: 'div',
				attrs: {class: 'foo'},
				children: {
					tag: undefined,
					children: {tag: 'div', attrs: {class: 'foo-bar__qux'}}
				}
			}
		});
		assert.ok(template() === template(), 'strict equal');
	});

	QUnit.test('.${x} > .&_bar', function (assert) {
		const template = fromString('.${x} > .&_bar', ['x']);

		assert.deepEqual(template({x: 'WOW'}), {
			tag: undefined,
			children: {
				tag: 'div',
				attrs: {class: 'WOW'},
				children: {tag: 'div', attrs: {class: 'WOW_bar'}}
			}
		});
		assert.ok(template() !== template(), 'strict equal');
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

		assert.ok(template().children !== template().children, 'not strict equal');
		assert.ok(template().children.children[0].children[0] !== template().children.children[0].children[0], 'head > title: not strict equal');
		assert.ok(template().children.children[0].children[1] === template().children.children[0].children[1], 'head > script: strict equal');
		assert.ok(template().children.children[1].children[0] === template().children.children[1].children[0], 'body > h1: strict equal');
		assert.ok(template().children.children[1].children[1] !== template().children.children[1].children[1], 'body > p: not strict equal');
	});

	QUnit.test('elem = [text] (static)', function (assert) {
		var template = fromString([
			'elem = [text]',
			'  p | ${text}',
			'elem[text="Wow!"]'
		].join('\n'));

		assert.codeEqual(template, 'return __S1');
		assert.deepEqual(template().children, {tag: "p", children: 'Wow!'});
		assert.ok(template() === template(), 'strict equal');
	});

	QUnit.test('elem = [text] (interpolate)', function (assert) {
		var template = fromString([
			'elem = [text]',
			'  p | ${text}',
			'elem[text="${x}"]'
		].join('\n'), ['x']);

		assert.codeEqual(template, 'return ({tag: undefined, children: elem({\"text\": (x)})})');
		assert.deepEqual(template({x: 'Wow!'}).children, {tag: "p", children: 'Wow!'});
		assert.ok(template() !== template(), 'not strict equal');
	});

	QUnit.test('elem = [] + default slot', function (assert) {
		var template = fromString([
			'elem = []',
			'  __default = ()',
			'    | def',
			'elem',
			'elem',
			'  OK!'
		].join('\n'));

		assert.deepEqual(template({x: 'Wow!'}).children, {tag: "p", children: 'Wow!'});
		assert.ok(template() !== template(), 'not strict equal');
	});
});
