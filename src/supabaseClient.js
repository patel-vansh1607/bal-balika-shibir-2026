// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://htanzzhgafmeapxhjaux.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0YW56emhnYWZtZWFweGhqYXV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NTgwMDAsImV4cCI6MjEwMzEzNDAwMH0.bbVcfp3pToL1SiTtU5K4IBMerIvzA4EjKrxhNfryEUg';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);