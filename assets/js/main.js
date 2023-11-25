import * as params from '@params';

let definitionsRequest = fetch("/definitions.json");

function createAllTooltips(definitions) {
    let terms = document.getElementsByClassName("term");
    for (t of terms) {
        const term = t.getAttribute("data-term");
        createTooltip(t, term, definitions[term]);
    }
    positionAllTooltips();
    window.addEventListener("resize", positionAllTooltips);
}

function createTooltip(term_elem, term, defn) {
    const tooltip_id = `tooltip-${term.replace(" ", "-")}`;

    let outer = document.createElement("span");
    outer.setAttribute("class", "definition-outer");
    outer.setAttribute("role", "tooltip");
    outer.setAttribute("id", tooltip_id);

    let inner = document.createElement("span");
    inner.setAttribute("class", "definition-inner");
    inner.setAttribute("id", tooltip_id);
    inner.innerHTML = defn;

    outer.appendChild(inner);
    term_elem.appendChild(outer);

    term_elem.setAttribute("aria-describedby", tooltip_id);
    term_elem.addEventListener("mouseover", (ev) => positionTooltip(ev.target));
}

function positionAllTooltips() {
    let terms = document.getElementsByClassName("term");
    for (t of terms) {
        positionTooltip(t);
    }
}

function positionTooltip(term_elem) {
    let tooltip = term_elem.firstElementChild;
    if (tooltip) {
        // this event will never fail on a term element, but it will also fire on definition-outer/inner elements and clog up the error console
        const obj_rect = term_elem.getBoundingClientRect();
        const tooltip_rect = tooltip.getBoundingClientRect();

        let goalX = obj_rect.left + obj_rect.width / 2 - tooltip_rect.width / 2;
        let goalY = obj_rect.top - tooltip_rect.height;
        const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);

        goalX = Math.min(vw - tooltip_rect.width, Math.max(goalX, 0));
        if (goalY < 0)
            goalY = obj_rect.bottom;

        tooltip.style.top = (goalY + window.scrollY) + "px";
        tooltip.style.left = (goalX + window.scrollX) + "px";
    }
}

function initSearchResultTooltipPositioner(definitions) {
    // enable definition tooltips inside search results
    const search_results_list = document.querySelector('#search-results');
    const config = { attributes: false, childList: true, subtree: false };

    const callback = (mutationList, observer) => {
        for (const mutation of mutationList) {
            if (mutation.type === "childList") {
                let terms = search_results_list.getElementsByClassName("term");
                for (t of terms) {
                    const term = t.getAttribute("data-term");
                    createTooltip(t, term, definitions[term]);
                    positionTooltip(t);
                }
            }
        }
    };
    if (search_results_list) {
        const observer = new MutationObserver(callback);
        observer.observe(search_results_list, config);
    }
}

async function initTooltipPositioner() {
    const definitions = await (await definitionsRequest).json();
    createAllTooltips(definitions);
    initSearchResultTooltipPositioner(definitions);
}

function initInfiniteScroll(gallery, mason) {
    let nextElem = document.querySelector(".pagination *[aria-label='Next']");
    let next = nextElem ? nextElem.getAttribute("href") : null;
    let pagination = document.querySelector(".pagination");
    if (pagination) {
        pagination.parentElement.remove();
    }

    const options = {
        root: null,
        rootMargin: "0px",
        threshold: 1.0,
    };
    function isElementInViewport(el) {
        var rect = el.getBoundingClientRect();

        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
    const loader = document.querySelector("#infinite-loader")
    let callback = (entries, obs) => {
        entries.forEach(async (entry) => {
            if (entry.isIntersecting) {
                do {
                    const response = await (await fetch(next)).text();
                    const page = document.createElement("div");
                    page.innerHTML = response;

                    page.querySelectorAll(".gallery-grid-item").forEach((item) => {
                        item.style.animationPlayState = "paused";
                        gallery.appendChild(item);
                        mason.appended(item);
                    });
                    mason.layout();
                    gallery.querySelectorAll(".gallery-grid-item").forEach((item) => {
                        item.style.animationPlayState = "running";
                    })

                    nextElem = page.querySelector(".pagination *[aria-label='Next']");
                    next = nextElem ? nextElem.getAttribute("href") : null;
                } while (next && isElementInViewport(loader));
                if (!next) {
                    obs.disconnect();
                }
            }
        })
    };

    if (next) {
        let observer = new IntersectionObserver(callback, options);
        observer.observe(loader);
    }
}

function layoutGallery() {
    const gallery = document.querySelector('#gallery-grid');
    if (gallery) {
        gallery.querySelectorAll('.gallery-grid-item').forEach((item) => {
            item.style.animationPlayState = "paused";
        })
        let mason = new Masonry(gallery, {
            itemSelector: '.gallery-grid-item',
            percentPosition: true,
            // horizontalOrder: true,
        });
        gallery.querySelectorAll('.gallery-grid-item').forEach((item) => {
            item.style.animationPlayState = "running";
        })

        if (params.infiniteScroll) {
            initInfiniteScroll(gallery, mason);
        }
    }
}

function initSearchBoxCallbacks() {
    const button = document.querySelector("#search-button");
    const svg = button.querySelector("svg");
    const box = document.querySelector("#search-box input");
    let should_submit = false;
    box.addEventListener("blur", (ev) => {
        // clicked the search button while the text box was active
        if (button === ev.explicitOriginalTarget || svg === ev.explicitOriginalTarget) {
            should_submit = true;
        }
    });
    box.addEventListener("keydown", (ev) => {
        if (ev.key == 'Escape') {
            ev.preventDefault();
            box.blur();
        }
    });
    button.addEventListener("click", (ev) => {
        if (should_submit) {
            document.search.submit();
        } else {
            box.focus();
        }
    });
    if (params.searchHotKey) {
        document.body.addEventListener("keydown", (ev) => {
            if (ev.key == params.searchHotKey) {
                if (document.activeElement !== box) {
                    ev.preventDefault();
                    box.focus();
                }
            }
        });
    }
}

document.addEventListener("DOMContentLoaded", async (ev) => {
    layoutGallery();
    initSearchBoxCallbacks();
    initTooltipPositioner();
});