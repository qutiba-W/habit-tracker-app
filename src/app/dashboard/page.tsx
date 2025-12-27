'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useGameStats, getXPProgressInLevel } from '@/lib/hooks/useGameStats';
import HabitList from '@/components/habits/HabitList';
import AddHabitModal from '@/components/habits/AddHabitModal';
import TreeVisual from '@/components/game/TreeVisual';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import Leaderboard from '@/components/social/Leaderboard';
import MoodTracker from '@/components/wellness/MoodTracker';

type TabType = 'tree' | 'habits' | 'analytics' | 'leaderboard' | 'wellness';

export default function DashboardPage() {
    const { user, loading, signOut } = useAuth();
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('tree');
    const { stats, loading: statsLoading } = useGameStats(user?.uid);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-dark-bg">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
                    <p className="mt-4 text-gray-400">Loading your tree...</p>
                </div>
            </div>
        );
    }

    const handleSignOut = async () => {
        await signOut();
        router.push('/login');
    };

    const xpProgress = getXPProgressInLevel(stats.totalXP);

    const tabs = [
        { id: 'tree' as TabType, label: '🌳 My Tree', icon: '🌳' },
        { id: 'habits' as TabType, label: '📋 Habits', icon: '📋' },
        { id: 'wellness' as TabType, label: '🧠 Wellness', icon: '🧠' },
        { id: 'analytics' as TabType, label: '📊 Analytics', icon: '📊' },
        { id: 'leaderboard' as TabType, label: '🏆 Leaderboard', icon: '🏆' },
    ];

    return (
        <div className="min-h-screen bg-dark-bg">
            {/* Header */}
            <header className="border-b border-gray-800 bg-dark-card/50 backdrop-blur-sm sticky top-0 z-40">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                🌳 Habit Forest
                            </h1>
                            <p className="text-sm text-gray-400 mt-1">
                                Welcome, {user.displayName || user.email}
                            </p>
                        </div>

                        {/* Level & XP Display */}
                        <div className="hidden md:flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-sm text-gray-400">Level {stats.level}</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-32 h-2 bg-dark-bg rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-500"
                                            style={{ width: `${(xpProgress.current / xpProgress.max) * 100}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-xs text-primary-500">{xpProgress.current}/{xpProgress.max} XP</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleSignOut}
                            className="px-4 py-2 text-gray-400 hover:text-white border border-gray-700 rounded-lg hover:bg-dark-hover transition"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            {/* Tab Navigation */}
            <nav className="border-b border-gray-800 bg-dark-card/30">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex gap-1 overflow-x-auto">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${activeTab === tab.id
                                    ? 'text-primary-500 border-primary-500'
                                    : 'text-gray-400 border-transparent hover:text-white hover:border-gray-600'
                                    }`}
                            >
                                <span className="hidden sm:inline">{tab.label}</span>
                                <span className="sm:hidden text-xl">{tab.icon}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Tree Tab */}
                {activeTab === 'tree' && (
                    <div className="flex flex-col items-center">
                        {/* Quick Stats */}
                        <div className="grid grid-cols-3 gap-4 mb-8 w-full max-w-md">
                            <div className="bg-dark-card p-4 rounded-xl text-center border border-gray-800">
                                <p className="text-2xl font-bold text-orange-500">{stats.currentStreak}</p>
                                <p className="text-xs text-gray-400">🔥 Streak</p>
                            </div>
                            <div className="bg-dark-card p-4 rounded-xl text-center border border-gray-800">
                                <p className="text-2xl font-bold text-primary-500">{stats.totalXP}</p>
                                <p className="text-xs text-gray-400">✨ XP</p>
                            </div>
                            <div className="bg-dark-card p-4 rounded-xl text-center border border-gray-800">
                                <p className="text-2xl font-bold text-green-500">{stats.totalPoints}</p>
                                <p className="text-xs text-gray-400">🏅 Points</p>
                            </div>
                        </div>

                        {/* Tree Visualization */}
                        <TreeVisual
                            level={stats.level}
                            xp={xpProgress.current}
                            maxXpForLevel={xpProgress.max}
                        />

                        {/* Today's Progress */}
                        <div className="mt-8 w-full max-w-md">
                            <div className="bg-dark-card p-6 rounded-xl border border-gray-800">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-white">Today's Progress</h3>
                                    <span className="text-sm text-gray-400">
                                        {stats.habitsCompletedToday}/{stats.totalHabitsToday} habits
                                    </span>
                                </div>
                                <div className="h-4 bg-dark-bg rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-green-500 to-primary-500 rounded-full transition-all duration-700"
                                        style={{ width: `${stats.healthBarPercentage}%` }}
                                    ></div>
                                </div>
                                {stats.healthBarPercentage === 100 && (
                                    <p className="text-center mt-2 text-primary-500 font-semibold animate-pulse">
                                        🌟 Perfect Day! +50 XP Bonus 🌟
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Quick Add Habit Button */}
                        <button
                            onClick={() => setActiveTab('habits')}
                            className="mt-6 px-6 py-3 bg-primary-500/20 hover:bg-primary-500/30 text-primary-500 font-semibold rounded-lg transition border border-primary-500/30"
                        >
                            Nurture Your Tree 🌱
                        </button>
                    </div>
                )}

                {/* Habits Tab */}
                {activeTab === 'habits' && (
                    <div>
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-1">
                                    Today's Habits
                                </h2>
                                <p className="text-gray-400 text-sm">
                                    {new Date().toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </p>
                            </div>

                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-lg transition shadow-lg shadow-primary-500/30"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add Habit
                            </button>
                        </div>

                        <div className="bg-dark-card/30 p-6 rounded-2xl border border-gray-800">
                            <HabitList />
                        </div>
                    </div>
                )}

                {/* Analytics Tab */}
                {activeTab === 'analytics' && (
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-6">📊 Analytics</h2>
                        <AnalyticsDashboard />
                    </div>
                )}

                {/* Wellness Tab */}
                {activeTab === 'wellness' && (
                    <div>
                        <MoodTracker />
                    </div>
                )}

                {/* Leaderboard Tab */}
                {activeTab === 'leaderboard' && (
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-6">🏆 Leaderboard</h2>
                        <Leaderboard />
                    </div>
                )}
            </main>

            {/* Add Habit Modal */}
            <AddHabitModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
}
