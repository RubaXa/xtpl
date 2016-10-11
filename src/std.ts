const R_HTML_ENTITES = /[&<>"]/;
const R_HTML_ENTITY_AMP = /&/g;
const R_HTML_ENTITY_LT = /</g;
const R_HTML_ENTITY_GT = />/g;
const R_HTML_ENTITY_QUOTE = /"/g;

export default {
	NIL: null,

	TO_STRING(value) {
		if (value == null) {
			return '';
		}

		return value + '';
	},

	RETURN_EMPTY_STRING() {
		return '';
	},

	HTML_ENCODE: {
		vars: {
			R_HTML_ENTITES,
			R_HTML_ENTITY_AMP,
			R_HTML_ENTITY_LT,
			R_HTML_ENTITY_GT,
			R_HTML_ENTITY_QUOTE
		},

		method(value) {
			if (value == null) {
				return '';
			}

			if (R_HTML_ENTITES.test(value)) {
				if (value.indexOf('&') !== -1) {
					value = value.replace(R_HTML_ENTITY_AMP, '&amp;');
				}

				if (value.indexOf('<') !== -1) {
					value = value.replace(R_HTML_ENTITY_LT, '&lt;');
				}

				if (value.indexOf('>') !== -1) {
					value = value.replace(R_HTML_ENTITY_GT, '&gt;');
				}

				if (value.indexOf('"') !== -1) {
					value = value.replace(R_HTML_ENTITY_QUOTE, '&quot;');
				}

				return value;
			}

			return (typeof value === 'string') ? value : value.toString();
		}
	},

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
	},
};
