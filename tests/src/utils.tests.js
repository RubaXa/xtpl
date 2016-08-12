define(['qunit', 'xtpl/src/utils', 'xtpl/syntax/xtpl'], function (QUnit, utils, xtplParser) {
	'use strict';

	QUnit.module('xtpl / src / utils');

	// utils = utils['default'];
	xtplParser = xtplParser['default'];

	QUnit.test('tagName.stringify', function (assert) {
		function testMe(tpl, expected) {
			var frag = xtplParser(tpl);
			assert.equal(utils.stringify(frag.first.raw.name), expected, tpl);
		}

		testMe('div', '"div"');
		testMe('${attrs.name}', '(attrs.name)');
		testMe('element-${attrs.name}', '"element-" + (attrs.name)');
	});

	QUnit.test('class.stringify', function (assert) {
		function testMe(tpl, expected) {
			var frag = xtplParser(tpl);
			assert.equal(utils.stringifyAttr('class', frag.first.raw.attrs.class), expected, tpl);
		}

		testMe('.foo', '"foo"');
		testMe('.foo.bar', '"foo bar"');
		testMe('.${foo}', '(foo)');
		testMe('.${foo}.bar', '(foo) + " bar"');
		testMe('.foo.${bar}', '"foo " + (bar)');
		testMe('.${foo}.${bar}', '(foo) + " " + (bar)');
		testMe('.x-${foo}-y.${bar}', '"x-" + (foo) + "-y " + (bar)');
		testMe('.x-${foo}-y.z-${bar}', '"x-" + (foo) + "-y z-" + (bar)');
	});

	QUnit.test('class.stringify x 3', function (assert) {
		var frag = xtplParser('.foo.bar');

		function testMe(tpl) {
			assert.equal(utils.stringifyAttr('class', frag.first.raw.attrs.class), '"foo bar"', tpl);
		}

		testMe();
		testMe();
		testMe();
	});

	QUnit.test('attribute.stringify', function (assert) {
		function testMe(tpl, expected, attr) {
			var frag = xtplParser(tpl);

			attr = attr || 'value';
			assert.equal(utils.stringifyAttr(attr, frag.first.raw.attrs[attr]), expected, tpl);
		}

		testMe('input[checked]', 'true', 'checked');
		testMe('input[checked="${active}"]', '(active)', 'checked');
		testMe('input[value="foo"]', '"foo"');
		testMe('input[value="foo bar"]', '"foo bar"');
		testMe('input[value="Hi, ${user}!"]', '"Hi, " + (user) + "!"');
	});
});