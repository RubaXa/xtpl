export type LoaderURL = (baseUrl: string, name: string, relativeName?: string) => string;

export interface LoaderOptions {
	basePath?: string;
	urlConstructor?: LoaderURL;
	require?: Function; // todo: typedef
}

interface IComponent {
	__view__: {
		frag: Object
	};

	__scope__: {
		attrs: Object;
	};

	attrs:Object;
	update(attrs): void;
	didMount(): void;
	didUnmount(): void;
}

interface IComponentFactory {
	(attrs): IComponent;
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

export function componentsService(options: LoaderOptions = {}):ComponentsService {
	const queue: {[name: string]: Promise<IComponentFactory>} = {};
	const imported: {[name: string]: string} = {};
	const components: {[name: string]: IComponentFactory} = {};
	const {
		basePath = '',
		urlConstructor = defaultUrlConstructor,
		require:requireModule,
	} = options;

	function load(name: string, from: string): Promise<IComponentFactory> {
		if (!queue.hasOwnProperty(from)) {
			queue[from] = requireModule(from).then((factory) => {
				components[name] = factory;
				return factory;
			});
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
		inline(name, template) {
			components[name] = <IComponentFactory>function (attrs) {
				var node = template(attrs);
				return node;
			};
		},

		require(as, from) {
			imported[as] = from;
		},

		create(ctx, parentFrag, name, attrs) {
			const cmpFactory = components[name];
			let node;

			if (cmpFactory) {
				const cmpNode = cmpFactory(attrs);

				node = cmpNode.hasOwnProperty('__view__') ? {
					frag: cmpNode.__view__.frag,
					update: (attrs) => cmpNode.update(attrs),
				} : cmpNode;

				ctx.mounted && cmpNode.didMount && cmpNode.didMount();
			} else {
				node = createDummy(name, attrs);

				if (imported[name]) {
					load(name, imported[name])
						.then(factory => {
							const cmpNode = factory(node.attrs);
							const view = cmpNode.__view__;

							ctx.components.push(cmpNode);
							parentFrag.replaceChildFrag(node.frag, view.frag);

							node.frag = view.frag;
							node.update = (attrs) => cmpNode.update(attrs);

							ctx.mounted && cmpNode.didMount && cmpNode.didMount();
						})
						.catch((err) => {
							setDummyStatus(node, 'failed', err.stack || err.toString());
						})
					;
				} else {
					setDummyStatus(node, 'failed', 'Not imported');
				}
			}

			node.frag.appendTo(parentFrag);
			return node;
		}
	};
}
