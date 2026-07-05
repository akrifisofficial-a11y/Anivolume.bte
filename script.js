import { supabase } from './supabase.js'

// ---- Аутентификация ----
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// ---- Профиль пользователя (роль) ----
export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

// ---- Проверка админа ----
export async function isAdmin() {
  const user = await getCurrentUser()
  if (!user) return false
  const profile = await getUserProfile(user.id)
  return profile?.role === 'admin'
}

// ---- CRUD для аниме (используются в admin.js) ----
export async function getAnimeList() {
  const { data, error } = await supabase
    .from('anime')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getAnimeById(id) {
  const { data, error } = await supabase
    .from('anime')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createAnime(animeData) {
  const { data, error } = await supabase
    .from('anime')
    .insert([animeData])
    .select()
  if (error) throw error
  return data[0]
}

export async function updateAnime(id, animeData) {
  const { data, error } = await supabase
    .from('anime')
    .update(animeData)
    .eq('id', id)
    .select()
  if (error) throw error
  return data[0]
}

export async function deleteAnime(id) {
  const { error } = await supabase
    .from('anime')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ---- Поиск ----
export async function searchAnime(query) {
  const { data, error } = await supabase
    .from('anime')
    .select('*')
    .ilike('title', `%${query}%`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}
