// Scroll-spy client script (#20) — the ToC sidebar's "you are here" highlight.
//
// Exported as a STRING constant (not read from disk) so the interpreter's
// browser bundle stays fs-free — the same convention as the chapter-nav and
// hover-preview assets. The interpreter injects this as an inline <script>
// whenever a ToC sidebar is rendered (article or book); see index.js.
//
// ── The hand-authored-render-JS convention (#20 sets it) ────────────────────
// This is enscribe's first FIRST-PARTY, hand-authored render script, as
// distinct from the bundled third-party DSL-rendering libraries (mermaid / abc)
// the live-link/live-inline paths already ship, and from the chapter-nav script
// (also first-party, but book-only navigation, not a reading-time enhancement).
// The convention, which the next such feature (#52 hover previews) should
// follow:
//   - inline, self-contained, dependency-free vanilla JS;
//   - injected as an inline <script> so the document stays self-contained;
//   - a PURE progressive enhancement — the page is fully functional without it.
// Scroll-spy adds only a runtime highlight over markup that already exists (the
// ToC links and the section ids they target). JS off → the ToC still navigates,
// just with no live highlight. It introduces no new content or meaning into the
// markup; the only thing it adds is the active hook (aria-current + classes),
// set and cleared at runtime.
//
// "Current" section = the last section heading to cross a threshold line near
// the top of the viewport (not the max-viewport-area heuristic). An
// IntersectionObserver on the section elements (the ToC links' targets) triggers
// a recompute; the recompute picks the last target whose top is above the line,
// with graceful ends (first section active at the very top, last stays active at
// the bottom). The active entry AND its ancestor trail light up — the "you are
// here" path in a nested ToC — and aria-current="location" marks the active
// entry for assistive tech.

export const SCROLL_SPY_JS = `(function () {
  function init() {
    var nav = document.querySelector('nav.enscribe-toc');
    if (!nav) return;
    var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
    if (!links.length) return;

    // Map each ToC link to its target section, in document order.
    var linkById = {};
    var targets = [];
    links.forEach(function (a) {
      var href = a.getAttribute('href') || '';
      if (href.charAt(0) !== '#') return;
      var id = decodeURIComponent(href.slice(1));
      var el = document.getElementById(id);
      if (el) { linkById[id] = a; targets.push(el); }
    });
    if (!targets.length) return;

    function visible(el) { return el.offsetParent !== null; } // false for display:none (e.g. a chapter-nav-hidden chapter)

    function directLink(li) {
      for (var i = 0; i < li.children.length; i++) {
        var c = li.children[i];
        if (c.tagName && c.tagName.toLowerCase() === 'a') return c;
      }
      return null;
    }

    var currentId = null;
    function setActive(id) {
      if (id === currentId) return;
      currentId = id;
      links.forEach(function (a) {
        a.removeAttribute('aria-current');
        a.classList.remove('enscribe-toc-active', 'enscribe-toc-active-trail');
      });
      var a = linkById[id];
      if (!a) return;
      a.classList.add('enscribe-toc-active');
      a.setAttribute('aria-current', 'location');
      // Ancestor trail: walk up the nested <li>/<ul> structure, marking each
      // ancestor entry's own <a> (the "you are here" path).
      var li = a.parentNode;
      while (li && li.tagName && li.tagName.toLowerCase() === 'li') {
        var ul = li.parentNode;                     // enclosing <ul>
        var parentLi = ul ? ul.parentNode : null;   // ancestor <li>, or the <details>
        if (parentLi && parentLi.tagName && parentLi.tagName.toLowerCase() === 'li') {
          var pa = directLink(parentLi);
          if (pa) pa.classList.add('enscribe-toc-active-trail');
          li = parentLi;
        } else {
          break;
        }
      }
    }

    function firstVisibleId() {
      for (var i = 0; i < targets.length; i++) { if (visible(targets[i])) return targets[i].id; }
      return targets[0].id;
    }
    function lastVisibleId() {
      for (var i = targets.length - 1; i >= 0; i--) { if (visible(targets[i])) return targets[i].id; }
      return null;
    }

    function update() {
      var marker = window.innerHeight * 0.2; // the "top threshold" line
      var activeId = null;
      for (var i = 0; i < targets.length; i++) {
        var el = targets[i];
        if (!visible(el)) continue;
        if (el.getBoundingClientRect().top <= marker) activeId = el.id; // last to cross the top wins
      }
      // Ends. Before the first heading crosses the line, the first section is
      // current; at the very bottom of the page, keep the last section active
      // even though its top sits below the line.
      if (activeId === null) activeId = firstVisibleId();
      var atBottom = (window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 2);
      if (atBottom) { var lastId = lastVisibleId(); if (lastId) activeId = lastId; }
      if (activeId) setActive(activeId);
    }

    if ('IntersectionObserver' in window) {
      // The observer is the efficient TRIGGER (no scroll-handler thrash); the
      // top band it watches brackets the threshold line, and update() does the
      // authoritative "last above the line" computation on each crossing.
      var io = new IntersectionObserver(update, { rootMargin: '0px 0px -70% 0px', threshold: 0 });
      targets.forEach(function (t) { io.observe(t); });
    }
    window.addEventListener('resize', update);
    update();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();`;
