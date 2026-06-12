// Chapter-navigation client script (Phase 8 Slice 3).
//
// OPT-IN paging view. As of Slice C, the book + ToC DEFAULT is the one-scroll
// reading interface (left chapter rail, per-chapter prev/next, right "on this
// page" rail — built statically in lib/toc.js); this paging script is injected
// ONLY when `chapterNav: true` is passed explicitly (index.js). It is the
// "single-chapter-at-a-time" alternative, not the book default.
//
// Exported as a STRING constant (not read from disk) so the interpreter's
// browser bundle stays fs-free — the same reason the hover-preview assets are
// swappable.
//
// It is a progressive enhancement: if it never runs, the book renders as one
// long page. When it runs it shows one <book-part> at a time, with the ToC as
// the chapter selector, a prev/next bar, ←/→ keys, URL-hash deep links (with
// working back/forward), and a "show whole book" toggle. Cross-chapter links (a
// <ref> in one chapter pointing at a figure in another) work: any in-page link
// reveals its target's chapter before scrolling.
//
// Highlighting the active chapter in the ToC is left to the scroll-spy script
// (the SOLE highlighter, #20 / Slice C) — this script no longer writes its own
// `.active`/aria-current onto ToC links, so the two never compete.

export const CHAPTER_NAV_JS = `(function () {
  function init() {
  var parts = Array.prototype.slice.call(document.querySelectorAll('book-part'));
  if (parts.length < 2) return; // 0 or 1 chapter — nothing to navigate
  var ids = parts.map(function (p) { return p.id; });
  var showAll = false;

  var bar = document.createElement('nav');
  bar.className = 'enscribe-chapter-nav';
  bar.setAttribute('aria-label', 'Chapter navigation');

  function indexOfId(id) { return ids.indexOf(id); }
  function activeIndex() {
    for (var i = 0; i < parts.length; i++) {
      if (!parts[i].classList.contains('chapter-hidden')) return i;
    }
    return 0;
  }
  function enclosingPart(el) {
    while (el && el.nodeType === 1) {
      if (el.tagName && el.tagName.toLowerCase() === 'book-part') return el;
      el = el.parentNode;
    }
    return null;
  }
  function chapterTitle(i) {
    var t = parts[i].querySelector('book-part-title');
    return t ? t.textContent.replace(/\\s+/g, ' ').trim() : 'Chapter ' + (i + 1);
  }
  function makeLink(cls, id, text) {
    var a = document.createElement('a');
    a.className = cls; a.href = '#' + id; a.textContent = text;
    return a;
  }
  function buildBar(idx) {
    bar.textContent = '';
    if (idx > 0) bar.appendChild(makeLink('enscribe-chapter-prev', ids[idx - 1], '\\u2190 ' + chapterTitle(idx - 1)));
    if (idx < parts.length - 1) bar.appendChild(makeLink('enscribe-chapter-next', ids[idx + 1], chapterTitle(idx + 1) + ' \\u2192'));
  }
  // Show one chapter; optionally scroll to a specific element within it. The ToC
  // highlight is the scroll-spy script's job (the sole highlighter), so this no
  // longer writes its own active class onto ToC links.
  function apply(activeId, scrollTarget) {
    var idx = indexOfId(activeId);
    if (idx < 0) { idx = 0; activeId = ids[0]; }
    parts.forEach(function (p, i) { p.classList.toggle('chapter-hidden', i !== idx); });
    buildBar(idx);
    parts[idx].appendChild(bar);
    var el = scrollTarget ? document.getElementById(scrollTarget) : parts[idx];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start' });
  }
  function navigate(activeId, scrollTarget) {
    if (history.pushState) history.pushState(null, '', '#' + (scrollTarget || activeId));
    apply(activeId, scrollTarget);
  }
  function resolveHash(push) {
    var h = location.hash ? decodeURIComponent(location.hash.slice(1)) : '';
    var part = null, scroll = null;
    if (h) {
      var el = document.getElementById(h);
      part = el ? enclosingPart(el) : null;
      if (part) scroll = part.id === h ? null : h;
    }
    var id = part ? part.id : ids[0];
    if (push && history.replaceState) history.replaceState(null, '', '#' + (scroll || id));
    apply(id, scroll);
  }

  // Any in-page link: reveal its target's chapter, then scroll to the target.
  document.addEventListener('click', function (e) {
    if (showAll) return;
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href === '#') return;
    var targetId = decodeURIComponent(href.slice(1));
    var targetEl = document.getElementById(targetId);
    if (!targetEl) return;
    var part = enclosingPart(targetEl);
    if (!part) return; // target lives outside any chapter (e.g. a shared bibliography)
    e.preventDefault();
    navigate(part.id, part.id === targetId ? null : targetId);
  });

  // Left/right arrows move between chapters (outside text inputs).
  document.addEventListener('keydown', function (e) {
    if (showAll || e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target, tag = (t.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable) return;
    var i = activeIndex();
    if (e.key === 'ArrowRight' && i < parts.length - 1) { e.preventDefault(); navigate(ids[i + 1]); }
    else if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); navigate(ids[i - 1]); }
  });

  window.addEventListener('popstate', function () { if (!showAll) resolveHash(false); });

  // "Show whole book" toggle, added to the ToC.
  var toc = document.querySelector('.enscribe-toc');
  if (toc) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'enscribe-chapter-showall';
    btn.textContent = 'Show whole book';
    btn.addEventListener('click', function () {
      showAll = !showAll;
      btn.textContent = showAll ? 'Read by chapter' : 'Show whole book';
      if (showAll) {
        parts.forEach(function (p) { p.classList.remove('chapter-hidden'); });
        if (bar.parentNode) bar.parentNode.removeChild(bar);
      } else {
        resolveHash(true);
      }
    });
    toc.appendChild(btn);
  }

  resolveHash(true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();`;
