define([
	'qunit',
	'xtpl',
	'xtpl/mode/json',
	'xtpl/mode/string'
], function (
	QUnit,
	xtplModule,
	jsonModeModule,
	stringModeModule
) {
	'use strict';

	const xtpl = xtplModule.default;
	const jsonMode = jsonModeModule.default;
	const stringMode = stringModeModule.default;
	const frag = xtpl.parse(`html\n\thead > title | foo\n\tbody > h1 | Bar`.trim());

	QUnit.module('xtpl')

	QUnit.test('parse', function (assert) {
		assert.equal(frag.length, 1);
		assert.equal(frag.first.length, 2);
	})

	QUnit.test('string', function (assert) {
		const template = xtpl.compile(frag, {mode: stringMode()});
		const templatePrettify = xtpl.compile(frag, {mode: stringMode({prettify: true})});
		const expected = [
			'<html>',
			'  <head>',
			'    <title>foo</title>',
			'  </head>',
			'  <body>',
			'    <h1>Bar</h1>',
			'  </body>',
			'</html>'
		];

		assert.equal(typeof template, 'function')
		assert.deepEqual(template(), expected.map(line => line.trim()).join(''));
		assert.deepEqual(templatePrettify(), expected.join('\n'), 'prettify');
	});

	QUnit.test('json', function (assert) {
		const template = xtpl.compile(frag, {mode: jsonMode()});

		assert.equal(typeof template, 'function')
		assert.deepEqual(template(), {
			tag: undefined,
			children: {
				tag: "html",
				children: [
					{
						tag: "head",
						children: {tag: "title", children: "foo"}
					}, {
						tag: "body",
						children: {
							tag: "h1",
							children: "Bar"
						}
					}
				]
			}
		});
	});

	QUnit.test('if / string', function (assert) {
		const template = xtpl.fromString('foo\nif (x)\n  bar', {mode: stringMode(), scope: ['x']});

		assert.equal(template({x: false}), '<foo></foo>');
		assert.equal(template({x: true}), '<foo></foo><bar></bar>');
	});

	QUnit.test('if / json', function (assert) {
		const template = xtpl.fromString('foo\nif (x)\n  bar', {mode: jsonMode(), scope: ['x']});

		assert.deepEqual(template({x: false}), {tag: undefined, children: [{tag: 'foo'}]});
		assert.deepEqual(template({x: true}), {tag: undefined, children: [{tag: 'foo'}, {tag: 'bar'}]});
	});
});
