import { supabase } from './supabase-client.js';

// Экспортируем supabase и isAdmin для использования в app.js
export { supabase };

// Проверка, является ли пользователь админом
export async function isAdmin(userId) {
    if (!userId) return false;
    const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
    return data?.role === 'admin';
}

// ---------- Рендер админ-панели ----------
export async function renderAdminPanel(container) {
    // Проверяем сессию
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !(await isAdmin(session.user.id))) {
        container.innerHTML = `<p style="color:#ef4444;">Доступ запрещён. <a href="#login">Войти как админ</a></p>`;
        return;
    }

    container.innerHTML = `
        <div class="admin-panel">
            <h1>👑 Админ-панель</h1>
            <div style="margin:1rem 0;">
                <button class="btn" id="add-anime-btn">➕ Добавить аниме</button>
            </div>
            <div class="section-title">Список аниме</div>
            <div id="admin-anime-list"></div>
            <hr style="margin:2rem 0;border-color:#2a3040;">
            <div class="section-title">Управление сериями</div>
            <div id="admin-episode-section">
                <p style="opacity:0.7;">Выберите аниме, чтобы управлять сериями</p>
                <select id="anime-select" style="margin-top:0.5rem;padding:0.5rem;background:#0b0e14;color:#fff;border:1px solid #2a3040;border-radius:8px;width:100%;max-width:300px;"></select>
                <div id="episode-manager" style="margin-top:1rem;"></div>
            </div>
        </div>
    `;

    // Загружаем список аниме
    await loadAnimeList();

    // Загружаем селект аниме
    await populateAnimeSelect();

    // Обработчик добавления аниме
    document.getElementById('add-anime-btn').addEventListener('click', () => {
        showAnimeForm();
    });

    // Обработчик выбора аниме для серий
    document.getElementById('anime-select').addEventListener('change', async (e) => {
        const animeId = e.target.value;
        if (animeId) {
            await loadEpisodesForAnime(animeId);
        } else {
            document.getElementById('episode-manager').innerHTML = '';
        }
    });
}

// ---------- Загрузка списка аниме (админ) ----------
async function loadAnimeList() {
    const { data, error } = await supabase
        .from('anime')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        document.getElementById('admin-anime-list').innerHTML = `<p>Ошибка: ${error.message}</p>`;
        return;
    }

    const list = document.getElementById('admin-anime-list');
    if (!data.length) {
        list.innerHTML = '<p>Аниме не добавлены</p>';
        return;
    }

    list.innerHTML = data.map(anime => `
        <div class="admin-item">
            <span><strong>${anime.title}</strong> ${anime.description ? `— ${anime.description.slice(0, 50)}...` : ''}</span>
            <div class="actions">
                <button class="edit" data-id="${anime.id}">✏️</button>
                <button class="delete" data-id="${anime.id}">🗑️</button>
            </div>
        </div>
    `).join('');

    // Обработчики кнопок
    list.querySelectorAll('.edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const anime = data.find(a => a.id === id);
            if (anime) showAnimeForm(anime);
        });
    });

    list.querySelectorAll('.delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            if (confirm('Удалить это аниме и все его серии?')) {
                const { error } = await supabase.from('anime').delete().eq('id', id);
                if (error) alert('Ошибка: ' + error.message);
                else {
                    await loadAnimeList();
                    await populateAnimeSelect();
                }
            }
        });
    });
}

// ---------- Форма добавления/редактирования аниме ----------
function showAnimeForm(anime = null) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close">&times;</button>
            <h2>${anime ? 'Редактировать' : 'Новое'} аниме</h2>
            <form class="admin-form" id="anime-form">
                <input type="text" id="anime-title" placeholder="Название" value="${anime?.title || ''}" required>
                <textarea id="anime-description" placeholder="Описание">${anime?.description || ''}</textarea>
                <input type="url" id="anime-cover" placeholder="Ссылка на обложку" value="${anime?.cover_image || ''}">
                <div class="form-row">
                    <button type="submit" class="btn">${anime ? 'Сохранить' : 'Добавить'}</button>
                    <button type="button" class="btn btn-outline modal-cancel">Отмена</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // Закрытие
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.modal-cancel').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    // Отправка
    modal.querySelector('#anime-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('anime-title').value.trim();
        const description = document.getElementById('anime-description').value.trim();
        const cover_image = document.getElementById('anime-cover').value.trim();

        if (!title) return alert('Название обязательно');

        const payload = { title, description, cover_image };

        let result;
        if (anime) {
            result = await supabase.from('anime').update(payload).eq('id', anime.id);
        } else {
            result = await supabase.from('anime').insert([payload]);
        }

        if (result.error) {
            alert('Ошибка: ' + result.error.message);
        } else {
            modal.remove();
            await loadAnimeList();
            await populateAnimeSelect();
        }
    });
}

