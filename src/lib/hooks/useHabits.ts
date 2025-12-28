'use client';

import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Habit } from '@/types';

export function useHabits(userId: string | undefined) {
    const [habits, setHabits] = useState<Habit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!userId) {
            setHabits([]);
            setLoading(false);
            return;
        }

        const habitsRef = collection(db, `users/${userId}/habits`);
        const q = query(habitsRef, orderBy('createdAt', 'asc'));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const habitData = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Habit[];

                // Daily Reset Check
                const today = new Date().toISOString().split('T')[0];

                habitData.forEach(async (habit) => {
                    if (habit.isCompleted && habit.lastCompletedAt) {
                        // Safely get the date - handle both Timestamp and Date objects
                        let lastCompletedDate: string;
                        try {
                            if (typeof habit.lastCompletedAt.toDate === 'function') {
                                lastCompletedDate = habit.lastCompletedAt.toDate().toISOString().split('T')[0];
                            } else if (habit.lastCompletedAt instanceof Date) {
                                lastCompletedDate = habit.lastCompletedAt.toISOString().split('T')[0];
                            } else {
                                // Skip if we can't parse the date
                                return;
                            }
                        } catch {
                            return; // Skip if date parsing fails
                        }

                        if (lastCompletedDate !== today) {
                            // Reset habit for the new day
                            try {
                                const habitRef = doc(db, `users/${userId}/habits/${habit.id}`);
                                await updateDoc(habitRef, {
                                    isCompleted: false
                                    // Note: We keep streak/points intact, just reset the daily toggle
                                });
                            } catch (err) {
                                console.error("Error resetting habit:", err);
                            }
                        }
                    }
                });

                setHabits(habitData);
                setLoading(false);
            },
            (err) => {
                console.error('Error fetching habits:', err);
                setError(err as Error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [userId]);

    return { habits, loading, error };
}
