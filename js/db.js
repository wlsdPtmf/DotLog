// DB.js - Kept compatible, mostly same logic but ensuring function signatures match old UI
const DB = {
    init() {
        if (!localStorage.getItem('dotlog_beads')) localStorage.setItem('dotlog_beads', '[]');
        if (!localStorage.getItem('dotlog_projects')) localStorage.setItem('dotlog_projects', '[]');
        if (!localStorage.getItem('dotlog_project_details')) localStorage.setItem('dotlog_project_details', '[]');
    },

    async getBeads() {
        if (Auth.user) {
            const { data, error } = await supabaseClient.from('inventory').select('*');
            if (error) { console.error(error); return []; }
            return data.map(b => ({ id: b.dmc_code, count: b.count, location: b.location }));
        }
        return JSON.parse(localStorage.getItem('dotlog_beads') || '[]');
    },

    async saveBead(bead) {
        if (Auth.user) {
            const { error } = await supabaseClient.from('inventory').upsert({
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
    },

    async deleteBead(id) {
        if (Auth.user) {
            const { error } = await supabaseClient.from('inventory').delete().match({ user_id: Auth.user.id, dmc_code: id });
            if (error) console.error(error);
        } else {
            const beads = JSON.parse(localStorage.getItem('dotlog_beads') || '[]').filter(b => b.id !== id);
            localStorage.setItem('dotlog_beads', JSON.stringify(beads));
        }
    },

    async getBeadById(id) {
        const beads = await this.getBeads();
        return beads.find(b => b.id === id);
    },

    async getProjects() {
        if (Auth.user) {
            const { data, error } = await supabaseClient.from('projects').select('*').order('created_at', { ascending: false });
            if (error) { console.error(error); return []; }
            return data.map(p => ({
                id: p.id,
                name: p.name,
                brand: p.brand,
                image: p.image_url,
                status: p.status, // '진행' or '완료' (original used korean sometimes, handled by UI)
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
            const { error: uploadError } = await supabaseClient.storage.from('images').upload(fileName, file);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabaseClient.storage.from('images').getPublicUrl(fileName);
            return publicUrl;
        } catch (err) {
            console.error("Upload failed", err);
            return null;
        }
    },

    async addProject(project) {
        let imageUrl = project.image;
        if (Auth.user) {
            if (project.file instanceof File) {
                const uploaded = await this.uploadImage(project.file);
                if (uploaded) imageUrl = uploaded;
            }
            const { data, error } = await supabaseClient.from('projects').insert({
                user_id: Auth.user.id,
                name: project.name,
                brand: project.brand || '',
                image_url: imageUrl,
                status: '진행'
            }).select();
            if (error) { alert("저장 실패: " + error.message); return null; }
            return data[0];
        } else {
            const projects = JSON.parse(localStorage.getItem('dotlog_projects') || '[]');
            project.id = Date.now();
            project.createdAt = new Date().toISOString();
            project.status = '진행'; // Force '진행' for original compatibility
            projects.unshift(project);
            localStorage.setItem('dotlog_projects', JSON.stringify(projects));
            return project;
        }
    },

    async updateProjectStatus(id, status) {
        // Status: '완료' or '진행'
        if (Auth.user) {
            const { error } = await supabaseClient.from('projects').update({ status }).match({ id, user_id: Auth.user.id });
            if (error) console.error(error);
        } else {
            const projects = JSON.parse(localStorage.getItem('dotlog_projects') || '[]');
            const idx = projects.findIndex(p => p.id == id);
            if (idx > -1) {
                projects[idx].status = status;
                localStorage.setItem('dotlog_projects', JSON.stringify(projects));
            }
        }
    },

    async deleteProject(id) {
        if (Auth.user) {
            await supabaseClient.from('projects').delete().match({ id, user_id: Auth.user.id });
        } else {
            const projects = JSON.parse(localStorage.getItem('dotlog_projects') || '[]');
            const filtered = projects.filter(p => p.id != id);
            localStorage.setItem('dotlog_projects', JSON.stringify(filtered));
            // Also delete details
            let allDetails = JSON.parse(localStorage.getItem('dotlog_project_details') || '[]');
            allDetails = allDetails.filter(d => d.projectId != id);
            localStorage.setItem('dotlog_project_details', JSON.stringify(allDetails));
        }
    },

    async getProjectDetails(projectId) {
        if (Auth.user) {
            const { data, error } = await supabaseClient.from('project_details').select('*').eq('project_id', projectId);
            if (error) { console.error(error); return []; }
            return data.map(d => ({ projectId: d.project_id, dmc: d.dmc_code, isOwned: d.is_owned }));
        }
        const allDetails = JSON.parse(localStorage.getItem('dotlog_project_details') || '[]');
        return allDetails.filter(d => d.projectId == projectId);
    },

    async addProjectDetails(projectId, dmcList) {
        // ... (This function wasn't heavily used in the simplified flow but kept for consistency)
        if (Auth.user) {
            const newDetails = dmcList.map(dmc => ({ project_id: projectId, dmc_code: dmc }));
            await supabaseClient.from('project_details').insert(newDetails);
        } else {
            let allDetails = JSON.parse(localStorage.getItem('dotlog_project_details') || '[]');
            const beadList = await this.getBeads();
            const newDetails = dmcList.map(dmc => ({
                projectId: Number(projectId),
                dmc,
                isOwned: beadList.some(b => b.id === dmc && b.count > 0) // Simple local check
            }));
            localStorage.setItem('dotlog_project_details', JSON.stringify([...allDetails, ...newDetails]));
        }
    }
};

window.DB = DB;
