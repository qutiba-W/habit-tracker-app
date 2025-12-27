'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useGameStats } from '@/lib/hooks/useGameStats';
import { useHabits } from '@/lib/hooks/useHabits';
import MoodAnalytics from './MoodAnalytics';

interface HabitStat {
    title: string;
    completionRate: number;
    streak: number;
}

export default function AnalyticsDashboard() {
    const { user } = useAuth();
    const { stats, loading } = useGameStats(user?.uid);
    const { habits } = useHabits(user?.uid);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    // Calculate habit completion rates for strengths/weaknesses
    const habitStats: HabitStat[] = habits.map(habit => ({
        title: habit.title,
        completionRate: habit.streak > 0 ? Math.min((habit.streak / 7) * 100, 100) : 0,
        streak: habit.streak,
    }));

    const strengths = [...habitStats].sort((a, b) => b.completionRate - a.completionRate).slice(0, 3);
    const weaknesses = [...habitStats].sort((a, b) => a.completionRate - b.completionRate).slice(0, 3);

    // Mock weekly data (in real app, this comes from history)
    const weeklyData = stats.weeklyXP.length > 0 ? stats.weeklyXP : [45, 78, 62, 89, 95, 67, 82];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const maxValue = Math.max(...weeklyData, 1);

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-dark-card p-4 rounded-xl border border-gray-800">
                    <p className="text-sm text-gray-400">Total XP</p>
                    <p className="text-2xl font-bold text-primary-500">{stats.totalXP.toLocaleString()}</p>
                </div>
                <div className="bg-dark-card p-4 rounded-xl border border-gray-800">
                    <p className="text-sm text-gray-400">Current Streak</p>
                    <p className="text-2xl font-bold text-orange-500">{stats.currentStreak} 🔥</p>
                </div>
                <div className="bg-dark-card p-4 rounded-xl border border-gray-800">
                    <p className="text-sm text-gray-400">Longest Streak</p>
                    <p className="text-2xl font-bold text-yellow-500">{stats.longestStreak} ⭐</p>
                </div>
                <div className="bg-dark-card p-4 rounded-xl border border-gray-800">
                    <p className="text-sm text-gray-400">Total Points</p>
                    <p className="text-2xl font-bold text-green-500">{stats.totalPoints.toLocaleString()}</p>
                </div>
            </div>

            {/* Weekly Progress Chart */}
            <div className="bg-dark-card p-6 rounded-xl border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-4">📊 Weekly Progress</h3>
                <div className="flex items-end justify-between h-48 gap-2">
                    {weeklyData.map((value, index) => (
                        <div key={index} className="flex-1 flex flex-col items-center">
                            <div className="relative w-full flex justify-center mb-2">
                                <div
                                    className="w-8 md:w-12 bg-gradient-to-t from-primary-600 to-primary-400 rounded-t-lg transition-all duration-500"
                                    style={{ height: `${(value / maxValue) * 160}px` }}
                                >
                                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-gray-400">
                                        {value}%
                                    </span>
                                </div>
                            </div>
                            <span className="text-xs text-gray-500">{days[index]}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid md:grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="bg-dark-card p-6 rounded-xl border border-primary-500/30">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        💪 Strengths
                    </h3>
                    {strengths.length > 0 ? (
                        <div className="space-y-3">
                            {strengths.map((habit, index) => (
                                <div key={index} className="flex items-center justify-between">
                                    <span className="text-gray-300">{habit.title}</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 h-2 bg-dark-bg rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary-500 rounded-full"
                                                style={{ width: `${habit.completionRate}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-sm text-primary-500">{habit.streak}🔥</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">Complete some habits to see your strengths!</p>
                    )}
                </div>

                {/* Weaknesses */}
                <div className="bg-dark-card p-6 rounded-xl border border-red-500/30">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        🎯 Needs Improvement
                    </h3>
                    {weaknesses.length > 0 ? (
                        <div className="space-y-3">
                            {weaknesses.map((habit, index) => (
                                <div key={index} className="flex items-center justify-between">
                                    <span className="text-gray-300">{habit.title}</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 h-2 bg-dark-bg rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-red-500 rounded-full"
                                                style={{ width: `${habit.completionRate}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-sm text-gray-500">{habit.streak}🔥</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">Add habits to track your progress!</p>
                    )}
                </div>
            </div>

            {/* Mental Wellness Analytics */}
            <MoodAnalytics />
        </div>
    );
}
