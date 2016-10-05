xtpl
----
Template Engine with CSS-JS-like syntaxis.


### Get started

```js
import xtpl from 'xtpl';
import stringMode from 'xtpl-mode-string';

// Create template factory
const templateFactory = xtpl.fromString('h1.title | Hi, ${props.name}!', {
	mode: stringMode({prettify: true}),
	scope: ['props'],
});

// Get template
const template = templateFactory();

// Usage
conts html = template({
	props: {
		name: 'xtpl'
	},
});
```

---

### Syntaxis

#### Basic

 - `.foo.bar` -> `<div class="foo bar"/>`
 - `h1.caption` -> `<h1 class="caption"/>`
 - `.welcome | Hi!` -> `<h2 class="welcome">Hi!</h2>`
 - `form[method="post"]` -> `<form method="post"/>`


#### Attributes

 - `input[type="text"][value="..."]` — css-like enumerable
 - `input[type="text" value="..."]` — space separated


#### Interpolation

 - className: `.is-${state}.${someClassName}`
 - tag + className: `${tagName}.is-${state}`
 - attributes: `form[method="${type}" action="api/${method}"]`
 - text: `h1 | Hi, ${username}!`


#### Comments
```sass
// Bla-bla-bla
.text | ok
```

---


#### Nesting and Adjacent sibling operator

##### `>` / Nesting

```sass
.panel
	.&-title > h1 | ${title}
	p.&-text | ${text}
```

&nbsp; &nbsp; &nbsp; &nbsp; &nbsp;  :arrow_double_down:  :arrow_double_down:  :arrow_double_down:

```html
<div class="panel">
	<div class="panel-title"><h1>...</h1></div>
	<p class="panel-text">...</p>
</div>
```


##### `+` / Adjacent sibling operator

```sass
i.left + i.right
```

&nbsp; &nbsp; &nbsp; &nbsp; &nbsp;  :arrow_double_down:  :arrow_double_down:  :arrow_double_down:

```sass
<i class="left"></i>
<i class="right"></i>
```

---


#### Parent reference

```sass
.panel
	.&-title > .&-close + | Wow!
	.&-content | Bla-bla-bal
```

&nbsp; &nbsp; &nbsp; &nbsp; &nbsp;  :arrow_double_down:  :arrow_double_down:  :arrow_double_down:

```html
<div class="panel">
	<div class="panel-title">
		<div class="panel-title-close"><div>
		Wow!
	</div>
	<p class="panel-content">Bla-bla-bal</p>
</div>
```


---


#### Parent reference and BEM modifiers

```sass
.button
	class.&_${attrs.type}: true
	| ${attrs.text}
```

&nbsp; &nbsp; &nbsp; &nbsp; &nbsp;  :arrow_double_down:  :arrow_double_down:  :arrow_double_down:

```html
<div class="button button_primary">
	OK
</div>
```

---

#### Custom elements

```sass
// Define
btn = [text, type]
	button.button
		class.&_${attrs.type}: true
		| ${text}

// Usage
btn[text="Continue"]
btn[text="Send" type="primary"]
```

&nbsp; &nbsp; &nbsp; &nbsp; &nbsp;  :arrow_double_down:  :arrow_double_down:  :arrow_double_down:

```html
<button class="button">Continue</div>
<button class="button button_primary">Send</div>
```

---

#### Custom elements + slots

##### Default slot
```sass
// Define
box = []
	.box > __default() // Call default

// Usage
box
	h2 | News
	p | ...
```

&nbsp; &nbsp; &nbsp; &nbsp; &nbsp;  :arrow_double_down:  :arrow_double_down:  :arrow_double_down:

```html
<div class="box">
	h2 | News
	p | ...
</div>
```

##### Multi slots
```sass
// Define
panel = []
	.&__head > head() // Call slot
	.&__body > body()

	// Checking the existence of slot
	if (typeof footer === 'undefined')
		.&__footer > footer()
	else
		.&__footer-empty

// Usage
panel
	// Define slot
	head = ()
		h2 | Wow!
	body = ()
		p | Bla-bla-bla...
```

&nbsp; &nbsp; &nbsp; &nbsp; &nbsp;  :arrow_double_down:  :arrow_double_down:  :arrow_double_down:

```html
<div class="panel">
	<div class="panel__head"><h2>Wow!</h2></div>
	<div class="panel__body"><p>Bla-bla-bla...</p></div>
	<div class="panel__footer-empty"><p>Bla-bla-bla...</p></div>
</div>
```


##### Default slot content
```sass
// Define
box = []
	content = ()
		h1 | default
	.body > content()

```


##### Slot with parameters
```sass
// Define
hello = [name]
	content = (text)
		| Hi, ${text}!
	.body > content(name.charAt(0).toUpperCase() + name.substr(1))

// Usage
hello[name="rubaxa"]
```


##### Inherit slots
```sass
// Define
hello = [name]
	content = (text)
		| Hi, ${text}!
	.body > content(name.charAt(0).toUpperCase() + name.substr(1))

// Usage
hello[name="rubaxa"]
	// Override slot and added `h1` wrapper
	content = (text)
		h1 > super.content(text)

// Or can define a combined block.
BigHello = [name]
	hello[name="${name}"]
		// Override slot and added `h1` wrapper
		content = (text)
			h1 > super.content(text)

// and usage
BigHello[name="rubaxa"]
```

---


### Space between the tags

 - `a[<]` — before
 - `a[>]` — after
 - `a[<>]` — at both sides

```sass
p > img[<] + img[<>] + img[>]
```

&nbsp; &nbsp; &nbsp; &nbsp; &nbsp;  :arrow_double_down:  :arrow_double_down:  :arrow_double_down:

```html
<p> <img/> <img/> <img/> </p>
```
