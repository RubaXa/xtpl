const xtpl = require('../dist/xtpl').default;
const json = require('../dist/mode/json').default;
const string = require('../dist/mode/string').default;

const frag = xtpl.parse(`
h1 | Hello, %username%!
if (attrs.ready)
	p | Yeah.
	b + i | foo
`.trim());

xtpl.compile(frag, {
	mode: json,
	scope: ['attrs']
});