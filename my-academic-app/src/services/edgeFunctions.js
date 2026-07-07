import { supabase, isSupabaseEnabled } from '../lib/supabase'

export async function parseTaskWithOpenAI(title, text) {
  if (!isSupabaseEnabled) {
    return { ok: false, error: 'Supabase לא מוגדר. הגדרי VITE_SUPABASE_URL ו-VITE_SUPABASE_ANON_KEY.' }
  }

  if (!text?.trim()) {
    return { ok: false, error: 'אין טקסט לפירוק.' }
  }

  try {
    const { data, error } = await supabase.functions.invoke('parse-task', {
      body: { title: title || '', text: text.slice(0, 8000) },
    })

    if (error) {
      return { ok: false, error: error.message || 'שגיאה בקריאה ל-OpenAI' }
    }

    if (!data?.subtasks?.length) {
      return { ok: false, error: 'לא התקבלו שלבים מ-OpenAI.' }
    }

    const items = data.subtasks.map((s, i) => ({
      title: s.subtask_title || `שלב ${i + 1}`,
      description: s.description || '',
      durationMinutes: Math.max(30, Math.min(240, Number(s.durationMinutes) || 60)),
    }))

    return { ok: true, items, error: null }
  } catch (err) {
    return { ok: false, error: err.message || 'שגיאה ברשת' }
  }
}
