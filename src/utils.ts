const ESCAPE_BRACE_MARKER = +new Date();
const R_VALUE_EXPR = /{(.*?)}/g;
const R_ESCAPED_BRACE = /\\(\{|\})/g;
const R_REPALCED_ESCAPED_BRACE = new RegExp(ESCAPE_BRACE_MARKER + ':(\\d+)', 'g');

function REPALCE_ESCAPED_BRACE(_, chr) {
	return ESCAPE_BRACE_MARKER + ':' + chr.charCodeAt(0);
}

function REVERT_ESCAPED_BRACE(_, code) {
	return String.fromCharCode(code);
}

export function interpolate(value:string):string {
	const start = value.indexOf('{');
	
	if (start > -1) {
		const length = value.length;

		if (start === 0 && value.charAt(length - 1) === '}') {
			value = `" + ${value.slice(1, -1)} + "`;
		} else {
			value = value
					.replace(R_ESCAPED_BRACE, REPALCE_ESCAPED_BRACE)
					.replace(R_VALUE_EXPR, (_, expr) => `" + ${expr} + "`)
					.replace(R_REPALCED_ESCAPED_BRACE, REVERT_ESCAPED_BRACE)
		}
	} 

	return value;
}