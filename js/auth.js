const SUPABASE_URL = 'https://nwpegctozibowenczkmk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53cGVnY3Rvemlib3dlbmN6a21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyOTU0NjcsImV4cCI6MjA4Mzg3MTQ2N30.j1q7cUeHaseuwBj7LJ-gYp_3xYrbZ7aIn0bAJOvLGvQ';
const { createClient } = window.supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabaseClient = supabaseClient;

const Auth = {
    user: null,

    async init() {
        this.bindEvents();
        await this.checkSession();
    },

    bindEvents() {
        // Simple Auth Form Handler (Login Only for MVP, but Toggle supported generally)
        const authForm = document.getElementById('auth-form');
        if (authForm) {
            authForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin(); // Using same handler for now, extend if signup needed separately
            });
        }

        const btnToggle = document.getElementById('btn-toggle-signup');
        if (btnToggle) {
            btnToggle.addEventListener('click', (e) => {
                e.preventDefault();
                alert('현재는 초대 기반 혹은 이메일 로그인만 지원됩니다 (데모). 바로 로그인을 시도하세요.');
            });
        }

        const btnLogout = document.getElementById('btn-logout');
        if (btnLogout) {
            btnLogout.addEventListener('click', () => this.handleLogout());
        }
    },

    async checkSession() {
        const { data: { user } } = await supabaseClient.auth.getUser();
        this.user = user;
        this.updateHeaderUI();

        supabaseClient.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                this.user = session.user;
                this.updateHeaderUI();
                if (typeof UI !== 'undefined') UI.switchPage('dashboard');
            } else if (event === 'SIGNED_OUT') {
                this.user = null;
                this.updateHeaderUI();
                if (typeof UI !== 'undefined') UI.switchPage('auth');
            }
        });
    },

    updateHeaderUI() {
        const guestView = document.querySelector('.status-guest');
        const userView = document.querySelector('.status-user');
        const userNickname = document.querySelector('.user-nickname');

        if (this.user) {
            if (guestView) guestView.classList.add('hidden');
            if (userView) userView.classList.remove('hidden');
            if (userNickname) userNickname.innerText = (this.user.user_metadata?.nickname || this.user.email.split('@')[0]) + '님';
        } else {
            if (guestView) guestView.classList.remove('hidden');
            if (userView) userView.classList.add('hidden');
        }

        // Also refresh profile modal data if UI is present
        if (typeof UI !== 'undefined' && UI.updateProfileModal) UI.updateProfileModal();
    },

    async handleLogin() {
        const email = document.getElementById('input-email').value;
        const password = document.getElementById('input-password').value;

        // Try Login
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

        if (error) {
            // If login fails, try signup (Auto-signup for demo convenience if user wants, or just error)
            // For now, strict error
            if (error.message.includes("Invalid login credentials")) {
                alert("로그인 정보가 올바르지 않습니다.");
            } else {
                alert("로그인 오류: " + error.message);
            }
        }
    },

    async handleLogout() {
        await supabaseClient.auth.signOut();
        window.location.reload();
    }
};

window.Auth = Auth;
