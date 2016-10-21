define('editor/html', ['require'], function (require) {
	var ace = require('ace/ace');

	return function htmlEditorFactory(el) {
		var editor = ace.edit(el);

		editor.setTheme('ace/theme/tomorrow_night');
		editor.getSession().setMode('ace/mode/html');
		editor.$blockScrolling = Infinity;

		return editor;
	};
});

define('editor/xtpl', ['require'], function (require) {
	var ace = require('ace/ace');

	return function xtplEditorFactory(el) {
		var lines = el.textContent.split('\n');
		var indentSize = (lines[1].match(/^\s+/) || [''])[0].length;

		el.textContent = lines.slice(1).map(function (line) {
			return line.substr(indentSize);
		}).join('\n');

		var editor = ace.edit(el);

		editor.setTheme('ace/theme/tomorrow_night');
		editor.getSession().setMode('ace/mode/xtpl');
		editor.getSession().setOptions({tabSize: 2, useSoftTabs: false});

		return editor;
	};
});

require([
	'xtpl',
	'xtpl/mode/string',
	'editor/html',
	'editor/xtpl'
], function (
	xtpl,
	stringMode,
	htmlEditorFactory,
	xtplEditorFactory
) {
	var htmlEditor = htmlEditorFactory(window['html-editor']);
	var xtplEditor = xtplEditorFactory(window['xtpl-editor']);
	var hasErrors = false;

	function toHTML() {
		var source = xtplEditor.getValue();

		try {
			var templateFactory = xtpl.fromString(source, {
				mode: stringMode({prettify: true})
			});
			var template = templateFactory();
			var html = template();

			htmlEditor.setValue(html, 1);

			hasErrors && xtplEditor.getSession().setAnnotations([]);
			hasErrors = false;
		} catch (err) {
			console.log(err);
			hasErrors = true;
			xtplEditor.getSession().setAnnotations([{
				row: err.line - 1,
				column: err.column - 1,
				text: err.pretty,
				type: 'error'
			}]);
		}
	}

	xtplEditor.on('change', toHTML);
	toHTML();
});
