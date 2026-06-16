import { useMemo, useState } from 'react'
import { useApp, BIZ_CONFIG } from '../context/AppContext'
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, isToday, isPast } from 'date-fns'
import { TrendingUp, TrendingDown, AlertCircle, Zap, Bot, CheckCircle2, Clock, Circle } from 'lucide-react'

const STATUS_ICON = {
  pending: <Circle size={14} />,
  in_progress: <Clock size={14} />,
  done: <CheckCircle2 size={14} />,
}

export default function Dashboard() {
  const { tasks, transactions, debts, subscriptions, agentTasks, notes, businesses, setActiveTab } = useApp()
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)

  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const monthlyTx = useMemo(() =>
    transactions.filter(t => {
      try { return isWithinInterval(parseISO(t.transaction_date), { start: monthStart, end: monthEnd }) }
      catch { return false }
    }), [transactions])

  const totalIncome = monthlyTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = monthlyTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const netAmount = totalIncome - totalExpense
  const totalDebt = debts.reduce((s, d) => s + Number(d.remaining_amount), 0)
  const monthlyEMI = debts.reduce((s, d) => s + Number(d.emi_monthly || 0), 0)
  const monthlySubscriptions = subscriptions.filter(s => s.billing_cycle === 'monthly').reduce((sum, s) => sum + Number(s.amount), 0)

  // Today's tasks
  const todayTasks = tasks.filter(t => t.recur_daily || (t.due_date && isToday(parseISO(t.due_date))))
  const pendingToday = todayTasks.filter(t => t.status !== 'done')
  const doneToday = todayTasks.filter(t => t.status === 'done')

  // Overdue
  const overdue = tasks.filter(t => t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)) && t.status !== 'done')

  // Agent tasks summary
  const agentPending = agentTasks.filter(a => a.status === 'pending').length
  const agentDone = agentTasks.filter(a => a.status === 'done').length
  const recentAgent = agentTasks.filter(a => a.status === 'done').slice(0, 3)

  // Per-biz task counts
  const bizTaskStats = businesses.map(b => ({
    ...b,
    total: tasks.filter(t => t.business_id === b.id).length,
    done: tasks.filter(t => t.business_id === b.id && t.status === 'done').length,
    pending: tasks.filter(t => t.business_id === b.id && t.status !== 'done').length,
  }))

  // Unnecessary spend detection
  const unnecessaryCategories = ['Energy Drinks', 'Junk Snacks', 'Online Shopping', 'Entertainment']
  const unnecessaryTotal = monthlyTx.filter(t => t.type === 'expense' && unnecessaryCategories.includes(t.category)).reduce((s, t) => s + Number(t.amount), 0)

  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  async function runAIAnalysis() {
    setAnalyzing(true)
    try {
      const expenseData = monthlyTx.filter(t => t.type === 'expense').map(t => `${t.description || 'No desc'} - ₹${t.amount} (${t.category || 'Uncategorized'})`).join('\n')
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{ role: 'user', content: `Analyze these monthly expenses for an Indian entrepreneur and identify unnecessary spending. Be specific and actionable. Return JSON only:\n{\n  "unnecessary_items": [{"description": "...", "amount": 0, "reason": "..."}],\n  "total_unnecessary": 0,\n  "savings_tip": "one actionable tip",\n  "pattern": "one spending pattern observation"\n}\n\nExpenses:\n${expenseData || 'No expenses this month yet'}` }]
        })
      })
      const data = await response.json()
      const text = data.content?.[0]?.text || '{}'
      setAiAnalysis(JSON.parse(text.replace(/```json|```/g, '').trim()))
    } catch (e) { console.error(e) }
    setAnalyzing(false)
  }

  return (
    <div className="page-content">
      {/* Morning Briefing Header */}
      <div className="briefing-header">
        <div className="briefing-greeting">{greeting}, Ram 👋</div>
        <div className="briefing-title">{format(now, 'EEEE, d MMMM')}</div>
        <div className="briefing-subtitle">
          {pendingToday.length === 0
            ? '✅ All daily tasks done — great start!'
            : `${pendingToday.length} task${pendingToday.length > 1 ? 's' : ''} pending today · ${doneToday.length} done`}
          {overdue.length > 0 && <span style={{ color: 'var(--red)', marginLeft: '0.75rem' }}>⚠ {overdue.length} overdue</span>}
        </div>
      </div>

      {/* Business KPI Cards */}
      <section className="section">
        <div className="section-title">Business Status</div>
        <div className="briefing-kpis">
          {bizTaskStats.map(b => (
            <div key={b.id} className="kpi-card" onClick={() => setActiveTab('tasks')}>
              <div className="kpi-biz" style={{ color: b.color }}>{b.emoji} {b.name}</div>
              <div className="kpi-value">{b.pending}</div>
              <div className="kpi-label">tasks pending · {b.done} done</div>
            </div>
          ))}
        </div>
      </section>

      {/* Agent Tasks Summary */}
      {agentTasks.length > 0 && (
        <section className="section">
          <div className="section-title"><Bot size={14} /> Agent Tasks</div>
          {recentAgent.map(a => (
            <div key={a.id} className="agent-task-card">
              <div className="agent-header">
                <span className="agent-icon">🤖</span>
                <span className="agent-title">{a.title}</span>
                <span className={`agent-status ${a.status}`}>{a.status}</span>
              </div>
              {a.result && <div className="agent-result">✓ {a.result}</div>}
            </div>
          ))}
          {agentPending > 0 && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>+ {agentPending} agent task{agentPending > 1 ? 's' : ''} queued</div>
          )}
        </section>
      )}

      {/* Today's Tasks */}
      <section className="section">
        <div className="section-title" style={{ justifyContent: 'space-between' }}>
          <span>Today's Tasks</span>
          <button className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }} onClick={() => setActiveTab('tasks')}>View all →</button>
        </div>
        {todayTasks.length === 0 ? (
          <div className="empty-card">No daily tasks set. Go to Tasks to add recurring tasks.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {todayTasks.slice(0, 8).map(t => (
              <div key={t.id} className={`task-item status-${t.status}`} style={{ cursor: 'default' }}>
                <span style={{ color: t.status === 'done' ? 'var(--green)' : 'var(--text3)' }}>
                  {STATUS_ICON[t.status] || <Circle size={14} />}
                </span>
                <span className="task-title" style={{ flex: 1, fontSize: '0.85rem' }}>{t.title}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text3)' }}>
                  {businesses.find(b => b.id === t.business_id)?.emoji}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Monthly Financial Summary */}
      <section className="section">
        <div className="section-title"><TrendingUp size={14} /> {format(now, 'MMMM')} Finances</div>
        <div className="summary-grid">
          <div className="summary-card income-card">
            <TrendingUp size={20} />
            <div>
              <div className="summary-label">Income</div>
              <div className="summary-amount">₹{totalIncome.toLocaleString('en-IN')}</div>
            </div>
          </div>
          <div className="summary-card expense-card">
            <TrendingDown size={20} />
            <div>
              <div className="summary-label">Expenses</div>
              <div className="summary-amount">₹{totalExpense.toLocaleString('en-IN')}</div>
            </div>
          </div>
          <div className={`summary-card ${netAmount >= 0 ? 'profit-card' : 'loss-card'}`}>
            <AlertCircle size={20} />
            <div>
              <div className="summary-label">{netAmount >= 0 ? 'In-Hand' : 'Deficit'}</div>
              <div className="summary-amount">₹{Math.abs(netAmount).toLocaleString('en-IN')}</div>
            </div>
          </div>
          <div className="summary-card subs-card">
            <Zap size={20} />
            <div>
              <div className="summary-label">Subscriptions</div>
              <div className="summary-amount">₹{monthlySubscriptions.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>
        {totalDebt > 0 && (
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--text2)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Total Debt: <strong style={{ color: 'var(--red)' }}>₹{totalDebt.toLocaleString('en-IN')}</strong></span>
            <span>EMI/mo: <strong style={{ color: 'var(--amber)' }}>₹{monthlyEMI.toLocaleString('en-IN')}</strong></span>
          </div>
        )}
      </section>

      {/* AI Spend Analysis */}
      <section className="section">
        <div className="section-title">
          <AlertCircle size={14} /> Spending Watch
          <button className="ai-analyze-btn" onClick={runAIAnalysis} disabled={analyzing}>
            {analyzing ? '⏳ Analyzing...' : '🤖 AI Analyze'}
          </button>
        </div>
        {unnecessaryTotal > 0 && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
            Detected unnecessary spend: <strong style={{ color: 'var(--red)' }}>₹{unnecessaryTotal.toLocaleString('en-IN')}</strong>
            {totalExpense > 0 && <span style={{ color: 'var(--text3)' }}> ({Math.round((unnecessaryTotal / totalExpense) * 100)}% of expenses)</span>}
          </div>
        )}
        {aiAnalysis && (
          <div className="ai-analysis-card">
            <div className="ai-badge">🤖 AI Analysis</div>
            {aiAnalysis.pattern && <p className="ai-pattern">📊 {aiAnalysis.pattern}</p>}
            {aiAnalysis.savings_tip && <p className="ai-tip">💡 {aiAnalysis.savings_tip}</p>}
            {aiAnalysis.total_unnecessary > 0 && (
              <div className="ai-total">AI flagged: ₹{Number(aiAnalysis.total_unnecessary).toLocaleString('en-IN')}</div>
            )}
          </div>
        )}
        {unnecessaryTotal === 0 && !aiAnalysis && (
          <div className="empty-card">No obvious unnecessary spends this month. Run AI analysis for deeper insights.</div>
        )}
      </section>

      {/* Business Notes Peek */}
      {notes.length > 0 && (
        <section className="section">
          <div className="section-title" style={{ justifyContent: 'space-between' }}>
            <span>📝 Business Status Notes</span>
            <button className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }} onClick={() => setActiveTab('notes')}>Edit →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {notes.slice(0, 3).map(n => (
              <div key={n.id} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: n.biz_color || 'var(--accent2)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {n.biz_emoji} {n.biz_name}
                </div>
                <div style={{ fontSize: '0.83rem', color: 'var(--text2)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{n.content.slice(0, 120)}{n.content.length > 120 ? '...' : ''}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
