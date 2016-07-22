import xtplParser, {DTD_TYPE, COMMENT_TYPE, TEXT_TYPE, KEYWORD_TYPE, TAG_TYPE} from 'skeletik/preset/xtpl';
import {compile as compileKeyword} from '../src/keywords';

const _s = JSON.stringify;

export default (options) => (node) => {
	let varNum = 0;
	let maxVarNum = 0;
	const staticFragments = [];

	function processing(node) {
		const raw = node.raw || {};
		const type = node.type;
		const nodes = node.nodes;
		const name = raw.name;
		const attrs = raw.attrs;

		let computed = type === KEYWORD_TYPE;
		const children = nodes.map(node => {
			const child = processing(node);
			computed = computed || child.computed;
			return child;
		});
		
		return {
			type,
			name,
			attrs,
			value: raw.value,
			children,
			computed
		};
	}

	function compile(node, rootVar?, isStatic?) {
		const {type, name, value, attrs, children, computed} = node;
		let code;

		if (type === KEYWORD_TYPE) {
			const pair = compileKeyword(name, attrs);
			let staticPool = [];
			let flush = () => {
				if (staticPool.length) {
					code += `${rootVar}.children.push(${staticPool.join(', ')})\n`;
				}
			};
			
			code = `${pair[0]}\n`;

			children.forEach(child => {
				const res = compile(child, rootVar);

				if (child.computed) {
					flush();
					code += res
				} else {
					staticPool.push(res);
				}
			});

			flush();
			code += `\n${pair[1]}`;
		} else if (type === TEXT_TYPE) {
			code = _s(value);
		} else if (type === COMMENT_TYPE) {
			code = `{tag: "!", children: ${_s(value)} }`;
		} else {
			const length = children.length;
			code = `{tag: ${_s(name)}`;

			if (length === 1 && children[0].type === TEXT_TYPE) {
				code += `, children: ${compile(children[0])}}`;
			} else if (length) {
				let staticChildren = true;
				let localVar;
				
				code += ', children: ' + (length > 1 || computed ? '[' : '');
				
				children.forEach((child, i) => {
					if (child.computed) {
						if (staticChildren) {
							localVar = `__V${varNum++}`;
							staticChildren = false;
							
							code = `\n${localVar} = ${code}]}\n${rootVar}.children.push(${localVar})\n`;
						}

						code += compile(child, localVar);
					} else {
						const next = compile(child, null, !computed);

						if (staticChildren) {
							code += (i ? ', ' : '') + next;
						} else {
							code += `\n${rootVar}.children.push(${next})\n`;
						}
					}
				});

				if (staticChildren) {
					code += (length > 1 ? ']' : '') + '}';
				} else {
					maxVarNum = Math.max(maxVarNum, varNum);
					varNum--;
				}
			} else {
				code += '}';
			}

			if (!computed && !isStatic) {
				return `__S${staticFragments.push(code)}`;
			}
		}

		return code;
	}

	const code = compile(processing(node), '__ROOT');

	return {
		before: 'var ' + [
			Array.apply(null, Array(5)).map((_, i) => `__V${i}`).join(', '),
			staticFragments.map((code, i) => `__S${i+1} = ${code}`).join(',\n')
		].join(','),
		code,
		export: '__ROOT'
	};
};