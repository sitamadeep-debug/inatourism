// Supabase Connection & Synchronization Module (Live Configured)

window.SUPABASE_CONFIG = {
  url: localStorage.getItem('supabase_url') || "https://ejqnozlhijoajykilfpy.supabase.co",
  anonKey: localStorage.getItem('supabase_anon_key') || "sb_publishable_gyBNo-B1YOgEZtIOWBIfmw__pouxfqc"
};

// Guarantee default storage values match live environment
if (!localStorage.getItem('supabase_url')) {
  localStorage.setItem('supabase_url', "https://ejqnozlhijoajykilfpy.supabase.co");
}
if (!localStorage.getItem('supabase_anon_key')) {
  localStorage.setItem('supabase_anon_key', "sb_publishable_gyBNo-B1YOgEZtIOWBIfmw__pouxfqc");
}

window.supabaseClient = null;

function initSupabase() {
  const { url, anonKey } = window.SUPABASE_CONFIG;
  if (typeof window.supabase !== 'undefined' && url && anonKey && url !== "YOUR_SUPABASE_URL") {
    try {
      window.supabaseClient = window.supabase.createClient(url, anonKey);
      console.log("⚡ Supabase connected successfully to", url);
      return window.supabaseClient;
    } catch (e) {
      console.warn("Supabase init error:", e);
    }
  }
  return null;
}

// Fetch comments from Supabase if active
async function dbFetchComments(destId) {
  const client = initSupabase();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('comments')
      .select('*')
      .eq('dest_id', destId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn("Error fetching Supabase comments:", err);
    return null;
  }
}

// Insert comment to Supabase
async function dbInsertComment(destId, author, role, text) {
  const client = initSupabase();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('comments')
      .insert([{ dest_id: destId, author, role, text, likes: 0 }])
      .select();
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn("Error inserting Supabase comment:", err);
    return null;
  }
}

// Save/Update Task to Supabase
async function dbSaveTask(taskId, studentName, status, text, grade = null, feedback = null) {
  const client = initSupabase();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('tasks')
      .upsert({
        task_id: taskId,
        student_name: studentName,
        status,
        text,
        grade,
        feedback,
        updated_at: new Date().toISOString()
      })
      .select();
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn("Error saving Supabase task:", err);
    return null;
  }
}

window.dbFetchComments = dbFetchComments;
window.dbInsertComment = dbInsertComment;
window.dbSaveTask = dbSaveTask;
window.initSupabase = initSupabase;
