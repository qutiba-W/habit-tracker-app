'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import HabitList from '@/components/habits/HabitList';
import AddHabitModal from '@/components/habits/AddHabitModal';

export default function DashboardPage() {
    const { user, loading, signOut } = useAuth();
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    const handleSignOut = async () => {
        await signOut();
        router.push('/login');
    };

    return (
        <div className="min-h-screen bg-dark-bg">
            {/* Header */}
            <header className="border-b border-gray-800 bg-dark-card/50 backdrop-blur-sm sticky top-0 z-40">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-white">Habit Tracker</h1>
                            <p className="text-sm text-gray-400 mt-1">
                                Welcome back, {user.displayName || user.email}
                            </p>
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

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2">
                            Today's Habits
                        </h2>
                        <p className="text-gray-400">
                            {new Date().toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}
                        </p>
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-lg transition shadow-lg shadow-primary-500/30"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4v16m8-8H4"
                            />
                        </svg>
                        Add Habit
                    </button>
                </div>

                {/* Habit List */}
                <div className="bg-dark-card/30 p-6 rounded-2xl border border-gray-800">
                    <HabitList />
                </div>
            </main>

            {/* Add Habit Modal */}
            <AddHabitModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
}
