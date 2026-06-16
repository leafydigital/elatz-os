import { AppProvider, useApp } from './context/AppContext'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import TasksPage from './pages/TasksPage'
import TransactionsPage from './pages/TransactionsPage'
import DebtsPage from './pages/DebtsPage'
import SubscriptionsPage from './pages/SubscriptionsPage'
import { LayoutDashboard, CheckSquare, Wallet, CreditCard, Zap, LogOut, RefreshCw } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks',     label: 'Tasks',     icon: CheckSquare },
  { id: 'money',     label: 'Money',     icon: Wallet },
  { id: 'debts',     label: 'Debts',     icon: CreditCard },
  { id: 'subs',      label: 'Subs',      icon: Zap },
]

function AppShell() {
  const { isLoggedIn, authLoading, activeTab, setActiveTab, logout, loading, loadAll, user } = useApp()

  if (authLoading) return <LoginPage />
  if (!isLoggedIn)  return <LoginPage />

  const pages = {
    dashboard: <Dashboard />,
    tasks:     <TasksPage />,
    money:     <TransactionsPage />,
    debts:     <DebtsPage />,
    subs:      <SubscriptionsPage />,
  }

  return (
    <div className="app-shell">
      {/* ── Sidebar (tablet & desktop) ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-e">E</span><span className="logo-z">Z</span>
          <span className="sidebar-brand">ELATZ OS</span>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                className={`sidebar-nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
        <div className="sidebar-footer">
          {user?.user_metadata?.avatar_url && (
            <img src={user.user_metadata.avatar_url} className="user-avatar" alt="avatar" />
          )}
          <span className="sidebar-user-name">{user?.user_metadata?.full_name?.split(' ')[0] || 'Ram'}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.25rem' }}>
            <button className="icon-btn" onClick={loadAll} title="Refresh">
              <RefreshCw size={15} className={loading ? 'spinning' : ''} />
            </button>
            <button className="icon-btn" onClick={logout} title="Logout">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile topbar ── */}
      <header className="topbar">
        <div className="topbar-left">
          <span className="topbar-logo">
            <span className="logo-e">E</span><span className="logo-z">Z</span>
          </span>
          <span className="topbar-brand">ELATZ OS</span>
        </div>
        <div className="topbar-right">
          {user?.user_metadata?.avatar_url && (
            <img src={user.user_metadata.avatar_url} className="user-avatar" alt="avatar" />
          )}
          <button className="icon-btn" onClick={loadAll} title="Refresh">
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          </button>
          <button className="icon-btn" onClick={logout} title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="main-content">
        {pages[activeTab] || <Dashboard />}
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="bottom-nav">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
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
