import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, isToday, isPast } from 'date-fns'
import { TrendingUp, TrendingDown, AlertCircle, CreditCard, Zap, ShoppingCart, Package, RefreshCw } from 'lucide-react'

const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 }
const PRIORITY_COLOR = { urgent: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#6b7280' }

function fmt(n) { return Number(n || 0).toLocaleString('en-IN') }

export default function Dashboard() {
  const { businesses, tasks, transactions, debts, subscriptions, marketPrices, loadMarketPrices } = useApp()
  const [refreshing, setRefreshing] = useState(false)

  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const monthlyTx = useMemo(() =>
    transactions.filter(t => {
      try { return isWithinInterval(parseISO(t.transaction_date), { start: monthStart, end: monthEnd }) }
      catch { return false }
    }), [transactions])

  // ── Row 1: Per-business income/expense ──────────────────────
  const bizFinance = useMemo(() => businesses.map(b => {
    const btx = monthlyTx.filter(t => t.business_id === b.id)
    const income = btx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const expense = btx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    return { ...b, income, expense, net: income - expense }
  }), [businesses, monthlyTx])

  const totalIncome = bizFinance.reduce((s, b) => s + b.income, 0)
  const totalExpense = bizFinance.reduce((s, b) => s + b.expense, 0)

  // ── Row 2: Debts, fixed expenses, unnecessary ────────────────
  const totalDebt = debts.reduce((s, d) => s + Number(d.remaining_amount), 0)
  const monthlyEMI = debts.reduce((s, d) => s + Number(d.emi_monthly || 0), 0)
  const monthlySubs = subscriptions.filter(s => s.billing_cycle === 'monthly').reduce((s, sub) => s + Number(sub.amount), 0)
  const unnecessaryCats = ['Energy Drinks', 'Junk Snacks', 'Online Shopping', 'Entertainment']
  const unnecessaryTotal = monthlyTx.filter(t => t.type === 'expense' && unnecessaryCats.includes(t.category)).reduce((s, t) => s + Number(t.amount), 0)

  // ── Row 3: Market prices ─────────────────────────────────────
  const latestPrices = useMemo(() => {
    const seen = {}
    return marketPrices.filter(p => { if (seen[p.product]) return false; seen[p.product] = true; return true })
  }, [marketPrices])

  // ── Row 4: Wear It stats ─────────────────────────────────────
  const wearIt = businesses.find(b => b.name.toLowerCase().includes('wear it'))
  const wearItTx = wearIt ? monthlyTx.filter(t => t.business_id === wearIt.id) : []
  const wearItIncome = wearItTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const wearItExpense = wearItTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const wearItOrders = wearItTx.filter(t => t.type === 'income' && t.category === 'Sales Revenue').length

  // ── Row 5: Priority tasks per business ───────────────────────
  const bizTasks = useMemo(() => businesses.map(b => ({
    ...b,
    urgentHigh: tasks
      .filter(t => t.business_id === b.id && ['urgent', 'high'].includes(t.priority) && t.status !== 'done')
      .sort((a, b) => (PRIORITY_ORDER[a.priority] || 9) - (PRIORITY_ORDER[b.priority] || 9))
      .slice(0, 4)
  })), [businesses, tasks])

  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  async function refreshPrices() {
    setRefreshing(true)
    await loadMarketPrices()
    setRefreshing(false)
  }

  return (
    <div className="page-content" style={{ maxWidth: 1200 }}>

      {/* Greeting */}
      <div className="briefing-header">
        <div className="briefing-greeting">{greeting}, Ram 👋 — {format(now, 'EEEE, d MMMM yyyy')}</div>
        <div className="briefing-title">ELATZ Command Centre</div>
        <div className="briefing-subtitle">
          This month: <strong style={{ color: 'var(--green)' }}>₹{fmt(totalIncome)}</strong> in &nbsp;·&nbsp;
          <strong style={{ color: 'var(--red)' }}>₹{fmt(totalExpense)}</strong> out &nbsp;·&nbsp;
          <strong style={{ color: totalIncome - totalExpense >= 0 ? 'var(--green)' : 'var(--red)' }}>
            ₹{fmt(Math.abs(totalIncome - totalExpense))} {totalIncome - totalExpense >= 0 ? 'net' : 'deficit'}
          </strong>
        </div>
      </div>

      {/* ── ROW 1: Business Income / Expense ── */}
      <section className="section">
        <div className="section-title"><TrendingUp size={14} /> Business Finances — {format(now, 'MMMM yyyy')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.65rem' }}>
          {bizFinance.map(b => (
            <div key={b.id} style={{ background: 'var(--bg2)', border: `1px solid var(--border)`, borderTop: `3px solid ${b.color}`, borderRadius: 'var(--radius)', padding: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1rem' }}>{b.emoji}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: b.color, lineHeight: 1.2 }}>{b.name}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--text3)' }}>Income</span>
                  <span style={{ color: 'var(--green)', fontFamily: 'Space Mono, monospace', fontWeight: 700 }}>₹{fmt(b.income)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--text3)' }}>Expense</span>
                  <span style={{ color: 'var(--red)', fontFamily: 'Space Mono, monospace', fontWeight: 700 }}>₹{fmt(b.expense)}</span>
                </div>
                <div style={{ height: 1, background: 'var(--border)', margin: '0.25rem 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--text2)', fontWeight: 600 }}>Net</span>
                  <span style={{ color: b.net >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'Space Mono, monospace', fontWeight: 700 }}>₹{fmt(Math.abs(b.net))}</span>
                </div>
              </div>
            </div>
          ))}
          {/* Total card */}
          <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.3)', borderTop: '3px solid var(--gold)', borderRadius: 'var(--radius)', padding: '0.875rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gold)', marginBottom: '0.5rem' }}>⚡ TOTAL</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text3)' }}>Income</span>
                <span style={{ color: 'var(--green)', fontFamily: 'Space Mono, monospace', fontWeight: 700 }}>₹{fmt(totalIncome)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text3)' }}>Expense</span>
                <span style={{ color: 'var(--red)', fontFamily: 'Space Mono, monospace', fontWeight: 700 }}>₹{fmt(totalExpense)}</span>
              </div>
              <div style={{ height: 1, background: 'var(--border)', margin: '0.25rem 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--text2)', fontWeight: 600 }}>Net</span>
                <span style={{ color: totalIncome - totalExpense >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'Space Mono, monospace', fontWeight: 700 }}>₹{fmt(Math.abs(totalIncome - totalExpense))}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ROW 2: Debts / Fixed / Unnecessary ── */}
      <section className="section">
        <div className="section-title"><CreditCard size={14} /> Financial Obligations</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.65rem' }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius)', padding: '1rem' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>Total Debt</div>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '1.2rem', fontWeight: 700, color: 'var(--red)' }}>₹{fmt(totalDebt)}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: '0.2rem' }}>EMI: ₹{fmt(monthlyEMI)}/mo</div>
          </div>
          <div style={{ background: 'var(--bg2)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 'var(--radius)', padding: '1rem' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>Fixed Monthly</div>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '1.2rem', fontWeight: 700, color: 'var(--gold)' }}>₹{fmt(monthlyEMI + monthlySubs)}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: '0.2rem' }}>EMI + Subscriptions</div>
          </div>
          <div style={{ background: 'var(--bg2)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius)', padding: '1rem' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>Unnecessary Spend</div>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '1.2rem', fontWeight: 700, color: unnecessaryTotal > 0 ? 'var(--red)' : 'var(--green)' }}>₹{fmt(unnecessaryTotal)}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: '0.2rem' }}>This month</div>
          </div>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>Subscriptions</div>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)' }}>₹{fmt(monthlySubs)}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: '0.2rem' }}>{subscriptions.length} active</div>
          </div>
        </div>
      </section>

      {/* ── ROW 3: Market Prices (WBE) ── */}
      <section className="section">
        <div className="section-title" style={{ justifyContent: 'space-between' }}>
          <span>🌿 Market Prices — WBE Products</span>
          <button className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }} onClick={refreshPrices}>
            <RefreshCw size={12} className={refreshing ? 'spinning' : ''} /> Refresh
          </button>
        </div>
        {latestPrices.length === 0 ? (
          <div className="empty-card">
            Market prices will appear here daily at 10 AM once the agent scheduler is deployed.
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text3)' }}>Products tracked: Black Pepper • Green Cardamom • Coconut • Moringa • Lemon</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.6rem' }}>
            {latestPrices.map(p => (
              <div key={p.id} style={{ background: 'var(--bg2)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius)', padding: '0.875rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--green)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>{p.product}</div>
                <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '1.1rem', fontWeight: 700 }}>₹{fmt(p.price_per_kg)}/kg</div>
                {p.change_pct && (
                  <div style={{ fontSize: '0.7rem', color: p.change_pct > 0 ? 'var(--green)' : 'var(--red)', marginTop: '0.2rem' }}>
                    {p.change_pct > 0 ? '▲' : '▼'} {Math.abs(p.change_pct)}%
                  </div>
                )}
                <div style={{ fontSize: '0.65rem', color: 'var(--text3)', marginTop: '0.2rem' }}>{p.source} · {p.fetched_at ? format(parseISO(p.fetched_at), 'd MMM, h:mm a') : '—'}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── ROW 4: Wear It Stats ── */}
      <section className="section">
        <div className="section-title"><ShoppingCart size={14} /> Elatz Wear It — {format(now, 'MMMM')} Overview</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.65rem' }}>
          {[
            { label: 'Orders', value: wearItOrders, color: 'var(--blue)', suffix: '' },
            { label: 'Revenue', value: `₹${fmt(wearItIncome)}`, color: 'var(--green)', suffix: '' },
            { label: 'Expenses', value: `₹${fmt(wearItExpense)}`, color: 'var(--red)', suffix: '' },
            { label: 'Profit', value: `₹${fmt(Math.abs(wearItIncome - wearItExpense))}`, color: wearItIncome - wearItExpense >= 0 ? 'var(--green)' : 'var(--red)', suffix: '' },
          ].map(card => (
            <div key={card.label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.875rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>{card.label}</div>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.95rem', fontWeight: 700, color: card.color }}>{card.value}</div>
            </div>
          ))}
        </div>
        {!wearIt && <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>Shopify integration coming in Phase 3 — will auto-pull live orders.</div>}
      </section>

      {/* ── ROW 5: All Businesses Priority Tasks ── */}
      <section className="section">
        <div className="section-title">🔥 Priority Tasks by Business</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
          {bizTasks.map(b => (
            <div key={b.id} style={{ background: 'var(--bg2)', border: `1px solid var(--border)`, borderTop: `3px solid ${b.color}`, borderRadius: 'var(--radius)', padding: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                <span style={{ fontSize: '1rem' }}>{b.emoji}</span>
                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: b.color }}>{b.name}</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--text3)', background: 'var(--bg3)', padding: '0.1rem 0.4rem', borderRadius: 20 }}>
                  {tasks.filter(t => t.business_id === b.id && t.status !== 'done').length} pending
                </span>
              </div>
              {b.urgentHigh.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>✅ No urgent/high tasks</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {b.urgentHigh.map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8rem' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: PRIORITY_COLOR[t.priority], flexShrink: 0, marginTop: 5 }} />
                      <span style={{ color: 'var(--text2)', lineHeight: 1.4 }}>{t.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}
