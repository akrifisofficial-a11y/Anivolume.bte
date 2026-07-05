import { supabase } from './supabase.js'
import { signOut, isAdmin, updateAuthUI, getCurrentUser } from './auth.js'
import { getAnimeList, createAnime, updateAnime, deleteAnime } from './anime-api.js'

// Элементы DOM
const tbody = document.getElementById('animeTableBody')
const addBtn = document.getElementById('addBtn')
const refreshBtn = document.getElementById('refreshBtn')
const authBtn = document.getElementById('authBtn')
const editModal = document.getElementById('editModal')
const editForm = document.getElementById('editForm')
const editId = document.getElementById('editId')
const editTitle = document.getElementById('editTitle')
const editDescription = document.getElementById('editDescription')
const editCover = document.getElementById('editCover')
const editVideo = document.getElementById('editVideo')
const editGenre = document.getElementById('editGenre')
const editYear = document.getElementById('editYear')
const modalTitle = document.getElementById('modalTitle')
const closeEditModal = document.getElementById('closeEditModal')
const editError = document.getElementById('editError')

let currentAnimeList = []

// --- Вспомогательные функции ---

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer') || (() => {
    const c = document.createElement('div')
    c.id = 'toastContainer'
    c.className = 'toast-container'
    document.body.appendChild(c)
    return c
  })()
  const toast = document.createElement('div')
  toast.className = `toast ${type}`
  toast.textContent = message
  container.appendChild(toast)
  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transition = 'opacity 0.5s'
    setTimeout(() => toast.remove(), 500)
  }, 3000)
}

function showTableLoader() {
  tbody.innerHTML = `<tr><td colspan="4"><div class="loader-container"><div class="spinner"></div></div></td></tr>`
}

// --- CRUD ---

async function loadAnime() {
  showTableLoader()
  try {
    const data = await getAnimeList()
    currentAnimeList = data
    renderTable(data)
  } catch (err) {
    console.error('Ошибка загрузки аниме:', err)
    tbody.innerHTML = `<tr><td colspan="4" style="color:#ff6b6b;">Ошибка: ${err.message}</td></tr>`
  }
}

function renderTable(animeList) {
  if (!animeList.length) {
    tbody.innerHTML = '<tr><td colspan="4">Нет аниме</td></tr>'
    return
  }
  tbody.innerHTML = animeList.map(anime => `
    <tr>
      <td>${anime.title}</td>
      <td>${anime.genre || '-'}</td>
      <td>${anime.release_year || '-'}</td>
      <td class="actions-cell">
        <button class="btn btn-secondary" data-id="${anime.id}" data-action="edit">✏️</button>
        <button class="btn btn-danger" data-id="${anime.id}" data-action="delete">🗑️</button>
      </td>
    </tr>
  `).join('')

  tbody.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.id))
  })
  tbody.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => deleteItem(btn.dataset.id))
  })
}

function openEditModal(id = null) {
  editError.textContent = ''
  if (id) {
    const anime = currentAnimeList.find(a => a.id === id)
    if (!anime) return
    modalTitle.textContent = 'Редактировать аниме'
    editId.value = anime.id
    editTitle.value = anime.title
    editDescription.value = anime.description || ''
    editCover.value = anime.cover_image || ''
    editVideo.value = anime.video_url || ''
    editGenre.value = anime.genre || ''
    editYear.value = anime.release_year || ''
  } else {
    modalTitle.textContent = 'Добавить аниме'
    editId.value = ''
    editForm.reset()
  }
  editModal.classList.add('active')
}

editForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  editError.textContent = ''
  const id = editId.value
  const data = {
    title: editTitle.value.trim(),
    description: editDescription.value.trim(),
    cover_image: editCover.value.trim(),
    video_url: editVideo.value.trim(),
    genre: editGenre.value.trim(),
    release_year: parseInt(editYear.value) || null
  }
  try {
    if (id) {
      await updateAnime(id, data)
      showToast('Аниме обновлено ✅', 'success')
    } else {
      await createAnime(data)
      showToast('Аниме добавлено ✅', 'success')
    }
    editModal.classList.remove('active')
    loadAnime()
  } catch (err) {
    console.error('Ошибка сохранения:', err)
    editError.textContent = err.message || 'Ошибка сохранения'
  }
})

async function deleteItem(id) {
  if (!confirm('Удалить это аниме?')) return
  try {
    await deleteAnime(id)
    showToast('Аниме удалено 🗑️', 'success')
    loadAnime()
  } catch (err) {
    console.error('Ошибка удаления:', err)
    showToast('Ошибка: ' + err.message, 'error')
  }
}

closeEditModal.addEventListener('click', () => {
  editModal.classList.remove('active')
  editError.textContent = ''
})

addBtn.addEventListener('click', () => openEditModal())
refreshBtn.addEventListener('click', loadAnime)

// --- Авторизация и права доступа ---

async function initAdmin() {
  try {
    // 1. Проверяем, авторизован ли пользователь
    const user = await getCurrentUser()
    console.log('Текущий пользователь:', user)

    if (!user) {
      showToast('Вы не авторизованы. Перенаправление на главную...', 'error')
      setTimeout(() => window.location.href = 'index.html', 2000)
      return
    }

    // 2. Проверяем роль
    const admin = await isAdmin()
    console.log('Является администратором?', admin)

    if (!admin) {
      showToast('Доступ запрещён. Вы не администратор.', 'error')
      setTimeout(() => window.location.href = 'index.html', 2000)
      return
    }

    // 3. Обновляем UI (кнопка "Выйти")
    await updateAuthUI(authBtn, null) // adminLink не нужен на этой странице

    // 4. Загружаем список аниме
    loadAnime()

    // 5. Обработчик выхода
    authBtn.addEventListener('click', async (e) => {
      e.preventDefault()
      try {
        await signOut()
        window.location.href = 'index.html'
      } catch (err) {
        showToast('Ошибка выхода: ' + err.message, 'error')
      }
    })

  } catch (err) {
    console.error('Ошибка инициализации админки:', err)
    showToast('Ошибка: ' + err.message, 'error')
  }
}

// Запускаем
initAdmin()
