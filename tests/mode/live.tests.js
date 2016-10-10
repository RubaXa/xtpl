function noop() {
}

function prop(el, name, value) {
	el[name] = value;
}

function attr(el, name, value) {
	el.setAttribute(name, value);
}

function appendChild(child) {
	this[this.length++] = child;
}

function mountTo(container) {
	this.parentNode = container;

	for (let i = 0; i < this.length; i++) {
		container.appendChild(this[i]);
	}
}

function appendTo(parent) {
	this.parentNode = parent;

	if (this.length === 1) {
		parent.appendChild(this[0]);
	} else if (this.length > 1) {
		for (let i = 0; i < this.length; i++) {
			parent.appendChild(this[i]);
		}
	}
}

function getParent(frag) {
	let parentNode = frag.parentNode;

	if (parentNode.nodeType === 1) {
		return parentNode;
	} else {
		return getParent(parentNode);
	}
}

function appendToBefore(frag, before) {
	const parentNode = getParent(frag);
	const refNode = before.hasOwnProperty('frag') ? (before.frag[0] || before.anchor) : before;

	if (this.length === 1) {
		parentNode.insertBefore(this[0], refNode);
	} else if (this.length > 1) {
		for (let i = 0; i < this.length; i++) {
			parentNode.insertBefore(this[i], refNode);
		}
	}
}

function remove() {
	const parentNode = getParent(this);

	if (this.length === 1) {
		parentNode.removeChild(this[0]);
	} else if (this.length > 1) {
		for (let i = 0; i < this.length; i++) {
			parentNode.removeChild(this[i]);
		}
	}
}

function fragment(parentNode) {
	return {
		length: 0,
		nodeType: 0,
		parentNode: parentNode,
		appendChild,
		appendTo,
		appendToBefore,
		remove,
		mountTo,
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

function condition(parent, ctx, id, items) {
	const length = items.length;
	const nodes = {};
	let node;

	for (let i = 0; i < length; i++) {
		node = nodes[i] = items[i]();

		if (node !== null) {
			break;
		}
	}

	ctx[id] = {
		node,
		anchor: text(parent, ''),
		parent,
		items,
		length,
		nodes,
	};

	(node !== null) && node.frag.appendTo(parent);
}

function foreach(parent, ctx, id, data, idProp, iterator) {
	const index = idProp ? {} : null;
	let nodes;
	let node;
	let item;

	if (data != null) {
		const length = data.length;

		if (length >= 0 && data.hasOwnProperty(0)) {
			nodes = new Array(length);

			for (let i = 0; i < length; i++) {
				item = data[i];
				node = iterator(item, i);
				nodes[i] = node;
				node.frag.appendTo(parent);
				if (index !== null) {
					index[item[idProp]] = node;
				}
			}
		} else {
			// todo
		}
	} else {
		nodes = [];
	}

	ctx[id] = {
		anchor: text(parent, ''),
		parent,
		nodes,
		index,
		length: nodes.length,
		pool: [],
	};
}

function updateValue(ctx, id, value) {
	const node = ctx[id];

	if (node.value !== value) {
		node.value = value;
		node.el.nodeValue = value;
	}
}

function updateCondition(ctx, id) {
	const condition = ctx[id];
	const length = condition.length;
	const items = condition.items;
	let nodes = condition.nodes;
	let node = condition.node;
	let newNode;
	let update = false;

	for (let i = 0; i < length; i++) {
		newNode = items[i](nodes[i]);

		if (newNode !== null) {
			update = nodes[i] != null;
			nodes[i] = newNode;
			break;
		}
	}

	if (node !== newNode) {
		(node !== null) && node.frag.remove();
		(newNode !== null) && newNode.frag.appendToBefore(condition.parent, condition.anchor);
		condition.node = newNode;
	}

	update && newNode.update();
}

function updateForeach(ctx, id, data, idProp, iterator) {
	const foreach = ctx[id];
	const pool = foreach.pool;
	const parent = foreach.parent;
	const anchor = foreach.anchor;
	const oldNodes = foreach.nodes;
	const oldLength = foreach.length;
	const oldIndex = foreach.index;
	const newIndex = idProp ? {} : null;
	let reusedLength = 0;
	let newNodes;
	let node;
	let item;
	let idValue;

	if (data != null) {
		const length = data.length;

		if (length >= 0 && data.hasOwnProperty(0)) {
			newNodes = new Array(length);

			for (let i = 0; i < length; i++) {
				item = data[i];

				if (newIndex !== null) {
					idValue = item[idProp];

					if (oldIndex.hasOwnProperty(idValue)) {
						node = oldIndex[idValue];
						node.update(item, i);

						if (node !== oldNodes[reusedLength]) {
							oldNodes[node.index] = oldNodes[reusedLength];
							node.frag.appendToBefore(parent, reusedLength < oldLength ? oldNodes[reusedLength] : anchor);
						}

						reusedLength++;
					} else {
						if (pool.length) {
							node = pool.pop();
							node.update(item, i);
						} else {
							node = iterator(item, i);
						}
						node.frag.appendToBefore(parent, reusedLength < oldLength ? oldNodes[reusedLength] : anchor);
					}

					newIndex[idValue] = node;
				} else if (i < oldLength) {
					node = oldNodes[i];
					node.update(item, i);
				} else {
					if (pool.length) {
						node = pool.pop();
						node.update(item, i);
					} else {
						node = iterator(item, i);
					}

					node.frag.appendToBefore(parent, anchor);
				}

				node.index = i;
				newNodes[i] = node;
			}
		} else {
			// todo
		}
	} else {
		newNodes = [];
	}

	const newLength = newNodes.length;
	let removed = oldLength - (newIndex === null ? newLength : reusedLength);

	if (removed > 0) {
		do {
			node = oldNodes[oldLength - removed];
			node.frag.remove();
			pool.push(node);
		} while (--removed);
	}

	foreach.index = newIndex;
	foreach.nodes = newNodes;
	foreach.length = newLength;
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

	function fromString(input, attrs) {
		return xtpl.fromString(input, {
			mode: liveMode(),
			scope: Object.keys(attrs || {}),
		})()(attrs).mountTo(document.createElement('div'));
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

		assert.equal(view.container.textContent, 'foo');

		view.update({data: [{id: 1, txt: 'foo'}, {id: 2, txt: 'bar'}]});
		var item_2 = view.container.childNodes[1];

		assert.equal(view.container.textContent, 'foobar', 'added bar');
		assert.ok(view.container.firstChild === item_1);

		view.update({data: [{id: 2, txt: 'bar'}, {id: 1, txt: 'foo'}]});

		assert.equal(view.container.textContent, 'barfoo', 'revert');
		assert.ok(view.container.childNodes[0] === item_2);
		assert.ok(view.container.childNodes[1] === item_1);

		view.update({data: [{id: 3, txt: 'baz'}, {id: 2, txt: 'bar'}, {id: 1, txt: 'foo'}]});

		var item_3 = view.container.childNodes[0];
		assert.equal(view.container.textContent, 'bazbarfoo', 'added baz');
		assert.ok(view.container.childNodes[1] === item_2);
		assert.ok(view.container.childNodes[2] === item_1);

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
});
