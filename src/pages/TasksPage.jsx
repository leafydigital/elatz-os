import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { Plus, CheckCircle2, Circle, Clock, AlertTriangle, ChevronDown, ChevronUp, Trash2, Edit2, X, Zap, Bot, ArrowRight } from 'lucide-react'

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', color: '#ef4444' },
  high:   { label: 'High',   color: '#f59e0b' },
  medium: { label: 'Medium', color: '#3b82f6' },
  low:    { label: 'Low',    color: '#6b7280' },
}
const STATUS_CONFIG = {
  pending:     { label: 'Pending',     icon: <Circle size={16} /> },
  in_progress: { label: 'In Progress', icon: <Clock size={16} /> },
  done:        { label: 'Done',        icon: <CheckCircle2 size={16} /> },
  deferred:    { label: 'Deferred',    icon: '⏸️' },
}
const PRIORITY_OPTS = [
  { value: 'high', label: 'High', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  { value: 'medium', label: 'Med', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  { value: 'low', label: 'Low', color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
]
const emptyRow = () => ({ title: '', priority: 'medium', due_date: '', recur_daily: false })

function BulkAddModal({ businesses, onClose, onDone }) {
  const [selectedBiz, setSelectedBiz] = useState(businesses[0] || null)
  const [rows, setRows] = useState([emptyRow(), emptyRow(), emptyRow()])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]
  const updateRow = (i, f, v) => setRows(p => p.map((r, idx) => idx === i ? { ...r, [f]: v } : r))
  const validCount = rows.filter(r => r.title.trim()).length

  async function handleSave() {
    if (!validCount) { setErr('Add at least one task title.'); return }
    if (!selectedBiz) { setErr('Select a business first.'); return }
    setErr(''); setSaving(true)
    const inserts = rows.filter(r => r.title.trim()).map(r => ({
      business_id: selectedBiz.id, title: r.title.trim(), priority: r.priority,
      due_date: r.due_date || null, recur_daily: r.recur_daily, is_recurring: r.recur_daily, status: 'pending',
    }))
    const { error: dbErr } = await supabase.from('tasks').insert(inserts)
    setSaving(false)
    if (dbErr) { setErr(dbErr.message); return }
    setSaved(true)
    setTimeout(() => { onDone(); onClose() }, 1200)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal bulk-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, letterSpacing: '0.12em', color: '#6366f1', margin: '0 0 4px', textTransform: 'uppercase' }}>Quick Entry</p>
            <h3>Bulk Add Tasks</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#6366f1', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 12, padding: '2px 10px' }}>{validCount} task{validCount !== 1 ? 's' : ''}</span>
            <button onClick={onClose}><X size={18} /></button>
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4b5563', marginBottom: 8 }}>Business</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {businesses.map(b => (
              <button key={b.id} onClick={() => setSelectedBiz(b)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid', background: selectedBiz?.id === b.id ? b.color + '22' : 'rgba(255,255,255,0.04)', borderColor: selectedBiz?.id === b.id ? b.color : 'rgba(255,255,255,0.08)', color: selectedBiz?.id === b.id ? b.color : '#9ca3af', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                <span>{b.emoji}</span> {b.name}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button className="btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => setRows(p => p.map(r => ({ ...r, due_date: tomorrowStr })))}>📅 Set all → Tomorrow</button>
          <button className="btn-ghost" style={{ fontSize: 12, padding: '5px 12px', color: '#6b7280' }} onClick={() => setRows(p => p.map(r => ({ ...r, due_date: '' })))}>Clear dates</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {rows.map((row, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 9, padding: '7px 10px' }}>
              <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#374151', minWidth: 16, textAlign: 'center' }}>{i + 1}</span>
              <input id={`bulk-input-${i}`} className="form-input" style={{ flex: 1, margin: 0, background: 'transparent', border: 'none', padding: 0, minWidth: 0 }} placeholder={`Task ${i + 1}...`} value={row.title} onChange={e => updateRow(i, 'title', e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (i === rows.length - 1) setRows(p => [...p, emptyRow()]); else document.getElementById(`bulk-input-${i + 1}`)?.focus() } }} />
              <div style={{ display: 'flex', gap: 3 }}>
                {PRIORITY_OPTS.map(p => (
                  <button key={p.value} onClick={() => updateRow(i, 'priority', p.value)} style={{ border: '1px solid', borderColor: row.priority === p.value ? p.color + '66' : 'transparent', borderRadius: 5, fontSize: 10, fontWeight: 700, padding: '2px 6px', cursor: 'pointer', fontFamily: 'Space Mono, monospace', background: row.priority === p.value ? p.bg : 'transparent', color: row.priority === p.value ? p.color : '#4b5563' }}>{p.label}</button>
                ))}
              </div>
              <button onClick={() => updateRow(i, 'recur_daily', !row.recur_daily)} title="Daily recurring" style={{ background: row.recur_daily ? 'rgba(167,139,250,0.15)' : 'transparent', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, fontSize: 13, cursor: 'pointer', padding: '2px 5px', color: row.recur_daily ? '#a78bfa' : '#374151' }}>🔁</button>
              {rows.length > 1 && <button onClick={() => setRows(p => p.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: '#374151', cursor: 'pointer', fontSize: 14, padding: '0 2px' }}>✕</button>}
            </div>
          ))}
        </div>
        <button className="btn-ghost" onClick={() => setRows(p => [...p, emptyRow()])} style={{ fontSize: 13, marginBottom: 14, color: '#6366f1' }}>+ Add row</button>
        {err && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12, padding: '8px 12px', background: 'rgba(248,113,113,0.08)', borderRadius: 6 }}>{err}</p>}
        <button className="btn-primary" onClick={handleSave} disabled={saving || saved} style={{ width: '100%', padding: '13px', justifyContent: 'center', background: saved ? 'rgba(34,197,94,0.2)' : undefined, color: saved ? '#22c55e' : undefined, border: saved ? '1px solid #22c55e' : undefined, fontSize: 15 }}>
          {saved ? '✓ Tasks Added!' : saving ? 'Saving...' : `Save ${validCount || ''} Tasks → ${selectedBiz?.name || '...'}`}
        </button>
        <p style={{ textAlign: 'center', fontSize: 11, color: '#374151', fontFamily: 'Space Mono, monospace', marginTop: 10, marginBottom: 0 }}>Press Enter to jump to next row ↵</p>
      </div>
    </div>
  )
}

