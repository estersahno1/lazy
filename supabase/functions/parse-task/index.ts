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

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }), { status: 500 })
  }

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
  }

  if (!body.text?.trim()) {
    return new Response(JSON.stringify({ error: 'No text provided' }), { status: 400 })
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
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return new Response(JSON.stringify({ error: `OpenAI API error: ${response.status}`, details: errText }), {
        status: 502,
      })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return new Response(JSON.stringify({ error: 'Empty response from OpenAI' }), { status: 502 })
    }

    let parsed
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content)
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to parse OpenAI response', raw: content }), { status: 502 })
    }

    const subtasks: Subtask[] = (parsed.subtasks || []).map((s: Subtask, i: number) => ({
      subtask_title: s.subtask_title || `שלב ${i + 1}`,
      description: s.description || '',
      durationMinutes: Math.max(30, Math.min(240, Number(s.durationMinutes) || 60)),
    }))

    return new Response(JSON.stringify({ subtasks }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
    })
  }
})
