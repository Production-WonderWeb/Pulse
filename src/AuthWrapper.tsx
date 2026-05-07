import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import App from './App';
import { User, UserRole } from './types/index';

const AuthWrapper = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [userProfile, setUserProfile] = useState<User | null>(null);

  useEffect(() => {
    if (!supabase || !supabase.auth) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user);
      else setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (user: any) => {
    if (!supabase || !supabase.from) return;
    try {
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error && error.code === 'PGRST116') {
        // Create profile if doesn't exist
        const { data: newData, error: insertError } = await supabase
          .from('profiles')
          .insert([{ id: user.id, email: user.email, role: 'Staff', display_name: user.email.split('@')[0] }])
          .select()
          .single();
          
        if (insertError) {
          console.error("Insert profile error:", insertError);
          setError(insertError.message);
          setLoading(false);
          return;
        }
        data = newData;
      } else if (error) {
        console.error("Select profile error:", error);
        setError(error.message);
        setLoading(false);
        return;
      }
      
      setUserProfile({
        id: data.id,
        name: data.display_name || user.email.split('@')[0],
        role: data.role as UserRole,
        imageUrl: data.avatar_url || '',
        email: data.email || user.email
      });
    } catch (err: any) {
      console.error("Error fetching profile", err);
      setError(err.message || 'Error fetching profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Check your email for the login link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-primary)] p-4 text-center">
        <div className="max-w-md p-8 bg-[var(--bg-secondary)] rounded-3xl border border-[var(--border-color)] shadow-2xl relative">
          <h1 className="text-2xl font-black mb-4">Supabase Setup Required</h1>
          <p className="text-sm text-[var(--text-secondary)] mb-6 text-left">
            To enable authentication and data saving, you must provide your Supabase credentials:
          </p>
          <ol className="text-xs text-left list-decimal pl-5 space-y-2 mb-6">
            <li>Create a project on <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-brand-blue underline">Supabase</a></li>
            <li>Go to AI Studio Settings &gt; Secrets</li>
            <li>Add <code className="bg-[var(--bg-primary)] px-1 rounded">VITE_SUPABASE_URL</code></li>
            <li>Add <code className="bg-[var(--bg-primary)] px-1 rounded">VITE_SUPABASE_ANON_KEY</code></li>
            <li>Run the SQL statements from the newly created <code>supabase.sql</code> file in your Supabase SQL Editor.</li>
          </ol>
          <div className="mt-6 pt-6 border-t border-[var(--border-color)]">
             <button 
               onClick={() => {
                 setSession({ user: { id: 'mock-1', email: 'admin@demo.com' } });
                 setUserProfile({ id: 'mock-1', name: 'Admin Demo', email: 'admin@demo.com', role: 'Administrator', imageUrl: '' });
               }}
               className="w-full bg-[var(--bg-primary)] border border-brand-orange text-brand-orange font-bold py-3 rounded-2xl shadow-xl hover:bg-brand-orange/10 transition-colors"
             >
               Skip & Continue in Demo Mode
             </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center items-center h-screen bg-[var(--bg-primary)]">Loading...</div>;
  }

  if (!session || !userProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-primary)] p-4">
        <form onSubmit={handleAuth} className="w-full max-w-sm p-8 bg-[var(--bg-secondary)] rounded-3xl border border-[var(--border-color)] shadow-2xl">
          <h2 className="text-2xl font-black text-center mb-6">{isSignUp ? 'Create Account' : 'Sign In'}</h2>
          
          {error && <p className="text-red-500 text-xs mb-4 text-center">{error}</p>}
          
          <div className="space-y-4">
            <div>
              <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-b border-[var(--border-color)] py-2 text-sm outline-none focus:border-brand-blue"
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border-b border-[var(--border-color)] py-2 text-sm outline-none focus:border-brand-blue"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-brand-blue text-white font-bold py-3 rounded-2xl shadow-xl shadow-brand-blue/20 hover:opacity-90 transition-opacity mt-4"
              disabled={loading}
            >
              {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
            </button>
            <p className="text-center mt-4 text-xs text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]" onClick={() => setIsSignUp(!isSignUp)}>
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </p>
            {isSignUp && (
              <div className="mt-4 p-3 bg-brand-blue/10 border border-brand-blue/20 rounded-xl">
                <p className="text-[10px] text-brand-blue font-medium text-left">
                  <strong>Note:</strong> By default, Supabase requires email confirmation. If you use a fake email, you must disable "Confirm email" in your Supabase Auth settings to log in.
                </p>
              </div>
            )}
            
            {session && !userProfile && (
               <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                 <p className="text-[10px] text-red-500 font-medium text-left">
                   You are logged in, but there was an error fetching your profile: <strong>{error || 'Table might be missing'}</strong>.
                 </p>
                 <p className="text-[10px] text-red-500 font-medium text-left mt-2">
                   <strong>How to fix:</strong> You need to run the SQL commands listed in the <code>supabase.sql</code> file in your Supabase SQL Editor to create the profiles table.
                 </p>
                 <p className="text-left mt-2">
                   <button type="button" className="text-[10px] underline font-bold text-red-500" onClick={() => supabase.auth.signOut()}>Sign Out & Try Again</button>
                 </p>
               </div>
            )}
            
            <div className="mt-6 pt-6 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => {
                  setSession({ user: { id: 'mock-1', email: 'admin@demo.com' } });
                  setUserProfile({ id: 'mock-1', name: 'Admin Demo', email: 'admin@demo.com', role: 'Administrator', imageUrl: '' });
                }}
                className="w-full bg-[var(--bg-primary)] border border-brand-orange text-brand-orange font-bold py-3 rounded-2xl shadow-xl hover:bg-brand-orange/10 transition-colors"
              >
                Skip & Continue in Demo Mode
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  return <App initialUser={userProfile} onLogout={() => supabase.auth.signOut()} />;
};

export default AuthWrapper;
