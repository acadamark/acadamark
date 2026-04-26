// Base Options Class
class Options {
    constructor(options = {}) {
        this.options = options;
    }

    // Method to get an option with a default fallback
    getOption(key, defaultValue = null) {
        return this.options[key] !== undefined ? this.options[key] : defaultValue;
    }

    // Method to set an option
    setOption(key, value) {
        this.options[key] = value;
    }

    // Debugging utility
    logOptions() {
        console.log("Options:", this.options);
    }
}

// NotesOptions Class
class NotesOptions extends Options {
    constructor(options = {}) {
        super(options);
    }
}

// CrossReferenceOptions Class
class CrossReferenceOptions extends Options {
    constructor(options = {}) {
        super(options);
    }
}

// CitationOptions Class
class CitationOptions extends Options {
    constructor(options = {}) {
        super(options);
    }
}

// Base Collection Class
class Collection {
    constructor(options = {}) {
        this.items = [];
        this.options = options;
    }

    // Add an item to the collection
    addItem(item) {
        if (!item) {
            console.error("Cannot add a null or undefined item to the collection.");
            return;
        }
        this.items.push(item);
    }

    // Render the collection (can be overridden by subclasses)
    renderList() {
        console.log("Rendering list with the following items:", this.items);
        const listElement = document.createElement('div');
        this.items.forEach(item => {
            const listItem = document.createElement('div');
            listItem.classList.add('collection-item');
            listItem.innerHTML = item;
            listElement.appendChild(listItem);
        });
        return listElement;
    }

    // Debugging utility
    logItems() {
        console.log("Collection Items:", this.items);
    }
}

// NotesCollection Class
class NotesCollection extends Collection {
    constructor(options = {}) {
        super(options);
    }

    renderList() {
        console.log("Rendering NotesCollection...");
        return super.renderList();
    }
}

// CrossReferenceCollection Class
class CrossReferenceCollection extends Collection {
    constructor(options = {}) {
        super(options);
    }

    renderList() {
        console.log("Rendering CrossReferenceCollection...");
        return super.renderList();
    }
}

// CitationCollection Class
class CitationCollection extends Collection {
    constructor(options = {}) {
        super(options);
    }

    renderList() {
        console.log("Rendering CitationCollection...");
        return super.renderList();
    }
}

// Main Academark Class
class Academark {
    constructor() {
        this.sources = [];
        this.collections = {};
        this.options = {
            notes: new NotesOptions(),
            crossReferences: new CrossReferenceOptions(),
            citations: new CitationOptions(),
        };
    }

    // Add sources to the academark object
    addSources(library_name, file, type) {
        // Basic validation
        if (!library_name || !file || !type) {
            console.error("Invalid arguments provided to addSources.");
            return;
        }
        this.sources.push({ library_name, file, type });
        console.log(`Added sources: ${library_name} of type ${type}`);
    }

    // Add a collection to the academark object
    addCollection(type, name) {
        if (!type || !name) {
            console.error("Invalid arguments provided to addCollection.");
            return;
        }

        switch (type) {
            case 'notes':
                this.collections[name] = new NotesCollection(this.options.notes);
                break;
            case 'crossReferences':
                this.collections[name] = new CrossReferenceCollection(this.options.crossReferences);
                break;
            case 'citations':
                this.collections[name] = new CitationCollection(this.options.citations);
                break;
            default:
                console.error(`Unknown collection type: ${type}`);
                return;
        }

        console.log(`Added collection: ${name} of type ${type}`);
    }

    // Process a note tag
    processNoteTag(noteTag) {
        if (!noteTag) {
            console.error("Invalid noteTag provided.");
            return;
        }
        // Basic processing logic
        console.log("Processing note tag:", noteTag);
    }

    // Process a cross-reference tag
    processCrossReferenceTag(refTag) {
        if (!refTag) {
            console.error("Invalid cross-reference tag provided.");
            return;
        }
        // Basic processing logic
        console.log("Processing cross-reference tag:", refTag);
    }

    // Process a citation tag
    processCitationTag(citeTag) {
        if (!citeTag) {
            console.error("Invalid citation tag provided.");
            return;
        }
        // Basic processing logic
        console.log("Processing citation tag:", citeTag);
    }

    // Debugging utility to log the current state
    logState() {
        console.log("Academark State:", {
            sources: this.sources,
            collections: Object.keys(this.collections),
            options: this.options,
        });
    }
}

// Standalone Formatting Functions

function formatCitation(citation) {
    if (!citation) {
        console.error("Invalid citation provided.");
        return '';
    }
    // Basic formatting logic
    console.log("Formatting citation:", citation);
    return `<cite>${citation}</cite>`;
}

function formatCrossReference(ref) {
    if (!ref) {
        console.error("Invalid cross-reference provided.");
        return '';
    }
    // Basic formatting logic
    console.log("Formatting cross-reference:", ref);
    return `<a href="${ref.href}">${ref.text}</a>`;
}

function formatNote(note) {
    if (!note) {
        console.error("Invalid note provided.");
        return '';
    }
    // Basic formatting logic
    console.log("Formatting note:", note);
    return `<aside>${note}</aside>`;
}

function formatReferenceListItem(reference) {
    if (!reference) {
        console.error("Invalid reference provided.");
        return '';
    }
    // Basic formatting logic
    console.log("Formatting reference list item:", reference);
    return `<li>${reference}</li>`;
}

function formatNoteListItem(note) {
    if (!note) {
        console.error("Invalid note provided.");
        return '';
    }
    // Basic formatting logic
    console.log("Formatting note list item:", note);
    return `<li>${note}</li>`;
}
