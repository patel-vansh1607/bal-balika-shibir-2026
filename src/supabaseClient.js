// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://htanzzhgafmeapxhjaux.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0YW56emhnYWZtZWFweGhqYXV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMzQ1NjcsImV4cCI6MjA1NjgxMDU2N30.K9J4Y4F1kL6m9N7v8x2Z3v5C6b7N8m9K0l1J2h3G4f5';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);