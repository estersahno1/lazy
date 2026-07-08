import { createClient } from '@supabase/supabase-js';

const url = 'https://fkspzkbtvucdistmqvxb.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrc3B6a2J0dnVjZGlzdG1xdnhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0OTUyMDcsImV4cCI6MjA5OTA3MTIwN30.csOm_hDTK0pF_cMsnljBf4kqiK3Dy6yX3zcITWsi-YI';

export const isSupabaseEnabled = true;

export const supabase = createClient(url, anonKey);
