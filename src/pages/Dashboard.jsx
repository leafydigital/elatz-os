import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns'
import { TrendingUp, TrendingDown, AlertCircle, CreditCard, Calendar, Zap } from 'lucide-react'

export default function Dashboard() {
  const { debts, transactions, subscriptions, businesses } = useApp()
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)

  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const monthlyTx = useMemo(() =>
    transactions.filter(t => {
      try {
        return isWithinInterval(parseISO(t.transaction_date), { start: monthStart, end: monthEnd })
      } catch { return false }
    }), [transactions])

  const totalIncome = monthlyTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = monthlyTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const netAmount = totalIncome - totalExpense
  const totalDebt = debts.reduce((s, d) => s + Number(d.remaining_amount), 0)
  const monthlyEMI = debts.reduce((s, d) => s + Number(d.emi_monthly || 0), 0)
  const monthlySubscriptions = subscriptions
    .filter(s => s.billing_cycle === 'monthly')
    .reduce((sum, s) => sum + Number(s.amount), 0)

  // Simple unnecessary spend detection without AI
  const unnecessarySpends = monthlyTx.filter(t => {
    if (t.type !== 'expense') return false
    const unnecessaryCategories = ['Energy Drinks', 'Junk Snacks', 'Online Shopping', 'Entertainment', 'Miscellaneous']
    if (unnecessaryCategories.includes(t.category)) return true
    const desc = (t.description || '').toLowerCase()
    const keywords = ['energy drink', 'junk', 'snack', 'amazon', 'flipkart', 'zomato', 'swiggy', 'clothes', 'fashion', 'random', 'impulse']
    return keywords.some(k => desc.includes(k))
  })
  const unnecessaryTotal = unnecessarySpends.reduce((s, t) => s + Number(t.amount), 0)

  async function runAIAnalysis() {
    setAnalyzing(true)
    try {
      const expenseData = monthlyTx
        .filter(t => t.type === 'expense')
        .map(t => `${t.description || 'No desc'} - ₹${t.amount} (${t.category || 'Uncategorized'})`)
        .join('\n')

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `Analyze these monthly expenses for an Indian entrepreneur and identify unnecessary spending. Be specific and actionable. Return JSON only:
{
  "unnecessary_items": [{"description": "...", "amount": 0, "reason": "..."}],
  "total_unnecessary": 0,
  "savings_tip": "one actionable tip",
  "pattern": "one spending pattern observation"
}

Expenses:
${expenseData || 'No expenses this month yet'}`
          }]
        })
      })
      const data = await response.json()
      const text = data.content?.[0]?.text || '{}'
      const clean = text.replace(/```json|```/g, '').trim()
      setAiAnalysis(JSON.parse(clean))
    } catch (e) {
      console.error(e)
    }
    setAnalyzing(false)
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <span className="page-subtitle">{format(now, 'MMMM yyyy')}</span>
      </div>

      {/* Debt Overview */}
      <section className="section">
        <h2 className="section-title"><CreditCard size={16} /> Active Debts & EMIs</h2>
        {debts.length === 0 ? (
          <div className="empty-card">No debts recorded. Add from Debts tab.</div>
        ) : (
          <div className="debt-grid">
            {debts.map(debt => (
              <div key={debt.id} className="debt-card">
                <div className="debt-name">{debt.name}</div>
                <div className="debt-remaining">₹{Number(debt.remaining_amount).toLocaleString('en-IN')}</div>
                <div className="debt-meta">
                  {debt.emi_monthly ? <span className="debt-emi">EMI ₹{Number(debt.emi_monthly).toLocaleString('en-IN')}/mo</span> : null}
                  {debt.interest_rate ? <span className="debt-rate">{debt.interest_rate}% p.a.</span> : null}
                </div>
                <div className="debt-progress-bar">
                  <div
                    className="debt-progress-fill"
                    style={{ width: `${Math.min(100, ((Number(debt.total_amount) - Number(debt.remaining_amount)) / Number(debt.total_amount)) * 100)}%` }}
                  />
                </div>
                <div className="debt-percent">
                  {Math.round(((Number(debt.total_amount) - Number(debt.remaining_amount)) / Number(debt.total_amount)) * 100)}% paid
                </div>
              </div>
            ))}
          </div>
        )}
        {debts.length > 0 && (
          <div className="debt-summary-row">
            <span>Total Debt: <strong>₹{totalDebt.toLocaleString('en-IN')}</strong></span>
            <span>Monthly EMI: <strong>₹{monthlyEMI.toLocaleString('en-IN')}</strong></span>
          </div>
        )}
      </section>

      {/* Monthly Financial Summary */}
      <section className="section">
        <h2 className="section-title"><Calendar size={16} /> This Month</h2>
        <div className="summary-grid">
          <div className="summary-card income-card">
            <TrendingUp size={20} />
            <div className="summary-label">Income</div>
            <div className="summary-amount">₹{totalIncome.toLocaleString('en-IN')}</div>
          </div>
          <div className="summary-card expense-card">
            <TrendingDown size={20} />
            <div className="summary-label">Expenses</div>
            <div className="summary-amount">₹{totalExpense.toLocaleString('en-IN')}</div>
          </div>
          <div className={`summary-card ${netAmount >= 0 ? 'profit-card' : 'loss-card'}`}>
            <AlertCircle size={20} />
            <div className="summary-label">{netAmount >= 0 ? 'In-Hand' : 'Deficit'}</div>
            <div className="summary-amount">₹{Math.abs(netAmount).toLocaleString('en-IN')}</div>
          </div>
          <div className="summary-card subs-card">
            <Zap size={20} />
            <div className="summary-label">Subscriptions</div>
            <div className="summary-amount">₹{monthlySubscriptions.toLocaleString('en-IN')}</div>
          </div>
        </div>
      </section>

      {/* Unnecessary Spend */}
      <section className="section">
        <h2 className="section-title">
          <AlertCircle size={16} /> Unnecessary Spending
          <button className="ai-analyze-btn" onClick={runAIAnalysis} disabled={analyzing}>
            {analyzing ? '⏳ Analyzing...' : '🤖 AI Analyze'}
          </button>
        </h2>

        {unnecessarySpends.length > 0 && (
          <div className="unnecessary-list">
            {unnecessarySpends.slice(0, 5).map(t => (
              <div key={t.id} className="unnecessary-item">
                <span className="unneeded-desc">{t.description || t.category}</span>
                <span className="unneeded-amount">₹{Number(t.amount).toLocaleString('en-IN')}</span>
              </div>
            ))}
            <div className="unnecessary-total">
              Detected unnecessary: <strong>₹{unnecessaryTotal.toLocaleString('en-IN')}</strong>
              {' '}({totalExpense > 0 ? Math.round((unnecessaryTotal / totalExpense) * 100) : 0}% of expenses)
            </div>
          </div>
        )}

        {aiAnalysis && (
          <div className="ai-analysis-card">
            <div className="ai-badge">🤖 AI Analysis</div>
            {aiAnalysis.pattern && <p className="ai-pattern">📊 {aiAnalysis.pattern}</p>}
            {aiAnalysis.savings_tip && <p className="ai-tip">💡 {aiAnalysis.savings_tip}</p>}
            {aiAnalysis.unnecessary_items?.length > 0 && (
              <div className="ai-items">
                {aiAnalysis.unnecessary_items.map((item, i) => (
                  <div key={i} className="ai-item">
                    <span>{item.description}</span>
                    <span className="ai-item-reason">{item.reason}</span>
                    <span className="ai-item-amount">₹{item.amount}</span>
                  </div>
                ))}
              </div>
            )}
            {aiAnalysis.total_unnecessary > 0 && (
              <div className="ai-total">AI flagged: ₹{Number(aiAnalysis.total_unnecessary).toLocaleString('en-IN')}</div>
            )}
          </div>
        )}

        {unnecessarySpends.length === 0 && !aiAnalysis && (
          <div className="empty-card">No obvious unnecessary spends detected this month. Run AI analysis for deeper insights.</div>
        )}
      </section>

      {/* Subscriptions */}
      <section className="section">
        <h2 className="section-title">📱 Active Subscriptions</h2>
        <div className="subs-list">
          {subscriptions.map(sub => (
            <div key={sub.id} className="sub-item">
              <span className="sub-emoji">{sub.emoji}</span>
              <span className="sub-name">{sub.name}</span>
              <span className="sub-cycle">{sub.billing_cycle}</span>
              <span className="sub-amount">₹{Number(sub.amount).toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>
        <div className="subs-total">Monthly subscriptions: <strong>₹{monthlySubscriptions.toLocaleString('en-IN')}</strong></div>
      </section>
    </div>
  )
}
