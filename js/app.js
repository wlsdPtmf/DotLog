document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize DB (Local Storage setup)
    DB.init();

    // 2. Initialize Auth (Check session, update header)
    await Auth.init();

    // 3. Initialize UI (Render Dashboard by default, Bind Events)
    UI.init();

    console.log("DotLog App Initialized 💎");
});
