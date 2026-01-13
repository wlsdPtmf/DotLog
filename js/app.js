document.addEventListener('DOMContentLoaded', () => {
    // Initialize DB (done in db.js, but ensures window.DB is ready)
    if (window.DB) {
        console.log('Database Initialized');
    }

    // Initialize UI
    if (window.UI) {
        window.UI.init();
        console.log('UI Initialized');
    }

    // Initialize OCR
    if (window.OCR) {
        window.OCR.init();
        console.log('OCR Initialized');
    }
});
