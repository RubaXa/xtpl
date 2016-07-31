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
	content()
		h1.title | xtpl — Template Engine
		super() // Call parent method
```

##### page.xtpl
```xtpl
import "btn"

page = ({title})
	html
		head > title | {title || "Default title"}
		body
			// Call `dynamic` part
			content()
				// Default content
				btn[iconName="github"][text="Download"][href="..."]
```

##### btn.xtpl
```xtpl
import "icon"

btn = ({text, iconName, href})
	${href ? "a" : "button"}.btn[href="{href}"] > icon[name="{iconName}"] + &__text | {text}
```

##### icon.xtpl
```xtpl
icon = (name)
	i.fa-icon
		class.fa-{name}: true
```

---

```xtpl
// Define
layout = ()
	.layout
		.&_left > left(this.attrs.size)
		.&_middle > middle(this.attrs)
		.&_right > right(this.attrs)

// Usage
layout
	left(attrs)
		btn[big="{attrs.size === super.XXL_SIZE}"][text="Compose"]
	// and etc
```