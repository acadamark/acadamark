class Collection {
    constructor(name, type) {
        this.name = name;
        this.type = type; // 'citation' or 'note'
        this.items = [];
    }

    addItem(item) {
        this.items.push(item);
    }

    removeItem(item) {
        const index = this.items.indexOf(item);
        if (index > -1) {
            this.items.splice(index, 1);
        }
    }

    renderList(options = {}) {
        const defaultOptions = {
            style: 'apa',
            numbered: false,
            format: 'footnotes'
        };
        const mergedOptions = { ...defaultOptions, ...options };

        if (this.type === 'citation') {
            return this.renderCitations(mergedOptions);
        } else if (this.type === 'note') {
            return this.renderNotes(mergedOptions);
        }
    }

    renderCitations(options) {
        return this.items.map((citation, index) => {
            return options.numbered 
                ? `${index + 1}. ${citation.render(options.style)}`
                : citation.render(options.style);
        }).join('\n');
    }

    renderNotes(options) {
        return this.items.map((note, index) => {
            return `${index + 1}. ${note.render(options.format)}`;
        }).join('\n');
    }
}

// In the Academark class
class Academark {
    constructor(globalOptions = {}) {
        // ... other initialization ...
        this.collections = {};
    }

    createCollection(name, type) {
        if (this.collections[name]) {
            throw new Error(`Collection '${name}' already exists`);
        }
        this.collections[name] = new Collection(name, type);
        return this.collections[name];
    }

    getCollection(name) {
        return this.collections[name];
    }

    renderCollection(name, options = {}) {
        const collection = this.getCollection(name);
        if (!collection) {
            throw new Error(`Collection '${name}' not found`);
        }
        return collection.renderList(options);
    }

    // ... other methods ...
}

/*
// Usage
const academark = new Academark();
const citationCollection = academark.createCollection('mainCitations', 'citation');
citationCollection.addItem(new Citation(/* ... */));
citationCollection.addItem(new Citation(/* ... */));

const noteCollection = academark.createCollection('footnotes', 'note');
noteCollection.addItem(new Note(/* ... */));

console.log(academark.renderCollection('mainCitations', { style: 'chicago', numbered: true }));
console.log(academark.renderCollection('footnotes', { format: 'endnotes' }));
*/
