import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged,
  signOut,
  sendEmailVerification,
  signInWithPopup,
  GoogleAuthProvider,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc,
  serverTimestamp,
  onSnapshot 
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import App from './App';
import { User, UserRole } from './types/index';
import { OnboardingForm } from './components/OnboardingForm';
import { Mail, CheckCircle, ArrowRight } from 'lucide-react';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const AuthWrapper = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (firebaseUser.emailVerified) {
          setNeedsVerification(false);
          
          // Use onSnapshot for reactive profile updates (important for role changes from console)
          const docRef = doc(db, 'profiles', firebaseUser.uid);
          profileUnsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setUserProfile({
                id: firebaseUser.uid,
                name: data.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                email: firebaseUser.email || '',
                role: data.role as UserRole,
                imageUrl: data.imageUrl || data.avatar_url || '',
                phone: data.phone,
                whatsapp: data.whatsapp,
                address: data.address,
                emergencyContact: data.emergencyContact,
                isOnboarded: data.isOnboarded,
                checkInStatus: data.checkInStatus,
                lastCheckIn: data.lastCheckIn
              });
              setLoading(false);
            } else {
              // Create initial profile if it doesn't exist
              createInitialProfile(firebaseUser);
            }
          }, (err) => {
            handleFirestoreError(err, OperationType.GET, `profiles/${firebaseUser.uid}`);
            setLoading(false);
          });
        } else {
          setLoading(false);
        }
      } else {
        setUserProfile(null);
        if (profileUnsubscribe) profileUnsubscribe();
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
    };
  }, []);

  const createInitialProfile = async (firebaseUser: FirebaseUser) => {
    const profilePath = `profiles/${firebaseUser.uid}`;
    const docRef = doc(db, 'profiles', firebaseUser.uid);
    const initialProfile: any = {
      id: firebaseUser.uid,
      name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
      email: firebaseUser.email || '',
      role: 'Staff', // Default role
      imageUrl: '',
      isOnboarded: false,
      createdAt: serverTimestamp()
    };
    
    try {
      await setDoc(docRef, initialProfile);
      // onSnapshot will pick up this change
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, profilePath);
    }
  };

  const handleAuthError = (err: any) => {
    console.error("Auth error:", err);
    const code = err.code || (err.cause && err.cause.code);
    
    if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
      setError('Invalid email or password. Please verify your credentials or establish a new account.');
    } else if (code === 'auth/email-already-in-use') {
      setError('This email is already registered. Please sign in instead.');
    } else if (code === 'auth/too-many-requests') {
      setError('Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.');
    } else if (code === 'auth/popup-closed-by-user') {
      setError('The authentication popup was closed before completion. Please try again.');
    } else {
      setError(err.message || 'Authentication error');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    
    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
        await signOut(auth);
        setNeedsVerification(true);
        setIsSignUp(false); // Switch to sign in for after verification
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        if (!userCredential.user.emailVerified) {
          await signOut(auth);
          setNeedsVerification(true);
        }
      }
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // Profile fetching is handled by onAuthStateChanged
    } catch (err: any) {
      handleAuthError(err);
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError("Please enter your email first.");
      return;
    }
    
    setResending(true);
    setError('');
    setSuccess('');
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      await signOut(auth);
      setSuccess("Verification email resent successfully.");
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error("Logout error:", err);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen bg-[var(--bg-primary)]">Loading...</div>;
  }

  if (!userProfile) {
    if (needsVerification) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-primary)] p-4">
          <div className="w-full max-w-sm p-8 bg-[var(--bg-secondary)] rounded-3xl border border-[var(--border-color)] shadow-2xl text-center">
            <div className="w-16 h-16 bg-brand-blue/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="text-brand-blue" size={32} />
            </div>
            <h2 className="text-2xl font-black mb-4 uppercase tracking-tight">Check your email</h2>
            <p className="text-[10px] uppercase font-black text-[var(--text-secondary)] tracking-[0.2em] mb-8 leading-relaxed">
              We've sent a verification link to<br/>
              <span className="text-brand-blue">{email}</span>
            </p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-brand-green/10 border border-brand-green/20 rounded-xl p-4 mb-6">
                <p className="text-brand-green text-[10px] font-bold uppercase tracking-wider">{success}</p>
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={() => {
                  setNeedsVerification(false);
                  setError('');
                  setSuccess('');
                }}
                className="w-full bg-[var(--text-primary)] text-[var(--bg-primary)] font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] text-[10px] uppercase tracking-widest"
              >
                Go to Login
                <ArrowRight size={14} />
              </button>

              <button
                onClick={handleResendVerification}
                disabled={resending}
                className="w-full bg-transparent border border-[var(--border-color)] text-[var(--text-secondary)] font-black py-4 rounded-2xl hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] transition-all text-[10px] uppercase tracking-widest disabled:opacity-50"
              >
                {resending ? 'Sending...' : "Didn't receive? Resend"}
              </button>
            </div>
          </div>
          <p className="mt-8 text-[10px] text-[var(--text-secondary)] uppercase tracking-[0.2em] font-black">
            WONDERWEB PULSE COMMAND SYSTEM
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-primary)] p-4">
        <form onSubmit={handleAuth} className="w-full max-w-sm p-8 bg-[var(--bg-secondary)] rounded-3xl border border-[var(--border-color)] shadow-2xl">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center p-2 shadow-lg shadow-black/5 overflow-hidden">
              <img 
                src="https://wonderweb.ae/wp-content/uploads/2023/10/WonderWebLogo-Colorful.png" 
                alt="WonderWeb Logo" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const fallback = document.createElement('div');
                    fallback.className = 'w-full h-full flex items-center justify-center bg-brand-blue text-white font-black text-xl';
                    fallback.innerText = 'W';
                    parent.appendChild(fallback);
                  }
                }}
              />
            </div>
          </div>
          <h2 className="text-2xl font-black text-center mb-2 uppercase tracking-tight">{isSignUp ? 'New Account' : 'Welcome Back'}</h2>
          <p className="text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-[0.2em] text-center mb-8">
            {isSignUp ? 'WonderWeb Initialization' : 'Authentication Required'}
          </p>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
              <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Identity (Email)</label>
              <input
                type="email"
                required
                placeholder="email@wonderweb.ae"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3.5 text-xs outline-none focus:border-brand-blue font-bold transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Access Protocol (Password)</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3.5 text-xs outline-none focus:border-brand-blue font-bold transition-all"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-blue text-white font-black py-4 rounded-2xl shadow-xl shadow-brand-blue/20 hover:scale-[1.02] active:scale-[0.98] transition-all mt-4 text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isSignUp ? 'Initialize Account' : 'Establish Link'}
                  <ArrowRight size={14} />
                </>
              )}
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--border-color)]/30"></div>
              </div>
              <div className="relative flex justify-center text-[8px] uppercase tracking-widest font-black">
                <span className="bg-[var(--bg-secondary)] px-4 text-[var(--text-secondary)]">Bridge Link</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-transparent border border-[var(--border-color)] text-[var(--text-primary)] font-black py-4 rounded-2xl hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] transition-all text-[10px] uppercase tracking-widest flex items-center justify-center gap-3"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>
            <p 
              className="text-center mt-6 text-[10px] text-[var(--text-secondary)] cursor-pointer hover:text-brand-blue font-black uppercase tracking-widest transition-colors" 
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setSuccess('');
              }}
            >
              {isSignUp ? 'Return to authentication' : "Request new account access"}
            </p>
          </div>
        </form>
        <p className="mt-8 text-[10px] text-[var(--text-secondary)] uppercase tracking-[0.2em] font-black">
          WONDERWEB PULSE COMMAND SYSTEM
        </p>
      </div>
    );
  }

  if (!userProfile.isOnboarded) {
    return <OnboardingForm user={userProfile} onComplete={(updated) => setUserProfile(updated)} />;
  }

  return <App initialUser={userProfile} onLogout={handleLogout} />;
};

export default AuthWrapper;
