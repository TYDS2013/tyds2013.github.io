// =============================================
// 后台管理逻辑
// =============================================

const ADMIN_CRED = { user: 'admin', pass: '123456' };
let githubConfig = { token: '', repo: '', branch: 'main' };
let postsData = [];

// ----- 配置加载 -----
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
    el.textContent = text;
    el.className = 'status-msg ' + type;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// ----- 登录/退出 -----
function adminLogin() {
    const user = document.getElementById('adminUser').value;
    const pass = document.getElementById('adminPass').value;
    if (user === ADMIN_CRED.user && pass === ADMIN_CRED.pass) {
        sessionStorage.setItem('adminLogged', 'true');
        document.getElementById('loginArea').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        loadConfig();
        updateDashboard();
    } else {
        showMsg('loginMsg', '账户或密码错误', 'error');
    }
}

function logoutAdmin() {
    sessionStorage.removeItem('adminLogged');
    document.getElementById('loginArea').style.display = 'block';
    document.getElementById('dashboard').style.display = 'none';
}

// ----- 仪表盘更新 -----
async function updateDashboard() {
    try {
        const res = await fetch('post/posts.json?' + Date.now());
        postsData = await res.json();
        const views = JSON.parse(localStorage.getItem('views') || '{}');
        let totalViews = 0;
        for (let k in views) totalViews += views[k];
        document.getElementById('viewCount').textContent = totalViews;
        document.getElementById('postCount').textContent = postsData.length;

        const comments = JSON.parse(localStorage.getItem('comments') || '{}');
        let allComments = [];
        for (let k in comments) {
            comments[k].forEach(c => allComments.push({ ...c, articleId: k }));
        }
        const container = document.getElementById('adminComments');
        if (!allComments.length) {
            container.innerHTML = '<p>暂无评论</p>';
        } else {
            container.innerHTML = allComments.map(c => `
                <div style="border-bottom:1px solid var(--border-color); padding:6px 0;">
                    <strong>${c.user}</strong> (文章 ${c.articleId})：${c.text}
                    <span style="color:var(--text-secondary);font-size:0.8rem;">${c.time}</span>
                </div>
            `).join('');
        }
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
                <button class="btn btn-secondary" onclick="openEditor(${p.id})">编辑</button>
                <button class="btn btn-danger" onclick="deletePost(${p.id})">删除</button>
            </div>
        </div>
    `).join('');
}

// ----- 编辑器（新建/编辑）-----
function openEditor(id) {
    const modal = document.getElementById('editorModal');
    modal.classList.add('open');
    document.getElementById('editorMsg').style.display = 'none';
    if (id) {
        const post = postsData.find(p => p.id === id);
        if (!post) return;
        document.getElementById('editorTitle').textContent = '编辑文章';
        document.getElementById('editId').value = id;
        document.getElementById('editTitle').value = post.title;
        document.getElementById('editDate').value = post.date;
        document.getElementById('editCategory').value = post.category;
        document.getElementById('editTags').value = post.tags.join(', ');
        document.getElementById('editExcerpt').value = post.excerpt;
        fetch(`post/${post.file}`)
            .then(res => res.text())
            .then(md => {
                document.getElementById('editContent').value = md;
                updatePreview();
            })
            .catch(() => {
                document.getElementById('editContent').value = '# 加载失败';
                updatePreview();
            });
    } else {
        document.getElementById('editorTitle').textContent = '新建文章';
        document.getElementById('editId').value = '';
        document.getElementById('editTitle').value = '';
        document.getElementById('editDate').value = new Date().toISOString().slice(0,10);
        document.getElementById('editCategory').value = '';
        document.getElementById('editTags').value = '';
        document.getElementById('editExcerpt').value = '';
        document.getElementById('editContent').value = '# 新文章\n\n开始书写...';
        updatePreview();
    }
}

function closeEditor() {
    document.getElementById('editorModal').classList.remove('open');
}

// 预览
document.getElementById('editContent').addEventListener('input', updatePreview);
function updatePreview() {
    const content = document.getElementById('editContent').value;
    try {
        document.getElementById('previewArea').innerHTML = marked.parse(content);
    } catch(e) {
        document.getElementById('previewArea').innerHTML = '<span style="color:red;">Markdown 解析错误</span>';
    }
}

// ----- 保存文章（GitHub API）-----
async function savePost() {
    const btn = document.getElementById('savePostBtn');
    btn.disabled = true;
    btn.textContent = '提交中...';
    document.getElementById('editorMsg').style.display = 'none';

    const id = document.getElementById('editId').value.trim();
    const title = document.getElementById('editTitle').value.trim();
    const date = document.getElementById('editDate').value.trim();
    const category = document.getElementById('editCategory').value.trim();
    const tags = document.getElementById('editTags').value.split(',').map(s => s.trim()).filter(Boolean);
    const excerpt = document.getElementById('editExcerpt').value.trim();
    const content = document.getElementById('editContent').value;

    if (!title || !content) {
        showMsg('editorMsg', '标题和正文不能为空', 'error');
        btn.disabled = false;
        btn.textContent = '保存并提交到 GitHub';
        return;
    }

    let isNew = false;
    let postId = id ? parseInt(id) : 0;
    let file = '';
    if (id) {
        const existing = postsData.find(p => p.id == id);
        if (existing) file = existing.file;
    }
    if (!file) {
        const maxId = postsData.reduce((max, p) => Math.max(max, p.id), 0);
        postId = maxId + 1;
        file = postId + '.md';
        isNew = true;
    }

    const newPost = {
        id: postId,
        title,
        date: date || new Date().toISOString().slice(0,10),
        category: category || 'uncategorized',
        excerpt: excerpt || '',
        tags: tags.length ? tags : ['未分类'],
        file,
        author: '博客作者' // 可扩展为表单字段
    };

    let postsJsonContent = null;
    if (isNew) {
        postsData.push(newPost);
        postsJsonContent = JSON.stringify(postsData, null, 4);
    } else {
        const index = postsData.findIndex(p => p.id == id);
        if (index !== -1) {
            postsData[index] = newPost;
            postsJsonContent = JSON.stringify(postsData, null, 4);
        } else {
            showMsg('editorMsg', '文章不存在', 'error');
            btn.disabled = false;
            btn.textContent = '保存并提交到 GitHub';
            return;
        }
    }

    try {
        await updateFileOnGitHub('post/posts.json', postsJsonContent, '更新文章元数据');
        await updateFileOnGitHub(`post/${file}`, content, `更新文章 ${title}`);
        await updateDashboard();
        closeEditor();
        showMsg('editorMsg', '文章已成功提交到 GitHub，Pages 将自动重新部署', 'success');
    } catch(err) {
        showMsg('editorMsg', '提交失败：' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '保存并提交到 GitHub';
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

// ----- 工具栏插入 -----
function insertMarkdown(prefix, suffix, wrapLine = false) {
    const textarea = document.getElementById('editContent');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end);
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);
    let insertText = '';
    if (wrapLine) {
        // 简单行首插入，不做复杂处理
        insertText = prefix + selected + suffix;
    } else {
        insertText = selected ? prefix + selected + suffix : prefix + suffix;
    }
    textarea.value = before + insertText + after;
    const newCursor = start + insertText.length;
    textarea.selectionStart = textarea.selectionEnd = newCursor;
    textarea.focus();
    updatePreview();
}

// ----- 键盘快捷键 -----
document.addEventListener('keydown', function(e) {
    const modal = document.getElementById('editorModal');
    const textarea = document.getElementById('editContent');
    if (!modal || !modal.classList.contains('open')) return;
    if (document.activeElement !== textarea) return;
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;

    if (ctrl && e.key === 'b') { e.preventDefault(); insertMarkdown('**', '**'); return; }
    if (ctrl && e.key === 'i') { e.preventDefault(); insertMarkdown('*', '*'); return; }
    if (ctrl && shift && e.key === '1') { e.preventDefault(); insertMarkdown('# ', '', true); return; }
    if (ctrl && shift && e.key === '2') { e.preventDefault(); insertMarkdown('## ', '', true); return; }
    if (ctrl && shift && e.key === '3') { e.preventDefault(); insertMarkdown('### ', '', true); return; }
    if (ctrl && e.key === 'u') { e.preventDefault(); insertMarkdown('- ', '', true); return; }
    if (ctrl && shift && e.key === 'o') { e.preventDefault(); insertMarkdown('1. ', '', true); return; }
    if (ctrl && shift && e.key === 'c') { e.preventDefault(); insertMarkdown('```\n', '\n```'); return; }
    if (ctrl && shift && e.key === 'q') { e.preventDefault(); insertMarkdown('> ', '', true); return; }
});

// ----- 初始化登录状态 -----
document.addEventListener('DOMContentLoaded', function() {
    if (sessionStorage.getItem('adminLogged') === 'true') {
        document.getElementById('loginArea').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        loadConfig();
        updateDashboard();
    }
});

// 暴露全局函数
window.adminLogin = adminLogin;
window.logoutAdmin = logoutAdmin;
window.openEditor = openEditor;
window.closeEditor = closeEditor;
window.savePost = savePost;
window.deletePost = deletePost;
window.saveConfig = saveConfig;
window.insertMarkdown = insertMarkdown;