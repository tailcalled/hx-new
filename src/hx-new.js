(function() {
    let api = null;

    function* traverse(element) {
        if (!(element instanceof DocumentFragment)) {
            yield element;
        }
        if (element.tagName == "TEMPLATE") {
            for (let child of element.content.children) {
                yield* traverse(child);
            }
        }
        else {
            for (let child of element.children) {
                yield* traverse(child);
            }
        }
    }
    function idTranslate(element) {
        let idTranslation = {};
        let disambiguator = Math.random().toString().substring(2);
        for (let node of traverse(element)) {
            if (node.getAttribute("id")) {
                let newId = node.getAttribute("id") + "-" + disambiguator;
                idTranslation[node.getAttribute("id")] = newId;
                node.setAttribute("id", newId);
            }
        }
        for (let node of traverse(element)) {
            let renameAttributes = [];
            for (let attr of node.attributes) {
                if (attr.name.endsWith("*")) {
                    for (let id of Object.keys(idTranslation)) {
                        attr.value = attr.value.replaceAll("#" + id, "#" + idTranslation[id]);
                    }
                    renameAttributes.push(attr.name);
                }
            }
            for (let attr of renameAttributes) {
                node.setAttribute(attr.substring(0, attr.length-1), node.getAttribute(attr))
                node.removeAttribute(attr);
            }
        }
        return idTranslation;
    }
    function stringify(content) {
        let el = document.createElement("div");
        el.appendChild(content);
        return el.innerHTML;
    }
    function processNode(node, evt) {
        for (let verb of ["get", "post", "delete", "patch", "put"]) {
            if (node.attributes["hx-" + verb] && node.attributes["hx-" + verb].value.startsWith("htmx://response-url/")) {
                node.attributes["hx-" + verb].value = node.attributes["hx-" + verb].value.replace("htmx://response-url/", evt.detail.xhr.responseURL);
            }
        }
    }

    htmx.defineExtension('hx-new', {
        init: function (apiRef) {
            api = apiRef;
        },
        onEvent: function (name, evt) {
            if (name != "htmx:beforeSwap") {
                return;
            }
            let swapStyle = api.getSwapSpecification(evt.detail.requestConfig.elt, undefined).swapStyle;
            if (!swapStyle.startsWith("new:")) {
                return;
            }
            let templateSelector = swapStyle.substring(4);

            let element = document.createElement("template");
            element.innerHTML = evt.detail.serverResponse;
            element = element.content;

            let existing = document.querySelectorAll(`[hx-new\\3aorigin-url=\"${CSS.escape(evt.detail.xhr.responseURL)}\"][hx-new\\3aorigin-template=\"${CSS.escape(templateSelector)}\"]`);
            
            let elementIface = idTranslate(element);

            if (existing.length > 0) {
                for (let node of traverse(element)) {
                    processNode(node, evt);
                }
                let rootSlot = null;
                for (let template of existing) {
                    for (let slot of template.querySelectorAll("[hx-slot]")) {
                        if (slot.getAttribute("hx-slot") == "") continue;
                        let target = slot.getAttribute("hx-slot");
                        if (target.charAt(0) == "#" && elementIface.hasOwnProperty(target.substring(1))) {
                            target = "#" + elementIface[target.substring(1)];
                        }
                        let content = element.querySelector(target);
                        if (content) {
                            slot.replaceChildren(content);
                        }
                    }
                    rootSlot = rootSlot || template.querySelector("[hx-slot=\"\"]");
                }
                if (rootSlot) {
                    rootSlot.replaceChildren(element);
                }
                for (let template of existing) for (let evNode of traverse(template)) {
                    if (evNode.hasAttribute("hx-new:oncreate")) {
                        eval(evNode.getAttribute("hx-new:oncreate"));
                    }
                }
                return false;
            }

            let template = htmx.find(templateSelector);
            let result = template.cloneNode(true);
            let templateIface = idTranslate(result.content);

            for (let node of traverse(result)) {
                if (!node.getAttribute("hx-slot")) continue;
                let target = node.getAttribute("hx-slot");
                if (target.charAt(0) == "#" && elementIface.hasOwnProperty(target.substring(1))) {
                    target = "#" + elementIface[target.substring(1)];
                }
                let content = element.querySelector(target);
                if (content) {
                    node.replaceChildren(content);
                }
            }
            for (let node of traverse(result)) {
                if (!node.hasAttribute("hx-slot") || node.getAttribute("hx-slot") != "") continue;
                node.replaceChildren(element);
            }

            for (let node of traverse(result)) {
                processNode(node, evt);
            }

            let templates = [result];
            for (let template of traverse(result)) {
                if (template.tagName != "TEMPLATE") continue;
                for (let child of template.content.children) {
                    child.setAttribute("hx-new:origin-url", evt.detail.xhr.responseURL);
                    child.setAttribute("hx-new:origin-template", templateSelector);
                }
                templates.push(template);
                template.remove();
            }
            
            let settleInfos = []
            for (let template of templates) {
                let newStyle = template.getAttribute("hx-swap") || swapStyle;
                let newTarget = document.querySelector(template.getAttribute("hx-target")) || evt.detail.target;
                let settleInfo = api.makeSettleInfo(newTarget)
                api.selectAndSwap(newStyle, newTarget, template, stringify(template.content), settleInfo);
                settleInfos.push(settleInfo);
            }
            let combinedSettleInfo = {
                elts: settleInfos.flatMap(x => x.elts),
                tasks: settleInfos.flatMap(x => x.tasks),
                title: undefined, // ??? what is
            }
            api.settleImmediately(combinedSettleInfo);
        
            for (let elt of combinedSettleInfo.elts) {
                for (let node of elt.querySelectorAll(":scope [hx-new\\3aoncreate]")) {
                    eval(node.getAttribute("hx-new:oncreate"));
                }
            }

            return false;
        }
    })
})()