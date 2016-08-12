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
		const source = ['__SCOPE__ = __SCOPE__ || {};'];
		const artifact = options.mode(fragment);

		options.scope && options.scope.forEach(name => {
			source.push(`var ${name} = __SCOPE__.${name};`);
		});

		Object.keys(artifact.utils || {}).forEach((name:string) => {
			source.push(`var ${name} = ${artifact.utils[name].toString()};`);
		});

		artifact.before  && source.push(artifact.before);

		source.push(
			'// CODE:START',
			artifact.code.replace(/XTPL_STD_([A-Z_]+)/g, (fullName, name) => {
				source.unshift(`var ${fullName} = ${stdLib[name].toString()}`);
				return fullName;
			}),
			'// CODE:END'
		);

		artifact.after && source.push(artifact.after);
		artifact.export && source.push(`return ${artifact.export}`);

		// Debug
		console.log(source.join('\n'));

		return <any>Function('__SCOPE__', source.join('\n'));
	},

	fromString(input:string, options:XCompileOptions) {
		const fragment = this.parse(input);
		const template = this.compile(fragment, options);
		
		return template;
	}
};