// supabase/functions/telegram-notify/index.ts
// Deploy: supabase functions deploy telegram-notify
// Secrets needed: TELEGRAM_BOT_TOKEN (from @BotFather)
// Schedule it (recommended every 30-60 min) via Supabase Dashboard -> Edge Functions -> Cron,
// or an external cron hitting this URL with your service role / anon key as Bearer token.
//
// Behaviour:
// - On a scheduled run: finds all tasks with telegram_remind = true and status != 'done',
//   sends one Telegram message per task to the saved chat id, and updates last_reminded_at.
//   Will only re-notify a task if it's been > 2 hours since the last reminder (cooldown),
//   so frequent cron runs don't spam you.
// - On a manual call with { test: true } in the body: sends a single test message.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const REMINDER_COOLDOWN_MS = 2 * 60 * 60 * 1000 // 2 hours

async function sendTelegram(chatId: string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
  return res.json()
}

Deno.serve(async (req) => {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      return new Response(JSON.stringify({ error: 'TELEGRAM_BOT_TOKEN not set' }), { status: 500 })
    }
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    const { data: settingsRows } = await supabase.from('os_settings').select('*').eq('key', 'telegram_chat_id')
    const chatId = settingsRows?.[0]?.value
    if (!chatId) {
      return new Response(JSON.stringify({ error: 'No telegram_chat_id saved in os_settings yet. Set it in Manage Businesses page.' }), { status: 400 })
    }

    let body: any = {}
    try { body = await req.json() } catch { /* no body */ }

    if (body?.test) {
      const result = await sendTelegram(chatId, '✅ ELATZ OS test message. Your Telegram reminders are wired up correctly!')
      return new Response(JSON.stringify({ message: 'Test message sent!', result }), { headers: { 'Content-Type': 'application/json' } })
    }

    const { data: tasks } = await supabase
      .from('tasks')
      .select('*, businesses(name, emoji)')
      .eq('telegram_remind', true)
      .neq('status', 'done')

    if (!tasks || tasks.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending reminders.' }), { headers: { 'Content-Type': 'application/json' } })
    }

    const now = Date.now()
    let sent = 0
    for (const t of tasks) {
      const last = t.last_reminded_at ? new Date(t.last_reminded_at).getTime() : 0
      if (now - last < REMINDER_COOLDOWN_MS) continue
      const bizName = t.businesses?.name || 'General'
      const bizEmoji = t.businesses?.emoji || '🏢'
      const text = `⏰ <b>Reminder</b>\n${bizEmoji} <b>${bizName}</b>\n${t.title}\n\nStatus: ${t.status} · Priority: ${t.priority}\nMark it done in ELATZ OS once finished — reminders stop automatically.`
      await sendTelegram(chatId, text)
      await supabase.from('tasks').update({ last_reminded_at: new Date().toISOString() }).eq('id', t.id)
      sent++
    }

    return new Response(JSON.stringify({ message: `Sent ${sent} reminder(s).` }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
