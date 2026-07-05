import { supabase, isAdmin } from './admin.js';
import { renderAdminPanel } from './admin.js';

// ---------- Конфигурация роутинга ----------
const routes = {
    '#home': renderHome,
    '#anime': renderAnimeDetail,
    '#watch': renderWatch,
    '#admin': renderAdmin,
    '#login': renderLogin,
};

// ---------- Навигация ----------
function navigate(hash) {
    const path = hash.split('?')[0];
    const handler = routes[path] || renderNotFound;
    handler(hash);
}

// ---------- Рендер главной ----------
async function renderHome() {
    const app = document.getElementById('app');
    app.innerHTML = `<h1 style="margin-bottom:0.5rem;">🔥 Популярное аниме</h1>
                     <div class="anime-grid" id="anime-grid"></div>`;

    const { data, error } = await supabase
        .from('anime')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        app.innerHTML += `<p>Ошибка загрузки: ${error.message}</p>`;
        return;
    }

    const grid = document.getElementById('anime-grid');
    if (!data.length) {
        grid.innerHTML = '<p>Пока нет аниме 😢</p>';
        return;
    }

    grid.innerHTML = data.map(anime => `
        <div class="anime-card" data-id="${anime.id}">
            <img src="${anime.cover_image || 'https://via.placeholder.com/300x400/1a1f2b/8b5cf6?text=No+Image'}" alt="${anime.title}">
            <div class="info">
                <h3>${anime.title}</h3>
                <p>${anime.description || ''}</p>
            </div>
        </div>
    `).join('');

    // Клик по карточке
    grid.querySelectorAll('.anime-card').forEach(card => {
        card.addEventListener('click', () => {
            window.location.hash = `#anime?id=${card.dataset.id}`;
        });
    });
}

// ---------- Рендер деталей аниме (серии) ----------
async function renderAnimeDetail(hash) {
    const params = new URLSearchParams(hash.split('?')[1]);
    const animeId = params.get('id');
    if (!animeId) return renderHome();

    const app = document.getElementById('app');
    app.innerHTML = `<div id="anime-detail"><button class="btn btn-outline" id="back-home">← На главную</button>
                     <h1 id="anime-title" style="margin:1rem 0 0.5rem;"></h1>
                     <div class="episode-list" id="episode-list"></div></div>`;

    document.getElementById('back-home').addEventListener('click', () => {
        window.location.hash = '#home';
    });

    // Загружаем аниме
    const { data: anime, error: animeErr } = await supabase
        .from('anime')
        .select('*')
        .eq('id', animeId)
        .single();

    if (animeErr || !anime) {
        app.innerHTML += `<p>Аниме не найдено</p>`;
        return;
    }
    document.getElementById('anime-title').textContent = anime.title;

    // Загружаем серии
    const { data: episodes, error: epErr } = await supabase
        .from('episodes')
        .select('*')
        .eq('anime_id', animeId)
        .order('episode_number', { ascending: true });

    if (epErr) {
        document.getElementById('episode-list').innerHTML = `<p>Ошибка загрузки серий</p>`;
        return;
    }

    const list = document.getElementById('episode-list');
    if (!episodes.length) {
        list.innerHTML = '<p>Серий пока нет</p>';
        return;
    }

    list.innerHTML = episodes.map(ep => `
        <div class="episode-item" data-id="${ep.id}" data-anime="${animeId}">
            <span class="number">${ep.episode_number}</span>
            <span class="title">${ep.title || `Серия ${ep.episode_number}`}</span>
            <span class="badge">▶</span>
        </div>
    `).join('');

    list.querySelectorAll('.episode-item').forEach(item => {
        item.addEventListener('click', () => {
            const epId = item.dataset.id;
            window.location.hash = `#watch?anime=${animeId}&episode=${epId}`;
        });
    });
}

