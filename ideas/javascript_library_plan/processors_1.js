class TagProcessor {
    constructor(options = {}) {
        this.options = options;
    }

    /**
     * Process an individual tag element.
     * This method should be overridden by subclasses.
     * @param {HTMLElement} element - The tag element to process.
     */
    process(element) {
        throw new Error('Method "process" must be implemented by subclass');
    }
}


class CitationTagProcessor extends TagProcessor {
    constructor(options = {}) {
        super(options);
    }

    /**
     * Process a <cite> tag element.
     * @param {HTMLElement} element - The <cite> tag element to process.
     */
    process(element) {
        // Example: Implement citation-specific processing logic
        processCitation(element, this.options);
    }
}


class NoteTagProcessor extends TagProcessor {
    constructor(options = {}) {
        super(options);
        this.noteIndex = 1; // Track the order of notes
    }

    /**
     * Process a <note> or <aside> tag element.
     * @param {HTMLElement} element - The <note> or <aside> tag element to process.
     */
    process(element) {
        // Set the note index and process the note
        element.setAttribute('data-note-index', this.noteIndex++);
        processNote(element, this.options);
    }
}


class CrossReferenceTagProcessor extends TagProcessor {
    constructor(options = {}) {
        super(options);
    }

    /**
     * Process a <ref> tag element.
     * @param {HTMLElement} element - The <ref> tag element to process.
     */
    process(element) {
        // Example: Implement cross-reference-specific processing logic
        processCrossReference(element, this.options);
    }
}

/*
// Initialize processors
const citationProcessor = new CitationTagProcessor({ style: 'APA' });
const noteProcessor = new NoteTagProcessor();
const crossReferenceProcessor = new CrossReferenceTagProcessor();

// Process all <cite> tags on the page
document.querySelectorAll('cite').forEach(cite => citationProcessor.process(cite));

// Process all <note> or <aside> tags on the page
document.querySelectorAll('note, aside').forEach(note => noteProcessor.process(note));

// Process all <ref> tags on the page
document.querySelectorAll('ref').forEach(ref => crossReferenceProcessor.process(ref));
*/
