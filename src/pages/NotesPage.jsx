import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { Edit2, Save, X, Plus, Trash2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'

const STATUS_OPTIONS = [
  { value: 'active',      label: 'Active',       color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  { value: 'growing',     label: 'Growing',      color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  { value: 'planning',    label: 'Planning',     color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  { value: 'on_hold',     label: 'On Hold',      color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
  { value: 'launching',   label: 'Launching 🚀', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
]

export default function NotesPage() {
  const { notes, businesses, loadNotes } = useApp()
  const [editing, setEditing] = useState(null) // note id
  const [editContent, setEditContent] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newNote, setNewNote] = useState({ biz_id: '', content: '', status: 'active' })

  function startEdit(note) {
    setEditing(note.id)
    setEditContent(note.content)
    setEditStatus(note.status || 'active')
  }

  async function saveEdit(note) {
    setSaving(true)
    await supabase.from('os_notes').update({
      content: editContent,
      status: editStatus,
      updated_at: new Date().toISOString()
    }).eq('id', note.id)
    setSaving(false)
    setEditing(null)
    loadNotes()
  }

  async function deleteNote(id) {
    await supabase.from('os_notes').delete().eq('id', id)
    loadNotes()
  }

  async function addNote() {
    if (!newNote.content.trim() || !newNote.biz_id) return
    const biz = businesses.find(b => b.id === newNote.biz_id)
    await supabase.from('os_notes').insert({
      business_id: newNote.biz_id,
      biz_name: biz?.name || '',
      biz_emoji: biz?.emoji || '🏢',
      biz_color: biz?.color || '#6366f1',
      content: newNote.content.trim(),
      status: newNote.status,
    })
    setNewNote({ biz_id: '', content: '', status: 'active' })
    setShowAdd(false)
    loadNotes()
  }

  const getStatusConfig = (s) => STATUS_OPTIONS.find(o => o.value === s) || STATUS_OPTIONS[0]

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Business Status</h1>
        <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus size={14} /> Add Note</button>
      </div>

      <p style={{ fontSize: '0.82rem', color: 'var(--text3)', marginTop: '-0.5rem' }}>
        Keep a running status update per business — where it is right now, what's happening, what's next.
      </p>

      {notes.length === 0 && (
        <div className="empty-card">No status notes yet. Click "Add Note" to capture where each business stands right now.</div>
      )}

      <div className="notes-grid">
        {notes.map(note => {
          const sc = getStatusConfig(note.status)
          const isEditing = editing === note.id
          return (
            <div key={note.id} className="note-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="note-biz" style={{ color: note.biz_color }}>{note.biz_emoji} {note.biz_name}</div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {!isEditing && <button className="icon-btn" onClick={() => startEdit(note)}><Edit2 size={13} /></button>}
                  <button className="icon-btn danger" onClick={() => deleteNote(note.id)}><Trash2 size={13} /></button>
                </div>
              </div>

              {isEditing ? (
                <>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                    {STATUS_OPTIONS.map(s => (
                      <button key={s.value} onClick={() => setEditStatus(s.value)} style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: 20, border: '1px solid', background: editStatus === s.value ? s.bg : 'transparent', borderColor: editStatus === s.value ? s.color : 'rgba(255,255,255,0.08)', color: editStatus === s.value ? s.color : 'var(--text3)', cursor: 'pointer' }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <textarea className="note-edit-area" value={editContent} onChange={e => setEditContent(e.target.value)} />
                  <div className="form-actions">
                    <button className="btn-primary" onClick={() => saveEdit(note)} disabled={saving}><Save size={13} /> {saving ? 'Saving...' : 'Save'}</button>
                    <button className="btn-ghost" onClick={() => setEditing(null)}><X size={13} /> Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <span className="note-status-chip" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                  <div className="note-content">{note.content}</div>
                  <div className="note-updated">Updated {note.updated_at ? format(parseISO(note.updated_at), 'd MMM, h:mm a') : '—'}</div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Add Business Note</h3><button onClick={() => setShowAdd(false)}><X size={18} /></button></div>
            <div className="form-label">Business</div>
            <select className="form-select" value={newNote.biz_id} onChange={e => setNewNote(p => ({ ...p, biz_id: e.target.value }))}>
              <option value="">Select business...</option>
              {businesses.map(b => <option key={b.id} value={b.id}>{b.emoji} {b.name}</option>)}
            </select>
            <div className="form-label">Current Status</div>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
              {STATUS_OPTIONS.map(s => (
                <button key={s.value} onClick={() => setNewNote(p => ({ ...p, status: s.value }))} style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: 20, border: '1px solid', background: newNote.status === s.value ? s.bg : 'transparent', borderColor: newNote.status === s.value ? s.color : 'rgba(255,255,255,0.08)', color: newNote.status === s.value ? s.color : 'var(--text3)', cursor: 'pointer' }}>
                  {s.label}
                </button>
              ))}
            </div>
            <div className="form-label">What's happening right now?</div>
            <textarea className="form-textarea" placeholder="e.g. WBE is currently in negotiation with 3 UAE buyers for Black Pepper. Cardamom samples sent to Germany. Waiting for feedback. Next step: follow up this week." value={newNote.content} onChange={e => setNewNote(p => ({ ...p, content: e.target.value }))} style={{ minHeight: 120 }} />
            <button className="btn-primary" onClick={addNote} style={{ justifyContent: 'center' }}>Save Note</button>
          </div>
        </div>
      )}
    </div>
  )
}
