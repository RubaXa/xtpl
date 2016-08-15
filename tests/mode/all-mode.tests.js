define([
	'qunit',
	'xtpl',
	'xtpl/mode/string',
	'xtpl/mode/json',
], function (
	QUnit,
	xtplModule,
	stringModeModule,
	jsonModeModule
) {
	'use strict';

	var xtpl = xtplModule['default'];
	var MODE = {
		string: stringModeModule['default'],
		json: jsonModeModule['default']
	};

	function toHTML(frag) {
		if (frag && typeof frag !== 'string') {
			var name = frag.tag;
			var html;
			
			if (name === '!') {
				html = '<!--' + frag.children + '-->'
			} else {
				if (name) {
					html = '<' + name;
					
					Object.keys(frag.attrs || {}).forEach(function (name) {
						html += ' ' + name + '="' + frag.attrs[name] + '"';
					});

					html += '>';
				} else {
					html = '';
				}
				
				if (frag.children) {
					html += [].concat(frag.children).map(toHTML).join('');
				}

				html += name ? '</' + name + '>' : '';
			}

			return html;
		}

		return frag;
	}

	function test(title, templateSource, scope, expectedHTML) {
		var fragment = xtpl.parse(templateSource);

		expectedHTML = [].concat(expectedHTML);

		QUnit.test(title + ' -> ' + templateSource, function (assert) {
			[].concat(scope).forEach(function (scope, idx) {
				Object.keys(MODE).forEach(function (name) {
					var templateFactory = xtpl.compile(fragment, {
						mode: MODE[name](),
						scope: Object.keys(scope)
					});
					var template = templateFactory();
					
					assert.equal(toHTML(template(scope)), expectedHTML[idx], name + ' vs. ' + JSON.stringify(scope));
				});
			});
		});
	};

	// Tests
	QUnit.module('xtpl / all-mode');
	
	test('text', '| foo', {}, 'foo');
	
	test(
		'page',
		'html\n\thead > title | foo\n\tbody > h1.title | Bar',
		{},
		'<html><head><title>foo</title></head><body><h1 class=\"title\">Bar</h1></body></html>'
	);

	test(
		'tag + text + interpolate',
		'h1.title-${size} | Hi, ${user}!',
		[{user: 'xtpl', size: 'xxl'}, {user: 'X', size: 'wow'}],
		['<h1 class="title-xxl">Hi, xtpl!</h1>', '<h1 class="title-wow">Hi, X!</h1>']
	);

	test(
		'Nesting',
		'.btn > .&__text',
		{},
		'<div class=\"btn\"><div class=\"btn__text\"></div></div>'
	);

	test(
		'Nesting + interpolate',
		'.${x} > .&__text',
		{x: 'ico'},
		'<div class=\"ico\"><div class=\"ico__text\"></div></div>'
	);

	test(
		'Nesting + inherit self',
		'.foo\n  class.&_small: true',
		{},
		'<div class=\"foo foo_small\"></div>'
	);
	
	test(
		'Nesting + inherit self + interpolate',
		'.foo\n  class.&_${mode}: true',
		{mode: 'bar'},
		'<div class=\"foo foo_bar\"></div>'
	);

	test(
		'Nesting + hidden_class',
		'.foo > %-bar > .&__ico + .&__txt',
		{},
		'<div class=\"foo\"><div class=\"foo-bar__ico\"></div><div class=\"foo-bar__txt\"></div></div>'
	);

	test('IF statement',
		'foo\nif (x)\n  bar',
		[{x: null}, {x: false}, {x: true}],
		['<foo></foo>', '<foo></foo>', '<foo></foo><bar></bar>']
	);

	test(
		'IF/ELSE statement',
		'if (x)\n  a\nelse\n  b',
		[{x: true}, {x: false}],
		['<a></a>', '<b></b>']
	);

	test(
		'IF/ELSE IF/ELSE statement', 
		'if (x == 1)\n  a\nelse if (x == 2)\n  b\nelse\n  c',
		[{x: 1}, {x: 2}, {x: null}],
		['<a></a>', '<b></b>', '<c></c>']
	);

	test(
		'FOR statement',
		'for (val in data)\n  | ${val},',
		{data: [1, 2]},
		'1,2,'
	);

	test(
		'FOR statement with key',
		'for ([key, val] in data)\n  | ${key}:${val},',
		{data: [1, 2]},
		'0:1,1:2,'
	);
});