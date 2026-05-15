/* Hover-preview initialization for acadamark note markers, cross-reference
 * links, and citation markers.
 *
 * Attaches Tippy.js tooltips to:
 *   - <sup data-note-id="..."> note markers (showing note content)
 *   - <a class="ref" href="#..."> cross-reference links (showing the target element)
 *   - <cite class="cite" data-keys="..."> citation markers (showing bib entries)
 *
 * Requires: tippy.js (bundled by acadamark-interpreter or loaded from CDN).
 * The tippy-bundle includes @popperjs/core so no separate Popper script needed.
 */
(function () {
  /**
   * Extract clean note content from a <li> element, stripping the leading
   * <sup> marker and the trailing back-arrow link that appear in the list.
   * Tooltips should show only the note's prose content.
   *
   * @param {Element} noteEl  The <li> element from the note list.
   * @returns {string}  innerHTML of the cloned, stripped element.
   */
  function getNoteContent(noteEl) {
    var clone = noteEl.cloneNode(true);
    // Remove leading superscript marker (e.g. <sup>2</sup>).
    var sup = clone.querySelector('sup');
    if (sup) sup.remove();
    // Remove trailing back-arrow link (e.g. <a class="note-backref">↩</a>).
    var backref = clone.querySelector('.note-backref');
    if (backref) backref.remove();
    return clone.innerHTML.trim();
  }

  /**
   * Extract equation content from a display-math element, stripping the
   * equation-number span so the tooltip shows only the math itself.
   *
   * @param {Element} el  The display-math element.
   * @returns {string}  innerHTML of the cloned, stripped element.
   */
  function getEquationContent(el) {
    var clone = el.cloneNode(true);
    var numSpan = clone.querySelector('.equation-number');
    if (numSpan) numSpan.remove();
    return clone.innerHTML.trim();
  }

  /**
   * Extract figure content from a <figure> element, stripping the
   * figure-label span so the tooltip shows image + caption without "Figure N.".
   *
   * @param {Element} el  The <figure> element.
   * @returns {string}  outerHTML of the cloned, stripped element.
   */
  function getFigureContent(el) {
    var clone = el.cloneNode(true);
    var label = clone.querySelector('.figure-label');
    if (label) label.remove();
    return clone.outerHTML;
  }

  /**
   * Get tooltip content for a <table> cross-reference target.
   * Strips the "Table N." label span to keep the preview compact.
   *
   * @param {Element} el  The <table> element.
   * @returns {string}  outerHTML of the cloned, stripped element.
   */
  function getTableContent(el) {
    var clone = el.cloneNode(true);
    clone.querySelectorAll('.table-label').forEach(function(n) { n.remove(); });
    return clone.outerHTML;
  }

  /**
   * Dispatch to the appropriate content extractor based on the target element type.
   *
   * @param {Element} targetEl  The element pointed to by a ref link.
   * @returns {string}  HTML string to use as tooltip content.
   */
  function getRefTargetContent(targetEl) {
    var tagName = targetEl.tagName.toLowerCase();
    if (tagName === 'display-math') return getEquationContent(targetEl);
    if (tagName === 'figure') return getFigureContent(targetEl);
    if (tagName === 'table') return getTableContent(targetEl);
    if (tagName === 'li') return getNoteContent(targetEl);
    return targetEl.outerHTML;
  }

  /**
   * Attach a Tippy tooltip to a note marker <sup> element.
   *
   * @param {Element} marker  The <sup data-note-id="..."> element.
   */
  function attachNoteTooltip(marker) {
    var noteId = marker.getAttribute('data-note-id');
    var noteEl = document.getElementById(noteId);
    if (!noteEl) return;
    tippy(marker, {
      content: getNoteContent(noteEl),
      allowHTML: true,
      interactive: true,
      placement: 'top',
      theme: 'light-border',
      maxWidth: 400,
      appendTo: document.body,
    });
  }

  /**
   * Attach a Tippy tooltip to an <a class="ref"> cross-reference link.
   * The tooltip shows the content of the element the ref points to.
   * Refs pointing to missing targets are silently skipped.
   *
   * @param {Element} linkEl  The <a class="ref" href="#..."> element.
   */
  function attachRefTooltip(linkEl) {
    var href = linkEl.getAttribute('href');
    if (!href || href.charAt(0) !== '#') return;
    var targetId = href.slice(1);
    var targetEl = document.getElementById(targetId);
    if (!targetEl) return;
    var content = getRefTargetContent(targetEl);
    if (!content) return;
    var maxWidth = (function() {
      var t = targetEl.tagName.toLowerCase();
      if (t === 'display-math') return 500;
      if (t === 'table') return 600;
      return 420;
    })();
    tippy(linkEl, {
      content: content,
      allowHTML: true,
      interactive: false,
      placement: 'top',
      theme: 'light-border',
      maxWidth: maxWidth,
      appendTo: document.body,
    });
  }

  /**
   * Build tooltip content for a <cite class="cite"> element.
   * Looks up each key in data-keys by finding the #ref-KEY element in the
   * bibliography and returning its innerHTML. Keys missing from the
   * bibliography get a placeholder message.
   *
   * @param {Element} citeEl  The <cite class="cite"> element.
   * @returns {string}  HTML string for the tooltip, or '' if no keys found.
   */
  function getCiteContent(citeEl) {
    var keysAttr = citeEl.getAttribute('data-keys') || '';
    if (!keysAttr) return '';
    var keys = keysAttr.split(',').map(function(k) { return k.trim(); }).filter(Boolean);
    if (keys.length === 0) return '';

    var items = keys.map(function(key) {
      var refEl = document.getElementById('ref-' + key);
      if (refEl) {
        return '<li>' + refEl.innerHTML + '</li>';
      }
      return '<li class="cite-missing"><em>' + key + '</em> (not in bibliography)</li>';
    });
    return '<ul class="cite-tooltip-list">' + items.join('') + '</ul>';
  }

  /**
   * Attach a Tippy tooltip to a <cite class="cite"> citation marker.
   * Shows full bibliography entries for each cited key.
   * cite-error elements are deliberately excluded (no tooltip on errors).
   *
   * @param {Element} citeEl  The <cite class="cite"> element.
   */
  function attachCiteTooltip(citeEl) {
    var content = getCiteContent(citeEl);
    if (!content) return;
    tippy(citeEl, {
      content: content,
      allowHTML: true,
      interactive: true,
      placement: 'top',
      theme: 'light-border',
      maxWidth: 500,
      appendTo: document.body,
    });
  }

  function init() {
    document.querySelectorAll('sup[data-note-id]').forEach(attachNoteTooltip);
    document.querySelectorAll('a.ref[href^="#"]').forEach(attachRefTooltip);
    document.querySelectorAll('cite.cite').forEach(attachCiteTooltip);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
