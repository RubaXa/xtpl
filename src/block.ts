import XEvent, {IEvent} from './xevent';

export type IBlock = typeof Block;

export interface IBlockIds {
	[index: string]: typeof Block;
}

export interface IBlockRefs {
	[index: string]: HTMLElement;
}

export interface IPlainBlock {
	name: string;
	getTemplate(): string;
	connectedCallback?(): void;
	disconnectedCallback?(): void;
}

export default class Block<A> {
	static classify<X>(ClassOrLike: IPlainBlock | IBlock): typeof Block {
		if (ClassOrLike instanceof Block) {
			return <IBlock>ClassOrLike;
		}

		class NewBlock extends Block<X> {
			constructor(attrs) {
				super(attrs);
				ClassOrLike.hasOwnProperty('constructor') && ClassOrLike.constructor.call(this, attrs);
			}
		}

		Object.keys(ClassOrLike).forEach(name => {
			NewBlock.prototype[name] = ClassOrLike[name];
		});

		NewBlock.prototype.constructor = NewBlock;

		return <any>NewBlock;
	}

	ids: IBlockIds = {};
	refs: IBlockRefs = {};

	name: string;
	attrs: A;

	private __scope__ = null;
	private __view__ = null;
	private __template__; // ижектиться из «вне»
	private __parent__;
	private __events__;

	constructor(attrs: A) {
		const defaults = this.getDefaults();

		for (const key in defaults) {
			if (defaults.hasOwnProperty(key)) {
				if (attrs[key] == null && defaults.hasOwnProperty(key)) {
					attrs[key] = defaults[key];
				}
			}
		}

		this.attrs = attrs;

		this.__scope__ = {
			__this__: this,
			attrs: attrs,
		};

		this.__view__ = this.__template__(this.__scope__);
	}

	protected getDefaults(): Partial<A> {
		return {};
	}

	protected getTemplate(): string {
		return '.{className} > ::children';
	}

	protected connectedCallback(): void {
	}

	protected disconnectedCallback(): void {
	}

	protected attributeChangedCallback<K extends keyof A>(attrName: K, oldValue: A[K], newValue: A[K]): void {
	}

	dispatchEvent(event: IEvent);
	dispatchEvent(type: string, detail?: object, originalEvent?: Event);
	dispatchEvent(type, detail?, originalEvent?) {
		const event = type instanceof XEvent ? type : new XEvent(type, detail, originalEvent);
		const eventType = event.type;
		const atName = `@${eventType}`;
		const {__events__, __parent__} = this;

		event.target = this;
		event.currentTarget = this;

		this[atName] && this[atName](event);

		if (__events__ && __events__.hasOwnProperty(eventType)) {
			let {ctx, fn, detail} = __events__[eventType];

			if (event.detail != null) {
				if (detail == null) {
					detail = event.detail;
				} else {
					detail = {...event.detail, ...detail};
				}
			}

			const nextEvent = new XEvent(fn, detail, event.originalEvent);

			if (ctx.dispatchEvent) {
				ctx.dispatchEvent(nextEvent);
			} else if (ctx.hasOwnProperty(`@${fn}`)) {
				ctx[`@${fn}`](nextEvent);
			}
		}
	}

	update(partialAttrs: Partial<A>) {
		const defaults = this.getDefaults();
		const previousAttrs = this.attrs;
		const changed = [];
		let changedLength = 0;

		for (const key in partialAttrs) {
			if (partialAttrs.hasOwnProperty(key)) {
				const oldValue = previousAttrs[key];
				let newValue = partialAttrs[key];

				if (newValue == null && defaults.hasOwnProperty(key)) {
					newValue = defaults[key];
				}

				if (oldValue !== newValue) {
					changed.push(key, oldValue, newValue);
					changedLength += 3;

					this.attrs[key] = newValue;
				}
			}
		}

		// Если есть изменения, обновляем объект
		if (changedLength) {
			this.__view__.update(this.__scope__);

			for (let idx = 0; idx < changedLength; idx += 3) {
				this.attributeChangedCallback(changed[idx], changed[idx + 1], changed[idx + 2]);
			}
		}
	}
}
