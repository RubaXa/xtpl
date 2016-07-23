define(['xtpl', 'xtpl/mode/json'], function (xtplModule, jsonModeModule) {
	'use strict';

	const xtpl = xtplModule.default;
	const jsonMode = jsonModeModule.default;

	const frag = xtpl.parse(`
ul > for (val in data)
	li | val
	`.trim());

	const result = xtpl.compile(frag, {
		mode: jsonMode({prettify: true}),
		scope: ['attrs']
	});

	console.log(result);
});
