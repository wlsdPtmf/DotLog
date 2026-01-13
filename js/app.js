document.addEventListener('DOMContentLoaded', async () => {
    // 1. Auth & DB 초기화 (기초 데이터)
    if (window.Auth) {
        await window.Auth.init();
    }

    if (window.DB) {
        window.DB.init();
    }

    // 2. UI 초기화 (이후 데이터 기반 렌더링)
    if (window.UI) {
        window.UI.init();
    }

    // 3. OCR 초기화
    if (window.OCR) {
        window.OCR.init();
    }
});
