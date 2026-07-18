// Test runner for the interpreter suites of the `enscribe` package. Each test
// module exports a `run()` function that throws on assertion failure. We call
// them in sequence and report a summary. (The core and parser suites are
// self-executing files invoked directly by the package `test` script.)

import { run as runConfigDiscovery } from './plugins/config-discovery.test.js';
import { run as runDocType } from './plugins/doc-type.test.js';
import { run as runArticleStructuring } from './plugins/article-structuring.test.js';
import { run as runWebsiteStructuring } from './plugins/website-structuring.test.js';
import { run as runSectionNesting } from './plugins/section-nesting.test.js';
import { run as runHeadingLevels } from './plugins/heading-levels.test.js';
import { run as runListStructuring } from './plugins/list-structuring.test.js';
import { run as runNumbering } from './plugins/numbering.test.js';
import { run as runRefResolution } from './plugins/ref-resolution.test.js';
import { run as runFigureHandler } from './handlers/figure.test.js';
import { run as runDiagramError } from './handlers/diagram-error.test.js';
import { run as runMathHandler } from './handlers/math.test.js';
import { run as runRefHandler } from './handlers/ref.test.js';
import { run as runCodeBlockHandler } from './handlers/code-block.test.js';
import { run as runInlineCodeHandler } from './handlers/inline-code.test.js';
import { run as runTableHandler } from './handlers/table.test.js';
import { run as runKatexCss } from './katex-css.test.js';
import { run as runInterpretPlugin } from './interpret-plugin.test.js';
import { run as runRegistry } from './lib/registry.test.js';
import { run as runWalkNormalize } from './lib/walk-normalize.test.js';
import { run as runAstHelpers } from './lib/ast-helpers.test.js';
import { run as runConfigSourceEdit } from './lib/config-source-edit.test.js';
import { run as runNotes } from './plugins/notes.test.js';
import { run as runNotePlacement } from './plugins/note-placement.test.js';
import { run as runNoteHomelessHome } from './note-homeless-home.test.js';
import { run as runLibraryLoad } from './plugins/library-load.test.js';
import { run as runAssetLoad } from './plugins/asset-load.test.js';
import { run as runCiteResolution } from './plugins/cite-resolution.test.js';
import { run as runMinipageCites } from './plugins/minipage-cites.test.js';
import { run as runBibliography } from './plugins/bibliography.test.js';
import { run as runCiteHandler } from './handlers/cite.test.js';
import { run as runNormalizeToCanonical } from './plugins/normalize-to-canonical.test.js';
import { run as runRegistryDsl } from './dsl/registry.test.js';
import { run as runCdnVersions } from './cdn-versions.test.js';
import { run as runBundleLoad } from './bundle-load.test.js';
import { run as runRawHtmlComments } from './raw-html-comments.test.js';
import { run as runSameLineLongForm } from './same-line-long-form.test.js';
import { run as runNestedNavGroup } from './nested-nav-group.test.js';
import { run as runSvgContent } from './svg-content.test.js';
import { run as runLinksImages } from './links-images.test.js';
import { run as runIntegration } from './integration.test.js';
import { run as runIdScoping } from './id-scoping.test.js';
import { run as runToc } from './lib/toc.test.js';
import { run as runTheme } from './lib/theme.test.js';
import { run as runSidenotes } from './lib/sidenotes.test.js';
import { run as runConfigOptionsDoc } from './lib/config-options-doc.test.js';
import { run as runFeaturedElements } from './lib/featured-elements.test.js';
import { run as runBookRegions } from './lib/book-regions.test.js';
import { run as runArticleAppendices } from './article-appendices.test.js';
import { run as runBookPartType } from './book-part-type.test.js';
import { run as runLongFormAtref } from './long-form-atref.test.js';
import { run as runIdentifierAt } from './identifier-at.test.js';
import { run as runNoteMargin } from './note-margin.test.js';
import { run as runSidenoteParserSafety } from './sidenote-parser-safety.test.js';
import { run as runLibrarySrc } from './library-src.test.js';
import { run as runChapterNav } from './lib/chapter-nav.test.js';
import { run as runConfigOptions } from './config-options.test.js';
import { run as runMapAttributes } from './map-attributes.test.js';
import { run as runDslRegistry } from './dsl-registry.test.js';
import { run as runHostAcceptSets } from './lib/host-accept-sets.test.js';
import { run as runShorthandExpansions } from './lib/shorthand-expansions.test.js';
import { run as runHtmlTableCells } from './plugins/html-table-cells.test.js';
import { run as runSmartTypography } from './smart-typography.test.js';
import { run as runBrowserMemo } from './browser-memo.test.js';
import { run as runMasterDocumentBrowser } from './master-document-browser.test.js';
import { run as runInclude } from './include.test.js';
import { run as runRenderParity } from './render-parity.test.js';
import { run as runCrossPageLinks } from './cross-page-links.test.js';
import { run as runRenderChapterParity } from './render-chapter-parity.test.js';
import { run_tests as runMarginBookParity } from './margin-book-parity.test.js';
import { run_tests as runMarginBookConsumption } from './margin-book-consumption.test.js';
import { run as runSeparatePagesParity } from './separate-pages-parity.test.js';
import { run as runCoverOffFront } from './cover-off-front.test.js';
import { run as runEditLayout } from './edit-layout.test.js';
import { run as runThemeVariantMultipage } from './theme-variant-multipage.test.js';
import { run as runThemeConsumption } from './theme-consumption.test.js';
import { run as runChildConfigStrip } from './child-config-strip.test.js';
import { run as runLiveBookParity } from './live-book-parity.test.js';
import { run as runBookNavConfig } from './book-nav-config.test.js';
import { run as runMasterBookLive } from './master-book-live.test.js';
import { run as runMasterWebsiteLive } from './master-website-live.test.js';
import { run as runSingleFileDoc } from './single-file-doc.test.js';
import { run as runAlwaysRenderRecovery } from './always-render-recovery.test.js';
import { run as runCodeBlockFenceParity } from './code-block-fence-parity.test.js';
import { run as runSaveSingleFile } from './save-single-file.test.js';
import { run as runLiveEditLoop } from './live-edit-loop.test.js';
import { run as runLiveEditSmoke } from './live-edit-smoke.test.js';
import { run as runLiveBookShell } from './live-book-shell.test.js';
import { run as runLiveArticleShell } from './live-article-shell.test.js';
import { run as runConfigToc } from './config-toc.test.js';
import { run as runConfigNumbering } from './config-numbering.test.js';
import { run as runBareBooleans } from './bare-booleans.test.js';
import { run as runVoidElements } from './void-elements.test.js';
import { run as runTableCellPipe } from './table-cell-pipe.test.js';
import { run as runFormatNeutrality } from './format-neutrality.test.js';
import { run as runShellAssets } from './shell-assets.test.js';
import { run as runEmitShell } from './emit-shell.test.js';
import { runForTest as runPredicateHarness } from './coverage/predicate-harness.mjs';
import { run as runSpecDataDrift } from './coverage/spec-data.test.js';
import { run as runCoverageFresh } from './coverage/coverage-fresh.test.js';
import { run as runRegistriesGuard } from './registries-guard.test.js';
import { run as runStrictMode } from './strict-mode.test.js';
import { run as runCaretFootnoteSigil } from './caret-footnote-sigil.test.js';
import { run as runRoutingInvariant } from './routing-invariant.test.js';
import { run as runBrowserLiveSwap } from './browser-live-swap.test.js';
import { run as runValidityHtml } from './validity-html.test.js';

