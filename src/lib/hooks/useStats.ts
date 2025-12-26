'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserStats } from '@/types';

export function useStats(userId: string | undefined) {
    const [stats, setStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setStats(null);
            setLoading(false);
            return;
        }

        const statsRef = doc(db, `users/${userId}/stats/summary`);

        const unsubscribe = onSnapshot(statsRef, (snapshot) => {
            if (snapshot.exists()) {
                setStats(snapshot.data() as UserStats);
            } else {
                setStats(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    return { stats, loading };
}
