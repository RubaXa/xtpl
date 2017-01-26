export type AnimatorConstructor = {new(): IAnimator};

export interface IAnimator {
	appear?:(nodes:any[]) => void;
	append?:(nodes:any[]) => void;
	removeOne?:(node, pool:any[]) => void;
	removeAll?:(nodes:any[], pool:any[]) => void;
	replace?:(parent, fromNode, toNode) => void;
	events?:(node:HTMLElement) => void;
}

export type TransitionPropValue = [any, any];

export interface ITransitionProps {
	[index:string]: TransitionPropValue;
}

export default class Animator implements IAnimator {
	remove(nodes:any, pool:any) {
		if (nodes.length === 1 && (<any>this).removeOne) {
			(<any>this).removeOne(nodes[0], pool);
		} else if ((<any>this).removeAll) {
			(<any>this).removeAll(nodes, pool);
		} else {
			nodes.forEach(node => { node.frag.remove() });
		}
	}

	anim(node, props:ITransitionProps, duration:number, delay:number = 0, pool?) {
		clearTimeout(node.animId);
		Animator.applyTransition(node, props, duration, delay);

		if (arguments.length === 5) {
			node.animId = setTimeout(() => {
				node.frag.remove();
				Animator.clean(node);
				pool && pool.push(node);
			}, duration + delay);
		}
	}

	animClone(node, props:string|ITransitionProps, duration:number, delay:number = 0) {
		const el = node.frag[0];
		const clone = el.cloneNode(true);

		clone.style.position = 'absolute';
		el.parentNode.insertBefore(clone, el);

		Animator.applyTransition(clone, props, duration, delay);
	}

	static applyTransition(el, props:string|ITransitionProps, duration:number, delay:number = 0) {
		if (el.hasOwnProperty('frag')) {
			const frag = el.frag;

			for (let i = 0; i < frag.length; i++) {
				this.applyTransition(frag[i], props, duration, delay);
			}
		} else if (typeof props === 'string') {
			el.style.animationDuration = duration + 'ms';
			el.style.animationDelay = delay + 'ms';

			props.split(/\s+/).forEach(name => {
				el.classList.add(name);
			});
		} else {
			let rect = null;
			const animProps = Object.keys(props).map((prop:string) => {
				let [fromValue, toValue] = props[prop];

				if (prop === 'width' || prop === 'height') {
					(rect === null) && (rect = el.getBoundingClientRect());

					(fromValue === 'auto') && (fromValue = rect[prop] + 'px');
					(toValue === 'auto') && (props[prop][1] = rect[prop] + 'px');

					el.style.overflow = 'hidden';
				}

				el.style[prop] = fromValue;

				return prop;
			});

			const transitionProperties = animProps.join(', ');

			if (el.style.transitionProperty !== transitionProperties) {
				el.style.transitionProperty = transitionProperties;
				el.offsetWidth;
			}

			el.style.transitionDuration = duration + 'ms';
			el.style.transitionDelay = delay + 'ms';

			animProps.forEach(prop => {
				el.style[prop] = props[prop][1];
			});
		}
	}

	static classes:{[index:string]:AnimatorConstructor} = {};

	static set(name, Class:AnimatorConstructor) {
		this.classes[name] = Class;
	}

	static get(name):AnimatorConstructor {
		if (name.indexOf('+') > -1) {
			const Fx = class extends Animator {};

			name.split('+').forEach(name => {
				const proto = Animator.get(name).prototype;

				Object.keys(proto).forEach(name => {
					Fx.prototype[name] = proto[name];
				});
			});

			this.classes[name] = Fx;
		}

		return this.classes[name];
	}

	static clean(el:HTMLElement) {
		if (el.hasOwnProperty('frag')) {
			const frag:HTMLElement[] = (<any>el).frag;

			for (let i = 0; i < frag.length; i++) {
				this.clean(frag[i]);
			}
		} else {
			el.style.transitionProperty.split(', ').forEach(name => {
				el.style[name] = '';
			});

			el.style.overflow = '';
			el.style.transition = '';
		}
	}
}

//
// Base effects
//

Animator.set('fade', class extends Animator {
	appear(nodes:any[]):void {
		this.append(nodes);
	}

	append(nodes:any[]):void {
		nodes.forEach((node, idx) => {
			this.anim(
				node,
				{'opacity': [0, 1]},
				250,
				idx * 50
			);
		});
	}

	removeAll(nodes:any[], pool:any[] = null) {
		nodes.forEach((node, idx) => {
			this.anim(
				node,
				{'opacity': [1, 0]},
				200,
				idx * 50,
				pool
			);
		});
	}
});

Animator.set('slide', class extends Animator {
	appear(nodes:any[]):void {
		this.append(nodes);
	}

	append(nodes:any[]):void {
		nodes.forEach((node, idx) => {
			this.anim(
				node,
				{
					'transform': ['translate(0, -100%)', 'translate(0, 0)'],
					'opacity': [0, 1],
				},
				250,
				idx * 50
			);
		});
	}

	removeAll(nodes:any[], pool = null):void {
		nodes.forEach((node, idx) => {
			this.anim(
				node,
				{
					'transform': ['translate(0, 0)', 'translate(0, -100%)'],
					'opacity': [1, 0],
				},
				200,
				idx * 50,
				pool
			);
		});
	}
});

Animator.set('pinch', class extends Animator {
	append(nodes:any[]):void {
		nodes.forEach((node, idx) => {
			this.anim(
				node,
				{
					'height': [0, 'auto'],
					'opacity': [0, 1],
				},
				250,
				idx * 50
			);
		});
	}

	removeAll(nodes:any[], pool = null):void {
		nodes.forEach((node, idx) => {
			this.anim(
				node,
				{
					'height': ['auto', 0],
					'opacity': [1, 0],
				},
				200,
				idx * 50,
				pool
			);
		});
	}
});

Animator.set('hinge', class extends Animator {
	removeOne(node, pool = null):void {
		this.animClone(
			node,
			'animated hinge',
			1500
		);

		this.anim(
			node,
			{'height': ['auto', 0]},
			100,
			0,
			pool
		);
	}
});
