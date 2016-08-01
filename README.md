xtpl
----
Template Engine with CSS-JS-like syntaxis.

### API

```js
import xtpl from 'xtpl';
import stringMode from 'xtpl/mode/string';

const template = `form#main.login[action="/api/login/"] > input[name="name"][placeholder="{attrs.name}"]`;
const fragment = xtpl.parse(template);
const compiledTemplate = xtpl.compile(fragment, {
	mode: stringMode({prettify: true}),
	scope: ['attrs']
});

compile({attrs: {name: '%username%'}});
```

### Example

##### index.tpl
```xtpl
import "page"

// Use custom elemnt from "page.xtpl"
page[title="Welcome"]
	// Override `dynamic` part
	content = ()
		h1.title | xtpl — Template Engine
		super // Call parent method
```

##### page.xtpl
```xtpl
import "btn"

page = [title]
	html
		head > title | {title || "Default title"}
		body
			// Define `dynamic` part
			content = ()
				// Default content
				btn[iconName="github"][text="Download"][href="..."]

			// Call `dynamic` part
			content()
```

##### btn.xtpl
```xtpl
import "icon"

btn = [text, iconName, href]
	${href ? "a" : "button"}.btn[href="{href}"] > icon[name="{iconName}"] + &__text | {text}
```

##### icon.xtpl
```xtpl
icon = [name]
	i.fa-icon
		class.fa-{name}: true
```

---

### Define dynamic part

```
custom-element = [attrName]
	if (typeof foo !== "undefined") {
		foo(true)
	} else {
		// ...
	}

	bar(Date.now())

	qux = (text)
		| {text}

	qux(attrName)

// Usage
custom-element[attrName="rubaxa"]
	// Override
	qux = (name)
		h1.title > super.qux(name) + | !
```

---

### Class name

```
cbx = [checked]
	.checkbox
		class.is-checked: checked
		.&__checkmark

cbx[checked] // <div class="checkbox is-checked"><div class="checkbox__checkmark"></div></div>
```