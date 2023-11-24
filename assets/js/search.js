const params = new URLSearchParams(window.location.search)
const query = params.get('q')
let request = fetch("/index.json");

document.addEventListener("DOMContentLoaded", async () => {
    const loading = document.querySelector(".search-loading");
    document.querySelector(".search-noscript").style.display = "none";

    let index = await (await request).json();
    const engine = lunr(function () {
        this.ref('i');
        this.field('url');
        this.field('title', {
            boost: 15
        });
        this.field('tags');
        this.field('categories');
        this.field('content', {
            boost: 10
        });

        for (const [i, entry] of index.entries()) {
            entry.i = i;
            this.add(entry);
        }
    });
    const results = engine.search(query);

    const container = document.querySelector("#search-results");
    if (results.length > 0) {
        for (const [i, r] of results.entries()) {
            const item = index[r.ref];

            const elem = document.createElement("div");
            elem.classList.add("search-result");

            let thumbnail = null;
            if (item.thumbnail) {
                elem.innerHTML = `<div class="search-thumbnail">` +
                    `<a href="${item.url}"><img src="${item.thumbnail}" style="aspect-ratio: ${item.thumbnailAspectRatio};" /></a></div>`;
            } else {
                elem.innerHTML = `<div class="search-thumbnail">` +
                    `<div class="thumbnail-placeholder"></div></div>`;
            }

            elem.innerHTML += `<div><h3><a href="${item.url}">${item.title}</a></h3>` +
            `<p>${item.content.substring(0, 400)}...<p></div>`;

            elem.style.animationDelay = `${i*25}ms`;
            container.appendChild(elem);
        }
    } else {
        container.innerHTML = "No results";
    }
    loading.style.display = "none";
});
