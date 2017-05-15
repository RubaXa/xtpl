define([
	'qunit',
	'xtpl',
	'xtpl/mode/live',
	'xtpl/src/stddom',
	'xtpl/src/animator',
	'xtpl/src/components',
	'./componentsServiceMock',
	'../qunit.assert.codeEqual'
], function (
	QUnit,
	xtplModule,
	liveModeModule,
	stddom,
	Animator,
	components,
	componentsServiceMock
) {
	'use strict';

	const xtpl = xtplModule.default;
	const liveMode = liveModeModule.default;
	let cmpMock;

	cmpMock = componentsServiceMock(createFromString, components);

	stddom.setAnimator(Animator.default);

	function createFromString(input, attrs, debug) {
		var templateFactory = xtpl.fromString(input, {
			mode: liveMode(),
			scope: Object.keys(attrs || {}),
		});
		debug && console.log(templateFactory.toString());
		return templateFactory(stddom, cmpMock);
	}

	function fromString(input, attrs, debug) {
		var template = createFromString(input, attrs, debug);
		var view = template(attrs).mountTo(document.createElement('div'));

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
		const cases = [
			{input: [1, 2, 3, 4, 5], result: '12345'},
			{input: [3, 4, 1, 2, 5], result: '34125'},
			{input: [4, 1, 0, 2, 5], result: '41025', added: ['0']},
			{input: [5, 1, 2, 3], result: '5123'},
			{input: [3, 2, 1, 5], result: '3215'},
			{input: [0], result: '0', added: ['0']},
			{input: [1, 2, 3, 0], result: '1230', added: ['0', '1', '2', '3']},
		];

		cases.forEach(function (spec) {
			spec.input = spec.input.map(function (id) {
				return {id: id};
			});
		});

		var view = fromString('for (item in data) track by id\n  | ${item.id}', {data: cases[0].input});
		var cache = {};

		[].forEach.call(view.container.childNodes, function (el) {
			cache[el.textContent] = el;
		});

		assert.equal(view.container.innerHTML, cases[0].result, 'initial');

		cases.slice(1).forEach(function (spec) {
			view.update({data: spec.input});

			assert.equal(view.container.innerHTML, spec.result, spec.result);

			[].forEach.call(view.container.childNodes, function (el) {
				if (cache[el.textContent] !== el) {
					if (!spec.added || spec.added.indexOf(el.textContent) === -1) {
						assert.ok(false, 'no cached: ' + el.textContent + ' in ' + spec.result);
					}
				}
			});
		});
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
		var view = fromString('Icon = [name]\n  i.icon-${name}\nIcon[name=${x}]', {x: 'foo'});

		window.sandbox.appendChild(view.container);
		assert.equal(view.container.innerHTML, '<i class="icon-foo"></i>');

		view.update({x: 'bar'});
		assert.equal(view.container.innerHTML, '<i class="icon-bar"></i>');
	});

	QUnit.test('Icon / Custom Element / If', function (assert) {
		var view = fromString('XIf = [expr]\n  if (expr)\n    b\nXIf[expr=${val}]', {val: false});

		window.sandbox.appendChild(view.container);
		assert.equal(view.container.innerHTML, '');

		view.update({val: true});
		assert.equal(view.container.innerHTML, '<b></b>');

		view.update({val: false});
		assert.equal(view.container.innerHTML, '');
	});

	QUnit.test('Import / Btn / Failed', function (assert) {
		var done = assert.async();
		var view = fromString('import Btn from "failed/btn"\nBtn[value="Wow!"]', {val: false});

		window.sandbox.appendChild(view.container);
		assert.equal(view.container.innerHTML, '<div class=\"component-dummy component-dummy-loading\" data-component=\"Btn\"></div>');

		setTimeout(function () {
			assert.equal(view.container.innerHTML, '<div class=\"component-dummy component-dummy-failed\" data-component=\"Btn\" data-component-status-text=\"failed/btn\"></div>');
			done();
		}, 10);
	});

	QUnit.test('Import / Btn', function (assert) {
		var done = assert.async();
		var view = fromString('import Btn from "./btn"\nBtn[value=${val}]', {val: 'Wow'});

		window.sandbox.appendChild(view.container);
		assert.equal(view.container.innerHTML, '<div class=\"component-dummy component-dummy-loading\" data-component=\"Btn\"></div>');

		setTimeout(function () {
			assert.equal(view.container.innerHTML, '<button>Wow</button>');

			view.update({val: 'Wow!1'});
			assert.equal(view.container.innerHTML, '<button>Wow!1</button>');
			done();
		}, 10);
	});

	QUnit.test('Import / Toggle', function (assert) {
		var done = assert.async();
		var log = [];
		var view = fromString('import Toggle from "./toggle"\nif (show)\n    Toggle[text=${value} log=${log}]', {
			show: true,
			log: log,
			value: 'Click me!',
		}, true);

		window.sandbox.appendChild(view.container);
		assert.equal(log + '', '', 'initial');

		setTimeout(function () {
			assert.equal(view.container.innerHTML, '<div class="toggle">Click me!</div>', 'ready');
			assert.equal(log + '', 'didMount');

			view.update({show: false, log: log});
			assert.equal(view.container.innerHTML, '', 'removed');
			assert.equal(log + '', 'didMount,didUnmount');

			view.update({show: true, value: 'Bingo!', log: log});
			assert.equal(view.container.innerHTML, '<div class="toggle">Bingo!</div>', 'updated');
			assert.equal(log + '', 'didMount,didUnmount,didMount');

			done();
		}, 10);
	});

	QUnit.test('Import / Foreach', function (assert) {
		var done = assert.async();
		var log = [];
		var view = fromString('import Item from "./item"\nfor (item in items) track by id\n  Item[text=${item.id} log=${log}]', {
			log: log,
			items: [{id: 'foo'}, {id: 'bar'}, {id: 'baz'}],
		}, true);

		window.sandbox.appendChild(view.container);

		setTimeout(function () {
			assert.equal(view.container.innerHTML, 'foobarbaz', 'ready');
			assert.equal(log + '', 'foo1.didMount,bar2.didMount,baz3.didMount');

			log.length = 0;
			view.update({
				log: log,
				items: [{id: 'bar'}, {id: 'baz'}, {id: 'qux'}],
			});

			assert.equal(view.container.innerHTML, 'barbazqux', 'update');
			assert.equal(log + '', 'qux4.didMount,foo1.didUnmount');

			log.length = 0;
			view.update({
				log: log,
				items: [{id: 'foo'}, {id: 'baz'}, {id: 'qux'}],
			});

			assert.equal(view.container.innerHTML, 'foobazqux', 'update + revert');
			assert.equal(log + '', 'foo1.didMount,bar2.didUnmount');

			done();
		}, 10);
	});

	QUnit.test('Import / Element with classNames', function (assert) {
		var done = assert.async();
		var view = fromString('import Element from "./element"\nElement.foo.${x}', {x: ''}, true);

		window.sandbox.appendChild(view.container);

		setTimeout(function () {
			assert.equal(view.container.innerHTML, '<div class="foo "></div>', 'ready');

			view.update({x: 'bar'});
			assert.equal(view.container.innerHTML, '<div class="foo bar"></div>', 'update');

			done();
		}, 10);
	});
});
