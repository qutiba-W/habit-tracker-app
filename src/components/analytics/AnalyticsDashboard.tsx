'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useGameStats } from '@/lib/hooks/useGameStats';
import { useHabits } from '@/lib/hooks/useHabits';
import { collection, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import MoodAnalytics from './MoodAnalytics';

interface HabitStat {
    title: string;
    completionRate: number;
    streak: number;
}

interface Course {
    id: string;
    title: string;
    color?: string;
    subjects?: number;
    purpose?: string;
    credits?: number;
    studySessions?: number;
    totalStudyTime: number;
}

interface FriendCourse {
    friendName: string;
    courses: Course[];
    totalStudyTime: number;
}

interface StudySession {
    date: string; // YYYY-MM-DD
    durationMinutes: number;
}

interface Assessment {
    id: string;
    courseId: string;
    title: string;
    score: number;
    totalPoints: number;
    weight: number;
    category: string;
}

interface CourseGrade {
    courseId: string;
    courseName: string;
    credits: number;
    grade: number; // percentage
    letterGrade: string;
    gradePoints: number; // 4.0 scale
}

// Grade calculation helpers
const getLetterGrade = (percentage: number): string => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
};

const getGradePoints = (percentage: number): number => {
    if (percentage >= 93) return 4.0;
    if (percentage >= 90) return 3.7;
    if (percentage >= 87) return 3.3;
    if (percentage >= 83) return 3.0;
    if (percentage >= 80) return 2.7;
    if (percentage >= 77) return 2.3;
    if (percentage >= 73) return 2.0;
    if (percentage >= 70) return 1.7;
    if (percentage >= 67) return 1.3;
    if (percentage >= 63) return 1.0;
    if (percentage >= 60) return 0.7;
    return 0.0;
};

const getGradeColor = (percentage: number): string => {
    if (percentage >= 90) return 'text-green-400';
    if (percentage >= 80) return 'text-blue-400';
    if (percentage >= 70) return 'text-yellow-400';
    return 'text-red-400';
};

