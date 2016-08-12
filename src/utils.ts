import {Bone} from 'skeletik';
import {EXPRESSION_TYPE, INHERIT_TYPE, GROUP_TYPE} from '../syntax/utils';

const R_QUOTE_START = /^"/;
const R_QUOTE_END = /"$/;

const R_IS_OBJECT_KEY_NORMAL = /^[a-z0-9$_]+$/i;
const R_IS_OBJECT_VALUE_PRIMITIVE = /^(((\+|-|~~)?(\d+\.?\d*|\.\d+)( *\| *0)?)|true|false|null)$/;

const jsonStringify = JSON.stringify;

export function stringifyObjectKey(key:string):string {
	return R_IS_OBJECT_KEY_NORMAL.test(key) ? key : `"${key}"`;
}

export function stringify(value:string, bone?:Bone):string;
export function stringify(values:any[], bone?:Bone):string;
export function stringify(values, bone) {
	let value = values;

	if (values != null) {
		switch (values.type) {
			case GROUP_TYPE:
				value = `(${values.test} ? ${stringify(values.raw, bone)} : "")`; 
				break;

			case INHERIT_TYPE:
				const selfMode = values.raw === 'self';

				do {
					!selfMode && (bone = bone.parent);

					if (bone.raw.attrs.class) {
						value = stringify(bone.raw.attrs.class[0], bone);
						break;
					}

					selfMode && (bone = bone.parent);
				} while (1);
				break;

			case EXPRESSION_TYPE:
				value = `(${values.raw})`;
				break;
		
			default:
				if (values === true || typeof values === 'string') {
					value = jsonStringify(values);
				} else {
					const length = values.length;
					value = stringify(values[0], bone);

					if (length > 1) {
						for (let i = 1; i < length; i++) {
							const nextValue = stringify(values[i], bone);
							
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

export function stringifyAttr(name:string, values:any[], bone?:Bone):string {
	const length = values.length;
	const glue = name === 'class' ? ' ' : '';
	
	let value = stringify(values[0], bone);

	if (length > 1) {
		for (let i = 1; i < length; i++) {
			let nextValue = stringify(values[i], bone);
			
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
					value += (glue ? ` + "${glue}" + `: ' + ') + nextValue; 
				}
			}
		}
	}

	return value;
}