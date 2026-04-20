// === 6. Context Menu (context_menu.js) ===

window.initContextMenu = function () {
    const contextMenu = document.getElementById('custom-context-menu');
    const grid = document.getElementById('card-grid');

    if (!contextMenu || !grid) return;

    // Show Menu
    window.showCardContextMenu = function (e, card) {
        e.preventDefault();
        e.stopPropagation(); // Stop bubbling

        // Select the right-clicked card if not already selected
        const sig = getCardSig(card);
        /*
        if (!selectedCards.has(sig)) {
            // If right-clicking an unselected item, select ONLY that item (standard OS behavior)
            // Unless Ctrl is held (rare for context menu)
            selectedCards.clear();
            selectedCards.add(sig);
            renderGrid();
        }
        */
        // Actually, let's keep it simple: Select that card solely first
        selectedCards.clear();
        selectedCards.add(sig);
        renderGrid();


        // Position
        const x = e.pageX;
        const y = e.pageY;
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
        contextMenu.style.display = 'block';
    };

    // Hide Menu on Click Outside
    document.addEventListener('click', (e) => {
        if (contextMenu.style.display === 'block') {
            contextMenu.style.display = 'none';
        }
    });

    // Prevent default browser context menu on grid items?
    // Let's rely on showCardContextMenu being triggered by our Kebab button or Right Click
    // If we want Right Click support on the whole card:
    /*
    grid.oncontextmenu = (e) => {
        const cardEl = e.target.closest('.card');
        if (cardEl) {
            e.preventDefault();
            // Need to find the card object from index?
            // This is harder because 'card' object isn't attached to DOM directly unless stored
            // So we rely on Kebab button for now.
        }
    };
    */
}