const COURSE_COLORS = [
    '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];



// Parse weeklyXP properly
const parseWeeklyXP = (weeklyXPData: any): number[] => {
    const defaultWeeklyXP = [0, 0, 0, 0, 0, 0, 0];
    if (!weeklyXPData) return defaultWeeklyXP;
    if (Array.isArray(weeklyXPData)) {
        return weeklyXPData.map(xp => Math.max(0, xp || 0));
    }
    if (typeof weeklyXPData === 'object') {
        const result = [...defaultWeeklyXP];
        for (let i = 0; i < 7; i++) {
            const val = weeklyXPData[i] || weeklyXPData[String(i)] || 0;
            result[i] = Math.max(0, val);
        }
        return result;
    }
    return defaultWeeklyXP;
};

const purposeLabels: Record<string, string> = {
    academic: '📚 Academic',
    personal: '🌱 Personal Growth',
    work: '💼 Work',
    skill: '🎯 Skill Development'
};

export default function AnalyticsDashboard() {
    const { user } = useAuth();
    const { stats, loading } = useGameStats(user?.uid);
    const { habits } = useHabits(user?.uid);
    const [courses, setCourses] = useState<Course[]>([]);
    const [friendCourses, setFriendCourses] = useState<FriendCourse[]>([]);
    const [studySessions, setStudySessions] = useState<any[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(true);
    const [allAssessments, setAllAssessments] = useState<Assessment[]>([]);

    // REAL-TIME LISTENERS using onSnapshot
    useEffect(() => {
        if (!user) return;

        const unsubscribers: (() => void)[] = [];

        // 1. Real-time listener for COURSES
        const coursesRef = collection(db, `users/${user.uid}/courses`);
        const unsubCourses = onSnapshot(coursesRef, (snapshot) => {
            const userCourses = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Course[];
            setCourses(userCourses);
        });
        unsubscribers.push(unsubCourses);

        // 2. Real-time listener for STUDY SESSIONS
        const sessionsRef = collection(db, `users/${user.uid}/studySessions`);
        const unsubSessions = onSnapshot(sessionsRef, (snapshot) => {
            const sessions = snapshot.docs.map(doc => doc.data());
            setStudySessions(sessions);
            setLoadingCourses(false); // Set loading to false once sessions are loaded
        });
        unsubscribers.push(unsubSessions);

        // 3. Load friends' courses (one-time, not real-time for performance)
        const loadFriendData = async () => {
            const friendsRef = collection(db, `users/${user.uid}/friends`);
            const friendsSnap = await getDocs(friendsRef);

            const friendData: FriendCourse[] = [];
            for (const friendDoc of friendsSnap.docs) {
                const friend = friendDoc.data();
                if (friend.userId) {
                    try {
                        const friendCoursesRef = collection(db, `users/${friend.userId}/courses`);
                        const friendCoursesSnap = await getDocs(friendCoursesRef);
                        const fCourses = friendCoursesSnap.docs.map(d => ({
                            id: d.id,
                            ...d.data()
                        })) as Course[];

                        if (fCourses.length > 0) {
                            friendData.push({
                                friendName: friend.displayName || friend.email?.split('@')[0] || 'Friend',
                                courses: fCourses,
                                totalStudyTime: fCourses.reduce((sum, c) => sum + (c.totalStudyTime || 0), 0)
                            });
                        }
                    } catch (err) {
                        console.error('Error loading friend courses:', err);
                    }
                }
            }
            setFriendCourses(friendData);
        };
        loadFriendData();

        // CLEANUP: Unsubscribe all listeners when component unmounts
        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [user]);

    // Load assessments from all courses for GPA calculation
    useEffect(() => {
        if (!user || courses.length === 0) {
            setAllAssessments([]);
            return;
        }

        const loadAllAssessments = async () => {
            const allAssessmentData: Assessment[] = [];

            for (const course of courses) {
                try {
                    const assessmentsRef = collection(db, `users/${user.uid}/courses/${course.id}/assessments`);
                    const snap = await getDocs(assessmentsRef);
                    const courseAssessments = snap.docs.map(doc => ({
                        id: doc.id,
                        courseId: course.id,
                        ...doc.data()
                    })) as Assessment[];
                    allAssessmentData.push(...courseAssessments);
                } catch (err) {
                    console.error(`Error loading assessments for course ${course.id}:`, err);
                }
            }

            setAllAssessments(allAssessmentData);
        };

        loadAllAssessments();
    }, [user, courses]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    // Safe stats wrapper
    const safeStats = {
        totalXP: Math.max(0, stats.totalXP),
        totalPoints: Math.max(0, stats.totalPoints),
        currentStreak: Math.max(0, stats.currentStreak),
        longestStreak: Math.max(0, stats.longestStreak),
    };

    // Habit stats - Real 7-day completion rate
    const habitStats: HabitStat[] = habits.map(habit => {
        let completedCount = 0;
        const today = new Date();
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            if (habit.completionHistory && habit.completionHistory[dateStr]) {
                completedCount++;
            }
        }
        return {
            title: habit.title,
            completionRate: (completedCount / 7) * 100,
            streak: Math.max(0, habit.streak),
        };
    });

    const strengths = [...habitStats].sort((a, b) => b.completionRate - a.completionRate).slice(0, 3);
    const weaknesses = [...habitStats].sort((a, b) => a.completionRate - b.completionRate).slice(0, 3);

    // Weekly data - FIXED: Days array matches JavaScript getDay() (0 = Sunday)
    const weeklyData = parseWeeklyXP(stats.weeklyXP);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; // Correct order!
    const maxValue = Math.max(...weeklyData, 1);
    const hasWeeklyData = weeklyData.some(v => v > 0);
    const weeklyTotal = weeklyData.reduce((sum, v) => sum + v, 0);

    // Today's index
    const todayIndex = new Date().getDay();

    // Monthly Projection - CORRECT FORMULA
    // 1. Average Daily XP (from last 7 days)
    const daysWithData = weeklyData.filter(v => v > 0).length || 1;
    const avgDailyXP = weeklyTotal / Math.max(daysWithData, 1);

    // 2. Days remaining in month
    const currentDate = new Date();
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const daysRemaining = lastDayOfMonth.getDate() - currentDate.getDate();

    // 3. Monthly Estimate = Current XP + (Avg Daily XP × Days Remaining)
    const monthlyEstimate = Math.round(safeStats.totalXP + (avgDailyXP * daysRemaining));

    // ========== WEEKLY FILTERING ==========
    // Filter studySessions to last 7 days only for accurate weekly analytics
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    // Get list of existing course IDs
    const existingCourseIds = new Set(courses.map(c => c.id));

    // Filter sessions to ONLY count sessions from courses that CURRENTLY EXIST
    const validStudySessions = studySessions.filter(session =>
        existingCourseIds.has(session.courseId)
    );

    const weeklyStudySessions = validStudySessions.filter(session => {
        const sessionDate = session.date || '';
        return sessionDate >= sevenDaysAgoStr;
    });

    // Course analytics - DYNAMIC CALCULATION from WEEKLY studySessions
    const totalCourses = courses.length;

    // Calculate WEEKLY study time from sessions (last 7 days only)
    const weeklyTotalStudyTime = weeklyStudySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    const weeklyStudySessionsCount = weeklyStudySessions.length;

    // Calculate time per course dynamically from WEEKLY sessions
    const weeklyTimeMap: Record<string, number> = {};
    weeklyStudySessions.forEach(session => {
        const courseId = session.courseId;
        if (courseId) {
            weeklyTimeMap[courseId] = (weeklyTimeMap[courseId] || 0) + (session.durationMinutes || 0);
        }
    });

    // Calculate ALL-TIME totals (only from existing courses)
    const allTimeStudyTime = validStudySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    const totalStudySessionsCount = validStudySessions.length;

    // Create enriched courses with WEEKLY calculated study time
    const enrichedCourses = courses.map(course => ({
        ...course,
        weeklyStudyTime: weeklyTimeMap[course.id] || 0,
        allTimeStudyTime: (validStudySessions.filter(s => s.courseId === course.id).reduce((sum, s) => sum + (s.durationMinutes || 0), 0))
    }));

    // Use WEEKLY calculated values for display
    const totalStudyTime = weeklyTotalStudyTime;

    // Most studied courses THIS WEEK - sorted by weekly time
    const coursesByTime = [...enrichedCourses].sort((a, b) =>
        (b.weeklyStudyTime || 0) - (a.weeklyStudyTime || 0)
    );
    const mostStudied = coursesByTime.filter(c => (c.weeklyStudyTime || 0) > 0).slice(0, 3);

    // Calculate average study time per course (only for courses with any study time)
    const coursesWithStudyTime = enrichedCourses.filter(c => (c.weeklyStudyTime || 0) > 0);
    const avgStudyTime = coursesWithStudyTime.length > 0
        ? coursesWithStudyTime.reduce((sum, c) => sum + (c.weeklyStudyTime || 0), 0) / coursesWithStudyTime.length
        : 0;

    // Least studied courses - only show courses that are BELOW 50% of average (genuinely need more study)
    // Also exclude courses with 0 time that are in mostStudied (to avoid duplicates)
    const leastStudied = coursesByTime
        .filter(c => {
            const time = c.weeklyStudyTime || 0;
            // Only include if time is less than 50% of average (or 0 if there's any average)
            return time < (avgStudyTime * 0.5);
        })
        .slice(-3)
        .reverse();

    // Course purpose breakdown THIS WEEK
    const purposeBreakdown: Record<string, number> = {};
    enrichedCourses.forEach(course => {
        const purpose = course.purpose || 'academic';
        const time = course.weeklyStudyTime || 0;
        purposeBreakdown[purpose] = (purposeBreakdown[purpose] || 0) + time;
    });

    // ========== GPA CALCULATION ==========
    // Calculate grade for each course based on its assessments
    const courseGrades: CourseGrade[] = courses.map(course => {
        const courseAssessments = allAssessments.filter(a => a.courseId === course.id);

        if (courseAssessments.length === 0) {
            return {
                courseId: course.id,
                courseName: course.title,
                credits: course.credits || 3,
                grade: 0,
                letterGrade: '-',
                gradePoints: 0
            };
        }

        // Calculate weighted average for this course
        let totalWeightedScore = 0;
        let totalWeight = 0;

        courseAssessments.forEach(a => {
            const percentage = (a.score / a.totalPoints) * 100;
            totalWeightedScore += percentage * (a.weight / 100);
            totalWeight += a.weight / 100;
        });

        const grade = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

        return {
            courseId: course.id,
            courseName: course.title,
            credits: course.credits || 3,
            grade,
            letterGrade: getLetterGrade(grade),
            gradePoints: getGradePoints(grade)
        };
    });

    // Filter courses with actual grades
    const gradedCourses = courseGrades.filter(c => c.letterGrade !== '-');

    // Calculate cumulative GPA
    let cumulativeGPA = 0;
    let totalCredits = 0;
    let totalCreditsEarned = 0;

    gradedCourses.forEach(course => {
        totalCreditsEarned += course.credits;
        totalCredits += course.credits;
    });

    if (totalCreditsEarned > 0) {
        const totalGradePoints = gradedCourses.reduce((sum, c) => sum + (c.gradePoints * c.credits), 0);
        cumulativeGPA = totalGradePoints / totalCreditsEarned;
    }

    // Find best and worst courses
    const sortedByGrade = [...gradedCourses].sort((a, b) => b.grade - a.grade);
    const bestCourse = sortedByGrade.length > 0 ? sortedByGrade[0] : null;
    const worstCourse = sortedByGrade.length > 0 ? sortedByGrade[sortedByGrade.length - 1] : null;
    const atRiskCourses = gradedCourses.filter(c => c.grade < 60);

    // Grade distribution for bar chart
    const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    gradedCourses.forEach(c => {
        if (c.letterGrade in gradeDistribution) {
            gradeDistribution[c.letterGrade as keyof typeof gradeDistribution]++;
        }
    });

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-dark-card p-4 rounded-xl border border-gray-800">
                    <p className="text-sm text-gray-400">Total XP</p>
                    <p className="text-2xl font-bold text-primary-500">{safeStats.totalXP.toLocaleString()}</p>
                </div>
                <div className="bg-dark-card p-4 rounded-xl border border-gray-800">
                    <p className="text-sm text-gray-400">Current Streak</p>
                    <p className="text-2xl font-bold text-orange-500">{safeStats.currentStreak} 🔥</p>
                </div>
                <div className="bg-dark-card p-4 rounded-xl border border-gray-800">
                    <p className="text-sm text-gray-400">Longest Streak</p>
                    <p className="text-2xl font-bold text-yellow-500">{safeStats.longestStreak} ⭐</p>
                </div>
                <div className="bg-dark-card p-4 rounded-xl border border-gray-800">
                    <p className="text-sm text-gray-400">Total Points</p>
                    <p className="text-2xl font-bold text-green-500">{safeStats.totalPoints.toLocaleString()}</p>
                </div>
            </div>

            {/* Weekly & Monthly Progress */}
            <div className="grid md:grid-cols-3 gap-4">
                {/* Weekly Chart */}
                <div className="md:col-span-2 bg-dark-card p-6 rounded-xl border border-gray-800">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">📊 Weekly Progress</h3>
                        <span className="text-sm text-primary-500 font-bold">{weeklyTotal} XP this week</span>
                    </div>
                    {hasWeeklyData ? (
                        <div className="flex items-end justify-between h-48 gap-2">
                            {weeklyData.map((value, index) => (
                                <div key={index} className="flex-1 flex flex-col items-center">
                                    <div className="relative w-full flex justify-center mb-2">
                                        <div
                                            className={`w-8 md:w-12 rounded-t-lg transition-all duration-500 ${index === todayIndex
                                                ? 'bg-gradient-to-t from-yellow-600 to-yellow-400'
                                                : 'bg-gradient-to-t from-primary-600 to-primary-400'
                                                }`}
                                            style={{ height: `${Math.max((value / maxValue) * 160, 4)}px` }}
                                        >
                                            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-gray-400">
                                                {value}
                                            </span>
                                        </div>
                                    </div>
                                    <span className={`text-xs ${index === todayIndex ? 'text-yellow-500 font-bold' : 'text-gray-500'}`}>
                                        {days[index]}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                            <span className="text-4xl mb-2">📈</span>
                            <p>Complete habits this week to see your progress!</p>
                        </div>
                    )}
                </div>

                {/* Monthly Estimate */}
                <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 p-6 rounded-xl border border-purple-500/30">
                    <h3 className="text-lg font-semibold text-white mb-4">📅 Monthly Estimate</h3>
                    <div className="text-center">
                        <p className="text-4xl font-bold text-purple-400">{monthlyEstimate.toLocaleString()}</p>
                        <p className="text-sm text-gray-400 mt-1">Projected XP this month</p>
                    </div>
                    <div className="mt-6 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Weekly Average</span>
                            <span className="text-white">{weeklyTotal} XP</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Daily Average</span>
                            <span className="text-white">{Math.round(weeklyTotal / 7)} XP</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Best Day</span>
                            <span className="text-yellow-500">{days[weeklyData.indexOf(Math.max(...weeklyData))]} ({Math.max(...weeklyData)} XP)</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ========== ACADEMIC PERFORMANCE SECTION ========== */}
            <div className="bg-dark-card p-6 rounded-xl border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-4">🎓 Academic Performance</h3>

                {/* Top Row: GPA Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-dark-bg p-4 rounded-lg text-center">
                        <p className="text-sm text-gray-400">Cumulative GPA</p>
                        <p className={`text-2xl font-bold ${cumulativeGPA >= 3.0 ? 'text-green-400' : cumulativeGPA >= 2.0 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {gradedCourses.length > 0 ? cumulativeGPA.toFixed(2) : '-'}
                        </p>
                        <p className="text-xs text-gray-500">of 4.0</p>
                    </div>
                    <div className="bg-dark-bg p-4 rounded-lg text-center">
                        <p className="text-sm text-gray-400">Total Credits</p>
                        <p className="text-2xl font-bold text-blue-400">{totalCreditsEarned}</p>
                        <p className="text-xs text-gray-500">earned</p>
                    </div>
                    <div className="bg-dark-bg p-4 rounded-lg text-center">
                        <p className="text-sm text-gray-400">Average Score</p>
                        <p className={`text-2xl font-bold ${gradedCourses.length > 0 ? getGradeColor(gradedCourses.reduce((sum, c) => sum + c.grade, 0) / gradedCourses.length) : 'text-gray-400'}`}>
                            {gradedCourses.length > 0 ? `${(gradedCourses.reduce((sum, c) => sum + c.grade, 0) / gradedCourses.length).toFixed(1)}%` : '-'}
                        </p>
                    </div>
                    <div className="bg-dark-bg p-4 rounded-lg text-center">
                        <p className="text-sm text-gray-400">Assignments</p>
                        <p className="text-2xl font-bold text-purple-400">{allAssessments.length}</p>
                        <p className="text-xs text-gray-500">graded</p>
                    </div>
                </div>

                {/* Middle Row: Best/Worst/At Risk */}
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                    {/* Best Course */}
                    <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/30">
                        <p className="text-sm text-green-400 flex items-center gap-1">⭐ Highest Grade</p>
                        {bestCourse ? (
                            <>
                                <p className="text-white font-semibold mt-1">{bestCourse.courseName}</p>
                                <p className={`text-lg font-bold ${getGradeColor(bestCourse.grade)}`}>
                                    {bestCourse.grade.toFixed(1)}% ({bestCourse.letterGrade})
                                </p>
                            </>
                        ) : (
                            <p className="text-gray-400 mt-1">No grades yet</p>
                        )}
                    </div>

                    {/* Needs Attention */}
                    <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/30">
                        <p className="text-sm text-red-400 flex items-center gap-1">⚠️ Needs Attention</p>
                        {worstCourse && gradedCourses.length > 1 ? (
                            <>
                                <p className="text-white font-semibold mt-1">{worstCourse.courseName}</p>
                                <p className={`text-lg font-bold ${getGradeColor(worstCourse.grade)}`}>
                                    {worstCourse.grade.toFixed(1)}% ({worstCourse.letterGrade})
                                </p>
                            </>
                        ) : (
                            <p className="text-gray-400 mt-1">All courses on track!</p>
                        )}
                    </div>

                    {/* At Risk Alert */}
                    <div className="bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/30">
                        <p className="text-sm text-yellow-400 flex items-center gap-1">🔔 At Risk</p>
                        {atRiskCourses.length > 0 ? (
                            <>
                                <p className="text-white font-semibold mt-1">{atRiskCourses.length} course(s)</p>
                                <p className="text-gray-400 text-sm">Below 60%</p>
                            </>
                        ) : (
                            <p className="text-green-400 mt-1">No courses at risk!</p>
                        )}
                    </div>
                </div>

                {/* Grade Distribution Bar Chart */}
                <div>
                    <p className="text-sm text-gray-400 mb-3">Grade Distribution</p>
                    <div className="flex items-end justify-around h-32 gap-2">
                        {Object.entries(gradeDistribution).map(([letter, count]) => {
                            const maxCount = Math.max(...Object.values(gradeDistribution), 1);
                            const height = (count / maxCount) * 100;
                            const colors: Record<string, string> = {
                                A: 'from-green-600 to-green-400',
                                B: 'from-blue-600 to-blue-400',
                                C: 'from-yellow-600 to-yellow-400',
                                D: 'from-orange-600 to-orange-400',
                                F: 'from-red-600 to-red-400'
                            };
                            return (
                                <div key={letter} className="flex flex-col items-center">
                                    <span className="text-xs text-gray-400 mb-1">{count}</span>
                                    <div
                                        className={`w-10 rounded-t-lg bg-gradient-to-t ${colors[letter]}`}
                                        style={{ height: `${Math.max(height, 4)}px` }}
                                    />
                                    <span className="text-sm text-white font-semibold mt-2">{letter}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Strengths & Weaknesses (Habits) */}
            <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-dark-card p-6 rounded-xl border border-gray-800">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        💪 Habit Strengths <span className="text-xs text-gray-500 font-normal">(Last 7 Days)</span>
                    </h3>
                    <div className="space-y-4">
                        {strengths.map((habit, i) => (
                            <div key={i} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="text-white">{habit.title}</span>
                                    <span className="text-green-500 font-bold">{Math.round(habit.completionRate)}%</span>
                                </div>
                                <div className="h-2 bg-dark-bg rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-green-500 rounded-full"
                                        style={{ width: `${habit.completionRate}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                        {strengths.length === 0 && <p className="text-gray-500 text-sm">No data yet.</p>}
                    </div>
                </div>

                <div className="bg-dark-card p-6 rounded-xl border border-gray-800">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        ⚠️ Needs Improvement <span className="text-xs text-gray-500 font-normal">(Last 7 Days)</span>
                    </h3>
                    <div className="space-y-4">
                        {weaknesses.map((habit, i) => (
                            <div key={i} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="text-white">{habit.title}</span>
                                    <span className="text-red-500 font-bold">{Math.round(habit.completionRate)}%</span>
                                </div>
                                <div className="h-2 bg-dark-bg rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-red-500 rounded-full"
                                        style={{ width: `${Math.max(habit.completionRate, 5)}%` }} // Minimum width for visibility
                                    ></div>
                                </div>
                            </div>
                        ))}
                        {weaknesses.length === 0 && <p className="text-gray-500 text-sm">No data yet.</p>}
                    </div>
                </div>
            </div>

            {/* Social Leaderboard (Study Time) */}
            <div className="bg-dark-card p-6 rounded-xl border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-6">🏆 Study Leaderboard (This Week)</h3>
                <div className="space-y-4">
                    {[
                        { name: 'You', time: totalStudyTime, isUser: true },
                        ...friendCourses.map(f => ({ name: f.friendName, time: f.totalStudyTime, isUser: false }))
                    ]
                        .sort((a, b) => b.time - a.time)
                        .map((item, index) => {
                            const maxTime = Math.max(totalStudyTime, ...friendCourses.map(f => f.totalStudyTime), 1);
                            const percent = (item.time / maxTime) * 100;

                            return (
                                <div key={index} className="space-y-1">
                                    <div className="flex justify-between text-sm items-center">
                                        <div className="flex items-center gap-2">
                                            <span className={`font-bold w-6 ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-orange-700' : 'text-gray-600'}`}>
                                                #{index + 1}
                                            </span>
                                            <span className={item.isUser ? 'text-primary-400 font-bold' : 'text-white'}>
                                                {item.name} {item.isUser && '(You)'}
                                            </span>
                                        </div>
                                        <span className="text-gray-400 text-xs">
                                            {Math.floor(item.time / 60)}h {item.time % 60}m
                                        </span>
                                    </div>
                                    <div className="h-4 bg-dark-bg rounded-full overflow-hidden flex items-center">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${item.isUser ? 'bg-primary-500' : 'bg-gray-600'}`}
                                            style={{ width: `${percent}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>

            {/* Course Analytics Section */}
            <div className="bg-dark-card p-6 rounded-xl border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-4">📚 Course Analytics <span className="text-xs text-gray-500 font-normal">(This Week)</span></h3>

                {/* Course Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-dark-bg p-4 rounded-lg text-center">
                        <p className="text-2xl font-bold text-blue-500">{totalCourses}</p>
                        <p className="text-xs text-gray-400">Total Courses</p>
                    </div>
                    <div className="bg-dark-bg p-4 rounded-lg text-center">
                        <p className="text-2xl font-bold text-green-500">{weeklyStudySessionsCount}</p>
                        <p className="text-xs text-gray-400">Sessions (7d)</p>
                    </div>
                    <div className="bg-dark-bg p-4 rounded-lg text-center">
                        <p className="text-2xl font-bold text-orange-500">{totalStudySessionsCount}</p>
                        <p className="text-xs text-gray-400">All-Time Sessions</p>
                    </div>
                    <div className="bg-dark-bg p-4 rounded-lg text-center">
                        <p className="text-2xl font-bold text-purple-500">{Math.floor(totalStudyTime / 60)}h {totalStudyTime % 60}m</p>
                        <p className="text-xs text-gray-400">Weekly Time</p>
                    </div>
                </div>

                {/* Time Distribution by Course (Pie Chart Style) */}
                {courses.length > 0 && totalStudyTime > 0 && (
                    <div className="mb-6">
                        <div className="grid md:grid-cols-2 gap-4">
                            {/* Pie Chart */}
                            <div className="bg-dark-bg p-4 rounded-lg">
                                <h4 className="text-md font-semibold text-white mb-3">🥧 Time Distribution</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="relative h-40 flex items-center justify-center">
                                        <div className="relative w-36 h-36">
                                            {courses
                                                .filter(c => (c.totalStudyTime || 0) > 0)
                                                .sort((a, b) => (b.totalStudyTime || 0) - (a.totalStudyTime || 0))
                                                .reduce((acc, course, i) => {
                                                    const percentage = ((course.totalStudyTime || 0) / totalStudyTime) * 100;
                                                    const cumulativePercentage = acc.cumulative;
                                                    acc.cumulative += percentage;
                                                    acc.elements.push(
                                                        <div
                                                            key={course.id}
                                                            className="absolute inset-0 rounded-full"
                                                            style={{
                                                                background: `conic-gradient(transparent ${cumulativePercentage}%, ${course.color || COURSE_COLORS[i % COURSE_COLORS.length]} ${cumulativePercentage}%, ${course.color || COURSE_COLORS[i % COURSE_COLORS.length]} ${acc.cumulative}%, transparent ${acc.cumulative}%)`,
                                                            }}
                                                        />
                                                    );
                                                    return acc;
                                                }, { cumulative: 0, elements: [] as JSX.Element[] }).elements}
                                            <div className="absolute inset-4 bg-dark-card rounded-full flex items-center justify-center">
                                                <span className="text-2xl">📚</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1 overflow-y-auto max-h-40 text-xs">
                                        {courses
                                            .filter(c => (c.totalStudyTime || 0) > 0)
                                            .sort((a, b) => (b.totalStudyTime || 0) - (a.totalStudyTime || 0))
                                            .map((course, i) => {
                                                const percentage = ((course.totalStudyTime || 0) / totalStudyTime) * 100;
                                                return (
                                                    <div key={course.id} className="flex items-center gap-2">
                                                        <div
                                                            className="w-2 h-2 rounded flex-shrink-0"
                                                            style={{ backgroundColor: course.color || COURSE_COLORS[i % COURSE_COLORS.length] }}
                                                        />
                                                        <span className="text-white truncate flex-1">{course.title}</span>
                                                        <span className="text-gray-400">{percentage.toFixed(0)}%</span>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            </div>

                            {/* Study Heatmap (GitHub Style) */}
                            <div className="bg-dark-bg p-4 rounded-lg">
                                <h4 className="text-md font-semibold text-white mb-3">🔥 30-Day Heatmap</h4>
                                <div className="flex flex-wrap gap-1 justify-center">
                                    {Array.from({ length: 30 }).map((_, i) => {
                                        const date = new Date();
                                        date.setDate(date.getDate() - (29 - i));
                                        const dateStr = date.toISOString().split('T')[0];

                                        // Calculate total minutes for this date
                                        const dayMinutes = studySessions
                                            .filter(s => s.date === dateStr)
                                            .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

                                        // Intensity color
                                        let bgColor = 'bg-gray-800'; // 0
                                        if (dayMinutes > 0) bgColor = 'bg-green-900'; // > 0
                                        if (dayMinutes >= 30) bgColor = 'bg-green-700'; // >= 30m
                                        if (dayMinutes >= 60) bgColor = 'bg-green-600'; // >= 1h
                                        if (dayMinutes >= 120) bgColor = 'bg-green-500'; // >= 2h
                                        if (dayMinutes >= 240) bgColor = 'bg-green-400'; // >= 4h

                                        return (
                                            <div
                                                key={i}
                                                className={`w-3 h-3 rounded-sm ${bgColor} relative group`}
                                            >
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-black text-xs text-white p-1 rounded whitespace-nowrap z-10">
                                                    {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: {Math.floor(dayMinutes / 60)}h {dayMinutes % 60}m
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex justify-between text-xs text-gray-500 mt-2">
                                    <span>30 Days Ago</span>
                                    <span>Today</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {courses.length > 0 ? (
                    <div className="space-y-4">
                        {/* Course Study Progress Grid */}
                        <div className="grid md:grid-cols-2 gap-4">
                            {/* Course Strengths */}
                            <div className="bg-dark-bg p-4 rounded-xl border border-green-500/30">
                                <h4 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
                                    💪 Course Strengths <span className="text-xs text-gray-500 font-normal">(This Week)</span>
                                </h4>
                                <div className="space-y-3">
                                    {mostStudied.map((course, i) => {
                                        const progress = totalStudyTime > 0 ? ((course.weeklyStudyTime || 0) / totalStudyTime) * 100 : 0;
                                        return (
                                            <div key={course.id} className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                                                        <span className="text-white text-sm">{course.title}</span>
                                                    </div>
                                                    <span className="text-xs text-green-400 font-semibold">
                                                        {Math.floor((course.weeklyStudyTime || 0) / 60)}h {(course.weeklyStudyTime || 0) % 60}m
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-dark-card rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all"
                                                        style={{ width: `${progress}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Courses Needing Improvement */}
                            <div className="bg-dark-bg p-4 rounded-xl border border-red-500/30">
                                <h4 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
                                    🎯 Needs More Study <span className="text-xs text-gray-500 font-normal">(This Week)</span>
                                </h4>
                                <div className="space-y-3">
                                    {leastStudied.map((course, i) => {
                                        const progress = totalStudyTime > 0 ? ((course.weeklyStudyTime || 0) / totalStudyTime) * 100 : 0;
                                        return (
                                            <div key={course.id} className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg">⚠️</span>
                                                        <span className="text-white text-sm">{course.title}</span>
                                                    </div>
                                                    <span className="text-xs text-red-400 font-semibold">
                                                        {Math.floor((course.weeklyStudyTime || 0) / 60)}h {(course.weeklyStudyTime || 0) % 60}m
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-dark-card rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all"
                                                        style={{ width: `${Math.max(progress, 5)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <p className="text-center text-gray-500 py-4">Add courses in the Courses tab to see analytics here!</p>
                )}

                {/* Purpose Breakdown */}
                {Object.keys(purposeBreakdown).length > 0 && (
                    <div className="mt-4 bg-dark-bg p-4 rounded-lg">
                        <h4 className="text-sm font-semibold text-gray-300 mb-3">📊 Study Purpose Breakdown</h4>
                        <div className="space-y-2">
                            {Object.entries(purposeBreakdown).sort((a, b) => b[1] - a[1]).map(([purpose, time]) => (
                                <div key={purpose} className="flex items-center gap-2">
                                    <span className="text-sm text-gray-400 w-32">{purposeLabels[purpose] || purpose}</span>
                                    <div className="flex-1 h-4 bg-dark-card rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                                            style={{ width: `${Math.min((time / totalStudyTime) * 100, 100)}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-xs text-gray-400 w-16 text-right">{Math.floor(time / 60)}h {time % 60}m</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Friends' Study Progress */}
            {friendCourses.length > 0 && (
                <div className="bg-dark-card p-6 rounded-xl border border-gray-800">
                    <h3 className="text-lg font-semibold text-white mb-4">👥 Friends' Study Progress</h3>
                    <div className="space-y-4">
                        {friendCourses.sort((a, b) => b.totalStudyTime - a.totalStudyTime).map((friend, i) => (
                            <div key={i} className="bg-dark-bg p-4 rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '👤'}</span>
                                        <span className="text-white font-semibold">{friend.friendName}</span>
                                    </div>
                                    <span className="text-primary-500 font-bold">{Math.floor(friend.totalStudyTime / 60)}h {friend.totalStudyTime % 60}m total</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {friend.courses.slice(0, 4).map(course => (
                                        <div key={course.id} className="bg-dark-card p-2 rounded text-center">
                                            <p className="text-xs text-gray-400 truncate">{course.title}</p>
                                            <p className="text-sm text-white font-semibold">{Math.floor((course.totalStudyTime || 0) / 60)}h</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Strengths & Weaknesses */}
            <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-dark-card p-6 rounded-xl border border-primary-500/30">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">💪 Strengths</h3>
                    {strengths.length > 0 ? (
                        <div className="space-y-3">
                            {strengths.map((habit, index) => (
                                <div key={index} className="flex items-center justify-between">
                                    <span className="text-gray-300">{habit.title}</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 h-2 bg-dark-bg rounded-full overflow-hidden">
                                            <div className="h-full bg-primary-500 rounded-full" style={{ width: `${habit.completionRate}%` }}></div>
                                        </div>
                                        <span className="text-sm text-primary-500">{habit.streak}🔥</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">Complete some habits to see your strengths!</p>
                    )}
                </div>

                <div className="bg-dark-card p-6 rounded-xl border border-red-500/30">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">🎯 Needs Improvement</h3>
                    {weaknesses.length > 0 ? (
                        <div className="space-y-3">
                            {weaknesses.map((habit, index) => (
                                <div key={index} className="flex items-center justify-between">
                                    <span className="text-gray-300">{habit.title}</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 h-2 bg-dark-bg rounded-full overflow-hidden">
                                            <div className="h-full bg-red-500 rounded-full" style={{ width: `${habit.completionRate}%` }}></div>
                                        </div>
                                        <span className="text-sm text-gray-500">{habit.streak}🔥</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">Add habits to track your progress!</p>
                    )}
                </div>
            </div>

            {/* Mental Wellness Analytics */}
            <MoodAnalytics />
        </div>
    );
}
