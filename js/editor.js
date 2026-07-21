// =============================================
// 独立编辑器逻辑（含 Typora 风格快捷键）
// =============================================

let currentPostId = null;
let currentFile = null;
let githubConfig = { token: '', repo: '', branch: 'main' };
let sourceMode = false;
let wordWrap = true;

// ----- 配置加载 -----
function loadConfig() {
    const saved = localStorage.getItem('githubConfig');
    if (saved) {
        try {
            githubConfig = JSON.parse(saved);
        } catch(e) {}
    }
}

// ----- 加载文章 -----
async function loadEditor() {
    loadConfig();
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) {
        document.getElementById('editorTitle').textContent = '❌ 缺少文章ID';
        return;
    }
    currentPostId = id;

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
        const mdRes = await fetch(`post/${post.file}`);
        const mdText = await mdRes.text();
        document.getElementById('editorContent').value = mdText;
        updatePreview();
    } catch(e) {
        console.error('加载文章失败', e);
        document.getElementById('editorTitle').textContent = '❌ 加载失败';
    }
}

// ----- 预览更新 -----
function updatePreview() {
    const content = document.getElementById('editorContent').value;
    try {
        document.getElementById('previewArea').innerHTML = marked.parse(content);
    } catch(e) {
        document.getElementById('previewArea').innerHTML = '<span style="color:red;">Markdown 解析错误</span>';
    }
}

// =============================================
// 工具栏插入函数（核心）
// =============================================

/**
 * 在编辑器中插入 Markdown 语法
 * @param {string} prefix - 前缀（如 '**'）
 * @param {string} suffix - 后缀（如 '**'）
 * @param {boolean} lineStart - 是否插入到行首
 */
function insertMarkdown(prefix, suffix, lineStart = false) {
    const textarea = document.getElementById('editorContent');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end);
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);

    let insertText = '';
    if (lineStart) {
        // 获取当前行起始位置
        const lineStartPos = before.lastIndexOf('\n') + 1;
        const lineContent = textarea.value.substring(lineStartPos);
        const newLine = prefix + lineContent;
        textarea.value = before.substring(0, lineStartPos) + newLine + after;
        const newCursor = lineStartPos + prefix.length;
        textarea.selectionStart = textarea.selectionEnd = newCursor;
    } else if (selected) {
        insertText = prefix + selected + suffix;
        textarea.value = before + insertText + after;
        const newCursor = start + insertText.length;
        textarea.selectionStart = textarea.selectionEnd = newCursor;
    } else {
        insertText = prefix + suffix;
        textarea.value = before + insertText + after;
        const newCursor = start + prefix.length;
        textarea.selectionStart = textarea.selectionEnd = newCursor;
    }

    textarea.focus();
    updatePreview();
}

// ----- 插入表格 (Ctrl+T) -----
function insertTable() {
    const textarea = document.getElementById('editorContent');
    if (!textarea) return;

    const table = `
| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 内容 | 内容 | 内容 |
| 内容 | 内容 | 内容 |
`;
    const start = textarea.selectionStart;
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(start);
    textarea.value = before + table + after;
    const newCursor = start + table.length;
    textarea.selectionStart = textarea.selectionEnd = newCursor;
    textarea.focus();
    updatePreview();
}

// ----- 视图切换 -----
function toggleSourceMode() {
    sourceMode = !sourceMode;
    const textarea = document.getElementById('editorContent');
    const preview = document.getElementById('previewArea');
    if (sourceMode) {
        preview.style.display = 'none';
        textarea.style.flex = '2';
    } else {
        preview.style.display = 'block';
        textarea.style.flex = '1';
    }
}

function toggleWordWrap() {
    wordWrap = !wordWrap;
    const textarea = document.getElementById('editorContent');
    textarea.style.whiteSpace = wordWrap ? 'pre-wrap' : 'pre';
    textarea.style.overflowX = wordWrap ? 'auto' : 'scroll';
}

// ----- 实时预览（输入时触发）-----
document.addEventListener('input', function(e) {
    if (e.target && e.target.id === 'editorContent') updatePreview();
});

