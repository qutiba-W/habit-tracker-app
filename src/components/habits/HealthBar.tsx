'use client';

interface HealthBarProps {
    percentage: number;
}

export default function HealthBar({ percentage }: HealthBarProps) {
    const getColor = (pct: number) => {
        if (pct >= 80) return 'bg-primary-500';
        if (pct >= 50) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const getGlowColor = (pct: number) => {
        if (pct >= 80) return 'shadow-primary-500/50';
        if (pct >= 50) return 'shadow-yellow-500/50';
        return 'shadow-red-500/50';
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-400">Daily Progress</h3>
                <span className="text-2xl font-bold text-white">{percentage}%</span>
            </div>

            <div className="relative h-8 bg-dark-card rounded-full overflow-hidden border border-gray-800">
                <div
                    className={`h-full transition-all duration-700 ease-out ${getColor(
                        percentage
                    )} ${getGlowColor(percentage)} shadow-lg`}
                    style={{ width: `${percentage}%` }}
                >
                    <div className="h-full w-full opacity-30 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse-slow"></div>
                </div>

                {percentage > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-white drop-shadow-lg">
                            {percentage >= 10 && 'Keep Going!'}
                        </span>
                    </div>
                )}
            </div>

            {percentage === 100 && (
                <div className="text-center">
                    <span className="inline-flex items-center gap-2 text-primary-500 font-semibold text-sm animate-pulse">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Perfect Day! All habits completed!
                    </span>
                </div>
            )}
        </div>
    );
}
