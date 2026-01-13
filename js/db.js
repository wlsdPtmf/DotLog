const DB = {
    // Initial Data - Empty for clean start
    defaults: {
        beads: [],
        projects: [],
        projectDetails: []
    },

    init() {
        // ALWAYS WIPE STORAGE ON INIT as requested by user ("새로고침 할 때마다 사라지게")
        // Note: For a real app we would check version, but user explicitly asked for this.
        localStorage.removeItem('dotlog_beads');
        localStorage.removeItem('dotlog_projects');
        localStorage.removeItem('dotlog_project_details');

        localStorage.setItem('dotlog_beads', JSON.stringify(this.defaults.beads));
        localStorage.setItem('dotlog_projects', JSON.stringify(this.defaults.projects));
        localStorage.setItem('dotlog_project_details', JSON.stringify(this.defaults.projectDetails));
    },

    // BEADS
    getBeads() {
        return JSON.parse(localStorage.getItem('dotlog_beads') || '[]');
    },
    saveBead(bead) {
        try {
            const beads = this.getBeads();
            const index = beads.findIndex(b => b.id === bead.id);
            if (index > -1) {
                beads[index] = bead;
            } else {
                beads.push(bead);
            }
            localStorage.setItem('dotlog_beads', JSON.stringify(beads));
            this.refreshProjectDetailsOwnership();
        } catch (e) {
            console.error("Storage Error:", e);
            alert("저장 공간이 부족합니다. 이미지가 너무 크거나 데이터가 많습니다.");
        }
    },
    deleteBead(id) {
        const beads = this.getBeads().filter(b => b.id !== id);
        localStorage.setItem('dotlog_beads', JSON.stringify(beads));
        this.refreshProjectDetailsOwnership();
    },
    getBeadById(id) {
        return this.getBeads().find(b => b.id === id);
    },

    // PROJECTS
    getProjects() {
        return JSON.parse(localStorage.getItem('dotlog_projects') || '[]');
    },
    addProject(project) {
        try {
            const projects = this.getProjects();
            project.id = Date.now();
            project.createdAt = new Date().toISOString();
            projects.push(project);
            localStorage.setItem('dotlog_projects', JSON.stringify(projects));
            return project;
        } catch (e) {
            console.error("Storage Error:", e);
            alert("도안 등록 실패: 이미지가 너무 큽니다. 더 작은 용량의 사진을 사용해주세요.");
            return null;
        }
    },
    deleteProject(id) {
        const projects = this.getProjects().filter(p => p.id != id);
        localStorage.setItem('dotlog_projects', JSON.stringify(projects));
        // Also delete details
        const allDetails = JSON.parse(localStorage.getItem('dotlog_project_details') || '[]');
        const filteredDetails = allDetails.filter(d => d.projectId != id);
        localStorage.setItem('dotlog_project_details', JSON.stringify(filteredDetails));
    },
    updateProjectStatus(id, status) {
        const projects = this.getProjects();
        const index = projects.findIndex(p => p.id == id);
        if (index > -1) {
            projects[index].status = status;
            localStorage.setItem('dotlog_projects', JSON.stringify(projects));
        }
    },

    removeProjectBeadsFromInventory(projectId) {
        const details = this.getProjectDetails(projectId);
        const beadIdsToRemove = details.map(d => d.dmc);

        let beads = this.getBeads();
        beads = beads.filter(b => !beadIdsToRemove.includes(b.id));

        localStorage.setItem('dotlog_beads', JSON.stringify(beads));
        this.refreshProjectDetailsOwnership();
    },

    removeSpecificBeadsFromInventory(dmcList) {
        let beads = this.getBeads();
        beads = beads.filter(b => !dmcList.includes(b.id));
        localStorage.setItem('dotlog_beads', JSON.stringify(beads));
        this.refreshProjectDetailsOwnership();
    },

    // PROJECT DETAILS
    getProjectDetails(projectId) {
        const allDetails = JSON.parse(localStorage.getItem('dotlog_project_details') || '[]');
        return allDetails.filter(d => d.projectId == projectId);
    },
    addProjectDetails(projectId, dmcList) {
        try {
            let allDetails = JSON.parse(localStorage.getItem('dotlog_project_details') || '[]');
            const beads = this.getBeads();

            allDetails = allDetails.filter(d => d.projectId != projectId);

            const newDetails = dmcList.map(dmc => ({
                projectId: Number(projectId),
                dmc,
                isOwned: beads.some(b => b.id === dmc && b.count > 0)
            }));

            localStorage.setItem('dotlog_project_details', JSON.stringify([...allDetails, ...newDetails]));
        } catch (e) {
            alert("데이터가 너무 많아 저장할 수 없습니다.");
        }
    },
    refreshProjectDetailsOwnership() {
        const beads = this.getBeads();
        let allDetails = JSON.parse(localStorage.getItem('dotlog_project_details') || '[]');

        allDetails = allDetails.map(d => ({
            ...d,
            isOwned: beads.some(b => b.id === d.dmc && b.count > 0)
        }));

        localStorage.setItem('dotlog_project_details', JSON.stringify(allDetails));
    }
};

DB.init();
window.DB = DB;
