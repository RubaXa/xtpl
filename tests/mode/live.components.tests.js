define([
	'qunit',
	'../fromString',
	'../simulateEvent',
], function (
	QUnit,
	fromString,
	simulateEvent
) {
	'use strict';

	QUnit.module('xtpl / Block');

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
			assert.equal(log + '', 'connectedCallback');

			view.update({show: false, log: log});
			assert.equal(view.container.innerHTML, '', 'removed');
			assert.equal(log + '', 'connectedCallback,disconnectedCallback');

			view.update({show: true, value: 'Bingo!', log: log});
			assert.equal(view.container.innerHTML, '<div class="toggle">Bingo!</div>', 'updated');
			assert.equal(log + '', 'connectedCallback,disconnectedCallback,connectedCallback');

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
			assert.equal(log + '', 'foo1.connectedCallback,bar2.connectedCallback,baz3.connectedCallback');

			log.length = 0;
			view.update({
				log: log,
				items: [{id: 'bar'}, {id: 'baz'}, {id: 'qux'}],
			});

			assert.equal(view.container.innerHTML, 'barbazqux', 'update');
			assert.equal(log + '', 'qux4.connectedCallback,foo1.disconnectedCallback');

			log.length = 0;
			view.update({
				log: log,
				items: [{id: 'foo'}, {id: 'baz'}, {id: 'qux'}],
			});

			assert.equal(view.container.innerHTML, 'foobazqux', 'update + revert');
			assert.equal(log + '', 'foo1.connectedCallback,bar2.disconnectedCallback');

			done();
		}, 10);
	});

	QUnit.test('Import / Nesting', function (assert) {
		var log = [];
		var done = assert.async();
		var view = fromString('import Nesting from "./nesting"\nif (x)\n\tNesting[log={log}]', {x: true, log}, true);

		window.sandbox.appendChild(view.container);

		setTimeout(function () {
			assert.equal(view.container.innerHTML, '<div class=\"nesting\"><div class=\"toggle\"></div></div>');
			assert.equal(log + '', 'root.connectedCallback,connectedCallback', 'connected');

			log.length = 0;
			view.update({x: false, log});

			assert.equal(log + '', 'disconnectedCallback,root.disconnectedCallback', 'disconnected');

			log.length = 0;
			view.update({x: true, log});

			assert.equal(log + '', 'connectedCallback,root.connectedCallback', 'connected again');

			log.length = 0;
			view.update({x: false, log});

			assert.equal(log + '', 'disconnectedCallback,root.disconnectedCallback', 'disconnected again');

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

	QUnit.test('Event / Btn / @click', function (assert) {
		var log = [];
		var done = assert.async();
		var view = fromString('import Btn from "./btn"\nBtn[@click]', {
			'@click': function (evt) {
				log.push(evt.type + ':' + evt.originalEvent.type + ':' + evt.originalEvent.target + ':' + JSON.stringify(evt.detail));
			}
		});

		window.sandbox.appendChild(view.container);

		setTimeout(function () {
			simulateEvent(view.container.firstChild, 'click');
			assert.equal(log + '', 'click:click:[object HTMLButtonElement]:null');
			done();
		}, 10);
	});

	QUnit.test('Event / Btn / @click="tap"', function (assert) {
		var log = [];
		var done = assert.async();
		var view = fromString('import Btn from "./btn"\nBtn[@click="tap"]', {
			'@tap': function (evt) {
				log.push(evt.type + ':' + evt.originalEvent.type + ':' + evt.originalEvent.target + ':' + JSON.stringify(evt.detail));
			}
		}, true);

		window.sandbox.appendChild(view.container);

		setTimeout(function () {
			simulateEvent(view.container.firstChild, 'click');
			assert.equal(log + '', 'tap:click:[object HTMLButtonElement]:null');
			done();
		}, 10);
	});

	QUnit.test('Event / Btn / @click="tap ${value}"', function (assert) {
		var log = [];
		var done = assert.async();
		var view = fromString('import Btn from "./btn"\nBtn[@click="tap ${value}"]', {
			value: 'foo',
			'@tap': function (evt) {
				log.push(evt.type + ':' + evt.originalEvent.type + ':' + evt.originalEvent.target + ':' + JSON.stringify(evt.detail));
			}
		});

		window.sandbox.appendChild(view.container);

		setTimeout(function () {
			simulateEvent(view.container.firstChild, 'click');
			assert.equal(log[0], 'tap:click:[object HTMLButtonElement]:{"value":"foo"}');

			view.update({value: 'bar'});
			simulateEvent(view.container.firstChild, 'click');

			assert.equal(log.length, 2);
			assert.equal(log[1], 'tap:click:[object HTMLButtonElement]:{"value":"bar"}');

			done();
		}, 10);
	});

	QUnit.test('Event / Dropdown / @visibility', function (assert) {
		var log = [];
		var done = assert.async();
		var view = fromString('import Dropdown from "./dropdown"\nDropdown[@visibility="visibility ${x}"]', {
			x: 'foo',
			'@visibility': function (evt) {
				log.push(evt.type + ':' + JSON.stringify(evt.detail) + ':' + evt.originalEvent.target);
			}
		}, true);

		window.sandbox.appendChild(view.container);

		setTimeout(function () {
			simulateEvent(view.container.firstChild.firstChild, 'click');
			assert.equal(log[0], 'visibility:{"state":true,"x":"foo"}:[object HTMLDivElement]');

			view.update({x: 'bar'});
			simulateEvent(view.container.firstChild.firstChild.firstChild, 'click');

			assert.equal(log.length, 2);
			assert.equal(log[1], 'visibility:{"state":false,"x":"bar"}:[object HTMLButtonElement]');

			done();
		}, 10);
	});

	QUnit.test('Event / Todos / @toggle + @remove', function (assert) {
		var log = [];
		var done = assert.async();
		var items = [{id: 1, done: false}, {id: 2, done: true}];
		var view = fromString('import Todos from "./todos"\nTodos[@remove @toggle items={items}]', {
			items,
			'@toggle'(evt) {
				const {todo} = evt.detail;

				log.push(evt.type + ':' + todo.id);
				todo.done = !todo.done;
				view.update({items: items.slice(0)});
			},
			'@remove'(evt) {
				const {todo} = evt.detail;

				log.push(evt.type + ':' + todo.id);
				items.splice(items.indexOf(todo), 1);
				view.update({items: items.slice(0)});
			}
		}, true);

		window.sandbox.appendChild(view.container);

		setTimeout(function () {
			assert.equal(view.container.innerHTML, '<div class=\"todos\"><div class=\"todo\"><b></b><em></em><span>1: false</span></div><div class=\"todo\"><b></b><em></em><span>2: true</span></div></div>');

			simulateEvent(view.container.querySelectorAll('b')[0], 'click');

			assert.equal(log[0], 'toggle:1');
			assert.equal(view.container.querySelectorAll('.todo span')[0].textContent, '1: true');

			simulateEvent(view.container.querySelectorAll('.todo em')[1], 'click');
			assert.equal(log[1], 'remove:2');
			assert.equal(view.container.querySelectorAll('.todo').length, 1);

			items.unshift({id: 3, done: false});
			view.update({items: items.slice(0)});

			assert.equal(view.container.querySelectorAll('.todo').length, 2);
			assert.equal(view.container.querySelectorAll('.todo span')[0].textContent, '3: false');

			simulateEvent(view.container.querySelectorAll('.todo em')[0], 'click');
			assert.equal(log[2], 'remove:3');
			assert.equal(view.container.querySelectorAll('.todo').length, 1);

			done();
		}, 10);
	});
});
