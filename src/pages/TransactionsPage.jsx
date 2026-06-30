import { useState, useMemo, useRef } from 'react'
import { useApp, EXPENSE_CATEGORIES, INCOME_CATEGORIES, BANK_ACCOUNTS } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { format, parseISO } from 'date-fns'
import { Plus, X, Mic, Upload, TrendingUp, TrendingDown, Trash2 } from 'lucide-react'

function fmt(n) { return Number(n || 0).toLocaleString('en-IN') }

export default function TransactionsPage() {
  const { transactions, businesses, loadTransactions } = useApp()
  const [showAdd, setShowAdd] = useState(false)
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [filterBiz, setFilterBiz] = useState('all')
  const [filterType, setFilterType] = useState('all')

  // Add form
  const [form, setForm] = useState({ type: 'expense', amount: '', description: '', category: '', business_id: '', transaction_date: format(new Date(), 'yyyy-MM-dd'), bank_account: 'ICICI', is_unnecessary: false })

  // Natural language input
  const [nlInput, setNlInput] = useState('')
  const [nlParsing, setNlParsing] = useState(false)
  const [nlResult, setNlResult] = useState(null)

  // Statement upload
  const [showUpload, setShowUpload] = useState(false)
  const [uploadRows, setUploadRows] = useState([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const matchMonth = !filterMonth || t.transaction_date?.startsWith(filterMonth)
      const matchBiz = filterBiz === 'all' || t.business_id === filterBiz
      const matchType = filterType === 'all' || t.type === filterType
      return matchMonth && matchBiz && matchType
    })
  }, [transactions, filterMonth, filterBiz, filterType])

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

  async function saveTransaction(data) {
    await supabase.from('transactions').insert({
      ...data,
      amount: Number(data.amount),
      transaction_date: data.transaction_date || format(new Date(), 'yyyy-MM-dd'),
    })
    loadTransactions()
  }

  async function deleteTransaction(id) {
    await supabase.from('transactions').delete().eq('id', id)
    loadTransactions()
  }

  async function handleSave() {
    if (!form.amount || !form.description.trim()) return
    await saveTransaction(form)
    setForm({ type: 'expense', amount: '', description: '', category: '', business_id: '', transaction_date: format(new Date(), 'yyyy-MM-dd'), bank_account: 'ICICI', is_unnecessary: false })
    setShowAdd(false)
  }

  async function parseNaturalLanguage() {
    if (!nlInput.trim()) return
    setNlParsing(true)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 400,
          messages: [{
            role: 'user',
            content: `Parse this expense/income note into JSON. Today is ${format(new Date(), 'yyyy-MM-dd')}.
Business list: ${businesses.map(b => b.name).join(', ')}.
Note: "${nlInput}"

Return ONLY valid JSON:
{
  "type": "expense" or "income",
  "amount": number,
  "description": "clean description",
  "category": "best matching category from: Food, Shop Rent, Marketing, Travel, Energy Drinks, Junk Snacks, Online Shopping, Electricity Bill (Shop), Salary/Wages, Raw Materials, Transport & Logistics, Equipment, Sales Revenue, Client Payment, Miscellaneous",
  "business_id_name": "best matching business name or null if personal",
  "transaction_date": "yyyy-MM-dd",
  "is_unnecessary": true or false
}`
          }]
        })
      })
      const data = await res.json()
      const text = data.content?.[0]?.text || '{}'
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
      const biz = businesses.find(b => b.name.toLowerCase().includes((parsed.business_id_name || '').toLowerCase()))
      setNlResult({ ...parsed, business_id: biz?.id || '', business_name: biz?.name || 'Personal' })
    } catch (e) { console.error(e) }
    setNlParsing(false)
  }

  async function confirmNL() {
    if (!nlResult) return
    await saveTransaction({ type: nlResult.type, amount: nlResult.amount, description: nlResult.description, category: nlResult.category, business_id: nlResult.business_id || null, transaction_date: nlResult.transaction_date, bank_account: 'ICICI', is_unnecessary: nlResult.is_unnecessary })
    setNlInput(''); setNlResult(null)
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const text = await file.text()
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: `Parse this bank statement CSV/text and extract transactions. Return ONLY a JSON array of objects with: date (yyyy-MM-dd), description, amount (positive number), type ("income" or "expense"), category (guess from description), business (best match from: ${businesses.map(b=>b.name).join(', ')}, or "Personal").\n\nStatement:\n${text.slice(0, 3000)}`
          }]
        })
      })
      const data = await res.json()
      const txt = data.content?.[0]?.text || '[]'
      const rows = JSON.parse(txt.replace(/```json|```/g, '').trim())
      setUploadRows(rows.map(r => ({ ...r, business_id: businesses.find(b => b.name.toLowerCase().includes((r.business||'').toLowerCase()))?.id || '', confirmed: false })))
      setShowUpload(true)
    } catch (e) { console.error(e) }
    setUploading(false)
  }

  async function saveUploadRows() {
    const toSave = uploadRows.filter(r => !r.skip)
    for (const r of toSave) {
      await supabase.from('transactions').insert({ type: r.type, amount: Number(r.amount), description: r.description, category: r.category, business_id: r.business_id || null, transaction_date: r.date, bank_account: r.bank_account || 'ICICI' })
    }
    setShowUpload(false); setUploadRows([])
    loadTransactions()
  }

  // Group by date
  const grouped = useMemo(() => {
    const groups = {}
    filtered.forEach(t => {
      const d = t.transaction_date || 'unknown'
      if (!groups[d]) groups[d] = []
      groups[d].push(t)
    })
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }, [filtered])

  return (
    <div className="page-content" style={{ maxWidth: 900 }}>
      <div className="page-header">
        <h1 className="page-title">Transactions</h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn-ghost" style={{ fontSize: '0.82rem' }} onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload size={14} /> {uploading ? 'Parsing...' : 'Upload Statement'}
          </button>
          <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx" style={{ display: 'none' }} onChange={handleFileUpload} />
          <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus size={14} /> Add</button>
        </div>
      </div>

      {/* Natural Language Input */}
      <div style={{ background: 'var(--bg2)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 'var(--radius)', padding: '0.875rem' }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--gold)', fontWeight: 600, marginBottom: '0.5rem', fontFamily: 'Space Mono, monospace', letterSpacing: '0.08em' }}>⚡ QUICK ADD — TYPE NATURALLY</div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input className="form-input" style={{ flex: 1 }} placeholder='e.g. "Bought energy drinks and puffs for ₹84" or "Paid 550 for Wear It shop rental"' value={nlInput} onChange={e => setNlInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && parseNaturalLanguage()} />
          <button className="btn-primary" onClick={parseNaturalLanguage} disabled={nlParsing || !nlInput.trim()}>{nlParsing ? '⏳' : '→'}</button>
        </div>
        {nlResult && (
          <div style={{ marginTop: '0.75rem', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.4rem', fontSize: '0.8rem' }}>
              <div><span style={{ color: 'var(--text3)' }}>Type: </span><strong style={{ color: nlResult.type === 'income' ? 'var(--green)' : 'var(--red)', textTransform: 'capitalize' }}>{nlResult.type}</strong></div>
              <div><span style={{ color: 'var(--text3)' }}>Amount: </span><strong>₹{fmt(nlResult.amount)}</strong></div>
              <div><span style={{ color: 'var(--text3)' }}>Date: </span><strong>{nlResult.transaction_date}</strong></div>
              <div><span style={{ color: 'var(--text3)' }}>Category: </span><strong>{nlResult.category}</strong></div>
              <div><span style={{ color: 'var(--text3)' }}>Business: </span><strong>{nlResult.business_name}</strong></div>
              <div><span style={{ color: 'var(--text3)' }}>Unnecessary: </span><strong>{nlResult.is_unnecessary ? '⚠ Yes' : 'No'}</strong></div>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text2)' }}>"{nlResult.description}"</div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn-primary" style={{ fontSize: '0.82rem' }} onClick={confirmNL}>✓ Confirm & Save</button>
              <button className="btn-ghost" style={{ fontSize: '0.82rem' }} onClick={() => setNlResult(null)}>Edit</button>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="tx-summary">
        <div className="tx-sum-item income"><TrendingUp size={18} /><div><div className="tx-sum-label">Income</div><div className="tx-sum-val" style={{ color: 'var(--green)' }}>₹{fmt(totalIncome)}</div></div></div>
        <div className="tx-sum-divider" />
        <div className="tx-sum-item expense"><TrendingDown size={18} /><div><div className="tx-sum-label">Expense</div><div className="tx-sum-val" style={{ color: 'var(--red)' }}>₹{fmt(totalExpense)}</div></div></div>
        <div className="tx-sum-divider" />
        <div className="tx-sum-item"><div><div className="tx-sum-label">Net</div><div className="tx-sum-val" style={{ color: totalIncome - totalExpense >= 0 ? 'var(--green)' : 'var(--red)' }}>₹{fmt(Math.abs(totalIncome - totalExpense))}</div></div></div>
      </div>

      {/* Filters */}
      <div className="filter-row">
        <input type="month" className="form-input filter-month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} />
        <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">All</option><option value="income">Income</option><option value="expense">Expense</option>
        </select>
        <select className="form-select" value={filterBiz} onChange={e => setFilterBiz(e.target.value)}>
          <option value="all">All Businesses</option>
          {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Transactions list */}
      {grouped.length === 0 ? (
        <div className="empty-card">No transactions for this period.</div>
      ) : (
        grouped.map(([date, txs]) => (
          <div key={date} className="tx-date-group">
            <div className="tx-date-header">{date === 'unknown' ? 'No date' : format(parseISO(date), 'EEEE, d MMM yyyy')}</div>
            {txs.map(t => (
              <div key={t.id} className={`tx-item ${t.type}`}>
                <div className="tx-left">
                  <div className="tx-type-icon">{t.type === 'income' ? '↑' : '↓'}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="tx-desc">{t.description}</div>
                    <div className="tx-meta-row">
                      {t.category && <span className="tx-cat">{t.category}</span>}
                      {t.businesses?.name && <span className="tx-biz" style={{ color: t.businesses.color, fontSize: '0.68rem' }}>{t.businesses.emoji} {t.businesses.name}</span>}
                      {t.bank_account && <span className="tx-cat">{t.bank_account}</span>}
                      {t.is_unnecessary && <span style={{ fontSize: '0.65rem', color: 'var(--red)' }}>⚠ Unnecessary</span>}
                    </div>
                  </div>
                </div>
                <div className="tx-right">
                  <span className={`tx-amount ${t.type}`}>₹{fmt(t.amount)}</span>
                  <button className="icon-btn danger" onClick={() => deleteTransaction(t.id)}><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        ))
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Add Transaction</h3><button onClick={() => setShowAdd(false)}><X size={18}/></button></div>
            <div className="type-toggle">
              <button className={`type-btn ${form.type === 'expense' ? 'active expense' : ''}`} onClick={() => setForm(p => ({...p, type: 'expense'}))}>Expense</button>
              <button className={`type-btn ${form.type === 'income' ? 'active income' : ''}`} onClick={() => setForm(p => ({...p, type: 'income'}))}>Income</button>
            </div>
            <input className="form-input" placeholder="Description *" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} />
            <div className="form-row">
              <input className="form-input" type="number" placeholder="Amount (₹) *" value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))} />
              <input type="date" className="form-input" value={form.transaction_date} onChange={e => setForm(p => ({...p, transaction_date: e.target.value}))} />
            </div>
            <select className="form-select" value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))}>
              <option value="">Category...</option>
              {(form.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(c => <option key={c}>{c}</option>)}
            </select>
            <div className="form-row">
              <select className="form-select" value={form.business_id} onChange={e => setForm(p => ({...p, business_id: e.target.value}))}>
                <option value="">Personal / No business</option>
                {businesses.map(b => <option key={b.id} value={b.id}>{b.emoji} {b.name}</option>)}
              </select>
              <select className="form-select" value={form.bank_account} onChange={e => setForm(p => ({...p, bank_account: e.target.value}))}>
                {BANK_ACCOUNTS.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <label className="form-check-row"><input type="checkbox" checked={form.is_unnecessary} onChange={e => setForm(p => ({...p, is_unnecessary: e.target.checked}))} /> Mark as unnecessary spend</label>
            <button className="btn-primary" onClick={handleSave} style={{ justifyContent: 'center' }}>Save Transaction</button>
          </div>
        </div>
      )}

      {/* Statement Upload Review */}
      {showUpload && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="modal" style={{ maxWidth: 700, maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Review Parsed Transactions ({uploadRows.length})</h3><button onClick={() => setShowUpload(false)}><X size={18}/></button></div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>Review and edit below. Uncheck rows to skip them.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '55vh', overflowY: 'auto' }}>
              {uploadRows.map((row, i) => (
                <div key={i} style={{ background: row.skip ? 'var(--bg4)' : 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.6rem 0.75rem', opacity: row.skip ? 0.4 : 1 }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <input type="checkbox" checked={!row.skip} onChange={e => setUploadRows(p => p.map((r, idx) => idx === i ? {...r, skip: !e.target.checked} : r))} />
                    <input className="form-input" style={{ flex: 2, fontSize: '0.8rem', padding: '0.35rem 0.5rem' }} value={row.description} onChange={e => setUploadRows(p => p.map((r, idx) => idx === i ? {...r, description: e.target.value} : r))} />
                    <input className="form-input" style={{ width: 90, fontSize: '0.8rem', padding: '0.35rem 0.5rem' }} type="number" value={row.amount} onChange={e => setUploadRows(p => p.map((r, idx) => idx === i ? {...r, amount: e.target.value} : r))} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', paddingLeft: '1.5rem' }}>
                    <input className="form-input" style={{ fontSize: '0.75rem', padding: '0.25rem 0.4rem' }} type="date" value={row.date} onChange={e => setUploadRows(p => p.map((r, idx) => idx === i ? {...r, date: e.target.value} : r))} />
                    <select className="form-select" style={{ fontSize: '0.75rem', padding: '0.25rem 0.4rem' }} value={row.type} onChange={e => setUploadRows(p => p.map((r, idx) => idx === i ? {...r, type: e.target.value} : r))}>
                      <option value="expense">Expense</option><option value="income">Income</option>
                    </select>
                    <select className="form-select" style={{ fontSize: '0.75rem', padding: '0.25rem 0.4rem' }} value={row.business_id} onChange={e => setUploadRows(p => p.map((r, idx) => idx === i ? {...r, business_id: e.target.value} : r))}>
                      <option value="">Personal</option>
                      {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <select className="form-select" style={{ fontSize: '0.75rem', padding: '0.25rem 0.4rem' }} value={row.bank_account || 'ICICI'} onChange={e => setUploadRows(p => p.map((r, idx) => idx === i ? {...r, bank_account: e.target.value} : r))}>
                      {BANK_ACCOUNTS.map(a => <option key={a}>{a}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn-primary" onClick={saveUploadRows} style={{ justifyContent: 'center' }}>
              Save {uploadRows.filter(r => !r.skip).length} Transactions
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
