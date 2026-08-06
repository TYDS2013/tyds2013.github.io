// =============================================
// 公共功能：时钟、主题、轮播、返回顶部、导航高亮、登录状态
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    // ----- 1. 实时时钟 -----
    function updateClock() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        const wd = weekdays[now.getDay()];
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const clockEl = document.getElementById('clock');
        if (clockEl) {
            clockEl.textContent = `${year}-${month}-${day}  星期${wd}  ${hours}:${minutes}:${seconds}`;
        }
    }
    updateClock();
    setInterval(updateClock, 1000);

    // ----- 2. 亮/暗主题（拨动开关）-----
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let currentTheme = localStorage.getItem('theme') || (prefersDark ? 'dark' : 'light');

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        const checkbox = document.getElementById('themeToggleCheckbox');
        if (checkbox) {
            checkbox.checked = (theme === 'dark');
        }
    }

    applyTheme(currentTheme);

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });

    document.addEventListener('change', function(e) {
        if (e.target && e.target.id === 'themeToggleCheckbox') {
            applyTheme(e.target.checked ? 'dark' : 'light');
        }
    });

// ----- 3. 轮播图 -----
const slides = document.querySelectorAll('.carousel-slide');
const dots = document.querySelectorAll('.carousel-dots span');
let currentSlide = 0;
let intervalId = null;

function showSlide(index) {
    const total = slides.length;
    if (total === 0) return;
    index = ((index % total) + total) % total;
    
    slides.forEach((s, i) => {
        s.classList.toggle('active', i === index);
        // 对于当前 slide，确保图片加载（如果之前未加载）
        if (i === index) {
            const img = s.querySelector('img');
            if (img && img.dataset.src && !img.src) {
                img.src = img.dataset.src;
            }
        }
    });
    dots.forEach((d, i) => d.classList.toggle('active', i === index));
    currentSlide = index;
}

function nextSlide() {
    showSlide(currentSlide + 1);
}

function prevSlide() {
    showSlide(currentSlide - 1);
}

function startAutoPlay() {
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(nextSlide, 5000);
}

function stopAutoPlay() {
    clearInterval(intervalId);
    intervalId = null;
}

// 初始化
if (slides.length > 0) {
    showSlide(0);
    startAutoPlay();

    dots.forEach((dot, i) => {
        dot.addEventListener('click', () => {
            stopAutoPlay();
            showSlide(i);
            startAutoPlay();
        });
    });

    // 使用 ID 或更精确的选择器
    const leftArrow = document.getElementById('prevBtn') || document.querySelector('.carousel-arrow.left');
    const rightArrow = document.getElementById('nextBtn') || document.querySelector('.carousel-arrow.right');
    if (leftArrow) {
        leftArrow.addEventListener('click', () => {
            stopAutoPlay();
            prevSlide();   // 左箭头显示上一张
            startAutoPlay();
        });
    }
    if (rightArrow) {
        rightArrow.addEventListener('click', () => {
            stopAutoPlay();
            nextSlide();   // 右箭头显示下一张
            startAutoPlay();
        });
    }
}

// 暴露全局函数（供其他脚本调用，但不再依赖 onclick）
window.prevSlide = prevSlide;
window.nextSlide = nextSlide;

    // ----- 4. 返回顶部 -----
    const backTop = document.getElementById('backTop');
    if (backTop) {
        window.addEventListener('scroll', () => {
            backTop.classList.toggle('show', window.scrollY > 300);
        });
        backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }

    // ----- 5. 导航高亮 -----
    const navLinks = document.querySelectorAll('.top-nav a');
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath || (currentPath === '' && href === 'index.html')) {
            link.classList.add('active');
        }
    });

    // ----- 6. 登录状态 UI 更新 -----
    updateLoginUI();
});

// =============================================
// 用户管理工具（全局可用）
// =============================================
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

// =============================================
// 导航栏登录状态显示
// =============================================
function updateLoginUI() {
    const loginNav = document.getElementById('loginNav');
    if (!loginNav) return;
    const user = sessionStorage.getItem('loginUser');
    if (user) {
        loginNav.innerHTML = `
            <span style="color:var(--text-secondary); margin-right:12px;">${getIcon('user')} ${user}</span>
            <button onclick="logoutUser()" style="background:transparent; border:1px solid var(--border-color); border-radius:30px; padding:4px 14px; cursor:pointer; color:var(--text-secondary);">退出</button>
        `;
    } else {
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        loginNav.innerHTML = `
            <a href="login.html?redirect=${encodeURIComponent(currentPath)}" style="background:var(--accent); border:none; border-radius:30px; padding:4px 18px; cursor:pointer; color:#fff; font-weight:500; text-decoration:none;">登录</a>
        `;
    }
}

function logoutUser() {
    sessionStorage.removeItem('loginUser');
    sessionStorage.removeItem('isAdmin');
    updateLoginUI();
    location.reload();
}

window.updateLoginUI = updateLoginUI;
window.logoutUser = logoutUser;

// =============================================
// 加载动画控制（至少显示 1.5 秒，防闪烁）
// =============================================

