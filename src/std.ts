export default {
	EACH(data:any, callback:Function) {
		if (data != null) {
			if (data.forEach) {
				const length = data.length;
				
				for (let i = 0; i < length; i++) {
					callback(data[i], i);
				}
			} else {
				for (var key in data) {
					if (data.hasOwnProperty(key)) {
						callback(data[key], key);
					}
				}
			}
		}
	}
};