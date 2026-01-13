const OCR = {
    scannedBeads: [],

    init() {
        const btnProcess = document.getElementById('btn-process-text');
        const textInput = document.getElementById('ai-text-input');

        if (btnProcess) {
            btnProcess.onclick = () => {
                const text = textInput.value;
                if (!text.trim()) {
                    alert('Gemini에서 복사한 텍스트를 입력해주세요.');
                    return;
                }
                this.handleText(text);
            };
        }
    },

    copyPrompt() {
        const text = document.getElementById('prompt-text').innerText;
        navigator.clipboard.writeText(text).then(() => {
            alert('프롬프트가 복사되었습니다!');
        }).catch(err => {
            console.error('복사 실패:', err);
        });
    },

    handleText(text) {
        // AI extraction logic: Match DMC patterns from Gemini's output
        const candidates = text.match(/\b(B5200|ECRU|BLANC|[Zz]\d{1,5}|\d{3,5})\b/gi) || [];

        // Count occurrences
        const counts = {};
        candidates.forEach(s => {
            const code = s.toUpperCase();
            // Filter valid codes
            const isValid = ['B5200', 'ECRU', 'BLANC'].includes(code) ||
                code.startsWith('Z') ||
                (!isNaN(parseInt(code)) && parseInt(code) >= 101 && parseInt(code) < 40000);

            if (isValid) {
                counts[code] = (counts[code] || 0) + 1;
            }
        });

        // Convert to array of objects {dmc, count}
        this.scannedBeads = Object.keys(counts).map(dmc => ({
            dmc,
            count: counts[dmc]
        }));

        // Pre-sort so index matches display
        this.scannedBeads.sort((a, b) => {
            // Natural sort for DMC and Z-codes
            return a.dmc.localeCompare(b.dmc, undefined, { numeric: true, sensitivity: 'base' });
        });

        if (this.scannedBeads.length === 0) {
            alert('인식된 비즈 번호가 없습니다. 텍스트를 다시 확인해주세요.');
            return;
        }

        this.renderScanResults();
    },

    removeBead(index) {
        this.scannedBeads.splice(index, 1);
        this.renderScanResults();
    },

    renderScanResults() {
        const container = document.getElementById('scan-results-container');
        if (!container) return;
        const inventory = DB.getBeads();
        const projects = DB.getProjects().filter(p => p.status === '진행');

        container.innerHTML = `
            <div style="max-height: 450px; overflow-y: auto; margin-bottom: 20px;">
                <p style="font-size: 0.85rem; color: var(--text-support); margin-bottom: 15px;">총 ${this.scannedBeads.reduce((acc, b) => acc + b.count, 0)}개의 비즈가 감지되었습니다. (${this.scannedBeads.length}종)</p>
                
                <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; background: #f8f7ff; padding: 15px; border-radius: 12px; border: 1px solid var(--border);">
                    <div>
                        <label style="display:block; font-size:0.85rem; font-weight:700; margin-bottom:8px; color:var(--primary);">이 비즈들을 등록할 도안 선택 (선택사항)</label>
                        <select id="select-target-project" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border); background:white; font-family:inherit;">
                            <option value="">-- 창고에만 등록 --</option>
                            ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="display:block; font-size:0.85rem; font-weight:700; margin-bottom:8px; color:var(--primary);">전체 위치 일괄 지정</label>
                        <div style="display: flex; gap: 8px;">
                            <input type="text" id="batch-location-input" placeholder="예: A-1 (모든 비즈에 적용)" style="flex: 1; padding: 10px; border-radius: 8px; border: 1px solid var(--border);">
                            <button onclick="OCR.applyBatchLocation()" class="btn-secondary" style="padding: 10px 15px; font-size: 0.8rem; white-space: nowrap;">일괄 적용</button>
                        </div>
                    </div>
                </div>

                <table class="data-table" style="table-layout: fixed; width: 100%;">
                    <thead>
                        <tr>
                            <th style="width: 20%;">번호</th>
                            <th style="width: 15%;">수량</th>
                            <th style="width: 20%;">상태</th>
                            <th style="width: 30%;">위치</th>
                            <th style="width: 15%; text-align:right;">관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.scannedBeads.map((bead, idx) => {
            const owned = inventory.some(b => b.id === bead.dmc && b.count > 0);
            return `
                                <tr>
                                    <td style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><strong>${bead.dmc}</strong></td>
                                    <td style="white-space: nowrap;"><span style="font-weight:700;">${bead.count}개</span></td>
                                    <td style="white-space: nowrap;"><span class="status-tag ${owned ? 'owned' : 'missing'}" style="padding: 4px 8px; font-size: 0.75rem; display: inline-block;">${owned ? '보유' : '필요'}</span></td>
                                    <td>
                                        <input type="text" class="scan-location-input" data-dmc="${bead.dmc}" placeholder="위치" style="width: 100%; max-width: 70px; padding: 6px; border-radius: 6px; border: 1px solid var(--border); font-size: 0.8rem;">
                                    </td>
                                    <td style="text-align:right;">
                                        <button onclick="OCR.removeBead(${idx})" style="background:none; border:none; color:var(--danger); cursor:pointer; padding: 5px;">
                                            <i class="fas fa-trash-alt"></i>
                                        </button>
                                    </td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
            <button class="btn-primary" id="btn-save-scanned">비즈 등록 및 완료</button>
        `;

        document.getElementById('btn-save-scanned').onclick = () => this.saveResults();
    },

    applyBatchLocation() {
        const batchVal = document.getElementById('batch-location-input').value.trim();
        if (!batchVal) return;
        document.querySelectorAll('.scan-location-input').forEach(input => {
            input.value = batchVal;
        });
    },

    saveResults() {
        if (this.scannedBeads.length === 0) {
            alert('등록할 비즈 리스트가 없습니다.');
            return;
        }

        const projectId = document.getElementById('select-target-project').value;
        const locationInputs = document.querySelectorAll('.scan-location-input');
        const locations = {};
        locationInputs.forEach(input => {
            locations[input.getAttribute('data-dmc')] = input.value.trim() || '미지정';
        });

        // 1. Add to global inventory
        this.scannedBeads.forEach(bead => {
            const dmc = bead.dmc;
            let existing = DB.getBeadById(dmc);
            const location = locations[dmc] || '미지정';

            if (!existing) {
                DB.saveBead({
                    id: dmc,
                    name: '새 비즈',
                    count: bead.count,
                    location: location
                });
            } else {
                // Add scanned count to existing count
                existing.count = (existing.count || 0) + bead.count;
                existing.location = location;
                DB.saveBead(existing);
            }
        });

        // 2. Associate with project if selected
        if (projectId) {
            const dmcList = this.scannedBeads.map(b => b.dmc);
            DB.addProjectDetails(projectId, dmcList);
            const p = DB.getProjects().find(proj => proj.id == projectId);
            alert(`비즈창고 등록 및 '${p.name}' 도안에 연결되었습니다.`);
        } else {
            alert(`총 ${this.scannedBeads.length}종의 비즈가 비즈창고에 등록되었습니다.`);
        }

        // Reset and Redirect
        this.scannedBeads = [];
        document.getElementById('ai-text-input').value = '';
        UI.switchPage('inventory');
    }
};

window.OCR = OCR;
