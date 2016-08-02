const ESCAPE_BRACE_MARKER = +new Date();
const R_VALUE_EXPR = /{(.*?)}/g;
const R_ESCAPED_BRACE = /\\(\{|\})/g;
const R_REPALCED_ESCAPED_BRACE = new RegExp(ESCAPE_BRACE_MARKER + ':(\\d+)', 'g');
const R_IS_OBJECT_KEY_NORMAL = /^[a-z0-9$_]+$/i;
const R_IS_OBJECT_VALUE_PRIMITIVE = /^(((\+|-|~~)?(\d+\.?\d*|\.\d+)( *\| *0)?)|true|false|null)$/;

function REPALCE_ESCAPED_BRACE(_, chr) {
	return ESCAPE_BRACE_MARKER + ':' + chr.charCodeAt(0);
}

function REVERT_ESCAPED_BRACE(_, code) {
	return String.fromCharCode(code);
}

export const stringify = JSON.stringify;

export function interpolate(value:string):string {
	const start = value.indexOf('{');
	let newValue = value;
	
	if (start > -1) {
		const length = value.length;

		if (start === 0 && value.charAt(length - 1) === '}') {
			newValue = `" + ${value.slice(1, -1)} + "`;
		} else {
			newValue = value
					.replace(R_ESCAPED_BRACE, REPALCE_ESCAPED_BRACE)
					.replace(R_VALUE_EXPR, (_, expr) => `" + ${expr} + "`)
					.replace(R_REPALCED_ESCAPED_BRACE, REVERT_ESCAPED_BRACE)
		}
	} 

	return newValue;
}

export function stringifyObjectKey(key:string):string {
	return R_IS_OBJECT_KEY_NORMAL.test(key) ? key : `"${key}"`;
}

export function stringifyObjectValue(value:string):string {
	const start = value.indexOf('{');
	let newValue = value;

	if (!R_IS_OBJECT_VALUE_PRIMITIVE.test(value)) {
		if (start === -1) {
			newValue = stringify(value);
		} else if (start === 0 && value.charAt(value.length - 1) === '}') {
			newValue = value.slice(1, -1);
		} else {
			newValue = interpolate(stringify(value));
		}
	}

	return newValue;
}