// ---------- Рендер плеера ----------
async function renderWatch(hash) {
    const params = new URLSearchParams(hash.split('?')[1]);
    const animeId = params.get('anime');
    const episodeId = params.get('episode');
    if (!animeId || !episodeId) return renderHome();

    const app = document.getElementById('app');
    app.innerHTML = `<div id="watch-container">
        <button class="btn btn-outline" id="back-episodes">← К сериям</button>
        <div class="player-wrapper" id="player-wrapper"></div>
        <div class="player-info" id="player-info"></div>
    </div>`;

    document.getElementById('back-episodes').addEventListener('click', () => {
        window.location.hash = `#anime?id=${animeId}`;
    });

    // Загружаем серию
    const { data: ep, error } = await supabase
        .from('episodes')
        .select('*, anime(title)')
        .eq('id', episodeId)
        .single();

    if (error || !ep) {
        app.innerHTML += `<p>Серия не найдена</p>`;
        return;
    }

    // Вставляем iframe VK
    const wrapper = document.getElementById('player-wrapper');
    wrapper.innerHTML = `<iframe src="${ep.video_url}" allowfullscreen loading="lazy"></iframe>`;

    const info = document.getElementById('player-info');
    info.innerHTML = `
        <h2>${ep.anime?.title || 'Аниме'} — ${ep.title || `Серия ${ep.episode_number}`}</h2>
        <p>Серия ${ep.episode_number}</p>
    `;
}

// ---------- Рендер логина ----------
function renderLogin() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div style="max-width:400px;margin:2rem auto;background:var(--bg-card);padding:2rem;border-radius:var(--radius);">
            <h2>Вход для админов</h2>
            <form id="login-form" class="admin-form">
                <input type="email" id="login-email" placeholder="Email" required>
                <input type="password" id="login-password" placeholder="Пароль" required>
                <button type="submit" class="btn">Войти</button>
            </form>
            <p id="login-error" style="color:#ef4444;margin-top:0.5rem;"></p>
        </div>
    `;

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            errorEl.textContent = error.message;
            return;
        }

        // Проверяем роль
        const isAdminUser = await isAdmin(data.user.id);
        if (!isAdminUser) {
            await supabase.auth.signOut();
            errorEl.textContent = 'У вас нет прав администратора.';
            return;
        }

        // Успешно
        updateNav(true);
        window.location.hash = '#admin';
    });
}

// ---------- Рендер админки (вызывается из admin.js) ----------
function renderAdmin() {
    renderAdminPanel(document.getElementById('app'));
}

// ---------- Рендер 404 ----------
function renderNotFound() {
    document.getElementById('app').innerHTML = '<h1>404 — Страница не найдена</h1>';
}

// ---------- Обновление навигации ----------
function updateNav(loggedIn) {
    const navAdmin = document.getElementById('nav-admin');
    const navLogin = document.getElementById('nav-login');
    const navLogout = document.getElementById('nav-logout');

    if (loggedIn) {
        navAdmin.style.display = 'inline';
        navLogin.style.display = 'none';
        navLogout.style.display = 'inline';
    } else {
        navAdmin.style.display = 'none';
        navLogin.style.display = 'inline';
        navLogout.style.display = 'none';
    }
}

// ---------- Выход ----------
document.getElementById('nav-logout').addEventListener('click', async () => {
    await supabase.auth.signOut();
    updateNav(false);
    window.location.hash = '#home';
});

// ---------- Инициализация ----------
async function init() {
    // Проверяем сессию
    const { data: { session } } = await supabase.auth.getSession();
    const loggedIn = session && (await isAdmin(session.user.id));
    updateNav(loggedIn);

    // Обработчик hashchange
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash || '#home';
        navigate(hash);
    });

    // Начальная загрузка
    const hash = window.location.hash || '#home';
    navigate(hash);

    // Обработчик нажатия на "Войти"
    document.getElementById('nav-login').addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = '#login';
    });
}

// Запуск
init();
