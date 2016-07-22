import xtplParser, {DTD_TYPE, COMMENT_TYPE, TEXT_TYPE, KEYWORD_TYPE, HIDDEN_CLASS_TYPE} from 'skeletik/preset/xtpl';

const _s = JSON.stringify;

const SHORT = {
	area: 1, base: 1, br: 1, col: 1, command: 1, embed: 1, hr: 1, img: 1,
	input: 1, keygen: 1, link: 1, meta: 1, param: 1, source: 1, wbr: 1
};

export default (options:any = {}) => (node) => {
	const {prettify} = options;
	const NL = prettify ? '\n' : '';

	function push(value) {
		return value ? `__ROOT += ${_s(value)};\n` : value;
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
			var hasText = false;
			var content = node.nodes.map(function (child) {
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
			} else if (type === 'text') {
				code = push(raw.value);
			} else if (type === 'comment') {
				code = push(`${pad}<!--${raw.value}-->${NL}`);
			} else if (HIDDEN_CLASS_TYPE === type) {
				return content + NL;
			} else {
				const name = raw.name;
				const attrs = Object.keys(raw.attrs || {}).map(name => ` ${name}="${raw.attrs[name]}"`).join('');

				code = `${pad}<${name}${attrs}`;

				if (SHORT[name]) {
					code = push(`${code}/>${NL}`);
				} else {
					code = push(code + '>') + content + push(`</${name}>${NL}`);
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

	return clean(compile(node, ''));
};