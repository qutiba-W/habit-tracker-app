'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useGameStats, getLevelFromXP } from '@/lib/hooks/useGameStats';
import { collection, addDoc, serverTimestamp, onSnapshot, doc, getDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import FriendRequests from './FriendRequests';

interface LeaderboardEntry {
    odid: string;
    friendDocId?: string;
    userId?: string;
    displayName: string;
    email: string;
    level: number;
    totalXP: number;
    weeklyXP: number;
    todayXP: number;
    treeStage: string;
    rank: number;
    isCurrentUser: boolean;
    isActive: boolean;
    lastActive?: string;
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

// Calculate today's XP from weeklyXP array
const getTodayXP = (weeklyXP: number[] | undefined): number => {
    if (!weeklyXP || !Array.isArray(weeklyXP)) return 0;
    const dayOfWeek = new Date().getDay(); // 0 = Sunday
    return Math.max(0, weeklyXP[dayOfWeek] || 0);
};

// Calculate weekly total from weeklyXP array
const getWeeklyTotal = (weeklyXP: number[] | undefined): number => {
    if (!weeklyXP || !Array.isArray(weeklyXP)) return 0;
    return weeklyXP.reduce((sum, val) => sum + Math.max(0, val || 0), 0);
};

// Parse weeklyXP from Firestore - handles both array and object formats
const parseWeeklyXP = (weeklyXPData: any): number[] => {
    const defaultWeeklyXP = [0, 0, 0, 0, 0, 0, 0];

    if (!weeklyXPData) return defaultWeeklyXP;

    // If it's already an array
    if (Array.isArray(weeklyXPData)) {
        return weeklyXPData.map(xp => Math.max(0, xp || 0));
    }

    // If it's an object with numeric keys (from Firestore increment)
    if (typeof weeklyXPData === 'object') {
        const result = [0, 0, 0, 0, 0, 0, 0];
        for (let i = 0; i < 7; i++) {
            const val = weeklyXPData[i] || weeklyXPData[String(i)] || 0;
            result[i] = Math.max(0, val);
        }
        return result;
    }

    return defaultWeeklyXP;
};

// Friend reset version - removed
export default function Leaderboard() {
    const { user } = useAuth();
    const { stats } = useGameStats(user?.uid);
    const [friendEmail, setFriendEmail] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [message, setMessage] = useState('');
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInactive, setShowInactive] = useState(false);

    // Check for empty friends list and attempt restoration
    useEffect(() => {
        if (!user) return;

        const checkAndRestoreFriends = async () => {
            const friendsRef = collection(db, `users/${user.uid}/friends`);
            const snapshot = await getDocs(friendsRef);

            if (snapshot.empty) {
                // Check legacy array on user document
                const userDocRef = doc(db, 'users', user.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    const legacyFriends = userData.friends; // Array of friend IDs

                    if (legacyFriends && Array.isArray(legacyFriends) && legacyFriends.length > 0) {
                        console.log('Restoring friends from legacy array...', legacyFriends);
                        let restoredCount = 0;

                        for (const friendId of legacyFriends) {
                            // Fetch friend details
                            try {
                                const friendUserRef = doc(db, 'users', friendId);
                                const friendUserSnap = await getDoc(friendUserRef);

                                if (friendUserSnap.exists()) {
                                    const fData = friendUserSnap.data();
                                    // Add to subcollection
                                    await addDoc(friendsRef, {
                                        userId: friendId,
                                        email: fData.email,
                                        displayName: fData.displayName || fData.email?.split('@')[0] || 'Friend',
                                        addedAt: serverTimestamp()
                                    });
                                    restoredCount++;
                                }
                            } catch (err) {
                                console.error('Error restoring friend:', friendId, err);
                            }
                        }

                        if (restoredCount > 0) {
                            setMessage(`✅ Restored ${restoredCount} friends from backup! Refreshing...`);
                        }
                    }
                }
            }
        };

        checkAndRestoreFriends();
    }, [user]);

    // Real-time listener for friends list with LIVE stats fetching
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const friendsRef = collection(db, `users/${user.uid}/friends`);

        // Use onSnapshot for real-time friend list updates
        const unsubscribe = onSnapshot(friendsRef, async (snapshot) => {
            const entries: LeaderboardEntry[] = [];
            const today = new Date().toISOString().split('T')[0];

            // Add current user with their live stats
            const userLevel = getLevelFromXP(Math.max(0, stats.totalXP));
            const userWeeklyXP = getWeeklyTotal(stats.weeklyXP);
            const userTodayXP = getTodayXP(stats.weeklyXP);

            entries.push({
                odid: user.uid,
                userId: user.uid,
                displayName: user.displayName || user.email?.split('@')[0] || 'You',
                email: user.email || '',
                level: userLevel,
                totalXP: Math.max(0, stats.totalXP),
                weeklyXP: userWeeklyXP,
                todayXP: userTodayXP,
                treeStage: getTreeStage(userLevel),
                rank: 0,
                isCurrentUser: true,
                isActive: true,
                lastActive: today
            });

            // Fetch LIVE stats for each friend from their actual stats document
            const friendPromises = snapshot.docs.map(async (friendDoc) => {
                const friendData = friendDoc.data();
                const friendUserId = friendData.userId;

                let friendXP = 0;
                let friendWeeklyXP = 0;
                let friendTodayXP = 0;
                let lastActive = friendData.addedAt?.toDate?.()?.toISOString?.()?.split('T')[0] || '';
                let isActive = true;

                // Fetch friend's ACTUAL live stats from their stats document
                if (friendUserId) {
                    try {
                        const friendStatsRef = doc(db, `users/${friendUserId}/stats/summary`);
                        const friendStatsSnap = await getDoc(friendStatsRef);

                        if (friendStatsSnap.exists()) {
                            const friendStats = friendStatsSnap.data();
                            friendXP = Math.max(0, friendStats.totalXP || 0);

                            // Parse weeklyXP properly (handles both array and object formats)
                            const parsedWeeklyXP = parseWeeklyXP(friendStats.weeklyXP);
                            friendWeeklyXP = getWeeklyTotal(parsedWeeklyXP);
                            friendTodayXP = getTodayXP(parsedWeeklyXP);

                            // Check if active (has reset date within last 7 days)
                            if (friendStats.lastResetDate) {
                                lastActive = friendStats.lastResetDate;
                                const lastDate = new Date(friendStats.lastResetDate);
                                const daysSince = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
                                isActive = daysSince <= 7;
                            }
                        }
                    } catch (err) {
                        console.error('Error fetching friend stats:', err);
                    }
                }

                const friendLevel = Math.max(1, getLevelFromXP(friendXP));

                return {
                    odid: friendDoc.id,
                    friendDocId: friendDoc.id,
                    userId: friendUserId,
                    displayName: friendData.displayName || friendData.email?.split('@')[0] || 'Friend',
                    email: friendData.email || '',
                    level: friendLevel,
                    totalXP: friendXP,
                    weeklyXP: friendWeeklyXP,
                    todayXP: friendTodayXP,
                    treeStage: getTreeStage(friendLevel),
                    rank: 0,
                    isCurrentUser: false,
                    isActive,
                    lastActive
                } as LeaderboardEntry;
            });

            const friendEntries = await Promise.all(friendPromises);
            entries.push(...friendEntries);

            // Sort by WEEKLY XP (competitive metric) and assign ranks
            entries.sort((a, b) => b.weeklyXP - a.weeklyXP);
            entries.forEach((entry, index) => {
                entry.rank = index + 1;
            });

            setLeaderboard(entries);
            setLoading(false);
        }, (error) => {
            console.error('Error fetching leaderboard:', error);
            const userLevel = getLevelFromXP(Math.max(0, stats.totalXP));
            setLeaderboard([{
                odid: user.uid,
                displayName: user.displayName || user.email?.split('@')[0] || 'You',
                email: user.email || '',
                level: userLevel,
                totalXP: Math.max(0, stats.totalXP),
                weeklyXP: getWeeklyTotal(stats.weeklyXP),
                todayXP: getTodayXP(stats.weeklyXP),
                treeStage: getTreeStage(userLevel),
                rank: 1,
                isCurrentUser: true,
                isActive: true
            }]);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, stats.totalXP, stats.weeklyXP]);

    const handleAddFriend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !friendEmail) return;

        const normalizedEmail = friendEmail.toLowerCase().trim();

        // VALIDATION 1: Prevent self-friend request
        if (normalizedEmail === user.email?.toLowerCase()) {
            setMessage("❌ You can't send a friend request to yourself!");
            return;
        }

        setIsAdding(true);
        setMessage('');

        try {
            // VALIDATION 2: Check if already friends
            const friendsRef = collection(db, `users/${user.uid}/friends`);
            const friendsSnapshot = await getDocs(friendsRef);
            const existingFriendEmails = friendsSnapshot.docs.map((friendDoc) => friendDoc.data().email?.toLowerCase());

            if (existingFriendEmails.includes(normalizedEmail)) {
                setMessage("❌ You're already friends with this person!");
                setIsAdding(false);
                return;
            }

            // VALIDATION 3: Check for existing pending request (simplified query)
            const requestsRef = collection(db, 'friendRequests');
            const myRequestsQuery = query(
                requestsRef,
                where('fromUserId', '==', user.uid)
            );
            const myRequestsSnapshot = await getDocs(myRequestsQuery);

            const hasPendingRequest = myRequestsSnapshot.docs.some(doc => {
                const data = doc.data();
                return data.toEmail?.toLowerCase() === normalizedEmail && data.status === 'pending';
            });

            if (hasPendingRequest) {
                setMessage("❌ You already have a pending request to this person!");
                setIsAdding(false);
                return;
            }

            // Create a friend request
            await addDoc(requestsRef, {
                fromEmail: user.email?.toLowerCase(),
                fromDisplayName: user.displayName || user.email?.split('@')[0],
                fromUserId: user.uid,
                toEmail: normalizedEmail,
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
            setLeaderboard(prev => prev.filter(entry => entry.friendDocId !== friendDocId));
        } catch (error) {
            console.error('Error removing friend:', error);
        }
    };

    const resetFriends = async () => {
        if (!user || !confirm('⚠️ DANGER: Are you sure you want to RESET your friend list? This will remove all connected friends completely.')) return;
        try {
            const friendsRef = collection(db, `users/${user.uid}/friends`);
            const snapshot = await getDocs(friendsRef);
            if (snapshot.empty) {
                alert('No friends to reset.');
                return;
            }
            const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);
            setLeaderboard(leaderboard.filter(e => e.isCurrentUser)); // Keep only self
            alert('Friends list has been reset.');
        } catch (error) {
            console.error('Error resetting friends:', error);
            alert('Failed to reset friend list.');
        }
    };

    // Filter active/inactive friends
    const activeFriends = leaderboard.filter(e => e.isActive || e.isCurrentUser);
    const inactiveFriends = leaderboard.filter(e => !e.isActive && !e.isCurrentUser);
    const displayedFriends = showInactive ? leaderboard : activeFriends;

    // Calculate user's weekly XP
    const weeklyXP = getWeeklyTotal(stats.weeklyXP);

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
                    <p className={`mt-2 text-sm ${message.includes('🎉') ? 'text-primary-500' : 'text-red-500'}`}>
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
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        🏆 Weekly Leaderboard
                    </h3>
                    {inactiveFriends.length > 0 && (
                        <button
                            onClick={() => setShowInactive(!showInactive)}
                            className="text-xs text-gray-500 hover:text-gray-300"
                        >
                            {showInactive ? 'Hide Inactive' : `Show Inactive (${inactiveFriends.length})`}
                        </button>
                    )}
                </div>

                <p className="text-xs text-gray-500 mb-4">Ranked by weekly XP • Profile level shown for achievements</p>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {displayedFriends.map((entry) => (
                            <div
                                key={entry.odid}
                                className={`flex items-center gap-4 p-4 rounded-xl transition-all ${entry.isCurrentUser
                                    ? 'bg-primary-500/20 border border-primary-500/50'
                                    : entry.isActive
                                        ? 'bg-dark-bg hover:bg-dark-hover'
                                        : 'bg-dark-bg/50 opacity-60'
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
                                    <div className="flex items-center gap-2">
                                        <p className={`font-semibold ${entry.isCurrentUser ? 'text-primary-500' : 'text-white'}`}>
                                            {entry.displayName}
                                            {entry.isCurrentUser && ' (You)'}
                                        </p>
                                        {!entry.isActive && (
                                            <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded">💤 Inactive</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-400">
                                        <span>Lvl {entry.level}</span>
                                        <span>•</span>
                                        <span>{entry.totalXP.toLocaleString()} Total XP</span>
                                    </div>
                                </div>

                                {/* Weekly XP (Competition Metric) */}
                                <div className="text-right">
                                    <p className="text-lg font-bold text-primary-500">{entry.weeklyXP}</p>
                                    <p className="text-xs text-gray-500">Weekly XP</p>
                                </div>

                                {/* Today's Progress Indicator */}
                                {entry.todayXP > 0 && (
                                    <div className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-sm font-semibold">
                                        +{entry.todayXP}
                                    </div>
                                )}

                                {/* Remove Friend Button */}
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

                {!loading && displayedFriends.length <= 1 && (
                    <p className="text-center text-gray-500 py-4 mt-4 border-t border-gray-800">
                        Add friends to compete and see them on your leaderboard! 🌱
                    </p>
                )}
            </div>

            {/* Weekly Competition Info */}
            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 p-6 rounded-xl border border-yellow-500/30">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            ⚔️ Weekly Challenge
                        </h3>
                        <p className="text-gray-400 mt-1">Compete with friends based on weekly XP!</p>
                        <p className="text-xs text-gray-500 mt-1">💡 Rankings reset every week. Your total XP & level are permanent.</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-400">Your weekly XP</p>
                        <p className="text-xl font-bold text-yellow-500">{weeklyXP.toLocaleString()}</p>
                    </div>
                </div>

                <div className="mt-4 p-4 bg-dark-bg/50 rounded-lg">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-300">Today's Progress</span>
                        <span className="text-lg font-bold text-primary-500">+{getTodayXP(stats.weeklyXP)} XP</span>
                    </div>
                    <div className="mt-2 h-2 bg-dark-bg rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all"
                            style={{ width: `${Math.min((weeklyXP / 1000) * 100, 100)}%` }}
                        ></div>
                    </div>
                </div>
            </div>
            {/* Reset Button */}
            <div className="flex justify-center mt-6">
                <button
                    onClick={resetFriends}
                    className="text-xs text-red-500 hover:text-red-400 opacity-60 hover:opacity-100 transition flex items-center gap-1"
                >
                    ⚠️ Reset Friend List
                </button>
            </div>
        </div>
    );
}
