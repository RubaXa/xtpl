define([
	'xtpl',
	'xtpl/mode/live',
	'xtpl/src/stddom',
	'xtpl/src/animator',
	'xtpl/src/components',
	'./componentsServiceMock',
	'./qunit.assert.codeEqual'
], function (
	xtplModule,
	liveModeModule,
	stddom,
	Animator,
	components,
	componentsServiceMock
) {
	'use strict';

	const xtpl = xtplModule.default;
	const liveMode = liveModeModule.default;
	let cmpMock;

	cmpMock = componentsServiceMock(createFromString, components);

	stddom.setAnimator(Animator.default);

	function createFromString(input, attrs, debug) {
		var templateFactory = xtpl.fromString(input, {
			mode: liveMode(),
			scope: Object.keys(attrs || {}),
			debug: debug,
		});
		return templateFactory(stddom, cmpMock);
	}

	function fromString(input, attrs, debug) {
		var template = createFromString(input, attrs, debug);
		var view = template(attrs).mountTo(document.createElement('div'));

		view.template = template;

		return view;
	}

	return fromString;
});
