const xtpl = require('../dist/xtpl').default;
const jsonMode = require('../dist/mode/json').default;
const stringMode = require('../dist/mode/string').default;

const frag = xtpl.parse(`
!html
html
	head > title | La-la-la
	body
		h1 | Hello, %username%!
		if (attrs.ready)
			p | Yeah.
			b > i | foo
		else 
			x | true
		ul > for (val in data)
			li | {val}
`.trim());

const result = xtpl.compile(frag, {
	mode: stringMode({prettify: true}),
	scope: ['attrs']
});

console.log(result);