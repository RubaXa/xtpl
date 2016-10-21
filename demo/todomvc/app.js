(function TodoApp(xtpl, liveMode, {createStore}) {

	function byId(id) {
		return document.getElementById(id.substr(1))
	}

	// Функция получения шаблона
	function getTemplate(id) {
		const lines = byId(id).textContent.split('\n');
		const initialPadding = lines[1].match(/^\s*/)[0].length;

		return lines.map(line => line.substr(initialPadding)).join('\n').trim();
	}

	// Описание `store` приложения
	const store = createStore({
		filter: 'all',
		todos: [{id: 1, title: 'foo', completed: true}],
		filtered: ({filter, todos}, query) => filter === 'all' ? todos : query.where('completed', filter !== 'all')(todos),
		completed: ({todos}, query) => query.where('completed', true)(todos),
		leftCount: ({todos, completed}) => todos.length - completed.length,
	}, {
		'todo:create'(evt) {
			const value = evt.target.newTodo.value.trim();

			evt.preventDefault();
			value && this.todos.push({id: 2, title: value, completed: false});
		},

		'todo:toggle'(evt, todo) {
			todo.completed = !todo.completed;
		},

		'todo:destroy'(evt, todo) {
			this.todos.splice(this.todos.indexOf(todo), 1);
		},
	});

	// Шаблон приложения
	const template = getTemplate('#todoapp');

	// Компилируем шаблон и получаем фабрику
	const templateFactory = xtpl.fromString(template, {
		mode: liveMode({stddom: true}),
		scope: Object.keys(store), // Для доступа в шаблоне
	});

	// И вот теперь получаем финальный шаблон
	const compiledTemplate = templateFactory();

	// Финал, монтируем шаблон
	const view = compiledTemplate(store);
	const container = byId('#root');

	view.mountTo(container);
	store.subscribeAll(view.update);

	window.store = store;
})(xtpl, xtplModeLive, elastin);
