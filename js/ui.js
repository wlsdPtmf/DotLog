const UI = {
    currentPage: 'dashboard',

    init() {
        this.bindEvents();
        // Initial render will happen when Auth check completes
        // But we can render structure
        this.renderDashboard();
    },

    showToast(msg) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<span>${msg}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },

    getLevel(completedCount) {
        if (completedCount >= 10) return { lv: 4, name: '장인 도안러', color: '#8257e5' };
        if (completedCount >= 5) return { lv: 3, name: '숙련 도안러', color: '#2563eb' };
        if (completedCount >= 2) return { lv: 2, name: '초보 도안러', color: '#16a34a' };
        return { lv: 1, name: '새내기 도안러', color: '#ca8a04' };
    },

    async renderHeader() {
        const header = document.getElementById('main-header');
        if (!header) return;

        if (Auth.user) {
            const nickname = Auth.user.user_metadata?.nickname || '도안러';
            const projects = await DB.getProjects();
            const completedCount = projects.filter(p => p.status === '완료').length;
            const level = this.getLevel(completedCount);

            header.innerHTML = `
                <div>
                    <h1 class="logo-text">DotLog</h1>
                </div>
                <div class="header-profile" onclick="UI.toggleDropdown()">
                    <div class="profile-info">
                        <span class="profile-nickname">🧵 ${nickname}</span>
                        <span class="profile-level" style="color: ${level.color}">Lv.${level.lv} ${level.name}</span>
                    </div>
                </div>
            `;
            this.renderDropdown(nickname, level, projects.length, completedCount);
        } else {
            header.innerHTML = `
                <div>
                    <h1 class="logo-text">DotLog</h1>
                </div>
                <div style="text-align: right;">
                    <span style="font-size: 0.9rem; font-weight: 700; color: var(--text-main);">🧵 나의 도안 기록</span><br>
                    <span style="font-size: 0.75rem; color: var(--text-support);">로그인하면 저장돼요</span>
                </div>
            `;
        }
    },

    renderDropdown(nickname, level, total, completed) {
        const dropdown = document.getElementById('profile-dropdown');
        if (!dropdown) return;
        dropdown.innerHTML = `
            <div class="dropdown-header">
                <div style="font-weight: 800; font-size: 1.1rem; margin-bottom: 5px;">${nickname}</div>
                <div style="font-size: 0.85rem; color: ${level.color}; font-weight: 700;">Lv.${level.lv} ${level.name}</div>
                <div style="font-size: 0.8rem; color: var(--text-support); margin-top: 5px;">
                    총 도안 ${total} · 완성 ${completed}
                </div>
            </div>
            <div class="dropdown-item" onclick="UI.switchPage('collection'); UI.toggleDropdown();">
                <i class="fas fa-book" style="width: 20px;"></i> 나의 완성도감
            </div>
            <div class="dropdown-item" onclick="UI.switchPage('dashboard'); UI.toggleDropdown();">
                <i class="fas fa-spinner" style="width: 20px;"></i> 진행 중 도안
            </div>
            <div class="dropdown-item" onclick="UI.switchPage('inventory'); UI.toggleDropdown();">
                <i class="fas fa-boxes" style="width: 20px;"></i> 비즈 인벤토리
            </div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-item" onclick="Auth.handleLogout()">
                <i class="fas fa-sign-out-alt" style="width: 20px;"></i> 로그아웃
            </div>
        `;
    },

    toggleDropdown() {
        const dropdown = document.getElementById('profile-dropdown');
        if (dropdown) dropdown.classList.toggle('hidden');
    },

    bindEvents() {
        // Nav Items safely
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const page = item.getAttribute('data-page');
                this.switchPage(page);
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('profile-dropdown');
            const headerProfile = document.querySelector('.header-profile');
            if (dropdown && !dropdown.classList.contains('hidden')) {
                if (headerProfile && !headerProfile.contains(e.target) && !dropdown.contains(e.target)) {
                    dropdown.classList.add('hidden');
                }
            }
        });

        // Global Search
        const searchInput = document.getElementById('global-search');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleSearch(searchInput.value);
            });
            document.querySelector('.btn-search')?.addEventListener('click', () => this.handleSearch(searchInput.value));
        }

        // Search Popup close
        document.addEventListener('click', (e) => {
            const popup = document.getElementById('search-result-popup');
            if (popup && !popup.classList.contains('hidden')) {
                const searchWrapper = document.querySelector('.search-container');
                if (!searchWrapper.contains(e.target)) popup.classList.add('hidden');
            }
        });

        // Image Preview & File Input
        const imgInput = document.getElementById('input-project-image');
        const imgPreview = document.getElementById('project-img-preview');
        const base64Input = document.getElementById('project-image-base64');

        if (imgPreview && imgInput) {
            imgPreview.addEventListener('click', () => imgInput.click());
        }

        if (imgInput) {
            imgInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.resizeImage(file, 400, (base64) => {
                        imgPreview.innerHTML = `<img src="${base64}" style="width:100%; height:100%; object-fit:cover; border-radius: 16px;">`;
                        base64Input.value = base64;
                    });
                }
            });
        }

        // Modals
        this.setupModal('btn-new-project', 'modal-project', 'btn-close-modal');
        this.setupModal('btn-add-bead', 'modal-bead', 'btn-close-bead-modal');

        // Forms
        const formProject = document.getElementById('form-project');
        if (formProject) {
            formProject.onsubmit = async (e) => {
                e.preventDefault();
                // Guest can save to local storage
                const formData = new FormData(formProject);
                const fileInput = document.getElementById('input-project-image');
                const file = fileInput.files[0];
                const base64Image = document.getElementById('project-image-base64').value;

                const project = {
                    name: formData.get('name'),
                    brand: formData.get('brand'),
                    image: base64Image,
                    file: file,
                    status: '진행'
                };

                if (await DB.addProject(project)) {
                    this.renderDashboard();
                    this.renderHeader(); // Update stats
                    this.showToast("🚀 새로운 도안이 등록되었습니다!");
                    formProject.reset();
                    imgPreview.innerHTML = `<i class="fas fa-image" style="font-size: 2rem; color: var(--text-support);"></i>`;
                    base64Input.value = '';
                    fileInput.value = '';
                    document.getElementById('modal-project').style.display = 'none';
                }
            };
        }

        const formBead = document.getElementById('form-bead');
        if (formBead) {
            formBead.onsubmit = async (e) => {
                e.preventDefault();
                const formData = new FormData(formBead);
                const dmc = formData.get('dmc').trim();
                const count = parseInt(formData.get('count'));
                const location = formData.get('location').trim() || '미지정';
                if (!dmc) return;

                const existingBead = await DB.getBeadById(dmc);
                const bead = {
                    id: dmc,
                    count: existingBead ? (existingBead.count + count) : count,
                    location: location !== '미지정' ? location : (existingBead ? existingBead.location : '미지정')
                };

                await DB.saveBead(bead);
                this.renderInventory();
                this.showToast(`💎 DMC ${dmc} 비즈가 추가되었습니다.`);
                formBead.reset();
                document.getElementById('modal-bead').style.display = 'none';
            };
        }
    },

    setupModal(btnId, modalId, closeId) {
        const btn = document.getElementById(btnId);
        const modal = document.getElementById(modalId);
        const close = document.getElementById(closeId);
        if (btn && modal) {
            btn.onclick = () => { modal.style.display = 'flex'; modal.classList.add('active'); };
        }
        if (close && modal) {
            close.onclick = () => { modal.style.display = 'none'; modal.classList.remove('active'); };
        }
    },

    resizeImage(file, maxWidth, callback) {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width, height = img.height;
            if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            callback(canvas.toDataURL('image/jpeg', 0.7));
            URL.revokeObjectURL(img.src);
        };
        img.src = URL.createObjectURL(file);
    },

    switchPage(pageId) {
        this.currentPage = pageId;
        const searchInput = document.getElementById('global-search');
        if (searchInput) {
            searchInput.value = '';
            searchInput.placeholder = (pageId === 'dashboard' || pageId === 'collection') ? "도안 이름을 입력하세요" : "DMC 비즈 번호를 입력하세요";
        }

        document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === `page-${pageId}`));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.getAttribute('data-page') === pageId));

        if (pageId === 'inventory') this.renderInventory();
        if (pageId === 'dashboard') this.renderDashboard();
        if (pageId === 'collection') this.renderCollection();

        const popup = document.getElementById('search-result-popup');
        if (popup) popup.classList.add('hidden');

        // Ensure header is up to date
        this.renderHeader();
    },

    async renderDashboard() {
        const container = document.getElementById('active-projects-container');
        if (!container) return;
        const projects = (await DB.getProjects()).filter(p => p.status === '진행');

        if (projects.length === 0) {
            // No projects case
            container.innerHTML = `
                <div class="onboarding-card" style="background: linear-gradient(135deg, var(--bg-white), #f3f4f6); color: var(--text-main);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🎨</div>
                    <h3 style="color: var(--text-main);">새로운 작품을 시작해보세요</h3>
                    <p style="color: var(--text-support);">
                        시작이 반입니다.<br>
                        가지고 있는 도안을 등록하고 기록을 남겨보세요.
                    </p>
                    <button class="btn-primary" onclick="document.getElementById('btn-new-project').click()" style="width: auto; margin-top: 20px;">
                        + 도안 등록하기
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = (await Promise.all(projects.map(async p => {
            const details = await DB.getProjectDetails(p.id);
            const owned = details.filter(d => d.isOwned).length;
            const progress = details.length ? Math.round((owned / details.length) * 100) : 0;

            return `
                <div class="card">
                    <div style="display:flex; gap:16px; align-items:flex-start; margin-bottom: 20px;">
                        ${p.image ? `<img src="${p.image}" style="width:80px; height:80px; border-radius:18px; object-fit:cover; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">` : `<div style="width:80px; height:80px; background:var(--bg-light); border-radius:18px; display:flex; align-items:center; justify-content:center; font-size:2rem; border:1px solid var(--border);">🖼️</div>`}
                        <div style="flex:1;">
                            <h3 style="font-size: 1.25rem;">${p.name}</h3>
                            <p style="color:var(--text-support); font-size:0.9rem;">${p.brand}</p>
                            <span style="font-size: 0.8rem; background: #e0f2fe; color: #0284c7; padding: 4px 8px; border-radius: 8px; font-weight: 700;">${p.createdAt.split('T')[0]} 시작</span>
                        </div>
                    </div>
                    <div class="progress-info">
                        <div class="progress-labels">
                            <span>비즈 준비</span>
                            <span style="color: var(--primary);">${owned}/${details.length} (${progress}%)</span>
                        </div>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" style="width:${progress}%"></div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button class="btn-secondary" style="flex: 1; border: none; background: #fef2f2; color: var(--danger);" onclick="UI.deleteProject('${p.id}')"><i class="fas fa-trash-alt"></i></button>
                        <button class="btn-primary" style="flex: 4;" onclick="UI.showProjectDetail('${p.id}')">상세 보기</button>
                    </div>
                </div>`;
        }))).join('');
    },

    async renderCollection() {
        const container = document.getElementById('collection-container');
        const summary = document.getElementById('collection-summary');
        if (!container || !summary) return;

        const projects = await DB.getProjects();
        const completed = projects.filter(p => p.status === '완료');
        const active = projects.filter(p => p.status === '진행');

        // Calculate Total Days (Simple approach: Days since first project created)
        let paramDays = 0;
        if (projects.length > 0) {
            const firstDate = new Date(projects[projects.length - 1].createdAt); // Ordered by desc in DB.js, so last is oldest
            const now = new Date();
            const diffTime = Math.abs(now - firstDate);
            paramDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        summary.innerHTML = `
            <div class="collection-stats">
                <div class="stat-box">
                    <div class="stat-value">${projects.length}</div>
                    <div class="stat-label">총 도안</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value" style="color: #27c872;">${completed.length}</div>
                    <div class="stat-label">완성</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value" style="color: var(--text-main);">${paramDays}일</div>
                    <div class="stat-label">함께한 시간</div>
                </div>
            </div>
        `;

        // Render completed projects or empty state logic continued...
        if (completed.length === 0) {
            // ... (rest of the file content as originally captured)
            container.innerHTML = `<div class="card" style="grid-column: 1/-1; text-align:center; padding: 5rem 2rem; color:var(--text-support);">
                <i class="fas fa-award" style="font-size: 3rem; margin-bottom: 20px; color: var(--border);"></i><br>
                아직 완성된 작품이 없습니다.<br>진행 중인 도안을 완성해보세요!
            </div>`;
            return;
        }

        container.innerHTML = completed.map(p => {
            const complDate = p.createdAt.split('T')[0];
            return `
            <div class="completed-card" onclick="UI.showProjectDetail('${p.id}')">
                <div class="completed-img-wrapper">
                    ${p.image ? `<img src="${p.image}" class="completed-img">` : `<div style="width:100%; height:100%; background:var(--bg-light); display:flex; align-items:center; justify-content:center; font-size:3rem;">🖼️</div>`}
                </div>
                <div class="completed-info">
                    <h3 class="completed-title">${p.name}</h3>
                    <div class="completed-meta">
                        <span><i class="far fa-calendar-alt"></i> ${complDate}</span>
                        <span class="star-rating">
                            <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="far fa-star"></i>
                        </span>
                    </div>
                </div>
            </div>`;
        }).join('');
    },

    async showProjectDetail(id) {
        const projects = await DB.getProjects();
        const p = projects.find(proj => proj.id == id);
        if (!p) return;
        const details = await DB.getProjectDetails(id);
        const owned = details.filter(d => d.isOwned).length;
        const progress = details.length ? Math.round((owned / details.length) * 100) : 0;
        const modal = document.getElementById('modal-project-detail');
        const content = document.getElementById('project-detail-content');
        const isCompleted = p.status === '완료';

        content.innerHTML = `
            <div style="text-align:center; margin-bottom:20px;">
                ${p.image ? `<img src="${p.image}" style="width:${isCompleted ? '100%' : '150px'}; max-height:${isCompleted ? '500px' : '150px'}; border-radius:24px; object-fit:cover; margin-bottom:20px; box-shadow: 0 15px 35px rgba(0,0,0,0.15);">` : ''}
                <h2 style="font-size:1.8rem; font-weight:800; margin-bottom:5px;">${p.name}</h2>
                <p style="color:var(--text-support); font-size:1rem;">${p.brand}</p>
            </div>
            ${isCompleted ?
                `<div style="background: linear-gradient(135deg, rgba(39, 200, 114, 0.1), rgba(130, 87, 229, 0.1)); padding: 25px; border-radius: 24px; text-align: center; margin-bottom: 25px; border: 1px solid rgba(39, 200, 114, 0.2);">
                    <p style="font-size: 1.1rem; font-weight: 700; color: var(--text-main); line-height: 1.6;">🎉 완성을 축하합니다!</p>
                 </div>`
                :
                `<div class="progress-info" style="margin-bottom:25px; background:white; padding:15px; border-radius:15px; border:1px solid var(--border);">
                    <div class="progress-labels">
                        <span style="font-weight:700;">비즈 준비 현황</span>
                        <span style="color:var(--primary); font-weight:800;">${owned} / ${details.length} (${progress}%)</span>
                    </div>
                    <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${progress}%"></div></div>
                </div>
                <div style="background:var(--bg-light); border-radius:20px; padding:15px; margin-bottom:20px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                        <h4 style="margin:0;">📋 비즈 리스트</h4>
                        <label style="font-size:0.85rem; color:var(--primary); cursor:pointer; font-weight:700;">
                            <input type="checkbox" id="check-all-beads" checked onchange="UI.toggleAllBeads(this)"> 전체 선택
                        </label>
                    </div>
                    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap:10px; max-height:200px; overflow-y:auto;">
                        ${details.map(d => `<label style="background:white; padding:10px; border-radius:10px; border:1px solid var(--border); display:flex; flex-direction:column; align-items:center; cursor:pointer;">
                            <strong style="font-size:0.9rem;">${d.dmc}</strong>
                            <span class="status-tag ${d.isOwned ? 'owned' : 'missing'}" style="font-size:0.6rem; margin-top:5px;">${d.isOwned ? '보유' : '필요'}</span>
                            <div style="display:none;"><input type="checkbox" class="bead-select-checkbox" data-dmc="${d.dmc}" checked></div>
                        </label>`).join('')}
                        ${details.length === 0 ? '<p style="grid-column:1/-1; text-align:center; padding:20px; color:var(--text-support);">스캔된 정보가 없습니다.</p>' : ''}
                    </div>
                </div>`
            }
            <div style="display:flex; gap:10px;">
                ${!isCompleted ? `<button class="btn-primary" style="flex:2; padding:16px;" onclick="UI.completeConfirm('${id}')">도안 완성하기</button>` : ''}
                <button class="btn-secondary" style="flex:1; padding:16px;" onclick="document.getElementById('modal-project-detail').style.display='none'">닫기</button>
            </div>
        `;
        modal.style.display = 'flex';
    },

    toggleAllBeads(el) { document.querySelectorAll('.bead-select-checkbox').forEach(cb => cb.checked = el.checked); },

    async completeConfirm(id) {
        if (confirm(`정말 완성하시겠습니까?`)) {
            await DB.updateProjectStatus(id, '완료');
            document.getElementById('modal-project-detail').style.display = 'none';
            this.renderDashboard();
            this.renderCollection();
            this.renderHeader();
            this.switchPage('collection');
            this.showToast("🎉 완성을 축하드립니다! 도감에 저장되었습니다.");
        }
    },

    async renderInventory() {
        const tbody = document.getElementById('inventory-table-body');
        const filterEl = document.getElementById('inventory-project-filter');
        if (!tbody || !filterEl) return;
        const projects = (await DB.getProjects()).filter(p => p.status === '진행');
        const cur = filterEl.value;
        filterEl.innerHTML = '<option value="all">전체 목록 (모든 비즈)</option>' + projects.map(p => `<option value="${p.id}" ${cur == p.id ? 'selected' : ''}>${p.name}</option>`).join('');
        let beads = await DB.getBeads();
        const batchActions = document.getElementById('inventory-batch-actions');
        if (filterEl.value !== 'all') {
            const projectDmcList = (await DB.getProjectDetails(filterEl.value)).map(d => d.dmc);
            beads = beads.filter(b => projectDmcList.includes(b.id));
            if (batchActions) { batchActions.style.display = 'block'; batchActions.innerHTML = `<div style="background:var(--bg-white); padding:15px; border-radius:18px; box-shadow:0 4px 15px rgba(0,0,0,0.05); display:flex; align-items:center; gap:12px; border:1px solid var(--primary);"><label style="font-size:0.9rem; font-weight:700; color:var(--primary); white-space:nowrap;">🚚 일괄 이동:</label><input type="text" id="inventory-batch-location" placeholder="새 위치" style="flex:1; padding:10px; border-radius:10px; border:1px solid var(--border);"><button onclick="UI.updateProjectBeadsLocation('${filterEl.value}')" class="btn-primary" style="width:auto; padding:10px 20px;">이동</button></div>`; }
        } else if (batchActions) { batchActions.style.display = 'none'; }
        if (beads.length === 0) { tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:3rem; color:var(--text-support);">데이터가 없습니다.</td></tr>`; return; }

        beads.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

        tbody.innerHTML = beads.map(b => `<tr><td><strong>${b.id}</strong></td><td><div style="display:flex; align-items:center; gap:8px;"><span style="font-weight:700;">${b.count}개</span><button onclick="UI.changeQuantity('${b.id}', -1)" style="border:1px solid var(--border); width:20px; height:20px;">-</button><button onclick="UI.changeQuantity('${b.id}', 1)" style="border:1px solid var(--border); width:20px; height:20px;">+</button></div></td><td><span style="color:var(--primary); font-weight:700; cursor:pointer;" onclick="UI.editLocation('${b.id}')">${b.location}</span></td><td><div style="display:flex; justify-content:flex-end; gap:15px;"><button onclick="UI.deleteBead('${b.id}')" style="background:none; border:none; color:var(--danger); cursor:pointer;"><i class="fas fa-trash-alt"></i></button></div></td></tr>`).join('');
    },

    async deleteProject(id) { if (confirm('정말 삭제하시겠습니까?')) { await DB.deleteProject(id); this.renderDashboard(); this.renderCollection(); this.renderHeader(); } },
    async deleteBead(id) { if (confirm('비즈를 삭제하시겠습니까?')) { await DB.deleteBead(id); this.renderInventory(); this.showToast("🗑️ 비즈가 삭제되었습니다."); } },
    async changeQuantity(id, delta) {
        const bead = await DB.getBeadById(id);
        if (!bead) return;
        const newCount = bead.count + delta;
        if (newCount <= 0) this.deleteBead(id);
        else { bead.count = newCount; await DB.saveBead(bead); this.renderInventory(); }
    },
    async editLocation(id) {
        const bead = await DB.getBeadById(id);
        if (!bead) return;
        const newLoc = prompt('새로운 위치를 입력하세요', bead.location);
        if (newLoc !== null) { bead.location = newLoc || '미지정'; await DB.saveBead(bead); this.renderInventory(); }
    },
    async updateProjectBeadsLocation(projectId) {
        const newLocation = document.getElementById('inventory-batch-location').value.trim();
        if (!newLocation) return;
        const projectDmcList = (await DB.getProjectDetails(projectId)).map(d => d.dmc);
        if (projectDmcList.length === 0) return;
        if (confirm(`이 도안의 ${projectDmcList.length}개 비즈의 위치를 모두 '${newLocation}'(으)로 이동하시겠습니까?`)) {
            const allBeads = await DB.getBeads();
            for (const b of allBeads) {
                if (projectDmcList.includes(b.id)) { b.location = newLocation; await DB.saveBead(b); }
            }
            this.renderInventory(); alert('일괄 변경되었습니다.');
        }
    },
    async handleSearch(query) {
        if (!query) return;
        const popup = document.getElementById('search-result-popup');
        popup.innerHTML = '';
        if (this.currentPage === 'inventory') {
            const b = await DB.getBeadById(query);
            if (b) popup.innerHTML = `<div style="padding:15px;"><strong>DMC ${b.id}</strong><p>수량: ${b.count}개</p><p>위치: ${b.location}</p></div>`;
            else popup.innerHTML = `<div style="padding:15px; text-align:center;">정보가 없습니다.</div>`;
        } else {
            const results = (await DB.getProjects()).filter(p => p.name.includes(query));
            if (results.length) popup.innerHTML = `<div style="padding:10px;"><h4>도안 검색 결과</h4>${results.map(p => `<div onclick="UI.showProjectDetail('${p.id}'); document.getElementById('search-result-popup').classList.add('hidden');" style="display:flex; gap:10px; align-items:center; cursor:pointer; padding:5px;"><span>${p.name}</span></div>`).join('')}</div>`;
            else popup.innerHTML = `<div style="padding:15px; text-align:center;">결과가 없습니다.</div>`;
        }
        popup.classList.remove('hidden');
    }
};

window.UI = UI;
