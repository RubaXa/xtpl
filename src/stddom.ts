export const htmlProps = {
	'id': 'id',
	'dir': 'dir',
	'lang': 'lang',
	'href': 'href',
	'class': 'className',
	'className': 'className',
	'checked': 'checked',
	'title': 'title',
	'tabIndex': 'tabIndex',
	'autofocus': 'autoFocus',
};

export function prop(el, name, value) {
	el[name] = value;
}

export function attr(el, name, value) {
	el.setAttribute(name, value);
}

export function dProp(node, name, value) {
	if (node.attrs[name] !== value) {
		node.el[name] = value;
		node.attrs[name] = value;
	}
}

export function handleEvent(evt) {
	this.events[evt.type](evt);
}

export function event(node, name, listener) {
	if (!node.events.hasOwnProperty(name)) {
		node.el.addEventListener(name, node, false);
	}

	node.events[name] = listener;
}

export function dAttr(node, name, value) {
	if (node.attrs[name] !== value) {
		node.el.setAttribute(name, value);
		node.attrs[name] = value;
	}
}

export function appendChild(child) {
	this[this.length++] = child;
}

export function mountTo(container) {
	this.parentNode = container;

	for (let i = 0; i < this.length; i++) {
		container.appendChild(this[i]);
	}
}

export function appendTo(parent) {
	this.parentNode = parent;

	if (this.length === 1) {
		parent.appendChild(this[0]);
	} else if (this.length > 1) {
		for (let i = 0; i < this.length; i++) {
			parent.appendChild(this[i]);
		}
	}
}

export function getParent(frag) {
	if (frag.nodeType === 1) {
		return frag;
	} else {
		return getParent(frag.parentNode);
	}
}

export function appendToBefore(frag, before) {
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

export function remove() {
	const parentNode = getParent(this);

	if (this.length === 1) {
		parentNode.removeChild(this[0]);
	} else if (this.length > 1) {
		for (let i = 0; i < this.length; i++) {
			parentNode.removeChild(this[i]);
		}
	}
}

export function fragment(parentNode) {
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

export function append(parent, el) {
	parent.appendChild(el);
	return el;
}

export function node(parent, name) {
	return append(parent, document.createElement(name));
}

export function liveNode(parent, ctx, id, name) {
	const el = append(parent, document.createElement(name));

	ctx[id] = {
		el,
		name,
		parent,
		attrs: {},
		events: {},
		handleEvent,
		pool: {}
	};

	return el;
}

export function text(parent, value) {
	return append(parent, document.createTextNode(value));
}

export function value(parent, ctx, id, value) {
	const el = text(parent, value);
	ctx[id] = {el, value};
	return el;
}

export function condition(parent, ctx, id, items) {
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

export function foreach(parent, ctx, id, data, idProp, iterator) {
	const index = idProp ? {} : null;
	let nodes;
	let node;
	let item;

	if (data != null) {

		if (data instanceof Array) {
			const length = data.length;
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

export function updateValue(node, value) {
	if (node.value !== value) {
		node.value = value;
		node.el.nodeValue = value;
	}
}

export function updateLiveNode(node, name) {
	if (node.name !== name) {
		const parent = getParent(node.parent);
		const attrs = node.attrs;
		const pool = node.pool;
		let oldEl = node.el;
		let el;

		pool[node.name] = oldEl;
		node.name = name;

		if (pool.hasOwnProperty(name)) {
			el = pool[name];
		} else {
			el = pool[name] = document.createElement(name);
		}

		for (let name in attrs) {
			if (htmlProps.hasOwnProperty(name)) {
				el[name] = attrs[name];
			} else {
				el.setAttribute(name, attrs[name]);
			}
		}

		node.el = el;
		parent.insertBefore(el, oldEl);
		parent.removeChild(oldEl);

		let child;
		while (child = oldEl.firstChild) {
			el.appendChild(child);
		}
	}
}

export function updateCondition(condition) {
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

		if (newNode !== null) {
			newNode.frag.appendToBefore(condition.parent, condition.anchor);
			newNode.frag.parentNode = condition.parent;
		}
		
		condition.node = newNode;
	}

	update && newNode.update();
}

export function updateForeach(foreach, data, idProp, iterator) {
	const pool = foreach.pool;
	const parent = foreach.parent;
	const anchor = foreach.anchor;
	const oldNodes = foreach.nodes;
	const oldLength = foreach.length;
	const oldIndex = foreach.index;
	const newIndex = idProp ? {} : null;
	let prevIndex = 0;
	let reusedLength = 0;
	let newNodes;
	let node;
	let item;
	let idValue;

	if (data != null) {
		if (data instanceof Array) {
			const length = data.length;
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
						}

						reusedLength++;

						if (node.index < prevIndex) {
							node.frag.appendToBefore(parent, reusedLength < oldLength ? oldNodes[reusedLength] : anchor);
						} else {
							prevIndex = node.index;
						}
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
				node.frag.parentNode = parent;
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