// ---------- Заполнение селекта аниме ----------
async function populateAnimeSelect() {
    const { data, error } = await supabase
        .from('anime')
        .select('id, title')
        .order('title');

    const select = document.getElementById('anime-select');
    if (error || !data.length) {
        select.innerHTML = '<option value="">— нет аниме —</option>';
        return;
    }

    select.innerHTML = '<option value="">Выберите аниме</option>' +
        data.map(a => `<option value="${a.id}">${a.title}</option>`).join('');
}

// ---------- Загрузка серий для админки ----------
async function loadEpisodesForAnime(animeId) {
    const container = document.getElementById('episode-manager');
    container.innerHTML = `<p style="margin-bottom:0.5rem;">Серии:</p>
                           <button class="btn" id="add-episode-btn">➕ Добавить серию</button>
                           <div id="episode-list-admin"></div>`;

    const { data, error } = await supabase
        .from('episodes')
        .select('*')
        .eq('anime_id', animeId)
        .order('episode_number', { ascending: true });

    if (error) {
        document.getElementById('episode-list-admin').innerHTML = `<p>Ошибка: ${error.message}</p>`;
        return;
    }

    const list = document.getElementById('episode-list-admin');
    if (!data.length) {
        list.innerHTML = '<p>Серий пока нет</p>';
    } else {
        list.innerHTML = data.map(ep => `
            <div class="admin-item">
                <span>Серия ${ep.episode_number}${ep.title ? ` — ${ep.title}` : ''}</span>
                <div class="actions">
                    <button class="edit-ep" data-id="${ep.id}">✏️</button>
                    <button class="delete-ep" data-id="${ep.id}">🗑️</button>
                </div>
            </div>
        `).join('');

        // Обработчики
        list.querySelectorAll('.edit-ep').forEach(btn => {
            btn.addEventListener('click', () => {
                const ep = data.find(e => e.id === btn.dataset.id);
                if (ep) showEpisodeForm(animeId, ep);
            });
        });

        list.querySelectorAll('.delete-ep').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Удалить серию?')) {
                    const { error } = await supabase.from('episodes').delete().eq('id', btn.dataset.id);
                    if (error) alert('Ошибка: ' + error.message);
                    else await loadEpisodesForAnime(animeId);
                }
            });
        });
    }

    // Добавление серии
    document.getElementById('add-episode-btn').addEventListener('click', () => {
        showEpisodeForm(animeId);
    });
}

// ---------- Форма добавления/редактирования серии ----------
function showEpisodeForm(animeId, episode = null) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close">&times;</button>
            <h2>${episode ? 'Редактировать' : 'Новая'} серия</h2>
            <form class="admin-form" id="episode-form">
                <input type="number" id="ep-number" placeholder="Номер серии" value="${episode?.episode_number || ''}" required min="1">
                <input type="text" id="ep-title" placeholder="Название серии (опционально)" value="${episode?.title || ''}">
                <input type="url" id="ep-video" placeholder="Ссылка на видео VK (iframe src)" value="${episode?.video_url || ''}" required>
                <div class="form-row">
                    <button type="submit" class="btn">${episode ? 'Сохранить' : 'Добавить'}</button>
                    <button type="button" class="btn btn-outline modal-cancel">Отмена</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.modal-cancel').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    modal.querySelector('#episode-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const episode_number = parseInt(document.getElementById('ep-number').value);
        const title = document.getElementById('ep-title').value.trim();
        const video_url = document.getElementById('ep-video').value.trim();

        if (!episode_number || !video_url) {
            return alert('Номер серии и ссылка на видео обязательны');
        }

        const payload = { anime_id: animeId, episode_number, title, video_url };

        let result;
        if (episode) {
            result = await supabase.from('episodes').update(payload).eq('id', episode.id);
        } else {
            result = await supabase.from('episodes').insert([payload]);
        }

        if (result.error) {
            alert('Ошибка: ' + result.error.message);
        } else {
            modal.remove();
            await loadEpisodesForAnime(animeId);
        }
    });
          }
