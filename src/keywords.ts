import {Bone} from 'skeletik';
import {keywords as parserKeywords} from 'skeletik/preset/xtpl';

type jscode = [string, string];
type handle = (attrs:any) => jscode;

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

	if (typeof convertTo === 'string') {
		convertTo = [convertTo, ''];
	}

	keywords[name] = (bone:Bone, content:string):string => {
		const open = replace(convertTo[0], bone);
		const end = replace(convertTo[1], bone);

		return `${open}${content}${end}`;
	};
}


// register(
// 	'if',
// 	'( @test:var )',
// 	['if ($test) {', '}']
// );
//
// register(
// 	'else',
// 	'if ( @test:var )',
// 	(attrs) => [attrs.test ? 'else if ($test) {' : 'else {', '}'],
// 	{optionalDetails: true}
// );
