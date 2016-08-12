import {Bone} from 'skeletik';
import {
	ROOT_TYPE,
	DTD_TYPE,
	COMMENT_TYPE,
	TEXT_TYPE,
	KEYWORD_TYPE,
	TAG_TYPE,
	HIDDEN_CLASS_TYPE,
} from '../syntax/utils';
import xtplParser from '../syntax/xtpl';
import {compile as compileKeyword} from '../src/keywords';
import {stringify, stringifyAttr} from '../src/utils';

interface Node {
	type:string;
	name:string;
	attrs:any;
	attrsStr:string;
	value:string;
	children:Node[];
	computed:boolean;
	hasComputedAttrs:boolean;
}

export interface JSONModeOptions {
	debug?:boolean;
}

export default (options:JSONModeOptions = {}) => (node:Bone) => {
	let varNum = 0;
	let maxVarNum = 0;
	let hasRoot = true;
	const staticFragments = [];

	function processing(node:Bone):Node {
		const raw = node.raw || {};
		const type = node.type;
		const nodes = node.nodes;
		const name = (type === TAG_TYPE) ? stringify(raw.name, node) : raw.name;
		const value = stringify(raw.value, node);
		const attrs = raw.attrs || {};
		const attrsStr = (type === TAG_TYPE) && Object.keys(attrs || {})
							.map(name => `${stringify(name)}: ${stringifyAttr(name, attrs[name], node)}`)
							.join(', ');

		let computed = (type === KEYWORD_TYPE);
		let hasComputedAttrs = (<any>node).hasComputedAttrs;

		const children = nodes.map(node => {
			const child = processing(node);
			computed = computed || child.computed;
			hasComputedAttrs = hasComputedAttrs || child.hasComputedAttrs;
			return child;
		});
		
		return {
			type,
			name,
			attrs,
			attrsStr,
			value,
			children,
			computed,
			hasComputedAttrs
		};
	}

	function compile(pad:string, node:Node, rootVar?:string, isStatic?:boolean):string {
		const {type, name, value, attrs, attrsStr, children, computed, hasComputedAttrs} = node;
		let code;

		if (KEYWORD_TYPE === type) {
			const pair = compileKeyword(name, attrs);
			let staticPool = [];
			let flush = () => {
				if (staticPool.length) {
					code += `${pad}  ${rootVar}.children.push(${staticPool.join(', ')})\n`;
				}
			};
			
			code = `${pad}${pair[0]}\n`;

			children.forEach(child => {
				const res = compile(`${pad}  `, child, rootVar);

				if (child.computed) {
					flush();
					code += res
				} else {
					staticPool.push(res);
				}
			});

			flush();
			code += `${pad}${pair[1]}\n`;
		} else if (TEXT_TYPE === type) {
			code = value;
		} else if (COMMENT_TYPE === type) {
			code = `{tag: "!", children: ${stringify(value)} }`;
		} else {
			const length = children.length;

			if (HIDDEN_CLASS_TYPE === type) {
				// todo: Неоптимальненько! Нужно убрать это звено.
				code = '{tag: undefined';
			} else {
				code = `{tag: ${name}${attrsStr ? `, attrs: {${attrsStr}}` : ''}`;
			}

			if (length === 1 && children[0].type === TEXT_TYPE) {
				code += `, children: ${compile('', children[0])}}`;
			} else if (length) {
				let staticChildren = true;
				let localVar;
				
				code += ', children: ' + (length > 1 || computed ? '[' : '');
				
				children.forEach((child, i) => {
					if (child.computed) {
						if (staticChildren) {
							localVar = `__V${varNum++}`;
							staticChildren = false;
							
							code = `${pad}${localVar} = ${code}]}\n${pad}${rootVar}.children.push(${localVar})\n`;
						}

						code += compile(pad, child, localVar);
					} else {
						const next = compile(pad, child, null, !computed && !hasComputedAttrs);

						if (staticChildren) {
							code += (i ? ', ' : '') + next;
						} else {
							code += `${pad}${rootVar}.children.push(${next})\n`;
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

			if (!computed && !isStatic && !hasComputedAttrs) {
				code = `__S${staticFragments.push(code)}`;
				
				if (rootVar === '__ROOT') {
					hasRoot = false;
					code = `return ${code}`;
				}
			}
		}

		return code;
	}

	let code = compile('', processing(node), '__ROOT').trim();	
	let vars = [].concat(
		Array.apply(null, Array(maxVarNum)).map((_, i) => `__V${i}`),
		staticFragments.map((code, i) => `__S${i+1} = ${code}`)
	);

	if (hasRoot) {
		let exportName;
		
		// Наверно есть способ лучше, но мне его лень искать, пусть так
		code = code.replace(/__ROOT\.children\.push\((.*?)\)\n/, (_, name) => {
			exportName = name;
			return '';
		});

		code = exportName ? `${code}\nreturn ${exportName}` : `return (${code})`;
	}

	return {
		before: (vars.length ? `var ${vars.join(', ')};\n` : ''),
		code
	};
};