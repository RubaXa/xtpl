import {Bone} from 'skeletik';
import xtplParser, {ROOT_TYPE, DTD_TYPE, COMMENT_TYPE, TEXT_TYPE, KEYWORD_TYPE, TAG_TYPE} from 'skeletik/preset/xtpl';
import {compile as compileKeyword} from '../src/keywords';
import {interpolate} from '../src/utils';

const _s = JSON.stringify;
const ROOT = '__ROOT';

interface Node {
	type:string;
	name:string;
	attrs:any;
	value:string;
	children:Node[];
	computed:boolean;
}

export interface JSONModeOptions {
	debug?:boolean;
}

export default (options:JSONModeOptions = {}) => (node:Bone) => {
	let varNum = 0;
	let maxVarNum = 1;
	const staticFragments = [];

	function processing(node:Bone):Node {
		const raw = node.raw || {};
		const type = node.type;
		const nodes = node.nodes;
		const name = raw.name;
		const attrs = raw.attrs;

		let computed = (type === KEYWORD_TYPE);

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

	function compile(pad:string, node:Node, rootVar?:string, isStatic?:boolean):string {
		const {type, name, value, attrs, children, computed} = node;
		let code;

		if (type === KEYWORD_TYPE) {
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
		} else if (type === TEXT_TYPE) {
			code = interpolate(_s(value));
		} else if (type === COMMENT_TYPE) {
			code = `{tag: "!", children: ${_s(value)} }`;
		} else {
			const length = children.length;
			const attrsStr = Object
								.keys(attrs || {})
								.map(name => `${_s(name)}: ${interpolate(_s(attrs[name]))}`)
								.join(', ');

			code = `{tag: ${_s(name)}${attrsStr ? `, attrs: {${attrsStr}}` : ''}`;

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
						const next = compile(pad, child, null, !computed);

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

			if (!computed && !isStatic) {
				code = `__S${staticFragments.push(code)}`;
				
				if (rootVar === ROOT) {
					code = `${pad}${rootVar}.children.push(${code})\n`;
				}
			}
		}

		return code;
	}

	const code = compile('', processing(node), '__ROOT').trim();

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
		before: 'var ' + [
			'__ROOT = {children:[]}',
			Array.apply(null, Array(maxVarNum)).map((_, i) => `__V${i}`).join(', '),
			staticFragments.map((code, i) => `__S${i+1} = ${code}`).join(',\n')
		].join(','),
		code,
		export: '__ROOT.children[0]'
	};
};