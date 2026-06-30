import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { X, Download, Plus, ExternalLink, ChevronRight, ArrowLeft, Package, FileText, Bot, Lightbulb } from 'lucide-react'

function fmt(n) { return Number(n || 0).toLocaleString('en-IN') }

function BusinessDetail({ biz, onBack }) {
  const { transactions, tasks, products, invoices } = useApp()
  const [tab, setTab] = useState('overview')
  const [aiSuggestion, setAiSuggestion] = useState('')
  const [loadingAI, setLoadingAI] = useState(false)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [showAddInvoice, setShowAddInvoice] = useState(false)
  const [productForm, setProductForm] = useState({ name: '', sku: '', price: '', unit: 'kg', stock: '', description: '' })
  const [invoiceForm, setInvoiceForm] = useState({ invoice_number: '', buyer_name: '', amount: '', status: 'pending', invoice_date: format(new Date(), 'yyyy-MM-dd'), notes: '' })

  // Last 6 months data
  const monthlyData = useMemo(() => {
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i)
      const start = startOfMonth(d); const end = endOfMonth(d)
      const mtx = transactions.filter(t => {
        if (t.business_id !== biz.id) return false
        try { return isWithinInterval(parseISO(t.transaction_date), { start, end }) } catch { return false }
      })
      months.push({
        month: format(d, 'MMM'),
        income: mtx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
        expense: mtx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
      })
    }
    return months
  }, [transactions, biz.id])

  const thisMonthTx = useMemo(() => {
    const start = startOfMonth(new Date()); const end = endOfMonth(new Date())
    return transactions.filter(t => {
      if (t.business_id !== biz.id) return false
      try { return isWithinInterval(parseISO(t.transaction_date), { start, end }) } catch { return false }
    })
  }, [transactions, biz.id])

  const income = thisMonthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const expense = thisMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const bizTasks = tasks.filter(t => t.business_id === biz.id)
  const bizProducts = products.filter(p => p.business_id === biz.id)
  const bizInvoices = invoices.filter(i => i.business_id === biz.id)

  async function getAISuggestions() {
    setLoadingAI(true)
    try {
      const summary = `Business: ${biz.name}\nThis month income: ₹${fmt(income)}\nExpense: ₹${fmt(expense)}\nPending tasks: ${bizTasks.filter(t => t.status !== 'done').length}\nProducts: ${bizProducts.length}\nInvoices pending: ${bizInvoices.filter(i => i.status === 'pending').length}`
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 600,
          messages: [{ role: 'user', content: `You are a business advisor for an Indian entrepreneur. Given this business snapshot, give 3-4 specific, actionable next steps to improve or grow this business. Be concrete, not generic. Context: ${summary}\nFormat as bullet points.` }]
        })
      })
      const data = await res.json()
      setAiSuggestion(data.content?.[0]?.text || '')
    } catch (e) { console.error(e) }
    setLoadingAI(false)
  }

  async function saveProduct() {
    if (!productForm.name.trim()) return
    await supabase.from('os_products').insert({ ...productForm, business_id: biz.id, price: Number(productForm.price) || 0, stock: Number(productForm.stock) || 0 })
    setShowAddProduct(false)
    setProductForm({ name: '', sku: '', price: '', unit: 'kg', stock: '', description: '' })
    window.location.reload()
  }

  async function saveInvoice() {
    if (!invoiceForm.invoice_number.trim()) return
    await supabase.from('os_invoices').insert({ ...invoiceForm, business_id: biz.id, amount: Number(invoiceForm.amount) || 0 })
    setShowAddInvoice(false)
    setInvoiceForm({ invoice_number: '', buyer_name: '', amount: '', status: 'pending', invoice_date: format(new Date(), 'yyyy-MM-dd'), notes: '' })
    window.location.reload()
  }

  async function downloadReport() {
    const rows = [
      ['Date', 'Type', 'Description', 'Category', 'Amount'],
      ...thisMonthTx.map(t => [t.transaction_date, t.type, t.description, t.category, t.amount])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${biz.name}-${format(new Date(), 'yyyy-MM')}.csv`; a.click()
  }

  const TABS = ['overview', 'products', 'invoices', 'tasks', 'improve']

  return (
    <div className="page-content" style={{ maxWidth: 1000 }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="icon-btn" onClick={onBack}><ArrowLeft size={18} /></button>
          <span style={{ fontSize: '1.5rem' }}>{biz.emoji}</span>
          <div>
            <h1 className="page-title" style={{ color: biz.color }}>{biz.name}</h1>
            <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>Business Detail View</div>
          </div>
        </div>
        <button className="btn-ghost" onClick={downloadReport} style={{ fontSize: '0.82rem' }}><Download size={14} /> Export CSV</button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.6rem' }}>
        {[
          { l: 'Revenue', v: `₹${fmt(income)}`, c: 'var(--green)' },
          { l: 'Expenses', v: `₹${fmt(expense)}`, c: 'var(--red)' },
          { l: 'Net', v: `₹${fmt(Math.abs(income - expense))}`, c: income - expense >= 0 ? 'var(--green)' : 'var(--red)' },
          { l: 'Pending Tasks', v: bizTasks.filter(t => t.status !== 'done').length, c: 'var(--gold)' },
        ].map(s => (
          <div key={s.l} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.875rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>{s.l}</div>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '1rem', fontWeight: 700, color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '0.4rem 0.9rem', borderRadius: 20, border: '1px solid', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', background: tab === t ? biz.color + '22' : 'transparent', borderColor: tab === t ? biz.color : 'var(--border)', color: tab === t ? biz.color : 'var(--text3)', fontWeight: tab === t ? 600 : 400, textTransform: 'capitalize' }}>
            {t === 'improve' ? '💡 Improve' : t}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem' }}>
            <div className="section-title" style={{ marginBottom: '0.75rem' }}>Income vs Expense — Last 6 Months</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text3)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text3)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }} formatter={(v) => `₹${fmt(v)}`} />
                <Bar dataKey="income" fill={biz.color} radius={[4,4,0,0]} name="Income" />
                <Bar dataKey="expense" fill="#ef4444" opacity={0.7} radius={[4,4,0,0]} name="Expense" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Business details */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="section-title">Business Details</div>
            {biz.website_url && <div style={{ fontSize: '0.85rem' }}>🌐 <a href={biz.website_url} target="_blank" rel="noreferrer" style={{ color: biz.color }}>{biz.website_url}</a></div>}
            {biz.gst_number && <div style={{ fontSize: '0.85rem', color: 'var(--text2)' }}>GST: {biz.gst_number}</div>}
            {biz.description && <div style={{ fontSize: '0.85rem', color: 'var(--text2)' }}>{biz.description}</div>}
            {!biz.website_url && !biz.gst_number && <div style={{ fontSize: '0.82rem', color: 'var(--text3)' }}>Edit this business in Manage → Businesses to add website, GST, and other details.</div>}
          </div>
        </div>
      )}

      {/* Products */}
      {tab === 'products' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" onClick={() => setShowAddProduct(true)}><Plus size={14} /> Add Product</button>
          </div>
          {bizProducts.length === 0
            ? <div className="empty-card">No products yet. Add products to track stock and pricing.</div>
            : bizProducts.map(p => (
              <div key={p.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.875rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>{p.name}</div>
                  {p.sku && <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>SKU: {p.sku}</div>}
                  {p.description && <div style={{ fontSize: '0.78rem', color: 'var(--text2)', marginTop: '0.2rem' }}>{p.description}</div>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'Space Mono, monospace', fontWeight: 700, color: biz.color }}>₹{fmt(p.price)}/{p.unit}</div>
                  {p.stock && <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>Stock: {p.stock}</div>}
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* Invoices */}
      {tab === 'invoices' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" onClick={() => setShowAddInvoice(true)}><Plus size={14} /> Add Invoice</button>
          </div>
          {bizInvoices.length === 0
            ? <div className="empty-card">No invoices yet.</div>
            : bizInvoices.map(inv => (
              <div key={inv.id} style={{ background: 'var(--bg2)', border: `1px solid ${inv.status === 'paid' ? 'rgba(16,185,129,0.3)' : inv.status === 'overdue' ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: '0.875rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>#{inv.invoice_number}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text2)' }}>{inv.buyer_name} · {inv.invoice_date}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Space Mono, monospace', fontWeight: 700, color: 'var(--text)' }}>₹{fmt(inv.amount)}</div>
                  <div style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: 20, marginTop: '0.2rem', display: 'inline-block', background: inv.status === 'paid' ? 'rgba(16,185,129,0.15)' : inv.status === 'overdue' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', color: inv.status === 'paid' ? 'var(--green)' : inv.status === 'overdue' ? 'var(--red)' : 'var(--amber)' }}>
                    {inv.status}
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* Tasks */}
      {tab === 'tasks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {bizTasks.length === 0
            ? <div className="empty-card">No tasks for this business.</div>
            : bizTasks.map(t => (
              <div key={t.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: t.status === 'done' ? 0.55 : 1 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.priority === 'urgent' ? 'var(--red)' : t.priority === 'high' ? 'var(--amber)' : t.priority === 'medium' ? 'var(--blue)' : 'var(--text3)', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: '0.85rem', textDecoration: t.status === 'done' ? 'line-through' : 'none', color: 'var(--text2)' }}>{t.title}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text3)', background: 'var(--bg3)', padding: '0.1rem 0.4rem', borderRadius: 20, textTransform: 'capitalize' }}>{t.priority}</span>
              </div>
            ))
          }
        </div>
      )}

      {/* Improve */}
      {tab === 'improve' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 'var(--radius)', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Lightbulb size={16} style={{ color: 'var(--gold)' }} />
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--gold)' }}>AI Growth Suggestions</span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text3)', marginBottom: '0.75rem' }}>Get AI-powered next steps and improvement ideas specific to {biz.name}</p>
            <button className="btn-primary" onClick={getAISuggestions} disabled={loadingAI}>
              {loadingAI ? '⏳ Analysing...' : '🤖 Generate Suggestions'}
            </button>
          </div>
          {aiSuggestion && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem' }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--text2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{aiSuggestion}</div>
            </div>
          )}
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="modal-overlay" onClick={() => setShowAddProduct(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Add Product</h3><button onClick={() => setShowAddProduct(false)}><X size={18}/></button></div>
            <input className="form-input" placeholder="Product name *" value={productForm.name} onChange={e => setProductForm(p => ({...p, name: e.target.value}))} />
            <div className="form-row">
              <input className="form-input" placeholder="SKU / Code" value={productForm.sku} onChange={e => setProductForm(p => ({...p, sku: e.target.value}))} />
              <select className="form-select" value={productForm.unit} onChange={e => setProductForm(p => ({...p, unit: e.target.value}))}>
                {['kg','g','piece','box','litre','dozen','bag'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div className="form-row">
              <input className="form-input" type="number" placeholder="Price per unit (₹)" value={productForm.price} onChange={e => setProductForm(p => ({...p, price: e.target.value}))} />
              <input className="form-input" type="number" placeholder="Stock qty" value={productForm.stock} onChange={e => setProductForm(p => ({...p, stock: e.target.value}))} />
            </div>
            <textarea className="form-textarea" placeholder="Description" value={productForm.description} onChange={e => setProductForm(p => ({...p, description: e.target.value}))} />
            <button className="btn-primary" onClick={saveProduct} style={{justifyContent:'center'}}>Add Product</button>
          </div>
        </div>
      )}

      {/* Add Invoice Modal */}
      {showAddInvoice && (
        <div className="modal-overlay" onClick={() => setShowAddInvoice(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Add Invoice</h3><button onClick={() => setShowAddInvoice(false)}><X size={18}/></button></div>
            <div className="form-row">
              <input className="form-input" placeholder="Invoice # *" value={invoiceForm.invoice_number} onChange={e => setInvoiceForm(p => ({...p, invoice_number: e.target.value}))} />
              <input type="date" className="form-input" value={invoiceForm.invoice_date} onChange={e => setInvoiceForm(p => ({...p, invoice_date: e.target.value}))} />
            </div>
            <input className="form-input" placeholder="Buyer / Customer name" value={invoiceForm.buyer_name} onChange={e => setInvoiceForm(p => ({...p, buyer_name: e.target.value}))} />
            <div className="form-row">
              <input className="form-input" type="number" placeholder="Amount (₹)" value={invoiceForm.amount} onChange={e => setInvoiceForm(p => ({...p, amount: e.target.value}))} />
              <select className="form-select" value={invoiceForm.status} onChange={e => setInvoiceForm(p => ({...p, status: e.target.value}))}>
                {['pending','paid','overdue','cancelled'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <textarea className="form-textarea" placeholder="Notes" value={invoiceForm.notes} onChange={e => setInvoiceForm(p => ({...p, notes: e.target.value}))} />
            <button className="btn-primary" onClick={saveInvoice} style={{justifyContent:'center'}}>Add Invoice</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function BusinessesPage() {
  const { businesses, tasks, transactions, notes } = useApp()
  const [selected, setSelected] = useState(null)

  if (selected) return <BusinessDetail biz={selected} onBack={() => setSelected(null)} />

  const now = new Date()
  const monthStart = startOfMonth(now); const monthEnd = endOfMonth(now)

  const bizCards = businesses.map(b => {
    const btx = transactions.filter(t => {
      if (t.business_id !== b.id) return false
      try { return isWithinInterval(parseISO(t.transaction_date), { start: monthStart, end: monthEnd }) } catch { return false }
    })
    const income = btx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const expense = btx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    const pending = tasks.filter(t => t.business_id === b.id && t.status !== 'done').length
    const urgent = tasks.filter(t => t.business_id === b.id && t.priority === 'urgent' && t.status !== 'done').length
    const note = notes.find(n => n.business_id === b.id)
    return { ...b, income, expense, net: income - expense, pending, urgent, note }
  })

  const totalIncome = bizCards.reduce((s, b) => s + b.income, 0)
  const totalExpense = bizCards.reduce((s, b) => s + b.expense, 0)
  const totalPending = bizCards.reduce((s, b) => s + b.pending, 0)

  return (
    <div className="page-content" style={{ maxWidth: 1100 }}>
      <div className="page-header">
        <h1 className="page-title">Businesses</h1>
        <div style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>Click any business to view details</div>
      </div>

      {/* Business cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.875rem' }}>
        {bizCards.map(b => (
          <div key={b.id} onClick={() => setSelected(b)} style={{ background: 'var(--bg2)', border: `1px solid var(--border)`, borderTop: `3px solid ${b.color}`, borderRadius: 'var(--radius)', padding: '1.1rem', cursor: 'pointer', transition: 'border-color 0.2s, transform 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = b.color}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: b.color + '22', border: `1px solid ${b.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                {b.icon_url ? <img src={b.icon_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} alt="" /> : b.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: b.color }}>{b.name}</div>
                {b.note && <div style={{ fontSize: '0.68rem', color: 'var(--text3)', marginTop: '0.1rem', textTransform: 'capitalize' }}>{b.note.status}</div>}
              </div>
              <ChevronRight size={16} style={{ color: 'var(--text3)' }} />
            </div>

            {/* Finance row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {[{ l: 'Revenue', v: `₹${fmt(b.income)}`, c: 'var(--green)' }, { l: 'Expense', v: `₹${fmt(b.expense)}`, c: 'var(--red)' }, { l: 'Net', v: `₹${fmt(Math.abs(b.net))}`, c: b.net >= 0 ? 'var(--green)' : 'var(--red)' }].map(s => (
                <div key={s.l} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '0.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text3)', marginBottom: '0.15rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.l}</div>
                  <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.75rem', fontWeight: 700, color: s.c }}>{s.v}</div>
                </div>
              ))}
            </div>

            {/* Status */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {b.urgent > 0 && <span style={{ fontSize: '0.65rem', background: 'rgba(239,68,68,0.15)', color: 'var(--red)', padding: '0.15rem 0.5rem', borderRadius: 20, fontWeight: 600 }}>🔴 {b.urgent} urgent</span>}
              <span style={{ fontSize: '0.65rem', background: 'var(--bg3)', color: 'var(--text3)', padding: '0.15rem 0.5rem', borderRadius: 20 }}>{b.pending} tasks pending</span>
              {b.note && <span style={{ fontSize: '0.65rem', color: 'var(--text3)', marginLeft: 'auto' }}>📝 has note</span>}
            </div>

            {/* Status note preview */}
            {b.note?.content && (
              <div style={{ marginTop: '0.6rem', fontSize: '0.75rem', color: 'var(--text3)', background: 'var(--bg3)', borderRadius: 8, padding: '0.5rem 0.75rem', borderLeft: `2px solid ${b.color}`, lineHeight: 1.4 }}>
                {b.note.content.slice(0, 100)}{b.note.content.length > 100 ? '...' : ''}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary bar */}
      <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 'var(--radius)', padding: '1rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>Total Revenue</div>
          <div style={{ fontFamily: 'Space Mono, monospace', fontWeight: 700, color: 'var(--green)', fontSize: '1rem' }}>₹{fmt(totalIncome)}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>Total Expenses</div>
          <div style={{ fontFamily: 'Space Mono, monospace', fontWeight: 700, color: 'var(--red)', fontSize: '1rem' }}>₹{fmt(totalExpense)}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>Net Position</div>
          <div style={{ fontFamily: 'Space Mono, monospace', fontWeight: 700, color: totalIncome - totalExpense >= 0 ? 'var(--green)' : 'var(--red)', fontSize: '1rem' }}>₹{fmt(Math.abs(totalIncome - totalExpense))}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>Active Businesses</div>
          <div style={{ fontFamily: 'Space Mono, monospace', fontWeight: 700, color: 'var(--gold)', fontSize: '1rem' }}>{businesses.length}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>Pending Tasks</div>
          <div style={{ fontFamily: 'Space Mono, monospace', fontWeight: 700, color: 'var(--amber)', fontSize: '1rem' }}>{totalPending}</div>
        </div>
      </div>
    </div>
  )
}
