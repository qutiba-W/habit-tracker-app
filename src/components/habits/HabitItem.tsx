'use client';

import { useState } from 'react';
import { Habit } from '@/types';
import { toggleHabitCompletion, deleteHabit, updateHabitHistory } from '@/lib/firestore';
import HabitCalendar from './HabitCalendar';

interface HabitItemProps {
    habit: Habit;
    userId: string;
}

export default function HabitItem({ habit, userId }: HabitItemProps) {
    const [showCalendar, setShowCalendar] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleToggle = async () => {
        await toggleHabitCompletion(
            userId,
            habit.id,
            habit.isCompleted,
            habit.streak,
            habit.completionHistory || {}
        );
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteHabit(userId, habit.id);
        } catch (error) {
            console.error('Error deleting habit:', error);
            setIsDeleting(false);
        }
    };

    const handleToggleHistoryDate = async (date: string) => {
        const currentValue = habit.completionHistory?.[date] || false;
        await updateHabitHistory(userId, habit.id, date, !currentValue);
    };

    return (
        <div className="space-y-3">
            <div
                className={`group flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${habit.isCompleted
                    ? 'bg-opacity-10 border'
                    : 'bg-dark-card border border-gray-800 hover:border-gray-700'
                    }`}
                style={{
                    backgroundColor: habit.isCompleted ? `${habit.color}20` : undefined,
                    borderColor: habit.isCompleted ? `${habit.color}50` : undefined
                }}
            >
                {/* Color indicator */}
                <div
                    className="w-1 h-12 rounded-full flex-shrink-0"
                    style={{ backgroundColor: habit.color }}
                />

                {/* Checkbox */}
                <button
                    onClick={handleToggle}
                    className={`flex-shrink-0 w-7 h-7 rounded-lg border-2 transition-all duration-300 flex items-center justify-center`}
                    style={{
                        backgroundColor: habit.isCompleted ? habit.color : 'transparent',
                        borderColor: habit.isCompleted ? habit.color : '#4B5563'
                    }}
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

                {/* Habit info */}
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

                {/* Stats and actions */}
                <div className="flex items-center gap-2">
                    {/* Streak */}
                    {habit.streak > 0 && (
                        <div className="flex items-center gap-1" style={{ color: habit.color }}>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                            </svg>
                            <span className="text-sm font-semibold">{habit.streak}</span>
                        </div>
                    )}

                    {/* Points */}
                    {habit.points > 0 && (
                        <div
                            className="px-3 py-1 rounded-full"
                            style={{ backgroundColor: `${habit.color}30` }}
                        >
                            <span className="text-sm font-semibold" style={{ color: habit.color }}>
                                {habit.points} pts
                            </span>
                        </div>
                    )}

                    {/* Calendar toggle */}
                    <button
                        onClick={() => setShowCalendar(!showCalendar)}
                        className={`p-2 rounded-lg transition-colors ${showCalendar
                            ? 'bg-primary-500/20 text-primary-500'
                            : 'text-gray-400 hover:text-white hover:bg-dark-hover'
                            }`}
                        title="View calendar"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </button>

                    {/* Delete button */}
                    {showDeleteConfirm ? (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="p-2 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-colors"
                                title="Confirm delete"
                            >
                                {isDeleting ? '...' : '✓'}
                            </button>
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-hover transition-colors"
                                title="Cancel"
                            >
                                ✕
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete habit"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Calendar view */}
            {showCalendar && (
                <HabitCalendar
                    habitId={habit.id}
                    habitColor={habit.color}
                    completionHistory={habit.completionHistory || {}}
                    onToggleDate={handleToggleHistoryDate}
                />
            )}
        </div>
    );
}
