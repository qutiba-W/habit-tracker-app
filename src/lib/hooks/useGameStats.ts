'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
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

// XP required for each level (Progressive difficulty: 100 * level^1.5)
// Level 1: 100 XP, Level 2: ~283 XP, Level 5: ~1118 XP, Level 10: ~3162 XP
export const getXPForLevel = (level: number): number => {
    return Math.floor(100 * Math.pow(level, 1.5));
};

// Get cumulative XP required to reach a specific level
export const getCumulativeXPForLevel = (level: number): number => {
    let total = 0;
    for (let l = 1; l < level; l++) {
        total += getXPForLevel(l);
    }
    return total;
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
    const level = getLevelFromXP(totalXP);
    const prevLevelXP = getCumulativeXPForLevel(level);
    const currentLevelXP = getXPForLevel(level);

    return {
        current: totalXP - prevLevelXP,
        max: currentLevelXP
    };
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

const CURRENT_SCHEMA_VERSION = 3; // Incremented again to force a fresh global reset

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

                // --- GLOBAL RESET / SCHEMA MIGRATION ---
                if (!data.schemaVersion || data.schemaVersion < CURRENT_SCHEMA_VERSION) {
                    console.warn("Outdated or corrupted schema detected. Performing Global Reset for user...");

                    updateDoc(statsRef, {
                        ...defaultStats,
                        schemaVersion: CURRENT_SCHEMA_VERSION,
                        lastResetDate: new Date().toISOString().split('T')[0],
                        lastUpdated: new Date()
                    }).then(() => {
                        console.log("Global reset successful.");
                        // The snapshot will trigger again with fresh data
                    }).catch(err => console.error("Error during global reset:", err));

                    return; // Stop processing this snapshot as it's stale/bad
                }

                const totalXP = data.totalXP || 0;

                // AUTO-FIX: Negative Stats (Secondary Guard)
                // Aggressive check: if any stat is negative, reset to safe defaults
                const needsRepair = totalXP < 0 || (data.habitsCompletedToday || 0) < 0 || (data.currentStreak || 0) < 0 || (data.totalPoints || 0) < 0;

                if (needsRepair) {
                    console.warn("Negative stats detected during runtime! Applying auto-fix...", {
                        xp: totalXP,
                        habits: data.habitsCompletedToday,
                        pts: data.totalPoints
                    });

                    updateDoc(statsRef, {
                        totalXP: Math.max(0, totalXP),
                        habitsCompletedToday: Math.max(0, data.habitsCompletedToday || 0),
                        totalPoints: Math.max(0, data.totalPoints || 0),
                        currentStreak: Math.max(0, data.currentStreak || 0),
                        // Also clamp weeklyXP if it exists
                    }).then(() => console.log("Stats repaired successfully."))
                        .catch(err => console.error("Error fixing stats:", err));
                }

                // DAILY RESET: Check if day changed for stats
                const today = new Date().toISOString().split('T')[0];
                if (data.lastResetDate !== today) {
                    console.log("New day detected. Resetting daily stats...");
                    updateDoc(statsRef, {
                        habitsCompletedToday: 0,
                        lastResetDate: today
                    }).catch(err => console.error("Error resetting daily stats:", err));
                }

                const level = getLevelFromXP(Math.max(0, totalXP));

                const getTreeStage = (lvl: number) => {
                    if (lvl <= 5) return 'seed';
                    if (lvl <= 15) return 'sprout';
                    if (lvl <= 30) return 'sapling';
                    if (lvl <= 50) return 'tree';
                    return 'mighty';
                };

                // Handle weeklyXP - could be array or object from Firestore
                let weeklyXP = [0, 0, 0, 0, 0, 0, 0];
                if (data.weeklyXP) {
                    if (Array.isArray(data.weeklyXP)) {
                        weeklyXP = data.weeklyXP.map(xp => Math.max(0, xp)); // Clamp
                    } else if (typeof data.weeklyXP === 'object') {
                        // Convert object {0: 10, 1: 20, ...} to array
                        for (let i = 0; i < 7; i++) {
                            const val = data.weeklyXP[i] || data.weeklyXP[String(i)] || 0;
                            weeklyXP[i] = Math.max(0, val);
                        }
                    }
                }

                setStats({
                    totalXP: Math.max(0, totalXP),
                    level,
                    treeStage: getTreeStage(level),
                    totalPoints: Math.max(0, data.totalPoints || 0),
                    currentStreak: Math.max(0, data.currentStreak || 0),
                    longestStreak: data.longestStreak || 0,
                    habitsCompletedToday: Math.max(0, data.habitsCompletedToday || 0),
                    totalHabitsToday: Math.max(0, data.totalHabitsToday || 0), // Ensure total can't be -1 potentially?
                    healthBarPercentage: Math.max(0, Math.min(100, data.healthBarPercentage || 0)),
                    weeklyXP: weeklyXP,
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
