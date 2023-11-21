fetch("/definitions.json")
    .then(response => {
        return response.json();
    })
    .then(definitions => {
        if (document.readySate == "loading") {
            document.addEventListener("DOMContentLoaded", () => create_all_tooltips(definitions));
        } else {
            create_all_tooltips(definitions);
        }
    });

function create_all_tooltips(definitions) {
    let terms = document.getElementsByClassName("term");
    for (t of terms) {
        const term = t.getAttribute("data-term");
        create_tooltip(t, term, definitions[term]);
    }
    position_all_tooltips();
    window.addEventListener("resize", position_all_tooltips);
}

function create_tooltip(term_elem, term, defn) {
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
    term_elem.addEventListener("mouseover", (ev) => position_tooltip(ev.target));
}

function position_all_tooltips() {
    let terms = document.getElementsByClassName("term");
    for (t of terms) {
        position_tooltip(t);
    }
}

function position_tooltip(term_elem) {
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

addEventListener("DOMContentLoaded", (ev) => {
    var grid = document.querySelector('#gallery-grid');
    var msn = new Masonry(grid, {
        itemSelector: '.gallery-grid-item',
        percentPosition: true,
        horizontalOrder: true,
      })
})