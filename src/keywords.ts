import {Bone} from 'skeletik';
import {keywords as parserKeywords} from '../syntax/xtpl';
import {interpolate} from './utils';

export type jscode = [string, string];

export const keywords = {};

export interface XKeywordOptions {
	optionalDetails?:boolean;
}

function replace(preset:string, attrs:any):string {
	return preset.replace(/\$([a-z0-9_-]+)/i, (_, name) => attrs[name]);
}

export function register(name:string, details:string|string[], convertTo:(attrs:any) => jscode, options:XKeywordOptions = {}) {
	parserKeywords.add(name, details, {optional: options.optionalDetails});
	keywords[name] = (attrs:any):jscode => convertTo(attrs);
}

export function compile(name:string, attrs:any):jscode {
	return keywords[name](attrs);
}