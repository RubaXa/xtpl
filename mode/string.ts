import {Bone} from 'skeletik';
import xtplParser, {DTD_TYPE, COMMENT_TYPE, TEXT_TYPE, KEYWORD_TYPE, HIDDEN_CLASS_TYPE} from 'skeletik/preset/xtpl';
import {compile as compileKeyword} from '../src/keywords';
import {interpolate} from '../src/utils';

const _s = JSON.stringify;

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

	function push(value:string, interpolateValue?:boolean) {
		let newValue = _s(value);
		interpolateValue && (newValue = interpolate(newValue));
		return value ? `__ROOT += ${newValue};\n` : value;
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
				return pair[0] + content + pair[1];
			} else if (TEXT_TYPE === type) {
				code = push(raw.value, true);
			} else if (COMMENT_TYPE === type) {
				code = push(`${pad}<!--${raw.value}-->${NL}`);
			} else if (HIDDEN_CLASS_TYPE === type) {
				return content + NL;
			} else {
				const name = raw.name;
				const attrs = Object
								.keys(raw.attrs || {})
								.map(name => ` ${name}="${raw.attrs[name]}"`)
								.join('');

				code = `${pad}<${name}${attrs}`;

				if (SHORT[name]) {
					code = push(`${code}/>${NL}`, true);
				} else {
					code = push(code + '>', true) + content + push(`</${name}>${NL}`);
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

		return content;
	}

	return {
		utils: {
			EACH: function EACH(data:any, callback:Function) {
				if (data != null) {
					if (data.forEach) {
						data.forEach(callback);
					} else {
						for (var key in data) {
							if (data.hasOwnProperty(key)) {
								callback(data[key], key);
							}
						}
					}
				}
			}
		},
		before: 'var __ROOT = "";',
		code: clean(compile(node, '')),
		export: '__ROOT.trim()',
	};
};