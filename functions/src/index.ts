import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

/**
 * Scheduled Cloud Function: Daily Habit Reset
 * 
 * Runs every day at midnight UTC (00:00)
 * Resets all daily habits to incomplete status
 * Updates user stats for the new day
 */
export const dailyHabitReset = functions.pubsub
    .schedule('0 0 * * *') // Cron expression: Every day at 00:00 UTC
    .timeZone('UTC')
    .onRun(async (context) => {
        const db = admin.firestore();
        const today = new Date().toISOString().split('T')[0]; // Format: 'YYYY-MM-DD'

        console.log(`Starting daily habit reset for ${today}`);

        try {
            // Get all users from the users collection
            const usersSnapshot = await db.collection('users').get();

            if (usersSnapshot.empty) {
                console.log('No users found');
                return null;
            }

            console.log(`Found ${usersSnapshot.size} users`);

            // Process each user
            const resetPromises = usersSnapshot.docs.map(async (userDoc) => {
                const userId = userDoc.id;

                try {
                    const habitsRef = db.collection(`users/${userId}/habits`);

                    // Get all daily habits for this user
                    const habitsSnapshot = await habitsRef
                        .where('category', '==', 'daily')
                        .get();

                    if (habitsSnapshot.empty) {
                        console.log(`User ${userId}: No daily habits found`);
                        return;
                    }

                    console.log(`User ${userId}: Resetting ${habitsSnapshot.size} daily habits`);

                    // Reset each daily habit
                    const habitUpdatePromises = habitsSnapshot.docs.map((habitDoc) => {
                        const habitData = habitDoc.data();

                        // Store yesterday's data in history (optional)
                        const updates: any = {
                            isCompleted: false,
                            currentDate: today,
                            lastCompletedAt: null,
                        };

                        // Keep the streak if it was completed yesterday, reset if it wasn't
                        if (!habitData.isCompleted) {
                            updates.streak = 0;
                            updates.points = 0;
                        }

                        return habitDoc.ref.update(updates);
                    });

                    await Promise.all(habitUpdatePromises);

                    // Reset user stats for the new day
                    const statsRef = db.doc(`users/${userId}/stats/summary`);
                    await statsRef.set({
                        habitsCompletedToday: 0,
                        healthBarPercentage: 0,
                        totalHabitsToday: habitsSnapshot.size,
                        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                    }, { merge: true });

                    console.log(`User ${userId}: Reset completed successfully`);

                } catch (error) {
                    console.error(`Error resetting habits for user ${userId}:`, error);
                }
            });

            await Promise.all(resetPromises);

            console.log('Daily habit reset completed successfully for all users');
            return null;

        } catch (error) {
            console.error('Error in daily habit reset:', error);
            throw error;
        }
    });

/**
 * Firestore Trigger: Update Stats on Habit Change
 * 
 * Runs whenever a habit document is created, updated, or deleted
 * Recalculates user statistics in real-time
 */
export const updateStatsOnHabitChange = functions.firestore
    .document('users/{userId}/habits/{habitId}')
    .onWrite(async (change, context) => {
        const userId = context.params.userId;
        const db = admin.firestore();

        try {
            // Get all habits for this user
            const habitsSnapshot = await db
                .collection(`users/${userId}/habits`)
                .where('category', '==', 'daily')
                .get();

            // Calculate stats
            const totalHabits = habitsSnapshot.size;
            const completedHabits = habitsSnapshot.docs.filter(
                (doc) => doc.data().isCompleted === true
            ).length;

            const totalPoints = habitsSnapshot.docs.reduce(
                (sum, doc) => sum + (doc.data().points || 0),
                0
            );

            const maxStreak = Math.max(
                ...habitsSnapshot.docs.map((doc) => doc.data().streak || 0),
                0
            );

            const healthPercentage = totalHabits > 0
                ? Math.round((completedHabits / totalHabits) * 100)
                : 0;

            // Update stats document
            const statsRef = db.doc(`users/${userId}/stats/summary`);
            await statsRef.set({
                totalPoints: totalPoints,
                currentStreak: maxStreak,
                longestStreak: maxStreak, // This should be tracked separately in production
                habitsCompletedToday: completedHabits,
                totalHabitsToday: totalHabits,
                healthBarPercentage: healthPercentage,
                lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });

            console.log(`Stats updated for user ${userId}`);
            return null;

        } catch (error) {
            console.error(`Error updating stats for user ${userId}:`, error);
            throw error;
        }
    });
