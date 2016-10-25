import xtpl, {IBone, BoneConstructor} from '../xtpl';
import {EXPRESSION_TYPE} from "../syntax/utils";
import * as stddom from "../src/stddom";

type COMPILED_ATTR = [string, string, boolean];

const {htmlProps} = stddom;

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
} = xtpl.utils;

interface Node {
	type:string;
	computed:boolean; // вариативен с ног, до головы
	hasComputedAttrs:boolean; // вариативны только аттрибуты
	name:string;
	compiledName:string;
	hasComputedName:boolean;
	attrs:any;
	compiledAttrs:Array<COMPILED_ATTR>;
	value:string;
	compiledValue:string;
	hasComputedValue:boolean;
	children:Node[];
	hasKeywords:boolean;
	hasComputedChildren:boolean;
	slots:Node[];
	calls:string[];
	isSlot:boolean;
	alternate:Node[];
	wsBefore:boolean
	wsAfter:boolean;
}

export interface LiveModeOptions {
	/** Заинлайнить stdom */
	stddom?:boolean;

	debug?:boolean;
}

const R_SUPER_CALL = /^super\./;

export default (options:LiveModeOptions = {}) => (bone:IBone, BoneClass:BoneConstructor, {scope:scopeVars}) => {
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

		let compiledAttrs:Array<COMPILED_ATTR> = Object.keys(attrs).map((name:string):COMPILED_ATTR => {
			let attrDetails = {hasComputedAttrs: false};
			const value = stringifyAttr(
				name,
				attrs[name],
				htmlProps[name] || /^on-/.test(name) ? null : TO_STR,
				<IBone><any>attrDetails
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
				} else if (KEYWORD_TYPE === type && childBone.raw.name === 'else') {
					children[children.length - 1].alternate.push(node);
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
			hasComputedName: nameDetails.hasComputedAttrs,
			hasComputedValue: valueDetails.hasComputedAttrs,
			hasComputedAttrs,
			hasKeywords,
			hasComputedChildren,
			calls: null,
			slots: overridenSlots,
			isSlot: false,
			alternate: [],
			wsBefore: raw.wsBefore,
			wsAfter: raw.wsAfter,
		};
	}

	// Выделение статического объекта (todo: одинаковые блоки)
	function allocateConstObject(code) {
		return `${constPrefix + constObjects.push(code)}.cloneNode(true)`;
	}

	// Компиляция подготовленной ноды
	function compileNode(parentName:string, node:Node, updaters, fragments) {
		const type = node.type;
		const name = node.name;
		const attrs = node.attrs;
		const slots = node.slots;
		const children = node.children;

		if (KEYWORD_TYPE === type) {
			if ('anim' === name) {
				return `
					__anim(${node.attrs.name}, ${parentName}, function () {
						${compileChildren(parentName, children, updaters, fragments).join('\n')}
					});
				`;
			} else if ('if' === name || 'else' === name) {
				const condBaseId = ++gid;
				const condNames = [node].concat(node.alternate).map((node) => {
					const condUpd = [];
					const condName = `__IF_${++gid}`;
					const children = node.children;

					fragments.push(`
						function ${condName}(frag) {
							return ${node.attrs.test || 'true'} ? frag || ${condName}_exec() : null;
						}
						
						function ${condName}_exec() {
							var ctx = {};
							var __fragIf = __fragment();
							${compileChildren('__fragIf', children, condUpd, fragments).join('\n')}
							return {
								frag: __fragIf,
								update: function () {
									${condUpd.join('\n')}
								}
							};
						}
					`);

					return condName;
				});

				updaters.push(`__updateCondition(ctx[${condBaseId}])`);

				return `__condition(${parentName}, ctx, ${condBaseId}, [${condNames.join(', ')}])`;
			} else if ('for' === name) {
				const forName = `__FOR_ITERATOR_${++gid}`;
				const forKey = attrs.key || '$index';
				const forUpd = [];
				const forId = ++gid;
				const forBaseArgs = `${attrs.data}, ${stringify(attrs.id)}, ${forName}`;
				const forFrags = [];

				fragments.push(`
					function ${forName}(${attrs.as}, ${forKey}) {
						var ctx = {};
						var __fragFor = __fragment();
						${compileChildren('__fragFor', children, forUpd, forFrags).join('\n')}
						${forFrags.join('\n')}
						return {
							frag: __fragFor,
							index: ${forKey},
							update: function (__${attrs.as}, __${forKey}) {
								${attrs.as} = __${attrs.as}
								${forKey} = __${forKey}
								${forUpd.join('\n')}
							}
						};
					}
				`);

				updaters.push(`__updateForeach(ctx[${forId}], ${forBaseArgs})`);

				return `__foreach(${parentName}, ctx, ${forId}, ${forBaseArgs})`;
			} else {
				throw 'todo kw';
			}
		} else if (TEXT_TYPE === type) {
			return compileTextNode(parentName, node, updaters, fragments);
		} else if (TAG_TYPE === type) {
			const tagId = ++gid;
			const varName = `__x` + tagId;

			let code = [];

			if (node.hasComputedName || node.hasComputedAttrs) {
				code.push(`__liveNode(${parentName}, ctx, ${tagId}, ${node.compiledName})`);
				node.hasComputedName && updaters.push(`__updateLiveNode(ctx[${tagId}], ${node.compiledName})`);
			} else {
				code.push(`__node(${parentName}, ${node.compiledName})`);
			}

			code = code.concat(
				node.compiledAttrs.map((attr:COMPILED_ATTR):string => {
					let fn;
					let expr = varName;
					let [name, value, isExpr] = attr;

					if (/^on-/.test(name)) {
						fn = '__event';
						name = name.substr(3);
						expr = `ctx[${tagId}]`;
					} else if (isExpr || node.hasComputedName) {
						fn = htmlProps.hasOwnProperty(name) ? '__dProp' : '__dAttr';
						expr = `ctx[${tagId}]`;
					} else {
						fn = htmlProps.hasOwnProperty(name) ? '__prop' : '__attr';
					}
					
					expr = `${fn}(${expr}, ${stringify(htmlProps[name] || name)}, ${value})`;

					isExpr && updaters.push(expr);

					return expr;
				}),
			 	compileChildren(varName, children, updaters, fragments)
			);

			node.wsBefore && code.unshift(`__text(${parentName}, ' ')`);
			node.wsAfter && code.push(`__text(${parentName}, ' ')`);

			return `var ${varName} = ${code.join('\n')}`;
		}
	}

	function compileTextNode(parentName:string, {hasComputedValue, value, compiledValue}:Node, updaters, fragments) {
		if (hasComputedValue) {
			return (value as any).map((item:any) => {
				if (EXPRESSION_TYPE === item.type) {
					const id = ++gid;
					updaters.push(`__updateValue(ctx[${id}], ${item.raw})`);
					return `__value(${parentName}, ctx, ${id}, ${item.raw})`;
				} else {
					return `__text(${parentName}, ${stringify(item)})`;
				}
			}).join('\n');
		} else {
			return `__text(${parentName}, ${compiledValue})`;
		}
	}

	function compileChildren(parentName:string, children:Node[], updaters:string[], fragments) {
		return children.map(child => compileNode(parentName, child, updaters, fragments));
	}

	function compileFragment(node:Node) {
		const updaters = [];
		const children = rootNode.children;
		const length = children.length;
		const first = children[0];
		let res = `var __frag = __fragment()\n`;

		if (ROOT_TYPE === node.type) {
			if (length === 1 && (first.type === TEXT_TYPE && first.hasComputedValue && first.value.length > 1)) {
				res += compileNode('__frag', first, updaters, fragments);
			} else if (length > 1) {
				// throw 'todo';
				res += compileChildren('__frag', node.children, updaters, fragments).join('\n');
			} else {
				res += compileNode('__frag', first, updaters, fragments);
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
	const globalVars:string[] = [];

	while (varMax--) {
		globalVars.push(`_$$${varMax + 1}`);
	}

	customElems.forEach(node => {
		// globals.push(compileNode(node));
	});

	if (options.stddom) {
		globalVars.push('__STDDOM = (function (exports) {' + Object.keys(stddom).map(name => {
			const value = stddom[name];

			return `
				var ${name} = ${typeof value === 'function' ? value.toString() : JSON.stringify(value)}
				exports.${name} = ${name}
			`;
		}).join('\n') + '\nreturn exports;\n})({})')
	}
	
	// Export DOM methods
	(
		'fragment text value node liveNode event prop attr dProp dAttr condition foreach ' +
		'updateValue updateLiveNode updateCondition updateForeach anim'
	).split(' ').forEach(name => {
		globalVars.push(`__${name} = __STDDOM.${name}`);
	});

	constObjects.forEach((code, idx) => {
		globalVars.push(`${constPrefix + (idx + 1)} = ${code}`);
	});

	return {
		args: [options.stddom ? '' : '__STDDOM'],
		before: `var ${globalVars.join(',\n')}\n${globals.join('\n')}`,
		code: results
	};
};
