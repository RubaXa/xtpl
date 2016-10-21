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
		var editor = ace.edit(el);

		editor.setTheme('ace/theme/tomorrow_night');
		editor.getSession().setMode('ace/mode/xtpl');
		editor.getSession().setOptions({tabSize: 2, useSoftTabs: false});
		editor.$blockScrolling = Infinity;

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

	function toSTR(value, glue) {
		return value.map(chunk => {
			return chunk.map(item => item.type ? `\${${item.raw}}` : item).join('');
		}).join(glue);
	}

	function transform({type, raw:{name, value, attrs} = {}, nodes}, indent, inlineMode) {
		let tpl = '';
		let filteredNodes = nodes.filter(({type, raw:{value = ''}}) => type !== 'text' || !value.trim || value.trim());
		let mixedContent = false;//!(filteredNodes.reduce((mask, {type}) => mask | (type === 'text' ? 0x1 : 0x2), 0) ^ (0x1 | 0x2));

		if (type === '#root') {
			return filteredNodes.map(node => transform(node, 0)).join('').trim() + '\n';
		}

		if (inlineMode) {
			tpl += type !== 'text' ? ` > ` : ' ';
		} else {
			indent++;
			tpl += '\n' + Array(indent).join('\t') + tpl;

		}

		if (type === 'tag') {
			if (name !== 'div' || !attrs.class) {
				tpl += name;
			}

			if (attrs.id) {
				tpl += '#' + toSTR(attrs.id, '');
			}

			if (attrs.class) {
				tpl += '.' + toSTR(attrs.class, '.');
			}

			const attrsStr = Object.keys(attrs)
								.filter(name => name != 'id' && name !== 'class')
								.map(name => `${name}="${toSTR(attrs[name], '')}"`)
								.join(' ');

			tpl += attrsStr ? `[${attrsStr}]`: '';

			if (filteredNodes.length >= 1) {
				if (filteredNodes.length === 1) {
					tpl += transform(filteredNodes[0], indent, true);
				} else if (mixedContent) {
					tpl += ` |# ${filteredNodes.map(node => toHTML(node)).join('')} #|`;
				} else {
					tpl += filteredNodes.map(node => transform(node, indent)).join('');
				}
			}
		} else {
			tpl += `| ${(value instanceof Array ? value.map(item => item.type ? `\${${item.raw}}` : item).join('') : value)}`;
		}

		return tpl;
	}

	function toHTML(frag) {
		var templateFactory = xtpl.compile(frag, {mode: stringMode()});
		var template = templateFactory();
		return template();
	}

	function toXTPL() {
		var html = htmlEditor.getValue();

		try {
			var frag = xtpl.parseXML(html.trim());
			var results = transform(frag);

			xtplEditor.setValue(results, 1);

			hasErrors && htmlEditor.getSession().setAnnotations([]);
			hasErrors = false;
		} catch (err) {
			console.log(err);

			hasErrors = true;
			htmlEditor.getSession().setAnnotations([{
				row: err.line - 1,
				column: err.column - 1,
				text: err.pretty,
				type: 'error'
			}]);
		}
	}

	htmlEditor.on('change', toXTPL);
	toXTPL();
});
