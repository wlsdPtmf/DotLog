const initApp = async () => {
    console.log('App initialization started');

    // 1. Auth & DB 초기화 (기초 데이터)
    if (window.Auth) {
        console.log('Initializing Auth...');
        await window.Auth.init();
    } else {
        console.error('Auth object not found!');
    }

    if (window.DB) {
        console.log('Initializing DB...');
        window.DB.init();
    }

    // 2. UI 초기화 (이후 데이터 기반 렌더링)
    if (window.UI) {
        console.log('Initializing UI...');
        window.UI.init();
    }

    // 3. OCR 초기화
    if (window.OCR) {
        console.log('Initializing OCR...');
        window.OCR.init();
    }

    console.log('App initialization completed');
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
