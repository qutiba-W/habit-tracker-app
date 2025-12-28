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
    currentStreak: number,
    completionHistory: Record<string, boolean> = {}
): Promise<void> => {
    const habitRef = doc(db, `users/${userId}/habits/${habitId}`);
    const newStatus = !currentStatus;
    const today = new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Calculate yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const wasYesterdayCompleted = completionHistory[yesterdayStr] === true;

    const updates: any = {
        isCompleted: newStatus,
        lastCompletedAt: newStatus ? (serverTimestamp() as Timestamp) : null,
        [`completionHistory.${today}`]: newStatus, // Track today's completion
    };

    // Calculate XP earned (15 XP per completion + streak bonus)
    const xpEarned = 15 + (currentStreak * 2);

    // Update streak and points based on proper streak logic
    if (newStatus) {
        // CHECKING: Calculate new streak
        if (wasYesterdayCompleted) {
            // Yesterday was completed - continue the streak
            updates.streak = currentStreak + 1;
        } else {
            // Yesterday was NOT completed - reset streak to 1
            updates.streak = 1;
        }
        updates.points = updates.streak * 10;
    } else {
        // UNCHECKING: Decrement streak (but never below 0)
        updates.streak = Math.max(0, currentStreak - 1);
        updates.points = Math.max(0, updates.streak) * 10;
    }

    // Safeguard: Read current stats to prevent negative values
    const statsRef = doc(db, `users/${userId}/stats/summary`);
    const statsSnap = await getDoc(statsRef);
    const currentStats = statsSnap.data() || {};
    const currentXP = currentStats.totalXP || 0;

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

        // Update streak if this is the first habit completed today
        const currentHabitsCompleted = currentStats.habitsCompletedToday || 0;
        if (currentHabitsCompleted === 0) {
            // First habit of the day - update streak
            const lastResetDate = currentStats.lastResetDate || '';
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            const currentStreak = currentStats.currentStreak || 0;
            const longestStreak = currentStats.longestStreak || 0;

            if (lastResetDate === yesterdayStr) {
                // Consecutive day - increment streak
                const newStreak = currentStreak + 1;
                statsUpdates.currentStreak = newStreak;
                if (newStreak > longestStreak) {
                    statsUpdates.longestStreak = newStreak;
                }
            } else if (lastResetDate !== today) {
                // Not consecutive - reset streak to 1
                statsUpdates.currentStreak = 1;
            }
            // Update last reset date
            statsUpdates.lastResetDate = today;
        }
    } else {
        // Uncompleting a habit: remove XP and decrement completed count
        // SAFETY CHECK: Do not go below zero for any stat
        const currentPoints = currentStats.totalPoints || 0;
        const currentHabitsCompleted = currentStats.habitsCompletedToday || 0;

        // XP safeguard
        let xpDelta = -xpEarned;
        if (currentXP + xpDelta < 0) {
            xpDelta = -currentXP;
        }

        // Points safeguard
        let pointsDelta = -10;
        if (currentPoints + pointsDelta < 0) {
            pointsDelta = -currentPoints;
        }

        // HabitsCompleted safeguard
        let habitsDelta = -1;
        if (currentHabitsCompleted + habitsDelta < 0) {
            habitsDelta = -currentHabitsCompleted;
        }

        statsUpdates.totalXP = increment(xpDelta);
        statsUpdates.totalPoints = increment(pointsDelta);
        statsUpdates.habitsCompletedToday = increment(habitsDelta);

        // Update weekly XP for the current day
        statsUpdates[`weeklyXP.${dayOfWeek}`] = increment(xpDelta);
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
