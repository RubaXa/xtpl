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
import {compile as compileKeyword} from '../src/keywords';
import {stringify, stringifyAttr, stringifyObjectKey} from '../src/utils';

interface Node {
	type:string;
	computed:boolean; // вариативен с ног, до головы
	hasComputedAttrs:boolean; // вариативны только аттрибуты
	name:string;
	compiledName:string;
	attrs:any;
	compiledAttrs:string;
	value:string;
	compiledValue:string;
	hasComputedValue:boolean;
	children:Node[];
	hasKeywords:boolean;
	hasComputedChildren:boolean;
}

export interface JSONModeOptions {
	debug?:boolean;
}

function toStr(v) {
	return v == null ? '' : (v + '');
}

export default (options:JSONModeOptions = {}) => (bone:Bone) => {
	const UNDEF = 'U';
	const constPrefix = '_$';
	const constObjects = [];
	const defineElems = [];
	const isDefineElems = {};

	let varNum = 0;
	let varMax = 0;

	function preprocessing(bone:Bone):Node {
		const raw:any = bone.raw || {};
		const type = bone.type;

		let name = raw.name;
		let nameDetails = {hasComputedAttrs: false};
		let compiledName = stringify(name, <Bone><any>nameDetails);
		let attrs = raw.attrs || {};
		let compiledAttrs = Object.keys(attrs).map((name:string) => `${stringifyObjectKey(name)}: ${stringifyAttr(name, attrs[name], bone)}`);
		let value = raw.value;
		let valueDetails = {hasComputedAttrs: false};
		let compiledValue = TEXT_TYPE === type ? stringify(value, <Bone><any>valueDetails) : '';
		let hasKeywords = false;
		let hasComputedChildren = false;

		const children = [];

		bone.nodes.forEach((childBone) => {
			const type = childBone.type;

			if (DEFINE_TYPE === type) {
				if (childBone.raw.type === 'parenthesis') {
					throw 'todo: define slot';
				} else {
					const slots = {};
					const node = preprocessing(childBone);

					defineElems.push(node);
					isDefineElems[node.name] = node;
				}
			} else {
				const node = preprocessing(childBone);

				hasKeywords = hasKeywords || KEYWORD_TYPE === type || node.hasKeywords;
				hasComputedChildren = hasComputedChildren || node.computed;

				if (HIDDEN_CLASS_TYPE === type) {
					children.push.apply(children, node.children);
				} else {
					children.push(node);
				}
			}
		});

		return {
			type,
			computed: (
				KEYWORD_TYPE === type ||
				nameDetails.hasComputedAttrs ||
				valueDetails.hasComputedAttrs ||
				(<any>bone).hasComputedAttrs ||
				hasComputedChildren
			),
			name,
			compiledName,
			attrs,
			compiledAttrs: compiledAttrs.length ? `{${compiledAttrs.join(', ')}}` : '',
			value,
			compiledValue,
			children,
			hasComputedValue: valueDetails.hasComputedAttrs,
			hasComputedAttrs: (<any>bone).hasComputedAttrs,
			hasKeywords,
			hasComputedChildren
		};
	}

	function allocateConstObject(code) {
		return code === UNDEF ? code : constPrefix + constObjects.push(code);
	}

	function compileNode(node:Node, computedParent?:boolean, childrenName?:string) {
		const type = node.type;
		const name = node.name;

		let compiledAttrs = node.compiledAttrs || UNDEF;

		if (TEXT_TYPE === type) {
			return compileTextNode(node);
		} else if (TAG_TYPE === type && isDefineElems[name]) {
			if (compiledAttrs === UNDEF && isDefineElems[name].attrs.length) {
				compiledAttrs = '{}';
			}

			return `${name}(${compiledAttrs})`;
		} else {
			let compiledName = node.compiledName || UNDEF;
			let compiledChildren = compileChildren(node.children, node.hasKeywords, node.hasComputedChildren, node.computed);

			if (node.computed) {
				if (!node.hasComputedAttrs) {
					compiledAttrs = allocateConstObject(compiledAttrs);
				}

				if (!node.hasComputedChildren) {
					compiledChildren = allocateConstObject(compiledChildren);
				}
			}

			let beforeCode = '';

			if (compiledChildren instanceof Array) {
				beforeCode += compiledChildren[0];
				compiledChildren = compiledChildren[1];
			}

			if (DEFINE_TYPE === type) {
				let code = `function ${name}(attrs){\n`;

				if (node.attrs.length) {
					code += 'var ' + node.attrs.map(name => `${name} = attrs.${name}`).join('\n') + '\n';
				}

				if (node.children.length === 1) {
					code += `return ${compiledChildren}`;
				} else {
					code += `return {tag: U, attrs: U, children: ${compiledChildren}}`;
				}

				return `${beforeCode}${code}\n}`;
			}

			let tagCode = `{tag: ${compiledName}, attrs: ${compiledAttrs}, children: ${compiledChildren}}`;

			if (!node.computed && computedParent) {
				// Статическая нода
				tagCode = allocateConstObject(tagCode);
			}

			if (ROOT_TYPE === type) {
				tagCode = `return ${tagCode}`;
			} else if (childrenName) {
				tagCode = `${childrenName}.push(${tagCode});\n`;
			}

			return beforeCode + tagCode;
		}
	}

	function compileTextNode({hasComputedValue, value, compiledValue}:Node) {
		if (hasComputedValue) {
			return `S(${compiledValue})`;
		} else {
			return value === compiledValue ? `${value} + ""` : compiledValue;
		}
	}

	function compileChildren(children:Node[], hasKeywords:boolean, hasComputedChildren:boolean, computedParent:boolean) {
		const length = children.length;

		if (length > 0) {
			if (length === 1 && !hasKeywords) {
				return compileNode(children[0], computedParent);
			} else {
				let name = hasKeywords ? `_$$${++varNum}` : null;
				let code = hasKeywords ? `${name} = [];` : '[';

				children.forEach((node, idx) => {
					if (idx > 0 && !hasKeywords) {
						code += ', ';
					}

					if (KEYWORD_TYPE === node.type) {
						const pair = compileKeyword(node.name, node.attrs);
						code += '\n' + pair[0] + '\n';
						code += node.children.map(child => compileNode(child, true, name)).join('\n');
						code += pair[1] + '\n';
					} else {
						code += compileNode(node, computedParent, name);
					}
				});

				varMax = Math.max(varMax, varNum--);
				!hasKeywords && (code += ']');

				return hasKeywords ? [code, name] : code;
			}
		} else {
			return UNDEF;
		}
	}

	const rootNode = preprocessing(bone);
	const results = compileNode(rootNode, true);
	const globals = [];
	const globalVars:string[] = [].concat(
		'U = void 0',
		`S = ${toStr}`,
		constObjects.map((code, idx) => `${constPrefix + (idx + 1)} = ${code}`)
	);

	while (varMax--) {
		globalVars.push(`_$$${varMax + 1}`);
	}

	defineElems.forEach(node => {
		globals.push(compileNode(node, true));
	});

	return {
		before: `var ${globalVars.join(',\n')}\n${globals.join('\n')}`,
		code: results
	};
};
