// "On this page" rail client script (Slice C — the book reading interface).
//
// Exported as a STRING constant (not read from disk) so the interpreter's browser
// bundle stays fs-free — the same convention as the scroll-spy and chapter-nav
// assets. The interpreter injects this as an inline <script> ONLY for a book
// document with a ToC (it drives the right "on this page" rail that the book ToC
// emits; an article ToC never has that rail, so the script no-ops and is not
// injected for articles — keeping the article render byte-identical).
//
// It is a PURE progressive enhancement, layered over markup that already exists:
// the right rail lists EVERY chapter's sections statically (so the produced HTML is
// byte-identical static≡live, per render-parity.md). With JS off, all groups show —
// a full "on this page" for the book. With JS on, the rail narrows to the CURRENT
// chapter's sections and highlights the in-view one. The left chapter rail is the
// SCROLL_SPY script's job (it is `nav.enscribe-toc`); this script owns only the
// right rail, so the two highlighters never collide.
//
// Mechanism mirrors scroll-spy: an IntersectionObserver triggers a recompute; the
// recompute is the authoritative "last heading above a threshold line" pass. The
// CURRENT chapter (which `<book-part>` is in view) selects the visible section
// group; the in-view section highlights within it.

export const ON_THIS_PAGE_JS = `(function () {
  function init() {
    var rail = document.querySelector('nav.enscribe-onthispage');
    if (!rail) return;
    var groups = Array.prototype.slice.call(rail.querySelectorAll('.enscribe-onthispage-chapter'));
    var chapters = Array.prototype.slice.call(document.querySelectorAll('book-part'));
    if (!groups.length || !chapters.length) return;

    // Map each right-rail section link to its target section, in document order, and
    // record which chapter group each section belongs to (its data-chapter), so the
    // active-section search can be scoped to the CURRENT chapter — otherwise, in the
    // window after scrolling into chapter N but before N's first section crosses the
    // line, the highlight would stick on N-1's (now hidden) last section.
    var linkById = {};
    var sections = [];
    var chapterOfSection = {};
    groups.forEach(function (g) {
      var chId = g.getAttribute('data-chapter');
      Array.prototype.forEach.call(g.querySelectorAll('a[href^="#"]'), function (a) {
        var id = decodeURIComponent((a.getAttribute('href') || '').slice(1));
        var el = id && document.getElementById(id);
        if (el) { linkById[id] = a; sections.push(el); chapterOfSection[id] = chId; }
      });
    });

    // Switching the rail into JS mode: CSS now shows ONLY the current chapter's
    // group (the static markup showed all groups for the no-JS case).
    rail.classList.add('enscribe-onthispage--spied');

    function visible(el) { return el.offsetParent !== null; }
    function lastAbove(list, marker) {
      var found = null;
      for (var i = 0; i < list.length; i++) {
        if (!visible(list[i])) continue;
        if (list[i].getBoundingClientRect().top <= marker) found = list[i];
      }
      return found;
    }

    var curChapter = null, curSection = null;
    function update() {
      var marker = window.innerHeight * 0.2; // the "top threshold" line
      // CURRENT chapter → which section group is shown.
      var ch = lastAbove(chapters, marker) || (visible(chapters[0]) ? chapters[0] : null);
      var chId = ch ? ch.id : null;
      if (chId !== curChapter) {
        curChapter = chId;
        groups.forEach(function (g) {
          g.classList.toggle('enscribe-onthispage-chapter--current', g.getAttribute('data-chapter') === chId);
        });
      }
      // CURRENT section → which entry is highlighted (aria-current + active class,
      // the same hooks scroll-spy uses, so the theme styles both rails alike). Scope
      // the search to the current chapter's own sections so the highlight always
      // lives in the visible group (no stuck highlight on a hidden previous chapter).
      var inChapter = sections.filter(function (s) { return chapterOfSection[s.id] === chId; });
      var sec = lastAbove(inChapter, marker);
      var secId = sec ? sec.id : null;
      if (secId !== curSection) {
        curSection = secId;
        Object.keys(linkById).forEach(function (id) {
          var a = linkById[id], on = id === secId;
          a.classList.toggle('enscribe-toc-active', on);
          if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
        });
      }
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(update, { rootMargin: '0px 0px -70% 0px', threshold: 0 });
      chapters.forEach(function (c) { io.observe(c); });
      sections.forEach(function (s) { io.observe(s); });
    }
    window.addEventListener('resize', update);
    update();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();`;
