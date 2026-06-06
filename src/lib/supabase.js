import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://izcsbvbexqvmrcteitiv.supabase.co'
// Replace with your actual anon key from Supabase dashboard > Settings > API
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6Y3NidmJleHF2bXJjdGVpdGl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4MzY1MTEsImV4cCI6MjA5NDQxMjUxMX0.6ickp0jEuUnD3lQKdKvn7uTZ9wFOW9QJiYFtv12kmbY'

export const supabase = createClient(supabaseUrl, supabaseKey)
