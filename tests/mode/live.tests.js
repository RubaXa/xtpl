function noop() {
}

function prop(name, value, el) {
	el[name] = value;
	return el;
}

function appendChild(child) {
	this[this.length++] = child;
}

function toDocumentFragment() {
	if (this.length === 1) {
		return this[0];
	} else {
		const frag = document.createDocumentFragment();

		for (let i = 0; i < this.length; i++) {
			frag.appendChild(this[i]);
		}

		return frag;
	}
}

function fragment() {
	return {
		length: 0,
		appendChild,
		toDocumentFragment
	};
}

function append(parent, el) {
	parent.appendChild(el);
	return el;
}

function node(parent, name) {
	return append(parent, document.createElement(name));
}

function text(parent, value) {
	return append(parent, document.createTextNode(value));
}

function value(parent, ctx, id, value) {
	const el = text(parent, value);
	ctx[id] = {el, value};
	return el;
}

function condition(parent, ctx, id, test, consequent) {
}

function updateValue(ctx, id, value) {
	const node = ctx[id];

	if (node.value !== value) {
		node.value = value;
		node.el.nodeValue = value;
	}
}

define([
	'qunit',
	'xtpl',
	'xtpl/mode/live',
	'../qunit.assert.codeEqual'
], function (
	QUnit,
	xtplModule,
	liveModeModule
) {
	'use strict';

	const xtpl = xtplModule.default;
	const liveMode = liveModeModule.default;

	function fromString(input, scope) {
		return xtpl.fromString(input, {mode: liveMode(), scope: scope})();
	}

	QUnit.module('xtpl / mode / live');

	QUnit.test('статичная текстовая нода', function (assert) {
		var template = fromString('|foo');

		// todo: Оптимизировать, убрать фрагмент
		assert.deepEqual(template().el.nodeValue, 'foo');
	});

	QUnit.test('динамическая текстовая нода', function (assert) {
		var template = fromString('|Hi, ${x}!', ['x']);
		var frag = template({x: 'foo'});

		assert.deepEqual(frag.el.childNodes.length, 3);
		assert.deepEqual(frag.el.childNodes[1].nodeValue, 'foo');

		frag.update({x: 'bar'});
		assert.deepEqual(frag.el.childNodes[1].nodeValue, 'bar', 'updated');
	});

	QUnit.test('тег + текст', function (assert) {
		var template = fromString('h1 | ${x}', ['x']);
		var frag = template({x: 'foo'});

		assert.deepEqual(frag.el.tagName, 'H1');
		assert.deepEqual(frag.el.textContent, 'foo');

		frag.update({x: 'bar'});
		assert.deepEqual(frag.el.textContent, 'bar', 'updated');
	});

	QUnit.test('if + текст', function (assert) {
		var template = fromString('if (x)\n  | ${x}', ['x']);
		var frag = template({x: false});

		assert.deepEqual(frag.el.childNodes.length, 0);

		frag.update({x: 'bar'});
		assert.deepEqual(frag.el.firstChild.nodeValue, 'bar', 'updated');
	});
});
