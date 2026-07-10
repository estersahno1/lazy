import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

interface Subtask {
  subtask_title: string
  description: string
  durationMinutes: number
}

interface RequestBody {
  title?: string
  text: string
}

// The browser sends a CORS preflight (OPTIONS) before the real POST because
// supabase.functions.invoke() attaches an Authorization header — without
// these headers on every response (including errors), the browser blocks
// the request before it ever reaches this function, and the client just
// sees "Failed to send a request to the Edge Function".
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const apiKey = Deno.env.get('COHERE_API_KEY')
  if (!apiKey) {
    return json({ error: 'COHERE_API_KEY not configured' }, 500)
  }

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  if (!body.text?.trim()) {
    return json({ error: 'No text provided' }, 400)
  }

  const systemPrompt = `אתה עוזר אקדמי שמפרק מטלות לשלבי עבודה.

החזר תמיד מערך JSON בפורמט הבא:
{
  "subtasks": [
    {
      "subtask_title": "כותרת קצרה של השלב",
      "description": "תיאור מפורט של מה לעשות בשלב",
      "durationMinutes": 60
    }
  ]
}

כללים:
- פרק את המטלה ל-3 עד 8 שלבים לוגיים
- כל שלב צריך כותרת ברורה (עד 80 תווים) ותיאור קצר
- durationMinutes: בין 30 ל-240 דקות, תלוי במורכבות השלב
- השלבים צריכים להיות בסדר כרונולוגי הגיוני
- החזר אך ורק JSON תקין, ללא טקסט נוסף`

  const userPrompt = `מטלה אקדמית לפירוק:
${body.title ? `כותרת: ${body.title}\n\n` : ''}תוכן המטלה:
${body.text.slice(0, 8000)}`

  try {
    const response = await fetch('https://api.cohere.com/v2/chat', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'command-r-08-2024',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return json({ error: `Cohere API error: ${response.status}`, details: errText }, 502)
    }

    const data = await response.json()
    const content: string | undefined = data.message?.content?.[0]?.text

    if (!content) {
      return json({ error: 'Empty response from Cohere' }, 502)
    }

    let parsed
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content)
    } catch {
      return json({ error: 'Failed to parse Cohere response', raw: content }, 502)
    }

    const subtasks: Subtask[] = (parsed.subtasks || []).map((s: Subtask, i: number) => ({
      subtask_title: s.subtask_title || `שלב ${i + 1}`,
      description: s.description || '',
      durationMinutes: Math.max(30, Math.min(240, Number(s.durationMinutes) || 60)),
    }))

    return json({ subtasks })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})
