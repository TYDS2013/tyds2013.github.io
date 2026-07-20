// =============================================
// 后台管理逻辑（完整版）
// =============================================

// ----- 管理员白名单 -----
const ADMIN_ALLOWLIST = ['TYDS2013'];

// ----- 用户管理工具（与 common.js 共用，提供后备）-----
if (typeof getUsers === 'undefined') {
    window.getUsers = function() {
        const data = localStorage.getItem('users');
        return data ? JSON.parse(data) : {};
    };
    window.saveUsers = function(users) {
        localStorage.setItem('users', JSON.stringify(users));
    };
    window.hashPassword = async function(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };
}

// ----- 初始化默认管理员（仅当无用户时）-----
async function initDefaultUser() {
    const users = getUsers();
    if (Object.keys(users).length === 0) {
        const hashed = await hashPassword('XZC520czq');
        users.TYDS2013 = { hash: hashed, created: Date.now() };
        saveUsers(users);
        console.log('默认管理员已创建: TYDS2013 / XZC520czq');
    }
}

// ----- GitHub 配置 -----
let githubConfig = { token: '', repo: '', branch: 'main' };
let postsData = [];

function loadConfig() {
    const saved = localStorage.getItem('githubConfig');
    if (saved) {
        try {
            githubConfig = JSON.parse(saved);
            document.getElementById('githubToken').value = githubConfig.token || '';
            document.getElementById('repoInfo').value = githubConfig.repo || '';
            document.getElementById('repoBranch').value = githubConfig.branch || 'main';
        } catch(e) {}
    }
}

function saveConfig() {
    const token = document.getElementById('githubToken').value.trim();
    const repo = document.getElementById('repoInfo').value.trim();
    const branch = document.getElementById('repoBranch').value.trim() || 'main';
    if (!token || !repo) {
        showMsg('configMsg', '请填写 Token 和仓库信息', 'error');
        return;
    }
    githubConfig.token = token;
    githubConfig.repo = repo;
    githubConfig.branch = branch;
    localStorage.setItem('githubConfig', JSON.stringify(githubConfig));
    showMsg('configMsg', '配置已保存', 'success');
}

function showMsg(elementId, text, type) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = text;
    el.className = 'status-msg ' + type;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// ----- 后台登录（仅白名单）-----
async function handleAdminLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!ADMIN_ALLOWLIST.includes(username)) {
        showMsg('loginMsg', '您没有权限访问后台', 'error');
        return;
    }
    const users = getUsers();
    if (!users[username]) {
        showMsg('loginMsg', '用户不存在', 'error');
        return;
    }
    const hashedInput = await hashPassword(password);
    if (users[username].hash !== hashedInput) {
        showMsg('loginMsg', '密码错误', 'error');
        return;
    }
    // 登录成功
    sessionStorage.setItem('adminLogged', 'true');
    sessionStorage.setItem('loginUser', username);
    sessionStorage.setItem('isAdmin', 'true');
    document.getElementById('loginArea').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    loadConfig();
    renderUserList();
    updateDashboard();
}

function logoutAdmin() {
    sessionStorage.removeItem('adminLogged');
    sessionStorage.removeItem('loginUser');
    sessionStorage.removeItem('isAdmin');
    document.getElementById('loginArea').style.display = 'block';
    document.getElementById('dashboard').style.display = 'none';
}

// ----- 用户管理（仅管理员可见）-----
function renderUserList() {
    const users = getUsers();
    const container = document.getElementById('userList');
    if (!container) return;
    if (Object.keys(users).length === 0) {
        container.innerHTML = '<p>暂无用户</p>';
        return;
    }
    container.innerHTML = Object.entries(users).map(([username, data]) => `
        <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border-color);">
            <span><strong>${username}</strong> (创建于 ${new Date(data.created).toLocaleDateString()})</span>
            ${username !== 'TYDS2013' ? `<button class="btn btn-danger" onclick="deleteUser('${username}')" style="padding:2px 12px; font-size:0.8rem;">删除</button>` : '<span style="color:var(--text-secondary);font-size:0.8rem;">默认管理员</span>'}
        </div>
    `).join('');
}

async function addUser() {
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value.trim();
    if (!username || !password) {
        showMsg('userMsg', '请填写用户名和密码', 'error');
        return;
    }
    if (username.length < 3 || password.length < 6) {
        showMsg('userMsg', '用户名至少3字符，密码至少6字符', 'error');
        return;
    }
    const users = getUsers();
    if (users[username]) {
        showMsg('userMsg', '用户名已存在', 'error');
        return;
    }
    const hashed = await hashPassword(password);
    users[username] = { hash: hashed, created: Date.now() };
    saveUsers(users);
    document.getElementById('newUsername').value = '';
    document.getElementById('newPassword').value = '';
    renderUserList();
    showMsg('userMsg', '用户添加成功', 'success');
}

function deleteUser(username) {
    if (username === 'TYDS2013') {
        showMsg('userMsg', '不能删除默认管理员', 'error');
        return;
    }
    if (!confirm(`确定要删除用户 "${username}" 吗？`)) return;
    const users = getUsers();
    delete users[username];
    saveUsers(users);
    renderUserList();
    showMsg('userMsg', '用户已删除', 'success');
}

