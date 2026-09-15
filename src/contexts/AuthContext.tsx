import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import type { AppUser } from "../types";

interface AuthContextValue {
  user: AppUser | null;
  initializing: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setHouseholdId: (householdId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function loadAppUser(firebaseUser: User): Promise<AppUser> {
  const profileRef = doc(db, "users", firebaseUser.uid);
  const snap = await getDoc(profileRef);
  const householdId = snap.exists() ? snap.data().householdId ?? null : null;
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    householdId,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(await loadAppUser(firebaseUser));
      } else {
        setUser(null);
      }
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  async function signUp(email: string, password: string) {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", credential.user.uid), {
      email,
      householdId: null,
      createdAt: Date.now(),
    });
  }

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  async function setHouseholdId(householdId: string) {
    if (!user) return;
    await setDoc(doc(db, "users", user.uid), { householdId }, { merge: true });
    setUser({ ...user, householdId });
  }

  return (
    <AuthContext.Provider value={{ user, initializing, signUp, signIn, signOut, setHouseholdId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
