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
		];
		const artifact = options.mode(fragment);

		options.scope.forEach(name => {
			source.push(`  var ${name} = __SCOPE__.${name};`);
		});

		source.push('\n//---START---\n');
		source.push(artifact.before || '');
		source.push(artifact.code || '');
		source.push(artifact.after || '');
		source.push('\n//---END---\n');

		source.push(`  return ${artifact.export}`);
		source.push('}');

		return source.join('\n');
	}
};