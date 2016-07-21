import {Bone} from 'skeletik';
import xtplParser from 'skeletik/preset/xtpl';

export interface XCompileOptions {
	mode:any;
	scope:string[];
}

export type template<T> = (__SCOPE__:any) => T;

const MODE = {
};

export default {
	parse(input:string):Bone {
		return xtplParser(input);
	},

	compile<T>(fragment:Bone, options:XCompileOptions):string {
		const source = [
			'return function template(__SCOPE__) {',
			'  var __RESULT;',
		];
		const mode = options.mode;
		const tags = mode.tags;

		options.scope.forEach(name => {
			source.push(`  var ${name} = __SCOPE__.${name};`);
		});

		source.push('\n//---START---\n');
		console.log(mode.compile(fragment).to('ROOT'));
		source.push('\n//---END---\n');

		source.push('  return __RESULT;');
		source.push('}');

		return source.join('\n');
	},

	registerMode(name:string, describe) {

	}
};