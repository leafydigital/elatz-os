import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AppContext = createContext(null)

export const ALLOWED_EMAILS = [
  'samrajakumarmdr@gmail.com',
  'abithaanuchithra@gmail.com',
  'wanderbreezeexim@gmail.com',
  'contact@wanderbreezeexim.com',
  'leafydigital@gmail.com',
  'hello@leafydigital.in',
]

export const EXPENSE_CATEGORIES = [
  'Food', 'House Rent', 'Shop Rent', 'Travel', 'Marketing',
  'Vegetables', 'Masalas', 'Meat', 'Fish', 'Milk & Eggs',
  'Energy Drinks', 'Junk Snacks', 'Snacks for Home',
  'Online Shopping', 'Debt Return', 'EMI', 'Credit Card Payment',
  'Electricity Bill (Shop)', 'Electricity Bill (House)',
  'Internet Bill (Shop)', 'Internet Bill (House)',
  'Water Bill', 'Municipality', 'Mobile Recharge (Mine)',
  'Mobile Recharge (Wife)', 'Mobile Recharge (Wear It)',
  'Mobile Recharge (Wander Breeze)', 'Mobile Recharge (Leafy)',
  'Subscription', 'Salary/Wages', 'Raw Materials',
  'Transport & Logistics', 'Equipment', 'Miscellaneous'
]

export const INCOME_CATEGORIES = [
  'Lending (Income)', 'Client Payment', 'Export Revenue',
  'Sales Revenue', 'Commission', 'Freelance Income',
  'Investment Return', 'Other Income'
]

export const BIZ_CONFIG = {
  wbe:    { label: 'Wander Breeze Exim', emoji: '🌿', color: '#10b981', key: 'wbe' },
  driveX: { label: 'DriveX RC Garage',   emoji: '🚛', color: '#f5c842', key: 'driveX' },
  wearit: { label: 'Wear It',             emoji: '👕', color: '#8b5cf6', key: 'wearit' },
  elatz:  { label: 'ELATZ Groups',        emoji: '⚡', color: '#7c3aed', key: 'elatz' },
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState(null)
  const [businesses, setBusinesses] = useState([])
  const [tasks, setTasks] = useState([])
  const [transactions, setTransactions] = useState([])
  const [debts, setDebts] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [notes, setNotes] = useState([])
  const [agentTasks, setAgentTasks] = useState([])
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  function handleSession(session) {
    if (!session) { setUser(null); setAuthError(null); return }
    const email = session.user?.email?.toLowerCase()
    if (!ALLOWED_EMAILS.includes(email)) {
      supabase.auth.signOut()
      setUser(null)
      setAuthError(`Access denied. ${email} is not an authorised account.`)
      return
    }
    setUser(session.user)
    setAuthError(null)
  }

  useEffect(() => { if (user) loadAll() }, [user])

  async function loadAll() {
    setLoading(true)
    await Promise.all([
      loadBusinesses(), loadTasks(), loadTransactions(),
      loadDebts(), loadSubscriptions(), loadNotes(),
      loadAgentTasks(), loadContacts()
    ])
    setLoading(false)
  }

  async function loadBusinesses() {
    const { data } = await supabase.from('businesses').select('*').order('created_at')
    if (data) setBusinesses(data)
  }
  async function loadTasks() {
    const { data } = await supabase.from('tasks').select('*').order('priority', { ascending: false })
    if (data) setTasks(data)
  }
  async function loadTransactions() {
    const { data } = await supabase.from('transactions').select('*, businesses(name, emoji, color)').order('transaction_date', { ascending: false }).limit(500)
    if (data) setTransactions(data)
  }
  async function loadDebts() {
    const { data } = await supabase.from('debts').select('*').eq('is_active', true).order('created_at')
    if (data) setDebts(data)
  }
  async function loadSubscriptions() {
    const { data } = await supabase.from('subscriptions').select('*').eq('is_active', true).order('name')
    if (data) setSubscriptions(data)
  }
  async function loadNotes() {
    const { data } = await supabase.from('os_notes').select('*').order('updated_at', { ascending: false })
    if (data) setNotes(data)
  }
  async function loadAgentTasks() {
    const { data } = await supabase.from('os_agent_tasks').select('*').order('created_at', { ascending: false }).limit(50)
    if (data) setAgentTasks(data)
  }
  async function loadContacts() {
    const { data } = await supabase.from('os_contacts').select('*').order('created_at', { ascending: false }).limit(200)
    if (data) setContacts(data)
  }

  async function loginWithGoogle() {
    setAuthError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
    if (error) setAuthError(error.message)
  }

  async function logout() {
    await supabase.auth.signOut()
    setUser(null)
    setBusinesses([]); setTasks([]); setTransactions([])
    setDebts([]); setSubscriptions([]); setNotes([])
    setAgentTasks([]); setContacts([])
  }

  return (
    <AppContext.Provider value={{
      user, isLoggedIn: !!user, authLoading, authError,
      loginWithGoogle, logout,
      businesses, setBusinesses, loadBusinesses,
      tasks, setTasks, loadTasks,
      transactions, setTransactions, loadTransactions,
      debts, setDebts, loadDebts,
      subscriptions, setSubscriptions, loadSubscriptions,
      notes, setNotes, loadNotes,
      agentTasks, setAgentTasks, loadAgentTasks,
      contacts, setContacts, loadContacts,
      loading, activeTab, setActiveTab, loadAll
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
