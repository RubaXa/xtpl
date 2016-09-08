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

	QUnit.module('xtpl / mode / json');

	QUnit.test('статичная текстовая нода', function (assert) {
		var template = fromString('|foo');

		assert.codeEqual(template, 'return _$1');
		assert.deepEqual(template(), {children: 'foo', attrs: void 0, tag: void 0});
		assert.ok(template() === template(), 'strict equal');
	});

	QUnit.test('динамическая текстовая нода', function (assert) {
		const template = fromString('|${x}', ['x']);

		assert.deepEqual(template({x: null}), {children: '', tag: void 0, attrs: void 0});
		assert.deepEqual(template({x: 1}), {children: '1', tag: void 0, attrs: void 0});
		assert.deepEqual(template({x: 'foo'}), {children: 'foo', tag: void 0, attrs: void 0});
		assert.deepEqual(template({x: 'bar'}), {children: 'bar', tag: void 0, attrs: void 0});
		assert.ok(template() !== template(), 'not strict equal');
	});

	QUnit.test('.foo', function (assert) {
		const template = fromString('.foo');

		assert.codeEqual(template, 'return _$1');
		assert.deepEqual(template(), {children: {tag: 'div', attrs: {class:'foo'}, children: void 0}, tag: void 0, attrs: void 0});
		assert.ok(template() === template(), 'strict equal');
	});

	QUnit.test('Динамическое название тега', function (assert) {
		const template = fromString('${x}', ['x']);

		assert.deepEqual(template({x: 'a'}).children.tag, 'a');
		assert.deepEqual(template({x: 'b'}).children.tag, 'b');
		assert.ok(template() !== template(), 'not strict equal');
	});

	QUnit.test('Динамическое название тега, но статичские аттрибуты', function (assert) {
		const template = fromString('${x}.foo', ['x']);

		assert.deepEqual(template({x: 'a'}).children.attrs.class, 'foo');
		assert.deepEqual(template({x: 'b'}).children.attrs.class, 'foo');
		assert.ok(template() !== template(), 'root: not strict equal');
		assert.ok(template().children.attrs === template().children.attrs, 'attrs: strict equal');
	});

	QUnit.test('${x} > a', function (assert) {
		const template = fromString('${x} > a', ['x']);

		assert.deepEqual(template({x: 'i'}).children.tag, 'i');
		assert.deepEqual(template({x: 'b'}).children.tag, 'b');
		assert.ok(template({x: 's'}).children.children === template({x: 'em'}).children.children, 'children is strict equal');
	});

	QUnit.test('b + i', function (assert) {
		const template = fromString('b + i');

		assert.deepEqual(template().children[0].tag, 'b');
		assert.deepEqual(template().children[1].tag, 'i');
		assert.ok(template() === template(), 'strict equal');
	});

	QUnit.test('b + ${x}', function (assert) {
		const template = fromString('b + ${x}', ['x']);

		assert.deepEqual(template({x: 'a'}).children[0].tag, 'b');
		assert.deepEqual(template({x: 'a'}).children[1].tag, 'a');
		assert.deepEqual(template({x: 'em'}).children[1].tag, 'em');
		assert.deepEqual(template({x: 'i'}).children[0], template({x: 's'}).children[0]);
		assert.ok(template() !== template(), 'strict equal');
	});

	QUnit.test('.foo > .&_bar', function (assert) {
		const template = fromString('.foo > .&_bar');

		assert.deepEqual(template().children.attrs.class, 'foo');
		assert.deepEqual(template().children.children.attrs.class, 'foo_bar');
		assert.ok(template() === template(), 'strict equal');
	});

	QUnit.test('.foo > %-bar > .&__qux', function (assert) {
		const template = fromString('.foo > %-bar > .&__qux');

		assert.deepEqual(template().children.attrs.class, 'foo');
		assert.deepEqual(template().children.children.attrs.class, 'foo-bar__qux');
		assert.ok(template() === template(), 'strict equal');
	});

	QUnit.test('.${x} > .&_bar + b', function (assert) {
		const template = fromString('.${x} > .&_bar + b', ['x']);

		assert.deepEqual(template({x: 'foo'}).children.attrs.class, 'foo');
		assert.deepEqual(template({x: 'oof'}).children.children[0].attrs.class, 'oof_bar');
		assert.ok(template() !== template(), 'not strict equal');
		assert.ok(template({x: 'a'}).children.children[1] === template({x: 'b'}).children.children[1]);
	});
	
	QUnit.test('IF statement', function (assert) {
		const template = fromString('if (x)\n  b', ['x']);

		assert.deepEqual(template().children, []);
		assert.deepEqual(template({x: 1}).children[0].tag, 'b');
		assert.ok(template() !== template(), 'not strict equal');
		assert.ok(template({x: 1}).children[0] === template({x: 2}).children[0], 'children: strict equal');
	});

	QUnit.test('IF/ELSE statement', function (assert) {
		const template = fromString('if (x)\n  a\nelse\n  b', ['x']);

		assert.deepEqual(template({x: 1}).children[0].tag, 'a');
		assert.deepEqual(template().children[0].tag, 'b');
		assert.ok(template({x: 1}).children[0] === template({x: 1}).children[0], '1: strict equal');
		assert.ok(template().children[0] === template().children[0], 'strict equal');
	});

	QUnit.test('IF/ELSE IF/ELSE statement', function (assert) {
		const template = fromString('if (x == 1)\n  a\nelse if (x == 2)\n  b\nelse\n  i', ['x']);

		assert.deepEqual(template({x: 1}).children[0].tag, 'a');
		assert.deepEqual(template({x: 2}).children[0].tag, 'b');
		assert.deepEqual(template().children[0].tag, 'i');
		assert.ok(template({x: 1}).children[0] === template({x: 1}).children[0], '1: strict equal');
		assert.ok(template({x: 2}).children[0] === template({x: 2}).children[0], '2: strict equal');
		assert.ok(template().children[0] === template().children[0], 'strict equal');
	});

	QUnit.test('FOR statement (text)', function (assert) {
		const template = fromString('for (val in data)\n  | ${val}', ['data']);

		assert.deepEqual(template({data: [1, 2]}).children[0], '1');
		assert.deepEqual(template({data: [2, 3]}).children[1], '3');
	});

	QUnit.test('FOR statement (li)', function (assert) {
		const template = fromString('ul > for (val in data)\n  li | ${val}', ['data']);

		assert.deepEqual(template({data: [1, 2]}).children[0].tag, 'ul');
		assert.deepEqual(template({data: [1, 2]}).children[0].children.length, 2);
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

	QUnit.test('elem = [] (const element)', function (assert) {
		var template = fromString([
			'elem = []',
			'  p | OK',
			'elem'
		].join('\n'));

		assert.deepEqual(template().children.tag, 'p');
		assert.deepEqual(template().children.children, 'OK');
		assert.ok(template() === template(), 'strict equal');
	});

	QUnit.test('elem = [text] (const usage)', function (assert) {
		var template = fromString([
			'elem = [text]',
			'  p | ${text || "def"}',
			'elem',
			'elem[text="Wow!"]'
		].join('\n'));

		assert.deepEqual(template().children[0].tag, 'p');
		assert.deepEqual(template().children[0].children, 'def');
		assert.deepEqual(template().children[1].tag, 'p');
		assert.deepEqual(template().children[1].children, 'Wow!');
		assert.ok(template() === template(), 'strict equal');
	});

	QUnit.test('elem = [text] (interpolate)', function (assert) {
		var data = {x: 'Wow!'}
		var template = fromString([
			'elem = [text]',
			'  p | ${text}',
			'elem[text="OK"]',
			'elem[text="${x}"]'
		].join('\n'), ['x']);

		assert.deepEqual(template(data).children[0].tag, 'p');
		assert.deepEqual(template(data).children[0].children, 'OK');

		assert.deepEqual(template(data).children[1].tag, 'p');
		assert.deepEqual(template(data).children[1].children, 'Wow!');

		assert.ok(template(data).children[0] === template(data).children[0], '0: strict equal');
		assert.ok(template(data).children[1] !== template(data).children[1], '0: not strict equal');
		assert.ok(template() !== template(), 'not strict equal');
	});

	QUnit.test('elem = [] + default slot', function (assert) {
		var template = fromString([
			'elem = []',
			'  __default = ()',
			'    | def',
			'  __default()',
			'elem',
			'elem',
			'  | OK!'
		].join('\n'));

		assert.deepEqual(template().children[0], 'def');
		assert.deepEqual(template().children[1], 'OK!');
		assert.ok(template() === template(), 'strict equal');
	});

	QUnit.test('elem = [] + slot without default content', function (assert) {
		var template = fromString([
			'elem = []',
			'  p > content()',
			'elem',
			'elem',
			'  content = ()',
			'    | OK!'
		].join('\n'));

		assert.deepEqual(template().children[0].tag, 'p');
		assert.deepEqual(template().children[0].children, '');
		assert.deepEqual(template().children[1].tag, 'p');
		assert.deepEqual(template().children[1].children, 'OK!');
		assert.ok(template() === template(), 'strict equal');
	});
});
