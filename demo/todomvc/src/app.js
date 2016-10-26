const PATH_TO_FILTER = {
	'/': 'all',
	'/active': 'active',
	'/completed': 'completed'
};

const cachedActions = {};

class App {
	constructor(el, storage, router) {
		this.el = el;
		this.view = null;
		this.state = {
			filters: Object.keys(PATH_TO_FILTER).map(x => PATH_TO_FILTER[x]),
			filter: null,
			todos: Task.map(storage.get() || []),
			activeTodos: null,
			filteredTodos: null,
			allCompleted:  null,
			action: (name, ...args) => {
				let handle = cachedActions[name];

				if (args.length) {
					handle = (evt) => {
						this.handleEvent(evt, name, ...args)
					};
				} else if (handle === void 0) {
					handle = cachedActions[name] = (evt) => {
						this.handleEvent(evt, name);
					};
				}

				return handle;
			}
		};

		xtplStddom.setAnimator(xtplAnimator);

		this.compiledTemplate = xtpl.fromString(templateString, {
			mode: xtplModeLive(),
			scope: Object.keys(this.state),
		})(xtplStddom);


		this.storage = storage;
		this.router = router;

		this.router.on('change', path => {
			this.state.filter = PATH_TO_FILTER[path] || PATH_TO_FILTER['/'];
			this.render();
		});
	}

	getActiveTodos() {
		return this.state.todos.filter(todo => !todo.completed);
	}

	getFilteredTodos() {
		const {todos, filter} = this.state;
		return filter === 'all' ? todos : todos.filter(todo => todo.completed === (filter !== 'active'));
	}

	handleEvent(evt, type, data) {
		evt.preventDefault();

		const {todos} = this.state;

		switch (type) {
			case 'add':
				const {newTodo} = evt.target;
				todos.push(new Task(newTodo.value));
				newTodo.value = '';
				break;

			case 'toggle':
				data.completed = !data.completed;
				break;

			case 'markall':
				todos.forEach(todo => {
					todo.completed = evt.target.checked;
				});
				break;

			case 'remove':
				todos.splice(todos.indexOf(data), 1);
				break;

			case 'clear':
				this.state.todos = todos.filter(todo => !todo.completed);
				break;
		}

		this.render();
		this.storage.set(this.state.todos);
	}

	render() {
		const {state} = this;
		const activeTodos = this.getActiveTodos();
		const filteredTodos = this.getFilteredTodos();

		state.activeTodos = activeTodos;
		state.filteredTodos = filteredTodos;
		state.allCompleted = filteredTodos.length && filteredTodos.every(todo => todo.completed);

		if (this.view === null) {
			this.view = this.compiledTemplate(state).mountTo(this.el);
		} else {
			this.view.update(state);
		}

		return this;
	}
}

function boot(el, storage, router) {
	return new App(el, storage, router).render();
}
