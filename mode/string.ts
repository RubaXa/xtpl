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
	const customElemets = [];

	function push(value:string, raw?:boolean):string {
		return `__ROOT += ${raw ? value : stringify(value)};\n`;
	}

	function pushAttr(name, values, bone):string {
		let value = stringifyAttr(name, values, bone);

		value = (value.charCodeAt(0) === QUOTE_CODE) ? `"\\${value}` : `"\\"" + ${value}`;
		value = (value.charCodeAt(value.length - 1) === QUOTE_CODE) ? `${value.slice(0, -1)}\\""` : `${value} + "\\""`;

		return push(value, true);
	}

	function compileSlots(nodes:Bone[]):string {
		let defines = [];
		let defaultSlot = new Bone(DEFINE_TYPE, {
			name: '__default',
			type: 'parenthesis',
			attrs: [],
		});

		nodes.forEach(node => {
			if (node.type === DEFINE_TYPE) {
				defines.push(node);
			} else {
				defaultSlot.nodes.push(node);
			}
		});

		if (defines.length && defaultSlot.nodes.length) {
			throw Error('Mixed content');
		} else if (defines.length) {
		} else {
			return `{__default: ${clean(compile(defaultSlot, ''))}}`;
		}
	}

	function compile(node, pad:string, callList?:string[]) {
		const raw = node.raw;
		const type = node.type;
		let code = '';
		let innerCallList = [];

		if (!prettify) {
			pad = '';
		}

		if (type === 'dtd') {
			code = push(`<!DOCTYPE ${raw.value}>${NL}`);
		} else {
			let hasText = false;
			let content = node.nodes.map(function (child) {
				hasText = child.type === 'text' || hasText;
				return compile(child, type == '#root' ? '' : pad + '  ', innerCallList);
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
			} else if (CALL_TYPE === type) {
				callList.push(raw.name);

				code = `  if (${raw.name})\n`;
				code += `    __ROOT += ${raw.name}(${raw.args.join(',')});`;
			} else if (DEFINE_TYPE === type) {
				const {name} = raw;
				
				if (raw.type === 'parenthesis') {
					code = `function ${name}(${raw.attrs.join(', ')}) {\n`
						+ `  var __ROOT = "";\n`
						+ `  ${content}`
						+ `  return __ROOT\n`
						+ `}\n`
					;
				} else {
					// todo: Пересечение attrs и innerCallList
					const vars = [].concat(
						raw.attrs.map(name => `${name} = attrs.${name}`),
						innerCallList.map(name => `${name} = __slots.${name}`)
					);
					
					CUSTOM_ELEMENTS[name] = 1;
					customElemets.push(
						`function ${name}(attrs, __slots) {\n`,
						(vars.length ? `  var ${vars.join(', ')}\n` : ''),
						`  var __ROOT = "";\n`,
						`  ${content}`,
						`  return __ROOT\n`,
						`}\n`
					);
				}
			} else if (TEXT_TYPE === type) {
				code = push(raw.value);
			} else if (COMMENT_TYPE === type) {
				code = push(`${pad}<!--${raw.value}-->${NL}`);
			} else if (HIDDEN_CLASS_TYPE === type) {
				code = content + NL;
			} else if (CUSTOM_ELEMENTS[raw.name]) {
				const attrsStr = Object
								.keys(raw.attrs || {})
								.map(name => `${stringify(name)}: ${stringify(raw.attrs[name])}`)
								.join(', ');

				code = `${pad}__ROOT += ${raw.name}({${attrsStr}}`;
				code += node.nodes.length ? `, ${compileSlots(node.nodes)});\n` : `);\n`;
			} else {
				const {name} = raw;
				const attrsStr = Object
								.keys(raw.attrs || {})
								.map(name => push(` ${name}=`) + pushAttr(name, raw.attrs[name], node))
								.join('');

				code = push(`${pad}<`) + push(name) + attrsStr;

				if (SHORT[name]) {
					code += push(`/>${NL}`);
				} else {
					code += push('>') + content + push('</') + push(name) + push(`>${NL}`);
				}
			}
		}

		return code;
	}

	function clean(content) {
		let prev;
		
		do {
			prev = content;
			content = content
				.replace(/(__ROOT \+= ".*?)";\n*__ROOT \+= "/g, '$1')
				.replace(/(__ROOT \+= .*?\));\n?__ROOT \+= /g, '$1 + ')
				.replace(/(__ROOT \+= ".*?");\n*__ROOT \+= \(/g, '$1 + (')
			;
		} while (prev !== content);

		return content
			.replace(/ \+ ""/g, '')
			.replace(/(__ROOT )\+=/, '$1=')
			.replace(/ = "\\n/, ' = "')
			.replace(/\\n";\n$/, '";')
			.replace(/__ROOT \+= "";/g, '')
			.trim()
			.replace(/(var __ROOT = )"";[\n ]*__ROOT \+?= /g, '$1')
		;
	}

	const code = `var ${compile(node, '')}  return __ROOT`;

	return {
		before: clean(customElemets.join('')),
		code: clean(code),
	};
};