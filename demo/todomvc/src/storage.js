let storage_pid;
let storage_unsavedData;

class Storage {
	constructor(name, engine) {
		this.name = 'xtpl-example' + name;
		this.engine = engine;
	}

	get() {
		return JSON.parse(this.engine.getItem(this.name));
	}

	set(data) {
		storage_unsavedData = data;

		if (!storage_pid) {
			storage_pid = setTimeout(() => {
				storage_pid = null;
				this.engine.setItem(this.name, JSON.stringify(storage_unsavedData));
			}, 0);
		}
	}
}

Storage.createLocal = function createLocal(name) {
	return new Storage(name, window.localStorage);
};
