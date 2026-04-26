class NoteProcessor {

    
    registerOptions({}){}
    registerCollection({}){}

    processNoteTag(note_tag)
    {
        let note_text = note_tag.innerText;
        this.collection.addNote(note_text);
        let note_number = collection.getLength();
        let href = options.link_to_list ? options.notes_list_tag : "";

        let note_marker = `<sup>${note_number}</sup>`;
        let note_wraper = `<span>${note_marker}</span>`;
        if (options.link_to_list)
        {
            let note_html = `<a href="#note-number-${note_number}">${note_wraper}`;
        }

        let note_element = document.createElement(note_html);
        
        if (preview_on_hover)
        {
            addPreviewOnHover(note_element, note_text);
        }

        //swap out <ref> tag with x.
    }
}