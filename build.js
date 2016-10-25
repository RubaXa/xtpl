'use strict';

const fs = require('fs');
const path = require('path');
const rollup = require('rollup');
const nodeResolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');

rollup.rollup({
	entry: 'dist/xtpl.js',
	plugins: [
		commonjs({include: 'node_modules/**' }),
		nodeResolve({main: true}),
	]
}).then((bundle) => {
	var result = bundle.generate({
		format: 'umd',
		moduleId: 'xtpl',
		moduleName: 'xtpl'
	});

	fs.writeFileSync('dist/xtpl-bundle.js', result.code);
	console.log('Success: xtpl');
}).catch((err) => {
	console.error(err);
});

rollup.rollup({
	entry: 'dist/mode/json.js',
	plugins: [
		nodeResolve({main: true}),
		commonjs({include: 'node_modules/**'})
	]
}).then((bundle) => {
	var result = bundle.generate({
		format: 'umd',
		moduleId: 'xtplModeJson',
		moduleName: 'xtplModeJson'
	});

	fs.writeFileSync('dist/xtpl-mode-json-bundle.js', result.code);
	console.log('Success: mode-xtpl');
}).catch((err) => {
	console.error(err);
});


rollup.rollup({
	entry: 'dist/mode/string.js',
	plugins: [
		nodeResolve({main: true}),
		commonjs({include: 'node_modules/**'})
	]
}).then((bundle) => {
	var result = bundle.generate({
		format: 'umd',
		moduleId: 'xtplModeString',
		moduleName: 'xtplModeString'
	});

	fs.writeFileSync('dist/xtpl-mode-string-bundle.js', result.code);
	console.log('Success: mode-string');
}).catch((err) => {
	console.error(err);
});


rollup.rollup({
	entry: 'dist/mode/live.js',
	plugins: [
		nodeResolve({main: true}),
		commonjs({include: 'node_modules/**'})
	]
}).then((bundle) => {
	var result = bundle.generate({
		format: 'umd',
		moduleId: 'xtplModeLive',
		moduleName: 'xtplModeLive'
	});

	fs.writeFileSync('dist/xtpl-mode-live-bundle.js', result.code);
	console.log('Success: live-string');
}).catch((err) => {
	console.error(err);
});

rollup.rollup({
	entry: 'dist/src/stddom.js',
	plugins: [
		nodeResolve({main: true}),
		commonjs({include: 'node_modules/**'})
	]
}).then((bundle) => {
	var result = bundle.generate({
		format: 'umd',
		moduleId: 'xtplStddom',
		moduleName: 'xtplStddom'
	});

	fs.writeFileSync('dist/xtpl-stddom-bundle.js', result.code);
	console.log('Success: stddom');
}).catch((err) => {
	console.error(err);
});

rollup.rollup({
	entry: 'dist/src/animator.js',
	plugins: [
		nodeResolve({main: true}),
		commonjs({include: 'node_modules/**'})
	]
}).then((bundle) => {
	var result = bundle.generate({
		format: 'umd',
		moduleId: 'xtplAnimator',
		moduleName: 'xtplAnimator'
	});

	fs.writeFileSync('dist/xtpl-animator-bundle.js', result.code);
	console.log('Success: animator');
}).catch((err) => {
	console.error(err);
});
