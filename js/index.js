// 主页：加载最新4篇文章
let posts = [];

async function loadPosts() {
    try {
        const res = await fetch('post/posts.json?' + Date.now());
        posts = await res.json();
        if (!localStorage.getItem('views')) {
            const views = {};
            posts.forEach(p => views[p.id] = 0);
            localStorage.setItem('views', JSON.stringify(views));
        }
        const sorted = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
        const latest = sorted.slice(0, 4);
        renderPosts(latest);
    } catch(e) {
        console.error('加载文章失败', e);
        document.getElementById('postGrid').innerHTML = '<p>加载失败</p>';
    }
}

function renderPosts(postsToShow) {
    const grid = document.getElementById('postGrid');
    if (!postsToShow.length) {
        grid.innerHTML = '<p>暂无文章</p>';
        return;
    }
    const views = JSON.parse(localStorage.getItem('views') || '{}');
    grid.innerHTML = postsToShow.map(p => `
        <div class="post-card">
            <h3><a href="article.html?id=${p.id}">${p.title}</a></h3>
            <div class="meta">
                <span>📅 ${p.date}</span>
                <span>✍️ ${p.author || '博客作者'}</span>
                <span>👁️ ${views[p.id] || 0}</span>
            </div>
            <div class="excerpt">${p.excerpt}</div>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', loadPosts);