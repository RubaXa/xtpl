import xtpl, {IBone, BoneConstructor} from '../xtpl';

const {
	ROOT_TYPE,
	COMMENT_TYPE,
	TEXT_TYPE,
	KEYWORD_TYPE,
	TAG_TYPE,
	HIDDEN_CLASS_TYPE,
	DEFINE_TYPE,
	CALL_TYPE,
} = xtpl.syntaxUtils;

const {
	stringify,
	stringifyAttr,
	stringifyObjectKey
} = xtpl.utils;

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
	slots:Node[];
	calls:string[];
	isSlot:boolean;
}

export interface JSONModeOptions {
	debug?:boolean;
}

const R_SUPER_CALL = /^super\./;

export default (options:JSONModeOptions = {}) => (bone:IBone, BoneClass:BoneConstructor) => {
	const UNDEF = '__STDLIB_NIL';
	const TO_STR = '__STDLIB_TO_STRING';
	const RET_STR = '__STDLIB_RETURN_EMPTY_STRING';
	const constPrefix = '_$';
	const constObjects = [];

	const customElems = [];
	const isCustomElems = {};

	let varNum = 0;
	let varMax = 0;

	function preprocessing(bone:IBone, slots?:Node[], usedSlots?:any):Node {
		const raw:any = bone.raw || {};
		const type = bone.type;

		let name = raw.name;
		let nameDetails = {hasComputedAttrs: false};
		let compiledName = stringify(name, TO_STR, <IBone><any>nameDetails);
		let attrs = raw.attrs || {};
		let compiledAttrs = Object.keys(attrs).map((name:string) => `${stringifyObjectKey(name)}: ${stringifyAttr(name, attrs[name], TO_STR, bone)}`);
		let value = raw.value;
		let valueDetails = {hasComputedAttrs: false};
		let compiledValue = TEXT_TYPE === type ? stringify(value, TO_STR, <IBone><any>valueDetails) : '';
		let hasKeywords = false;
		let hasComputedChildren = false;
		let isCustomElem = isCustomElems[name];

		const children = [];
		const overridenSlots = isCustomElem ? [] : null;
		const defaultSlot = isCustomElem ? [] : null;

		if (CALL_TYPE === type) {
			attrs = raw.args;
			usedSlots && (usedSlots[name] = true);
		}

		bone.nodes.forEach((childBone:IBone) => {
			const type = childBone.type;

			if (DEFINE_TYPE === type) {
				if (childBone.raw.type === 'parenthesis') {
					// Определение слота
					const node = preprocessing(childBone);

					node.isSlot = true;
					(isCustomElem ? overridenSlots : slots).push(node);
					usedSlots && (usedSlots[node.name] = true);

					hasComputedChildren = hasComputedChildren || node.computed;
				} else {
					// Создание custom-элемента
					usedSlots = {};

					const slots = [];
					const node = preprocessing(childBone, slots, usedSlots);

					node.slots = slots;
					node.calls = Object.keys(usedSlots);
					customElems.push(node);
					isCustomElems[node.name] = node;
				}
			} else {
				const node = preprocessing(childBone, null, usedSlots);

				hasKeywords = hasKeywords || KEYWORD_TYPE === type || node.hasKeywords;
				hasComputedChildren = hasComputedChildren || node.computed;

				if (isCustomElem) {
					defaultSlot.push(node);
				} else if (HIDDEN_CLASS_TYPE === type) {
					children.push.apply(children, node.children);
				} else {
					children.push(node);
				}
			}
		});

		if (isCustomElem && defaultSlot.length) {
			const __default = preprocessing(new BoneClass(DEFINE_TYPE, {type: 'parenthesis', name: '__default'}), null, usedSlots);
			__default.children = defaultSlot;
			overridenSlots.push(__default);
		}

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
			hasComputedChildren,
			calls: null,
			slots: overridenSlots,
			isSlot: false
		};
	}

	// Выделение статического объекта (todo: одинаковые блоки)
	function allocateConstObject(code) {
		return code === UNDEF ? code : constPrefix + constObjects.push(code);
	}

	// Компиляция подготовленной ноды
	function compileNode(node:Node, computedParent?:boolean, childrenName?:string) {
		const type = node.type;
		const name = node.name;
		const attrs = node.attrs;
		const slots = node.slots;

		let code;
		let compiledAttrs = node.compiledAttrs || UNDEF;

		if (TEXT_TYPE === type) {
			// Текст
			code = compileTextNode(node);
		} else if (COMMENT_TYPE === type) {
			// Комментарий
			code = `{tag: '!', children: ${node.compiledValue}}`;
		} else if (TAG_TYPE === type && isCustomElems[name]) {
			// Пользовательский тег
			if (compiledAttrs === UNDEF && isCustomElems[name].attrs.length) {
				compiledAttrs = '{}';
			}

			if (node.computed && !node.hasComputedAttrs) {
				compiledAttrs = allocateConstObject(compiledAttrs);
			}

			code = `${name}(${compiledAttrs}`;

			if (slots.length) {
				code += `, {${slots.map(slot => `${slot.name}: ${compileNode(slot, true)}`).join('\n,')}}`;
			} else if (isCustomElems[name].calls.length) {
				code += ', {}';
			}

			code += ')';

			if (!node.computed) {
				code = allocateConstObject(code);
			}
		} else if (CALL_TYPE === type) {
			if (R_SUPER_CALL.test(name)) {
				code = `__${name}(null, ${attrs.join(', ')})`;
			} else {
				code = `(typeof ${name} !== 'undefined' ? ${name} : __super.${name} || ${RET_STR})(${[].concat('__super', attrs).join(', ')})`;
			}
		} else {
			// Обычные теги
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
				code = `function ${name}(${node.isSlot ? [].concat('__super', attrs).join(', ') : `attrs, __slots`}) {\n`;

				if (node.calls && node.calls.length) {
					code += `var ${node.calls.map(name => `${name} = __slots.${name}`).join(',\n')}\n`;
				}

				if (slots) {
					// todo: allocateConstObject
					code += 'var __super = {';
					code += slots.map(node => `${node.name}: ${compileNode(node, true)}`).join(',\n');
					code += '}\n';
				}

				if (!node.isSlot && attrs.length) {
					code += 'var ' + attrs.map(name => `${name} = attrs.${name}`).join(',\n') + '\n';
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

		// Если не вышли в `else` (да, лучше не придумалось)
		return childrenName ? `${childrenName}.push(${code});\n` : code;
	}

	function compileTextNode({hasComputedValue, value, compiledValue}:Node) {
		if (hasComputedValue) {
			return compiledValue;
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
						const pair = xtpl.keywords.compile(node.name, node.attrs);
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
		constObjects.map((code, idx) => `${constPrefix + (idx + 1)} = ${code}`)
	);

	while (varMax--) {
		globalVars.push(`_$$${varMax + 1}`);
	}

	customElems.forEach(node => {
		globals.push(compileNode(node, true));
	});

	return {
		before: (globalVars.length ? `var ${globalVars.join(',\n')}\n` : '') + globals.join('\n'),
		code: results
	};
};
