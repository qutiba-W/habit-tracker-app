'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/hooks/useAuth';

interface GameStats {
    totalXP: number;
    level: number;
    treeStage: string;
    totalPoints: number;
    currentStreak: number;
    longestStreak: number;
    habitsCompletedToday: number;
    totalHabitsToday: number;
    healthBarPercentage: number;
    weeklyXP: number[];
    strengths: string[];
    weaknesses: string[];
}

// XP required for each level (exponential growth)
export const getXPForLevel = (level: number): number => {
    if (level <= 5) return level * 100;
    if (level <= 15) return 500 + (level - 5) * 150;
    if (level <= 30) return 2000 + (level - 15) * 200;
    if (level <= 50) return 5000 + (level - 30) * 250;
    return 10000 + (level - 50) * 300;
};

export const getLevelFromXP = (totalXP: number): number => {
    let level = 1;
    let xpNeeded = 0;

    while (xpNeeded <= totalXP) {
        xpNeeded += getXPForLevel(level);
        if (xpNeeded <= totalXP) level++;
    }

    return level;
};

export const getXPProgressInLevel = (totalXP: number): { current: number; max: number } => {
    let level = 1;
    let xpAccumulated = 0;

    while (true) {
        const xpForThisLevel = getXPForLevel(level);
        if (xpAccumulated + xpForThisLevel > totalXP) {
            return {
                current: totalXP - xpAccumulated,
                max: xpForThisLevel
            };
        }
        xpAccumulated += xpForThisLevel;
        level++;
    }
};

const defaultStats: GameStats = {
    totalXP: 0,
    level: 1,
    treeStage: 'seed',
    totalPoints: 0,
    currentStreak: 0,
    longestStreak: 0,
    habitsCompletedToday: 0,
    totalHabitsToday: 0,
    healthBarPercentage: 0,
    weeklyXP: [0, 0, 0, 0, 0, 0, 0],
    strengths: [],
    weaknesses: [],
};

export function useGameStats(userId: string | undefined) {
    const [stats, setStats] = useState<GameStats>(defaultStats);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setStats(defaultStats);
            setLoading(false);
            return;
        }

        const statsRef = doc(db, `users/${userId}/stats/summary`);

        const unsubscribe = onSnapshot(statsRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                const totalXP = data.totalXP || 0;
                const level = getLevelFromXP(totalXP);

                const getTreeStage = (lvl: number) => {
                    if (lvl <= 5) return 'seed';
                    if (lvl <= 15) return 'sprout';
                    if (lvl <= 30) return 'sapling';
                    if (lvl <= 50) return 'tree';
                    return 'mighty';
                };

                setStats({
                    totalXP,
                    level,
                    treeStage: getTreeStage(level),
                    totalPoints: data.totalPoints || 0,
                    currentStreak: data.currentStreak || 0,
                    longestStreak: data.longestStreak || 0,
                    habitsCompletedToday: data.habitsCompletedToday || 0,
                    totalHabitsToday: data.totalHabitsToday || 0,
                    healthBarPercentage: data.healthBarPercentage || 0,
                    weeklyXP: data.weeklyXP || [0, 0, 0, 0, 0, 0, 0],
                    strengths: data.strengths || [],
                    weaknesses: data.weaknesses || [],
                });
            } else {
                setStats(defaultStats);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    return { stats, loading };
}
