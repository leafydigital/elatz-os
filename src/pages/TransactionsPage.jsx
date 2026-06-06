import { useState, useMemo } from 'react'
import { useApp, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { Plus, Filter, TrendingUp, TrendingDown, Trash2, X, ChevronDown } from 'lucide-react'
import { format, parseISO } from 'date-fns'

export default function TransactionsPage() {
  const { transactions, businesses, loadTransactions } = useApp()
  const [showAdd, setShowAdd] = useState(false)
  const [filterType, setFilterType] = useState('all')
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [form, setForm] = useState({
    type: 'expense', amount: '', description: '', category: '',
    business_id: '', transaction_date: format(new Date(), 'yyyy-MM-dd')
  })

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const matchType = filterType === 'all' || t.type === filterType
      const matchMonth = t.transaction_date?.startsWith(filterMonth)
      return matchType && matchMonth
    })
  }, [transactions, filterType, filterMonth])

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

  async function addTransaction() {
    if (!form.amount || !form.type) return
    await supabase.from('transactions').insert({
      ...form,
      amount: parseFloat(form.amount),
      business_id: form.business_id || null
    })
    setForm({ type: 'expense', amount: '', description: '', category: '', business_id: '', transaction_date: format(new Date(), 'yyyy-MM-dd') })
    setShowAdd(false)
    loadTransactions()
  }

  async function deleteTransaction(id) {
    await supabase.from('transactions').delete().eq('id', id)
    loadTransactions()
  }

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  // Group by date
  const grouped = useMemo(() => {
    const groups = {}
    filtered.forEach(t => {
      const date = t.transaction_date || 'Unknown'
      if (!groups[date]) groups[date] = []
      groups[date].push(t)
    })
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Money Tracker</h1>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Add
        </button>
      </div>

      {/* Summary */}
      <div className="tx-summary">
        <div className="tx-sum-item income">
          <TrendingUp size={16} />
          <div>
            <div className="tx-sum-label">Income</div>
            <div className="tx-sum-val">₹{totalIncome.toLocaleString('en-IN')}</div>
          </div>
        </div>
        <div className="tx-sum-divider" />
        <div className="tx-sum-item expense">
          <TrendingDown size={16} />
          <div>
            <div className="tx-sum-label">Expense</div>
            <div className="tx-sum-val">₹{totalExpense.toLocaleString('en-IN')}</div>
          </div>
        </div>
        <div className="tx-sum-divider" />
        <div className={`tx-sum-item ${totalIncome - totalExpense >= 0 ? 'income' : 'expense'}`}>
          <div>
            <div className="tx-sum-label">Balance</div>
            <div className="tx-sum-val">₹{(totalIncome - totalExpense).toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-row">
        <input
          type="month"
          className="form-input filter-month"
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
        />
        <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">All</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </div>

      {/* Transactions grouped by date */}
      {grouped.length === 0 && <div className="empty-card">No transactions for this period.</div>}
      {grouped.map(([date, txs]) => (
        <div key={date} className="tx-date-group">
          <div className="tx-date-header">
            {date !== 'Unknown' ? format(parseISO(date), 'EEE, d MMM yyyy') : 'Unknown Date'}
          </div>
          {txs.map(t => (
            <div key={t.id} className={`tx-item ${t.type}`}>
              <div className="tx-left">
                <div className="tx-type-icon">{t.type === 'income' ? '↑' : '↓'}</div>
                <div>
                  <div className="tx-desc">{t.description || t.category || 'No description'}</div>
                  <div className="tx-meta-row">
                    {t.category && <span className="tx-cat">{t.category}</span>}
                    {t.businesses && <span className="tx-biz" style={{ color: t.businesses.color }}>
                      {t.businesses.emoji} {t.businesses.name}
                    </span>}
                  </div>
                </div>
              </div>
              <div className="tx-right">
                <div className={`tx-amount ${t.type}`}>
                  {t.type === 'income' ? '+' : '-'}₹{Number(t.amount).toLocaleString('en-IN')}
                </div>
                <button className="icon-btn danger" onClick={() => deleteTransaction(t.id)}><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Add Transaction Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Transaction</h3>
              <button onClick={() => setShowAdd(false)}><X size={18} /></button>
            </div>

            <div className="type-toggle">
              <button className={`type-btn ${form.type === 'expense' ? 'active expense' : ''}`} onClick={() => setForm(p => ({ ...p, type: 'expense', category: '' }))}>
                Expense
              </button>
              <button className={`type-btn ${form.type === 'income' ? 'active income' : ''}`} onClick={() => setForm(p => ({ ...p, type: 'income', category: '' }))}>
                Income
              </button>
            </div>

            <input
              className="form-input"
              type="number"
              placeholder="Amount (₹) *"
              value={form.amount}
              onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
            />
            <input
              className="form-input"
              placeholder="Description"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            />
            <select className="form-select" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
              <option value="">Select Category</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="form-select" value={form.business_id} onChange={e => setForm(p => ({ ...p, business_id: e.target.value }))}>
              <option value="">No Business (Personal)</option>
              {businesses.map(b => <option key={b.id} value={b.id}>{b.emoji} {b.name}</option>)}
            </select>
            <input
              type="date"
              className="form-input"
              value={form.transaction_date}
              onChange={e => setForm(p => ({ ...p, transaction_date: e.target.value }))}
            />
            <div className="form-actions">
              <button className="btn-primary" onClick={addTransaction}>Add</button>
              <button className="btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
