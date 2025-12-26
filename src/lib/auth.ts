import {
    signInWithPopup,
    GoogleAuthProvider,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    updateProfile,
    User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

// Google Sign-in
export const signInWithGoogle = async (): Promise<FirebaseUser> => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);

    // Create user document in Firestore if it doesn't exist
    await ensureUserDocument(result.user);

    return result.user;
};

// Email/Password Sign-in
export const signInWithEmail = async (
    email: string,
    password: string
): Promise<FirebaseUser> => {
    const result = await signInWithEmailAndPassword(auth, email, password);

    // Update last login
    const userRef = doc(db, 'users', result.user.uid);
    await setDoc(userRef, {
        lastLoginAt: serverTimestamp(),
    }, { merge: true });

    return result.user;
};

// Email/Password Sign-up
export const signUpWithEmail = async (
    email: string,
    password: string,
    displayName: string
): Promise<FirebaseUser> => {
    const result = await createUserWithEmailAndPassword(auth, email, password);

    // Update display name
    await updateProfile(result.user, { displayName });

    // Create user document
    await ensureUserDocument(result.user);

    return result.user;
};

// Sign out
export const signOut = async (): Promise<void> => {
    await firebaseSignOut(auth);
};

// Helper: Ensure user document exists in Firestore
const ensureUserDocument = async (user: FirebaseUser): Promise<void> => {
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
        // Create new user document
        await setDoc(userRef, {
            email: user.email,
            displayName: user.displayName || 'User',
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
        });

        // Initialize stats document
        const statsRef = doc(db, `users/${user.uid}/stats/summary`);
        await setDoc(statsRef, {
            totalPoints: 0,
            currentStreak: 0,
            longestStreak: 0,
            habitsCompletedToday: 0,
            totalHabitsToday: 0,
            healthBarPercentage: 0,
            lastUpdated: serverTimestamp(),
        });
    } else {
        // Update last login
        await setDoc(userRef, {
            lastLoginAt: serverTimestamp(),
        }, { merge: true });
    }
};
