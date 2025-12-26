'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { createHabit } from '@/lib/firestore';

interface AddHabitModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AddHabitModal({ isOpen, onClose }: AddHabitModalProps) {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<'daily' | 'weekly' | 'monthly'>(
        'daily'
    );
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        try {
            await createHabit(user.uid, {
                title,
                description,
                category,
            });

            // Reset form
            setTitle('');
            setDescription('');
            setCategory('daily');
            onClose();
        } catch (error) {
            console.error('Error creating habit:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            <div className="relative bg-dark-card p-6 rounded-2xl shadow-2xl border border-gray-800 w-full max-w-md">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">Add New Habit</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition"
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Habit Name *
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-3 bg-dark-bg border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500 transition"
                            placeholder="e.g., Morning Exercise"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-3 bg-dark-bg border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500 transition resize-none"
                            placeholder="Optional details about this habit"
                            rows={3}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Frequency
                        </label>
                        <select
                            value={category}
                            onChange={(e) =>
                                setCategory(e.target.value as 'daily' | 'weekly' | 'monthly')
                            }
                            className="w-full px-4 py-3 bg-dark-bg border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500 transition"
                        >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 border border-gray-700 text-gray-300 rounded-lg hover:bg-dark-hover transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-lg transition disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Create Habit'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
