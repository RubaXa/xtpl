export type AnimatorConstructor = {new(): IAnimator};

export interface IFx {
	node:any;
	start:() => void;
	end:() => void;
	duration:number;
}

export interface IAnimator {
	append?:(nodes:any[]) => void;
	remove?:(nodes:any[], pool:any[]) => void;
	condition?:(parent, fromNode, toNode) => void;
}

export default class Animator implements IAnimator {
	public fx:IFx = null;
	public pid = null;

	private queue = [];

	constructor() {}

	clearQueue():void {
		if (this.pid) {
			clearTimeout(this.pid);
			this.fx.end();
			this.fx = null;
			this.pid = null;
			this.queue = [];
		}
	}

	push(fx:IFx):void {
		this.queue.push(fx);
	}

	next():void {
		if (this.pid === null && this.queue.length) {
			const fx = this.queue.shift();

			fx.start();
			Animator.applyTransitionDuration(fx.node, fx.duration);

			this.fx = fx;
			this.pid = setTimeout(() => {
				fx.end();

				this.pid = null;
				this.next();
			}, fx.duration);
		}
	}

	static applyTransition(node, prop:string, from:any, to:any = null) {
		[].forEach.call(node.frag || [node], el => {
			if (el.style.transition === '') {
				el.style[prop] = from;
				el.style.transitionProperty = prop;
				(to !== null) && el.offsetWidth;
			}

			(to !== null) && (el.style[prop] = to);
		});
	}

	static applyTransitionDuration(node, duration:number) {
		[].forEach.call(node.frag || [node], el => {
			el.style.transitionDuration = `${duration}ms`;
		});
	}

	static classes:{[index:string]:AnimatorConstructor} = {};

	static set(name, Class:AnimatorConstructor) {
		this.classes[name] = Class;
	}

	static get(name):AnimatorConstructor {
		return this.classes[name];
	}
}

//
// Base effects
//

Animator.set('fade', class AnimatorFade extends Animator {
	append(nodes:any[]):void {
		nodes.forEach((node, idx) => {
			Animator.applyTransition(node, 'opacity', 0);

			setTimeout(() => {
				node.offsetWidth;
				node.style.opacity = 1;

				Animator.applyTransitionDuration(node, 200);
			}, idx * 50);
		});
	}

	condition(cond, fromNode, toNode):void {
		this.clearQueue();

		if (fromNode) {
			this.push({
				node: fromNode,
				start() {
					Animator.applyTransition(fromNode, 'opacity', 1, 0);
				},
				end() {
					fromNode.frag.remove();
				},
				duration: 150,
			});
		}

		if (toNode) {
			this.push({
				node: toNode,
				start() {
					toNode.frag.appendToBefore(cond.parent, cond.anchor);
					Animator.applyTransition(toNode, 'opacity', 0, 1);
				},
				end() {},
				duration: 250,
			});
		}

		this.next();
	}

	remove(nodes:any[], pool:any[]) {
		nodes.forEach((node, idx) => {
			setTimeout(() => {
				node.frag[0].style.overflow = 'hidden';
				Animator.applyTransitionDuration(node, 200);
				Animator.applyTransition(node, 'height', '58px', 0);

				setTimeout(() => {
					node.frag.remove();
					pool.push(node);
				}, 200);
			}, idx * 50);
		});
	}
});
