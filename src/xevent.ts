export interface IEvent {
	new (type: string, detail?: object, originalEvent?: Event);

	readonly originalEvent: Event;
	readonly defaultPrevented: boolean;
	readonly propagationStopped: boolean;
	readonly propagationImmediateStopped: boolean;
}

const XEvent: IEvent = <any>(function (methods) {
	function NewEvent(type, detail, originalEvent) {
		this.type = type;
		this.detail = detail;
		this.originalEvent = originalEvent;

		this.defaultPrevented = false;
		this.propagationStopped = false;
		this.propagationImmediateStopped = false;
	}

	Object.keys(methods).forEach(name => {
		NewEvent.prototype[name] = methods[name];
	});

	return NewEvent;
})({
	preventDefault() {
		if (!this.defaultPrevented) {
			const {originalEvent} = this;

			this.defaultPrevented = true;
			originalEvent && originalEvent.preventDefault && originalEvent.preventDefault();
		}
	},

	stopPropagation() {
		if (!this.propagationStopped) {
			const {originalEvent} = this;

			this.propagationStopped = true;
			originalEvent && originalEvent.stopPropagation && originalEvent.stopPropagation();
		}
	},

	stopImmediatePropagation() {
		if (!this.propagationImmediateStopped) {
			const {originalEvent} = this;

			this.propagationImmediateStopped = true;
			originalEvent && originalEvent.stopImmediatePropagation && originalEvent.stopImmediatePropagation();
		}
	}
});

export default XEvent;
