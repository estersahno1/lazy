import { supabase, isSupabaseEnabled } from '../lib/supabase';

function toStudent(sessionUser, profile) {
  return {
    id: sessionUser.id,
    name: profile?.name ?? sessionUser.user_metadata?.name ?? '',
    email: sessionUser.email ?? '',
    institution: profile?.institution ?? sessionUser.user_metadata?.institution ?? '',
    created_at: profile?.created_at?.slice?.(0, 10) ?? new Date().toISOString().slice(0, 10),
    hasCompletedOnboarding: profile?.onboarding_completed ?? false,
  };
}

export async function getSupabaseSession() {
  if (!isSupabaseEnabled) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return null;
  return data.session;
}

export async function fetchSupabaseStudent(session) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, institution, created_at, onboarding_completed')
    .eq('id', session.user.id)
    .maybeSingle();
  return toStudent(session.user, profile);
}

export async function supabaseLogin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) return { ok: false, error: 'אימייל או סיסמה שגויים' };
  const student = await fetchSupabaseStudent(data.session);
  return { ok: true, student, session: data.session };
}

export async function supabaseLoginWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) {
    return { ok: false, error: 'ההתחברות עם Google נכשלה. נסי שוב.' };
  }
  return { ok: true };
}

export async function supabaseRegister({ name, email, institution, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        name: name.trim(),
        institution: institution.trim(),
      },
    },
  });
  if (error) {
    const msg = error.message?.includes('already registered')
      ? 'כתובת האימייל כבר רשומה במערכת'
      : error.message || 'שגיאה בהרשמה';
    return { ok: false, error: msg };
  }
  if (!data.session) {
    return {
      ok: true,
      needsConfirmation: true,
      email: normalizedEmail,
    };
  }
  const student = await fetchSupabaseStudent(data.session);
  return { ok: true, student, session: data.session, email: normalizedEmail };
}

export async function supabaseLogout() {
  await supabase.auth.signOut();
}

export async function supabaseCompleteOnboarding(userId) {
  const { error } = await supabase
    .from('profiles')
    .update({ onboarding_completed: true })
    .eq('id', userId);
  if (error) console.warn('Failed to persist onboarding completion:', error);
}

export async function supabaseUpdateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      name: updates.name?.trim(),
      institution: updates.institution?.trim(),
    })
    .eq('id', userId)
    .select('name, institution, created_at')
    .single();

  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    student: {
      id: userId,
      name: data.name,
      institution: data.institution,
      email: updates.email,
      created_at: data.created_at?.slice?.(0, 10),
    },
  };
}

export async function supabaseDeleteAccount(userId) {
  await supabase.from('notifications').delete().eq('user_id', userId);
  await supabase.from('schedule_events').delete().eq('user_id', userId);
  await supabase.from('ai_tasks').delete().eq('user_id', userId);
  await supabase.from('urgent_tasks').delete().eq('user_id', userId);
  await supabase.from('courses').delete().eq('user_id', userId);
  await supabase.from('profiles').delete().eq('id', userId);
  await supabase.auth.signOut();
  return { ok: true };
}

export function onSupabaseAuthChange(callback) {
  if (!isSupabaseEnabled) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => data.subscription.unsubscribe();
}
