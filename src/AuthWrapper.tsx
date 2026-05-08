import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged,
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import App from './App';
import { User, UserRole } from './types/index';
import { OnboardingForm } from './components/OnboardingForm';

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [userProfile, setUserProfile] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await fetchProfile(firebaseUser);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchProfile = async (firebaseUser: FirebaseUser) => {
    const profilePath = `profiles/${firebaseUser.uid}`;
    try {
      const docRef = doc(db, 'profiles', firebaseUser.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserProfile({
          id: firebaseUser.uid,
          name: data.name || firebaseUser.displayName || email.split('@')[0],
          email: firebaseUser.email || '',
          role: data.role as UserRole,
          imageUrl: data.imageUrl || '',
          phone: data.phone,
          whatsapp: data.whatsapp,
          address: data.address,
          emergencyContact: data.emergencyContact,
          isOnboarded: data.isOnboarded,
          checkInStatus: data.checkInStatus,
          lastCheckIn: data.lastCheckIn
        });
      } else {
        // Create initial profile
        const initialProfile: any = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || email.split('@')[0],
          email: firebaseUser.email || '',
          role: 'Staff', // Default role
          imageUrl: '',
          isOnboarded: false,
          createdAt: serverTimestamp()
        };
        
        try {
          await setDoc(docRef, initialProfile);
          setUserProfile({
            id: firebaseUser.uid,
            name: initialProfile.name,
            email: initialProfile.email,
            role: initialProfile.role as UserRole,
            imageUrl: initialProfile.imageUrl,
            isOnboarded: false
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, profilePath);
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, profilePath);
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
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err.message || 'Authentication error');
      setLoading(false);
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
                className="w-full bg-transparent border-b border-[var(--border-color)] py-2 text-sm outline-none focus:border-brand-blue font-bold"
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border-b border-[var(--border-color)] py-2 text-sm outline-none focus:border-brand-blue font-bold"
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-brand-blue text-white font-bold py-3 rounded-2xl shadow-xl shadow-brand-blue/20 hover:opacity-90 transition-opacity mt-4 text-xs uppercase tracking-widest"
              disabled={loading}
            >
              {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
            </button>
            <p className="text-center mt-4 text-[10px] text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] font-black uppercase tracking-widest" onClick={() => setIsSignUp(!isSignUp)}>
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </p>
          </div>
        </form>
        <p className="mt-8 text-[10px] text-[var(--text-secondary)] uppercase tracking-[0.2em] font-black">
          PULSE COMMAND SYSTEM
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
