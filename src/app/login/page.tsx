'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user && !loading) {
            router.push('/dashboard');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-dark-bg via-dark-bg to-primary-900/10">
            <div className="w-full max-w-6xl">
                <div className="text-center mb-12">
                    <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
                        Habit Tracker
                    </h1>
                    <p className="text-xl text-gray-400">
                        Build better habits, track your progress, achieve your goals
                    </p>
                </div>

                <LoginForm />
            </div>
        </div>
    );
}
