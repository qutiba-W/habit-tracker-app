import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    Timestamp,
    getDoc,
    setDoc,
    increment,
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

    // Update total habits count in stats
    await updateUserStats(userId, { totalHabitsToday: increment(1) });

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

    // Update total habits count in stats
    await updateUserStats(userId, { totalHabitsToday: increment(-1) });
};

// Update user stats document
export const updateUserStats = async (
    userId: string,
    updates: any
): Promise<void> => {
    const statsRef = doc(db, `users/${userId}/stats/summary`);
    const statsDoc = await getDoc(statsRef);

    if (statsDoc.exists()) {
        await updateDoc(statsRef, updates);
    } else {
        // Create initial stats document if it doesn't exist
        await setDoc(statsRef, {
            totalXP: 0,
            totalPoints: 0,
            currentStreak: 0,
            longestStreak: 0,
            habitsCompletedToday: 0,
            totalHabitsToday: 0,
            healthBarPercentage: 0,
            weeklyXP: [0, 0, 0, 0, 0, 0, 0],
            ...updates
        });
    }
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
    const dayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.

    const updates: any = {
        isCompleted: newStatus,
        lastCompletedAt: newStatus ? (serverTimestamp() as Timestamp) : null,
        [`completionHistory.${today}`]: newStatus, // Track today's completion
    };

    // Calculate XP earned (10 XP per completion + streak bonus)
    const xpEarned = 10 + (currentStreak * 2);

    // Update streak and points
    if (newStatus) {
        updates.streak = currentStreak + 1;
        updates.points = (currentStreak + 1) * 10;
    } else {
        updates.streak = Math.max(0, currentStreak - 1);
        updates.points = Math.max(0, currentStreak - 1) * 10;
    }

    await updateDoc(habitRef, updates);

    // Update user stats (XP, points, completions)
    const statsUpdates: any = {};

    if (newStatus) {
        // Completing a habit: add XP and increment completed count
        statsUpdates.totalXP = increment(xpEarned);
        statsUpdates.totalPoints = increment(10);
        statsUpdates.habitsCompletedToday = increment(1);

        // Update weekly XP for the current day
        statsUpdates[`weeklyXP.${dayOfWeek}`] = increment(xpEarned);
    } else {
        // Uncompleting a habit: remove XP and decrement completed count
        statsUpdates.totalXP = increment(-xpEarned);
        statsUpdates.totalPoints = increment(-10);
        statsUpdates.habitsCompletedToday = increment(-1);

        // Update weekly XP for the current day
        statsUpdates[`weeklyXP.${dayOfWeek}`] = increment(-xpEarned);
    }

    await updateUserStats(userId, statsUpdates);
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
