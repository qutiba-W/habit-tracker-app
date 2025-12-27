import { Timestamp } from 'firebase/firestore';

export interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
}

export interface Habit {
    id: string;
    userId: string;
    title: string;
    description: string;
    category: 'daily' | 'weekly' | 'monthly';
    isCompleted: boolean;
    lastCompletedAt: Timestamp | null;
    currentDate: string; // Format: 'YYYY-MM-DD'
    createdAt: Timestamp;
    points: number;
    streak: number;
    color: string;
}

export interface UserStats {
    totalPoints: number;
    currentStreak: number;
    longestStreak: number;
    habitsCompletedToday: number;
    totalHabitsToday: number;
    healthBarPercentage: number;
    lastUpdated: Timestamp;
}

export interface DayHistory {
    date: string;
    completedHabits: string[];
    totalPoints: number;
    healthBarPercentage: number;
}

export interface AuthContextType {
    user: any;
    loading: boolean;
    signInWithGoogle: () => Promise<any>;
    signInWithEmail: (email: string, password: string) => Promise<any>;
    signUpWithEmail: (email: string, password: string, displayName: string) => Promise<any>;
    signOut: () => Promise<void>;
}
