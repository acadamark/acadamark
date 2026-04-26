let prefixes = {
    'fig': 'Figure',
    'eq': 'Equation',
    'tbl': 'Table',
    'sec': 'Section'
};

// Need collection for all of those for numbering.

class CrossReferenceProcessor {

    registerOptions({}){} // register options
    registerPrefixes({}){} // Maps reference prefix to prefix text

    parseTag(ref_tag){ // ref_tag is html element

        let target_id = ref_tag.innerText;
        let hashtag_prefix = target_id.string_match(/^#(\w+):/)[1];

        return {
            target_id: target_id,  // <ref>#eqn:maxwells-law</ref>
            target_prefix: this.prefixes[hashtag_prefix], // eqn => Equation
            target_element: document.querySelector(target_id),
            target_preview: document.querySelector(target_id).innerHtml,
            href: include_link ? target_id : "",
            name: options.include_name ? document.querySelector(target_id).getAttribute('name') : "",
            item_number: somehow get number
        }
    }

    processCrossReferenceTag(ref_tag)
    {
        let tag_info = parseTag(ref_tag);

        let x = `<a href="${tag_info.href}">${tag_info.target_prefix} ${tag_info.item_number} ${tag_info.name}</a>`;
        
        if (options.preview_on_hover)
        {
            addPreviewOnHover(x, tag_info.target_preview);
        }

        //swap out <ref> tag with x.
    }
}