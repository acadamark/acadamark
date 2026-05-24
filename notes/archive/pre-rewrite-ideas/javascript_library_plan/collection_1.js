class Collection {
    constructor(options = {}, processItem = null) {
        this.items = [];
        this.options = options;
        this.processItem = processItem; // Function to process individual items
    }

    /**
     * Add an item to the collection.
     * @param {HTMLElement} element - The element to add.
     */
    addItem(element) {
        if (this.processItem) {
            this.processItem(element, this.options);
        }
        this.items.push(element);
    }

    /**
     * Render the collection as a formatted list.
     * This method can be customized by providing a custom render function.
     * @param {Function} customRender - Custom render function for each item.
     * @returns {HTMLElement} - The rendered list element.
     */
    renderList(customRender = null) {
        const listElement = document.createElement('div');
        listElement.classList.add('collection-list');
        this.items.forEach(item => {
            const listItem = document.createElement('div');
            listItem.classList.add('collection-item');
            listItem.innerHTML = customRender ? customRender(item) : item.innerHTML;
            listElement.appendChild(listItem);
        });
        return listElement;
    }
}


class Collection {
    constructor(options = {}, processItem = null) {
        this.items = [];
        this.options = options;
        this.processItem = processItem; // Function to process individual items
    }

    /**
     * Add an item to the collection.
     * @param {HTMLElement} element - The element to add.
     */
    addItem(element) {
        if (this.processItem) {
            this.processItem(element, this.options);
        }
        this.items.push(element);
    }

    /**
     * Render the collection as a formatted list.
     * This method can be customized by providing a custom render function.
     * @param {Function} customRender - Custom render function for each item.
     * @returns {HTMLElement} - The rendered list element.
     */
    renderList(customRender = null) {
        const listElement = document.createElement('div');
        listElement.classList.add('collection-list');
        this.items.forEach(item => {
            const listItem = document.createElement('div');
            listItem.classList.add('collection-item');
            listItem.innerHTML = customRender ? customRender(item) : item.innerHTML;
            listElement.appendChild(listItem);
        });
        return listElement;
    }
}


class CitationCollection extends Collection {
    constructor(options = {}) {
        // Pass the specific processing function to the base class
        super(options, processCitation);
    }

    /**
     * Customize the rendering of the citation list.
     * @returns {HTMLElement} - The rendered citation list element.
     */
    renderList() {
        return super.renderList(item => {
            // Customize the rendering here if needed
            return `<cite>${item.innerHTML}</cite>`; // Example: Adjust formatting as needed
        });
    }
}

class NoteCollection extends Collection {
    constructor(options = {}) {
        super(options, (element, options) => {
            element.setAttribute('data-note-index', this.items.length + 1);
            processNote(element, options);
        });
    }

    /**
     * Customize the rendering of the note list.
     * @returns {HTMLElement} - The rendered note list element.
     */
    renderList() {
        return super.renderList(item => {
            // Customize the rendering here if needed
            return `<aside>${item.innerHTML}</aside>`; // Example: Adjust formatting as needed
        });
    }
}

class CrossReferenceCollection extends Collection {
    constructor(options = {}) {
        super(options, processCrossReference);
    }

    /**
     * Customize the rendering of the cross-reference list.
     * @returns {HTMLElement} - The rendered reference list element.
     */
    renderList() {
        return super.renderList(item => {
            // Customize the rendering here if needed
            return `<ref>${item.innerHTML}</ref>`; // Example: Adjust formatting as needed
        });
    }
}


