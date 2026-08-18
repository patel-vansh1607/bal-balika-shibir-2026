// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hixqxsiokvynsjmxmudo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpeHF4c2lva3Z5bnNqbXhtdWRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNTczMDIsImV4cCI6MjEwMjYzMzMwMn0.VgHk_IgmhY0YTIDPLbgA_td1jnfhM0IGoY2f-VfH06Y';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);