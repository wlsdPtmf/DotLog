const SUPABASE_URL = 'https://nwpegctozibowenczkmk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53cGVnY3Rvemlib3dlbmN6a21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyOTU0NjcsImV4cCI6MjA4Mzg3MTQ2N30.j1q7cUeHaseuwBj7LJ-gYp_3xYrbZ7aIn0bAJOvLGvQ';
const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const Auth = {
    isLoginMode: true,
    user: null,

    async init() {
        console.log('Auth Init started');
        this.bindEvents();
        await this.checkSession();
        console.log('Auth Init finished');
    },

    bindEvents() {
        console.log('Binding Auth events');
        // Toggle Login/Signup Mode - Using delegation on the switchText container
        document.body.addEventListener('click', (e) => {
            if (e.target && (e.target.id === 'auth-switch' || e.target.closest('#auth-switch'))) {
                console.log('Auth switch clicked, current mode:', this.isLoginMode);
                this.isLoginMode = !this.isLoginMode;
                this.updateUI();
            }
        });

        const formAuth = document.getElementById('form-auth');
        if (formAuth) {
            formAuth.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('Auth form submitted, mode:', this.isLoginMode ? 'login' : 'signup');
                this.handleSubmit();
            });
        } else {
            console.error('form-auth not found during bindEvents');
        }
    },

    updateUI() {
        const title = document.getElementById('auth-title');
        const submitBtn = document.getElementById('btn-auth-submit');
        const switchText = document.getElementById('auth-switch-text');
        const authBox = document.getElementById('auth-box');

        if (!title || !submitBtn || !switchText || !authBox) {
            console.error('Auth UI elements missing:', { title, submitBtn, switchText, authBox });
            return;
        }

        if (this.isLoginMode) {
            title.innerText = '로그인';
            submitBtn.innerText = '로그인';
            submitBtn.style.background = 'var(--primary)';
            authBox.style.borderTop = 'none';
            switchText.innerHTML = `계정이 없으신가요? <span id="auth-switch" style="color: var(--primary); font-weight: 700; cursor: pointer; text-decoration: underline;">회원가입</span>`;
        } else {
            title.innerText = '회원가입';
            submitBtn.innerText = '가입하기';
            submitBtn.style.background = 'var(--secondary)';
            authBox.style.borderTop = '5px solid var(--secondary)';
            switchText.innerHTML = `이미 계정이 있으신가요? <span id="auth-switch" style="color: var(--secondary); font-weight: 700; cursor: pointer; text-decoration: underline;">로그인</span>`;
        }
    },

    async checkSession() {
        // 현재 세션 확인
        const { data: { user } } = await supabase.auth.getUser();
        this.user = user;
        this.renderAuthState();

        // 인증 상태 변화 감지
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                this.user = session.user;
                this.renderAuthState();
                if (UI.currentPage === 'auth') UI.switchPage('dashboard');
                UI.showToast("🔓 로그인이 완료되었습니다.");
            } else if (event === 'SIGNED_OUT') {
                this.user = null;
                this.renderAuthState();
            }
        });
    },

    renderAuthState() {
        const loggedInView = document.getElementById('user-logged-in');
        const loggedOutView = document.getElementById('user-logged-out');
        const emailDisplay = document.getElementById('user-email-display');

        if (this.user) {
            if (loggedInView) loggedInView.classList.remove('hidden');
            if (loggedOutView) loggedOutView.classList.add('hidden');
            if (emailDisplay) emailDisplay.innerText = this.user.email;
        } else {
            if (loggedInView) loggedInView.classList.add('hidden');
            if (loggedOutView) loggedOutView.classList.remove('hidden');
        }
    },

    async handleSubmit() {
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;

        if (this.isLoginMode) {
            // 로그인
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                UI.showToast(`❌ 로그인 실패: ${error.message}`);
            }
        } else {
            // 회원가입
            const { error } = await supabase.auth.signUp({ email, password });
            if (error) {
                UI.showToast(`❌ 가입 실패: ${error.message}`);
            } else {
                UI.showToast("✉️ 가입 환영합니다! 이메일 인증을 확인해주세요.");
            }
        }
    },

    async handleLogout() {
        const { error } = await supabase.auth.signOut();
        if (error) {
            UI.showToast(`❌ 로그아웃 실패: ${error.message}`);
        } else {
            UI.showToast("👋 로그아웃 되었습니다.");
            location.reload(); // 세션 완전 초기화
        }
    },

    async handleGithubLogin() {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: window.location.href // Returns to current page
            }
        });
        if (error) {
            UI.showToast(`❌ GitHub 로그인 실패: ${error.message}`);
        }
    }
};

// Auth.init(); // Removed auto-init
window.Auth = Auth;
