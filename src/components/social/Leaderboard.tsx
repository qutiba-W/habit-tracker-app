'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface LeaderboardEntry {
    odid: string;
    displayName: string;
    level: number;
    totalXP: number;
    treeStage: string;
    rank: number;
    isCurrentUser: boolean;
}

const mockLeaderboard: LeaderboardEntry[] = [
    { odid: '1', displayName: 'TreeMaster99', level: 42, totalXP: 8500, treeStage: 'tree', rank: 1, isCurrentUser: false },
    { odid: '2', displayName: 'HabitHero', level: 38, totalXP: 7200, treeStage: 'tree', rank: 2, isCurrentUser: false },
    { odid: '3', displayName: 'GrowthGuru', level: 31, totalXP: 5800, treeStage: 'tree', rank: 3, isCurrentUser: false },
    { odid: '4', displayName: 'You', level: 15, totalXP: 1800, treeStage: 'sprout', rank: 4, isCurrentUser: true },
    { odid: '5', displayName: 'NewSprout', level: 8, totalXP: 650, treeStage: 'sprout', rank: 5, isCurrentUser: false },
];

const getTreeEmoji = (stage: string) => {
    switch (stage) {
        case 'seed': return '🌱';
        case 'sprout': return '🌿';
        case 'sapling': return '🌲';
        case 'tree': return '🌳';
        case 'mighty': return '🌴';
        default: return '🌱';
    }
};

const getRankBadge = (rank: number) => {
    switch (rank) {
        case 1: return '🥇';
        case 2: return '🥈';
        case 3: return '🥉';
        default: return `#${rank}`;
    }
};

export default function Leaderboard() {
    const { user } = useAuth();
    const [friendEmail, setFriendEmail] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [message, setMessage] = useState('');
    const [leaderboard] = useState<LeaderboardEntry[]>(mockLeaderboard);

    const handleAddFriend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !friendEmail) return;

        setIsAdding(true);
        setMessage('');

        try {
            // In a real app, you'd search for the user by email and add them
            // For now, we'll add a placeholder friend
            const friendsRef = collection(db, `users/${user.uid}/friends`);

            await addDoc(friendsRef, {
                email: friendEmail,
                displayName: friendEmail.split('@')[0],
                treeLevel: 1,
                totalXP: 0,
                treeStage: 'seed',
                addedAt: serverTimestamp(),
            });

            setMessage('Friend request sent! 🎉');
            setFriendEmail('');
        } catch (error) {
            console.error('Error adding friend:', error);
            setMessage('Failed to add friend. Please try again.');
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Add Friend Form */}
            <div className="bg-dark-card p-6 rounded-xl border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    👥 Add Friend
                </h3>
                <form onSubmit={handleAddFriend} className="flex gap-2">
                    <input
                        type="email"
                        value={friendEmail}
                        onChange={(e) => setFriendEmail(e.target.value)}
                        placeholder="Enter friend's email"
                        className="flex-1 px-4 py-2 bg-dark-bg border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                    />
                    <button
                        type="submit"
                        disabled={isAdding}
                        className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-lg transition disabled:opacity-50"
                    >
                        {isAdding ? 'Adding...' : 'Add'}
                    </button>
                </form>
                {message && (
                    <p className={`mt-2 text-sm ${message.includes('sent') ? 'text-primary-500' : 'text-red-500'}`}>
                        {message}
                    </p>
                )}
            </div>

            {/* Leaderboard */}
            <div className="bg-dark-card p-6 rounded-xl border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    🏆 Leaderboard
                </h3>

                <div className="space-y-2">
                    {leaderboard.map((entry) => (
                        <div
                            key={entry.odid}
                            className={`flex items-center gap-4 p-4 rounded-xl transition-all ${entry.isCurrentUser
                                    ? 'bg-primary-500/20 border border-primary-500/50'
                                    : 'bg-dark-bg hover:bg-dark-hover'
                                }`}
                        >
                            {/* Rank */}
                            <div className="w-12 text-center">
                                <span className="text-xl">{getRankBadge(entry.rank)}</span>
                            </div>

                            {/* Tree Icon */}
                            <div className="w-10 h-10 flex items-center justify-center text-2xl">
                                {getTreeEmoji(entry.treeStage)}
                            </div>

                            {/* User Info */}
                            <div className="flex-1">
                                <p className={`font-semibold ${entry.isCurrentUser ? 'text-primary-500' : 'text-white'}`}>
                                    {entry.displayName}
                                    {entry.isCurrentUser && ' (You)'}
                                </p>
                                <p className="text-sm text-gray-400">
                                    Level {entry.level} • {entry.totalXP.toLocaleString()} XP
                                </p>
                            </div>

                            {/* Level Badge */}
                            <div className="px-3 py-1 bg-dark-card rounded-full border border-gray-700">
                                <span className="text-sm font-semibold text-white">Lvl {entry.level}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {leaderboard.length === 0 && (
                    <p className="text-center text-gray-500 py-8">
                        Add friends to see the leaderboard!
                    </p>
                )}
            </div>

            {/* Weekly Competition */}
            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 p-6 rounded-xl border border-yellow-500/30">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            ⚔️ Weekly Challenge
                        </h3>
                        <p className="text-gray-400 mt-1">Compete with friends for the top spot!</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-400">Ends in</p>
                        <p className="text-xl font-bold text-yellow-500">3 days</p>
                    </div>
                </div>

                <div className="mt-4 p-4 bg-dark-bg/50 rounded-lg">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-300">Your weekly XP</span>
                        <span className="text-xl font-bold text-primary-500">450 XP</span>
                    </div>
                    <div className="mt-2 h-2 bg-dark-bg rounded-full overflow-hidden">
                        <div className="h-full w-3/4 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"></div>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">150 XP to reach #3</p>
                </div>
            </div>
        </div>
    );
}
