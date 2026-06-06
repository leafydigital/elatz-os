import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { Plus, Trash2, Edit2, X, Zap } from 'lucide-react'

const BILLING_CYCLES = ['monthly', 'yearly', 'weekly']

export default function SubscriptionsPage() {
  const { subscriptions, loadSubscriptions } = useApp()
  const [showAdd, setShowAdd] = useState(false)
  const [editSub, setEditSub] = useState(null)
  const [form, setForm] = useState({
    name: '', emoji: '📱', amount: '', billing_cycle: 'monthly',
    next_due: '', category: ''
  })

  const monthlyTotal = subscriptions
    .filter(s => s.billing_cycle === 'monthly')
    .reduce((sum, s) => sum + Number(s.amount), 0)
  const yearlyTotal = subscriptions
    .filter(s => s.billing_cycle === 'yearly')
    .reduce((sum, s) => sum + Number(s.amount), 0)

  async function addSub() {
    if (!form.name || !form.amount) return
    await supabase.from('subscriptions').insert({
      ...form,
      amount: parseFloat(form.amount),
      next_due: form.next_due || null
    })
    resetForm()
    setShowAdd(false)
    loadSubscriptions()
  }

  async function saveSub() {
    if (!editSub) return
    await supabase.from('subscriptions').update({
      name: editSub.name,
      emoji: editSub.emoji,
      amount: parseFloat(editSub.amount),
      billing_cycle: editSub.billing_cycle,
      next_due: editSub.next_due || null,
      category: editSub.category
    }).eq('id', editSub.id)
    setEditSub(null)
    loadSubscriptions()
  }

  async function deleteSub(id) {
    await supabase.from('subscriptions').update({ is_active: false }).eq('id', id)
    loadSubscriptions()
  }

  function resetForm() {
    setForm({ name: '', emoji: '📱', amount: '', billing_cycle: 'monthly', next_due: '', category: '' })
  }

  const grouped = subscriptions.reduce((g, s) => {
    const key = s.category || 'Other'
    if (!g[key]) g[key] = []
    g[key].push(s)
    return g
  }, {})

  const SubForm = ({ d, setD, onSave, onCancel, title }) => (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>{title}</h3><button onClick={onCancel}><X size={18} /></button></div>
        <div className="form-row">
          <input className="form-input" placeholder="Emoji" value={d.emoji} onChange={e => setD(p => ({ ...p, emoji: e.target.value }))} style={{ maxWidth: 70 }} />
          <input className="form-input" placeholder="Name *" value={d.name} onChange={e => setD(p => ({ ...p, name: e.target.value }))} />
        </div>
        <div className="form-row">
          <input className="form-input" type="number" placeholder="Amount (₹)" value={d.amount} onChange={e => setD(p => ({ ...p, amount: e.target.value }))} />
          <select className="form-select" value={d.billing_cycle} onChange={e => setD(p => ({ ...p, billing_cycle: e.target.value }))}>
            {BILLING_CYCLES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <input className="form-input" placeholder="Category (Entertainment, AI Tools...)" value={d.category || ''} onChange={e => setD(p => ({ ...p, category: e.target.value }))} />
        <input type="date" className="form-input" value={d.next_due || ''} onChange={e => setD(p => ({ ...p, next_due: e.target.value }))} />
        <div className="form-actions">
          <button className="btn-primary" onClick={onSave}>Save</button>
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Subscriptions</h1>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Add
        </button>
      </div>

      <div className="subs-summary-banner">
        <div>
          <div className="ssb-label">Monthly</div>
          <div className="ssb-val">₹{monthlyTotal.toLocaleString('en-IN')}/mo</div>
        </div>
        <div>
          <div className="ssb-label">Yearly</div>
          <div className="ssb-val">₹{yearlyTotal.toLocaleString('en-IN')}/yr</div>
        </div>
        <div>
          <div className="ssb-label">Annual Total</div>
          <div className="ssb-val">₹{(monthlyTotal * 12 + yearlyTotal).toLocaleString('en-IN')}/yr</div>
        </div>
      </div>

      {Object.entries(grouped).map(([cat, subs]) => (
        <div key={cat} className="subs-group">
          <div className="subs-group-header">{cat}</div>
          {subs.map(sub => (
            <div key={sub.id} className="sub-card">
              <span className="sub-card-emoji">{sub.emoji}</span>
              <div className="sub-card-info">
                <div className="sub-card-name">{sub.name}</div>
                {sub.next_due && <div className="sub-card-due">Next: {sub.next_due}</div>}
              </div>
              <div className="sub-card-right">
                <div className="sub-card-amount">₹{Number(sub.amount).toLocaleString('en-IN')}</div>
                <div className="sub-card-cycle">{sub.billing_cycle}</div>
              </div>
              <div className="sub-card-actions">
                <button className="icon-btn" onClick={() => setEditSub({ ...sub })}><Edit2 size={13} /></button>
                <button className="icon-btn danger" onClick={() => deleteSub(sub.id)}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      ))}

      {subscriptions.length === 0 && <div className="empty-card">No subscriptions yet.</div>}

      {showAdd && <SubForm d={form} setD={setForm} onSave={addSub} onCancel={() => { setShowAdd(false); resetForm() }} title="Add Subscription" />}
      {editSub && <SubForm d={editSub} setD={setEditSub} onSave={saveSub} onCancel={() => setEditSub(null)} title="Edit Subscription" />}
    </div>
  )
}
