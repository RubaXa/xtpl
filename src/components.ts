interface IComponentSpec {
	name:string;
	path:string;
	promise:Promise,
	loaded:boolean;
	init:(ctx) => void;
}

interface IComponentSpecMap {
	[index:string]:IComponentSpec
}

const components:IComponentSpecMap = {};


function requireComponent(spec:IComponentSpec) {
}

function createComponent(ctx, error?) {
}

function init(ctx) {
	if (this.loaded) {
		createComponent(ctx);
	} else {
		if (this.promise === null) {
			this.promise = requireComponent(this);
		}

		this.promise
			.then(() => createComponent(ctx))
			.catch((err) => createComponent(ctx, err))
		;
	}
}

export default {
	include(name:string, path:string) {
		components[name] = {
			name,
			path,
			promise: null,
			loaded: false,
			template: null,
			controller: null,
			init,
		}
	},

	get(name) {
		return components[name];
	}
};
