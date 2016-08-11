define([
	'qunit',
	'xtpl',
	'xtpl/mode/string'
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
	]

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


	// QUnit.test('keyworkds', function (assert) {
	// 	const template = xtpl.fromString('foo\nif (x)\n  bar', {mode: stringMode(), scope: ['x']});

	// 	assert.equal(template({x: false}), '<foo></foo>');
	// 	assert.equal(template({x: true}), '<foo></foo><bar></bar>');
	// });
});
