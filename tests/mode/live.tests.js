define([
	'qunit',
	'xtpl',
	'xtpl/mode/live',
	'xtpl/src/stddom',
	'xtpl/src/animator',
	'../qunit.assert.codeEqual'
], function (
	QUnit,
	xtplModule,
	liveModeModule,
	stddom,
	Animator
) {
	'use strict';

	const xtpl = xtplModule.default;
	const liveMode = liveModeModule.default;

	stddom.setAnimator(Animator.default);

	function fromString(input, attrs, debug) {
		var templateFactory = xtpl.fromString(input, {
			mode: liveMode(),
			scope: Object.keys(attrs || {}),
		})
		var template = templateFactory(stddom);

		debug && console.log(templateFactory.toString());

		var view = template(attrs).mountTo(document.createElement('div'))

		view.template = template;
		return view;
	}

	QUnit.module('xtpl / mode / live');

	QUnit.test('статичная текстовая нода', function (assert) {
		var view = fromString('|foo');
		assert.equal(view.container.textContent, 'foo');
	});

	QUnit.test('динамическая текстовая нода', function (assert) {
		var view = fromString('|Hi, ${x}!', {'x': 'foo'});

		assert.equal(view.container.childNodes.length, 3);
		assert.equal(view.container.textContent, 'Hi, foo!');

		view.update({x: 'bar'});
		assert.equal(view.container.textContent, 'Hi, bar!', 'updated');
	});

	QUnit.test('тег + текст', function (assert) {
		var view = fromString('h1 | ${x}', {x: 'foo'});

		assert.equal(view.container.firstChild.tagName, 'H1');
		assert.equal(view.container.textContent, 'foo');

		view.update({x: 'bar'});
		assert.equal(view.container.textContent, 'bar', 'updated');
	});

	QUnit.test('атрибуты', function (assert) {
		var view = fromString('.is-${x}', {x: 'foo'});

		assert.equal(view.container.innerHTML, '<div class="is-foo"></div>');

		view.update({x: 'bar'});
		assert.equal(view.container.innerHTML, '<div class="is-bar"></div>');
	});

	QUnit.test('if + текст', function (assert) {
		var view = fromString('if (x)\n  | ${x}', {x: false});

		assert.equal(view.container.textContent, '');
		assert.equal(view.container.childNodes.length, 1);

		view.update({x: 'bar'});
		assert.equal(view.container.textContent, 'bar', 'added');
		assert.equal(view.container.childNodes.length, 2);

		view.update({x: 'baz'});
		assert.equal(view.container.textContent, 'baz', 'updated');

		view.update({x: false});
		assert.equal(view.container.textContent, '', 'removed');
		assert.equal(view.container.childNodes.length, 1);
	});

	QUnit.test('if + if + if + текст', function (assert) {
		function factory(a, b, c) {
			var view = fromString('if (a)\n  if (b)\n    if (c)\n      | ${txt}', {
				a: a,
				b: b,
				c: c,
				txt: 'foo'
			});

			assert.deepEqual(view.container.textContent, a && b && c ? 'foo' : '');
			assert.deepEqual(view.container.childNodes.length, 1 + a + (a && b) + (a && b && c));

			return view;
		}

		var view = factory(0, 0, 0);

		view.update({a: 1, b: 1, c: 1, txt: 'foo'});
		assert.equal(view.container.textContent, 'foo');

		view.update({a: 1, b: 0, c: 1, txt: 'foo'});
		assert.equal(view.container.textContent, '');

		view.update({a: 1, b: 1, c: 1, txt: 'bar'});
		assert.equal(view.container.textContent, 'bar');

		view.update({a: 0, b: 1, c: 1, txt: 'bar'});
		assert.equal(view.container.textContent, '');

		view.update({a: 1, b: 1, c: 1, txt: 'baz'});
		assert.equal(view.container.textContent, 'baz');
	});

	QUnit.test('if + else + текст', function (assert) {
		var view = fromString('if (txt)\n  | ${txt}\nelse\n  | none', {txt: null});

		assert.equal(view.container.textContent, 'none');

		view.update({txt: 'foo'});
		assert.equal(view.container.textContent, 'foo');

		view.update({txt: false});
		assert.equal(view.container.textContent, 'none');
	});

	QUnit.test('for + текст', function (assert) {
		var view = fromString('for (txt in data)\n  | ${txt}', {data: [1]});

		assert.deepEqual(view.container.textContent, '1');

		view.update({data: [1, 2, 3]});
		assert.equal(view.container.textContent, '123');

		view.update({data: [1, 2]});
		assert.equal(view.container.textContent, '12');

		view.update({data: [2]});
		assert.equal(view.container.textContent, '2');

		view.update({data: ['ok']});
		assert.equal(view.container.textContent, 'ok');
	});

	QUnit.test('for + текст track by id', function (assert) {
		var view = fromString('for (item in data) track by id\n  | ${item.txt}', {data: [{id: 1, txt: 'foo'}]});
		var item_1 = view.container.firstChild;

		assert.equal(view.container.textContent, 'foo', 'initial');

		view.update({data: [{id: 1, txt: 'foo'}, {id: 2, txt: 'bar'}]});
		var item_2 = view.container.childNodes[1];

		assert.equal(view.container.textContent, 'foobar', 'added "bar"');
		assert.ok(view.container.firstChild === item_1, '0 -> foo');

		view.update({data: [{id: 2, txt: 'bar'}, {id: 1, txt: 'foo'}]});

		assert.equal(view.container.textContent, 'barfoo', 'reverse');
		assert.ok(view.container.childNodes[0] === item_2, '0 -> bar');
		assert.ok(view.container.childNodes[1] === item_1, '1 -> foo');

		view.update({data: [{id: 3, txt: 'baz'}, {id: 2, txt: 'bar'}, {id: 1, txt: 'foo'}]});

		var item_3 = view.container.childNodes[0];
		assert.equal(view.container.textContent, 'bazbarfoo', 'added "baz"');
		assert.ok(view.container.childNodes[1] === item_2, '1 -> bar');
		assert.ok(view.container.childNodes[2] === item_1, '2 -> foo');

		view.update({data: [{id: 1, txt: 'foo'}]});

		assert.equal(view.container.textContent, 'foo', 'removed bar, baz');
		assert.ok(view.container.childNodes[0] === item_1);

		view.update({data: [{id: 7, txt: 'zzz'}]});

		assert.equal(view.container.textContent, 'zzz', 'added zzz');
		assert.ok(view.container.childNodes[0] === item_3);
	});

	QUnit.test('ссылка + текст', function (assert) {
		var view = fromString('a.foo[href="${url}"][data-id="1"] | bar', {url: '#'});

		assert.equal(view.container.innerHTML, '<a class=\"foo\" href=\"#\" data-id=\"1\">bar</a>');

		view.update({url: '#baz'});
		assert.equal(view.container.innerHTML, '<a class=\"foo\" href=\"#baz\" data-id=\"1\">bar</a>');
	});
	
	QUnit.test('динамический тег', function (assert) {
		var view = fromString('${name} | ${text}', {name: 'a', text: 'foo'});
		var a = view.container.firstChild;
		var txt = view.container.firstChild.firstChild;

		assert.equal(view.container.innerHTML, '<a>foo</a>');

		view.update({name: 'b', text: 'foo'});
		assert.equal(view.container.innerHTML, '<b>foo</b>');
		assert.ok(view.container.firstChild.firstChild === txt);

		view.update({name: 's', text: 'bar'});
		assert.equal(view.container.innerHTML, '<s>bar</s>');
		assert.ok(view.container.firstChild.firstChild === txt);

		view.update({name: 'a', text: 'bar'});
		assert.equal(view.container.innerHTML, '<a>bar</a>');
		assert.ok(view.container.firstChild === a);
	});

	QUnit.test('динамический тег + атрибуты', function (assert) {
		var view = fromString('${name}.is-${state}[data-id="123"]', {name: 'i', state: 'foo'});

		assert.equal(view.container.innerHTML, '<i class="is-foo" data-id="123"></i>');

		view.update({name: 'b', state: 'bar'});
		assert.equal(view.container.innerHTML, '<b class="is-bar" data-id="123"></b>');

		view.update({name: 'i', state: 'bar'});
		assert.equal(view.container.innerHTML, '<i class="is-bar" data-id="123"></i>');
	});

	QUnit.test('todos', function (assert) {
		var view = fromString(`
ul > for (todo in todos)
  li
    if (todo.completed)
      a | \${todo.title}
    else
      b | \${todo.title}
`.trim(), {todos: []});

		assert.equal(view.container.innerHTML, '<ul></ul>');

		view.update({todos: [{title: 'foo', completed: false}]});
		assert.equal(view.container.innerHTML, '<ul><li><b>foo</b></li></ul>');

		view.update({todos: [{title: 'bar', completed: true}]});
		assert.equal(view.container.innerHTML, '<ul><li><a>bar</a></li></ul>');

		view.update({todos: [{title: 'bar', completed: true}, {title: 'foo', completed: false}]});
		assert.equal(view.container.innerHTML, '<ul><li><a>bar</a></li><li><b>foo</b></li></ul>');
	});

	QUnit.test('anim: append', function (assert) {
		var done = assert.async();
		var view = fromString('anim("fade") > .foo | append:far');

		window.sandbox.appendChild(view.container);
		assert.equal(view.container.firstChild.style.opacity, 0);

		setTimeout(() => {
			assert.equal(view.container.firstChild.style.opacity, 1);
			done();
		}, 10);
	});

	QUnit.test('anim: if', function (assert) {
		var done = assert.async();
		var view = fromString('anim("fade") > if (x) > .foo | bar', {x: false});

		window.sandbox.appendChild(view.container);
		assert.equal(view.container.innerHTML, '');


		setTimeout(() => {
			view.update({x: true});
			assert.equal(view.container.firstChild.style.opacity, 1);
			done();
		}, 1);
	});

	QUnit.test('Icon / Custom Element', function (assert) {
		var view = fromString('Icon = [name]\n  i.icon-${name}\nIcon[name=${x}]', {x: 'foo'}, true);

		window.sandbox.appendChild(view.container);
		assert.equal(view.container.innerHTML, '<i class="icon-foo"></i>');

		view.update({x: 'bar'});
		assert.equal(view.container.innerHTML, '<i class="icon-bar"></i>');
	});
});
