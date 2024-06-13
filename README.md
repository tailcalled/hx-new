# hx-new - Templates with complex wiring for htmx

[htmx](https://htmx.org/) is a great library/[framework](https://htmx.org/essays/is-htmx-another-javascript-framework/) for sprinkling
interactivity to hypermedia sites. However, when I create entities that can be dynamically opened and closed (e.g. tabs or windows), I find
htmx gets a bit too rigid. hx-new is an experimental extension which aims to make htmx 10% more dynamic by adding templates with more advanced
wiring (#id namespaces, anti-duplication measures, multiple targeting, oncreate events).

Examples: [tabs](https://tailcalled.github.io/hx-new/examples/tabs.html) ([src](https://github.com/tailcalled/hx-new/blob/main/examples/tabs.html)), [windows](https://tailcalled.github.io/hx-new/examples/windows.html) ([src](https://github.com/tailcalled/hx-new/blob/main/examples/windows.html)).

# Basic principles

To use hx-new, include [hx-new.js](https://github.com/tailcalled/hx-new/blob/main/src/hx-new.js) and put `hx-ext="hx-new"` on a parent element (e.g. the body). This exposes a new [hx-swap](https://htmx.org/attributes/hx-swap/) option, namely `hx-swap="new:<selector>"`, where `<selector>` is any CSS selector which finds a desired template.

hx-new instantiates the template specified by `<selector>` and places the response body within its element that contains a `hx-slot` attribute. Rather than being placed according to the `hx-target` and `hx-swap` of the original request, the template instance gets placed according to the `hx-target` and `hx-swap` on the template element.

Features:

 * A template can contain nested template elements. When such a template is instantiated, all of the nested templates get instantiated too, and routed to their own location based on their own `hx-target` and `hx-swap`. The [tabs](https://github.com/tailcalled/hx-new/blob/main/examples/tabs.html) example uses this to send the tab content and tab header to different places.
 * When a template is instantiated, all of its IDs are replaced. So e.g. if the template is declared to have an element with id `#tab-elements`, it may be replaced with `#tab-elements-9797446247116723`. To refer to an ID, add an asterisk at the end of the HTML attribute.
 * When `hx-new` is asked to swap in a response from a URL that has already been swapped in, we update the existing element instead of instantiating a new copy of the template.
 * Once the elements are instantiated, the Javascript in `hx-new:oncreate` attributes is run.
 * The templates can refer to the original response URL using `htmx://response-url/` (not shown in any examples currently, sorry).

# Should I use hx-new?

If you are not making components for htmx, you should not use hx-new.

If you can render your components with server side templating, do that rather than using hx-new.

Or if you want to render them on the client, use [facet](https://github.com/kgscialdone/facet).

If you do not want to rely on experimental/incomplete technology, make hand-written components rather than using hx-new.

If you still want to continue, I welcome PRs with cleanups, extensions, bugfixes, etc.. (I cannot promise to include any PRs, no matter how well-written.)