const MIN_LOADER_DISPLAY = 1500; // 最小显示时间（毫秒），可自行调整
let loaderStartTime = null;
let loaderHidden = false;

function hideLoader() {
    if (loaderHidden) return;
    const loader = document.getElementById('loader');
    if (!loader) return;

    const elapsed = Date.now() - loaderStartTime;
    const remain = MIN_LOADER_DISPLAY - elapsed;

    if (remain > 0) {
        // 未达到最小显示时间，延迟隐藏
        setTimeout(() => {
            loader.classList.add('hidden');
            setTimeout(() => {
                loader.style.display = 'none';
            }, 400); // 与 CSS transition 时间匹配
            loaderHidden = true;
        }, remain);
    } else {
        // 已达标，直接隐藏
        loader.classList.add('hidden');
        setTimeout(() => {
            loader.style.display = 'none';
        }, 400);
        loaderHidden = true;
    }
}

// 检查是否在当前会话中已加载过
if (!sessionStorage.getItem('loaderShown')) {
    // 首次加载（新会话），显示动画
    const loader = document.getElementById('loader');
    if (loader) {
        loader.style.display = 'flex';
        loader.style.opacity = '1';
        loader.classList.remove('hidden');
        loaderStartTime = Date.now();
    }
    sessionStorage.setItem('loaderShown', 'true');

    // DOM 就绪后尝试隐藏（但会等待最小时间）
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            hideLoader();
        });
    } else {
        hideLoader();
    }

    // 后备：load 事件触发时确保隐藏
    window.addEventListener('load', function() {
        hideLoader();
    });
} else {
    // 非首次加载（切换页面、刷新），直接隐藏动画
    const loader = document.getElementById('loader');
    if (loader) {
        loader.style.display = 'none';
        loader.classList.add('hidden');
    }
}

// =============================================
// 图标管理（SVG）
// =============================================
function getIcon(name) {
    const icons = {
        date: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z"/><rect x="4" y="5" width="16" height="16" rx="2" /><line x1="16" y1="3" x2="16" y2="7" /><line x1="8" y1="3" x2="8" y2="7" /><line x1="4" y1="11" x2="20" y2="11" /></svg>`,
        author: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z"/><circle cx="12" cy="7" r="4" /><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" /></svg>`,
        views: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z"/><path d="M12 7c-3.6 0-6.6 2-9 5 2.4 3 5.4 5 9 5s6.6-2 9-5c-2.4-3-5.4-5-9-5z" /><circle cx="12" cy="12" r="2" /></svg>`,
        clock: `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-clock" width="20" height="20" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z"/><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 15" /></svg>`,
        chat: `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-messages" width="20" height="20" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z"/><path d="M21 14l-3 -3h-7a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1h9a1 1 0 0 1 1 1v10" /><path d="M14 15v2a1 1 0 0 1 -1 1h-7l-3 3v-10a1 1 0 0 1 1 -1h2" /></svg>`,
        user: `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-user" width="18" height="18" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z"/><circle cx="12" cy="7" r="4" /><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" /></svg>`,
        copyright: `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-copyright" width="18" height="18" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z"/><circle cx="12" cy="12" r="9" /><path d="M14.5 9a3.5 4 0 1 0 0 6" /></svg>`
    };
    return icons[name] || '';
}
window.getIcon = getIcon; // 暴露到全局



// =============================================
// 数据同步（GitHub API）—— 仅当管理员配置 Token 后启用
// =============================================

const DATA_FILE_PATH = 'data/site-data.json';

const dataSync = {
    config: null,          // { token, repo, branch }
    sha: null,             // 当前文件的 SHA
    changes: new Set(),    // 待同步的数据类型（'views','comments','likes','favorites'）
    timeout: null,         // 延迟提交定时器
    updating: false,       // 是否正在提交
    retryCount: 0,
    maxRetries: 3,
};

// ----- 本地数据读写 -----
function getLocalData() {
    return {
        views: JSON.parse(localStorage.getItem('views') || '{}'),
        comments: JSON.parse(localStorage.getItem('comments') || '{}'),
        likes: JSON.parse(localStorage.getItem('likes') || '{}'),
        favorites: JSON.parse(localStorage.getItem('favorites') || '{}'),
    };
}

function saveLocalData(data) {
    if (data.views) localStorage.setItem('views', JSON.stringify(data.views));
    if (data.comments) localStorage.setItem('comments', JSON.stringify(data.comments));
    if (data.likes) localStorage.setItem('likes', JSON.stringify(data.likes));
    if (data.favorites) localStorage.setItem('favorites', JSON.stringify(data.favorites));
}

