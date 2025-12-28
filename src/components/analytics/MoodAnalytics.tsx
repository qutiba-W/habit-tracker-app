'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { collection, doc, getDoc, setDoc, query, orderBy, limit, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

interface WellnessLog {
    date: string;
    moodValue: number; // Mapped from mood string
    energy: number;
    anxiety: number;
    sleep: number;
}

export default function MoodAnalytics() {
    const { user } = useAuth();
    const [logs, setLogs] = useState<WellnessLog[]>([]);
    const [loading, setLoading] = useState(true);



    useEffect(() => {
        if (!user) return;

        try {
            const wellnessRef = collection(db, `users/${user.uid}/wellnessLogs`);
            const q = query(wellnessRef, orderBy('timestamp', 'desc'), limit(7));

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const fetchedLogs = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        date: doc.id, // YYYY-MM-DD
                        moodValue: data.moodValue || 3,
                        energy: data.energy || 3,
                        anxiety: data.anxiety || 3,
                        sleep: data.sleep || 3
                    };
                }) as WellnessLog[];

                setLogs(fetchedLogs.reverse());
                setLoading(false);
            }, (error) => {
                console.error("Error listening to wellness data:", error);
                setLoading(false);
            });

            return () => unsubscribe();
        } catch (error) {
            console.error("Error setting up listener:", error);
            setLoading(false);
        }
    }, [user]);

    // Removed manual loadWellnessData function as it is replaced by useEffect subscription

    // Chart Data
    const data = {
        labels: logs.map(l => l.date.slice(5)), // MM-DD
        datasets: [
            {
                label: 'Mood',
                data: logs.map(l => l.moodValue),
                borderColor: '#10B981', // green-500
                backgroundColor: '#10B981',
                tension: 0.3
            },
            {
                label: 'Energy',
                data: logs.map(l => l.energy),
                borderColor: '#F59E0B', // yellow-500
                backgroundColor: '#F59E0B',
                tension: 0.3
            }
        ]
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: { color: '#9CA3AF' }
            },
            title: { display: false }
        },
        scales: {
            y: {
                min: 1,
                max: 5,
                grid: { color: '#374151' },
                ticks: { color: '#9CA3AF', stepSize: 1 }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#9CA3AF' }
            }
        }
    };

    if (loading) return <div className="h-48 flex items-center justify-center text-gray-500">Loading wellness data...</div>;

    return (
        <div className="bg-dark-card p-6 rounded-xl border border-gray-800">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">🧠 Mental Wellness Trend</h3>
            </div>

            <div className="h-64">
                {logs.length > 0 ? (
                    <Line options={options} data={data} />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500">
                        <p>No wellness data yet.</p>
                        <p className="text-xs text-gray-600 mt-2">Log your mood in the Wellness tab!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
