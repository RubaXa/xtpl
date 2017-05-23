define([
], function (
) {

	// Export
	return function mock(createFromString, components) {
		function createElementClass(template, methods) {
			methods.getTemplate = function () {
				return template;
			};

			return methods
		}

		var Toggle = createElementClass('.toggle[@click] | {attrs.text}', {
			getDefaults: function () {
				return {log: []};
			},
			connectedCallback: function () {
				this.attrs.log.push('connectedCallback');
			},
			disconnectedCallback: function () {
				this.attrs.log.push('disconnectedCallback');
			},
			'@click': function () {
				this._state = !this._state;
				this.dispatchEvent('visibility', {state: this._state});
			}
		});

		var itemId = 0;
		var Item = createElementClass('| ${attrs.text}', {
			constructor: function () {
				this.cid = ++itemId;
			},
			connectedCallback: function () {
				this.attrs.log.push(this.attrs.text + this.cid + '.connectedCallback');
			},
			disconnectedCallback: function () {
				this.attrs.log.push(this.attrs.text + this.cid + '.disconnectedCallback');
			},
		});

		var Element = createElementClass('.{attrs.className}', {});

		var mocks = {
			'./btn': {
				getTemplate() {
					return 'button.${attrs.className}[@click] | {attrs.value}';
				}
			},
			'./dropdown': {
				getTemplate() {
					return `
						import Button from "./btn";
						.dropdown > .ctrl[@click] > Button
					`;
				},
				'@click'(evt) {
					this.state = !this.state;
					this.dispatchEvent('visibility', {state: this.state}, evt.originalEvent);
				}
			},
			'./nesting': {
				getTemplate() {
					return `
						import Toggle from "./toggle";
						.nesting > Toggle[log={attrs.log}]
					`;
				},
				connectedCallback: function () {
					this.attrs.log.push('root.connectedCallback');
				},
				disconnectedCallback: function () {
					this.attrs.log.push('root.disconnectedCallback');
				},
			},
			'./toggle': Toggle,
			'./item': Item,
			'./element': Element,
			'./todos': {
				getTemplate() {
					return `
						.todos > for (todo in attrs.items) track by id
							.todo
								b[@click="toggle {todo}"] + em[@click="remove {todo}"]
								span | {todo.id}: {todo.done}
					`.split('\n')
						.slice(1)
						.map((line, idx, lines) => line.substr(lines[0].match(/^\s*/)[0].length))
						.join('\n')
				}
			},
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
		});
	}
});
