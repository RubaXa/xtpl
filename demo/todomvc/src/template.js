const templateString = `
section.todoapp
	header.header
		h1 | todos
		form[on-submit="\${action('add')}"]
			input.new-todo[name="newTodo" placeholder="What needs to be done?" autofocus autocomplete="off"]

	section.main
		if (todos.length)
			input.toggle-all[on-change="\${action('markall')}" type="checkbox" checked="\${allCompleted}"]
			label[for="toggle-all"] | Mark all as complete

		ul.todo-list
			anim("fade") > for (todo in filteredTodos) track by id
				li
					class.completed: todo.completed
					.view
						input.toggle[on-change="\${action('toggle', todo)}" type="checkbox" checked="\${todo.completed}"]
						label | \${todo.title}
						button.destroy[on-click="\${action('remove', todo)}"]

	anim("fade") > if (todos.length)
		footer.footer
			span.todo-count
				strong[>] | \${activeTodos.length}
				| \${activeTodos.length == 1 ? 'item' : 'items'} left

			ul.filters > for (name in filters)
				li > a[href="#\${name}"]
					class.selected: name === filter
					| \${name.charAt(0).toUpperCase() + name.substr(1)}

			if (activeTodos.length < todos.length)
				button.clear-completed[on-click="\${action('clear')}"] | Clear completed
`.trim();
