import { AppProvider, useApp } from './context/AppContext'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import TasksPage from './pages/TasksPage'
import NotesPage from './pages/NotesPage'
import ContactsPage from './pages/ContactsPage'
import BusinessesPage from './pages/BusinessesPage'
import TransactionsPage from './pages/TransactionsPage'
import DebtsPage from './pages/DebtsPage'
import SubscriptionsPage from './pages/SubscriptionsPage'
import ManageBusinessPage from './pages/ManageBusinessPage'
import elatzLogo from './assets/elatz-logo.png'
import {
  LayoutDashboard, CheckSquare, Wallet, CreditCard, Zap,
  LogOut, RefreshCw, FileText, Users, Building2, Settings, Briefcase
} from 'lucide-react'

const NAV_ITEMS = [
  { id: 'dashboard',   label: 'Briefing',    icon: LayoutDashboard, section: 'Command' },
  { id: 'businesses',  label: 'Businesses',  icon: Briefcase,       section: 'Command' },
  { id: 'tasks',       label: 'Tasks',       icon: CheckSquare,     section: 'Command' },
  { id: 'notes',       label: 'Status',      icon: FileText,        section: 'Command' },
  { id: 'contacts',    label: 'Contacts',    icon: Users,           section: 'Command' },
  { id: 'money',       label: 'Money',       icon: Wallet,          section: 'Finance' },
  { id: 'debts',       label: 'Debts',       icon: CreditCard,      section: 'Finance' },
  { id: 'subs',        label: 'Subs',        icon: Zap,             section: 'Finance' },
  { id: 'manage-biz',  label: 'Manage Biz',  icon: Settings,        section: 'Settings' },
]

const MOBILE_NAV = ['dashboard', 'businesses', 'tasks', 'money', 'contacts']

function AppShell() {
  const { isLoggedIn, authLoading, activeTab, setActiveTab, logout, loading, loadAll, user } = useApp()

  if (authLoading) return <LoginPage />
  if (!isLoggedIn) return <LoginPage />

  const pages = {
    dashboard:  <Dashboard />,
    businesses: <BusinessesPage />,
    tasks:      <TasksPage />,
    notes:      <NotesPage />,
    contacts:   <ContactsPage />,
    money:      <TransactionsPage />,
    debts:      <DebtsPage />,
    subs:       <SubscriptionsPage />,
    'manage-biz': <ManageBusinessPage />,
  }

  const sections = [...new Set(NAV_ITEMS.map(i => i.section))]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src={elatzLogo} alt="ELATZ" style={{ width: 30, height: 30, borderRadius: 6, objectFit: 'cover' }} />
          <span className="sidebar-brand">ELATZ OS</span>
        </div>
        <nav className="sidebar-nav">
          {sections.map(section => (
            <div key={section}>
              <div className="sidebar-section-label">{section}</div>
              {NAV_ITEMS.filter(i => i.section === section).map(item => {
                const Icon = item.icon
                return (
                  <button key={item.id} className={`sidebar-nav-item ${activeTab === item.id ? 'active' : ''}`} onClick={() => setActiveTab(item.id)}>
                    <Icon size={16} /><span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          ))}
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

      <header className="topbar">
        <div className="topbar-left">
          <img src={elatzLogo} alt="ELATZ" style={{ width: 26, height: 26, borderRadius: 6, objectFit: 'cover' }} />
          <span className="topbar-brand">ELATZ OS</span>
        </div>
        <div className="topbar-right">
          {user?.user_metadata?.avatar_url && <img src={user.user_metadata.avatar_url} className="user-avatar" alt="avatar" />}
          <button className="icon-btn" onClick={loadAll} title="Refresh"><RefreshCw size={16} className={loading ? 'spinning' : ''} /></button>
          <button className="icon-btn" onClick={logout} title="Logout"><LogOut size={16} /></button>
        </div>
      </header>

      <main className="main-content">
        {pages[activeTab] || <Dashboard />}
      </main>

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
  return <AppProvider><AppShell /></AppProvider>
}