function AddAgentTaskModal({ businesses, onClose, onDone }) {
  const [biz, setBiz] = useState(businesses[0] || null)
  const [title, setTitle] = useState('')
  const [instruction, setInstruction] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    await supabase.from('os_agent_tasks').insert({
      business_id: biz?.id || null,
      biz_name: biz?.name || 'General',
      title: title.trim(),
      instruction: instruction.trim(),
      status: 'pending',
    })
    setSaving(false)
    onDone(); onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🤖 Add Agent Task</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text3)', marginBottom: '0.5rem' }}>
          Agent tasks are research or outreach tasks the AI will execute automatically. Coming in Phase 2 — for now, queue them up.
        </p>
        <div style={{ marginBottom: 12 }}>
          <div className="form-label">Business</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {businesses.map(b => (
              <button key={b.id} onClick={() => setBiz(b)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, border: '1px solid', background: biz?.id === b.id ? b.color + '22' : 'rgba(255,255,255,0.04)', borderColor: biz?.id === b.id ? b.color : 'rgba(255,255,255,0.08)', color: biz?.id === b.id ? b.color : '#9ca3af', fontSize: 13, cursor: 'pointer' }}>
                {b.emoji} {b.name}
              </button>
            ))}
          </div>
        </div>
        <div className="form-label">Task name</div>
        <input className="form-input" placeholder="e.g. Research rambutan suppliers in Tenkasi" value={title} onChange={e => setTitle(e.target.value)} />
        <div className="form-label">Detailed instruction</div>
        <textarea className="form-textarea" placeholder="e.g. Find wholesale rambutan fruit suppliers in Tenkasi, Tamil Nadu. Get business name, phone, address, and WhatsApp if available. Fill into contacts table tagged as WBE Supplier." value={instruction} onChange={e => setInstruction(e.target.value)} />
        <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ justifyContent: 'center' }}>
          <Bot size={15} /> {saving ? 'Queuing...' : 'Queue Agent Task'}
        </button>
      </div>
    </div>
  )
}

