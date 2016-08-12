
	QUnit.test('json', function (assert) {
		const template = xtpl.compile(frag, {mode: jsonMode()});

		assert.equal(typeof template, 'function')
		assert.deepEqual(template(), {
			tag: undefined,
			children: {
				tag: "html",
				children: [
					{
						tag: "head",
						children: {tag: "title", children: "foo"}
					}, {
						tag: "body",
						children: {
							tag: "h1",
							children: "Bar"
						}
					}
				]
			}
		});
	});
	
	QUnit.test('if / json', function (assert) {
		const template = xtpl.fromString('foo\nif (x)\n  bar', {mode: jsonMode(), scope: ['x']});

		assert.deepEqual(template({x: false}), {tag: undefined, children: [{tag: 'foo'}]});
		assert.deepEqual(template({x: true}), {tag: undefined, children: [{tag: 'foo'}, {tag: 'bar'}]});
	});

	QUnit.test('foo = [value] / string', function (assert) {
		// todo: #root-error
		const template = xtpl.fromString([
			'foo = [value]',
			'  b | {value}',
			'foo[value="1"] + foo[value="x"] + foo[value="{a + b}"] + foo[value="a*b={a * b}"]'
		].join('\n'), {mode: stringMode(), scope: ['a', 'b']});

		console.log(template.toString());
		
		assert.equal(
			template({a: 3, b: 2}),
			[
				'<b>1</b>',
				'<b>x</b>',
				'<b>5</b>',
				'<b>a*b=6</b>',
			].join('')
		);
	});