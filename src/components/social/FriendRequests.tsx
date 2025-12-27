'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface FriendRequest {
    id: string;
    fromEmail: string;
    fromDisplayName: string;
    fromUserId: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: any;
}

export default function FriendRequests() {
    const { user } = useAuth();
    const [requests, setRequests] = useState<FriendRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.email) {
            setLoading(false);
            return;
        }

        // Listen for friend requests sent TO this user's email
        const requestsRef = collection(db, 'friendRequests');
        const q = query(requestsRef, where('toEmail', '==', user.email), where('status', '==', 'pending'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const requestData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as FriendRequest));
            setRequests(requestData);
            setLoading(false);
        }, (error) => {
            console.error('Error fetching friend requests:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user?.email]);

    const handleAccept = async (request: FriendRequest) => {
        if (!user) return;

        try {
            // Update the request status
            await updateDoc(doc(db, 'friendRequests', request.id), {
                status: 'accepted'
            });

            // Add each user to the other's friends list
            const myFriendsRef = collection(db, `users/${user.uid}/friends`);
            await addDoc(myFriendsRef, {
                email: request.fromEmail,
                displayName: request.fromDisplayName,
                userId: request.fromUserId,
                addedAt: serverTimestamp()
            });

            // Note: In a full implementation, you'd also add to their friends list
            // This would require a Cloud Function for proper security

        } catch (error) {
            console.error('Error accepting friend request:', error);
        }
    };

    const handleReject = async (request: FriendRequest) => {
        try {
            await updateDoc(doc(db, 'friendRequests', request.id), {
                status: 'rejected'
            });
        } catch (error) {
            console.error('Error rejecting friend request:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    if (requests.length === 0) {
        return (
            <div className="text-center py-4 text-gray-500">
                No pending friend requests
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-400 mb-2">
                📬 Pending Requests ({requests.length})
            </h4>
            {requests.map((request) => (
                <div
                    key={request.id}
                    className="flex items-center justify-between p-3 bg-dark-bg rounded-lg border border-gray-700"
                >
                    <div>
                        <p className="text-white font-medium">{request.fromDisplayName}</p>
                        <p className="text-sm text-gray-400">{request.fromEmail}</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleAccept(request)}
                            className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            ✓ Accept
                        </button>
                        <button
                            onClick={() => handleReject(request)}
                            className="px-3 py-1.5 bg-dark-card hover:bg-red-500/20 text-gray-400 hover:text-red-400 text-sm font-medium rounded-lg border border-gray-700 transition-colors"
                        >
                            ✕ Reject
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
