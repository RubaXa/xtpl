import xtpl, {IBone, BoneConstructor} from '../xtpl';
import {EXPRESSION_TYPE} from "../syntax/utils";
import * as stddom from "../src/stddom";

type COMPILED_ATTR = [string, string, boolean];

const R_IS_EVENT_ATTR = /^(on-|@)/;

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

export default (options:LiveModeOptions = {}) => (
	bone:IBone,
	BoneClass:BoneConstructor,
	{scope:scopeVars}
) => {
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
				htmlProps[name] || isCustomElems[raw.name] || R_IS_EVENT_ATTR.test(name) ? null : TO_STR,
				<IBone><any>attrDetails
			);

			hasComputedAttrs = hasComputedAttrs ||  attrDetails.hasComputedAttrs || R_IS_EVENT_ATTR.test(name);

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

		if (KEYWORD_TYPE === type && name === 'import') {
			isCustomElems[attrs.name] = {
				type: 'import',
				name: attrs.name,
			};
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
			if ('anim' === name || 'fx' === name) {
				// Эффекты
				return `
					__anim(${node.attrs.name}, ${parentName}, function () {
						${compileChildren(parentName, children, updaters, fragments).join('\n')}
					});
				`;
			} else if ('import' === name) {
				// Импорт блоков
				return `__COMP.require("${node.attrs.name}", ${node.attrs.from});`;
			} else if ('if' === name || 'else' === name) {
				// Условные операторы
				const condBaseId = ++gid;
				const condNames = [node].concat(node.alternate).map((node) => {
					const condUpd = [];
					const condName = `__IF_${++gid}`;
					const children = node.children;

					fragments.push(`
						function ${condName}(frag) {
							return ${node.attrs.test || 'true'} ? frag || ${condName}_exec(__ctx) : null;
						}
						
						function ${condName}_exec(__parent) {
							var __ctx = __createContext(__parent);
							var __fragIf = __fragment();
							${compileChildren('__fragIf', children, condUpd, fragments).join('\n')}
							return {
								ctx: __ctx,
								frag: __fragIf,
								update: function () {
									${condUpd.join('\n')}
								}
							};
						}
					`);

					return condName;
				});

				updaters.push(`__updateCondition(__ctx, ${condBaseId})`);

				return `__condition(${parentName}, __ctx, ${condBaseId}, [${condNames.join(', ')}])`;
			} else if ('for' === name) {
				// Цыклы
				const forName = `__FOR_ITERATOR_${++gid}`;
				const forKey = attrs.key || '$index';
				const forUpd = [];
				const forId = ++gid;
				const forBaseArgs = `${attrs.data}, ${stringify(attrs.id)}, ${forName}`;
				const forFrags = [];

				fragments.push(`
					function ${forName}(__parent, ${attrs.as}, ${forKey}) {
						var __ctx = __createContext(__parent);
						var __fragFor = __fragment();
						${compileChildren('__fragFor', children, forUpd, forFrags).join('\n')}
						${forFrags.join('\n')}
						return {
							ctx: __ctx,
							frag: __fragFor,
							data: ${attrs.as},
							index: ${forKey},
							update: function (__${attrs.as}, __${forKey}) {
								${attrs.as} = __${attrs.as}
								${forKey} = __${forKey}
								${forUpd.join('\n')}
							}
						};
					}
				`);

				updaters.push(`__updateForeach(__ctx, ${forId}, ${forBaseArgs})`);

				return `__foreach(${parentName}, __ctx, ${forId}, ${forBaseArgs})`;
			} else {
				throw 'todo kw';
			}
		} else if (TEXT_TYPE === type) {
			// Просто текст
			return compileTextNode(parentName, node, updaters, fragments);
		} else if (TAG_TYPE === type) {
			const tagId = ++gid;
			const varName = `__x` + tagId;

			let code = [];

			if (isCustomElems[name]) {
				// Хмммм
				let cmpAttrs = 'var __cmpAttrs = {}\n';
				let cmpAttrsExp = [cmpAttrs];
				node.compiledAttrs.forEach((attr:COMPILED_ATTR) => {
					let [name, value, isExpr] = attr;
					let expr = `__cmpAttrs[${stringify(htmlProps[name] || name)}] = ${value}\n`;

					cmpAttrs += expr;
					isExpr && cmpAttrsExp.push(expr);
				});
				code.push(`
					${cmpAttrs}
					var ${varName} = __COMP.create(__ctx, ${parentName}, ${node.compiledName}, __cmpAttrs)
				`);
				(cmpAttrsExp.length > 1) && updaters.push(`${cmpAttrsExp.join('\n')}\n${varName}.update(__cmpAttrs)`);
			} else {
				if (node.hasComputedName || node.hasComputedAttrs) {
					code.push(`var ${varName} = __liveNode(${parentName}, __ctx, ${tagId}, ${node.compiledName})`);
					node.hasComputedName && updaters.push(`__updateLiveNode(__ctx[${tagId}], ${node.compiledName})`);
				} else {
					code.push(`var ${varName} = __node(${parentName}, ${node.compiledName})`);
				}

				code = code.concat(
					node.compiledAttrs.map((attr:COMPILED_ATTR):string => {
						let fn;
						let expr = varName;
						let [name, value, isExpr] = attr;
						let extraStaticExpr = '';

						if (R_IS_EVENT_ATTR.test(name)) {
							let parsedName:string[];
							let isRemit = name.charAt(0) === '@';

							parsedName = name.replace(R_IS_EVENT_ATTR, '').split('.');

							name = parsedName.shift();
							fn = '__event';
							expr = `__ctx[${tagId}]`;

							if (isRemit) {
								let remitArgs = node.attrs[attr[0]][0];

								value = `{ctx: __this, fn: ${stringify(remitArgs[0].trim())}`;

								if (remitArgs.length > 1) {
									remitArgs = remitArgs.slice(1)
												.filter(item => !!item.type)
												.map(item => stringify(item))
									;
									value += `, ${remitArgs.length === 1 ? `arg: ${remitArgs[0]}` : `args: [${remitArgs.join(', ')}]`}`;
								} else {
									isExpr = false;
								}

								value += '}';
							}

							if (parsedName.length) {
								extraStaticExpr += `\n${expr}.eventsMods[${stringify(name)}] = ${JSON.stringify(parsedName)};`;
							}
						} else if (isExpr || node.hasComputedName) {
							fn = htmlProps.hasOwnProperty(name) ? '__dProp' : '__dAttr';
							expr = `__ctx[${tagId}]`;
						} else {
							fn = htmlProps.hasOwnProperty(name) ? '__prop' : '__attr';
						}

						expr = `${fn}(${expr}, ${stringify(htmlProps[name] || name)}, ${value})`;
						isExpr && updaters.push(expr);

						return expr + (extraStaticExpr ? `\n${extraStaticExpr}` : '');
					}),

					compileChildren(varName, children, updaters, fragments)
				);
			}

			node.wsBefore && code.unshift(`__text(${parentName}, ' ')`);
			node.wsAfter && code.push(`__text(${parentName}, ' ')`);

			return code.join('\n');
		}
	}

	function compileTextNode(parentName:string, {hasComputedValue, value, compiledValue}:Node, updaters, fragments) {
		if (hasComputedValue) {
			return (value as any).map((item:any) => {
				if (EXPRESSION_TYPE === item.type) {
					const id = ++gid;
					updaters.push(`__updateValue(__ctx[${id}], ${item.raw})`);
					return `__value(${parentName}, __ctx, ${id}, ${item.raw})`;
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
		} else if (DEFINE_TYPE === node.type) {
			// Компонент
			res += compileChildren('__frag', node.children, updaters, fragments).join('\n');
			// todo: CamelCase component name
			return `
				function Component(attrs) {
					${node.attrs.map(name => `var ${name} = attrs.${name}`).join('\n')}
					var __ctx = {};
					${res}
					${fragments.join('\n')}
					return {
						frag: __frag,
						update: function (__newAttrs) {
							attrs = __newAttrs;
							${node.attrs.map(name => `${name} = __newAttrs.${name}`).join('\n')}
							${updaters.join('\n')}
						}
					};
				}
			`;
		} else {
			throw 'todo';
		}

		return `
			var __ctx = {components: []};
			${res}
			${fragments.join('\n')}
			return {
				ctx: __ctx,
				frag: __frag,
				container: null,
				mountTo: function (container) {
					this.container = container;
					__frag.mountTo(container);
					__lifecycle(__ctx, 'didMount');
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
		globals.push(`__COMP.inline(${node.compiledName}, ${compileFragment(node)})`);
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
		'updateValue updateLiveNode updateCondition updateForeach anim component ' +
		'createContext lifecycle'
	).split(' ').forEach(name => {
		globalVars.push(`__${name} = __STDDOM.${name}`);
	});

	constObjects.forEach((code, idx) => {
		globalVars.push(`${constPrefix + (idx + 1)} = ${code}`);
	});

	return {
		args: [options.stddom ? '' : '__STDDOM', '__COMP'],
		before: `var ${globalVars.join(',\n')}\n${globals.join('\n')}`,
		code: results
	};
};
