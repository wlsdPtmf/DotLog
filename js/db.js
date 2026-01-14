const DB = {
    // DB 초기화: 로컬 스토리지를 지우지 않고 유지하도록 개선
    init() {
        if (!localStorage.getItem('dotlog_beads')) localStorage.setItem('dotlog_beads', '[]');
        if (!localStorage.getItem('dotlog_projects')) localStorage.setItem('dotlog_projects', '[]');
        if (!localStorage.getItem('dotlog_project_details')) localStorage.setItem('dotlog_project_details', '[]');
    },

    // --- 비즈 (Inventory) 관련 ---
    async getBeads() {
        if (Auth.user) {
            const { data, error } = await supabase.from('inventory').select('*');
            if (error) { console.error(error); return []; }
            return data.map(b => ({ id: b.dmc_code, count: b.count, location: b.location }));
        }
        return JSON.parse(localStorage.getItem('dotlog_beads') || '[]');
    },

    async saveBead(bead) {
        if (Auth.user) {
            const { error } = await supabase.from('inventory').upsert({
                user_id: Auth.user.id,
                dmc_code: bead.id,
                count: bead.count,
                location: bead.location
            });
            if (error) UI.showToast("❌ 저장 실패: " + error.message);
        } else {
            const beads = JSON.parse(localStorage.getItem('dotlog_beads') || '[]');
            const index = beads.findIndex(b => b.id === bead.id);
            if (index > -1) beads[index] = bead;
            else beads.push(bead);
            localStorage.setItem('dotlog_beads', JSON.stringify(beads));
        }
        this.refreshProjectDetailsOwnership();
    },

    async deleteBead(id) {
        if (Auth.user) {
            const { error } = await supabase.from('inventory').delete().match({ user_id: Auth.user.id, dmc_code: id });
            if (error) console.error(error);
        } else {
            const beads = JSON.parse(localStorage.getItem('dotlog_beads') || '[]').filter(b => b.id !== id);
            localStorage.setItem('dotlog_beads', JSON.stringify(beads));
        }
        this.refreshProjectDetailsOwnership();
    },

    async getBeadById(id) {
        const beads = await this.getBeads();
        return beads.find(b => b.id === id);
    },

    // --- 도안 (Projects) 관련 ---
    async getProjects() {
        if (Auth.user) {
            const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
            if (error) { console.error(error); return []; }
            return data.map(p => ({
                id: p.id,
                name: p.name,
                brand: p.brand,
                image: p.image_url,
                status: p.status,
                createdAt: p.created_at,
                userId: p.user_id
            }));
        }
        return JSON.parse(localStorage.getItem('dotlog_projects') || '[]');
    },

    async uploadImage(file) {
        if (!Auth.user || !file) return null;

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Auth.user.id}/${Date.now()}.${fileExt}`;

            // Upload to 'images' bucket
            const { error: uploadError } = await supabase.storage
                .from('images')
                .upload(fileName, file);

            if (uploadError) {
                console.error('Upload Error:', uploadError);
                throw uploadError;
            }

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('images')
                .getPublicUrl(fileName);

            return publicUrl;
        } catch (err) {
            UI.showToast("❌ 이미지 업로드 실패: " + err.message);
            return null;
        }
    },

    async addProject(project) {
        if (Auth.user) {
            let imageUrl = project.image;

            // Check if 'image' is a File object (not base64 string)
            if (project.file instanceof File) {
                const uploadedUrl = await this.uploadImage(project.file);
                if (uploadedUrl) imageUrl = uploadedUrl;
            }

            const { data, error } = await supabase.from('projects').insert({
                user_id: Auth.user.id,
                name: project.name,
                brand: project.brand,
                image_url: imageUrl,
                status: '진행'
            }).select();
            if (error) { UI.showToast("❌ 저장 실패: " + error.message); return null; }
            return data[0];
        } else {
            const projects = JSON.parse(localStorage.getItem('dotlog_projects') || '[]');
            project.id = Date.now();
            project.createdAt = new Date().toISOString();
            projects.push(project);
            localStorage.setItem('dotlog_projects', JSON.stringify(projects));
            return project;
        }
    },

    async deleteProject(id) {
        if (Auth.user) {
            const { error } = await supabase.from('projects').delete().match({ id, user_id: Auth.user.id });
            if (error) console.error(error);
        } else {
            const projects = JSON.parse(localStorage.getItem('dotlog_projects') || '[]').filter(p => p.id != id);
            localStorage.setItem('dotlog_projects', JSON.stringify(projects));
            const allDetails = JSON.parse(localStorage.getItem('dotlog_project_details') || '[]').filter(d => d.projectId != id);
            localStorage.setItem('dotlog_project_details', JSON.stringify(allDetails));
        }
    },

    async updateProjectStatus(id, status) {
        if (Auth.user) {
            const { error } = await supabase.from('projects').update({ status }).match({ id, user_id: Auth.user.id });
            if (error) console.error(error);
        } else {
            const projects = JSON.parse(localStorage.getItem('dotlog_projects') || '[]');
            const index = projects.findIndex(p => p.id == id);
            if (index > -1) {
                projects[index].status = status;
                localStorage.setItem('dotlog_projects', JSON.stringify(projects));
            }
        }
    },

    // --- 도안 상세 (Project Details) 관련 ---
    async getProjectDetails(projectId) {
        if (Auth.user) {
            const { data, error } = await supabase.from('project_details').select('*').eq('project_id', projectId);
            if (error) { console.error(error); return []; }
            return data.map(d => ({ projectId: d.project_id, dmc: d.dmc_code, isOwned: d.is_owned }));
        }
        const allDetails = JSON.parse(localStorage.getItem('dotlog_project_details') || '[]');
        return allDetails.filter(d => d.projectId == projectId);
    },

    async addProjectDetails(projectId, dmcList) {
        if (Auth.user) {
            const newDetails = dmcList.map(dmc => ({ project_id: projectId, dmc_code: dmc }));
            const { error } = await supabase.from('project_details').insert(newDetails);
            if (error) console.error(error);
        } else {
            let allDetails = JSON.parse(localStorage.getItem('dotlog_project_details') || '[]').filter(d => d.projectId != projectId);
            const beads = JSON.parse(localStorage.getItem('dotlog_beads') || '[]');
            const newDetails = dmcList.map(dmc => ({
                projectId: Number(projectId),
                dmc,
                isOwned: beads.some(b => b.id === dmc && b.count > 0)
            }));
            localStorage.setItem('dotlog_project_details', JSON.stringify([...allDetails, ...newDetails]));
        }
    },

    async refreshProjectDetailsOwnership() {
        const beads = await this.getBeads();
        if (Auth.user) {
            // 서버 기반 업데이트 로직은 복잡하므로 호출 시점에 최신화하거나 필요 시 트리거 사용
            // 여기서는 클라이언트 측 계산 결과를 서버에 업데이트하는 대신 조회 시 매칭하도록 함
        } else {
            let allDetails = JSON.parse(localStorage.getItem('dotlog_project_details') || '[]');
            allDetails = allDetails.map(d => ({
                ...d,
                isOwned: beads.some(b => b.id === d.dmc && b.count > 0)
            }));
            localStorage.setItem('dotlog_project_details', JSON.stringify(allDetails));
        }
    }
};

// DB.init();
window.DB = DB;
