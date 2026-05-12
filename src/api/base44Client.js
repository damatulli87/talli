/**
 * Supabase-backed drop-in replacement for the Base44 SDK.
 * Exported as `base44` so all existing page code works without changes.
 *
 * Tables required (see DEPLOYMENT.md for SQL):
 *   cycle_configs, expenses, cycle_overrides
 *
 * Storage bucket required:
 *   receipts (public)
 */
import { supabase } from '@/lib/supabase'

// Base44 used "created_date" as the auto-timestamp field name.
// Supabase uses "created_at". Map the sort key so existing callers work.
const mapSortField = (field) => {
  if (field === 'created_date') return 'created_at'
  return field
}

const makeSortArgs = (sortExpression) => {
  const descending = sortExpression.startsWith('-')
  const field = mapSortField(descending ? sortExpression.slice(1) : sortExpression)
  return { column: field, options: { ascending: !descending } }
}

const makeEntityApi = (tableName) => ({
  async list(sortExpression = '-created_at', limit = 100) {
    const { column, options } = makeSortArgs(sortExpression)
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order(column, options)
      .limit(limit)
    if (error) throw error
    return data ?? []
  },

  async filter(conditions = {}) {
    let query = supabase.from(tableName).select('*')
    for (const [key, value] of Object.entries(conditions)) {
      query = query.eq(key, value)
    }
    const { data, error } = await query
    if (error) throw error
    return data ?? []
  },

  async create(record) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from(tableName)
      .insert({ ...record, user_id: user?.id })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from(tableName)
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id) {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id)
    if (error) throw error
  },
})

export const base44 = {
  entities: {
    CycleConfig: makeEntityApi('cycle_configs'),
    Expense: makeEntityApi('expenses'),
    CycleOverride: makeEntityApi('cycle_overrides'),
  },

  auth: {
    async me() {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    },
    logout() {
      return supabase.auth.signOut()
    },
    redirectToLogin() {
      // Supabase auth is handled inside the app (Login page), not via redirect.
    },
  },

  integrations: {
    Core: {
      async UploadFile({ file }) {
        const { data: { user } } = await supabase.auth.getUser()
        const ext = file.name.split('.').pop()
        const path = `${user?.id ?? 'anon'}/${Date.now()}.${ext}`
        const { data, error } = await supabase.storage
          .from('receipts')
          .upload(path, file, { upsert: true })
        if (error) throw error
        const { data: { publicUrl } } = supabase.storage
          .from('receipts')
          .getPublicUrl(data.path)
        return { file_url: publicUrl }
      },

      async InvokeLLM({ prompt, file_urls, response_json_schema }) {
        const res = await fetch('/api/scan-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, file_urls, response_json_schema }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error ?? 'Receipt scanning failed')
        }
        return res.json()
      },
    },
  },
}
