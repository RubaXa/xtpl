import xtplParser, {DTD_TYPE, COMMENT_TYPE, TEXT_TYPE, KEYWORD_TYPE} from 'skeletik/preset/xtpl';

export default {
	tags: {
		'#root': (_, content) => content,

		[DTD_TYPE]: ({value}) => `<!DOCTYPE ${value}>`,
		[COMMENT_TYPE]: ({value}) => `<!--${value}-->`,
		[TEXT_TYPE]: ({value}) => value,

		[KEYWORD_TYPE]: {
			if: ({test}) => [`if (${test}) {`, `}`],
			else: ({test}) => [`else {`, `}`]
		},

		'default': ({name, attrs}, content) => `<${name}>${content}</${name}>`
	}
};