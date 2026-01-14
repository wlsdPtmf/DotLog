const DB = {
    // DB 초기화
    init() {
        if (!localStorage.getItem('dotlog_beads')) localStorage.setItem('dotlog_beads', '[]');
        if (!localStorage.getItem('dotlog_projects')) localStorage.setItem('dotlog_projects', '[]');
    },

    // --- 도안 (Projects) 관련 ---
    async getProjects() {
        if (Auth.user) {
            const { data, error } = await supabaseClient
                .from('projects')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) { console.error(error); return []; }

            return data.map(p => ({
                id: p.id,
                name: p.name,
                brand: p.brand, // Optional
                image: p.image_url,
                status: p.status, // 'ongoing' | 'completed'
                createdAt: p.created_at,
                completedAt: p.completed_at || null,
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
        // project: { name, status, image(base64/url), file(File object) }
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
                status: project.status || 'ongoing',
                completed_at: project.status === 'completed' ? new Date().toISOString() : null
            }).select();

            if (error) {
                alert("저장 실패: " + error.message);
                return null;
            }
            return data[0];
        } else {
            // Guest Mode (Local Storage)
            const projects = JSON.parse(localStorage.getItem('dotlog_projects') || '[]');
            const newProject = {
                id: Date.now(),
                name: project.name,
                brand: project.brand || '',
                image: imageUrl, // Base64 stored for guest
                status: project.status || 'ongoing',
                createdAt: new Date().toISOString(),
                completedAt: project.status === 'completed' ? new Date().toISOString() : null,
                userId: 'guest'
            };
            projects.unshift(newProject); // Add to top
            localStorage.setItem('dotlog_projects', JSON.stringify(projects));
            return newProject;
        }
    },

    async updateProjectStatus(id, status) {
        const completedAt = status === 'completed' ? new Date().toISOString() : null;

        if (Auth.user) {
            const { error } = await supabaseClient
                .from('projects')
                .update({ status: status, completed_at: completedAt })
                .eq('id', id)
                .eq('user_id', Auth.user.id);
            if (error) console.error(error);
        } else {
            const projects = JSON.parse(localStorage.getItem('dotlog_projects') || '[]');
            const idx = projects.findIndex(p => p.id == id);
            if (idx > -1) {
                projects[idx].status = status;
                if (status === 'completed') projects[idx].completedAt = completedAt;
                localStorage.setItem('dotlog_projects', JSON.stringify(projects));
            }
        }
    },

    async deleteProject(id) {
        if (Auth.user) {
            await supabaseClient.from('projects').delete().eq('id', id).eq('user_id', Auth.user.id);
        } else {
            const projects = JSON.parse(localStorage.getItem('dotlog_projects') || '[]');
            const filtered = projects.filter(p => p.id != id);
            localStorage.setItem('dotlog_projects', JSON.stringify(filtered));
        }
    }
};

window.DB = DB;
