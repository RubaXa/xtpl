// todo: ошибки на закрытие тега + onend

define(['qunit', 'xtpl/syntax/xtpl', '../qunit.assert.fragEqual'], function (QUnit, xtplParser) {
	'use strict';

	QUnit.module('xtpl / syntax / xtpl');

	xtplParser = xtplParser['default'];

	QUnit.test('empty', function (assert) {
		function testMe(tpl) {
			var frag = xtplParser(tpl);
			assert.equal(frag.length, 0);
		}

		testMe('');
		testMe(' ');
		testMe('\t');
		testMe('\n');
		testMe('\t \n');
	});

	QUnit.test('!html', function (assert) {
		var frag = xtplParser('!html');
		
		assert.equal(frag.length, 1);
		assert.equal(frag.first.type, 'dtd');
		assert.equal(frag.first.length, 0);
		assert.fragEqual(frag.first.raw, {value: 'html'});
	});

	QUnit.test('| foo-bar', function (assert) {
		var frag = xtplParser('| foo-bar');
		
		assert.equal(frag.length, 1);
		assert.equal(frag.first.type, 'text');
		assert.equal(frag.first.length, 0);
		assert.fragEqual(frag.first.raw, {multiline: false, value: 'foo-bar'});
	});

	QUnit.test('| foo${bar}', function (assert) {
		function testMe(tpl) {
			var frag = xtplParser(tpl);
			
			assert.equal(frag.length, 1, tpl);
			assert.equal(frag.first.type, 'text');
			assert.equal(frag.first.length, 0);
			assert.fragEqual(frag.first.raw, {multiline: false, value: tpl.substr(1).trim()});
		}

		testMe('|${bar}');
		testMe('| ${bar}');
		testMe('| foo${bar}');
		testMe('| ${bar}foo');
		testMe('| foo${bar}baz');
		testMe('| foo${bar}baz${qux}');
	});

	QUnit.test('b', function (assert) {
		function testMe(tpl) {
			var frag = xtplParser(tpl);

			assert.equal(frag.length, 1, tpl);
			assert.equal(frag.first.type, 'tag');
			assert.equal(frag.first.length, 0);
			assert.deepEqual(frag.first.raw, {name: 'b', attrs: {}});
		}

		testMe('b');
		testMe(' b ');
		testMe(' b{}');
		testMe(' b {}');
	});

	QUnit.test('tag-${x}', function (assert) {
		function testMe(tpl) {
			var frag = xtplParser(tpl);
			
			assert.equal(frag.length, 1, tpl);
			assert.equal(frag.first.type, 'tag');
			assert.equal(frag.first.length, 0);
			assert.fragEqual(frag.first.raw, {name: tpl, attrs: {}});
		}

		testMe('${x}');
		testMe('${x}-postfix');
		testMe('prefix-${x}');
		testMe('prefix-${x}-postfix');
	});

	QUnit.test('b | foo', function (assert) {
		function testMe(tpl) {
			var frag = xtplParser(tpl);
			
			assert.equal(frag.length, 1, tpl);
			assert.equal(frag.first.type, 'tag');
			assert.equal(frag.first.length, 1);
			assert.equal(frag.first.first.type, 'text');
			assert.fragEqual(frag.first.raw, {name: 'b', attrs: {}});
			assert.fragEqual(frag.first.first.raw, {multiline: false, value: 'foo'});
		}

		testMe('b|foo');
		testMe('b |foo');
		testMe('b| foo');
		testMe('b | foo');
		testMe('b | foo');
		testMe('b{| foo\n}');
		testMe('b {| foo\n}');
		testMe('b\n  | foo');
	});

	QUnit.test('#foo', function (assert) {
		function testMe(tpl) {
			var frag = xtplParser(tpl);
		
			assert.equal(frag.length, 1, tpl);
			assert.equal(frag.first.type, 'tag');
			assert.fragEqual(frag.first.raw, {name: 'div', attrs: {id: 'foo'}});
		}

		testMe('#foo');
		testMe('#foo{}');
		testMe('#foo {}');
	});
	
	QUnit.test('#${foo}', function (assert) {
		function testMe(tpl) {
			var frag = xtplParser(tpl);
			
			assert.equal(frag.length, 1, tpl);
			assert.equal(frag.first.type, 'tag');
			assert.fragEqual(frag.first.raw, {name: 'div', attrs: {id: tpl.substr(1)}});
		}

		testMe('#${foo}');
		testMe('#x${foo}');
		testMe('#${foo}y');
		testMe('#${foo}${bar}');
	});

	QUnit.test('.foo', function (assert) {
		function testMe(tpl) {
			var frag = xtplParser(tpl);

			assert.equal(frag.length, 1, tpl);
			assert.equal(frag.first.type, 'tag');
			assert.fragEqual(frag.first.raw, {name: 'div', attrs: {class: 'foo'}});
		}

		testMe('.foo');
		testMe('.foo{}');
		testMe('.foo {}');
	});

	QUnit.test('.foo.', function (assert) {
		try {
			xtplParser('.foo.');
			assert.ok(false);
		} catch (err) {
			assert.equal(err.pretty, '.foo.\n----^');
		}
	});

	QUnit.test('div | #foo | .foo + comment', function (assert) {
		function testMe(tpl, attrs) {
			var frag = xtplParser(tpl);

			assert.equal(frag.length, 2, tpl);
			assert.equal(frag.first.type, 'tag');
			assert.fragEqual(frag.first.raw, {name: 'div', attrs: attrs});

			assert.equal(frag.last.type, 'comment');
			assert.fragEqual(frag.last.raw, {value: 'bar'});
		}

		testMe('div//bar', {});

		testMe('#foo//bar', {id: 'foo'});
		testMe('#foo // bar', {id: 'foo'});

		testMe('.foo//bar', {class: 'foo'});
		testMe('.foo // bar', {class: 'foo'});
	});

	QUnit.test('.${foo}', function (assert) {
		function testMe(tpl) {
			var frag = xtplParser(tpl);
			
			assert.equal(frag.length, 1, tpl);
			assert.equal(frag.first.type, 'tag');
			assert.fragEqual(frag.first.raw, {name: 'div', attrs: {class: tpl.replace(/\./g, ' ').trim()}});
		}

		testMe('.${foo}');
		testMe('.x${foo}');
		testMe('.${foo}y');
		testMe('.${foo}${bar}');
		testMe('.${foo}.${bar}');
	});

	QUnit.test('.foo.bar', function (assert) {
		var frag = xtplParser('.foo.bar');
		
		assert.equal(frag.length, 1);
		assert.fragEqual(frag.first.raw, {name: 'div', attrs: {class: 'foo bar'}});
	});

	QUnit.test('i.foo.bar', function (assert) {
		var frag = xtplParser('i.foo.bar');
		
		assert.equal(frag.length, 1);
		assert.fragEqual(frag.first.raw, {name: 'i', attrs: {class: 'foo bar'}});
	});

	QUnit.test('#foo.bar', function (assert) {
		function testMe(tpl, tag) {
			var frag = xtplParser(tpl);
			
			assert.equal(frag.length, 1, tpl);
			assert.fragEqual(frag.first.raw, {name: tag || 'div', attrs: {id: 'foo', class: 'bar'}});
		}

		testMe('#foo.bar');
		testMe('.bar#foo');

		testMe('i#foo.bar', 'i');
		testMe('i.bar#foo', 'i');
	});
	
	QUnit.test('tag-${i}#id-${foo}.cls-${bar}', function (assert) {
		var frag = xtplParser('tag-${i}#id-${foo}.cls-${bar}');
		
		assert.equal(frag.length, 1);
		assert.fragEqual(frag.first.raw, {name: 'tag-${i}', attrs: {id: 'id-${foo}', class: 'cls-${bar}'}});
	});

	QUnit.test('#foo.bar#baz (Duplicate attribute \"id\" is not allowed)', function (assert) {
		try {
			xtplParser('#foo.bar#baz');
			assert.ok(false);
		} catch (err) {
			assert.equal(err.message, 'Duplicate attribute \"id\" is not allowed');
		}
	});

	QUnit.test('.foo.bar[baz][qux][qux="1-${2}-3"][quxx="z"]', function (assert) {
		var frag = xtplParser('.foo.bar[baz][qux][qux="-${x}"][qux="!"][quxx="z"]');
		
		assert.fragEqual(frag.length, 1);
		assert.fragEqual(frag.first.raw.attrs, {
			class: 'foo bar',
			baz: 'true',
			qux: 'true-${x}!',
			quxx: 'z'
		});
	});

	QUnit.test('.foo > .&-bar', function (assert) {
		var frag = xtplParser('.foo > .&-bar');
		
		assert.deepEqual(frag.first.raw.attrs, {class: [['foo']]});
		assert.deepEqual(frag.first.first.raw.attrs, {class: [[{type: 'inherit', raw: 'parent'}, '-bar']]});
	});

	QUnit.test('.foo > %-bar > .&-baz', function (assert) {
		function testMe(tpl) {
			var frag = xtplParser(tpl);
			
			assert.equal(frag.first.first.type, 'hidden:class');
			assert.deepEqual(frag.first.raw.attrs, {class: [['foo']]}, tpl);
			assert.deepEqual(frag.first.first.raw.attrs, {class: [[{type: 'inherit', raw: 'parent'}, '-bar']]});
			assert.deepEqual(frag.first.first.first.raw.attrs, {class: [[{type: 'inherit', raw: 'parent'}, '-baz']]});
		}

		testMe('.foo>%-bar>.&-baz');
		testMe('.foo > %-bar > .&-baz');
	});

	QUnit.test('i.foo.bar | qux', function (assert) {
		function testMe(tpl) {
			var frag = xtplParser(tpl);
			
			assert.equal(frag.length, 1, tpl);
			assert.fragEqual(frag.first.raw, {name: 'i', attrs: {class: 'foo bar'}});
			assert.equal(frag.first.length, 1);
			assert.fragEqual(frag.first.first.raw, {multiline: false, value: 'qux'});
		}

		testMe('i.foo.bar|qux');
		testMe('i.foo.bar | qux');
		testMe('i.foo.bar{|qux\n}');
	});

	QUnit.test('i > b', function (assert) {
		function testMe(tpl) {
			var frag = xtplParser(tpl);
			
			assert.equal(frag.length, 1, tpl);
			assert.deepEqual(frag.first.raw, {name: 'i', attrs: {}});
			
			assert.equal(frag.first.length, 1);
			assert.deepEqual(frag.first.first.raw, {name: 'b', attrs: {}});
		}

		testMe('i>b');
		testMe('i >b');
		testMe('i> b');
		testMe('i > b');
	});

	QUnit.test('h1 > i\nh2 > em', function (assert) {
		function testMe(tpl) {
			var frag = xtplParser(tpl);
			
			assert.equal(frag.length, 2, tpl);
			assert.deepEqual(frag.first.raw.name, 'h1');
			assert.deepEqual(frag.last.raw.name, 'h2');
		}

		testMe('h1>i\nh2>em');
		testMe('h1 > i\nh2 > em');
		testMe('h1 > i.foo\nh2 > em.bar');
		testMe('h1 > i[foo]\nh2 > em[bar]');
	});

	QUnit.test('div\n  i > b (multiple)', function (assert) {
		function testMe(tpl) {
			var frag = xtplParser(tpl);

			assert.equal(frag.length, 1, tpl);
			assert.equal(frag.first.length, 2);
		}

		testMe('div\n  i>b\n  i>b');
		testMe('div\n  i > b\n  i > b');
	});

	QUnit.test('i > b | foo', function (assert) {
		var frag = xtplParser('i > b | foo');
		
		assert.equal(frag.length, 1);
		assert.deepEqual(frag.first.raw, {name: 'i', attrs: {}});
		
		assert.equal(frag.first.length, 1);
		assert.deepEqual(frag.first.first.raw, {name: 'b', attrs: {}});
		
		assert.equal(frag.first.first.length, 1);
		assert.deepEqual(frag.first.first.first.raw, {multiline: false, value: 'foo'});
	});

	QUnit.test('i > b + em | foo', function (assert) {
		function testMe(tpl) {
			var frag = xtplParser(tpl);
			
			assert.equal(frag.length, 1, tpl);
			assert.deepEqual(frag.first.raw, {name: 'i', attrs: {}});
			
			assert.equal(frag.first.length, 2);
			assert.deepEqual(frag.first.first.raw, {name: 'b', attrs: {}});
			assert.deepEqual(frag.first.last.raw, {name: 'em', attrs: {}});
			
			assert.equal(frag.first.last.length, 1);
			assert.deepEqual(frag.first.last.first.raw, {multiline: false, value: 'foo'});
		}

		testMe('i>b+em|foo');
		testMe('i > b +em|foo');
		testMe('i > b+ em|foo');
		testMe('i > b + em|foo');
		testMe('i > b + em | foo');
	});

	QUnit.test('i.foo\\n.bar', function (assert) {
		var frag = xtplParser('i.foo\n.bar');
		
		assert.equal(frag.length, 2);
		assert.fragEqual(frag.first.raw, {name: 'i', attrs: {class: 'foo'}});
		assert.fragEqual(frag.last.raw, {name: 'div', attrs: {class: 'bar'}});
	});

	QUnit.test('i{}', function (assert) {
		function testMe(tpl) {
			var frag = xtplParser(tpl);
			
			assert.equal(frag.length, 1, tpl + ' -- root.length');
			assert.deepEqual(frag.first.raw, {name: 'i', attrs: {}}, tpl + ' -- tag');
			assert.deepEqual(frag.first.length, 0, tpl + ' -- inner.length');
		}

		testMe('i{}');
		testMe('i {}');
		testMe('i{ }');
		testMe('i { }');
		testMe('i{\n}');
	});

	QUnit.test('i { b }', function (assert) {
		function testMe(tpl) {
			var frag = xtplParser(tpl);
			
			assert.equal(frag.length, 1, tpl + ' -- root.length');
			assert.deepEqual(frag.first.raw, {name: 'i', attrs: {}}, tpl + ' -- tag');
			assert.deepEqual(frag.first.length, 1, tpl + ' -- inner.length');
			assert.deepEqual(frag.first.first.raw, {name: 'b', attrs: {}});
		}

		testMe('i{b}');
		testMe('i{ b }');
		testMe('i{\nb }');
		testMe('i{b\n}');
		testMe('i{\nb\n}');
	});

	QUnit.test('i {.bar} em | wow', function (assert) {
		function testMe(tpl) {
			var frag = xtplParser(tpl);
			
			assert.equal(frag.length, 2);
			assert.equal(frag.first.length, 1);
			assert.fragEqual(frag.first.raw, {name: 'i', attrs: {}});
			assert.fragEqual(frag.first.first.raw, {name: 'div', attrs: {class: 'bar'}});
			
			assert.equal(frag.last.length, 1);
			assert.fragEqual(frag.last.raw, {name: 'em', attrs: {}});
			assert.fragEqual(frag.last.first.raw, {multiline: false, value: 'wow'});
		}

		testMe('i{.bar}em|wow');
		testMe('i {.bar} em | wow');
		testMe('i { .bar } em | wow');
	});

	QUnit.test('// comment', function (assert) {
		function testMe(tpl) {
			var frag = xtplParser(tpl);
			
			assert.equal(frag.length, 1);
			assert.equal(frag.first.length, 0);
			assert.equal(frag.first.type, 'comment');
			assert.fragEqual(frag.first.raw, {value: 'foo'});
		}

		testMe('//foo');
		testMe('// foo');
	});

	QUnit.test('tag // comment', function (assert) {
		function testMe(tpl) {
			var frag = xtplParser(tpl);
			
			assert.equal(frag.length, 2);
			assert.equal(frag.first.type, 'tag');
			assert.equal(frag.last.type, 'comment');
			assert.fragEqual(frag.last.raw, {value: 'foo'});
		}

		testMe('div//foo');
		testMe('div // foo');
		testMe('.foo // foo');
		testMe('i.foo // foo');
	});

	QUnit.test('/* multi comment */', function (assert) {
		var frag = xtplParser('i/*foo\n\tbar*/.foo');
		
		assert.equal(frag.length, 3);
		assert.fragEqual(frag.nodes[0].raw, {name: 'i', attrs: {}});
		
		assert.equal(frag.nodes[1].type, 'comment');
		assert.fragEqual(frag.nodes[1].raw, {value: 'foo\n\tbar'});
		assert.fragEqual(frag.nodes[2].raw, {name: 'div', attrs: {class: 'foo'}});
	});

	QUnit.test('input[checked]', function (assert) {
		var frag = xtplParser('input[checked]');
		
		assert.equal(frag.length, 1);
		assert.fragEqual(frag.first.raw, {name: 'input', attrs: {checked: "true"}});
	});

	QUnit.test('input[checked=${state}]', function (assert) {
		var frag = xtplParser('input[checked=${state}]', {state: true});

		assert.equal(frag.length, 1);
		assert.deepEqual(frag.first.raw, {name: 'input', attrs: {checked: [[{type: 'expression', raw: 'state'}]]}});
	});

	QUnit.test('input[type="radio"][checked] / input[type="radio" checked]', function (assert) {
		function testMe(tpl) {
			var frag = xtplParser(tpl);
			
			assert.equal(frag.length, 1, tpl);
			assert.fragEqual(frag.first.raw, {name: 'input', attrs: {type: 'radio', checked: "true"}});
		}

		testMe('input[type="radio"][checked]');
		testMe('input[checked type="radio"]');
		testMe('input[type="radio" checked]');
		testMe('input[ type="radio" checked ]');
		testMe('input[\n  type="radio"\n  checked\n]');
		testMe('input[type="radio"\n\t\t\tchecked]');
		testMe('input[type="radio"\n\t\t\t\t\tchecked]');
	});

	QUnit.test('a[href=".."] | link', function (assert) {
		function testMe(tpl, mode) {
			var frag = xtplParser(tpl);
			
			assert.equal(frag.length, mode || 1, tpl);
			assert.fragEqual(frag.first.raw, {name: 'a', attrs: {href: '..'}});
			
			if (mode === 0) {
				assert.equal(frag.first.length, 0);
			} else if (mode === 2) {
				assert.equal(frag.first.length, 0);
				assert.fragEqual(frag.last.raw, {multiline: false, value: 'link'});
			} else {
				assert.equal(frag.first.length, 1);
				assert.fragEqual(frag.first.first.raw, {multiline: false, value: 'link'});
			}
		}

		testMe('a[href=".."]|link');
		testMe('a[href=".."] | link');
		testMe('a[href=".."]{| link\n}');
		testMe('a[href=".."]\n  | link');
		testMe('a[href=".."]', 0);
		testMe('a[href=".."]\n| link', 2);
	});

	QUnit.test('i[v="/"]', function (assert) {
		var frag = xtplParser('i[v="/"]');

		assert.equal(frag.length, 1);
		assert.fragEqual(frag.first.raw, {name: 'i', attrs: {v: '/'}});
	});

	QUnit.test('indent', function (assert) {
		function testMe(space) {
			var frag = xtplParser([
				'b',
				 space + 'i',
				 space + space + 'a',
				 'div',
				 space + 'u',
				 space + 'em',
				 space + space + '| ok'
			].join('\n'));

			assert.equal(frag.length, 2);
			assert.equal(frag.nodes[0].length, 1);
			assert.deepEqual(frag.nodes[0].raw, {name: 'b', attrs: {}});
			assert.deepEqual(frag.nodes[0].first.raw, {name: 'i', attrs: {}});
			
			assert.equal(frag.nodes[0].first.length, 1);
			assert.deepEqual(frag.nodes[0].first.first.raw, {name: 'a', attrs: {}});

			assert.equal(frag.nodes[1].length, 2);
			assert.deepEqual(frag.nodes[1].raw, {name: 'div', attrs: {}});
			assert.deepEqual(frag.nodes[1].first.raw, {name: 'u', attrs: {}});
			assert.deepEqual(frag.nodes[1].last.raw, {name: 'em', attrs: {}});
			assert.deepEqual(frag.nodes[1].last.first.raw, {multiline: false, value: 'ok'});
		}

		testMe('\t');
		testMe('  ');
	});

	QUnit.test('indent + levels', function (assert) {
		var frag = xtplParser([
			'i > em > b',
			'  div',
			'span'
		].join('\n'));

		assert.equal(frag.length, 2);
		assert.equal(frag.nodes[0].raw.name, 'i');
		assert.equal(frag.nodes[1].raw.name, 'span');

		assert.equal(frag.nodes[0].length, 1);
		assert.equal(frag.nodes[0].nodes[0].raw.name, 'em');
		
		assert.equal(frag.nodes[0].nodes[0].length, 1);
		assert.equal(frag.nodes[0].nodes[0].nodes[0].raw.name, 'b');

		assert.equal(frag.nodes[0].nodes[0].nodes[0].length, 1);
		assert.equal(frag.nodes[0].nodes[0].nodes[0].nodes[0].raw.name, 'div');
	});

	QUnit.test('indent + levels (with text)', function (assert) {
		var frag = xtplParser([
			'i',
			'  x > em | foo',
			'  y > em | bar',
		].join('\n'));

		assert.equal(frag.length, 1);
		assert.equal(frag.nodes[0].raw.name, 'i');

		assert.equal(frag.nodes[0].length, 2);
		assert.equal(frag.nodes[0].nodes[0].raw.name, 'x');
		assert.equal(frag.nodes[0].nodes[1].raw.name, 'y');
		
		assert.equal(frag.nodes[0].nodes[0].length, 1);
		assert.equal(frag.nodes[0].nodes[0].nodes[0].raw.name, 'em');
		assert.equal(frag.nodes[0].nodes[0].nodes[0].first.raw.value, 'foo');

		assert.equal(frag.nodes[0].nodes[1].length, 1);
		assert.equal(frag.nodes[0].nodes[1].nodes[0].raw.name, 'em');
		assert.equal(frag.nodes[0].nodes[1].nodes[0].first.raw.value, 'bar');
	});

	QUnit.test('indent + empty lines', function (assert) {
		var frag = xtplParser([
			'i',
			'	b',
			'',
			'		em',
			'',
			'		b'
		].join('\n'));

		assert.equal(frag.length, 1);
		assert.equal(frag.first.length, 1);
		assert.equal(frag.first.first.length, 2);
	});

	QUnit.test('indent + // comment', function (assert) {
		var frag = xtplParser('i\n  b\n    em\n//comment\n    | foo');

		assert.equal(frag.length, 1, 'root.length');
		assert.equal(frag.first.first.length, 3, 'b.length');
		assert.equal(frag.first.first.nodes[1].type, 'comment');
	});

	QUnit.test('indent + {}', function (assert) {
		var frag = xtplParser([
			'div',
			'  b { i + i }',
			'  u {',
			'    | foo',
			'  }',
			'  em',
			'span'
		].join('\n'));

		assert.equal(frag.length, 2);
		assert.deepEqual(frag.nodes[0].raw, {name: 'div', attrs: {}});
		
		assert.equal(frag.nodes[0].length, 3);
		assert.deepEqual(frag.nodes[0].nodes[0].raw, {name: 'b', attrs: {}});
		
		assert.equal(frag.nodes[0].nodes[0].length, 2);
		assert.deepEqual(frag.nodes[0].nodes[0].nodes[0].raw, {name: 'i', attrs: {}});
		assert.deepEqual(frag.nodes[0].nodes[0].nodes[1].raw, {name: 'i', attrs: {}});
		assert.deepEqual(frag.nodes[0].nodes[1].raw, {name: 'u', attrs: {}});
		
		assert.equal(frag.nodes[0].nodes[1].length, 1);
		assert.deepEqual(frag.nodes[0].nodes[1].nodes[0].raw, {multiline: false, value: 'foo'});
		assert.deepEqual(frag.nodes[0].nodes[2].raw, {name: 'em', attrs: {}});
		assert.deepEqual(frag.nodes[1].raw, {name: 'span', attrs: {}});
	});

	QUnit.test('form', function (assert) {
		var frag = xtplParser([
			'form {',
			'  // list',
			'  h1 | Todos',
			'  ul.list {',
			'  }',
			'}'
		].join('\n'));

		assert.equal(frag.length, 1);
		assert.equal(frag.first.length, 3);
		assert.fragEqual(frag.first.raw, {name: 'form', attrs: {}});
		assert.equal(frag.first.nodes[0].type, 'comment');
		
		assert.equal(frag.first.nodes[1].type, 'tag');
		assert.fragEqual(frag.first.nodes[1].raw, {name:'h1', attrs: {}});
		assert.fragEqual(frag.first.nodes[1].first.raw, {multiline: false, value: 'Todos'});
		
		assert.equal(frag.first.nodes[2].type, 'tag');
		assert.fragEqual(frag.first.nodes[2].raw, {name: 'ul', attrs: {class: 'list'}});
	});

	QUnit.test('if', function (assert) {
		function testMe(val, tpl, length) {
			var frag = xtplParser(tpl);

			assert.equal(frag.length, 1, tpl);
			assert.equal(frag.first.type, 'keyword');
			assert.equal(frag.first.length, length || 1);
			assert.fragEqual(frag.first.raw, {name: 'if', attrs: {test: val}});
			assert.fragEqual(frag.first.first.raw, {name: 'div', attrs: {class: 'foo'}});

			if (length == 2) {
				assert.fragEqual(frag.first.last.raw, {name: 'span', attrs: {class: 'bar'}});
			}
		}

		testMe('.5', 'if(.5){.foo}');
		testMe('.5', 'if(.5) > .foo');
		testMe('true', 'if (true) {.foo}');
		testMe('1.2', 'if (1.2)\n\t.foo\n\tspan.bar', 2);
		testMe('-8', 'if ( -8 ) {.foo}');
		testMe('foo.bar', 'if(foo.bar){.foo}');
		testMe('foo.bar', 'if(foo.bar) { .foo }');
		testMe('foo.bar', 'if(foo.bar){div.foo}');
		testMe('foo.bar', 'if (foo.bar) { div.foo }');
	});

	QUnit.test('if else', function (assert) {
		function testMe(tpl, elseIf) {
			var frag = xtplParser(tpl);

			assert.equal(frag.length, 2 + !!elseIf, tpl);

			assert.equal(frag.first.type, 'keyword');
			assert.equal(frag.first.length, 1);
			assert.fragEqual(frag.first.raw, {name: 'if', attrs: {test: '1'}});
			assert.fragEqual(frag.first.first.raw, {name: 'div', attrs: {class: 'foo'}});

			if (elseIf) {
				assert.equal(frag.nodes[1].type, 'keyword');
				assert.equal(frag.nodes[1].length, 1);
				assert.fragEqual(frag.nodes[1].raw, {name: 'else', attrs: {test: '-1'}});
				assert.fragEqual(frag.nodes[1].first.raw, {name: 'i', attrs: {class: 'baz'}});
			}
			
			assert.equal(frag.last.type, 'keyword');
			assert.equal(frag.last.length, 1);
			assert.fragEqual(frag.last.raw, {name: 'else', attrs: {}});
			assert.fragEqual(frag.last.first.raw, {name: 'b', attrs: {class: 'bar'}});
		}

		testMe('if(1){.foo}else{b.bar}');
		testMe('if(1)\n\t.foo\nelse\n\tb.bar');
		testMe('if(1) > .foo\nelse > b.bar');
		testMe('if(1)  \n\t.foo\nelse  \n\tb.bar');
		testMe('if(1){.foo}else if(-1){i.baz}else{b.bar}', true);
		testMe('if(1) { .foo } else if (-1) { i.baz } else { b.bar }', true);
	});

	QUnit.test('else / errors', function (assert) {
		function testMe(tpl) {
			try {
				xtplParser(tpl);
				assert.ok(false, 'Error?');
			} catch (err) {
				assert.equal(err.message, 'Unexpected token else');
			}
		}

		testMe('else{}');
		testMe('if(1){}else{}else{}');
	});

	QUnit.test('for (val in data)', function (assert) {
		function testMe(tpl, trackBy) {
			var frag = xtplParser(tpl);
			var forAttrs = {as: 'val', data: 'foo.bar'};

			trackBy && (forAttrs.id = 'id');

			assert.equal(frag.length, 1, tpl);
			assert.equal(frag.first.type, 'keyword');
			assert.equal(frag.first.length, 1);
			assert.fragEqual(frag.first.raw, {name: 'for', attrs: forAttrs});
			assert.fragEqual(frag.first.first.raw, {name: 'div', attrs: {class: 'foo'}});
		}

		testMe('for(val in foo.bar){.foo}');
		testMe('for (val in foo.bar) {.foo}');
		testMe('for ( val in foo.bar ) {.foo}');
		testMe('for ( val in foo.bar ) track by id {.foo}', true);
		testMe('for ( val in foo.bar )\n  .foo');
		testMe('for ( val in foo.bar ) track by id\n  .foo', true);
	});

	QUnit.test('for ([idx, val] in data)', function (assert) {
		function testMe(tpl, trackBy) {
			var frag = xtplParser(tpl);
			var forAttrs = {as: 'val', key: 'idx', data: '[1,2]'};

			trackBy && (forAttrs.id = 'id');

			assert.equal(frag.length, 1, tpl);
			assert.equal(frag.first.type, 'keyword');
			assert.equal(frag.first.length, 1);
			assert.fragEqual(frag.first.raw, {name: 'for', attrs: forAttrs});
			assert.fragEqual(frag.first.first.raw, {name: 'div', attrs: {class: 'foo'}});
		}

		testMe('for([idx, val] in [1,2]){.foo}');
		testMe('for ( [ idx , val ] in [1,2] ) { .foo }');
		testMe('for ( [ idx , val ] in [1,2] ) track by id { .foo }', true);
		testMe('for ( [ idx , val ] in [1,2] )\n  .foo');
		testMe('for ( [ idx , val ] in [1,2] ) track by id\n  .foo', true);
	});

	QUnit.test('foo = [..]/{..}/(..)', function (assert) {
		function testMe(tpl, type, attrs) {
			var frag = xtplParser(tpl);
			
			assert.equal(frag.length, 1, type + ': ' + tpl);
			assert.equal(frag.first.type, 'define');
			assert.equal(frag.first.raw.name, 'foo');
			assert.equal(frag.first.raw.type, type);
			assert.deepEqual(frag.first.raw.attrs, attrs);
		}

		var types = {
			'brace': '{}',
			'bracket': '[]',
			'parenthesis': '()'
		};

		Object.keys(types).forEach(function (type) {
			var tmp = types[type].split('');
			var o = tmp[0];
			var c = tmp[1];

			testMe('foo=' + o + c, type, []);
			testMe('foo = ' + o + ' ' + c, type, []);
			testMe('foo = ' + o + 'bar' + c, type, ['bar']);
			testMe('foo = ' + o + ' bar ' + c, type, ['bar']);
			testMe('foo = ' + o + ' bar , qux ' + c, type, ['bar', 'qux']);
		});
	});

	QUnit.test('foo = (..) + text', function (assert) {
		var frag = xtplParser('foo = []\n  | ok\nfoo');
		
		assert.equal(frag.length, 2);
		assert.equal(frag.first.type, 'define');
		assert.deepEqual(frag.last.raw, {name: 'foo', attrs: {}});
		
		assert.equal(frag.first.length, 1);
		assert.equal(frag.first.first.type, 'text');
	});

	QUnit.test('foo(..)', function (assert) {
		function testMe(tpl, args) {
			var frag = xtplParser(tpl);
			
			assert.equal(frag.length, 1, tpl);
			assert.equal(frag.first.type, 'call');
			assert.equal(frag.first.raw.name, 'foo');
			assert.deepEqual(frag.first.raw.args, args);
		}

		testMe('foo()', []);
		testMe('foo(a,b)', ['a', 'b']);
		testMe('foo(a, b)', ['a', 'b']);
		testMe('foo( a , b )', ['a', 'b']);
		testMe('foo( a , b, c, d )', ['a', 'b', 'c', 'd']);
		testMe('foo(Date.now())', ['Date.now()']);
		testMe('foo(12.toString(36))', ['12.toString(36)']);
		testMe('foo(factory(null, now()), name)', ['factory(null, now())', 'name']);
	});

	QUnit.test('super.method()', function (assert) {
		var frag = xtplParser('super.method(a, b)');
		
		assert.equal(frag.length, 1);
		assert.equal(frag.first.type, 'call');
		assert.deepEqual(frag.first.raw, {
			name: 'super.method',
			args: ['a', 'b'],
			attrs: {}
		});
	});

	QUnit.test('h1 > method() + .foo', function (assert) {
		var frag = xtplParser('h1 > method() + .foo');
		
		assert.equal(frag.length, 1);
		assert.equal(frag.first.length, 2);
		assert.equal(frag.first.first.type, 'call');
		assert.equal(frag.first.last.type, 'tag');
	});

	QUnit.test('Nesting > comment + tag', function (assert) {
		var frag = xtplParser('a > b\n  //foo\n  i');

		assert.equal(frag.length, 1, 'root.length');
		assert.equal(frag.first.length, 1, 'a.length');
		assert.equal(frag.first.first.length, 2, 'b.length');
		assert.equal(frag.first.first.first.length, 0, 'comment.length');
		assert.equal(frag.first.first.first.type, 'comment');
		assert.equal(frag.first.first.last.raw.name, 'i');
	});

	QUnit.test('class.foo', function (assert) {
		function testMe(tpl, classes) {
			var frag = xtplParser(tpl);
			
			assert.equal(frag.length, 1, tpl);
			assert.equal(frag.first.length, 0);
			assert.deepEqual(frag.first.raw, {name: 'div', attrs: {class: classes}});
		}

		testMe('div\n  class.foo: attrs.yes', [[{
			type: 'group',
			test: 'attrs.yes',
			raw: ['foo']
		}]]);
		
		testMe('.foo\n  class.bar: attrs.yes', [['foo'], [{
			type: 'group',
			test: 'attrs.yes',
			raw: ['bar']
		}]]);

		testMe('.foo\n  class.${name}: attrs.yes', [['foo'], [{
			type: 'group',
			test: 'attrs.yes',
			raw: [{type: 'expression', raw: 'name'}]
		}]]);

		testMe('.foo\n  class.x-${name}: attrs.yes', [['foo'], [{
			type: 'group',
			test: 'attrs.yes',
			raw: ['x-', {type: 'expression', raw: 'name'}]
		}]]);
	});

	QUnit.test('Whitespaces around tag', function (assert) {
		function testMe(tpl, before, after, attrs) {
			var frag = xtplParser(tpl);
			var raw = {
				name: 'a',
				attrs: attrs || {}
			};

			before && (raw.wsBefore = before);
			after && (raw.wsAfter = after);
			
			assert.equal(frag.length, 1, tpl);
			assert.equal(frag.first.length, 0);
			assert.deepEqual(frag.first.raw, raw);
		}

		testMe('a[<]', true)
		testMe('a[>]', false, true);
		testMe('a[<>]', true, true);
		testMe('a[><]', true, true);
		testMe('a[>][href=".."]', false, true, {href: [['..']]});
		testMe('a[href=".."][>]', false, true, {href: [['..']]});
		testMe('a[href=".."][>][alt="!"]', false, true, {href: [['..']], alt: [['!']]});
		testMe('a[href=".."][<>][alt="!"]', true, true, {href: [['..']], alt: [['!']]});
	});

	QUnit.test('Multiline text', function (assert) {
		function testMe(tpl, withoutParent, interpolate) {
			var frag = xtplParser(tpl);
			var text;
			
			assert.ok(true, tpl);

			if (withoutParent) {
				text = frag.first;
			} else {
				assert.equal(frag.length, 1);
				assert.equal(frag.first.length, 1);
				text = frag.first.first;
			}

			assert.equal(text.type, 'text');

			if (interpolate) {
				assert.deepEqual(text.raw, {
					multiline: true,
					value: [
						' Foo\n',
						{type: 'expression', raw: 'Bar'},
						'\n\t\tBaz '
					]
				});
			} else {
				assert.deepEqual(text.raw, {
					multiline: true,
					value: ' Foo\nBar\n\t\tBaz '
				});
			}
		}

		testMe('|> Foo\nBar\n\t\tBaz <|', true);
		testMe('p |> Foo\nBar\n\t\tBaz <|');
		testMe('p\n\t|> Foo\nBar\n\t\tBaz <|');
		testMe('p{|> Foo\nBar\n\t\tBaz <|}');
		testMe('p |> Foo\n${Bar}\n\t\tBaz <|', false, true);
	});

	QUnit.test('HTML fragment', function (assert) {
		function testMe(tpl) {
			var frag = xtplParser(tpl);
			
			assert.equal(frag.length, 3, tpl);
			assert.deepEqual(frag.nodes[0].raw, {value: 'foo '});
			assert.deepEqual(frag.nodes[1].raw, {name: 'a', attrs: {
				href: [['..']],
				class: [['foo'], ['bar']]
			}});
			assert.deepEqual(frag.nodes[2].raw, {value: ' qux'});
		}

		testMe('#|foo <a href=".." class="foo bar">bar</a> qux|#');
	});

	QUnit.test('elem = [] + slot without default content', function (assert) {
		var frag = xtplParser([
			'elem = []',
			'  p > content()',
			'elem'
		].join('\n'));
		
		assert.equal(frag.length, 2);
		assert.equal(frag.first.length, 1);
		assert.equal(frag.first.first.length, 1);
		assert.equal(frag.last.length, 0);
	});

	QUnit.test('valid attribute', function (assert) {
		var frag = xtplParser('div[@foo.bar-Baz="qux"]');
		assert.deepEqual(frag.first.raw.attrs, {"@foo.bar-Baz": [["qux"]]});
	});
});
