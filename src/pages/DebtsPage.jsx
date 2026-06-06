import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { Plus, Trash2, Edit2, X, CreditCard } from 'lucide-react'

export default function DebtsPage() {
  const { debts, loadDebts } = useApp()
  const [showAdd, setShowAdd] = useState(false)
  const [editDebt, setEditDebt] = useState(null)
  const [form, setForm] = useState({
    name: '', total_amount: '', remaining_amount: '', emi_monthly: '',
    emi_covers_principal: false, interest_rate: '', description: '',
    start_date: '', end_date: ''
  })

  const totalDebt = debts.reduce((s, d) => s + Number(d.remaining_amount), 0)
  const totalEMI = debts.reduce((s, d) => s + Number(d.emi_monthly || 0), 0)

  async function addDebt() {
    if (!form.name || !form.total_amount) return
    await supabase.from('debts').insert({
      ...form,
      total_amount: parseFloat(form.total_amount),
      remaining_amount: parseFloat(form.remaining_amount || form.total_amount),
      emi_monthly: form.emi_monthly ? parseFloat(form.emi_monthly) : null,
      interest_rate: form.interest_rate ? parseFloat(form.interest_rate) : null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    })
    resetForm()
    setShowAdd(false)
    loadDebts()
  }

  async function saveEdit() {
    if (!editDebt) return
    await supabase.from('debts').update({
      name: editDebt.name,
      total_amount: parseFloat(editDebt.total_amount),
      remaining_amount: parseFloat(editDebt.remaining_amount),
      emi_monthly: editDebt.emi_monthly ? parseFloat(editDebt.emi_monthly) : null,
      emi_covers_principal: editDebt.emi_covers_principal,
      interest_rate: editDebt.interest_rate ? parseFloat(editDebt.interest_rate) : null,
      description: editDebt.description,
      start_date: editDebt.start_date || null,
      end_date: editDebt.end_date || null,
    }).eq('id', editDebt.id)
    setEditDebt(null)
    loadDebts()
  }

  async function deleteDebt(id) {
    await supabase.from('debts').update({ is_active: false }).eq('id', id)
    loadDebts()
  }

  function resetForm() {
    setForm({ name: '', total_amount: '', remaining_amount: '', emi_monthly: '', emi_covers_principal: false, interest_rate: '', description: '', start_date: '', end_date: '' })
  }

  function paidPct(debt) {
    const pct = ((Number(debt.total_amount) - Number(debt.remaining_amount)) / Number(debt.total_amount)) * 100
    return Math.min(100, Math.max(0, Math.round(pct)))
  }

  const debtForm = (d, setD, onSave, onCancel, title) => (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button onClick={onCancel}><X size={18} /></button>
        </div>
        <input className="form-input" placeholder="Debt name (e.g. Car Loan) *" value={d.name} onChange={e => setD(p => ({ ...p, name: e.target.value }))} />
        <div className="form-row">
          <input className="form-input" type="number" placeholder="Total Amount *" value={d.total_amount} onChange={e => setD(p => ({ ...p, total_amount: e.target.value }))} />
          <input className="form-input" type="number" placeholder="Remaining Amount" value={d.remaining_amount} onChange={e => setD(p => ({ ...p, remaining_amount: e.target.value }))} />
        </div>
        <div className="form-row">
          <input className="form-input" type="number" placeholder="Monthly EMI" value={d.emi_monthly} onChange={e => setD(p => ({ ...p, emi_monthly: e.target.value }))} />
          <input className="form-input" type="number" placeholder="Interest % p.a." value={d.interest_rate} onChange={e => setD(p => ({ ...p, interest_rate: e.target.value }))} />
        </div>
        <input className="form-input" placeholder="Description (e.g. Muthoot Gold Loan)" value={d.description || ''} onChange={e => setD(p => ({ ...p, description: e.target.value }))} />
        <div className="form-row">
          <input type="date" className="form-input" placeholder="Start Date" value={d.start_date || ''} onChange={e => setD(p => ({ ...p, start_date: e.target.value }))} />
          <input type="date" className="form-input" placeholder="End Date" value={d.end_date || ''} onChange={e => setD(p => ({ ...p, end_date: e.target.value }))} />
        </div>
        <label className="checkbox-label">
          <input type="checkbox" checked={d.emi_covers_principal} onChange={e => setD(p => ({ ...p, emi_covers_principal: e.target.checked }))} />
          EMI covers principal (auto-deduct from remaining)
        </label>
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
        <h1 className="page-title">Debts & EMIs</h1>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Add Debt
        </button>
      </div>

      <div className="debt-summary-banner">
        <div className="dsb-item">
          <div className="dsb-label">Total Outstanding</div>
          <div className="dsb-val danger">₹{totalDebt.toLocaleString('en-IN')}</div>
        </div>
        <div className="dsb-item">
          <div className="dsb-label">Monthly EMI Burden</div>
          <div className="dsb-val">₹{totalEMI.toLocaleString('en-IN')}</div>
        </div>
        <div className="dsb-item">
          <div className="dsb-label">Active Loans</div>
          <div className="dsb-val">{debts.length}</div>
        </div>
      </div>

      {debts.length === 0 && <div className="empty-card">No active debts. Add your loans and EMIs.</div>}

      {debts.map(debt => (
        <div key={debt.id} className="debt-detail-card">
          <div className="ddc-header">
            <div>
              <div className="ddc-name">{debt.name}</div>
              {debt.description && <div className="ddc-desc">{debt.description}</div>}
            </div>
            <div className="ddc-actions">
              <button className="icon-btn" onClick={() => setEditDebt({ ...debt })}><Edit2 size={14} /></button>
              <button className="icon-btn danger" onClick={() => deleteDebt(debt.id)}><Trash2 size={14} /></button>
            </div>
          </div>

          <div className="ddc-amounts">
            <div>
              <div className="ddc-label">Total</div>
              <div className="ddc-amount">₹{Number(debt.total_amount).toLocaleString('en-IN')}</div>
            </div>
            <div>
              <div className="ddc-label">Remaining</div>
              <div className="ddc-amount danger">₹{Number(debt.remaining_amount).toLocaleString('en-IN')}</div>
            </div>
            {debt.emi_monthly && (
              <div>
                <div className="ddc-label">EMI/month</div>
                <div className="ddc-amount">₹{Number(debt.emi_monthly).toLocaleString('en-IN')}</div>
              </div>
            )}
            {debt.interest_rate && (
              <div>
                <div className="ddc-label">Interest</div>
                <div className="ddc-amount">{debt.interest_rate}%</div>
              </div>
            )}
          </div>

          <div className="ddc-progress">
            <div className="ddc-progress-bar">
              <div className="ddc-progress-fill" style={{ width: `${paidPct(debt)}%` }} />
            </div>
            <div className="ddc-progress-text">{paidPct(debt)}% repaid</div>
          </div>

          {debt.emi_covers_principal && (
            <div className="emi-principal-badge">✓ EMI deducts from principal automatically</div>
          )}

          {debt.end_date && (
            <div className="ddc-dates">Closes: {debt.end_date}</div>
          )}
        </div>
      ))}

      {showAdd && debtForm(form, setForm, addDebt, () => { setShowAdd(false); resetForm() }, 'Add Debt / Loan')}
      {editDebt && debtForm(editDebt, setEditDebt, saveEdit, () => setEditDebt(null), 'Edit Debt')}
    </div>
  )
}