// =============================================
// 键盘快捷键（Typora 风格）
// =============================================

document.addEventListener('keydown', function(e) {
    const textarea = document.getElementById('editorContent');
    if (document.activeElement !== textarea) return;

    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    const alt = e.altKey;

    // ---- 标题 (Ctrl+1~6) ----
    if (ctrl && !shift && !alt && e.key >= '1' && e.key <= '6') {
        e.preventDefault();
        const level = '#'.repeat(parseInt(e.key));
        insertMarkdown(level + ' ', '', true);
        return;
    }
    // Ctrl+0 清除标题
    if (ctrl && !shift && !alt && e.key === '0') {
        e.preventDefault();
        insertMarkdown('', '', true);
        return;
    }

    // ---- 格式 ----
    if (ctrl && !shift && !alt && e.key === 'b') { e.preventDefault(); insertMarkdown('**', '**'); return; }
    if (ctrl && !shift && !alt && e.key === 'i') { e.preventDefault(); insertMarkdown('*', '*'); return; }
    if (ctrl && !shift && !alt && e.key === 'u') { e.preventDefault(); insertMarkdown('<u>', '</u>'); return; }
    if (ctrl && shift && !alt && e.key === '`') { e.preventDefault(); insertMarkdown('`', '`'); return; }
    if (alt && shift && e.key === '5') { e.preventDefault(); insertMarkdown('~~', '~~'); return; }

    // ---- 列表 ----
    if (ctrl && shift && !alt && e.key === '[') { e.preventDefault(); insertMarkdown('1. ', '', true); return; }
    if (ctrl && shift && !alt && e.key === ']') { e.preventDefault(); insertMarkdown('- ', '', true); return; }
    if (ctrl && shift && !alt && e.key === 'q') { e.preventDefault(); insertMarkdown('> ', '', true); return; }

    // ---- 插入 ----
    if (ctrl && !shift && !alt && e.key === 'k') { e.preventDefault(); insertMarkdown('[', '](url)'); return; }
    if (ctrl && shift && !alt && e.key === 'i') { e.preventDefault(); insertMarkdown('![', '](url)'); return; }
    if (ctrl && shift && !alt && e.key === 'k') { e.preventDefault(); insertMarkdown('```\n', '\n```'); return; }
    if (ctrl && shift && !alt && e.key === 'm') { e.preventDefault(); insertMarkdown('$$\n', '\n$$'); return; }
    if (ctrl && !shift && !alt && e.key === 't') { e.preventDefault(); insertTable(); return; }

    // ---- 视图 ----
    if (ctrl && !shift && !alt && e.key === '/') { e.preventDefault(); toggleSourceMode(); return; }

    // ---- 缩进 (Tab / Shift+Tab) ----
    if (e.key === 'Tab') {
        e.preventDefault();
        if (shift) {
            insertMarkdown('', '', true); // 简单处理：清除行首空格
        } else {
            insertMarkdown('  ', '', true);
        }
        return;
    }
});

// =============================================
// 保存内容（GitHub API）
// =============================================

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
        btn.textContent = '💾 保存并提交';
    }
}

// ----- GitHub API 更新文件 -----
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

// ----- 消息提示 -----
function showMsg(elementId, text, type) {
    const el = document.getElementById(elementId);
    el.textContent = text;
    el.className = 'status-msg ' + type;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// ----- 初始化 -----
document.addEventListener('DOMContentLoaded', function() {
    if (!sessionStorage.getItem('adminLogged')) {
        alert('请先登录后台');
        window.location.href = 'admin.html';
        return;
    }
    loadEditor();
    // 设置初始换行模式
    document.getElementById('editorContent').style.whiteSpace = 'pre-wrap';
});

// 暴露全局函数给 HTML onclick 调用
window.insertMarkdown = insertMarkdown;
window.insertTable = insertTable;
window.toggleSourceMode = toggleSourceMode;
window.toggleWordWrap = toggleWordWrap;
window.saveEditorContent = saveEditorContent;