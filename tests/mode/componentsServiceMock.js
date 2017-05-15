define([], function () {
	// Export
	return function mock(createFromString, components) {
		function createElementClass(template, methods) {
			var templateFactory = createFromString(template, {
				attrs: {}
			});
			var Class = function (attrs) {
				this.attrs = attrs;
				this.__scope__ = {attrs: attrs};
				this.__view__ = templateFactory(this.__scope__);
				methods.constructor && methods.constructor.call(this, attrs);
			};

			Class.prototype.update = function (attrs) {
				this.attrs = attrs;
				this.__scope__.attrs = this.attrs;
				this.__view__.update(this.__scope__);
			};

			Object.keys(methods).forEach(function (name) {
				Class.prototype[name] = methods[name];
			});

			Class.prototype.constructor = Class;

			return Class;
		}

		var Toggle = createElementClass('.toggle | ${attrs.text}', {
			didMount: function () {
				this.attrs.log.push('didMount');
			},
			didUnmount: function () {
				this.attrs.log.push('didUnmount');
			}
		});

		var itemId = 0;
		var Item = createElementClass('| ${attrs.text}', {
			constructor: function () {
				this.cid = ++itemId;
			},
			didMount: function () {
				this.attrs.log.push(this.attrs.text + this.cid + '.didMount');
			},
			didUnmount: function () {
				this.attrs.log.push(this.attrs.text + this.cid + '.didUnmount');
			},
		});

		var Element = createElementClass('.${attrs.className}', {});

		var mocks = {
			'./btn': function (attrs) {
				const node = createFromString('button | ${value}', attrs)(attrs);
				return {
					__view__: node,
					update: node.update,
				};
			},

			'./toggle': function (attrs) {
				return new Toggle(attrs);
			},

			'./item': function (attrs) {
				return new Item(attrs);
			},

			'./element': function (attrs) {
				return new Element(attrs);
			}
		};

		return components.componentsService({
			require(path) {
				return new Promise((resolve, reject) => {
					if (path.indexOf('failed') > -1) {
						reject(path);
					} else {
						resolve(mocks[path]);
					}
				});
			}
		})
	}
});
