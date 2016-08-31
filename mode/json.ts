import {Bone} from 'skeletik';
import {
	ROOT_TYPE,
	DTD_TYPE,
	COMMENT_TYPE,
	TEXT_TYPE,
	KEYWORD_TYPE,
	TAG_TYPE,
	HIDDEN_CLASS_TYPE,
	DEFINE_TYPE,
	CALL_TYPE,
} from '../syntax/utils';
import xtplParser from '../syntax/xtpl';
import {compile as compileKeyword} from '../src/keywords';
import {stringify, stringifyAttr} from '../src/utils';

interface Node {
	type:string;
	name:string;
	compiledName:string;
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
	const defines = [];
	const staticFragments = [];
	const customElements = {};

	function processing(node:Bone):Node {
		const raw = node.raw || {};
		const type = node.type;
		const nodes = node.nodes;
		const value = stringify(raw.value, node);
		const compiledName = (type === TAG_TYPE) ? stringify(raw.name, node) : raw.name;
		const attrs = raw.attrs || {};
		const attrsStr = (type === TAG_TYPE) && Object.keys(attrs || {})
							.map(attr => `${stringify(attr)}: ${stringifyAttr(attr, attrs[attr], node)}`)
							.join(', ');

		let computed = (KEYWORD_TYPE === type) || (CALL_TYPE === type);
		let hasComputedAttrs = (<any>node).hasComputedAttrs;

		const children = [];
		
		nodes.forEach(node => {
			const child = processing(node);

			if (child.type === DEFINE_TYPE) {
				const raw = node.raw;
				
				if (raw.type === 'bracket') {
					customElements[raw.name] = {}; // слоты
					defines.push(compile(child, false, customElements[raw.name]));
				} else {
					throw 'todo';
				}
			} else {
				computed = computed || child.computed;
				hasComputedAttrs = hasComputedAttrs || child.hasComputedAttrs;

				children.push(child);
			}
		});
		
		return {
			type,
			name: raw.name,
			compiledName,
			attrs: raw.args || attrs,
			attrsStr,
			value,
			children,
			computed,
			hasComputedAttrs
		};
	}

	function compile(node, hasRoot:boolean = true, slots:any = null) {
		function build(pad:string, node:Node, rootVar?:string, isStatic?:boolean):string {
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
					const res = build(`${pad}  `, child, rootVar);

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
			} else if (CALL_TYPE === type) {
				code = `${name} && ${rootVar}.children.push(${name}(${node.attrs.join(',')}));`;
			} else if (DEFINE_TYPE === type) {
				code = [
					`function ${name}(attrs) {`,
					attrs.length ? `var ${attrs.map(name => `${name} = attrs.${name}`).join(', ')};` : '',
					compile(children[0]),
					`}`
				].join('\n');
			} else if (customElements[name]) {
				return `${name}(${attrsStr ? `{${attrsStr}}` : ''})`;
			} else {
				const length = children.length;

				if (HIDDEN_CLASS_TYPE === type) {
					// todo: Неоптимальненько! Нужно убрать это звено.
					code = '{tag: undefined';
				} else {
					code = `{tag: ${node.compiledName}${attrsStr ? `, attrs: {${attrsStr}}` : ''}`;
				}

				if (length === 1 && children[0].type === TEXT_TYPE) {
					code += `, children: ${build('', children[0])}}`;
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

							code += build(pad, child, localVar);
						} else {
							const next = build(pad, child, null, !computed && !hasComputedAttrs);

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

		let code = build('', node, '__ROOT').trim();	

		if (hasRoot) {
			let exportName;
			
			// Наверно есть способ лучше, но мне его лень искать, пусть так
			code = code.replace(/__ROOT\.children\.push\((.*?)\)\n/, (_, name) => {
				exportName = name;
				return '';
			});

			code = exportName ? `${code}\nreturn ${exportName}` : `return (${code})`;
		}

		return code;
	}

	let code = compile(processing(node));

	let vars = [].concat(
		Array.apply(null, Array(maxVarNum)).map((_, i) => `__V${i}`),
		staticFragments.map((code, i) => `__S${i+1} = ${code}`)
	);

	return {
		before: defines.join('\n') + '\n' + (vars.length ? `var ${vars.join(', ')};\n` : ''),
		code
	};
};