// ----- 仪表盘更新（最近3篇文章 + 文章管理）-----
async function updateDashboard() {
    try {
        const res = await fetch('post/posts.json?' + Date.now());
        postsData = await res.json();
        const views = JSON.parse(localStorage.getItem('views') || '{}');

        // ---- 数据概览：最近3篇文章 ----
        const sorted = [...postsData].sort((a, b) => new Date(b.date) - new Date(a.date));
        const recent = sorted.slice(0, 3);
        const container = document.getElementById('recentPosts');
        if (!recent.length) {
            container.innerHTML = '<p>暂无文章</p>';
        } else {
            container.innerHTML = recent.map(p => `
                <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border-color);">
                    <span><strong>${p.title}</strong> (${p.date})</span>
                    <span>👁️ ${views[p.id] || 0} 次浏览</span>
                </div>
            `).join('');
        }

        // ---- 文章管理列表 ----
        renderPostList();
    } catch(e) {
        console.error('更新仪表盘失败', e);
        document.getElementById('adminPostList').innerHTML = '<p>加载失败</p>';
    }
}

function renderPostList() {
    const list = document.getElementById('adminPostList');
    if (!postsData.length) {
        list.innerHTML = '<p>暂无文章</p>';
        return;
    }
    list.innerHTML = postsData.map(p => `
        <div class="post-item-admin">
            <span><strong>${p.title}</strong> (${p.date})</span>
            <div class="actions">
                <a href="editor.html?id=${p.id}" class="btn btn-secondary" style="display:inline-block; padding:2px 14px; border-radius:30px; text-decoration:none;">编辑</a>
                <button class="btn btn-danger" onclick="deletePost(${p.id})">删除</button>
            </div>
        </div>
    `).join('');
}

// ----- 新建文章（跳转编辑器）-----
async function createAndEdit() {
    const title = document.getElementById('newTitle').value.trim();
    const date = document.getElementById('newDate').value.trim() || new Date().toISOString().slice(0,10);
    const category = document.getElementById('newCategory').value;

    if (!title) {
        showMsg('newPostMsg', '请填写标题', 'error');
        return;
    }

    const adminUser = sessionStorage.getItem('loginUser') || '管理员';
    const maxId = postsData.reduce((max, p) => Math.max(max, p.id), 0);
    const newId = maxId + 1;
    const file = newId + '.md';

    const newPost = {
        id: newId,
        title,
        date,
        category: category || 'uncategorized',
        excerpt: '',
        tags: [],
        file,
        author: adminUser
    };

    postsData.push(newPost);
    const jsonContent = JSON.stringify(postsData, null, 4);

    try {
        await updateFileOnGitHub('post/posts.json', jsonContent, `新建文章: ${title}`);
        await updateFileOnGitHub(`post/${file}`, '# ' + title + '\n\n开始书写...', `初始化文章 ${title}`);
        window.location.href = `editor.html?id=${newId}`;
    } catch(err) {
        showMsg('newPostMsg', '创建失败：' + err.message, 'error');
    }
}

// ----- 新建标签（添加到下拉框）-----
function addNewTag() {
    const input = document.getElementById('newTagInput');
    const tag = input.value.trim();
    if (!tag) return;
    const select = document.getElementById('newCategory');
    for (let opt of select.options) {
        if (opt.value === tag) {
            alert('标签已存在');
            return;
        }
    }
    const option = document.createElement('option');
    option.value = tag;
    option.textContent = tag;
    select.appendChild(option);
    select.value = tag;
    input.value = '';
}

// ----- 删除文章 -----
async function deletePost(id) {
    if (!confirm('确定要删除这篇文章吗？')) return;
    const post = postsData.find(p => p.id === id);
    if (!post) return;
    const index = postsData.indexOf(post);
    postsData.splice(index, 1);
    const jsonContent = JSON.stringify(postsData, null, 4);
    try {
        await updateFileOnGitHub('post/posts.json', jsonContent, `删除文章 ${post.title}`);
        try {
            await updateFileOnGitHub(`post/${post.file}`, '', `删除文章内容 ${post.title}`);
        } catch(e) {}
        await updateDashboard();
        alert('文章已删除');
    } catch(err) {
        alert('删除失败：' + err.message);
    }
}

// ----- GitHub API 辅助 -----
async function updateFileOnGitHub(path, content, commitMsg) {
    if (!githubConfig.token || !githubConfig.repo) {
        throw new Error('请先在后台配置 GitHub Token 和仓库信息');
    }
    const url = `https://api.github.com/repos/${githubConfig.repo}/contents/${path}`;
    let sha = null;
    try {
        const getRes = await fetch(url, {
            headers: {
                'Authorization': `token ${githubConfig.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        if (getRes.ok) {
            const data = await getRes.json();
            sha = data.sha;
        } else if (getRes.status !== 404) {
            const err = await getRes.json();
            throw new Error(err.message || '获取文件信息失败');
        }
    } catch(e) {
        if (!e.message.includes('404')) throw e;
    }

    const payload = {
        message: commitMsg || 'Update file via API',
        content: btoa(unescape(encodeURIComponent(content))),
        branch: githubConfig.branch
    };
    if (sha) payload.sha = sha;

    const putRes = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${githubConfig.token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify(payload)
    });
    if (!putRes.ok) {
        const err = await putRes.json();
        throw new Error(err.message || '更新文件失败');
    }
    return await putRes.json();
}

// ----- 初始化 -----
document.addEventListener('DOMContentLoaded', async function() {
    await initDefaultUser();

    if (sessionStorage.getItem('adminLogged') === 'true') {
        document.getElementById('loginArea').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        loadConfig();
        renderUserList();
        updateDashboard();
    }

    const loginBtn = document.getElementById('adminLoginBtn');
    if (loginBtn) loginBtn.addEventListener('click', handleAdminLogin);
});

// 暴露全局函数
window.handleAdminLogin = handleAdminLogin;
window.logoutAdmin = logoutAdmin;
window.addUser = addUser;
window.deleteUser = deleteUser;
window.saveConfig = saveConfig;
window.createAndEdit = createAndEdit;
window.addNewTag = addNewTag;
window.deletePost = deletePost;