import {IBone} from 'skeletik';
import {EXPRESSION_TYPE, INHERIT_TYPE, GROUP_TYPE} from '../syntax/utils';

const R_QUOTE_START = /^"/;
const R_QUOTE_END = /"$/;

const R_IS_OBJECT_KEY_NORMAL = /^[a-z0-9$_]+$/i;
//const R_IS_OBJECT_VALUE_PRIMITIVE = /^(((\+|-|~~)?(\d+\.?\d*|\.\d+)( *\| *0)?)|true|false|null)$/;

const jsonStringify = JSON.stringify;

export function stringifyObjectKey(key: string): string {
	return R_IS_OBJECT_KEY_NORMAL.test(key) ? key : `"${key}"`;
}

export function stringify(value: string, escape?: string, bone?: IBone): string;
export function stringify(values: any[], escape?: string, bone?: IBone): string;
export function stringify(values, escape, bone) {
	let value = values;

	if (bone === void 0) {
		bone = {};
	}

	if (values != null) {
		switch (values.type) {
			case GROUP_TYPE:
				value = `(${values.test} ? ${stringify(values.raw, escape, bone)} : "")`;
				bone.hasComputedAttrs = true;
				break;

			case INHERIT_TYPE:
				const selfMode = values.raw === 'self';
				let target = bone;

				do {
					!selfMode && (target = target.parent);

					if (target.raw.attrs.class) {
						value = stringify(target.raw.attrs.class[0], escape, target);
						break;
					}

					selfMode && (target = target.parent);
				} while (1);

				bone.hasComputedAttrs = bone.hasComputedAttrs || target.hasComputedAttrs;
				break;

			case EXPRESSION_TYPE:
				value = (escape ? escape : '') + `(${values.raw})`;
				bone.hasComputedAttrs = true;
				break;

			default:
				if (values === true || typeof values === 'string') {
					value = jsonStringify(values);
				} else {
					const length = values.length;
					value = stringify(values[0], escape, bone);

					if (length > 1) {
						for (let i = 1; i < length; i++) {
							const nextValue = stringify(values[i], escape, bone);

							if (R_QUOTE_END.test(value) && R_QUOTE_START.test(nextValue)) {
								value = value.slice(0, -1) + nextValue.slice(1);
							} else {
								value += ' + ' + nextValue;
							}
						}
					}
				}
				break;
		}
	}

	return value;
}

export function stringifyAttr(name: string, values: any[], escape?: string, bone?: IBone): string {
	const length = values.length;
	const glue = name === 'class' ? ' ' : '';

	let value = stringify(values[0], escape, bone);

	if (length > 1) {
		for (let i = 1; i < length; i++) {
			let nextValue = stringify(values[i], escape, bone);

			if (i > 0) {
				if (R_QUOTE_END.test(value)) {
					// Добавляем вконец строки `glue`
					value = value.slice(0, -1) + glue + (R_QUOTE_START.test(nextValue)
								? nextValue.slice(1) // следующее значение тоже строка, так что отрезаем кавычку
								: `" + ${nextValue}` // возвращаем кавычку
						);
				} else if (R_QUOTE_START.test(nextValue)) {
					// Добавляем строку с `glue`
					value += ` + "${glue}${nextValue.slice(1)}`;
				} else {
					value += (glue ? ` + "${glue}" + ` : ' + ') + nextValue;
				}
			}
		}
	}

	return value;
}

export function jsFormatting(source) {
	let tabs = '\t\t\t\t\t\t\t\t\t\t\t';
	let indent = 0;

	return source
		.split('\n')
		.map((line) => {
			line = line.trim();

			if (/(function|if|for[\s\(]|return\s\{)/.test(line)) {
				line = tabs.substr(0, indent) + line;
				indent++;
			} else if (/^}\s+(if|else)/.test(line)) {
				line = tabs.substr(0, indent - 1) + line;
			} else {
				if (/^}[;,]?$/.test(line)) {
					indent--;
				}
				line = tabs.substr(0, indent) + line;
			}

			return line;
		})
		.join('\n')
	;
}
