'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface MoodEntry {
    mood: 'great' | 'good' | 'okay' | 'low' | 'bad';
    energy: number; // 1-5
    anxiety: number; // 1-5
    sleep: number; // 1-5
    notes: string;
    timestamp: string;
}

interface MoodHistory {
    [date: string]: MoodEntry;
}

const moodOptions = [
    { value: 'great', emoji: '😊', label: 'Great', color: '#10b981' },
    { value: 'good', emoji: '🙂', label: 'Good', color: '#34d399' },
    { value: 'okay', emoji: '😐', label: 'Okay', color: '#fbbf24' },
    { value: 'low', emoji: '😔', label: 'Low', color: '#f97316' },
    { value: 'bad', emoji: '😢', label: 'Bad', color: '#ef4444' },
];

const getMoodColor = (mood: string) => {
    return moodOptions.find(m => m.value === mood)?.color || '#6b7280';
};

const getMoodEmoji = (mood: string) => {
    return moodOptions.find(m => m.value === mood)?.emoji || '😐';
};

export default function MoodTracker() {
    const { user } = useAuth();
    const [currentDate] = useState(new Date());
    const [selectedMood, setSelectedMood] = useState<string | null>(null);
    const [energy, setEnergy] = useState(3);
    const [anxiety, setAnxiety] = useState(3);
    const [sleep, setSleep] = useState(3);
    const [notes, setNotes] = useState('');
    const [moodHistory, setMoodHistory] = useState<MoodHistory>({});
    const [isSaving, setIsSaving] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [viewMonth, setViewMonth] = useState(new Date());

    const todayStr = currentDate.toISOString().split('T')[0];
    const todayEntry = moodHistory[todayStr];

    // Generate calendar for the month
    const calendarData = useMemo(() => {
        const year = viewMonth.getFullYear();
        const month = viewMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();

        const days: { date: string; day: number; mood?: MoodEntry }[] = [];
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            days.push({
                date: dateStr,
                day: i,
                mood: moodHistory[dateStr]
            });
        }

        return { days, startingDay, monthName: firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) };
    }, [viewMonth, moodHistory]);

    // Load mood history on mount
    useEffect(() => {
        if (user) {
            loadMoodHistory();
        }
    }, [user]);

    const loadMoodHistory = async () => {
        if (!user) return;
        try {
            const moodDocRef = doc(db, `users/${user.uid}/wellness/mood`);
            const moodDoc = await getDoc(moodDocRef);
            if (moodDoc.exists()) {
                setMoodHistory(moodDoc.data().history || {});
                // Load today's entry if exists
                const today = moodDoc.data().history?.[todayStr];
                if (today) {
                    setSelectedMood(today.mood);
                    setEnergy(today.energy);
                    setAnxiety(today.anxiety);
                    setSleep(today.sleep);
                    setNotes(today.notes || '');
                }
            }
        } catch (error) {
            console.error('Error loading mood history:', error);
        }
    };

    const saveMoodEntry = async () => {
        if (!user || !selectedMood) return;

        setIsSaving(true);
        try {
            const moodDocRef = doc(db, `users/${user.uid}/wellness/mood`);
            const newEntry: MoodEntry = {
                mood: selectedMood as MoodEntry['mood'],
                energy,
                anxiety,
                sleep,
                notes,
                timestamp: new Date().toISOString()
            };

            const newHistory = { ...moodHistory, [todayStr]: newEntry };
            await setDoc(moodDocRef, { history: newHistory }, { merge: true });
            setMoodHistory(newHistory);
        } catch (error) {
            console.error('Error saving mood:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        🧠 Mental Wellness
                    </h2>
                    <p className="text-gray-400 mt-1">Track your mood and mental state daily</p>
                </div>
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className={`px-4 py-2 rounded-lg transition-colors ${showHistory
                        ? 'bg-primary-500 text-white'
                        : 'bg-dark-card text-gray-400 hover:text-white'
                        }`}
                >
                    {showHistory ? '📝 Log Today' : '📅 View History'}
                </button>
            </div>

            {showHistory ? (
                /* Calendar History View */
                <div className="bg-dark-card p-6 rounded-xl border border-gray-800">
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1))}
                            className="p-2 hover:bg-dark-hover rounded-lg text-gray-400 hover:text-white"
                        >
                            ←
                        </button>
                        <h3 className="text-lg font-semibold text-white">{calendarData.monthName}</h3>
                        <button
                            onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1))}
                            className="p-2 hover:bg-dark-hover rounded-lg text-gray-400 hover:text-white"
                        >
                            →
                        </button>
                    </div>

                    {/* Week headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {weekDays.map(day => (
                            <div key={day} className="text-center text-xs text-gray-500 font-medium py-1">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: calendarData.startingDay }).map((_, i) => (
                            <div key={`empty-${i}`} className="aspect-square" />
                        ))}
                        {calendarData.days.map(({ date, day, mood }) => (
                            <div
                                key={date}
                                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all ${date === todayStr ? 'ring-2 ring-white' : ''
                                    }`}
                                style={{
                                    backgroundColor: mood ? getMoodColor(mood.mood) + '30' : 'transparent',
                                    border: mood ? `2px solid ${getMoodColor(mood.mood)}` : '1px solid #374151'
                                }}
                                title={mood ? `${mood.mood} - Energy: ${mood.energy}/5, Sleep: ${mood.sleep}/5` : 'No entry'}
                            >
                                <span className="text-gray-400 text-xs">{day}</span>
                                {mood && <span className="text-lg">{getMoodEmoji(mood.mood)}</span>}
                            </div>
                        ))}
                    </div>

                    {/* Legend */}
                    <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs">
                        {moodOptions.map(m => (
                            <div key={m.value} className="flex items-center gap-1">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: m.color }}
                                />
                                <span className="text-gray-400">{m.emoji} {m.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                /* Daily Entry Form */
                <>
                    {/* Mood Selection */}
                    <div className="bg-dark-card p-6 rounded-xl border border-gray-800">
                        <h3 className="text-lg font-semibold text-white mb-4">How are you feeling today?</h3>
                        <div className="flex justify-center gap-4">
                            {moodOptions.map(mood => (
                                <button
                                    key={mood.value}
                                    onClick={() => setSelectedMood(mood.value)}
                                    className={`flex flex-col items-center p-4 rounded-xl transition-all ${selectedMood === mood.value
                                        ? 'scale-110 shadow-lg'
                                        : 'hover:scale-105 opacity-60 hover:opacity-100'
                                        }`}
                                    style={{
                                        backgroundColor: selectedMood === mood.value ? mood.color + '30' : 'transparent',
                                        border: selectedMood === mood.value ? `2px solid ${mood.color}` : '2px solid transparent'
                                    }}
                                >
                                    <span className="text-4xl mb-1">{mood.emoji}</span>
                                    <span className="text-sm text-gray-400">{mood.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Energy Level */}
                        <div className="bg-dark-card p-6 rounded-xl border border-gray-800">
                            <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                                ⚡ Energy Level
                            </h4>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map(level => (
                                    <button
                                        key={level}
                                        onClick={() => setEnergy(level)}
                                        className={`flex-1 py-2 rounded-lg transition-all ${energy >= level
                                            ? 'bg-yellow-500 text-black'
                                            : 'bg-dark-bg text-gray-500'
                                            }`}
                                    >
                                        {level}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-2 text-center">
                                {energy <= 2 ? 'Low energy' : energy <= 3 ? 'Moderate' : 'High energy'}
                            </p>
                        </div>

                        {/* Anxiety Level */}
                        <div className="bg-dark-card p-6 rounded-xl border border-gray-800">
                            <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                                😰 Anxiety Level
                            </h4>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map(level => (
                                    <button
                                        key={level}
                                        onClick={() => setAnxiety(level)}
                                        className={`flex-1 py-2 rounded-lg transition-all ${anxiety >= level
                                            ? 'bg-orange-500 text-black'
                                            : 'bg-dark-bg text-gray-500'
                                            }`}
                                    >
                                        {level}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-2 text-center">
                                {anxiety <= 2 ? 'Calm' : anxiety <= 3 ? 'Moderate' : 'High anxiety'}
                            </p>
                        </div>

                        {/* Sleep Quality */}
                        <div className="bg-dark-card p-6 rounded-xl border border-gray-800">
                            <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                                😴 Sleep Quality
                            </h4>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map(level => (
                                    <button
                                        key={level}
                                        onClick={() => setSleep(level)}
                                        className={`flex-1 py-2 rounded-lg transition-all ${sleep >= level
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-dark-bg text-gray-500'
                                            }`}
                                    >
                                        {level}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-2 text-center">
                                {sleep <= 2 ? 'Poor sleep' : sleep <= 3 ? 'Okay' : 'Great sleep'}
                            </p>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="bg-dark-card p-6 rounded-xl border border-gray-800">
                        <h4 className="text-white font-medium mb-3">📝 Notes (optional)</h4>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="How's your day going? Any thoughts you'd like to record..."
                            className="w-full h-24 bg-dark-bg border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 resize-none"
                        />
                    </div>

                    {/* Save Button */}
                    <button
                        onClick={saveMoodEntry}
                        disabled={!selectedMood || isSaving}
                        className="w-full py-4 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                                Saving...
                            </>
                        ) : todayEntry ? (
                            '✓ Update Today\'s Entry'
                        ) : (
                            '💾 Save Today\'s Entry'
                        )}
                    </button>

                    {todayEntry && (
                        <p className="text-center text-sm text-gray-500">
                            Last updated: {new Date(todayEntry.timestamp).toLocaleTimeString()}
                        </p>
                    )}
                </>
            )}
        </div>
    );
}
