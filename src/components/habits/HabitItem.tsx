'use client';

import { Habit } from '@/types';
import { toggleHabitCompletion } from '@/lib/firestore';

interface HabitItemProps {
    habit: Habit;
    userId: string;
}

export default function HabitItem({ habit, userId }: HabitItemProps) {
    const handleToggle = async () => {
        await toggleHabitCompletion(
            userId,
            habit.id,
            habit.isCompleted,
            habit.streak
        );
    };

    return (
        <div
            className={`group flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${habit.isCompleted
                    ? 'bg-primary-500/10 border border-primary-500/30'
                    : 'bg-dark-card border border-gray-800 hover:border-gray-700'
                }`}
        >
            <button
                onClick={handleToggle}
                className={`flex-shrink-0 w-7 h-7 rounded-lg border-2 transition-all duration-300 flex items-center justify-center ${habit.isCompleted
                        ? 'bg-primary-500 border-primary-500'
                        : 'border-gray-600 hover:border-primary-500'
                    }`}
            >
                {habit.isCompleted && (
                    <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path d="M5 13l4 4L19 7"></path>
                    </svg>
                )}
            </button>

            <div className="flex-1 min-w-0">
                <h3
                    className={`font-medium transition-all ${habit.isCompleted ? 'text-gray-400 line-through' : 'text-white'
                        }`}
                >
                    {habit.title}
                </h3>
                {habit.description && (
                    <p className="text-sm text-gray-500 mt-1">{habit.description}</p>
                )}
            </div>

            <div className="flex items-center gap-3">
                {habit.streak > 0 && (
                    <div className="flex items-center gap-1 text-primary-500">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                        <span className="text-sm font-semibold">{habit.streak}</span>
                    </div>
                )}

                {habit.points > 0 && (
                    <div className="bg-primary-500/20 px-3 py-1 rounded-full">
                        <span className="text-sm font-semibold text-primary-500">
                            {habit.points} pts
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
