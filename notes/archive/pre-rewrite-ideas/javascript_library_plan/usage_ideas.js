let citation_options = {
    library: "sources.bib",
    language: "US-En",
    csl_style: "ama",
    csl_stylesheet: "url/to/stylesheet",
    format: "html",
    preview_on_hover: true,
    link_to_list: true,
    backlink_to_citation: true,
    include_source_urls: ['source', 'doi', 'pmid']
};

let note_options = {
    preview_on_hover: true,
    link_to_list: true,
    backlink_to_note: true
};

let xref_options = {
    preview_on_hover: true,
    link_to_item: true
};

let citer = new Academark();
citer.addCollection(name="sources", type="citations", options=citation_options);

// Format the in-text citations and add them to the references list (collection called "sources")
[...document.querySelectorAll('cite')].map(x => citer.processCiteTag(x));

// Include cites sources in the reference list
document.querySelectorAll('#ref-list').innerHtml = citer.createCitationList(collection="sources");

// Include all sources in the library for the bibliogrphy
document.querySelectorAll('#bibliography').innerHtml = citer.createCitationList(collection="*");

