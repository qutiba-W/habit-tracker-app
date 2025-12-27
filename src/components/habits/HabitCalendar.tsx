'use client';

import { useState, useMemo } from 'react';

interface HabitCalendarProps {
    habitId: string;
    habitColor: string;
    completionHistory: { [date: string]: boolean };
    onToggleDate: (date: string) => void;
}

export default function HabitCalendar({
    habitId,
    habitColor,
    completionHistory = {},
    onToggleDate
}: HabitCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const monthData = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // First day of month
        const firstDay = new Date(year, month, 1);
        const startingDayOfWeek = firstDay.getDay();

        // Last day of month
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();

        // Today for comparison
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // Generate all days
        const days: { date: string; day: number; isToday: boolean; isFuture: boolean }[] = [];

        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const dateObj = new Date(year, month, i);
            days.push({
                date: dateStr,
                day: i,
                isToday: dateStr === todayStr,
                isFuture: dateObj > today
            });
        }

        return {
            year,
            month,
            monthName: firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            startingDayOfWeek,
            days
        };
    }, [currentDate]);

    // Calculate completion stats
    const stats = useMemo(() => {
        const completedDays = monthData.days.filter(d =>
            completionHistory[d.date] && !d.isFuture
        ).length;
        const validDays = monthData.days.filter(d => !d.isFuture).length;
        const percentage = validDays > 0 ? Math.round((completedDays / validDays) * 100) : 0;
        return { completedDays, validDays, percentage };
    }, [monthData.days, completionHistory]);

    const navigateMonth = (delta: number) => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    };

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="bg-dark-bg rounded-xl p-4 border border-gray-800">
            {/* Header with month navigation */}
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={() => navigateMonth(-1)}
                    className="p-2 hover:bg-dark-card rounded-lg transition-colors text-gray-400 hover:text-white"
                >
                    ←
                </button>
                <h4 className="text-white font-semibold">{monthData.monthName}</h4>
                <button
                    onClick={() => navigateMonth(1)}
                    className="p-2 hover:bg-dark-card rounded-lg transition-colors text-gray-400 hover:text-white"
                >
                    →
                </button>
            </div>

            {/* Stats bar */}
            <div className="mb-4 p-3 bg-dark-card rounded-lg">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">Monthly Progress</span>
                    <span className="text-sm font-semibold" style={{ color: habitColor }}>
                        {stats.completedDays}/{stats.validDays} days ({stats.percentage}%)
                    </span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                            width: `${stats.percentage}%`,
                            backgroundColor: habitColor
                        }}
                    />
                </div>
            </div>

            {/* Week day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map(day => (
                    <div key={day} className="text-center text-xs text-gray-500 font-medium py-1">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for padding */}
                {Array.from({ length: monthData.startingDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {/* Day cells */}
                {monthData.days.map(({ date, day, isToday, isFuture }) => {
                    const isCompleted = completionHistory[date];

                    return (
                        <button
                            key={date}
                            onClick={() => !isFuture && onToggleDate(date)}
                            disabled={isFuture}
                            className={`
                                aspect-square rounded-lg flex items-center justify-center text-sm font-medium
                                transition-all duration-200 relative
                                ${isFuture
                                    ? 'text-gray-700 cursor-not-allowed'
                                    : 'hover:scale-105 cursor-pointer'
                                }
                                ${isToday ? 'ring-2 ring-white ring-offset-1 ring-offset-dark-bg' : ''}
                            `}
                            style={{
                                backgroundColor: isCompleted && !isFuture ? habitColor : 'transparent',
                                border: !isCompleted && !isFuture ? '1px solid #374151' : 'none',
                                color: isCompleted ? '#fff' : isFuture ? '#374151' : '#9ca3af'
                            }}
                        >
                            {day}
                            {isCompleted && !isFuture && (
                                <span className="absolute bottom-0.5 right-0.5 text-[8px]">✓</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Color legend */}
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-400">
                <div className="flex items-center gap-1">
                    <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: habitColor }}
                    />
                    <span>Completed</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded border border-gray-600" />
                    <span>Not done</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-gray-800" />
                    <span>Future</span>
                </div>
            </div>
        </div>
    );
}
