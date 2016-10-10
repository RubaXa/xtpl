import xtpl, {IBone, BoneConstructor} from '../xtpl';
import {EXPRESSION_TYPE} from "../syntax/utils";

const {
	ROOT_TYPE,
	COMMENT_TYPE,
	TEXT_TYPE,
	KEYWORD_TYPE,
	TAG_TYPE,
	HIDDEN_CLASS_TYPE,
	DEFINE_TYPE,
	CALL_TYPE,
	htmlProps,
} = xtpl.syntaxUtils;

const {
	stringify,
	stringifyAttr,
} = xtpl.utils;

interface Node {
	type:string;
	computed:boolean; // вариативен с ног, до головы
	hasComputedAttrs:boolean; // вариативны только аттрибуты
	name:string;
	compiledName:string;
	attrs:any;
	compiledAttrs:Array<[string, string, boolean]>;
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

export default (options:JSONModeOptions = {}) => (bone:IBone, BoneClass:BoneConstructor, {scope:scopeVars}) => {
	const UNDEF = '__STDLIB_NIL';
	const TO_STR = '__STDLIB_TO_STRING';
	const RET_STR = '__STDLIB_RETURN_EMPTY_STRING';
	const constPrefix = '_$';
	const constObjects = [];

	const customElems = [];
	const isCustomElems = {};
	const fragments = [];

	let gid = 0;
	let varNum = 0;
	let varMax = 0;

	function preprocessing(bone:IBone, slots?:Node[], usedSlots?:any):Node {
		const raw:any = bone.raw || {};
		const type = bone.type;

		let name = raw.name;
		let nameDetails = {hasComputedAttrs: false};
		let compiledName = stringify(name, TO_STR, <IBone><any>nameDetails);
		let attrs = raw.attrs || {};
		let hasComputedAttrs = false;
		let compiledAttrs = Object.keys(attrs).map((name:string) => {
			let attrDetails = {hasComputedAttrs: false};
			const value = stringifyAttr(
				name,
				attrs[name],
				TO_STR,
				attrDetails
			);
			hasComputedAttrs = hasComputedAttrs ||  attrDetails.hasComputedAttrs;
			return [name, value, attrDetails.hasComputedAttrs];
		});
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
				hasComputedAttrs ||
				hasComputedChildren
			),
			name,
			compiledName,
			attrs,
			compiledAttrs,
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
	function compileNode(parentName:string, node:Node, updaters) {
		const type = node.type;
		const name = node.name;
		const attrs = node.attrs;
		const slots = node.slots;
		const children = node.children;

		if (KEYWORD_TYPE === type) {
			if ('if' === name) {
				const condName = `__IF_${++gid}`;
				const condUpd = [];
				const condBaseArgs = `ctx, ${++gid}`;

				fragments.push(`
					function ${condName}(frag) {
						return ${node.attrs.test} ? frag || ${condName}_exec() : null;
					}
					
					function ${condName}_exec() {
						var ctx = {};
						var __fragIf = fragment(${parentName});
						${compileChildren('__fragIf', children, condUpd)}
						return {
							frag: __fragIf,
							update: function () {
								${condUpd.join('\n')}
							}
						};
					}
				`);

				updaters.push(`updateCondition(${condBaseArgs})`);

				return `condition(${parentName}, ${condBaseArgs}, [${condName}])`;
			} else if ('for' === name) {
				const forName = `__FOR_ITERATOR_${++gid}`;
				const forKey = attrs.key || '$index';
				const forUpd = [];
				const forBaseArgs = `ctx, ${++gid}, ${attrs.data}, ${stringify(attrs.id)}, ${forName}`;

				fragments.push(`
					function ${forName}(${attrs.as}, ${forKey}) {
						var ctx = {};
						var __fragFor = fragment(${parentName});
						${compileChildren('__fragFor', children, forUpd)}
						return {
							frag: __fragFor,
							index: ${forKey},
							update: function (${attrs.as}, ${forKey}) {
								${forUpd.join('\n')}
							}
						};
					}
				`);

				updaters.push(`updateForeach(${forBaseArgs})`);

				return `foreach(${parentName}, ${forBaseArgs})`;
			} else {
				throw 'todo kw';
			}
		} else if (TEXT_TYPE === type) {
			return compileTextNode(parentName, node, updaters);
		} else if (TAG_TYPE === type) {
			const varName = `__x` + ++gid;
			return [`var ${varName} = node(${parentName}, ${node.compiledName})`].concat(
				node.compiledAttrs.map(([name, value, isExpr]) => {
					const fn = htmlProps.hasOwnProperty(name) ? 'prop' : 'attr';
					const expr = `${fn}(${varName}, ${stringify(htmlProps[name] || name)}, ${value})`;
					isExpr && updaters.push(expr);
					return expr;
				}),
			 	compileChildren(varName, children, updaters).join('\n')
			).join('\n');
		}
	}

	function compileTextNode(parentName:string, {hasComputedValue, value, compiledValue}:Node, updaters) {
		if (hasComputedValue) {
			return value.map(item => {
				if (EXPRESSION_TYPE === item.type) {
					const args = `ctx, ${++gid}, ${item.raw}`;
					updaters.push(`updateValue(${args})`);
					return `value(${parentName}, ${args})`;
				} else {
					return `text(${parentName}, ${stringify(item)})`;
				}
			}).join('\n');
		} else {
			return `text(${parentName}, ${compiledValue})`;
		}
	}

	function compileChildren(parentName:string, children:Node[], updaters:string[]) {
		return children.map(child => compileNode(parentName, child, updaters));
	}

	function compileFragment(node:Node) {
		const updaters = [];
		const children = rootNode.children;
		const length = children.length;
		const first = children[0];
		let res = `var __frag = fragment()\n`;

		if (ROOT_TYPE === node.type) {
			if (length === 1 && (first.type === TEXT_TYPE && first.hasComputedValue && first.value.length > 1)) {
				res += compileNode('__frag', first, updaters);
			} else if (length > 1) {
				throw 'todo';
				// res = `nodes("#", ${compileChildren(children, updaters)})`;
			} else {
				res += compileNode('__frag', first, updaters);
			}
		} else {
			throw 'todo';
			//res = compileNode(node, updaters);
		}

		return `
			var ctx = {}
			${res}
			${fragments.join('\n')}
			return {
				container: null,
				mountTo: function (container) {
					this.container = container;
					__frag.mountTo(container);
					return this;
				},
				update: function (__NEWSCOPE__) {
					__SCOPE__ = __NEWSCOPE__
					${scopeVars ? scopeVars.map(name => `${name} = __NEWSCOPE__.${name}`).join('\n') : ''}
					${updaters.join('\n')}
				}
			}
		`;
	}

	const rootNode = preprocessing(bone);
	const results = compileFragment(rootNode);

	const globals = [];
	const globalVars:string[] = [].concat(
		constObjects.map((code, idx) => `${constPrefix + (idx + 1)} = ${code}`)
	);

	while (varMax--) {
		globalVars.push(`_$$${varMax + 1}`);
	}

	customElems.forEach(node => {
		// globals.push(compileNode(node));
	});

	return {
		before: (globalVars.length ? `var ${globalVars.join(',\n')}\n` : '') + globals.join('\n'),
		code: results
	};
};
