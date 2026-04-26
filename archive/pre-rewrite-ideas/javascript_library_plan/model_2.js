// Main class
class Academark {
    constructor(globalOptions = {}) {
        this.globalOptions = {
            cslStyle: 'apa',
            language: 'en-US',
            previewOnHover: false,
            // ... other global options
        };
        Object.assign(this.globalOptions, globalOptions);
        
        this.citations = new Citations(this.globalOptions);
        this.notes = new Notes(this.globalOptions);
        this.crossReferences = new CrossReferences(this.globalOptions);
        this.tagProcessor = new TagProcessor(this);
    }

    // High-level methods
    processCiteTag(element, options = {}) {
        return this.tagProcessor.processCiteTag(element, options);
    }

    processNoteTag(element, options = {}) {
        return this.tagProcessor.processNoteTag(element, options);
    }

    processCrossRefTag(element, options = {}) {
        return this.tagProcessor.processCrossRefTag(element, options);
    }

    createReferencesList(collection, options = {}) {
        // Implementation
    }

    createNotesList(collection, options = {}) {
        // Implementation
    }

    createGenericList(collection, options = {}) {
        // Implementation
    }
}

class Citations {
    constructor(globalOptions) {
        this.globalOptions = globalOptions;
    }

    formatCitation(rawCitation, options = {}) {
        // Implementation
    }

    // Other citation-related methods
}

class Notes {
    constructor(globalOptions) {
        this.globalOptions = globalOptions;
    }

    formatNote(rawNoteText, options = {}) {
        // Implementation
    }

    // Other note-related methods
}

class CrossReferences {
    constructor(globalOptions) {
        this.globalOptions = globalOptions;
    }

    formatCrossRef(crossRefId, options = {}) {
        // Implementation
    }

    // Other cross-reference-related methods
}

class Collection {
    constructor(name, type) {
        this.name = name;
        this.type = type; // 'citation' or 'note'
        this.items = [];
    }

    addItem(item) {
        this.items.push(item);
    }

    // Other collection management methods
}

class TagProcessor {
    constructor(academark) {
        this.academark = academark;
    }

    processCiteTag(element, options = {}) {
        // Implementation
    }

    processNoteTag(element, options = {}) {
        // Implementation
    }

    processCrossRefTag(element, options = {}) {
        // Implementation
    }
}

// Standalone formatting functions
function formatCitation(rawCitation, options = {}) {
    // Implementation
}

function formatNote(rawNoteText, options = {}) {
    // Implementation
}

function formatCrossRef(crossRefId, options = {}) {
    // Implementation
}


// In the Citations class
formatCitation(rawCitation, options = {}) {
    const defaultOptions = {
        pandocStyle: false,
        renderAs: 'html',
        cslStyle: this.globalOptions.cslStyle,
        language: this.globalOptions.language,
        addToCollection: [],
        previewOnHover: this.globalOptions.previewOnHover,
        linkToList: false,
        urlsAsLinks: true,
        doiAsLink: true,
        sortBy: []
    };
    const mergedOptions = { ...defaultOptions, ...options };

    // Implementation
}

// In the Notes class
formatNote(rawNoteText, options = {}) {
    const defaultOptions = {
        processAs: 'markdown',
        renderAs: 'html',
        language: this.globalOptions.language,
        addToCollection: [],
        previewOnHover: this.globalOptions.previewOnHover,
        linkToList: false,
        marker: 'numbered'
    };
    const mergedOptions = { ...defaultOptions, ...options };

    // Implementation
}

// In the CrossReferences class
formatCrossRef(crossRefId, options = {}) {
    const defaultOptions = {
        previewOnHover: this.globalOptions.previewOnHover,
        includeLink: true,
        referenceNumbering: true,
        includeLabel: true
    };
    const mergedOptions = { ...defaultOptions, ...options };

    // Implementation
}

// In the TagProcessor class
processCiteTag(element, options = {}) {
    const rawCitation = element.innerText;
    const formattedCitation = this.academark.citations.formatCitation(rawCitation, options);
    element.innerHTML = formattedCitation;
    // Additional processing (e.g., adding to collections, setting attributes)
}

processNoteTag(element, options = {}) {
    const rawNoteText = element.innerText;
    const formattedNote = this.academark.notes.formatNote(rawNoteText, options);
    element.innerHTML = formattedNote;
    // Additional processing (e.g., adding to collections, setting attributes)
}

processCrossRefTag(element, options = {}) {
    const crossRefId = element.getAttribute('target');
    const formattedCrossRef = this.academark.crossReferences.formatCrossRef(crossRefId, options);
    element.innerHTML = formattedCrossRef;
    // Additional processing (e.g., setting attributes)
}

// In the Academark class
createReferencesList(collection, options = {}) {
    const defaultOptions = {
        asList: true,
        includeBackLink: false,
        cslStyle: this.globalOptions.cslStyle,
        addToTarget: null,
        createTargetIfNotExist: false,
        id: '',
        classes: [],
        styles: {},
        title: 'References'
    };
    const mergedOptions = { ...defaultOptions, ...options };

    // Implementation
}

createNotesList(collection, options = {}) {
    const defaultOptions = {
        asList: true,
        includeBackLink: false,
        formatAs: 'footnotes',
        addToTarget: null,
        createTargetIfNotExist: false,
        id: '',
        classes: [],
        styles: {},
        title: 'Notes'
    };
    const mergedOptions = { ...defaultOptions, ...options };

    // Implementation
}

