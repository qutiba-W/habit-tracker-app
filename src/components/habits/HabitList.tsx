'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useHabits } from '@/lib/hooks/useHabits';
import HabitItem from './HabitItem';
import HealthBar from './HealthBar';

export default function HabitList() {
    const { user } = useAuth();
    const { habits, loading } = useHabits(user?.uid);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    const completedCount = habits.filter((h) => h.isCompleted).length;
    const healthPercentage =
        habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;

    if (habits.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="mb-4">
                    <svg
                        className="w-16 h-16 text-gray-600 mx-auto"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                    </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-400 mb-2">
                    No habits yet
                </h3>
                <p className="text-gray-500">
                    Click "Add Habit" to create your first habit
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <HealthBar percentage={healthPercentage} />

            <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-400 mb-4">
                    Daily Habits ({completedCount}/{habits.length})
                </h3>
                {habits.map((habit) => (
                    <HabitItem key={habit.id} habit={habit} userId={user!.uid} />
                ))}
            </div>
        </div>
    );
}
