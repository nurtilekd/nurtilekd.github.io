/* ─── Blog reader ────────────────────────────────────────────────────────── */

(function () {
  "use strict";

  /* ════════════════════════════════════════════════════════════════════════
     POST DATA
     ──────────────────────────────────────────────────────────────────────
     Each post has: id, title, date, description, and body (HTML string).
     Add new posts here — everything else updates automatically.
     ════════════════════════════════════════════════════════════════════ */

  var posts = [
    {
      id: "hello-world",
      title: "Hello, World!",
      date: "2026-03-04",
      description: "First post on this blog — a short intro on what to expect.",
      body: "\
<h2>Why a blog?</h2>\
<p>I have always wanted a place to collect ideas that don't fit neatly into a\
 homework submission or a lab report. This is that place.</p>\
<h3>What I'll write about</h3>\
<p>Expect a mix of CS deep dives, math puzzles, and reflections on studying\
 abroad. Some posts will be polished, some will be rough sketches of an idea.\
 That's fine.</p>\
<h2>Tools I used</h2>\
<p>This whole site is plain HTML, CSS, and vanilla JS — no frameworks,\
 no build step. I like keeping things simple.</p>\
<h3>Hosting</h3>\
<p>GitHub Pages. Free, fast, and close to the code.</p>\
<h2>What's next</h2>\
<p>A post about my first semester experience with machine-learning coursework\
 at KAIST. Stay tuned.</p>"
    },
    {
      id: "ml-semester",
      title: "Surviving an ML Course",
      date: "2026-03-04",
      description: "Notes from my first few weeks in a machine learning class.",
      body: "\
<h2>First impressions</h2>\
<p>The syllabus looked intimidating: entropy, KL divergence, variational\
 inference — all in the first month. I wasn't sure I was ready.</p>\
<h3>Lecture style</h3>\
<p>The professor derives everything on the board, no slides. It forces you to\
 keep up, but it also means you really understand each step.</p>\
<h2>Study strategy</h2>\
<p>I started re-deriving every formula from scratch after lecture. Slow at\
 first, but it builds real intuition over time.</p>\
<h3>PyTorch homework</h3>\
<p>The assignments are all in PyTorch. Writing the training loop by hand\
 (instead of using a high-level wrapper) was the biggest learning moment.</p>\
<h2>Takeaways so far</h2>\
<p>Understanding beats memorisation. If you can derive it, you own it.</p>"
    },
    {
      id: "setup-old-pc",
      title: "Reviving a 10-Year-Old PC",
      date: "2026-03-04",
      description: "Helping a family member get online with decade-old hardware.",
      body: "\
<h2>The situation</h2>\
<p>My relative had an old desktop collecting dust — still running Windows 10,\
 no WiFi card, and a VGA monitor that refused to show a picture.</p>\
<h3>Display fix</h3>\
<p>Turned out the VGA cable was loose. A firm push and the monitor lit up.\
 Sometimes the simplest fix is the right one.</p>\
<h2>Getting online</h2>\
<p>No Ethernet near the desk. A USB WiFi adapter solved it for about $10.</p>\
<h3>Driver headaches</h3>\
<p>Windows 10 picked up the adapter automatically — no driver hunting needed.\
 A pleasant surprise for old hardware.</p>\
<h2>Final setup</h2>\
<p>Installed a browser, set up an email account, and walked through the\
 basics. The machine is slow, but perfectly fine for web browsing and email.</p>"
    }
  ];

  /* ════════════════════════════════════════════════════════════════════════
     DOM REFERENCES
     ════════════════════════════════════════════════════════════════════ */

  var grid         = document.getElementById("postGrid");
  var overlay      = document.getElementById("readerOverlay");
  var contentEl    = document.getElementById("readerContent");
  var listEl       = document.getElementById("readerList");
  var tocListEl    = document.getElementById("readerTocList");
  var closeBtn     = document.getElementById("readerClose");
  var menuBtn      = document.getElementById("readerMenuBtn");
  var prevBtn      = document.getElementById("prevPost");
  var nextBtn      = document.getElementById("nextPost");
  var prevLabel    = document.getElementById("prevLabel");
  var nextLabel    = document.getElementById("nextLabel");

  var currentIndex = 0;
  var backdrop     = null;  // created lazily

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
          '<div class="post-card-date">' + formatDate(p.date) + '</div>' +
          '<div class="post-card-desc">' + esc(p.description) + '</div>' +
        '</div>'
      );
    }).join("");

    grid.querySelectorAll(".post-card").forEach(function (card) {
      card.addEventListener("click", function () {
        openReader(parseInt(this.dataset.index, 10));
      });
    });
  }

  /* ════════════════════════════════════════════════════════════════════════
     OPEN / CLOSE READER
     ════════════════════════════════════════════════════════════════════ */

  function openReader(index) {
    currentIndex = index;
    renderReader();
    overlay.classList.add("open");
    document.body.classList.add("reader-open");
  }

  function closeReader() {
    overlay.classList.remove("open");
    document.body.classList.remove("reader-open");
    closeDrawer();
  }

  closeBtn.addEventListener("click", closeReader);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlay.classList.contains("open")) {
      closeReader();
    }
  });

  /* ════════════════════════════════════════════════════════════════════════
     RENDER READER CONTENTS
     ════════════════════════════════════════════════════════════════════ */

  function renderReader() {
    var post = posts[currentIndex];

    /* ── centre: article ── */
    contentEl.innerHTML =
      '<h1>' + esc(post.title) + '</h1>' +
      '<div class="reader-date">' + formatDate(post.date) + '</div>' +
      post.body;

    contentEl.scrollTop = 0;

    /* ── left sidebar: post list ── */
    var heading = listEl.querySelector(".reader-list-heading");
    // remove old links
    Array.from(listEl.children).forEach(function (child) {
      if (child !== heading) listEl.removeChild(child);
    });

    posts.forEach(function (p, i) {
      var a = document.createElement("a");
      a.className = "reader-list-link" + (i === currentIndex ? " active" : "");
      a.textContent = p.title;
      a.href = "#";
      a.addEventListener("click", function (e) {
        e.preventDefault();
        openReader(i);
        closeDrawer();
      });
      listEl.appendChild(a);
    });

    /* ── right sidebar: TOC ── */
    buildToc();

    /* ── prev / next ── */
    var hasPrev = currentIndex > 0;
    var hasNext = currentIndex < posts.length - 1;

    prevBtn.disabled = !hasPrev;
    nextBtn.disabled = !hasNext;
    prevLabel.textContent = hasPrev ? posts[currentIndex - 1].title : "";
    nextLabel.textContent = hasNext ? posts[currentIndex + 1].title : "";
  }

  /* ════════════════════════════════════════════════════════════════════════
     TABLE OF CONTENTS (auto-generated from h2 / h3)
     ════════════════════════════════════════════════════════════════════ */

  function buildToc() {
    tocListEl.innerHTML = "";
    var headings = contentEl.querySelectorAll("h2, h3");

    headings.forEach(function (h, i) {
      var id = "rd-" + i;
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

    /* highlight on scroll */
    if ("IntersectionObserver" in window) {
      var links = tocListEl.querySelectorAll(".reader-toc-link");
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            links.forEach(function (l) { l.classList.remove("active"); });
            var match = tocListEl.querySelector('a[href="#' + entry.target.id + '"]');
            if (match) match.classList.add("active");
          }
        });
      }, { root: contentEl, rootMargin: "-10% 0px -80% 0px" });

      headings.forEach(function (h) { observer.observe(h); });
    }
  }

  /* ════════════════════════════════════════════════════════════════════════
     PREV / NEXT
     ════════════════════════════════════════════════════════════════════ */

  prevBtn.addEventListener("click", function () {
    if (currentIndex > 0) openReader(currentIndex - 1);
  });

  nextBtn.addEventListener("click", function () {
    if (currentIndex < posts.length - 1) openReader(currentIndex + 1);
  });

  /* ════════════════════════════════════════════════════════════════════════
     MOBILE DRAWER (left sidebar)
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

  function esc(str) {
    var d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  function formatDate(iso) {
    var parts = iso.split("-");
    var months = [
      "Jan","Feb","Mar","Apr","May","Jun",
      "Jul","Aug","Sep","Oct","Nov","Dec"
    ];
    return months[parseInt(parts[1], 10) - 1] + " " + parseInt(parts[2], 10) + ", " + parts[0];
  }

  /* ════════════════════════════════════════════════════════════════════════
     INIT
     ════════════════════════════════════════════════════════════════════ */

  renderCards();
})();