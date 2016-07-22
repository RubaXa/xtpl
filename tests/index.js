const xtpl = require('../dist/xtpl').default;
const json = require('../dist/mode/json').default;
const string = require('../dist/mode/string').default;

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

xtpl.compile(frag, {
	mode: string({prettify: true}),
	scope: ['attrs']
});