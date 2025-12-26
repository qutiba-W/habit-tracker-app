'use client';

import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
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
