import { useState, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { Edit2, Save, X, Plus, Trash2, Upload, Check } from 'lucide-react'

// Preset business configs
const BUSINESS_PRESETS = [
  {
    name: 'Wander Breeze Exim',
    emoji: '🌿',
    color: '#10b981',
    accent: '#10b981',
    desc: 'Spice & agri export',
  },
  {
    name: 'Elatz Wear It',
    emoji: '👕',
    color: '#ef4444',
    accent: '#ef4444',
    desc: 'T-shirts & corporate gifting',
  },
  {
    name: '#WBE Fruits & Vegetables',
    emoji: '🥭',
    color: '#10b981',
    accent: '#eab308',
    desc: 'Fresh produce wholesale',
  },
  {
    name: 'DriveX RC Garage',
    emoji: '🚛',
    color: '#f5c842',
    accent: '#f5c842',
    desc: 'RC hobby & e-commerce',
  },
  {
    name: 'Leafy Digital',
    emoji: '💻',
    color: '#22c55e',
    accent: '#22c55e',
    desc: 'Digital marketing & software',
  },
  {
    name: '3D Dropshipping',
    emoji: '🖨️',
    color: '#f97316',
    accent: '#f97316',
    desc: '3D print dropship store',
  },
]

// Curated color palette — user picks these
const COLOR_PALETTE = [
  // Greens
  { hex: '#10b981', label: 'Emerald' },
  { hex: '#22c55e', label: 'Green' },
  { hex: '#4ade80', label: 'Mint' },
  // Golds & Ambers
  { hex: '#c9a84c', label: 'Gold' },
  { hex: '#e8c96a', label: 'Light Gold' },
  { hex: '#f5c842', label: 'Yellow' },
  { hex: '#eab308', label: 'Amber' },
  // Reds
  { hex: '#ef4444', label: 'Red' },
  { hex: '#dc2626', label: 'Dark Red' },
  { hex: '#f97316', label: 'Orange' },
  // Blues
  { hex: '#3b82f6', label: 'Blue' },
  { hex: '#06b6d4', label: 'Cyan' },
  // Purples
  { hex: '#8b5cf6', label: 'Violet' },
  { hex: '#a855f7', label: 'Purple' },
  // Neutrals
  { hex: '#6b7280', label: 'Gray' },
  { hex: '#ffffff', label: 'White' },
]

const EMOJI_OPTIONS = ['🌿','👕','🥭','🚛','💻','🖨️','⚡','🏢','🎯','📦','🛍️','🌾','🐟','🌊','🔧','💡','🎨','🚀','💎','🏆']

function BusinessCard({ biz, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(biz.name)
  const [emoji, setEmoji] = useState(biz.emoji)
  const [color, setColor] = useState(biz.color)
  const [saving, setSaving] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const fileRef = useRef()
  const [iconPreview, setIconPreview] = useState(biz.icon_url || null)
  const [iconFile, setIconFile] = useState(null)

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setIconFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setIconPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function save() {
    setSaving(true)
    let icon_url = biz.icon_url || null

    // Upload icon if selected
    if (iconFile) {
      const ext = iconFile.name.split('.').pop()
      const path = `business-icons/${biz.id}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('elatz-assets')
        .upload(path, iconFile, { upsert: true })
      if (!uploadErr) {
        const { data } = supabase.storage.from('elatz-assets').getPublicUrl(path)
        icon_url = data.publicUrl
      }
    }

    await supabase.from('businesses').update({ name, emoji, color, icon_url }).eq('id', biz.id)
    setSaving(false)
    setEditing(false)
    setIconFile(null)
    onSaved()
  }

  async function deleteBiz() {
    if (!confirm(`Delete "${biz.name}"? This will also delete all its tasks.`)) return
    await supabase.from('businesses').delete().eq('id', biz.id)
    onSaved()
  }

  const displayIcon = iconPreview || null

  return (
    <div style={{
      background: 'var(--bg2)',
      border: `1px solid ${editing ? color : 'var(--border)'}`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 'var(--radius)',
      padding: '1rem',
      transition: 'border-color 0.2s',
    }}>
      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Icon upload */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                width: 56, height: 56, borderRadius: 12,
                background: color + '22',
                border: `2px dashed ${color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: '1.6rem', flexShrink: 0,
                overflow: 'hidden',
              }}
              title="Click to upload icon"
            >
              {displayIcon
                ? <img src={displayIcon} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="icon" />
                : emoji
              }
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
            <div style={{ flex: 1 }}>
              <div className="form-label">Business name</div>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)} />
            </div>
          </div>

          {/* Emoji picker */}
          <div>
            <div className="form-label">Icon emoji (or upload image above)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {EMOJI_OPTIONS.map(e => (
                <button key={e} onClick={() => setEmoji(e)} style={{
                  width: 36, height: 36, fontSize: '1.2rem', borderRadius: 8,
                  border: `1px solid ${emoji === e ? color : 'var(--border)'}`,
                  background: emoji === e ? color + '22' : 'var(--bg3)',
                  cursor: 'pointer',
                }}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <div className="form-label">Brand color</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
              {COLOR_PALETTE.map(c => (
                <button key={c.hex} onClick={() => setColor(c.hex)} title={c.label} style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: c.hex,
                  border: `2px solid ${color === c.hex ? 'white' : 'transparent'}`,
                  outline: color === c.hex ? `2px solid ${c.hex}` : 'none',
                  cursor: 'pointer', boxSizing: 'border-box',
                }} />
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 36, height: 30, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', background: 'none', padding: 2 }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text3)', fontFamily: 'Space Mono, monospace' }}>{color}</span>
              <div style={{ width: 20, height: 20, borderRadius: 4, background: color }} />
            </div>
          </div>

          {/* Preview */}
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.6rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.1rem' }}>{displayIcon ? <img src={displayIcon} style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover' }} alt="" /> : emoji}</span>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color }}>{name || 'Business name'}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text3)', marginLeft: 'auto' }}>preview</span>
          </div>

          <div className="form-actions">
            <button className="btn-primary" onClick={save} disabled={saving}>
              <Save size={14} />{saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button className="btn-ghost" onClick={() => { setEditing(false); setIconPreview(biz.icon_url || null); setName(biz.name); setEmoji(biz.emoji); setColor(biz.color) }}>
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: color + '22', border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0, overflow: 'hidden' }}>
            {biz.icon_url
              ? <img src={biz.icon_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={biz.name} />
              : emoji
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color }}>{name}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: '0.1rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: color, display: 'inline-block' }} />
              {color}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button className="icon-btn" onClick={() => setEditing(true)}><Edit2 size={14} /></button>
            <button className="icon-btn danger" onClick={deleteBiz}><Trash2 size={14} /></button>
          </div>
        </div>
      )}
    </div>
  )
}

