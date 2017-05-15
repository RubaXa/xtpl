import {AnimatorConstructor} from './animator';
// import components from './components';

let Animator;
export let GlobalAnimator:AnimatorConstructor = null;
export const customElements = {};

export function setAnimator(X) {
	Animator = X;
}

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
	const {type} = evt;
	const handle = this.events[type];

	if (this.eventsMods.hasOwnProperty(type)) {
		this.eventsMods[type].forEach(name => {
			// todo: Переделать
			if (name === 'prevent') {
				evt.preventDefault();
			}
		});
	}

	if (handle.hasOwnProperty('fn')) {
		const {ctx} = handle;
		const fn = ctx[`@${handle.fn}`];

		if (handle.hasOwnProperty('arg')) {
			fn.call(ctx, handle.arg);
		} else if (handle.hasOwnProperty('args')) {
			fn.call(ctx, handle.args);
		} else {
			fn(evt);
		}
	} else {
		handle(evt);
	}
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

	this.parentNode = frag;

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

export function replaceChildFrag(oldFrag, newFrag) {
	const domParent = getParent(this);

	if (newFrag.length === 1) {
		this[0] = newFrag[0];
		domParent.insertBefore(newFrag[0], oldFrag[0]);
		domParent.removeChild(oldFrag[0]);

		for (let idx = 0; idx < this.parentNode.length; idx++) {
			if (this.parentNode[idx] === oldFrag[0]) {
				this.parentNode[idx] = newFrag[0];
			}
		}
	} else {
		throw 'todo';
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
		replaceChildFrag,
		remove,
		mountTo,
	};
}

export function append(parent, el) {
	parent.appendChild(el);
	return el;
}

export function node(parent, name:string) {
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
		eventsMods: {},
		handleEvent,
		pool: {},
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

export function createContext(parent) {
	return {
		mounted: parent.mounted,
		components: [],
		next: null,
		prev: null
	};
}

export function addChildContext(parent, child) {
	const {last} = parent;

	child.mounted = parent.mounted;
	child.parent = parent;

	if (last == null) {
		parent.first = parent.last = child;
	} else {
		last.next = child;
		child.prev = last;
		parent.last = child;
	}

	return child;
}

export function removeContext(child) {
	const {parent, prev, next} = child;

	(parent.first === child) && (parent.first = next);
	(parent.last === child) && (parent.last = prev);

	(prev !== null) && (prev.next = next);
	(next !== null) && (next.prev = prev);
}

export function lifecycle(ctx, name: 'didMount' | 'didUnmount') {
	ctx.mounted = name === 'didMount';

	let cursor = ctx.first;
	if (cursor != null) {
		do {
			lifecycle(cursor, name);
		} while (cursor = cursor.next);
	}

	const {components} = ctx;
	let idx = components.length;

	while (idx--) {
		const cmp = components[idx];
		cmp[name] && cmp[name]();
	}
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
		animator: GlobalAnimator ? new GlobalAnimator() : null,
	};

	if (node !== null) {
		addChildContext(ctx, node.ctx);
		node.frag.appendTo(parent);
	}
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
				node = iterator(ctx, item, i);
				nodes[i] = node;

				node.frag.appendTo(parent);
				addChildContext(ctx, node.ctx);

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
		animator: GlobalAnimator ? new GlobalAnimator() : null,
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

export function updateCondition(ctx, id) {
	const condition = ctx[id];
	const length = condition.length;
	const items = condition.items;
	const animator = condition.animator;
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
		if (animator !== null) {
			if (node && newNode) {
				animator.replace(condition, node, newNode);
			} else {
				node && animator.remove([node]);

				if (newNode) {
					newNode.frag.appendToBefore(condition.parent, condition.anchor);
					animator.append([newNode]);
				}
			}
		} else {
			(node !== null) && node.frag.remove();
			(newNode !== null) && newNode.frag.appendToBefore(condition.parent, condition.anchor);
		}

		if (node !== null) {
			removeContext(node.ctx);
			lifecycle(node.ctx, 'didUnmount');
		}

		if (newNode !== null) {
			addChildContext(ctx, newNode.ctx);
			lifecycle(newNode.ctx, 'didMount');
		}

		condition.node = newNode;
	}

	update && newNode.update();
}

export function updateForeach(ctx, id, data, idProp, iterator) {
	const foreach = ctx[id];
	const pool = foreach.pool;
	const parent = foreach.parent;
	const anchor = foreach.anchor;
	const oldNodes = foreach.nodes;
	const oldLength = foreach.length;
	const animator = foreach.animator;
	const oldIndex = foreach.index;
	const newIndex = idProp ? {} : null;
	let pivotIdx = 0;
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
						node.reused = true;

						if (pivotIdx < node.index) {
							pivotIdx = node.index;
						} else {
							node.frag.appendToBefore(parent, oldNodes[pivotIdx + 1] || anchor);
						}
					} else {
						if (pool.length) {
							node = pool.pop();
							node.update(item, i);
						} else {
							node = iterator(ctx, item, i);
						}

						addChildContext(ctx, node.ctx);
						lifecycle(node.ctx, 'didMount');

						node.frag.appendToBefore(parent, oldNodes[pivotIdx + 1] || anchor);
						animator && animator.append && animator.append([node]);
					}

					newIndex[idValue] = node;
				} else if (i < oldLength) {
					node = oldNodes[i];
					node.reused = true;
					node.update(item, i);
				} else {
					if (pool.length) {
						node = pool.pop();
						node.update(item, i);
					} else {
						node = iterator(ctx, item, i);
					}

					addChildContext(ctx, node.ctx);
					lifecycle(node.ctx, 'didMount');

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

	let idx = oldLength;
	let useAnim = animator && animator.remove;

	while (idx--) {
		node = oldNodes[idx];

		if (!node.reused) {
			node.update(node.data, idx);

			if (useAnim) {
				animator.remove([node], pool);
			} else {
				node.frag.remove();
				pool.push(node);
			}

			removeContext(node.ctx);
			lifecycle(node.ctx, 'didUnmount');
		}

		node.reused = false;
	}

	foreach.index = newIndex;
	foreach.nodes = newNodes;
	foreach.length = newNodes.length;
}

export function anim(animName, parent, callback) {
	const _ga = GlobalAnimator;
	const Anim = Animator.get(animName);
	const children = parent.children || parent;
	const startIndex = children.length;
	const appended = [];

	GlobalAnimator = Anim;

	callback();

	GlobalAnimator = _ga;


	for (let i = startIndex; i < children.length; i++) {
		if (children[i].nodeType === 1) {
			appended.push(children[i]);
		}
	}

	if (appended.length) {
		const anim = new Anim();

		anim.events && anim.events(appended[0]);

		setTimeout(() => {
			anim.appear && anim.appear(appended);
		}, 0);
	}
}

export function setCustomElement(name, factory) {

}

export function customElement(parent, ctx, id, name, attrs) {
	const data = ctx[id] = {
		node: null,
		name,
	};
}
