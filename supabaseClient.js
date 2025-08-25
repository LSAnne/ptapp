// supabaseClient.js
// Load AFTER the CDN script for @supabase/supabase-js and BEFORE any page JS.

(function () {
  // Your project keys
  const SB_URL  = 'https://ukqmpkzljwiwpyvygrai.supabase.co';
  const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcW1wa3psandpd3B5dnlncmFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMjk1MTAsImV4cCI6MjA2OTgwNTUxMH0.4H3XnW4tYSDofnFeSoEBqACVFh1Ud5sI8bXsnEsiu4E';

  if (!window.supabase) {
    console.error('Supabase CDN not loaded before supabaseClient.js');
    return;
  }

  // Single shared client
  window.sb = window.supabase.createClient(SB_URL, SB_ANON);

  // Helper (optional)
  window.getCurrentUser = async () => {
    const { data, error } = await window.sb.auth.getUser();
    return error ? null : (data?.user ?? null);
  };
})();