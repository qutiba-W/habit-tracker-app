'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface MoodEntry {
    mood: string;
    energy: number;
    anxiety: number;
    sleep: number;
    timestamp: string;
}

interface MoodHistory {
    [date: string]: MoodEntry;
}

const moodColors: { [key: string]: string } = {
    great: '#10b981',
    good: '#34d399',
    okay: '#fbbf24',
    low: '#f97316',
    bad: '#ef4444'
};

const moodEmojis: { [key: string]: string } = {
    great: '😊',
    good: '🙂',
    okay: '😐',
    low: '😔',
    bad: '😢'
};

export default function MoodAnalytics() {
    const { user } = useAuth();
    const [moodHistory, setMoodHistory] = useState<MoodHistory>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const loadMoodHistory = async () => {
            try {
                const moodDocRef = doc(db, `users/${user.uid}/wellness/mood`);
                const moodDoc = await getDoc(moodDocRef);
                if (moodDoc.exists()) {
                    setMoodHistory(moodDoc.data().history || {});
                }
            } catch (error) {
                console.error('Error loading mood history:', error);
            } finally {
                setLoading(false);
            }
        };

        loadMoodHistory();
    }, [user]);

    // Calculate stats for the last 7 days
    const weeklyStats = useMemo(() => {
        const last7Days = [];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            last7Days.push({
                date: dateStr,
                day: date.toLocaleDateString('en-US', { weekday: 'short' }),
                entry: moodHistory[dateStr]
            });
        }

        return last7Days;
    }, [moodHistory]);

    // Calculate mood distribution
    const moodDistribution = useMemo(() => {
        const counts: { [key: string]: number } = { great: 0, good: 0, okay: 0, low: 0, bad: 0 };
        const entries = Object.values(moodHistory);

        entries.forEach(entry => {
            if (counts.hasOwnProperty(entry.mood)) {
                counts[entry.mood]++;
            }
        });

        const total = entries.length || 1;
        return Object.entries(counts).map(([mood, count]) => ({
            mood,
            count,
            percentage: Math.round((count / total) * 100)
        }));
    }, [moodHistory]);

    // Calculate average metrics for the week
    const avgMetrics = useMemo(() => {
        const weekEntries = weeklyStats.filter(d => d.entry).map(d => d.entry!);
        if (weekEntries.length === 0) return { energy: 0, anxiety: 0, sleep: 0 };

        return {
            energy: Math.round(weekEntries.reduce((sum, e) => sum + e.energy, 0) / weekEntries.length * 10) / 10,
            anxiety: Math.round(weekEntries.reduce((sum, e) => sum + e.anxiety, 0) / weekEntries.length * 10) / 10,
            sleep: Math.round(weekEntries.reduce((sum, e) => sum + e.sleep, 0) / weekEntries.length * 10) / 10
        };
    }, [weeklyStats]);

    if (loading) {
        return (
            <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    const hasData = Object.keys(moodHistory).length > 0;

    return (
        <div className="space-y-4">
            {/* Mental Wellness Header */}
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                🧠 Mental Wellness Insights
            </h3>

            {!hasData ? (
                <div className="bg-dark-card p-6 rounded-xl border border-gray-800 text-center">
                    <p className="text-gray-400">Start tracking your mood in the Wellness tab to see insights here!</p>
                </div>
            ) : (
                <>
                    {/* Weekly Mood Chart */}
                    <div className="bg-dark-card p-4 rounded-xl border border-gray-800">
                        <h4 className="text-sm font-medium text-gray-400 mb-3">Weekly Mood Trend</h4>
                        <div className="flex items-end justify-between h-24 gap-2">
                            {weeklyStats.map(({ date, day, entry }) => (
                                <div key={date} className="flex-1 flex flex-col items-center">
                                    <div className="relative flex justify-center mb-1">
                                        {entry ? (
                                            <div
                                                className="w-8 h-8 rounded-full flex items-center justify-center text-lg transition-all"
                                                style={{ backgroundColor: moodColors[entry.mood] + '40' }}
                                                title={`${entry.mood} - Energy: ${entry.energy}, Sleep: ${entry.sleep}`}
                                            >
                                                {moodEmojis[entry.mood]}
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-600">
                                                -
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-500">{day}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Mood Distribution */}
                    <div className="bg-dark-card p-4 rounded-xl border border-gray-800">
                        <h4 className="text-sm font-medium text-gray-400 mb-3">Mood Distribution</h4>
                        <div className="space-y-2">
                            {moodDistribution.map(({ mood, percentage }) => (
                                <div key={mood} className="flex items-center gap-2">
                                    <span className="text-lg w-6">{moodEmojis[mood]}</span>
                                    <div className="flex-1 h-3 bg-dark-bg rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all"
                                            style={{
                                                width: `${percentage}%`,
                                                backgroundColor: moodColors[mood]
                                            }}
                                        />
                                    </div>
                                    <span className="text-xs text-gray-400 w-10 text-right">
                                        {percentage}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Average Metrics */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-dark-card p-4 rounded-xl border border-yellow-500/30 text-center">
                            <p className="text-sm text-gray-400 mb-1">⚡ Avg Energy</p>
                            <p className="text-2xl font-bold text-yellow-500">{avgMetrics.energy}</p>
                            <p className="text-xs text-gray-500">/5</p>
                        </div>
                        <div className="bg-dark-card p-4 rounded-xl border border-orange-500/30 text-center">
                            <p className="text-sm text-gray-400 mb-1">😰 Avg Anxiety</p>
                            <p className="text-2xl font-bold text-orange-500">{avgMetrics.anxiety}</p>
                            <p className="text-xs text-gray-500">/5</p>
                        </div>
                        <div className="bg-dark-card p-4 rounded-xl border border-blue-500/30 text-center">
                            <p className="text-sm text-gray-400 mb-1">😴 Avg Sleep</p>
                            <p className="text-2xl font-bold text-blue-500">{avgMetrics.sleep}</p>
                            <p className="text-xs text-gray-500">/5</p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
