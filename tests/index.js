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
});
