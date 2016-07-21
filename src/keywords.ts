import {Bone} from 'skeletik';
import {keywords as parserKeywords} from 'skeletik/preset/xtpl';
import {interpolate} from './utils';

export type jscode = [string, string];
export type handle = (attrs:any) => jscode;

export const keywords = {};

export interface XKeywordOptions {
	optionalDetails?:boolean;
}

function replace(preset:string, bone:Bone):string {
	const attrs:any = bone.raw.attrs || {};
	return preset.replace(/\$([a-z0-9_-]+)/i, (_, name) => attrs[name]);
}

export function register(name:string, details:string|string[], convertTo:jscode|handle, options?:XKeywordOptions) {
	options = options || {};

	parserKeywords.add(name, details, {optional: options.optionalDetails});

	keywords[name] = (bone:Bone, content:string):string => {
		const open = replace(convertTo[0], bone);
		const end = replace(convertTo[1], bone);

		return `${open}${content}${end}`;
	};
}

function renderToString(bone:Bone):string {
	const name = bone.raw.name;
	const attrs = bone.raw.attrs;
	const nodes = bone.nodes;
	let children = '';
	let result = `<${name}`;

	if (attrs) {
		result += Object.keys(attrs).map((name) => {
			const value = interpolate(attrs[name]);
			return ` ${name}="${value}"`;
		}).join('');
	}

	result += '>';

	if (nodes.length) {
		result += nodes.map((node) => renderToString(node)).join('');
	}

	return `${result}</${name}>`;
}

// register(
// 	'if',
// 	'( @test:var )',
// 	['if ($test) {', '}']
// );

// register(
// 	'else',
// 	'if ( @test:var )',
// 	(attrs) => [attrs.test ? 'else if ($test) {' : 'else {', '}'],
// 	{optionalDetails: true}
// );

// register(
// 	'for',
// 	'($as:var in $data:js)',
// 	['$data.forEach(function ($as) {', '})']
// );
