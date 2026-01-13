const UI = {
    currentPage: 'dashboard',

    init() {
        this.bindEvents();
        this.renderDashboard();
    },

    bindEvents() {
        // Navigation (Bottom Nav)
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const page = item.getAttribute('data-page');
                this.switchPage(page);
            });
        });

        // Search
        const searchInput = document.getElementById('global-search');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleSearch(searchInput.value);
            });
        }

        // Global Search Close popup
        document.addEventListener('click', (e) => {
            const popup = document.getElementById('search-result-popup');
            if (popup && !popup.classList.contains('hidden')) {
                const searchWrapper = document.querySelector('.search-container');
                if (!popup.contains(e.target) && !searchWrapper.contains(e.target)) {
                    popup.classList.add('hidden');
                }
            }
        });

        // Search Button Click
        const btnSearch = document.querySelector('.btn-search');
        if (btnSearch && searchInput) {
            btnSearch.addEventListener('click', () => {
                this.handleSearch(searchInput.value);
            });
        }

        // Inventory Filter
        const invFilter = document.getElementById('inventory-project-filter');
        if (invFilter) {
            invFilter.addEventListener('change', () => this.renderInventory());
        }

        // Project Image Processing
        const imgPreview = document.getElementById('project-img-preview');
        const fileInput = document.getElementById('input-project-image');
        const base64Input = document.getElementById('project-image-base64');

        if (imgPreview && fileInput) {
            const triggerSelect = (e) => {
                e.preventDefault();
                fileInput.click();
            };
            imgPreview.addEventListener('click', triggerSelect);
            imgPreview.addEventListener('touchend', triggerSelect);

            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.resizeImage(file, 400, (base64) => {
                        imgPreview.innerHTML = `<img src="${base64}" style="width:100%; height:100%; object-fit:cover;">`;
                        base64Input.value = base64;
                    });
                }
            });
        }

        // Modal New Project
        const btnNewProject = document.getElementById('btn-new-project');
        const modalNew = document.getElementById('modal-project');
        if (btnNewProject && modalNew) {
            btnNewProject.onclick = () => {
                modalNew.style.display = 'flex';
                modalNew.classList.add('active');
            };
        }
        const btnCloseNew = document.getElementById('btn-close-modal');
        if (btnCloseNew && modalNew) {
            btnCloseNew.onclick = () => {
                modalNew.style.display = 'none';
                modalNew.classList.remove('active');
            };
        }

        // Modal New Bead
        const btnAddBead = document.getElementById('btn-add-bead');
        const modalBead = document.getElementById('modal-bead');
        if (btnAddBead && modalBead) {
            btnAddBead.onclick = () => {
                modalBead.style.display = 'flex';
                modalBead.classList.add('active');
            };
        }
        const btnCloseBead = document.getElementById('btn-close-bead-modal');
        if (btnCloseBead && modalBead) {
            btnCloseBead.onclick = () => {
                modalBead.style.display = 'none';
                modalBead.classList.remove('active');
            };
        }

        // Form Submit Project
        const formProject = document.getElementById('form-project');
        if (formProject) {
            formProject.onsubmit = (e) => {
                e.preventDefault();
                const formData = new FormData(formProject);
                const project = {
                    name: formData.get('name'),
                    brand: formData.get('brand'),
                    image: formData.get('image'),
                    status: '진행'
                };
                if (DB.addProject(project)) {
                    this.renderDashboard();
                    formProject.reset();
                    if (imgPreview) imgPreview.innerHTML = `<i class="fas fa-image" style="font-size: 2rem; color: var(--text-support);"></i>`;
                    if (base64Input) base64Input.value = '';
                    modalNew.style.display = 'none';
                    modalNew.classList.remove('active');
                }
            };
        }

        // Form Submit Bead
        const formBead = document.getElementById('form-bead');
        if (formBead) {
            formBead.onsubmit = (e) => {
                e.preventDefault();
                const formData = new FormData(formBead);
                const dmc = formData.get('dmc').trim();
                const count = parseInt(formData.get('count'));
                const location = formData.get('location').trim() || '미지정';

                if (!dmc) return;

                const existingBead = DB.getBeadById(dmc);
                const bead = {
                    id: dmc,
                    count: existingBead ? (existingBead.count + count) : count,
                    location: location !== '미지정' ? location : (existingBead ? existingBead.location : '미지정')
                };

                DB.saveBead(bead);
                this.renderInventory();
                formBead.reset();
                modalBead.style.display = 'none';
                modalBead.classList.remove('active');
            };
        }
    },

    resizeImage(file, maxWidth, callback) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                callback(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    },

    switchPage(pageId) {
        this.currentPage = pageId;
        const tagline = document.getElementById('header-tagline');
        const searchInput = document.getElementById('global-search');

        if (tagline) {
            const labels = {
                dashboard: '오늘의 작품을 이어가세요.',
                scanner: 'AI로 비즈 리스트를 정확하게 분석하세요.',
                inventory: '소중한 비즈들을 한눈에 관리하세요.',
                collection: '정성껏 완성한 나만의 도감입니다.'
            };
            tagline.innerText = labels[pageId] || labels.dashboard;
        }

        if (searchInput) {
            searchInput.value = '';
            searchInput.placeholder = (pageId === 'dashboard' || pageId === 'collection') ? "도안 이름을 입력하세요" : "DMC 비즈 번호를 입력하세요";
        }

        document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === `page-${pageId}`));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.getAttribute('data-page') === pageId));

        if (pageId === 'inventory') this.renderInventory();
        if (pageId === 'dashboard') this.renderDashboard();
        if (pageId === 'collection') this.renderCollection();

        // Hide search result popup when switching pages
        const popup = document.getElementById('search-result-popup');
        if (popup) popup.classList.add('hidden');
    },

    renderDashboard() {
        const container = document.getElementById('active-projects-container');
        if (!container) return;
        const projects = DB.getProjects().filter(p => p.status === '진행');

        if (projects.length === 0) {
            container.innerHTML = `<div class="card" style="text-align:center; padding:4rem 2rem; color:var(--text-support);">진행 중인 도안이 없습니다.</div>`;
            return;
        }

        container.innerHTML = projects.map(p => {
            const details = DB.getProjectDetails(p.id);
            const owned = details.filter(d => d.isOwned).length;
            const progress = details.length ? Math.round((owned / details.length) * 100) : 0;
            return `
                <div class="card">
                    <div style="display:flex; gap:16px; align-items:flex-start; margin-bottom: 20px;">
                        ${p.image ? `<img src="${p.image}" style="width:70px; height:70px; border-radius:14px; object-fit:cover;">` : `<div style="width:70px; height:70px; background:var(--bg-light); border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:1.5rem; border:1px dashed var(--border);">🖼️</div>`}
                        <div style="flex:1;">
                            <h3 style="font-size: 1.25rem;">${p.name}</h3>
                            <p style="color:var(--text-support); font-size:0.85rem;">${p.brand} | ${p.createdAt.split('T')[0]}</p>
                        </div>
                        <button onclick="UI.deleteProject(${p.id})" style="background:none; border:none; color:var(--danger); cursor:pointer;"><i class="fas fa-trash-alt"></i></button>
                    </div>
                    <div class="progress-info">
                        <div class="progress-labels"><span>비즈 준비</span><span>${owned}/${details.length} (${progress}%)</span></div>
                        <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${progress}%"></div></div>
                    </div>
                    <button class="btn-primary" style="margin-top:20px; width:100%;" onclick="UI.showProjectDetail(${p.id})">도안 확인</button>
                </div>
            `;
        }).join('');
    },

    renderCollection() {
        const container = document.getElementById('collection-container');
        if (!container) return;
        const projects = DB.getProjects().filter(p => p.status === '완료');

        if (projects.length === 0) {
            container.innerHTML = `<div class="card" style="grid-column: 1/-1; text-align:center; padding: 5rem 2rem; color:var(--text-support);">완성된 작품이 없습니다.</div>`;
            return;
        }

        container.innerHTML = projects.map(p => `
            <div class="card" style="position:relative; cursor:pointer;" onclick="UI.showProjectDetail(${p.id})">
                <button onclick="event.stopPropagation(); UI.deleteProject(${p.id})" 
                    style="position:absolute; top:15px; right:15px; background:rgba(239, 68, 68, 0.9); width:36px; height:36px; border-radius:50%; border:none; color:white; cursor:pointer; z-index:5; display:flex; align-items:center; justify-content:center; box-shadow: 0 4px 10px rgba(239, 68, 68, 0.3); transition: var(--transition);">
                    <i class="fas fa-trash-alt" style="font-size: 1rem;"></i>
                </button>
                <div style="height:200px; background:var(--bg-light); border-radius:18px; margin-bottom:1.25rem; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                    ${p.image ? `<img src="${p.image}" style="width:100%; height:100%; object-fit:cover;">` : `<span style="font-size:4rem;">🖼️</span>`}
                </div>
                <h3>${p.name}</h3>
                <p style="color:var(--text-support); font-size:0.95rem;">${p.brand} | <span style="color:var(--secondary); font-weight:700;">완성완료</span></p>
            </div>
        `).join('');
    },

    showProjectDetail(id) {
        const p = DB.getProjects().find(proj => proj.id == id);
        if (!p) return;
        const details = DB.getProjectDetails(id);
        const owned = details.filter(d => d.isOwned).length;
        const progress = details.length ? Math.round((owned / details.length) * 100) : 0;

        const modal = document.getElementById('modal-project-detail');
        const content = document.getElementById('project-detail-content');

        const isCompleted = p.status === '완료';

        content.innerHTML = `
            <div style="text-align:center; margin-bottom:20px;">
                ${p.image ? `<img src="${p.image}" style="width:${isCompleted ? '100%' : '150px'}; max-height:${isCompleted ? '400px' : '150px'}; border-radius:24px; object-fit:cover; margin-bottom:20px; box-shadow: 0 15px 35px rgba(0,0,0,0.15);">` : ''}
                <h2 style="font-size:1.8rem; font-weight:800; margin-bottom:5px;">${p.name}</h2>
                <p style="color:var(--text-support); font-size:1rem;">${p.brand} | ${isCompleted ? '✨ 완성된 작품 ✨' : '진행 중인 도안'}</p>
            </div>
            
            ${isCompleted ? `
                <div style="background: linear-gradient(135deg, rgba(39, 200, 114, 0.1), rgba(130, 87, 229, 0.1)); padding: 25px; border-radius: 24px; text-align: center; margin-bottom: 25px; border: 1px solid rgba(39, 200, 114, 0.2);">
                    <p style="font-size: 1.1rem; font-weight: 700; color: var(--text-main); line-height: 1.6;">
                        🎉 정성이 가득 담긴 작품이 완성되었습니다!<br>
                        <span style="font-size: 0.9rem; color: var(--text-support); font-weight: 400;">${p.createdAt.split('T')[0]} 등록됨</span>
                    </p>
                </div>
            ` : `
                <div class="progress-info" style="margin-bottom:25px; background:white; padding:15px; border-radius:15px; border:1px solid var(--border);">
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
                            <input type="checkbox" id="check-all-beads" checked onchange="UI.toggleAllBeads(this)"> 전체 선택삭제
                        </label>
                    </div>
                    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap:10px; max-height:200px; overflow-y:auto;">
                        ${details.map(d => `
                            <label style="background:white; padding:10px; border-radius:10px; border:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <input type="checkbox" class="bead-select-checkbox" data-dmc="${d.dmc}" checked>
                                    <strong style="font-size:0.9rem;">${d.dmc}</strong>
                                </div>
                                <span class="status-tag ${d.isOwned ? 'owned' : 'missing'}" style="font-size:0.6rem; padding: 2px 6px;">${d.isOwned ? '보유' : '필요'}</span>
                            </label>
                        `).join('')}
                        ${details.length === 0 ? '<p style="grid-column:1/-1; text-align:center; padding:20px; color:var(--text-support);">스캔된 정보가 없습니다.</p>' : ''}
                    </div>
                </div>
            `}
            
            <div style="display:flex; gap:10px;">
                ${!isCompleted ? `<button class="btn-primary" style="flex:2; padding:16px;" onclick="UI.completeConfirm(${id})">도안 완성</button>` : ''}
                <button class="btn-secondary" style="flex:1; padding:16px;" onclick="document.getElementById('modal-project-detail').style.display='none'">닫기</button>
            </div>
        `;
        modal.style.display = 'flex';
    },

    toggleAllBeads(el) {
        document.querySelectorAll('.bead-select-checkbox').forEach(cb => cb.checked = el.checked);
    },

    completeConfirm(id) {
        const checked = Array.from(document.querySelectorAll('.bead-select-checkbox:checked')).map(cb => cb.getAttribute('data-dmc'));
        if (confirm(`정말 완성하시겠습니까?\n선택된 ${checked.length}개의 비즈를 창고에서 삭제합니다.`)) {
            if (checked.length > 0) DB.removeSpecificBeadsFromInventory(checked);
            DB.updateProjectStatus(id, '완료');
            document.getElementById('modal-project-detail').style.display = 'none';
            this.renderDashboard();
            this.renderCollection();
            this.switchPage('collection');
            alert('완성을 축하합니다!');
        }
    },

    renderInventory() {
        const tbody = document.getElementById('inventory-table-body');
        const filterEl = document.getElementById('inventory-project-filter');
        if (!tbody || !filterEl) return;
        const projects = DB.getProjects().filter(p => p.status === '진행');
        const cur = filterEl.value;
        filterEl.innerHTML = '<option value="all">전체 목록 (모든 비즈)</option>' + projects.map(p => `<option value="${p.id}" ${cur == p.id ? 'selected' : ''}>${p.name}</option>`).join('');

        let beads = DB.getBeads();
        const batchActions = document.getElementById('inventory-batch-actions');
        if (filterEl.value !== 'all') {
            const projectDmcList = DB.getProjectDetails(filterEl.value).map(d => d.dmc);
            beads = beads.filter(b => projectDmcList.includes(b.id));

            // Show batch actions
            if (batchActions) {
                batchActions.style.display = 'block';
                batchActions.innerHTML = `
                    <div style="background: var(--bg-white); padding: 15px; border-radius: 18px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 12px; border: 1px solid var(--primary);">
                        <label style="font-size: 0.9rem; font-weight: 700; color: var(--primary); white-space: nowrap;">🚚 이 도안의 모든 비즈 이동:</label>
                        <input type="text" id="inventory-batch-location" placeholder="새 위치 입력" style="flex: 1; padding: 10px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-light);">
                        <button onclick="UI.updateProjectBeadsLocation('${filterEl.value}')" class="btn-primary" style="width: auto; padding: 10px 20px; font-size: 0.9rem;">일괄 이동</button>
                    </div>
                `;
            }
        } else {
            if (batchActions) {
                batchActions.style.display = 'none';
                batchActions.innerHTML = '';
            }
        }

        if (beads.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:3rem; color:var(--text-support);">데이터가 없습니다.</td></tr>`;
            return;
        }

        tbody.innerHTML = beads.map(b => `
            <tr>
                <td><strong>${b.id}</strong></td>
                <td>
                    <div style="display:flex; align-items:center; gap: 8px;">
                        <span style="font-weight:700;">${b.count}개</span>
                        <button onclick="UI.changeQuantity('${b.id}', -1)" style="background:none; border:1px solid var(--border); border-radius:4px; width:20px; height:20px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:0.7rem; color:var(--text-support);">-</button>
                        <button onclick="UI.changeQuantity('${b.id}', 1)" style="background:none; border:1px solid var(--border); border-radius:4px; width:20px; height:20px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:0.7rem; color:var(--text-support);">+</button>
                    </div>
                </td>
                <td>
                    <span style="color:var(--primary); font-weight:700; cursor:pointer;" onclick="UI.editLocation('${b.id}')">${b.location}</span>
                </td>
                <td>
                    <div style="display:flex; justify-content:flex-end; gap: 15px; padding-right: 15px;">
                        <button onclick="UI.editLocation('${b.id}')" title="위치 수정" style="background:none; border:none; color:var(--text-support); cursor:pointer; font-size:1.1rem;"><i class="fas fa-edit"></i></button>
                        <button onclick="UI.deleteBead('${b.id}')" title="비즈 삭제" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:1.1rem;"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    deleteProject(id) {
        if (confirm('정말 삭제하시겠습니까?')) {
            DB.deleteProject(id);
            this.renderDashboard();
            this.renderCollection();
        }
    },

    deleteBead(id) {
        if (confirm('비즈를 삭제하시겠습니까?')) {
            DB.deleteBead(id);
            this.renderInventory();
        }
    },

    changeQuantity(id, delta) {
        const bead = DB.getBeadById(id);
        if (!bead) return;
        const newCount = bead.count + delta;
        if (newCount <= 0) {
            this.deleteBead(id);
        } else {
            bead.count = newCount;
            DB.saveBead(bead);
            this.renderInventory();
        }
    },

    editLocation(id) {
        const bead = DB.getBeadById(id);
        if (!bead) return;
        const newLocation = prompt('새 위치를 입력하세요 (예: A-1, 서랍3...):', bead.location === '미지정' ? '' : bead.location);
        if (newLocation !== null) {
            bead.location = newLocation.trim() || '미지정';
            DB.saveBead(bead);
            this.renderInventory();
        }
    },

    updateProjectBeadsLocation(projectId) {
        const newLocation = document.getElementById('inventory-batch-location').value.trim();
        if (!newLocation) {
            alert('이동할 위치를 입력해주세요.');
            return;
        }

        const projectDmcList = DB.getProjectDetails(projectId).map(d => d.dmc);
        if (projectDmcList.length === 0) return;

        if (confirm(`이 도안에 속한 ${projectDmcList.length}개 비즈의 위치를 모두 '${newLocation}'(으)로 이동하시겠습니까?`)) {
            const allBeads = DB.getBeads();
            allBeads.forEach(b => {
                if (projectDmcList.includes(b.id)) {
                    b.location = newLocation;
                    DB.saveBead(b);
                }
            });
            this.renderInventory();
            alert('위치가 일괄 변경되었습니다.');
        }
    },

    handleSearch(query) {
        if (!query) return;
        const popup = document.getElementById('search-result-popup');
        popup.innerHTML = '';
        if (this.currentPage === 'dashboard' || this.currentPage === 'collection') {
            const results = DB.getProjects().filter(p => p.name.includes(query));
            if (results.length) {
                popup.innerHTML = `<div style="padding:10px;"><h4 style="margin-bottom:10px;">도안 검색 결과</h4><div style="display:flex; flex-direction:column; gap:8px;">${results.map(p => `<div onclick="UI.showProjectDetail(${p.id}); document.getElementById('search-result-popup').classList.add('hidden');" style="display:flex; gap:10px; align-items:center; cursor:pointer;">${p.image ? `<img src="${p.image}" style="width:30px; height:30px; border-radius:4px; object-fit:cover;">` : '🖼️'} <span>${p.name}</span></div>`).join('')}</div></div>`;
            } else popup.innerHTML = `<div style="padding:15px; text-align:center;">결과가 없습니다.</div>`;
        } else {
            const b = DB.getBeadById(query);
            if (b) popup.innerHTML = `<div style="padding:15px;"><strong>DMC ${b.id}</strong><p>수량: ${b.count}개</p><p>위치: ${b.location}</p></div>`;
            else popup.innerHTML = `<div style="padding:15px; text-align:center;">정보가 없습니다.</div>`;
        }
        popup.classList.remove('hidden');
    }
};

window.UI = UI;
UI.init();
