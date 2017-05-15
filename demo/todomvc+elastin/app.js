'use strict';

(function TodoApp(xtpl, liveMode, {createStore}) {
	let gid = 0;

	function byId(id) {
		return document.getElementById(id.substr(1));
	}

	// Функция получения шаблона
	function getTemplate(id) {
		const lines = byId(id).textContent.split('\n');
		const initialPadding = lines[1].match(/^\s*/)[0].length;

		return lines.map(line => line.substr(initialPadding)).join('\n').trim();
	}

	// Описание `store` приложения
	const store = createStore({
		filter: () => location.hash.split('#')[1] || 'all',
		filters: ['all', 'active', 'completed'],
		todos: [
			// {id: ++gid, title: 'foo', completed: false}
		],
		filtered: ({filter, todos}, query) => filter === 'all' ? todos : query.where('completed', filter !== 'active')(todos),
		completed: ({todos}, query) => query.where('completed', true)(todos),
		leftCount: ({todos, completed}) => todos.length - completed.length,
	}, {
		'@todo:create'(evt) {
			const {newTodo} = evt.target;
			const value = newTodo.value.trim();

			evt.preventDefault();
			value && this.todos.push({id: ++gid, title: value, completed: false});
			newTodo.value = '';
		},

		'@todo:toggle'(todo) {
			todo.completed = !todo.completed;
		},

		'@todo:destroy'(todo) {
			this.todos.splice(this.todos.indexOf(todo), 1);
		},

		'@todos:toggle-all'({target:{checked}}) {
			this.todos.forEach(todo => {
				todo.completed = checked;
			});
		},

		'@todos:clear-completed'() {
			this.todos = this.todos.filter(({completed}) => !completed);
		}
	});

	// Шаблон приложения
	const template = getTemplate('#todoapp');

	// Компилируем шаблон и получаем фабрику
	const templateFactory = xtpl.fromString(template, {
		mode: liveMode({}),
		scope: Object.keys(store), // Список переменных доступных в шаблоне
	});

	// И вот теперь получаем финальный шаблон
	xtplStddom.setAnimator(xtplAnimator);
	const compiledTemplate = templateFactory(xtplStddom);

	// Финал, создаём view
	const view = compiledTemplate(store);
	const container = byId('#root');

	// И монтируем в DOM
	view.mountTo(container);
	store.subscribeAll(view.update);

	// Обновляем view по изменению маршрута
	window.addEventListener('hashchange', () => {
		view.update(store);
	});
	console.clear();
	// store.todos[0].completed = !store.todos[0].completed;

	// Debug
	window.store = store;
	window.templateFactory = templateFactory;
})(xtpl, xtplModeLive, elastin);
