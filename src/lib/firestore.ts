import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Habit } from '@/types';

// Create a new habit
export const createHabit = async (
    userId: string,
    habitData: Partial<Habit>
): Promise<string> => {
    const today = new Date().toISOString().split('T')[0];

    const habitsRef = collection(db, `users/${userId}/habits`);
    const docRef = await addDoc(habitsRef, {
        userId,
        title: habitData.title || 'New Habit',
        description: habitData.description || '',
        category: habitData.category || 'daily',
        isCompleted: false,
        lastCompletedAt: null,
        currentDate: today,
        createdAt: serverTimestamp(),
        points: 0,
        streak: 0,
        color: habitData.color || '#10b981',
    });

    return docRef.id;
};

// Update a habit
export const updateHabit = async (
    userId: string,
    habitId: string,
    updates: Partial<Habit>
): Promise<void> => {
    const habitRef = doc(db, `users/${userId}/habits/${habitId}`);
    await updateDoc(habitRef, updates);
};

// Delete a habit
export const deleteHabit = async (
    userId: string,
    habitId: string
): Promise<void> => {
    const habitRef = doc(db, `users/${userId}/habits/${habitId}`);
    await deleteDoc(habitRef);
};

// Toggle habit completion
export const toggleHabitCompletion = async (
    userId: string,
    habitId: string,
    currentStatus: boolean,
    currentStreak: number
): Promise<void> => {
    const habitRef = doc(db, `users/${userId}/habits/${habitId}`);
    const newStatus = !currentStatus;
    const today = new Date().toISOString().split('T')[0];

    const updates: any = {
        isCompleted: newStatus,
        lastCompletedAt: newStatus ? (serverTimestamp() as Timestamp) : null,
        [`completionHistory.${today}`]: newStatus, // Track today's completion
    };

    // Update streak
    if (newStatus) {
        updates.streak = currentStreak + 1;
        updates.points = (currentStreak + 1) * 10; // 10 points per day in streak
    } else {
        updates.streak = Math.max(0, currentStreak - 1);
        updates.points = Math.max(0, currentStreak - 1) * 10;
    }

    await updateDoc(habitRef, updates);
};

// Update habit completion history for a specific date
export const updateHabitHistory = async (
    userId: string,
    habitId: string,
    date: string,
    completed: boolean
): Promise<void> => {
    const habitRef = doc(db, `users/${userId}/habits/${habitId}`);
    await updateDoc(habitRef, {
        [`completionHistory.${date}`]: completed
    });
};
