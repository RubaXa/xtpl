const components = {};

export default {
	set(name, factory) {
		components[name] = factory;
	},

	get(name) {
		return components[name];
	}
};
