const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const Auth = {
    isLoginMode: true,
    user: null,

    init() {
        this.bindEvents();
        this.checkSession();
    },

    bindEvents() {
        // Toggle Login/Signup Mode
        document.body.addEventListener('click', (e) => {
            if (e.target.id === 'auth-switch') {
                this.isLoginMode = !this.isLoginMode;
                this.updateUI();
            }
        });

        const formAuth = document.getElementById('form-auth');
        if (formAuth) {
            formAuth.onsubmit = (e) => {
                e.preventDefault();
                this.handleSubmit();
            };
        }
    },

    updateUI() {
        const title = document.getElementById('auth-title');
        const submitBtn = document.getElementById('btn-auth-submit');
        const switchText = document.getElementById('auth-switch-text');

        if (this.isLoginMode) {
            title.innerText = '로그인';
            submitBtn.innerText = '로그인';
            switchText.innerHTML = `계정이 없으신가요? <span id="auth-switch" style="color: var(--primary); font-weight: 700; cursor: pointer;">회원가입</span>`;
        } else {
            title.innerText = '회원가입';
            submitBtn.innerText = '가입하기';
            switchText.innerHTML = `이미 계정이 있으신가요? <span id="auth-switch" style="color: var(--primary); font-weight: 700; cursor: pointer;">로그인</span>`;
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
    }
};

Auth.init();
window.Auth = Auth;
