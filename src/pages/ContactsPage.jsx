import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { Plus, X, Trash2, Edit2, Search, Phone, Mail, MapPin } from 'lucide-react'

const CONTACT_TYPES = ['Supplier', 'Buyer', 'Partner', 'Lead', 'Other']
const BIZ_TAGS = ['WBE', 'DriveX', 'Wear It', 'ELATZ', 'General']

export default function ContactsPage() {
  const { contacts, businesses, loadContacts } = useApp()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterBiz, setFilterBiz] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [editContact, setEditContact] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', whatsapp: '', email: '', company: '', location: '', type: 'Supplier', biz_tag: 'WBE', product_interest: '', notes: '' })

  const filtered = useMemo(() => {
    return contacts.filter(c => {
      const matchSearch = !search || [c.name, c.company, c.phone, c.email, c.product_interest, c.location].some(f => f?.toLowerCase().includes(search.toLowerCase()))
      const matchType = filterType === 'all' || c.type === filterType
      const matchBiz = filterBiz === 'all' || c.biz_tag === filterBiz
      return matchSearch && matchType && matchBiz
    })
  }, [contacts, search, filterType, filterBiz])

  async function saveContact() {
    if (!form.name.trim()) return
    if (editContact) {
      await supabase.from('os_contacts').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editContact.id)
    } else {
      await supabase.from('os_contacts').insert(form)
    }
    setShowAdd(false); setEditContact(null)
    setForm({ name: '', phone: '', whatsapp: '', email: '', company: '', location: '', type: 'Supplier', biz_tag: 'WBE', product_interest: '', notes: '' })
    loadContacts()
  }

  async function deleteContact(id) {
    await supabase.from('os_contacts').delete().eq('id', id); loadContacts()
  }

  function startEdit(c) {
    setForm({ name: c.name || '', phone: c.phone || '', whatsapp: c.whatsapp || '', email: c.email || '', company: c.company || '', location: c.location || '', type: c.type || 'Supplier', biz_tag: c.biz_tag || 'WBE', product_interest: c.product_interest || '', notes: c.notes || '' })
    setEditContact(c)
    setShowAdd(true)
  }

  const BIZ_COLOR = { 'WBE': '#10b981', 'DriveX': '#f5c842', 'Wear It': '#8b5cf6', 'ELATZ': '#7c3aed', 'General': '#6b7280' }
  const TYPE_COLOR = { 'Supplier': '#10b981', 'Buyer': '#3b82f6', 'Partner': '#f59e0b', 'Lead': '#8b5cf6', 'Other': '#6b7280' }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Contacts</h1>
        <button className="btn-primary" onClick={() => { setEditContact(null); setForm({ name: '', phone: '', whatsapp: '', email: '', company: '', location: '', type: 'Supplier', biz_tag: 'WBE', product_interest: '', notes: '' }); setShowAdd(true) }}><Plus size={14} /> Add Contact</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 'auto' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          {CONTACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="form-select" style={{ width: 'auto' }} value={filterBiz} onChange={e => setFilterBiz(e.target.value)}>
          <option value="all">All Businesses</option>
          {BIZ_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{filtered.length} of {contacts.length} contacts</div>

      {contacts.length === 0 ? (
        <div className="empty-card">No contacts yet. Add suppliers, buyers, and partners here. Agent tasks will also populate this list automatically when Phase 2 goes live.</div>
      ) : filtered.length === 0 ? (
        <div className="empty-card">No contacts match your filters.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.map(c => (
            <div key={c.id} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.875rem 1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.name}</span>
                    <span className="tag" style={{ background: TYPE_COLOR[c.type] + '22', color: TYPE_COLOR[c.type] }}>{c.type}</span>
                    <span className="tag" style={{ background: BIZ_COLOR[c.biz_tag] + '22', color: BIZ_COLOR[c.biz_tag] }}>{c.biz_tag}</span>
                  </div>
                  {c.company && <div style={{ fontSize: '0.8rem', color: 'var(--text2)', marginBottom: '0.25rem' }}>🏢 {c.company}</div>}
                  {c.product_interest && <div style={{ fontSize: '0.78rem', color: 'var(--accent2)', marginBottom: '0.35rem' }}>📦 {c.product_interest}</div>}
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {c.phone && <a href={`tel:${c.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', color: 'var(--text3)', textDecoration: 'none' }}><Phone size={12} />{c.phone}</a>}
                    {c.whatsapp && <a href={`https://wa.me/${c.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', color: '#25D366', textDecoration: 'none' }}>💬 WhatsApp</a>}
                    {c.email && <a href={`mailto:${c.email}`} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', color: 'var(--text3)', textDecoration: 'none' }}><Mail size={12} />{c.email}</a>}
                    {c.location && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', color: 'var(--text3)' }}><MapPin size={12} />{c.location}</span>}
                  </div>
                  {c.notes && <div style={{ fontSize: '0.77rem', color: 'var(--text3)', marginTop: '0.35rem', lineHeight: 1.4 }}>{c.notes}</div>}
                </div>
                <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                  <button className="icon-btn" onClick={() => startEdit(c)}><Edit2 size={13} /></button>
                  <button className="icon-btn danger" onClick={() => deleteContact(c.id)}><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => { setShowAdd(false); setEditContact(null) }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editContact ? 'Edit Contact' : 'New Contact'}</h3>
              <button onClick={() => { setShowAdd(false); setEditContact(null) }}><X size={18} /></button>
            </div>
            <div className="form-row">
              <div>
                <div className="form-label">Type</div>
                <select className="form-select" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                  {CONTACT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <div className="form-label">Business</div>
                <select className="form-select" value={form.biz_tag} onChange={e => setForm(p => ({ ...p, biz_tag: e.target.value }))}>
                  {BIZ_TAGS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="form-label">Name *</div>
            <input className="form-input" placeholder="Full name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            <div className="form-label">Company / Business Name</div>
            <input className="form-input" placeholder="Company name" value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} />
            <div className="form-row">
              <div>
                <div className="form-label">Phone</div>
                <input className="form-input" placeholder="+91..." value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <div className="form-label">WhatsApp</div>
                <input className="form-input" placeholder="+91..." value={form.whatsapp} onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))} />
              </div>
            </div>
            <div className="form-label">Email</div>
            <input className="form-input" placeholder="email@example.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            <div className="form-label">Location / City</div>
            <input className="form-input" placeholder="e.g. Tenkasi, Tamil Nadu" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
            <div className="form-label">Product Interest / Category</div>
            <input className="form-input" placeholder="e.g. Black Pepper, RC Dump Trucks, T-shirts..." value={form.product_interest} onChange={e => setForm(p => ({ ...p, product_interest: e.target.value }))} />
            <div className="form-label">Notes</div>
            <textarea className="form-textarea" placeholder="Any additional notes..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            <button className="btn-primary" onClick={saveContact} style={{ justifyContent: 'center' }}>{editContact ? 'Save Changes' : 'Add Contact'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
