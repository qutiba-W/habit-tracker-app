'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useGameStats, getLevelFromXP } from '@/lib/hooks/useGameStats';
import { collection, addDoc, serverTimestamp, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import FriendRequests from './FriendRequests';

interface LeaderboardEntry {
    odid: string;
    friendDocId?: string; // Document ID in friends collection
    displayName: string;
    email: string;
    level: number;
    totalXP: number;
    treeStage: string;
    rank: number;
    isCurrentUser: boolean;
}

const getTreeStage = (level: number): string => {
    if (level <= 5) return 'seed';
    if (level <= 15) return 'sprout';
    if (level <= 30) return 'sapling';
    if (level <= 50) return 'tree';
    return 'mighty';
};

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
    const { stats } = useGameStats(user?.uid);
    const [friendEmail, setFriendEmail] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [message, setMessage] = useState('');
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch real leaderboard data from friends
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchLeaderboard = async () => {
            try {
                const entries: LeaderboardEntry[] = [];

                // Add current user
                const userLevel = getLevelFromXP(stats.totalXP);
                entries.push({
                    odid: user.uid,
                    displayName: user.displayName || user.email?.split('@')[0] || 'You',
                    email: user.email || '',
                    level: userLevel,
                    totalXP: stats.totalXP,
                    treeStage: getTreeStage(userLevel),
                    rank: 0, // Will be set after sorting
                    isCurrentUser: true
                });

                // Fetch friends
                const friendsRef = collection(db, `users/${user.uid}/friends`);
                const friendsSnapshot = await getDocs(friendsRef);

                // For each friend, try to get their stats
                for (const friendDoc of friendsSnapshot.docs) {
                    const friendData = friendDoc.data();

                    // Try to get friend's stats (this may fail if they haven't granted access)
                    // For now, use stored data from when they were added
                    const friendXP = friendData.totalXP || 0;
                    const friendLevel = friendData.level || getLevelFromXP(friendXP);

                    entries.push({
                        odid: friendDoc.id,
                        friendDocId: friendDoc.id, // Store doc ID for deletion
                        displayName: friendData.displayName || friendData.email?.split('@')[0] || 'Friend',
                        email: friendData.email || '',
                        level: friendLevel,
                        totalXP: friendXP,
                        treeStage: getTreeStage(friendLevel),
                        rank: 0,
                        isCurrentUser: false
                    });
                }

                // Sort by XP and assign ranks
                entries.sort((a, b) => b.totalXP - a.totalXP);
                entries.forEach((entry, index) => {
                    entry.rank = index + 1;
                });

                setLeaderboard(entries);
            } catch (error) {
                console.error('Error fetching leaderboard:', error);
                // Fallback to just showing current user
                const userLevel = getLevelFromXP(stats.totalXP);
                setLeaderboard([{
                    odid: user.uid,
                    displayName: user.displayName || user.email?.split('@')[0] || 'You',
                    email: user.email || '',
                    level: userLevel,
                    totalXP: stats.totalXP,
                    treeStage: getTreeStage(userLevel),
                    rank: 1,
                    isCurrentUser: true
                }]);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, [user, stats.totalXP]);

    const handleAddFriend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !friendEmail) return;

        setIsAdding(true);
        setMessage('');

        try {
            // Create a friend request in the global friendRequests collection
            const friendRequestsRef = collection(db, 'friendRequests');

            await addDoc(friendRequestsRef, {
                fromEmail: user.email,
                fromDisplayName: user.displayName || user.email?.split('@')[0],
                fromUserId: user.uid,
                toEmail: friendEmail.toLowerCase(),
                status: 'pending',
                createdAt: serverTimestamp(),
            });

            setMessage('Friend request sent! 🎉');
            setFriendEmail('');
        } catch (error) {
            console.error('Error sending friend request:', error);
            setMessage('Failed to send request. Please try again.');
        } finally {
            setIsAdding(false);
        }
    };

    // Remove friend function
    const handleRemoveFriend = async (friendDocId: string) => {
        if (!user || !friendDocId) return;

        if (!confirm('Are you sure you want to remove this friend?')) return;

        try {
            const friendRef = doc(db, `users/${user.uid}/friends/${friendDocId}`);
            await deleteDoc(friendRef);

            // Update leaderboard to remove the friend
            setLeaderboard(prev => prev.filter(entry => entry.friendDocId !== friendDocId));
        } catch (error) {
            console.error('Error removing friend:', error);
        }
    };

    // Calculate days until end of week (Sunday)
    const getDaysUntilWeekEnd = () => {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Sunday
        const daysUntil = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
        return daysUntil;
    };

    // Calculate weekly XP from stats
    const weeklyXP = stats.weeklyXP?.reduce((sum, val) => sum + val, 0) || 0;

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
                        {isAdding ? 'Sending...' : 'Add'}
                    </button>
                </form>
                {message && (
                    <p className={`mt-2 text-sm ${message.includes('sent') ? 'text-primary-500' : 'text-red-500'}`}>
                        {message}
                    </p>
                )}
            </div>

            {/* Friend Requests */}
            <div className="bg-dark-card p-6 rounded-xl border border-gray-800">
                <FriendRequests />
            </div>

            {/* Leaderboard */}
            <div className="bg-dark-card p-6 rounded-xl border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    🏆 Leaderboard
                </h3>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                    </div>
                ) : (
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

                                {/* Remove Friend Button (only for friends, not current user) */}
                                {!entry.isCurrentUser && entry.friendDocId && (
                                    <button
                                        onClick={() => handleRemoveFriend(entry.friendDocId!)}
                                        className="ml-2 p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                        title="Remove friend"
                                    >
                                        🗑️
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {!loading && leaderboard.length <= 1 && (
                    <p className="text-center text-gray-500 py-4 mt-4 border-t border-gray-800">
                        Add friends to compete and see them on your leaderboard! 🌱
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
                        <p className="text-xl font-bold text-yellow-500">{getDaysUntilWeekEnd()} days</p>
                    </div>
                </div>

                <div className="mt-4 p-4 bg-dark-bg/50 rounded-lg">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-300">Your weekly XP</span>
                        <span className="text-xl font-bold text-primary-500">{weeklyXP.toLocaleString()} XP</span>
                    </div>
                    <div className="mt-2 h-2 bg-dark-bg rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all"
                            style={{ width: `${Math.min((weeklyXP / 1000) * 100, 100)}%` }}
                        ></div>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                        {leaderboard.length > 1
                            ? `Keep going to climb the ranks!`
                            : `Add friends to start competing!`
                        }
                    </p>
                </div>
            </div>
        </div>
    );
}
