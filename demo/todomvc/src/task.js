let cid = 1;

class Task {
	constructor(title, completed) {
		this.cid = cid++;
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
