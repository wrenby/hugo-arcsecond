import * as params from '@params';

let definitionsRequest = fetch("/definitions.json");

function createAllTooltips(definitions) {
    let terms = document.getElementsByClassName("term");
    for (t of terms) {
        const term = t.getAttribute("data-term");
        createTooltip(t, term, definitions[term]);
    }
}

function createTooltip(term_elem, term, defn) {
    if (term_elem.childElementCount == 0) {
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
}

function resetAllTooltipPositions() {
    for (term of document.getElementsByClassName("term")) {
        term.firstElementChild.style.top = "-999px";
        term.firstElementChild.style.left = "-999px";
    }
}

function positionTooltip(term_elem) {
    let tooltip = term_elem.firstElementChild;
    if (tooltip) {
        // this event will never fail on a term element, but it will also fire on definition-outer/inner elements and clog up the error console
        const objRect = term_elem.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        let goalX = objRect.left + objRect.width / 2 - tooltipRect.width / 2;
        let goalY = objRect.top - tooltipRect.height;
        const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);

        goalX = Math.min(vw - tooltipRect.width, Math.max(goalX, 0));
        if (goalY < 0)
            goalY = objRect.bottom;

        tooltip.style.top = (goalY + window.scrollY) + "px";
        tooltip.style.left = (goalX + window.scrollX) + "px";
    }
}

function initSearchResultTooltipPositioner(definitions) {
    // enable definition tooltips inside search results
    const searchResultsList = document.getElementById('search-results');
    const config = { attributes: false, childList: true, subtree: false };

    const callback = (mutationList, observer) => {
        for (const mutation of mutationList) {
            if (mutation.type === "childList") {
                for (const div of mutation.addedNodes) {
                    // will be a div for a successful search, but will be a text node on error or no results
                    if (div.nodeType == Node.ELEMENT_NODE) {
                        for (const t of div.getElementsByClassName("term")) {
                            const term = t.getAttribute("data-term");
                            createTooltip(t, term, definitions[term]);
                        }
                    }
                }
            }
        }
    };
    if (searchResultsList) {
        const observer = new MutationObserver(callback);
        observer.observe(searchResultsList, config);
    }
}

async function initTooltipPositioner() {
    const definitions = await (await definitionsRequest).json();
    // set the search results listener before the full-page tooltip positioner so nothing falls through the cracks
    initSearchResultTooltipPositioner(definitions);
    createAllTooltips(definitions);
    window.addEventListener("resize", resetAllTooltipPositions);
}

function initInfiniteScroll(gallery, mason) {
    let nextElem = document.querySelector(".pagination *[aria-label='Next']");
    let next = nextElem ? nextElem.getAttribute("href") : null;
    let pagination = document.getElementsByClassName("pagination")[0];
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
    const loader = document.getElementById("infinite-loader");
    let callback = (entries, obs) => {
        entries.forEach(async (entry) => {
            if (entry.isIntersecting) {
                do {
                    const response = await (await fetch(next)).text();
                    const page = document.createElement("div");
                    page.innerHTML = response;

                    const newItems = page.querySelectorAll(".gallery-grid-item");
                    // can't use getElementsByClassName because the iterator will invalidate as we appendChild them to the gallery
                    for (const item of newItems) {
                        gallery.appendChild(item);
                        mason.appended(item);
                    }
                    mason.layout();
                    for (const item of newItems) {
                        playAnimationAfterImageLoaded(item);
                    }

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

function playAnimationAfterImageLoaded(gridItem) {
    let thumbnail = gridItem.getElementsByTagName("img")[0];
    if (thumbnail && !thumbnail.complete) {
        thumbnail.addEventListener('load', () => { gridItem.style.animationPlayState = "running"; });
    } else {
        gridItem.style.animationPlayState = "running";
    }
}

function layoutGallery() {
    const gallery = document.getElementById('gallery-grid');
    if (gallery) {
        let mason = new Masonry(gallery, {
            itemSelector: '.gallery-grid-item',
            percentPosition: true,
            // horizontalOrder: true,
        });
        for (const item of gallery.getElementsByClassName('gallery-grid-item')) {
            playAnimationAfterImageLoaded(item);
        }

        if (params.infiniteScroll) {
            initInfiniteScroll(gallery, mason);
        }
    }
}

function initSearchBoxCallbacks() {
    const button = document.getElementById("search-button");
    const svg = button.getElementsByTagName("svg")[0];
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
    initTooltipPositioner(); // TODO: breaks layout between 300px and 475px
});