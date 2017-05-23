import Block, {IBlock} from './block';
import {register} from './keywords';

export type LoaderURL = (baseUrl: string, name: string, relativeName?: string) => string;

export interface LoaderOptions {
	basePath?: string;
	urlConstructor?: LoaderURL;
	require?: Function; // todo: typedef
}

function defaultUrlConstructor(basePath: string, name: string) {
	return `${basePath}${name}/${name}`;
}

// todo: typedef
export interface ComponentsService {
	inline: Function;
	create: Function;
	require: Function,
}

export interface IComponent extends IBlock {
	(attrs): any;
	inline: boolean;
}

export const componentsService = (options: LoaderOptions = {}) => (__STDDOM, __COMP, fromString: Function): ComponentsService => {
	const queue: {[name: string]: Promise<IBlock>} = {};
	const imported: {[name: string]: string} = {};
	const components: {[name: string]: IComponent} = {};
	const {
		basePath = '',
		urlConstructor = defaultUrlConstructor,
		require:requireModule,
	} = options;

	function register(name, ClassOrLike) {
		let Class;

		if (typeof ClassOrLike === 'function') {
			Class = ClassOrLike;
			Class.inline = true;
		} else {
			Class = Block.classify(ClassOrLike);

			const template = Class.prototype['getTemplate']();
			const templateFactory = fromString(template, {scope: ['__this__', 'attrs']});

			Class.prototype.name = name;
			Class.prototype['__template__'] = templateFactory(__STDDOM, __COMP);
		}

		components[name] = Class;

		return Class;
	}

	function load(name: string, from: string): Promise<IBlock> {
		if (!queue.hasOwnProperty(from)) {
			queue[from] = requireModule(from).then(ClassOrLike => register(name, ClassOrLike));
		}

		return queue[from];
	}

	function className(el, state) {
		el.className = `component-dummy component-dummy-${state}`;
	}

	function createDummy(name, attrs) {
		const dummy = document.createElement('div');

		className(dummy, 'loading');
		dummy.setAttribute('data-component', name);

		const node = {
			frag: {
				0: dummy,
				length: 1,
				appendTo(parent) {
					parent.appendChild(dummy);
				}
			},
			attrs,
			update(attrs) {
				node.attrs = attrs;
			}
		};

		return node;
	}

	function setDummyStatus(dummy, status, statusText?) {
		const el = dummy.frag[0];

		className(el, status);
		el.setAttribute('data-component-status-text', statusText);
	}

	return {
		inline(name: string, template: string) {
			register(name, template);
		},

		require(as, from) {
			imported[as] = from;
		},

		create(ctx, parentFrag, name, attrs, parent, events) {
			const XBlock = components[name];
			let node;

			if (XBlock) {
				const cmpNode = XBlock.inline ? XBlock(attrs) : new XBlock(attrs);

				node = cmpNode.hasOwnProperty('__view__') ? {
					frag: cmpNode['__view__'].frag,
					update: (attrs) => cmpNode.update(attrs),
				} : cmpNode;

				cmpNode.__parent__ = parent;
				cmpNode.__events__ = events;

				ctx.connected && cmpNode['connectedCallback'] && cmpNode['connectedCallback']();
			} else {
				node = createDummy(name, attrs);

				if (imported[name]) {
					load(name, imported[name])
						.then(XBlock => {
							const cmpNode = new XBlock(node.attrs);
							const view = cmpNode['__view__'];

							cmpNode['__parent__'] = parent;
							cmpNode['__events__'] = events;

							ctx.components.push(cmpNode);

							if (parentFrag.replaceChildFrag) {
								parentFrag.replaceChildFrag(node.frag, view.frag);
							} else {
								parentFrag.insertBefore(view.frag[0], node.frag[0]);
								parentFrag.removeChild(node.frag[0]);
							}

							node.frag = view.frag;
							node.update = (attrs) => cmpNode.update(attrs);

							__STDDOM.addChildContext(ctx, view.ctx);

							ctx.connected && cmpNode['connectedCallback'] && cmpNode['connectedCallback']();
						})
						.catch((err) => {
							setDummyStatus(node, 'failed', err.stack || err.toString());
						})
					;
				} else {
					setDummyStatus(node, 'failed', 'Not imported');
				}
			}

			node.events = events;
			node.frag.appendTo(parentFrag);

			return node;
		}
	};
};
