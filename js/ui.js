const UI = {
    currentPage: 'dashboard',

    init() {
        this.bindEvents();
        this.renderDashboard();
    },

    bindEvents() {
        // Bottom Navigation
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.target;
                if (target === 'auth' && Auth.user) {
                    // If logged in, clicking 'Profile' opens modal instead of going to auth page
                    this.showProfileModal();
                } else {
                    this.switchPage(target);
                }
            });
        });

        // Dashboard Actions
        const btnRecord = document.getElementById('btn-record-start');
        if (btnRecord) btnRecord.addEventListener('click', () => this.showAddProjectModal());

        // Modal Closers
        document.querySelectorAll('.btn-close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal-overlay').classList.add('hidden');
            });
        });

        // Header Profile Click
        const btnOpenProfile = document.getElementById('btn-open-profile');
        if (btnOpenProfile) btnOpenProfile.addEventListener('click', () => this.showProfileModal());

        // Add Project Form
        const formAdd = document.getElementById('form-add-project');
        if (formAdd) {
            formAdd.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleAddProject();
            });
        }
    },

    switchPage(pageId) {
        // Hide all pages
        document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
        // Show target
        const target = document.getElementById(`section-${pageId}`);
        if (target) target.classList.add('active');

        // Update Nav
        document.querySelectorAll('.nav-item').forEach(el => {
            el.classList.toggle('active', el.dataset.target === pageId);
        });

        this.currentPage = pageId;

        // Reload data if needed
        if (pageId === 'dashboard') this.renderDashboard();
        if (pageId === 'collection') this.renderCollection();
    },

    // --- Data Rendering ---

    async renderDashboard() {
        const list = document.getElementById('dashboard-project-list');
        const emptyState = document.getElementById('dashboard-empty-state');
        if (!list) return;

        const projects = await DB.getProjects();
        const ongoing = projects.filter(p => p.status !== 'completed'); // 'ongoing' or '진행'

        if (ongoing.length === 0) {
            list.innerHTML = '';
            if (emptyState) emptyState.classList.remove('hidden');
        } else {
            if (emptyState) emptyState.classList.add('hidden');
            list.innerHTML = ongoing.map(p => this.createProjectCard(p)).join('');
        }
    },

    async renderCollection() {
        const grid = document.getElementById('collection-grid');
        const countEl = document.getElementById('total-completed-count');
        const levelText = document.querySelector('.collection-stats .level-text');

        const projects = await DB.getProjects();
        const completed = projects.filter(p => p.status === 'completed');

        // Update Stats
        if (countEl) countEl.innerText = completed.length;

        // Calculate Level
        const levelData = this.calculateLevel(completed.length);
        if (levelText) {
            levelText.innerText = levelData.name;
            levelText.style.color = levelData.color;
        }

        // Render Grid
        if (grid) {
            grid.innerHTML = completed.map(p => this.createCollectionCard(p)).join('');
        }
    },

    // --- Components ---

    createProjectCard(p) {
        // Simplify image logic
        const img = p.image || 'assets/placeholder_card.png';
        const isPlaceholder = !p.image;

        return `
            <div class="card" style="display: flex; gap: 15px; align-items: center; margin-bottom: 15px; background: var(--bg-card); padding: 15px; border-radius: var(--radius-md); border: 1px solid var(--border-light);">
                <div style="width: 60px; height: 60px; border-radius: 12px; background: #2a2a35; overflow: hidden; flex-shrink: 0;">
                    ${isPlaceholder ? '<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:1.5rem;">🎨</div>' : `<img src="${img}" style="width:100%; height:100%; object-fit: cover;">`}
                </div>
                <div style="flex: 1;">
                    <h4 style="font-size: 1rem; margin-bottom: 4px;">${p.name}</h4>
                    <p style="font-size: 0.8rem; color: var(--text-muted);">${p.createdAt.split('T')[0]} 시작</p>
                </div>
                <button class="btn-secondary" style="padding: 8px 12px; font-size: 0.8rem;" onclick="UI.finishProject('${p.id}')">완성</button>
            </div>
        `;
    },

    createCollectionCard(p) {
        const img = p.image || '';
        const isPlaceholder = !p.image;

        return `
            <div class="collection-card">
                <div class="card-image-wrap">
                     ${isPlaceholder ? '<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:2rem; color: #fff;">💎</div>' : `<img src="${img}">`}
                     <div class="sparkle-icon"><i class="fas fa-certificate" style="color: gold; filter: drop-shadow(0 0 5px orange);"></i></div>
                </div>
                <div class="card-info">
                    <div class="card-title">${p.name}</div>
                    <div class="card-date">${p.completedAt ? p.completedAt.split('T')[0] : '날짜 없음'}</div>
                </div>
            </div>
        `;
    },

    // --- Actions ---

    async handleAddProject() {
        const titleInput = document.querySelector('#form-add-project input[type="text"]');
        const fileInput = document.querySelector('#form-add-project input[type="file"]');
        const statusSelect = document.querySelector('#form-add-project select');

        const title = titleInput.value;
        const file = fileInput.files[0];
        const status = statusSelect.value; // 'ongoing' or 'completed'

        if (!title) return alert('도안 이름을 입력해주세요');

        // Convert file to Base64 for Preview if Guest, or Upload if User (Handled by DB)
        // For UI preview immediately, we read it.
        let imageBase64 = null;
        if (file) {
            imageBase64 = await this.readFileAsDataURL(file);
        }

        const newProject = {
            name: title,
            status: status,
            file: file, // Passed to DB for upload
            image: imageBase64 // Fallback/Preview
        };

        await DB.addProject(newProject);

        // Reset & Close
        titleInput.value = '';
        fileInput.value = '';
        document.getElementById('modal-add-project').classList.add('hidden');

        this.renderDashboard();
        this.renderCollection(); // In case we added a completed one directly
        this.updateProfileModal(); // Level might change
    },

    async finishProject(id) {
        if (confirm('이 도안을 완성 처리하시겠습니까? 멋져요! 🎉')) {
            await DB.updateProjectStatus(id, 'completed');
            this.renderDashboard();
            this.renderCollection();
            this.updateProfileModal();
        }
    },

    // --- Profile & Leveling ---

    calculateLevel(completedCount) {
        if (completedCount >= 10) return { lv: 4, name: '💎 마스터 도안러', color: '#a78bfa' }; // Purple
        if (completedCount >= 5) return { lv: 3, name: '🥇 숙련 도안러', color: '#fbbf24' }; // Amber
        if (completedCount >= 2) return { lv: 2, name: '🥈 중급 도안러', color: '#34d399' }; // Emerald
        return { lv: 1, name: '🥉 초보 도안러', color: '#9ca3af' }; // Gray
    },

    async updateProfileModal() {
        if (!Auth.user) {
            // Guest mode
            this.renderProfileContent('Guest', 0);
            return;
        }

        const nickname = Auth.user.user_metadata?.nickname || Auth.user.email.split('@')[0];
        const projects = await DB.getProjects();
        const completedCount = projects.filter(p => p.status === 'completed').length;

        this.renderProfileContent(nickname, completedCount);
    },

    renderProfileContent(nickname, count) {
        const modal = document.getElementById('modal-profile');
        const nameEl = modal.querySelector('.profile-nickname');
        const levelEl = modal.querySelector('.profile-level');
        const badgeEl = modal.querySelector('.level-badge');
        const progressInfo = modal.querySelector('.progress-info .highlight');
        const progressBar = modal.querySelector('.progress-bar-fill');

        const levelData = this.calculateLevel(count);

        if (nameEl) nameEl.innerText = nickname;
        if (levelEl) {
            levelEl.innerText = levelData.name;
            levelEl.style.color = levelData.color;
        }

        // Simple badge logic
        const badges = ['🌱', '🥉', '🥈', '🥇', '💎'];
        if (badgeEl) badgeEl.innerText = badges[levelData.lv] || '🌱';

        // Calc next level
        let nextGoal = 10;
        if (count < 2) nextGoal = 2;
        else if (count < 5) nextGoal = 5;
        else if (count < 10) nextGoal = 10;
        else nextGoal = 50; // Max

        const remaining = nextGoal - count;
        if (progressInfo) progressInfo.innerText = remaining > 0 ? `${remaining}개 남음` : '최고 레벨!';

        if (progressBar) {
            const percent = Math.min(100, (count / nextGoal) * 100);
            progressBar.style.width = `${percent}%`;
        }
    },

    showProfileModal() {
        this.updateProfileModal();
        document.getElementById('modal-profile').classList.remove('hidden');
    },

    showAddProjectModal() {
        document.getElementById('modal-add-project').classList.remove('hidden');
    },

    // Utils
    readFileAsDataURL(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    }
};

window.UI = UI;
