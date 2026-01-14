const SUPABASE_URL = 'https://nwpegctozibowenczkmk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53cGVnY3Rvemlib3dlbmN6a21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyOTU0NjcsImV4cCI6MjA4Mzg3MTQ2N30.j1q7cUeHaseuwBj7LJ-gYp_3xYrbZ7aIn0bAJOvLGvQ';
const { createClient } = window.supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabaseClient = supabaseClient;

const Auth = {
    isLoginMode: true,
    user: null,

    async init() {
        this.bindEvents();
        await this.checkSession();
    },

    bindEvents() {
        // Toggle Login/Signup Mode
        document.body.addEventListener('click', (e) => {
            if (e.target && (e.target.id === 'auth-switch' || e.target.closest('#auth-switch'))) {
                this.isLoginMode = !this.isLoginMode;
                this.updateUI();
            }
        });

        const formAuth = document.getElementById('form-auth');
        if (formAuth) {
            formAuth.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSubmit();
            });
        }
    },

    updateUI() {
        const title = document.getElementById('auth-title');
        const submitBtn = document.getElementById('btn-auth-submit');
        const switchText = document.getElementById('auth-switch-text');
        const authBox = document.getElementById('auth-box');
        const nicknameField = document.getElementById('nickname-field');

        if (!title || !submitBtn || !switchText || !authBox) return;

        if (this.isLoginMode) {
            title.innerText = '로그인';
            submitBtn.innerText = '로그인';
            submitBtn.style.background = 'var(--primary)';
            authBox.style.borderTop = 'none';
            switchText.innerHTML = `계정이 없으신가요? <span id="auth-switch" style="color: var(--primary); font-weight: 700; cursor: pointer; text-decoration: underline;">회원가입</span>`;
            if (nicknameField) nicknameField.classList.add('hidden');
        } else {
            title.innerText = '회원가입';
            submitBtn.innerText = '가입하기';
            submitBtn.style.background = 'var(--secondary)';
            authBox.style.borderTop = '5px solid var(--secondary)';
            switchText.innerHTML = `이미 계정이 있으신가요? <span id="auth-switch" style="color: var(--secondary); font-weight: 700; cursor: pointer; text-decoration: underline;">로그인</span>`;
            if (nicknameField) nicknameField.classList.remove('hidden');
        }
    },

    async checkSession() {
        const { data: { user } } = await supabaseClient.auth.getUser();
        this.user = user;
        this.renderAuthState();

        if (typeof UI !== 'undefined' && UI.renderHeader) UI.renderHeader();

        supabaseClient.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                this.user = session.user;
                this.renderAuthState();
                if (UI.currentPage === 'auth') UI.switchPage('dashboard');
                UI.showToast("🔓 환영합니다!");
            } else if (event === 'SIGNED_OUT') {
                this.user = null;
                this.renderAuthState();
            }
            if (typeof UI !== 'undefined' && UI.renderHeader) UI.renderHeader();
        });
    },

    renderAuthState() {
        const loggedInView = document.getElementById('user-logged-in');
        const loggedOutView = document.getElementById('user-logged-out');

        if (this.user) {
            if (loggedInView) loggedInView.classList.remove('hidden');
            if (loggedOutView) loggedOutView.classList.add('hidden');
        } else {
            if (loggedInView) loggedInView.classList.add('hidden');
            if (loggedOutView) loggedOutView.classList.remove('hidden');
        }
    },

    async handleSubmit() {
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const nicknameInput = document.getElementById('auth-nickname');
        const nickname = nicknameInput ? nicknameInput.value.trim() : '';

        if (this.isLoginMode) {
            const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) {
                UI.showToast(`❌ 로그인 실패: ${error.message}`);
            }
        } else {
            if (!nickname) {
                UI.showToast("⚠️ 닉네임을 입력해주세요.");
                return;
            }
            const { error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: { nickname: nickname }
                }
            });
            if (error) {
                UI.showToast(`❌ 가입 실패: ${error.message}`);
            } else {
                UI.showToast("✉️ 가입 환영합니다! 이메일을 확인해주세요.");
            }
        }
    },

    async handleLogout() {
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
            UI.showToast(`❌ 로그아웃 실패: ${error.message}`);
        } else {
            UI.showToast("👋 로그아웃 되었습니다.");
            location.reload();
        }
    }
};

window.Auth = Auth;