export default function TasksPage() {
  const { businesses, tasks, agentTasks, loadTasks, loadBusinesses, loadAgentTasks } = useApp()
  const [expanded, setExpanded] = useState({})
  const [showAddTask, setShowAddTask] = useState(null)
  const [showAddBiz, setShowAddBiz] = useState(false)
  const [showBulkAdd, setShowBulkAdd] = useState(false)
  const [showAgentAdd, setShowAgentAdd] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', status: 'pending', is_recurring: false, recur_daily: false, due_date: '' })
  const [newBiz, setNewBiz] = useState({ name: '', emoji: '🏢', color: '#6366f1' })
  const [editTask, setEditTask] = useState(null)
  const [activeView, setActiveView] = useState('tasks') // tasks | agents

  const tasksByBusiness = businesses.map(b => ({
    business: b, tasks: tasks.filter(t => t.business_id === b.id)
  }))

  async function addTask(businessId) {
    if (!newTask.title.trim()) return
    await supabase.from('tasks').insert({ ...newTask, business_id: businessId, due_date: newTask.due_date || null })
    setNewTask({ title: '', description: '', priority: 'medium', status: 'pending', is_recurring: false, recur_daily: false, due_date: '' })
    setShowAddTask(null); loadTasks()
  }

  async function updateTaskStatus(taskId, status) {
    await supabase.from('tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', taskId)
    loadTasks()
  }

  async function deleteTask(taskId) {
    await supabase.from('tasks').delete().eq('id', taskId); loadTasks()
  }

  async function addBusiness() {
    if (!newBiz.name.trim()) return
    await supabase.from('businesses').insert(newBiz)
    setNewBiz({ name: '', emoji: '🏢', color: '#6366f1' })
    setShowAddBiz(false); loadBusinesses()
  }

  async function saveEditTask() {
    if (!editTask) return
    await supabase.from('tasks').update({ title: editTask.title, description: editTask.description, priority: editTask.priority, status: editTask.status, is_recurring: editTask.is_recurring, recur_daily: editTask.recur_daily, due_date: editTask.due_date || null, updated_at: new Date().toISOString() }).eq('id', editTask.id)
    setEditTask(null); loadTasks()
  }

  async function deleteAgentTask(id) {
    await supabase.from('os_agent_tasks').delete().eq('id', id); loadAgentTasks()
  }

  const pendingAgents = agentTasks.filter(a => a.status === 'pending')
  const doneAgents = agentTasks.filter(a => a.status === 'done')

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Tasks & Agents</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-ghost" onClick={() => setShowBulkAdd(true)} style={{ fontSize: 13 }}><Zap size={14} /> Bulk Add</button>
          <button className="btn-ghost" onClick={() => setShowAgentAdd(true)} style={{ fontSize: 13, color: 'var(--accent2)' }}><Bot size={14} /> Agent Task</button>
          <button className="btn-primary" onClick={() => setShowAddBiz(true)}><Plus size={14} /> Business</button>
        </div>
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={() => setActiveView('tasks')} className={activeView === 'tasks' ? 'btn-primary' : 'btn-ghost'} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>📋 Daily Tasks</button>
        <button onClick={() => setActiveView('agents')} className={activeView === 'agents' ? 'btn-primary' : 'btn-ghost'} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
          🤖 Agent Queue {agentTasks.length > 0 && <span style={{ marginLeft: 4, background: 'rgba(159,94,248,0.2)', borderRadius: 20, padding: '0 5px', fontSize: '0.7rem' }}>{agentTasks.length}</span>}
        </button>
      </div>

      {activeView === 'tasks' && (
        <>
          {tasksByBusiness.map(({ business, tasks: bTasks }) => {
            const isOpen = expanded[business.id] !== false
            const done = bTasks.filter(t => t.status === 'done').length
            return (
              <div key={business.id} className="business-block">
                <div className="business-header" onClick={() => setExpanded(p => ({ ...p, [business.id]: !isOpen }))}>
                  <div className="biz-title-row">
                    <span className="biz-emoji">{business.emoji}</span>
                    <span className="biz-name" style={{ color: business.color }}>{business.name}</span>
                    <span className="biz-count">{done}/{bTasks.length}</span>
                  </div>
                  <div className="biz-header-actions">
                    <button className="btn-ghost-sm" onClick={e => { e.stopPropagation(); setShowAddTask(business.id) }}><Plus size={14} /></button>
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
                {isOpen && (
                  <div className="task-list">
                    {bTasks.length === 0 && <div className="no-tasks">No tasks. Click + to add.</div>}
                    {bTasks.map(task => (
                      <div key={task.id} className={`task-item status-${task.status}${task.is_agent_task ? ' is-agent' : ''}`}>
                        <button className="task-status-btn" onClick={() => {
                          const next = task.status === 'pending' ? 'in_progress' : task.status === 'in_progress' ? 'done' : 'pending'
                          updateTaskStatus(task.id, next)
                        }}>{STATUS_CONFIG[task.status]?.icon}</button>
                        <div className="task-main">
                          <div className="task-title">{task.title}</div>
                          {task.description && <div className="task-desc">{task.description}</div>}
                          <div className="task-meta">
                            <span className="priority-badge" style={{ background: PRIORITY_CONFIG[task.priority]?.color + '22', color: PRIORITY_CONFIG[task.priority]?.color }}>{PRIORITY_CONFIG[task.priority]?.label}</span>
                            {task.recur_daily && <span className="recur-badge">🔁 Daily</span>}
                            {task.due_date && <span className="due-badge">📅 {task.due_date}</span>}
                            {task.is_agent_task && <span className="agent-badge">🤖 Agent</span>}
                          </div>
                        </div>
                        <div className="task-actions">
                          <button className="icon-btn" onClick={() => setEditTask(task)}><Edit2 size={13} /></button>
                          <button className="icon-btn danger" onClick={() => deleteTask(task.id)}><Trash2 size={13} /></button>
                        </div>
                      </div>
                    ))}
                    {showAddTask === business.id && (
                      <div className="add-task-form">
                        <input className="form-input" placeholder="Task title *" value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} />
                        <input className="form-input" placeholder="Description (optional)" value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))} />
                        <div className="form-row">
                          <select className="form-select" value={newTask.priority} onChange={e => setNewTask(p => ({ ...p, priority: e.target.value }))}>
                            {Object.entries(PRIORITY_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                          </select>
                          <input type="date" className="form-input" value={newTask.due_date} onChange={e => setNewTask(p => ({ ...p, due_date: e.target.value }))} />
                        </div>
                        <div className="form-check-row">
                          <label><input type="checkbox" checked={newTask.is_recurring} onChange={e => setNewTask(p => ({ ...p, is_recurring: e.target.checked }))} /> Recurring</label>
                          <label><input type="checkbox" checked={newTask.recur_daily} onChange={e => setNewTask(p => ({ ...p, recur_daily: e.target.checked }))} /> Daily</label>
                        </div>
                        <div className="form-actions">
                          <button className="btn-primary" onClick={() => addTask(business.id)}>Add Task</button>
                          <button className="btn-ghost" onClick={() => setShowAddTask(null)}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}

      {activeView === 'agents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {agentTasks.length === 0 && (
            <div className="empty-card">
              No agent tasks yet. Click "Agent Task" above to queue research or outreach tasks that will be executed automatically (Phase 2).
            </div>
          )}
          {pendingAgents.length > 0 && (
            <>
              <div className="section-title">⏳ Queued</div>
              {pendingAgents.map(a => (
                <div key={a.id} className="agent-task-card">
                  <div className="agent-header">
                    <span className="agent-icon">🤖</span>
                    <div style={{ flex: 1 }}>
                      <div className="agent-title">{a.title}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text3)', marginTop: '0.15rem' }}>{a.biz_name}</div>
                    </div>
                    <span className="agent-status pending">pending</span>
                    <button className="icon-btn danger" onClick={() => deleteAgentTask(a.id)}><Trash2 size={13} /></button>
                  </div>
                  {a.instruction && <div className="agent-desc">{a.instruction}</div>}
                </div>
              ))}
            </>
          )}
          {doneAgents.length > 0 && (
            <>
              <div className="section-title">✅ Completed</div>
              {doneAgents.map(a => (
                <div key={a.id} className="agent-task-card" style={{ opacity: 0.75 }}>
                  <div className="agent-header">
                    <span className="agent-icon">✅</span>
                    <div className="agent-title">{a.title}</div>
                    <span className="agent-status done">done</span>
                  </div>
                  {a.result && <div className="agent-result">{a.result}</div>}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Modals */}
      {showAddBiz && (
        <div className="modal-overlay" onClick={() => setShowAddBiz(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>New Business</h3><button onClick={() => setShowAddBiz(false)}><X size={18} /></button></div>
            <input className="form-input" placeholder="Business name *" value={newBiz.name} onChange={e => setNewBiz(p => ({ ...p, name: e.target.value }))} />
            <div className="form-row">
              <input className="form-input" placeholder="Emoji" value={newBiz.emoji} onChange={e => setNewBiz(p => ({ ...p, emoji: e.target.value }))} style={{ maxWidth: 80 }} />
              <input type="color" className="color-picker" value={newBiz.color} onChange={e => setNewBiz(p => ({ ...p, color: e.target.value }))} />
            </div>
            <button className="btn-primary" onClick={addBusiness}>Create Business</button>
          </div>
        </div>
      )}

      {editTask && (
        <div className="modal-overlay" onClick={() => setEditTask(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Edit Task</h3><button onClick={() => setEditTask(null)}><X size={18} /></button></div>
            <input className="form-input" placeholder="Title" value={editTask.title} onChange={e => setEditTask(p => ({ ...p, title: e.target.value }))} />
            <input className="form-input" placeholder="Description" value={editTask.description || ''} onChange={e => setEditTask(p => ({ ...p, description: e.target.value }))} />
            <div className="form-row">
              <select className="form-select" value={editTask.priority} onChange={e => setEditTask(p => ({ ...p, priority: e.target.value }))}>
                {Object.entries(PRIORITY_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </select>
              <select className="form-select" value={editTask.status} onChange={e => setEditTask(p => ({ ...p, status: e.target.value }))}>
                {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </select>
            </div>
            <input type="date" className="form-input" value={editTask.due_date || ''} onChange={e => setEditTask(p => ({ ...p, due_date: e.target.value }))} />
            <div className="form-check-row">
              <label><input type="checkbox" checked={editTask.is_recurring} onChange={e => setEditTask(p => ({ ...p, is_recurring: e.target.checked }))} /> Recurring</label>
              <label><input type="checkbox" checked={editTask.recur_daily} onChange={e => setEditTask(p => ({ ...p, recur_daily: e.target.checked }))} /> Daily</label>
            </div>
            <div className="form-actions">
              <button className="btn-primary" onClick={saveEditTask}>Save</button>
              <button className="btn-ghost" onClick={() => setEditTask(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showBulkAdd && <BulkAddModal businesses={businesses} onClose={() => setShowBulkAdd(false)} onDone={loadTasks} />}
      {showAgentAdd && <AddAgentTaskModal businesses={businesses} onClose={() => setShowAgentAdd(false)} onDone={loadAgentTasks} />}
    </div>
  )
}
