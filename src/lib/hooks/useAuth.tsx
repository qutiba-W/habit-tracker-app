'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import * as authLib from '@/lib/auth';
import { AuthContextType } from '@/types';

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session version - increment this to force all users to re-login
const CURRENT_SESSION_VERSION = 2;
const SESSION_VERSION_KEY = 'habit_forest_session_version';

// Ensure user has a profile and stats document (auto-create if missing)
const ensureUserProfile = async (firebaseUser: FirebaseUser) => {
    try {
        // Check/Create user profile document
        const userRef = doc(db, `users/${firebaseUser.uid}`);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            console.log('Creating new user profile for:', firebaseUser.email);
            await setDoc(userRef, {
                email: firebaseUser.email,
                displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                photoURL: firebaseUser.photoURL || null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        }

        // Check/Create stats summary document
        const statsRef = doc(db, `users/${firebaseUser.uid}/stats/summary`);
        const statsSnap = await getDoc(statsRef);

        if (!statsSnap.exists()) {
            console.log('Creating new stats profile for:', firebaseUser.email);
            await setDoc(statsRef, {
                totalXP: 0,
                totalPoints: 0,
                currentStreak: 0,
                longestStreak: 0,
                habitsCompletedToday: 0,
                totalHabitsToday: 0,
                healthBarPercentage: 0,
                weeklyXP: [0, 0, 0, 0, 0, 0, 0],
                schemaVersion: 3,
                lastResetDate: new Date().toISOString().split('T')[0],
                createdAt: serverTimestamp()
            });
        }
    } catch (error) {
        console.error('Error ensuring user profile:', error);
    }
};

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Check session version
                const storedVersion = localStorage.getItem(SESSION_VERSION_KEY);
                const currentVersion = CURRENT_SESSION_VERSION.toString();

                if (storedVersion !== currentVersion) {
                    // Force re-login: sign out the user
                    console.log('Session version mismatch. Forcing re-login...');
                    localStorage.setItem(SESSION_VERSION_KEY, currentVersion);
                    await authLib.signOut();
                    setUser(null);
                    setLoading(false);
                    return;
                }

                // Ensure user has profile and stats documents before proceeding
                await ensureUserProfile(firebaseUser);
            }

            setUser(firebaseUser);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const value: AuthContextType = {
        user,
        loading,
        signInWithGoogle: authLib.signInWithGoogle,
        signInWithEmail: authLib.signInWithEmail,
        signUpWithEmail: authLib.signUpWithEmail,
        signOut: authLib.signOut,
    };

    return <AuthContext.Provider value={value}> {children} </AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
