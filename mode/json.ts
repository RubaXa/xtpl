import xtplParser, {DTD_TYPE, COMMENT_TYPE, TEXT_TYPE, KEYWORD_TYPE, TAG_TYPE} from 'skeletik/preset/xtpl';

let gid = 0;
const _s = JSON.stringify;

const kw = {
	'if': (attrs) => [`if (${attrs.test}) {`, `}`]
};

export default {
	compile: function compile(node) {
		const raw = node.raw || {};
		const type = node.type;
		const nodes = node.nodes;
		const name = raw.name;
		const attrs = raw.attrs;
		
		return {
			kw: type === KEYWORD_TYPE,
			to: (varName, computed) => {
				const children = nodes.map(compile);

				if (type === KEYWORD_TYPE) {
					const pair = kw[name](raw.attrs);
					return pair[0] + children.map(child => child.to(varName, true)) + pair[1];
				} else if (type === TEXT_TYPE || type === COMMENT_TYPE) {
					return _s(raw.value);
				} else {
					let code = `{tag: ${_s(name)}`;

					if (children.length) {

					} else {
						code = '}';
						return computed ? `${varName}.children.push(${code})` : code;
					}
				}
			}
		};
	}
};
