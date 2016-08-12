import {Bone} from 'skeletik';
import xtplParser from './syntax/xtpl';
import stdLib from './src/std';

export interface XCompileOptions {
	mode:any;
	scope?:string[];
}

export type template<T> = (__SCOPE__:any) => T;

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
		const source = [];
		const artifact = options.mode(fragment);

		artifact.before && source.push(artifact.before);

		source.push(
			'return function compiledTemplate(__SCOPE__) {',
			'  __SCOPE__ = __SCOPE__ || {};'
		);

		options.scope && options.scope.forEach(name => {
			source.push(`  var ${name} = __SCOPE__.${name};`);
		});

		source.push(
			'// CODE:START',
			artifact.code.replace(/XTPL_STD_([A-Z_]+)/g, (fullName, name) => {
				source.unshift(`var ${fullName} = ${stdLib[name].toString()}`);
				return fullName;
			}),
			'// CODE:END'
		);
		
		source.push('}');
		artifact.after && source.push(artifact.after);

		// Debug
		console.log(source.join('\n'));

		return <any>Function(source.join('\n'));
	},

	fromString(input:string, options:XCompileOptions) {
		const fragment = this.parse(input);
		const template = this.compile(fragment, options);
		
		return template;
	}
};