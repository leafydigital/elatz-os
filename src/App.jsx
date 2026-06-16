import { AppProvider, useApp } from './context/AppContext'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import TasksPage from './pages/TasksPage'
import NotesPage from './pages/NotesPage'
import ContactsPage from './pages/ContactsPage'
import TransactionsPage from './pages/TransactionsPage'
import DebtsPage from './pages/DebtsPage'
import SubscriptionsPage from './pages/SubscriptionsPage'
import ManageBusinessPage from './pages/ManageBusinessPage'
import {
  LayoutDashboard, CheckSquare, Wallet, CreditCard, Zap,
  LogOut, RefreshCw, FileText, Users, Building2
} from 'lucide-react'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Briefing',   icon: LayoutDashboard },
  { id: 'tasks',     label: 'Tasks',      icon: CheckSquare },
  { id: 'notes',     label: 'Status',     icon: FileText },
  { id: 'contacts',  label: 'Contacts',   icon: Users },
  { id: 'money',     label: 'Money',      icon: Wallet },
  { id: 'debts',     label: 'Debts',      icon: CreditCard },
  { id: 'subs',      label: 'Subs',       icon: Zap },
  { id: 'businesses',label: 'Businesses', icon: Building2 },
]

// Mobile shows only the 5 most-used tabs
const MOBILE_NAV = ['dashboard', 'tasks', 'notes', 'contacts', 'businesses']

function AppShell() {
  const { isLoggedIn, authLoading, activeTab, setActiveTab, logout, loading, loadAll, user } = useApp()

  if (authLoading) return <LoginPage />
  if (!isLoggedIn) return <LoginPage />

  const pages = {
    dashboard:  <Dashboard />,
    tasks:      <TasksPage />,
    notes:      <NotesPage />,
    contacts:   <ContactsPage />,
    money:      <TransactionsPage />,
    debts:      <DebtsPage />,
    subs:       <SubscriptionsPage />,
    businesses: <ManageBusinessPage />,
  }

  return (
    <div className="app-shell">
      {/* ── Sidebar (desktop) ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="login-logo" style={{ fontSize: '1.4rem', letterSpacing: '-3px' }}>
            <span className="logo-e">E</span><span className="logo-z">Z</span>
          </span>
          <span className="sidebar-brand">ELATZ OS</span>
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Command</div>
          {NAV_ITEMS.slice(0, 4).map(item => {
            const Icon = item.icon
            return (
              <button key={item.id} className={`sidebar-nav-item ${activeTab === item.id ? 'active' : ''}`} onClick={() => setActiveTab(item.id)}>
                <Icon size={16} /><span>{item.label}</span>
              </button>
            )
          })}
          <div className="sidebar-section-label">Finance</div>
          {NAV_ITEMS.slice(4, 7).map(item => {
            const Icon = item.icon
            return (
              <button key={item.id} className={`sidebar-nav-item ${activeTab === item.id ? 'active' : ''}`} onClick={() => setActiveTab(item.id)}>
                <Icon size={16} /><span>{item.label}</span>
              </button>
            )
          })}
          <div className="sidebar-section-label">Settings</div>
          {NAV_ITEMS.slice(7).map(item => {
            const Icon = item.icon
            return (
              <button key={item.id} className={`sidebar-nav-item ${activeTab === item.id ? 'active' : ''}`} onClick={() => setActiveTab(item.id)}>
                <Icon size={16} /><span>{item.label}</span>
              </button>
            )
          })}
        </nav>
        <div className="sidebar-footer">
          {user?.user_metadata?.avatar_url && <img src={user.user_metadata.avatar_url} className="user-avatar" alt="avatar" />}
          <span className="sidebar-user-name">{user?.user_metadata?.full_name?.split(' ')[0] || 'Ram'}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.25rem' }}>
            <button className="icon-btn" onClick={loadAll} title="Refresh"><RefreshCw size={15} className={loading ? 'spinning' : ''} /></button>
            <button className="icon-btn" onClick={logout} title="Logout"><LogOut size={15} /></button>
          </div>
        </div>
      </aside>

      {/* ── Mobile topbar ── */}
      <header className="topbar">
        <div className="topbar-left">
          <span className="topbar-logo"><span className="logo-e">E</span><span className="logo-z">Z</span></span>
          <span className="topbar-brand">ELATZ OS</span>
        </div>
        <div className="topbar-right">
          {user?.user_metadata?.avatar_url && <img src={user.user_metadata.avatar_url} className="user-avatar" alt="avatar" />}
          <button className="icon-btn" onClick={loadAll} title="Refresh"><RefreshCw size={16} className={loading ? 'spinning' : ''} /></button>
          <button className="icon-btn" onClick={logout} title="Logout"><LogOut size={16} /></button>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="main-content">
        {pages[activeTab] || <Dashboard />}
      </main>

      {/* ── Mobile bottom nav (5 tabs) ── */}
      <nav className="bottom-nav">
        {NAV_ITEMS.filter(i => MOBILE_NAV.includes(i.id)).map(item => {
          const Icon = item.icon
          return (
            <button key={item.id} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} onClick={() => setActiveTab(item.id)}>
              <Icon size={20} />
              <span className="nav-label">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  )
}
