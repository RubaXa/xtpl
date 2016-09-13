import xtpl, {IBone, BoneConstructor} from '../xtpl';

const {
	ROOT_TYPE,
	DTD_TYPE,
	COMMENT_TYPE,
	TEXT_TYPE,
	KEYWORD_TYPE,
	HIDDEN_CLASS_TYPE,
	DEFINE_TYPE,
	CALL_TYPE,
	QUOTE_CODE
} = xtpl.syntaxUtils;

const {stringify, stringifyAttr} = xtpl.utils;

const SHORT = {
	area: 1, base: 1, br: 1, col: 1, command: 1, embed: 1, hr: 1, img: 1,
	input: 1, keygen: 1, link: 1, meta: 1, param: 1, source: 1, wbr: 1
};

export interface StringModeOptions {
	prettify?:boolean;
	comment?:boolean;
}

export default (options:StringModeOptions = {}) => (node:IBone, BoneClass:BoneConstructor) => {
	const {prettify} = options;
	const NL = prettify ? '\n' : '';
	const CUSTOM_ELEMENTS = {};
	const customElemets = [];

	function push(value:string, raw?:boolean):string {
		return `__ROOT += ${raw ? value : stringify(value, '__STDLIB_HTML_ENCODE')};\n`;
	}

	function pushAttr(name, values, bone):string {
		let value = stringifyAttr(name, values, '__STDLIB_HTML_ENCODE', bone);

		value = (value.charCodeAt(0) === QUOTE_CODE) ? `"\\${value}` : `"\\"" + ${value}`;
		value = (value.charCodeAt(value.length - 1) === QUOTE_CODE) ? `${value.slice(0, -1)}\\""` : `${value} + "\\""`;

		return push(value, true);
	}

	function compileSlots(nodes:IBone[]):string {
		let defines = [];
		let defaultSlot = new BoneClass(DEFINE_TYPE, {
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
			return `{${defines.map(define => `${define.raw.name}: ${clean(compile(define, ''))}`).join(', ')}}`;
		} else {
			return `{__default: ${clean(compile(defaultSlot, ''))}}`;
		}
	}

	function compile(node, pad:string, callList?:string[], defaultSlots?:any) {
		const raw = node.raw || {};
		const type = node.type;
		let name = raw.name;
		let code = '';
		let innerCallList = DEFINE_TYPE === type ? [] : callList;
		let innerDefaultSlotsList = (DEFINE_TYPE === type && raw.type === 'bracket') ? {} : defaultSlots;

		if (!prettify) {
			pad = '';
		}

		if (DTD_TYPE === type) {
			code = push(`<!DOCTYPE ${raw.value == 5 ? 'html' : raw.value}>${NL}`);
		} else {
			let hasText = false;
			let content = node.nodes.map(function (child) {
				hasText = child.type === 'text' || hasText;
				return compile(child, type == '#root' ? '' : pad + '  ', innerCallList, innerDefaultSlotsList);
			}).join('');

			if (hasText) {
				content = content.trim();
			} else {
				content = push(NL) + content + push(pad);
			}

			if (ROOT_TYPE === type) {
				code = content;
			} else if (KEYWORD_TYPE === type) {
				const pair = xtpl.keywords.compile(name, raw.attrs);
				code = pair[0] + content + pair[1];
			} else if (CALL_TYPE === type) {
				callList.push(name);

				if (/^super\./.test(name)) {
					name = `this.${name.substr(6)}`;
				}

				code = `  if (${name}) {\n    __ROOT += ${name}`;
				code += defaultSlots
							? `.call(${['__super'].concat(raw.args).join(',')});\n}\n`
							: `(${raw.args.join(',')});\n}\n`;
			} else if (DEFINE_TYPE === type) {
				if (raw.type === 'parenthesis') {
					code = `function ${name}(${raw.attrs.join(', ')}) {\n`
						+ `  var __ROOT = "";\n`
						+ `  ${content}`
						+ `  return __ROOT\n`
						+ `}\n`
					;

					if (defaultSlots) {
						defaultSlots[name] = code;
						code = '';
					}
				} else {
					// todo: Пересечение attrs и innerCallList
					const vars = [].concat(
						raw.attrs.map(name => `${name} = attrs.${name}`),
						innerCallList.map(name => `${name} = __slots && __slots.${name} || __super.${name}`)
					);

					vars.unshift('__super = {attrs: attrs' +
						Object.keys(innerDefaultSlotsList).map((name) => {
							return `,\n  ${name}: ${innerDefaultSlotsList[name]}`;
						}).join('') +
					'}');

					CUSTOM_ELEMENTS[name] = 1;
					customElemets.push(
						`function ${name}(attrs, __slots) {\n`,
						(vars.length ? `  var ${vars.join(',\n      ')}\n` : ''),
						`  var __ROOT = "";\n`,
						`  ${content}`,
						`  return __ROOT\n`,
						`}\n`
					);
				}
			} else if (TEXT_TYPE === type) {
				code = push(raw.value);
			} else if (COMMENT_TYPE === type) {
				code = options.comment ? push(`${pad}<!--${raw.value}-->${NL}`) : NL;
			} else if (HIDDEN_CLASS_TYPE === type) {
				code = content + NL;
			} else if (CUSTOM_ELEMENTS[name]) {
				const attrsStr = Object
								.keys(raw.attrs || {})
								.map(name => `${stringify(name)}: ${stringify(raw.attrs[name])}`)
								.join(', ');

				code = `${pad}__ROOT += ${name}({${attrsStr}}`;
				code += node.nodes.length ? `, ${compileSlots(node.nodes)});\n` : `);\n`;
			} else {
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
				.replace(/(__ROOT \+= .*?)";\n*__ROOT \+= "/g, '$1')
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
