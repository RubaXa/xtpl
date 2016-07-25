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
		try {
			return xtplParser(input);
		} catch (err) {
			console.log(err.pretty);
			throw err;
		}
	},

	compile<T>(fragment:Bone, options:XCompileOptions):(scope) => T {
		const source = ['__SCOPE__ = __SCOPE__ || {};'];
		const artifact = options.mode(fragment);

		options.scope.forEach(name => {
			source.push(`var ${name} = __SCOPE__.${name};`);
		});

		source.push('//---START---', '');
		source.push(artifact.before || '', '');
		source.push(artifact.code || '', '');
		source.push(artifact.after || '', '');
		source.push('//---END---', '');

		source.push(`return ${artifact.export}`);

		return <any>Function('__SCOPE__', source.join('\n'));
	}
};