// ----- 从 GitHub 拉取并合并到本地 -----
async function loadRemoteData() {
    if (!dataSync.config?.token) return false;
    const url = `https://api.github.com/repos/${dataSync.config.repo}/contents/${DATA_FILE_PATH}?ref=${dataSync.config.branch}`;
    try {
        const res = await fetch(url, {
            headers: { 'Authorization': `token ${dataSync.config.token}` }
        });
        if (res.ok) {
            const file = await res.json();
            dataSync.sha = file.sha;
            const content = atob(file.content);
            const remote = JSON.parse(content);
            const local = getLocalData();

            // 合并 views（取最大值）
            for (const key in remote.views) {
                local.views[key] = Math.max(local.views[key] || 0, remote.views[key]);
            }
            // 合并 comments（按 user+time 去重）
            for (const key in remote.comments) {
                if (!local.comments[key]) local.comments[key] = [];
                const existing = new Set(local.comments[key].map(c => c.user + c.time));
                remote.comments[key].forEach(c => {
                    if (!existing.has(c.user + c.time)) {
                        local.comments[key].push(c);
                    }
                });
            }
            // 合并 likes & favorites（取或）
            for (const key in remote.likes) {
                local.likes[key] = local.likes[key] || remote.likes[key] || false;
            }
            for (const key in remote.favorites) {
                local.favorites[key] = local.favorites[key] || remote.favorites[key] || false;
            }

            saveLocalData(local);
            return true;
        } else if (res.status === 404) {
            // 文件不存在，创建空文件（之后首次提交会自动创建）
            return true;
        }
        return false;
    } catch (e) {
        console.warn('加载远程数据失败', e);
        return false;
    }
}

// ----- 提交数据到 GitHub（带冲突重试） -----
async function pushRemoteData(data, retry = true) {
    if (!dataSync.config?.token) return false;
    const url = `https://api.github.com/repos/${dataSync.config.repo}/contents/${DATA_FILE_PATH}`;
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
    const payload = {
        message: '更新站点数据',
        content: content,
        branch: dataSync.config.branch,
    };
    if (dataSync.sha) payload.sha = dataSync.sha;

    try {
        const res = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${dataSync.config.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const result = await res.json();
            dataSync.sha = result.content.sha;
            return true;
        } else if (res.status === 409 && retry) {
            // 冲突：远程已有新提交，获取最新版本并重新合并
            const getRes = await fetch(url, {
                headers: { 'Authorization': `token ${dataSync.config.token}` }
            });
            if (getRes.ok) {
                const file = await getRes.json();
                dataSync.sha = file.sha;
                const remoteContent = atob(file.content);
                const remoteData = JSON.parse(remoteContent);
                const localData = getLocalData();
                // 重新合并远程和本地（保留两者的最新数据）
                // 合并逻辑与 loadRemoteData 类似，但以远程为基准，并插入本地新增
                // 由于本地数据可能已包含用户操作，我们以本地为准，但远程新增的不能丢失
                // 简单策略：合并时，远程已有的 key 保留，本地新增的也保留
                // 对于数组（评论），去重合并
                const merged = {
                    views: { ...remoteData.views, ...localData.views },
                    comments: { ...remoteData.comments, ...localData.comments },
                    likes: { ...remoteData.likes, ...localData.likes },
                    favorites: { ...remoteData.favorites, ...localData.favorites },
                };
                // 对 comments 做去重（防止同一评论重复）
                for (const key in merged.comments) {
                    const arr = merged.comments[key];
                    if (arr && arr.length > 0) {
                        const seen = new Set();
                        merged.comments[key] = arr.filter(c => {
                            const id = c.user + c.time;
                            if (seen.has(id)) return false;
                            seen.add(id);
                            return true;
                        });
                    }
                }
                saveLocalData(merged);
                // 重试提交（只重试一次，防止死循环）
                return await pushRemoteData(merged, false);
            }
            return false;
        } else {
            return false;
        }
    } catch (e) {
        console.warn('推送数据失败', e);
        return false;
    }
}

// ----- 同步主函数（节流） -----
async function syncDataToRemote() {
    if (dataSync.updating) return;
    dataSync.updating = true;
    try {
        const localData = getLocalData();
        const success = await pushRemoteData(localData);
        if (success) {
            dataSync.changes.clear();
        }
    } finally {
        dataSync.updating = false;
    }
}

// ----- 队列变更（延迟提交） -----
function queueDataChange(type) {
    if (!dataSync.config?.token) return;
    dataSync.changes.add(type);
    if (dataSync.timeout) clearTimeout(dataSync.timeout);
    dataSync.timeout = setTimeout(() => {
        syncDataToRemote();
    }, 5000); // 5秒内多次变更合并为一次提交
}

// ----- 初始化数据同步（由 admin.js 调用） -----
async function initDataSync(config) {
    dataSync.config = config;
    if (config?.token && config?.repo) {
        await loadRemoteData();
        // 页面关闭前尝试最后一次提交（但 beforeunload 中异步操作可能失败）
        window.addEventListener('beforeunload', () => {
            if (dataSync.changes.size > 0) {
                // 使用 navigator.sendBeacon 方式（需将数据转换为 Blob），这里简化，放弃同步
                // 实际可考虑使用 sendBeacon 发送数据到自定义后端，但无后端则忽略
            }
        });
    }
}

// 暴露全局
window.getLocalData = getLocalData;
window.saveLocalData = saveLocalData;
window.loadRemoteData = loadRemoteData;
window.pushRemoteData = pushRemoteData;
window.syncDataToRemote = syncDataToRemote;
window.queueDataChange = queueDataChange;
window.initDataSync = initDataSync;