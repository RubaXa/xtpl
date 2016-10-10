import {IBone, BoneConstructor} from 'skeletik';
import xtplParser from './syntax/xtpl';
import stdLib from './src/std';
import * as utils from './src/utils';
import * as syntaxUtils from './syntax/utils';
import * as keywords from './src/keywords';

export interface IOptions {
	mode:(fragment:IBone, BoneClass?:BoneConstructor, options?:IOptions) => IArtifact;
	scope?:string[];
}

export interface IArtifact {
	before?:string;
	code:string;
	after?:string;
}

export type template<T> = (__SCOPE__:any) => T;

export {
	IBone,
	BoneConstructor,
}

export default {
	utils,
	syntaxUtils,
	keywords,

	parse(input:string):IBone {
		try {
			return xtplParser(input);
		} catch (err) {
			console.log(err.pretty);
			throw err;
		}
	},

	compile<T>(fragment:IBone, options:IOptions):(scope) => T {
		const source = [];
		const artifact = options.mode(fragment, <BoneConstructor>fragment.constructor, options);
		const existsSTD = {};

		function parseSTD(code:string):string {
			function toStr(value) {
				if (value === null) {
					return 'null';
				} else if (value === void 0) {
					return 'void 0';
				} else if (value instanceof Function || value instanceof RegExp) {
					return value.toString();
				} else {
					return JSON.stringify(value);
				}
			}

			return code.replace(/__STDLIB_([A-Z_]+)/g, (fullName, name) => {
				const fn = stdLib[name];

				if (!existsSTD[name]) {
					existsSTD[name] = true;

					if (fn && fn.vars) {
						source.unshift(
							`var ` +
							Object.keys(fn.vars).map(name => `${name} = ${toStr(fn.vars[name])}`).join(', ') +
							`,\n${fullName} = ${toStr(fn.method)}`
						);
					} else {
						source.unshift(`var ${fullName} = ${toStr(fn)}`);
					}
				}

				return fullName;
			});
		}

		artifact.before && source.push(parseSTD(artifact.before));

		source.push(
			'return function compiledTemplate(__SCOPE__) {',
			'  __SCOPE__ = __SCOPE__ || {};'
		);

		options.scope && options.scope.forEach(name => {
			source.push(`  var ${name} = __SCOPE__.${name};`);
		});

		source.push(
			'  // CODE:START',
			'  ' + parseSTD(artifact.code),
			'  // CODE:END'
		);
		
		source.push('}');
		artifact.after && source.push(artifact.after);

		const code = utils.jsFormatting(source.join('\n'));

		// Debug
		console.log(code);

		return <any>Function(code);
	},

	fromString(input:string, options:IOptions) {
		const fragment = this.parse(input);
		const template = this.compile(fragment, options);
		
		return template;
	}
};
