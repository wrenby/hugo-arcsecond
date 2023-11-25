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
        this.field('tag');
        this.field('category');
        this.field('content', {
            boost: 10
        });

        // TODO: support for non-english languages https://lunrjs.com/guides/language_support.html
        var skipField = function (fieldName, fn) {
            return function (token, i, tokens) {
                return token.metadata["fields"].indexOf(fieldName) >= 0 ? token : fn(token, i, tokens);
            }
        }

        // disable stemming and stop word list for titles -- mainly to prevent the About page from being unsearchable
        const skipStopWordFilter = skipField("title", lunr.stopWordFilter);
        lunr.Pipeline.registerFunction(skipStopWordFilter, "skipStopWordFilter");
        this.pipeline.remove(lunr.stopWordFilter);
        this.pipeline.add(skipStopWordFilter);

        const skipStemmer = skipField("title", lunr.stemmer);
        lunr.Pipeline.registerFunction(skipStemmer, "skipStemmer");
        this.pipeline.remove(lunr.stemmer);
        this.pipeline.add(skipStemmer);

        // plaintext-ify the content so HTML tags/attributes don't show up as matches
        let scratch = document.createElement("div");
        for (const [i, entry] of index.entries()) {
            entry.i = i;
            scratch.innerHTML = entry.html;
            entry.content = scratch.textContent;
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

            if (item.thumbnail) {
                elem.innerHTML = `<div class="search-thumbnail">` +
                    `<a href="${item.url}"><img src="${item.thumbnail}" style="aspect-ratio: ${item.thumbnailAspectRatio};" /></a></div>`;
            } else {
                elem.innerHTML = `<div class="search-thumbnail">` +
                    `<div class="thumbnail-placeholder"></div></div>`;
            }

            let content = document.createElement("div");
            content.innerHTML = item.html;

            let truncated = document.createElement("div");
            truncated.innerHTML = `<h3><a href="${item.url}">${item.title}</a></h3>`;

            /* since we're using HTML content instead of plaintext, we have to avoid truncating the string in the middle of definition or citation elements */
            for (let i = 0, charsLeft = 400; charsLeft > 0 && i < content.childNodes.length; i++) {
                const p = truncated.appendChild(document.createElement("p"));
                const paragraph = content.childNodes[i];
                for (let j = 0; charsLeft > 0 && j < paragraph.childNodes.length; j++) {
                    // must clone to avoid invalidating the paragraph.childNodes iterator
                    const clone = paragraph.childNodes[j].cloneNode(true);
                    if (charsLeft < clone.textContent.length) {
                        clone.textContent = `${clone.textContent.substring(0, charsLeft)}...`;
                    }
                    p.appendChild(clone);
                    charsLeft -= clone.textContent.length;
                }
            }
            elem.style.animationDelay = `${i * 25}ms`;
            container.appendChild(elem).appendChild(truncated);
        }
    } else {
        container.innerHTML = "No results";
    }
    loading.style.display = "none";
});
