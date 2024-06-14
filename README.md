# hx-new - Complex wiring for htmx

[htmx](https://htmx.org/) is a great library/[framework](https://htmx.org/essays/is-htmx-another-javascript-framework/) for sprinkling
interactivity to hypermedia sites. However, when I create entities that can be dynamically opened and closed (e.g. tabs or windows), I find
htmx gets a bit too rigid. hx-new is an experimental extension which aims to make htmx 10% more dynamic by adding templates with more advanced
wiring (#id namespaces, anti-duplication measures, multiple targeting, update events).

Examples: [tabs](https://tailcalled.github.io/hx-new/examples/tabs.html) ([src](https://github.com/tailcalled/hx-new/blob/main/examples/tabs.html)), [windows](https://tailcalled.github.io/hx-new/examples/windows.html) ([src](https://github.com/tailcalled/hx-new/blob/main/examples/windows.html)).

# Purpose

Let's say you have a basic htmx site where you can open some entities:

```html
<button hx-get="../placeholders/lipsum.html" hx-target="#list">Open Lipsum</button>
<button hx-get="../placeholders/form.html" hx-target="#list">Open Form</button>

<ul id="list"></ul>
```

This works fine at first, but then you want the user to be able to open more entities at once. You try the obvious option of adding `hx-swap="beforeend"`:

```html
<button hx-get="../placeholders/lipsum.html" hx-target="#list" hx-swap="beforeend">Open Lipsum</button>
<button hx-get="../placeholders/form.html" hx-target="#list" hx-swap="beforeend">Open Form</button>

<ul id="list"></ul>
```

... but now if the user repeatedly clicks a button, they can end up with a bunch of duplicates. What if we only want one copy of each opened element? hx-new [solves this problem](https://tailcalled.github.io/hx-new/examples/list.html) by adding a new swap method, `new:<template selector>`:

```html
<button hx-get="../placeholders/lipsum.html" hx-swap="new:#item">Open Lipsum</button>
<button hx-get="../placeholders/form.html" hx-swap="new:#item">Open Form</button>

<ul id="list"></ul>

<template id="item" hx-target="#list" hx-swap="beforeend">
    <li hx-slot></li>
</template>
```

The first time you click the "Open Lipsum" button, hx-new instantiates a new element under `#list` with the requested values. The second time you click "Open Lipsum", hx-new recognizes that there already is an instance of `#item` from `placeholders/lipsum.html`, and then it just updates this `#item` instead of creating a new one.

## Additional features

**#id namespaces:** Now let's say you want to close the item again. With hx-new, you can just refer to the added value by ID:

```html
(...)
<template id="item" hx-target="#list" hx-swap="beforeend">
    <li id="#list-item">
        <button onclick*="document.querySelector('#list-item').remove();">Remove</button>
        <div hx-slot></div>
    </li>
</template>
```

To avoid collisions between IDs, hx-new allocates unique ID's behind the scenes, so the list item's ID ends up being something like `#list-item-4499221362078367` instead of `#list-item`. The `*` at the end of a property like `onclick*` specifies that hx-new should use the unique IDs within the property, so it gets replaced with `onclick="document.querySelector('#list-item-4499221362078367').remove();"`.

This feature is used in both the [tabs](https://tailcalled.github.io/hx-new/examples/tabs.html) example and [windows](https://tailcalled.github.io/hx-new/examples/windows.html) example to permit closing the tabs/windows.

**Update events:** Let's say you want to run some Javascript once the item is updated. With hx-new, you can use `hx-on:hx-new:update`:

```html
<template id="item" hx-target="#list" hx-swap="beforeend">
    <li hx-on:hx-new:update="alert('Item opened.')" hx-slot></li>
</template>
```

This event gets triggered both when originally opening the item, and on any subsequent openings. It can be placed on any element within the subtree that gets inserted.

This feature is used in the [tabs](https://tailcalled.github.io/hx-new/examples/tabs.html) example to select the opened tab, and in the [windows](https://tailcalled.github.io/hx-new/examples/windows.html) example to bring the opened window to the front. 

**Multiple targetting:** Let's say you are making tabs. In that case, you need both the header for the tab (so that you can find the tab again after having switched to a different one), and the content for the tab, and they have to be inserted in different locations. As shown in the [tabs](https://tailcalled.github.io/hx-new/examples/tabs.html) example, hx-new can handle this by placing additional `<template>` tags with different `hx-target` routing:

```html
<div id="tabs">
    <div class="tabs-list"></div>
    <div class="tabs-content"></div>
</div>

<template id="tab" hx-target="#tabs .tabs-content" hx-swap="beforeend">
    <template hx-target="#tabs .tabs-list" hx-swap="beforeend">
        <div id="tab-head">
            <button type="button" onclick*="updateSelection('#tab-elements', '#tab-head')" hx-slot="#title">
                Untitled Tab
            </button>
            <button type="button" class="close-button" onclick*="
                document.querySelector('#tab-elements').remove();
                document.querySelector('#tab-head').remove();
                updateSelection('#tabs > .tabs-content > div', '#tabs > .tabs-list > div')
            ">X</button>
        </div>
    </template>
    <div id="tab-elements" hx-on:hx-new:update*="updateSelection('#tab-elements', '#tab-head')" hx-slot></div>
</template>
```

**htmx://response-url/:** If the template has a `hx-<http_verb>` attribute that starts with `htmx://response-url/`, it will be replaced by the URL for the resource that the template was instantiated with. This is used by the [combined tabs and windows](https://tailcalled.github.io/hx-new/examples/combined.html) example to add a "As Tab" button:

```html
<template id="window" hx-target="#desktop" hx-swap="beforeend">
    <div class="window-frame"
            style="z-index: 1; left: 100px; top: 100px; width: 400px; height: 300px;"
            id="window-root"
            onmousedown*="bringToFront(document.querySelector('#window-root'))"
            hx-on:hx-new:update*="bringToFront(document.querySelector('#window-root'))"
    >
        <div class="window-head">
            <div class="window-title" onmousedown*="drag(document.querySelector('#window-root'), event)" hx-slot="#title">
                Untitled Window
            </div>
            <button type="button" class="close-button" onclick*="document.querySelector('#window-root').remove();">X</button>
        </div>
        <div class="window-menu">
            <button hx-get="htmx://response-url/" hx-swap="new:#tab" hx-on:htmx:after-request*="document.querySelector('#window-root').remove();">
                As Tab
            </button>
        </div>
        <div class="window-content" hx-slot></div>
    </div>
</template>
```

# Should I use hx-new?

If you are not making components for htmx, you should not use hx-new.

If you can render your components with server side templating, do that rather than using hx-new. (Or if you want to render them on the client, use [facet](https://github.com/kgscialdone/facet).) hx-new has client-side templating as a core feature, but they are not very dynamic or robust and the main reason for their existence is to support the other features.

If you do not want to rely on experimental/incomplete technology, make hand-written components rather than using hx-new. I kind of hard to rewrite a good chunk of the htmx swapping logic to make hx-new work, and I know there's lots of things I haven't implemented yet. I hope to iron out any bugs as I encounter them, but there are parts of htmx I don't really use, so they will likely be broken in hx-new indefinitely.

If you still want to continue, I welcome PRs with cleanups, extensions, bugfixes, etc.. (I cannot promise to include any PRs, no matter how well-written, but I will try if they are good.)
