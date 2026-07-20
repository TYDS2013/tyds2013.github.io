// =============================================
// 独立编辑器逻辑
// =============================================

let currentPostId = null;
let currentFile = null;
let githubConfig = { token: '', repo: '', branch: 'main' };

function loadConfig() {
    const saved = localStorage.getItem('githubConfig');
    if (saved) {
        try {
            githubConfig = JSON.parse(saved);
        } catch(e) {}
    }
}

async function loadEditor() {
    loadConfig();
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) {
        document.getElementById('editorTitle').textContent = '❌ 缺少文章ID';
        return;
    }
    currentPostId = id;

    // 加载文章元数据，获取文件名
    try {
        const res = await fetch('post/posts.json?' + Date.now());
        const posts = await res.json();
        const post = posts.find(p => p.id == id);
        if (!post) {
            document.getElementById('editorTitle').textContent = '❌ 文章未找到';
            return;
        }
        currentFile = post.file;
        document.getElementById('editorTitle').textContent = `📝 编辑：${post.title}`;
        // 加载 .md 内容
        const mdRes = await fetch(`post/${post.file}`);
        const mdText = await mdRes.text();
        document.getElementById('editorContent').value = mdText;
        updatePreview();
    } catch(e) {
        console.error('加载文章失败', e);
        document.getElementById('editorTitle').textContent = '❌ 加载失败';
    }
}

// 预览更新
function updatePreview() {
    const content = document.getElementById('editorContent').value;
    try {
        document.getElementById('previewArea').innerHTML = marked.parse(content);
    } catch(e) {
        document.getElementById('previewArea').innerHTML = '<span style="color:red;">Markdown 解析错误</span>';
    }
}

// 实时预览
document.addEventListener('input', function(e) {
    if (e.target && e.target.id === 'editorContent') updatePreview();
});

// 保存内容
async function saveEditorContent() {
    const content = document.getElementById('editorContent').value;
    if (!content.trim()) {
        showMsg('editorMsg', '内容不能为空', 'error');
        return;
    }
    if (!githubConfig.token || !githubConfig.repo) {
        showMsg('editorMsg', '请先在后台配置 GitHub Token 和仓库信息', 'error');
        return;
    }

    const btn = document.getElementById('saveEditorBtn');
    btn.disabled = true;
    btn.textContent = '提交中...';
    try {
        await updateFileOnGitHub(`post/${currentFile}`, content, `更新文章内容 ${currentFile}`);
        showMsg('editorMsg', '✅ 保存成功，Pages 将自动重新部署', 'success');
    } catch(err) {
        showMsg('editorMsg', '❌ 保存失败：' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '保存并提交';
    }
}

// GitHub API 更新文件（复用 admin.js 中的函数）
async function updateFileOnGitHub(path, content, commitMsg) {
    if (!githubConfig.token || !githubConfig.repo) {
        throw new Error('请配置 GitHub Token 和仓库信息');
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

function showMsg(elementId, text, type) {
    const el = document.getElementById(elementId);
    el.textContent = text;
    el.className = 'status-msg ' + type;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 检查登录状态（必须有 adminLogged 才能访问编辑器）
    if (!sessionStorage.getItem('adminLogged')) {
        alert('请先登录后台');
        window.location.href = 'admin.html';
        return;
    }
    loadEditor();
});

// 暴露函数给 HTML
window.saveEditorContent = saveEditorContent;