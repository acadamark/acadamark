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
