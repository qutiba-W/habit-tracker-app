'use client';

import { useMemo } from 'react';

interface TreeVisualProps {
    level: number;
    xp: number;
    maxXpForLevel: number;
}

// Tree stages based on level
const getTreeStage = (level: number) => {
    if (level <= 5) return 'seed';
    if (level <= 15) return 'sprout';
    if (level <= 30) return 'sapling';
    if (level <= 50) return 'tree';
    return 'mighty';
};

const TreeVisual = ({ level, xp, maxXpForLevel }: TreeVisualProps) => {
    const stage = useMemo(() => getTreeStage(level), [level]);
    const safeXp = Math.max(0, xp);
    const progressPercent = Math.min((safeXp / maxXpForLevel) * 100, 100);

    return (
        <div className="relative flex flex-col items-center">
            {/* Tree Container */}
            <div className="relative w-64 h-80 flex items-end justify-center">
                {/* Glow effect for high levels */}
                {level >= 31 && (
                    <div className="absolute inset-0 bg-gradient-to-t from-primary-500/20 via-transparent to-transparent rounded-full blur-xl animate-pulse"></div>
                )}

                {/* Seed Stage */}
                {stage === 'seed' && (
                    <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-b from-amber-600 to-amber-800 rounded-full shadow-lg">
                            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-4 h-8 bg-gradient-to-t from-green-600 to-green-400 rounded-full transform -translate-y-6"></div>
                        </div>
                        {/* Soil */}
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-20 h-4 bg-gradient-to-t from-amber-900 to-amber-700 rounded-full"></div>
                    </div>
                )}

                {/* Sprout Stage */}
                {stage === 'sprout' && (
                    <div className="relative">
                        {/* Stem */}
                        <div className="w-3 h-24 bg-gradient-to-t from-green-700 to-green-500 rounded-full mx-auto">
                            {/* Leaves */}
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-16">
                                <div className="absolute top-0 left-0 w-8 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full transform -rotate-45 origin-bottom-right"></div>
                                <div className="absolute top-0 right-0 w-8 h-12 bg-gradient-to-bl from-green-400 to-green-600 rounded-full transform rotate-45 origin-bottom-left"></div>
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-14 bg-gradient-to-t from-green-500 to-green-400 rounded-full"></div>
                            </div>
                        </div>
                        {/* Soil */}
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-gradient-to-t from-amber-900 to-amber-700 rounded-full"></div>
                    </div>
                )}

                {/* Sapling Stage */}
                {stage === 'sapling' && (
                    <div className="relative">
                        {/* Trunk */}
                        <div className="w-6 h-32 bg-gradient-to-t from-amber-800 to-amber-600 rounded-t-lg mx-auto">
                            {/* Left Branch */}
                            <div className="absolute top-8 -left-8 w-12 h-3 bg-gradient-to-l from-amber-700 to-amber-600 rounded-full transform -rotate-12"></div>
                            <div className="absolute top-4 -left-10 w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 rounded-full"></div>
                            {/* Right Branch */}
                            <div className="absolute top-16 -right-8 w-12 h-3 bg-gradient-to-r from-amber-700 to-amber-600 rounded-full transform rotate-12"></div>
                            <div className="absolute top-12 -right-10 w-12 h-12 bg-gradient-to-bl from-green-400 to-green-600 rounded-full"></div>
                            {/* Top */}
                            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-20 h-20 bg-gradient-to-t from-green-500 to-green-400 rounded-full"></div>
                        </div>
                        {/* Soil */}
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-28 h-6 bg-gradient-to-t from-amber-900 to-amber-700 rounded-full"></div>
                    </div>
                )}

                {/* Tree Stage */}
                {stage === 'tree' && (
                    <div className="relative">
                        {/* Trunk */}
                        <div className="w-10 h-40 bg-gradient-to-t from-amber-900 to-amber-700 rounded-t-lg mx-auto">
                            {/* Branches */}
                            <div className="absolute top-4 -left-14 w-16 h-4 bg-gradient-to-l from-amber-800 to-amber-700 rounded-full transform -rotate-15"></div>
                            <div className="absolute top-4 -left-18 w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full"></div>

                            <div className="absolute top-16 -right-14 w-16 h-4 bg-gradient-to-r from-amber-800 to-amber-700 rounded-full transform rotate-15"></div>
                            <div className="absolute top-12 -right-18 w-20 h-20 bg-gradient-to-bl from-green-500 to-green-600 rounded-full"></div>

                            <div className="absolute top-28 -left-10 w-12 h-3 bg-gradient-to-l from-amber-800 to-amber-700 rounded-full"></div>
                            <div className="absolute top-24 -left-14 w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full"></div>

                            {/* Top Crown */}
                            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-32 h-32 bg-gradient-to-t from-green-600 to-green-400 rounded-full"></div>
                        </div>
                        {/* Soil */}
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-36 h-8 bg-gradient-to-t from-amber-900 to-amber-700 rounded-full"></div>
                    </div>
                )}

                {/* Mighty Tree Stage */}
                {stage === 'mighty' && (
                    <div className="relative">
                        {/* Trunk */}
                        <div className="w-14 h-48 bg-gradient-to-t from-amber-900 to-amber-700 rounded-t-lg mx-auto shadow-2xl">
                            {/* Left Branches */}
                            <div className="absolute top-4 -left-20 w-24 h-5 bg-gradient-to-l from-amber-800 to-amber-700 rounded-full transform -rotate-10"></div>
                            <div className="absolute top-0 -left-28 w-28 h-28 bg-gradient-to-br from-green-400 to-green-600 rounded-full shadow-lg"></div>

                            <div className="absolute top-24 -left-16 w-18 h-4 bg-gradient-to-l from-amber-800 to-amber-700 rounded-full transform -rotate-5"></div>
                            <div className="absolute top-20 -left-24 w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-full shadow-lg"></div>

                            {/* Right Branches */}
                            <div className="absolute top-12 -right-20 w-24 h-5 bg-gradient-to-r from-amber-800 to-amber-700 rounded-full transform rotate-10"></div>
                            <div className="absolute top-8 -right-28 w-28 h-28 bg-gradient-to-bl from-green-400 to-green-600 rounded-full shadow-lg"></div>

                            <div className="absolute top-32 -right-14 w-16 h-4 bg-gradient-to-r from-amber-800 to-amber-700 rounded-full transform rotate-5"></div>
                            <div className="absolute top-28 -right-22 w-22 h-22 bg-gradient-to-bl from-green-500 to-green-600 rounded-full shadow-lg"></div>

                            {/* Top Crown */}
                            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-40 h-40 bg-gradient-to-t from-green-600 to-green-400 rounded-full shadow-xl"></div>

                            {/* Golden particles for mighty tree */}
                            <div className="absolute -top-8 -left-8 w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
                            <div className="absolute top-4 -right-12 w-2 h-2 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
                            <div className="absolute top-16 -left-16 w-2 h-2 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
                        </div>
                        {/* Soil */}
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-44 h-10 bg-gradient-to-t from-amber-900 to-amber-700 rounded-full shadow-lg"></div>
                    </div>
                )}
            </div>

            {/* Level Badge */}
            <div className="mt-6 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-dark-card rounded-full border border-primary-500/30">
                    <span className="text-2xl">{stage === 'seed' ? '🌱' : stage === 'sprout' ? '🌿' : stage === 'sapling' ? '🌲' : stage === 'tree' ? '🌳' : '🌴'}</span>
                    <span className="text-xl font-bold text-white">Level {level}</span>
                </div>
            </div>

            {/* XP Progress Bar */}
            <div className="w-full max-w-xs mt-4">
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                    <span>XP</span>
                    <span>{xp} / {maxXpForLevel}</span>
                </div>
                <div className="h-3 bg-dark-card rounded-full overflow-hidden border border-gray-700">
                    <div
                        className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-700"
                        style={{ width: `${progressPercent}%` }}
                    >
                        <div className="h-full w-full opacity-30 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse"></div>
                    </div>
                </div>
            </div>

            {/* Stage Name */}
            <p className="mt-2 text-sm text-gray-500 capitalize">
                {stage === 'mighty' ? 'Mighty Tree 🌟' : stage} Stage
            </p>
        </div>
    );
};

export default TreeVisual;
