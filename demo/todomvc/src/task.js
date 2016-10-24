let task_gid = 1;

class Task {
	constructor(title, completed) {
		this.id = task_gid++;
		this.title = title;
		this.completed = !!completed;
	}

	toJSON() {
		return {title: this.title, completed: this.completed};
	}
}

Task.map = function map(todos) {
	return todos.map(data => new Task(data.title, data.completed));
};
