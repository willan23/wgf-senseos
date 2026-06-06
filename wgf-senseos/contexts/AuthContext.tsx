'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { SenseUser, UserRole } from '@/types';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const SIM_ONLY = process.env.NEXT_PUBLIC_SIMULATION_ONLY !== 'false';

// Fake user type that mirrors Firebase User fields we use
interface FakeUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface AuthContextType {
  user: FirebaseUser | FakeUser | null;
  senseUser: SenseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SIM_STORAGE_KEY = 'wgf_senseos_sim_user';

// Simulation helpers
function simLogin(email: string): FakeUser {
  return {
    uid: `sim_${email.replace(/[^a-z0-9]/gi, '_')}`,
    email,
    displayName: null,
  };
}

function simSenseUser(uid: string, email: string, displayName: string): SenseUser {
  return {
    uid,
    email,
    displayName: displayName || email.split('@')[0],
    role: 'owner' as UserRole,
    organizationId: 'org_demo',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | FakeUser | null>(null);
  const [senseUser, setSenseUser] = useState<SenseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Set up auth listeners
  useEffect(() => {
    if (SIM_ONLY) {
      try {
        const stored = sessionStorage.getItem(SIM_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as { user: FakeUser; senseUser: SenseUser };
          setUser(parsed.user);
          setSenseUser(parsed.senseUser);
        }
      } catch { /* ignore */ }
      setLoading(false);
      return;
    }

    // Real Firebase listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setSenseUser(userDoc.data() as SenseUser);
          } else {
            // Profile fallback
            const newSenseUser: SenseUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              role: 'owner',
              organizationId: `org_${firebaseUser.uid}`,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newSenseUser);
            setSenseUser(newSenseUser);
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
        }
      } else {
        setSenseUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    if (SIM_ONLY) {
      const fakeUser = simLogin(email);
      const sense = simSenseUser(fakeUser.uid, email, email.split('@')[0]);
      setUser(fakeUser);
      setSenseUser(sense);
      sessionStorage.setItem(SIM_STORAGE_KEY, JSON.stringify({ user: fakeUser, senseUser: sense }));
      return;
    }

    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email: string, password: string, displayName: string) => {
    if (SIM_ONLY) {
      const fakeUser = simLogin(email);
      fakeUser.displayName = displayName;
      const sense = simSenseUser(fakeUser.uid, email, displayName);
      setUser(fakeUser);
      setSenseUser(sense);
      sessionStorage.setItem(SIM_STORAGE_KEY, JSON.stringify({ user: fakeUser, senseUser: sense }));
      return;
    }

    const credentials = await createUserWithEmailAndPassword(auth, email, password);
    const newSenseUser: SenseUser = {
      uid: credentials.user.uid,
      email: email,
      displayName: displayName || email.split('@')[0],
      role: 'owner',
      organizationId: `org_${credentials.user.uid}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await setDoc(doc(db, 'users', credentials.user.uid), newSenseUser);

    const newOrg = {
      id: `org_${credentials.user.uid}`,
      name: `${displayName || email.split('@')[0]}'s Organization`,
      plan: 'free_demo',
      mode: 'residential',
      ownerId: credentials.user.uid,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      maxSensors: 5,
      maxSites: 2,
      monthlyEventsProcessed: 0,
      isSimulationMode: false,
      timezone: 'UTC',
      country: 'PT'
    };
    await setDoc(doc(db, 'organizations', `org_${credentials.user.uid}`), newOrg);
  };

  const logout = async () => {
    if (SIM_ONLY) {
      setUser(null);
      setSenseUser(null);
      sessionStorage.removeItem(SIM_STORAGE_KEY);
      return;
    }

    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    if (SIM_ONLY) {
      return;
    }

    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider value={{ user, senseUser, loading, login, register, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { SIM_ONLY };
