import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { Plus, CheckCircle2, Circle, Clock, AlertTriangle, ChevronDown, ChevronUp, Trash2, Edit2, X } from 'lucide-react'

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', color: '#ef4444', icon: <AlertTriangle size={12} /> },
  high: { label: 'High', color: '#f59e0b', icon: '🔥' },
  medium: { label: 'Medium', color: '#3b82f6', icon: '📌' },
  low: { label: 'Low', color: '#6b7280', icon: '📎' },
}

const STATUS_CONFIG = {
  pending: { label: 'Pending', icon: <Circle size={16} /> },
  in_progress: { label: 'In Progress', icon: <Clock size={16} /> },
  done: { label: 'Done', icon: <CheckCircle2 size={16} /> },
  deferred: { label: 'Deferred', icon: '⏸️' },
}

export default function TasksPage() {
  const { businesses, tasks, loadTasks, loadBusinesses } = useApp()
  const [expanded, setExpanded] = useState({})
  const [showAddTask, setShowAddTask] = useState(null)
  const [showAddBiz, setShowAddBiz] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', status: 'pending', is_recurring: false, recur_daily: false, due_date: '' })
  const [newBiz, setNewBiz] = useState({ name: '', emoji: '🏢', color: '#6366f1' })
  const [editTask, setEditTask] = useState(null)

  const tasksByBusiness = businesses.map(b => ({
    business: b,
    tasks: tasks.filter(t => t.business_id === b.id)
  }))

  const unassigned = tasks.filter(t => !t.business_id)

  async function addTask(businessId) {
    if (!newTask.title.trim()) return
    await supabase.from('tasks').insert({
      ...newTask,
      business_id: businessId,
      due_date: newTask.due_date || null
    })
    setNewTask({ title: '', description: '', priority: 'medium', status: 'pending', is_recurring: false, recur_daily: false, due_date: '' })
    setShowAddTask(null)
    loadTasks()
  }

  async function updateTaskStatus(taskId, status) {
    await supabase.from('tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', taskId)
    loadTasks()
  }

  async function deleteTask(taskId) {
    await supabase.from('tasks').delete().eq('id', taskId)
    loadTasks()
  }

  async function addBusiness() {
    if (!newBiz.name.trim()) return
    await supabase.from('businesses').insert(newBiz)
    setNewBiz({ name: '', emoji: '🏢', color: '#6366f1' })
    setShowAddBiz(false)
    loadBusinesses()
  }

  async function saveEditTask() {
    if (!editTask) return
    await supabase.from('tasks').update({
      title: editTask.title,
      description: editTask.description,
      priority: editTask.priority,
      status: editTask.status,
      is_recurring: editTask.is_recurring,
      recur_daily: editTask.recur_daily,
      due_date: editTask.due_date || null,
      updated_at: new Date().toISOString()
    }).eq('id', editTask.id)
    setEditTask(null)
    loadTasks()
  }

  function toggleExpand(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Daily Tasks</h1>
        <button className="btn-primary" onClick={() => setShowAddBiz(true)}>
          <Plus size={14} /> Add Business
        </button>
      </div>

      {tasksByBusiness.map(({ business, tasks: bTasks }) => {
        const isOpen = expanded[business.id] !== false
        const done = bTasks.filter(t => t.status === 'done').length
        return (
          <div key={business.id} className="business-block">
            <div className="business-header" onClick={() => toggleExpand(business.id)}>
              <div className="biz-title-row">
                <span className="biz-emoji">{business.emoji}</span>
                <span className="biz-name" style={{ color: business.color }}>{business.name}</span>
                <span className="biz-count">{done}/{bTasks.length}</span>
              </div>
              <div className="biz-header-actions">
                <button className="btn-ghost-sm" onClick={e => { e.stopPropagation(); setShowAddTask(business.id) }}>
                  <Plus size={14} />
                </button>
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>

            {isOpen && (
              <div className="task-list">
                {bTasks.length === 0 && (
                  <div className="no-tasks">No tasks. Click + to add one.</div>
                )}
                {bTasks.map(task => (
                  <div key={task.id} className={`task-item status-${task.status}`}>
                    <button
                      className="task-status-btn"
                      onClick={() => {
                        const next = task.status === 'pending' ? 'in_progress' : task.status === 'in_progress' ? 'done' : 'pending'
                        updateTaskStatus(task.id, next)
                      }}
                    >
                      {STATUS_CONFIG[task.status]?.icon}
                    </button>
                    <div className="task-main">
                      <div className="task-title">{task.title}</div>
                      {task.description && <div className="task-desc">{task.description}</div>}
                      <div className="task-meta">
                        <span className="priority-badge" style={{ background: PRIORITY_CONFIG[task.priority]?.color + '22', color: PRIORITY_CONFIG[task.priority]?.color }}>
                          {PRIORITY_CONFIG[task.priority]?.label}
                        </span>
                        {task.is_recurring && <span className="recur-badge">{task.recur_daily ? '🔁 Daily' : '🔁 Recurring'}</span>}
                        {task.due_date && <span className="due-badge">📅 {task.due_date}</span>}
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

      {/* Add Business Modal */}
      {showAddBiz && (
        <div className="modal-overlay" onClick={() => setShowAddBiz(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Business</h3>
              <button onClick={() => setShowAddBiz(false)}><X size={18} /></button>
            </div>
            <input className="form-input" placeholder="Business name *" value={newBiz.name} onChange={e => setNewBiz(p => ({ ...p, name: e.target.value }))} />
            <div className="form-row">
              <input className="form-input" placeholder="Emoji" value={newBiz.emoji} onChange={e => setNewBiz(p => ({ ...p, emoji: e.target.value }))} style={{ maxWidth: 80 }} />
              <input type="color" className="color-picker" value={newBiz.color} onChange={e => setNewBiz(p => ({ ...p, color: e.target.value }))} />
            </div>
            <button className="btn-primary" onClick={addBusiness}>Create Business</button>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editTask && (
        <div className="modal-overlay" onClick={() => setEditTask(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Task</h3>
              <button onClick={() => setEditTask(null)}><X size={18} /></button>
            </div>
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
    </div>
  )
}
