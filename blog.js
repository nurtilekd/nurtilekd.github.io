/* ─── Blog reader ────────────────────────────────────────────────────────── */

(function () {
  "use strict";

  /* ════════════════════════════════════════════════════════════════════════
     POST MANIFEST
     ──────────────────────────────────────────────────────────────────────
     Metadata only — actual content lives in  blogs/<file>.md
     To add a post: create the .md file, then add a line here.
     ════════════════════════════════════════════════════════════════════ */

  var posts = [
    {
      file: "hello-world.md",
      title: "Hello, World!",
      date: "2026-03-04",
      description: "Description"
    }
  ];

  /* ════════════════════════════════════════════════════════════════════════
     DOM REFERENCES
     ════════════════════════════════════════════════════════════════════ */

  var grid      = document.getElementById("postGrid");
  var overlay   = document.getElementById("readerOverlay");
  var contentEl = document.getElementById("readerContent");
  var listEl    = document.getElementById("readerList");
  var tocListEl = document.getElementById("readerTocList");
  var menuBtn   = document.getElementById("readerMenuBtn");
  var prevBtn   = document.getElementById("prevPost");
  var nextBtn   = document.getElementById("nextPost");
  var prevLabel = document.getElementById("prevLabel");
  var nextLabel = document.getElementById("nextLabel");

  var currentIndex = -1;
  var backdrop     = null;
  var cache        = {};           // file → parsed HTML
  var tocObserver  = null;         // reused IntersectionObserver

  /* ════════════════════════════════════════════════════════════════════════
     RENDER POST CARDS
     ════════════════════════════════════════════════════════════════════ */

  function renderCards() {
    if (posts.length === 0) {
      grid.innerHTML = '<p class="post-grid-empty">Nothing here yet.</p>';
      return;
    }

    grid.innerHTML = posts.map(function (p, i) {
      return (
        '<div class="post-card" data-index="' + i + '">' +
          '<div class="post-card-title">' + esc(p.title) + '</div>' +
          '<div class="post-card-date">' + niceDate(p.date) + '</div>' +
          '<div class="post-card-desc">' + esc(p.description) + '</div>' +
        '</div>'
      );
    }).join("");

    grid.querySelectorAll(".post-card").forEach(function (card) {
      card.addEventListener("click", function () {
        openPost(parseInt(this.dataset.index, 10));
      });
    });
  }

  /* ════════════════════════════════════════════════════════════════════════
     FETCH + PARSE MARKDOWN
     ════════════════════════════════════════════════════════════════════ */

  function loadPost(index, cb) {
    var file = posts[index].file;

    if (cache[file]) {
      cb(cache[file]);
      return;
    }

    fetch("blogs/" + file)
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.text();
      })
      .then(function (md) {
        var html = marked.parse(md);
        cache[file] = html;
        cb(html);
      })
      .catch(function () {
        cb('<p style="opacity:.5">Could not load post.</p>');
      });
  }

  /* ════════════════════════════════════════════════════════════════════════
     OPEN / CLOSE READER
     ════════════════════════════════════════════════════════════════════ */

  function openPost(index, skipPush) {
    currentIndex = index;

    /* show loading state immediately */
    overlay.classList.add("open");
    document.body.classList.add("reader-open");
    contentEl.innerHTML = '<p class="reader-loading">Loading…</p>';

    renderSidebar();
    updateNav();

    /* push browser history so back button works */
    if (!skipPush) {
      history.pushState({ post: index }, "", "#post/" + posts[index].file.replace(".md", ""));
    }

    /* fetch and render */
    loadPost(index, function (html) {
      contentEl.innerHTML =
        '<h1>' + esc(posts[index].title) + '</h1>' +
        '<div class="reader-date">' + niceDate(posts[index].date) + '</div>' +
        html;
      contentEl.scrollTop = 0;
      buildToc();
    });
  }

  function closeReader(skipPush) {
    if (!overlay.classList.contains("open")) return;
    overlay.classList.remove("open");
    document.body.classList.remove("reader-open");
    closeDrawer();
    currentIndex = -1;

    if (!skipPush) {
      history.pushState(null, "", window.location.pathname); // back to clean URL
    }
  }

  /* ════════════════════════════════════════════════════════════════════════
     HISTORY (back / forward button)
     ════════════════════════════════════════════════════════════════════ */

  window.addEventListener("popstate", function (e) {
    if (e.state && typeof e.state.post === "number") {
      openPost(e.state.post, true);
    } else {
      closeReader(true);
    }
  });

  /* If page loads with a #post/... hash, open that post */
  function checkHash() {
    var m = location.hash.match(/^#post\/(.+)$/);
    if (!m) return;
    var slug = m[1];
    for (var i = 0; i < posts.length; i++) {
      if (posts[i].file.replace(".md", "") === slug) {
        openPost(i, true);
        return;
      }
    }
  }

  /* ════════════════════════════════════════════════════════════════════════
     TOPBAR NAV → closes reader
     ════════════════════════════════════════════════════════════════════ */

  document.querySelectorAll(".site-nav a").forEach(function (link) {
    link.addEventListener("click", function () {
      closeReader();
    });
  });

  /* Escape key also closes */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlay.classList.contains("open")) {
      closeReader();
    }
  });

  /* ════════════════════════════════════════════════════════════════════════
     LEFT SIDEBAR (post list)
     ════════════════════════════════════════════════════════════════════ */

  function renderSidebar() {
    var heading = listEl.querySelector(".reader-list-heading");

    /* remove old links */
    while (listEl.lastChild !== heading) {
      listEl.removeChild(listEl.lastChild);
    }

    posts.forEach(function (p, i) {
      var a = document.createElement("a");
      a.className = "reader-list-link" + (i === currentIndex ? " active" : "");
      a.textContent = p.title;
      a.href = "#post/" + p.file.replace(".md", "");
      a.addEventListener("click", function (e) {
        e.preventDefault();
        openPost(i);
        closeDrawer();
      });
      listEl.appendChild(a);
    });
  }

  /* ════════════════════════════════════════════════════════════════════════
     RIGHT SIDEBAR (table of contents)
     ════════════════════════════════════════════════════════════════════ */

  function buildToc() {
    tocListEl.innerHTML = "";
    if (tocObserver) tocObserver.disconnect();

    var headings = contentEl.querySelectorAll("h2, h3");

    headings.forEach(function (h, i) {
      var id = "s-" + i;
      h.id = id;

      var li = document.createElement("li");
      var a  = document.createElement("a");
      a.className = "reader-toc-link" + (h.tagName === "H3" ? " depth-3" : "");
      a.textContent = h.textContent;
      a.href = "#" + id;
      a.addEventListener("click", function (e) {
        e.preventDefault();
        h.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      li.appendChild(a);
      tocListEl.appendChild(li);
    });

    /* scroll-based highlight */
    if ("IntersectionObserver" in window && headings.length) {
      var links = tocListEl.querySelectorAll(".reader-toc-link");
      tocObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            links.forEach(function (l) { l.classList.remove("active"); });
            var hit = tocListEl.querySelector('a[href="#' + entry.target.id + '"]');
            if (hit) hit.classList.add("active");
          }
        });
      }, { root: contentEl, rootMargin: "-10% 0px -80% 0px" });

      headings.forEach(function (h) { tocObserver.observe(h); });
    }
  }

  /* ════════════════════════════════════════════════════════════════════════
     PREV / NEXT
     ════════════════════════════════════════════════════════════════════ */

  function updateNav() {
    var hasPrev = currentIndex > 0;
    var hasNext = currentIndex < posts.length - 1;

    prevBtn.disabled = !hasPrev;
    nextBtn.disabled = !hasNext;
    prevLabel.textContent = hasPrev ? posts[currentIndex - 1].title : "";
    nextLabel.textContent = hasNext ? posts[currentIndex + 1].title : "";
  }

  prevBtn.addEventListener("click", function () {
    if (currentIndex > 0) openPost(currentIndex - 1);
  });

  nextBtn.addEventListener("click", function () {
    if (currentIndex < posts.length - 1) openPost(currentIndex + 1);
  });

  /* ════════════════════════════════════════════════════════════════════════
     MOBILE DRAWER
     ════════════════════════════════════════════════════════════════════ */

  function ensureBackdrop() {
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.className = "reader-backdrop";
      overlay.appendChild(backdrop);
      backdrop.addEventListener("click", closeDrawer);
    }
  }

  function openDrawer() {
    ensureBackdrop();
    listEl.classList.add("drawer-open");
    backdrop.classList.add("visible");
  }

  function closeDrawer() {
    listEl.classList.remove("drawer-open");
    if (backdrop) backdrop.classList.remove("visible");
  }

  menuBtn.addEventListener("click", openDrawer);

  /* ════════════════════════════════════════════════════════════════════════
     HELPERS
     ════════════════════════════════════════════════════════════════════ */

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function niceDate(iso) {
    var p = iso.split("-");
    var m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return m[parseInt(p[1], 10) - 1] + " " + parseInt(p[2], 10) + ", " + p[0];
  }

  /* ════════════════════════════════════════════════════════════════════════
     INIT
     ════════════════════════════════════════════════════════════════════ */

  renderCards();
  checkHash();
})();