function AddBusinessModal({ onClose, onDone }) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🏢')
  const [color, setColor] = useState('#c9a84c')
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState('preset') // preset | custom

  async function saveNew() {
    if (!name.trim()) return
    setSaving(true)
    await supabase.from('businesses').insert({ name: name.trim(), emoji, color })
    setSaving(false)
    onDone(); onClose()
  }

  async function applyPreset(p) {
    setName(p.name); setEmoji(p.emoji); setColor(p.color); setStep('custom')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add Business</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>

        {step === 'preset' && (
          <>
            <p style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>Pick a preset or start from scratch</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {BUSINESS_PRESETS.map(p => (
                <button key={p.name} onClick={() => applyPreset(p)} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  background: 'var(--bg3)', border: `1px solid var(--border)`,
                  borderLeft: `3px solid ${p.color}`,
                  borderRadius: 10, padding: '0.75rem 1rem', cursor: 'pointer', textAlign: 'left',
                }}>
                  <span style={{ fontSize: '1.3rem' }}>{p.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: p.color }}>{p.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{p.desc}</div>
                  </div>
                </button>
              ))}
              <button onClick={() => setStep('custom')} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                background: 'transparent', border: '1px dashed var(--border)', borderRadius: 10,
                padding: '0.75rem', cursor: 'pointer', color: 'var(--text3)', fontSize: '0.85rem',
              }}>
                <Plus size={14} /> Custom business
              </button>
            </div>
          </>
        )}

        {step === 'custom' && (
          <>
            <button onClick={() => setStep('preset')} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '0.8rem', alignSelf: 'flex-start' }}>← Back to presets</button>
            <div className="form-label">Business name *</div>
            <input className="form-input" placeholder="Business name" value={name} onChange={e => setName(e.target.value)} />
            <div className="form-label">Emoji icon</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {EMOJI_OPTIONS.map(e => (
                <button key={e} onClick={() => setEmoji(e)} style={{ width: 36, height: 36, fontSize: '1.2rem', borderRadius: 8, border: `1px solid ${emoji === e ? color : 'var(--border)'}`, background: emoji === e ? color + '22' : 'var(--bg3)', cursor: 'pointer' }}>{e}</button>
              ))}
            </div>
            <div className="form-label">Brand color</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.4rem' }}>
              {COLOR_PALETTE.map(c => (
                <button key={c.hex} onClick={() => setColor(c.hex)} title={c.label} style={{ width: 28, height: 28, borderRadius: 8, background: c.hex, border: `2px solid ${color === c.hex ? 'white' : 'transparent'}`, outline: color === c.hex ? `2px solid ${c.hex}` : 'none', cursor: 'pointer' }} />
              ))}
            </div>
            <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 36, height: 30, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', background: 'none', padding: 2 }} />
            <button className="btn-primary" onClick={saveNew} disabled={saving || !name.trim()} style={{ justifyContent: 'center' }}>
              {saving ? 'Creating...' : 'Create Business'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function ManageBusinessPage() {
  const { businesses, loadBusinesses } = useApp()
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Manage Businesses</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text3)', marginTop: '0.2rem' }}>Edit names, icons, and brand colors for each business</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus size={14} /> Add Business</button>
      </div>

      {businesses.length === 0 ? (
        <div className="empty-card">No businesses yet. Add your first one.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {businesses.map(b => (
            <BusinessCard key={b.id} biz={b} onSaved={loadBusinesses} />
          ))}
        </div>
      )}

      <div style={{ background: 'var(--bg2)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 'var(--radius)', padding: '1rem' }}>
        <div style={{ fontSize: '0.72rem', fontFamily: 'Space Mono, monospace', color: 'var(--gold)', letterSpacing: '0.1em', marginBottom: '0.5rem', textTransform: 'uppercase' }}>💡 Icon Upload Note</div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text3)', lineHeight: 1.5 }}>
          To enable image uploads, create a Supabase Storage bucket called <code style={{ background: 'var(--bg3)', padding: '0.1rem 0.3rem', borderRadius: 4, color: 'var(--gold2)' }}>elatz-assets</code> with public access. Otherwise, emoji icons work perfectly fine.
        </p>
      </div>

      {showAdd && <AddBusinessModal onClose={() => setShowAdd(false)} onDone={loadBusinesses} />}
    </div>
  )
}