const suites = [
  ['plugins/doc-type',             runDocType],
  ['plugins/config-discovery',     runConfigDiscovery],
  ['plugins/article-structuring',  runArticleStructuring],
  ['plugins/website-structuring',  runWebsiteStructuring],
  ['routing-invariant',            runRoutingInvariant],
  ['plugins/section-nesting',      runSectionNesting],
  ['plugins/heading-levels',       runHeadingLevels],
  ['plugins/list-structuring',     runListStructuring],
  ['plugins/numbering',            runNumbering],
  ['plugins/ref-resolution',       runRefResolution],
  ['handlers/figure',              runFigureHandler],
  ['handlers/math',                runMathHandler],
  ['handlers/ref',                 runRefHandler],
  ['handlers/code-block',          runCodeBlockHandler],
  ['always-render-recovery',       runAlwaysRenderRecovery],
  ['code-block-fence-parity',      runCodeBlockFenceParity],
  ['handlers/inline-code',         runInlineCodeHandler],
  ['handlers/table',               runTableHandler],
  ['katex-css',                    runKatexCss],
  ['interpret-plugin',             runInterpretPlugin],
  ['map-attributes',               runMapAttributes],
  ['dsl-registry',                 runDslRegistry],
  ['lib/host-accept-sets',         runHostAcceptSets],
  ['lib/shorthand-expansions',     runShorthandExpansions],
  ['lib/registry',                 runRegistry],
  ['lib/walk-normalize',           runWalkNormalize],
  ['lib/ast-helpers',              runAstHelpers],
  ['lib/config-source-edit',       runConfigSourceEdit],
  ['plugins/notes',                runNotes],
  ['plugins/note-placement',        runNotePlacement],
  ['note-homeless-home',           runNoteHomelessHome],
  ['plugins/library-load',         runLibraryLoad],
  ['plugins/asset-load',           runAssetLoad],
  ['plugins/cite-resolution',      runCiteResolution],
  ['plugins/minipage-cites',       runMinipageCites],
  ['plugins/bibliography',         runBibliography],
  ['handlers/cite',                runCiteHandler],
  ['handlers/diagram-error',       runDiagramError],
  ['plugins/normalize-to-canonical', runNormalizeToCanonical],
  ['dsl/registry',                 runRegistryDsl],
  ['cdn-versions',                 runCdnVersions],
  ['bundle-load',                  runBundleLoad],
  ['raw-html-comments',            runRawHtmlComments],
  ['same-line-long-form',          runSameLineLongForm],
  ['nested-nav-group',             runNestedNavGroup],
  ['svg-content',                  runSvgContent],
  ['links-images',                 runLinksImages],
  ['integration',                  runIntegration],
  ['id-scoping',                   runIdScoping],
  ['lib/toc',                      runToc],
  ['lib/theme',                    runTheme],
  ['lib/sidenotes',                runSidenotes],
  ['lib/config-options-doc',       runConfigOptionsDoc],
  ['lib/featured-elements',        runFeaturedElements],
  ['lib/book-regions',             runBookRegions],
  ['article-appendices',           runArticleAppendices],
  ['book-part-type',               runBookPartType],
  ['long-form-atref',              runLongFormAtref],
  ['identifier-at',                runIdentifierAt],
  ['note-margin',                  runNoteMargin],
  ['sidenote-parser-safety',       runSidenoteParserSafety],
  ['library-src',                  runLibrarySrc],
  ['strict-mode',                  runStrictMode],
  ['caret-footnote-sigil',         runCaretFootnoteSigil],
  ['lib/chapter-nav',              runChapterNav],
  ['config-options',               runConfigOptions],
  ['plugins/html-table-cells',     runHtmlTableCells],
  ['smart-typography',             runSmartTypography],
  ['browser-memo',                 runBrowserMemo],
  ['master-document-browser',      runMasterDocumentBrowser],
  ['include',                  runInclude],
  ['render-parity',                runRenderParity],
  ['cross-page-links',             runCrossPageLinks],
  ['render-chapter-parity',        runRenderChapterParity],
  ['margin-book-parity',           runMarginBookParity],
  ['margin-book-consumption',      runMarginBookConsumption],
  ['separate-pages-parity',        runSeparatePagesParity],
  ['cover-off-front',              runCoverOffFront],
  ['edit-layout',                  runEditLayout],
  ['theme-variant-multipage',      runThemeVariantMultipage],
  ['theme-consumption',            runThemeConsumption],
  ['child-config-strip',           runChildConfigStrip],
  ['live-book-parity',             runLiveBookParity],
  ['book-nav-config',              runBookNavConfig],
  ['master-book-live',             runMasterBookLive],
  ['master-website-live',          runMasterWebsiteLive],
  ['single-file-doc',              runSingleFileDoc],
  ['save-single-file',             runSaveSingleFile],
  ['live-edit-loop',               runLiveEditLoop],
  ['live-edit-smoke',              runLiveEditSmoke],
  ['live-book-shell',              runLiveBookShell],
  ['live-article-shell',           runLiveArticleShell],
  ['config-toc',                   runConfigToc],
  ['config-numbering',             runConfigNumbering],
  ['bare-booleans',                runBareBooleans],
  ['void-elements',                runVoidElements],
  ['table-cell-pipe',              runTableCellPipe],
  ['format-neutrality',            runFormatNeutrality],
  ['shell-assets',                 runShellAssets],
  ['emit-shell',                   runEmitShell],
  ['coverage/spec-data-drift',     runSpecDataDrift],
  ['coverage/predicate-harness',   runPredicateHarness],
  ['coverage/manifest-fresh',      runCoverageFresh],
  ['registries-guard',             runRegistriesGuard],
  ['browser-live-swap',            runBrowserLiveSwap],
  ['validity-html',                runValidityHtml],
];

let failed = 0;
for (const [name, fn] of suites) {
  console.log(`\n--- ${name} ---`);
  try {
    await fn();
  } catch (err) {
    failed++;
    console.error(`FAIL: ${name}`);
    console.error(err);
  }
}

console.log(`\n${failed === 0 ? 'OK' : 'FAILED'}: ${suites.length - failed}/${suites.length} suites passed`);
if (failed > 0) process.exit(1);

