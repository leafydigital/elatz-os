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

export const BANK_ACCOUNTS = ['ICICI', 'HDFC', 'Cash', 'UPI', 'Other']

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
  const [marketPrices, setMarketPrices] = useState([])
  const [products, setProducts] = useState([])
  const [invoices, setInvoices] = useState([])
  const [settings, setSettings] = useState({})
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
      loadAgentTasks(), loadContacts(), loadMarketPrices(),
      loadProducts(), loadInvoices(), loadSettings()
    ])
    setLoading(false)
  }

  async function loadSettings() {
    const { data } = await supabase.from('os_settings').select('*')
    if (data) setSettings(Object.fromEntries(data.map(r => [r.key, r.value])))
  }
  async function saveSetting(key, value) {
    await supabase.from('os_settings').upsert({ key, value, updated_at: new Date().toISOString() })
    setSettings(p => ({ ...p, [key]: value }))
  }

  async function loadBusinesses() {
    const { data } = await supabase.from('businesses').select('*').order('created_at')
    if (data) setBusinesses(data)
  }
  async function loadTasks() {
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
    if (data) setTasks(data)
  }
  async function loadTransactions() {
    const { data } = await supabase.from('transactions')
      .select('*, businesses(name, emoji, color)')
      .order('transaction_date', { ascending: false }).limit(500)
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
  async function loadMarketPrices() {
    const { data } = await supabase.from('os_market_prices').select('*').order('fetched_at', { ascending: false }).limit(50)
    if (data) setMarketPrices(data)
  }
  async function loadProducts() {
    const { data } = await supabase.from('os_products').select('*, businesses(name, color)').order('created_at', { ascending: false })
    if (data) setProducts(data)
  }
  async function loadInvoices() {
    const { data } = await supabase.from('os_invoices').select('*, businesses(name, color)').order('invoice_date', { ascending: false }).limit(200)
    if (data) setInvoices(data)
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
    setAgentTasks([]); setContacts([]); setMarketPrices([])
    setProducts([]); setInvoices([])
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
      marketPrices, setMarketPrices, loadMarketPrices,
      products, setProducts, loadProducts,
      invoices, setInvoices, loadInvoices,
      settings, loadSettings, saveSetting,
      loading, activeTab, setActiveTab, loadAll
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
