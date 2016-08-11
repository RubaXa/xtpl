import {Bone} from 'skeletik';
import xtplParser from '../syntax/xtpl';
import {
	DTD_TYPE,
	COMMENT_TYPE,
	TEXT_TYPE,
	KEYWORD_TYPE,
	HIDDEN_CLASS_TYPE,
	DEFINE_TYPE,
	CALL_TYPE,
	QUOTE_CODE
} from '../syntax/utils';
import {compile as compileKeyword} from '../src/keywords';
import {stringify, stringifyAttr} from '../src/utils';

const SHORT = {
	area: 1, base: 1, br: 1, col: 1, command: 1, embed: 1, hr: 1, img: 1,
	input: 1, keygen: 1, link: 1, meta: 1, param: 1, source: 1, wbr: 1
};

export interface StringModeOptions {
	prettify?:boolean;
}

export default (options:StringModeOptions = {}) => (node:Bone) => {
	const {prettify} = options;
	const NL = prettify ? '\n' : '';
	const CUSTOM_ELEMENTS = {};

	function push(value:string, raw?:boolean):string {
		return `__ROOT += ${raw ? value : stringify(value)};\n`;
	}

	function pushAttr(name, values):string {
		let value = stringifyAttr(name, values);

		value = (value.charCodeAt(0) === QUOTE_CODE) ? `"\\${value}` : `'\\"' + ${value}`;
		value = (value.charCodeAt(value.length - 1) === QUOTE_CODE) ? `${value.slice(0, -1)}\\""` : `${value} + '\\"'`;

		return push(value, true);
	}

	function compile(node, pad:string) {
		const raw = node.raw;
		const type = node.type;
		let code;

		if (!prettify) {
			pad = '';
		}

		if (type === 'dtd') {
			code = push(`<!DOCTYPE ${raw.value}>${NL}`);
		} else {
			let hasText = false;
			let content = node.nodes.map(function (child) {
				hasText = child.type === 'text' || hasText;
				return compile(child, type == '#root' ? '' : pad + '  ');
			}).join('');

			if (hasText) {
				content = content.trim();
			} else {
				content = push(NL) + content + push(pad);
			}

			if (type === '#root') {
				code = content;
			} else if (KEYWORD_TYPE === type) {
				const pair = compileKeyword(raw.name, raw.attrs);
				code = pair[0] + content + pair[1];
			} else if (DEFINE_TYPE === type) {
				throw 'todo';
				// const {name} = raw;
				// const attrsToVars = raw.attrs.map(name => `  var ${name} = attrs.${name}`).join('\n');
				
				// CUSTOM_ELEMENTS[name] = 1;
				// code = `${pad}function ${name}(attrs) {\n${attrsToVars}\n  ${content}}\n`;
			} else if (TEXT_TYPE === type) {
				code = push(raw.value);
			} else if (COMMENT_TYPE === type) {
				code = push(`${pad}<!--${raw.value}-->${NL}`);
			} else if (HIDDEN_CLASS_TYPE === type) {
				code = content + NL;
			} else if (CUSTOM_ELEMENTS[raw.name]) {
				throw 'todo';
				// const attrsStr = Object
				// 				.keys(raw.attrs || {})
				// 				.map(name => `${stringifyObjectKey(name)}: ${stringifyObjectValue(raw.attrs[name])}`)
				// 				.join(', ');
				// code = `${pad}${raw.name}({` + attrsStr + '});\n';
			} else {
				const {name} = raw;
				const attrsStr = Object
								.keys(raw.attrs || {})
								.map(name => push(` ${name}=`) + pushAttr(name, raw.attrs[name]))
								.join('');

				code = push(`${pad}<`) + push(name) + attrsStr;

				if (SHORT[name]) {
					code += push(`/>${NL}`);
				} else {
					code += push('>') + content + push(`</${name}>${NL}`);
				}
			}
		}

		return code;
	}

	function clean(content) {
		let prev;
		
		do {
			prev = content;
			content = content.replace(/(__ROOT \+= ".*?)";\n*__ROOT \+= "/g, '$1');
		} while (prev !== content);

		return content
			.replace(/ \+ ""/g, '')
			.replace(/(__ROOT )\+=/, '$1=')
			.replace(/ = "\\n/, ' = "')
			.replace(/\\n";\n$/, '";')
		;
	}

	return {
		// utils: {
		// 	EACH: function EACH(data:any, callback:Function) {
		// 		if (data != null) {
		// 			if (data.forEach) {
		// 				data.forEach(callback);
		// 			} else {
		// 				for (var key in data) {
		// 					if (data.hasOwnProperty(key)) {
		// 						callback(data[key], key);
		// 					}
		// 				}
		// 			}
		// 		}
		// 	}
		// },
		before: '',
		code: 'var ' + clean(compile(node, '')),
		export: '__ROOT',
	};
};