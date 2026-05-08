import React, { useState, useEffect } from 'react';
import { supabase, isRealSupabase } from './lib/supabase';
import App from './App';
import { User, UserRole } from './types/index';

const AuthWrapper = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [userProfile, setUserProfile] = useState<User | null>(null);

  useEffect(() => {
    if (!supabase || !supabase.auth) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user);
      else setLoading(false);
    });

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("Auth event:", _event, session?.user?.email);
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
      console.log("Fetching profile for:", user.id);
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error && error.code === 'PGRST116') {
        console.log("Profile not found, creating one...");
        const email = user.email || '';
        const { data: newData, error: insertError } = await supabase
          .from('profiles')
          .insert([{ 
            id: user.id, 
            email: email, 
            role: 'Staff', 
            display_name: email.split('@')[0] || 'User' 
          }])
          .select()
          .single();
          
        if (insertError) {
          console.error("Profile creation failed. Did you run the SQL?", insertError);
          setError(`Profile error: ${insertError.message}. Make sure to run the SQL in your Supabase dashboard.`);
          setLoading(false);
          return;
        }
        data = newData;
      } else if (error) {
        console.error("Profile fetch error:", error);
        setError(error.message);
        setLoading(false);
        return;
      }
      
      if (data) {
        setUserProfile({
          id: data.id,
          name: data.display_name || user.email?.split('@')[0] || 'User',
          role: data.role as UserRole,
          imageUrl: data.avatar_url || '',
          email: data.email || user.email
        });
      }
    } catch (err: any) {
      console.error("Internal fetchProfile error", err);
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
        console.log("Attempting sign up for:", email);
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              display_name: email.split('@')[0],
            }
          }
        });
        if (error) throw error;
        
        if (data?.user && data?.session) {
          // Signed up and logged in automatically (if email confirmation is disabled)
          console.log("Sign up successful, session created");
        } else {
          // Email confirmation might be required
          alert('Sign up successful! Please check your email for a confirmation link to complete registration.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  if (!isRealSupabase) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-primary)] p-4 text-center">
        <div className="max-w-md p-8 bg-[var(--bg-secondary)] rounded-3xl border border-[var(--border-color)] shadow-2xl relative">
          <h1 className="text-2xl font-black mb-4">Supabase Connection Error</h1>
          <p className="text-sm text-[var(--text-secondary)] mb-6 text-left">
            The application is unable to connect to Supabase. This could be because:
          </p>
          <ul className="text-xs text-left list-disc pl-5 space-y-2 mb-6">
            <li>The keys you provided in <strong>Settings &gt; Secrets</strong> are missing or incorrect.</li>
            <li>Vite is not picking up your environment variables.</li>
            <li>There's a network issue connecting to your project.</li>
          </ul>
          <p className="text-xs text-left font-mono bg-red-500/10 p-3 rounded mb-6 break-all">
            URL: {import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 'Not Set'}<br/>
            Key: { (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ? 'Is Set (Hidden)' : 'Not Set' }
          </p>
          <div className="pt-6 border-t border-[var(--border-color)]">
             <button 
               onClick={() => {
                 setSession({ user: { id: 'mock-1', email: 'admin@demo.com' } });
                 setUserProfile({ id: 'mock-1', name: 'Admin Demo', email: 'admin@demo.com', role: 'Administrator', imageUrl: '' });
                 setLoading(false);
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
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
              <p className="text-red-500 text-xs font-medium">{error}</p>
            </div>
          )}

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
            
            <div className="mt-8 pt-6 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => {
                  setSession({ user: { id: 'mock-1', email: 'admin@demo.com' } });
                  setUserProfile({ id: 'mock-1', name: 'Admin Demo', email: 'admin@demo.com', role: 'Administrator', imageUrl: '' });
                  setLoading(false);
                }}
                className="w-full text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors underline"
              >
                Or enter Demo Mode for testing
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
