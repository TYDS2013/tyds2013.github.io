// =============================================
// 文章详情逻辑（适配登录系统 + 独立 login.html）
// =============================================

async function loadArticle() {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) {
        document.getElementById('articleTitle').textContent = '无效的文章ID';
        return;
    }
    try {
        const res = await fetch('post/posts.json?' + Date.now());
        const posts = await res.json();
        const post = posts.find(p => p.id == id);
        if (!post) {
            document.getElementById('articleTitle').textContent = '文章未找到';
            return;
        }
        const mdRes = await fetch(`post/${post.file}`);
        const mdText = await mdRes.text();
        const html = marked.parse(mdText);
        document.getElementById('articleTitle').textContent = post.title;
        document.getElementById('articleContent').innerHTML = html;

        let views = JSON.parse(localStorage.getItem('views') || '{}');
        views[id] = (views[id] || 0) + 1;
        localStorage.setItem('views', JSON.stringify(views));

        document.getElementById('articleMeta').innerHTML = `
            <span>${getIcon('date')} ${post.date}</span>
            <span>${getIcon('author')} ${post.author || '博客作者'}</span>
            <span>${getIcon('views')} ${views[id]} 次浏览</span>
        `;
        
        renderComments(id);
        updateCommentForm();
    } catch (e) {
        console.error('加载文章失败', e);
    }
}

function renderComments(articleId) {
    const comments = JSON.parse(localStorage.getItem('comments') || '{}');
    const list = comments[articleId] || [];
    const container = document.getElementById('commentList');
    if (!list.length) {
        container.innerHTML = '<p style="color:var(--text-secondary);">暂无评论，请登录后发表。</p>';
        return;
    }
    container.innerHTML = list.map(c => `
        <div class="comment-item">
            <strong>${c.user}</strong>
            ${c.user === 'TYDS2013' ? '<span style="background:var(--accent); color:#fff; font-size:0.7rem; padding:2px 10px; border-radius:30px; margin-left:8px;">管理员</span>' : ''}
            <span class="time">${c.time}</span>
            <p>${c.text}</p>
        </div>
    `).join('');
}

// 更新评论区表单状态（根据登录状态）
function updateCommentForm() {
    const user = sessionStorage.getItem('loginUser');
    const userInput = document.getElementById('commentUser');
    const textarea = document.getElementById('commentText');
    const submitBtn = document.getElementById('submitComment');

    if (user) {
        // 已登录
        userInput.value = user;
        userInput.disabled = true;
        userInput.style.opacity = '0.7';
        if (submitBtn) submitBtn.disabled = false;
        textarea.placeholder = '写下你的想法...';
    } else {
        // 未登录
        userInput.value = '';
        userInput.disabled = false;
        userInput.placeholder = '请先登录再评论';
        userInput.style.opacity = '1';
        if (submitBtn) submitBtn.disabled = true;
        textarea.placeholder = '登录后即可评论';
    }
}

// 评论提交事件
document.addEventListener('DOMContentLoaded', function() {
    loadArticle();

    const submitBtn = document.getElementById('submitComment');
    if (submitBtn) {
        submitBtn.addEventListener('click', function() {
            const user = sessionStorage.getItem('loginUser');
            if (!user) {
                alert('请先登录再评论');
                // 跳转到登录页，并携带当前文章页作为重定向
                const redirect = window.location.pathname.split('/').pop() + window.location.search;
                window.location.href = `login.html?redirect=${encodeURIComponent(redirect)}`;
                return;
            }

            const textInput = document.getElementById('commentText');
            const text = textInput.value.trim();
            if (!text) {
                alert('请输入评论内容');
                return;
            }

            const id = new URLSearchParams(window.location.search).get('id');
            if (!id) {
                alert('文章ID无效');
                return;
            }

            const comments = JSON.parse(localStorage.getItem('comments') || '{}');
            const articleComments = comments[id] || [];
            // 可选的重复评论限制（取消注释以启用）
            // if (articleComments.some(c => c.user === user)) {
            //     alert('您已评论过，不能重复评论');
            //     return;
            // }
            const now = new Date();
            const timeStr = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0')+' '+String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
            articleComments.push({ user, time: timeStr, text });
            comments[id] = articleComments;
            localStorage.setItem('comments', JSON.stringify(comments));
            renderComments(id);
            textInput.value = '';
            alert('评论发布成功！');
        });
    }
});

// 暴露函数给其他脚本（如果需要）
window.updateCommentForm = updateCommentForm;