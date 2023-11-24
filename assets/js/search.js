const params = new URLSearchParams(window.location.search)
const query = params.get('q')
let request = fetch("/index.json");

document.addEventListener("DOMContentLoaded", async () => {
    const loading = document.querySelector(".search-loading");
    loading.innerHTML = "Loading...";

    let index = await (await request).json();
    const engine = lunr(function () {
        this.ref('i');
        this.field('permalink');
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

    if (results.length > 0) {
        let resultList = '';
        for (const n of results) {
          const item = index[n.ref];
          resultList += `<li><h3><a href="${item.permalink}">${item.title}</a></h3>` +
            `<p>${item.content.substring(0, 500)}...<p></li>`;
        }
        document.querySelector("#search-results").innerHTML = resultList;
    } else {
        document.querySelector("#search-results").innerHTML = "No results";
    }
    loading.style.display = "none";
});
