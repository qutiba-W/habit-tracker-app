'use client';

import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/hooks/useAuth';

interface Friend {
    odid: string;
    odisplayName: string;
    email: string;
    treeLevel: number;
    totalXP: number;
    treeStage: string;
}

interface LeaderboardEntry {
    odid: string;
    displayName: string;
    email: string;
    level: number;
    totalXP: number;
    treeStage: string;
    rank: number;
    isCurrentUser: boolean;
}

export function useLeaderboard(userId: string | undefined) {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setLeaderboard([]);
            setLoading(false);
            return;
        }

        // For now, we'll create a simple leaderboard from the friends subcollection
        // In a real app, this would be a cloud function that aggregates all users
        const friendsRef = collection(db, `users/${userId}/friends`);
        const q = query(friendsRef, orderBy('totalXP', 'desc'), limit(10));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const entries: LeaderboardEntry[] = snapshot.docs.map((doc, index) => {
                const data = doc.data();
                return {
                    odid: doc.id,
                    displayName: data.displayName || 'Unknown',
                    email: data.email || '',
                    level: data.treeLevel || 1,
                    totalXP: data.totalXP || 0,
                    treeStage: data.treeStage || 'seed',
                    rank: index + 1,
                    isCurrentUser: doc.id === userId,
                };
            });

            setLeaderboard(entries);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    return { leaderboard, loading };
}
