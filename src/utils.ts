import {EXPRESSION_TYPE} from '../syntax/utils';

const R_QUOTE_START = /^"/;
const R_QUOTE_END = /"$/;

const R_IS_OBJECT_KEY_NORMAL = /^[a-z0-9$_]+$/i;
const R_IS_OBJECT_VALUE_PRIMITIVE = /^(((\+|-|~~)?(\d+\.?\d*|\.\d+)( *\| *0)?)|true|false|null)$/;

const jsonStringify = JSON.stringify;

export function stringifyObjectKey(key:string):string {
	return R_IS_OBJECT_KEY_NORMAL.test(key) ? key : `"${key}"`;
}

export function stringify(value:string):string;
export function stringify(values:any[]):string;
export function stringify(values) {
	let value = values;

	if (values != null) {
		if (EXPRESSION_TYPE === values.type) {
			value = `(${values.raw})`;
		} else if (values === true || typeof values === 'string') {
			value = jsonStringify(values);
		} else {
			const length = values.length;
			value = stringify(values[0]);

			if (length > 1) {
				for (let i = 1; i < length; i++) {
					value += ' + ' + stringify(values[i]);
				}
			}
		}
	}

	return value;
}

export function stringifyAttr(name:string, values:any[]):string {
	const length = values.length;
	const glue = name === 'class' ? ' ' : '';
	let value = stringify(values[0]);

	if (length > 1) {
		for (let i = 1; i < length; i++) {
			let nextValue = stringify(values[i]);
			
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