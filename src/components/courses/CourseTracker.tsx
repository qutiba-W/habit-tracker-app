'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import {
    collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot,
    serverTimestamp, query, orderBy, getDocs, increment, where
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Types
interface Course {
    id: string;
    title: string;
    color: string;
    purpose: 'academic' | 'personal' | 'work' | 'skill';
    totalTimeStudied: number; // in minutes
    credits: number; // Course credits (e.g., 3, 4)
    gradingScale: string; // Default "4.0"
    createdAt: any;
}

interface Subject {
    id: string;
    courseId: string;
    title: string;
    timeStudied: number; // in minutes
}

interface StudySession {
    id: string;
    userId: string;
    courseId: string;
    subjectId: string;
    startTime: any;
    endTime: any;
    durationMinutes: number;
    notes: string;
    date: string; // YYYY-MM-DD for heatmap
}

// Syllabus Types
interface SyllabusWeek {
    id: string;
    courseId: string;
    weekNumber: number;
    startDate: string; // YYYY-MM-DD
    summary: string;
    isCurrent: boolean;
}

interface DailyPlan {
    id: string;
    weekId: string;
    date: string; // YYYY-MM-DD
    topic: string;
    status: 'planned' | 'completed' | 'missed';
}

// Grading Types
interface Assessment {
    id: string;
    courseId: string;
    title: string;
    score: number;
    totalPoints: number;
    weight: number; // percentage (e.g., 20 for 20%)
    category: 'exam' | 'quiz' | 'homework' | 'project' | 'other';
    date: string; // YYYY-MM-DD
}

const COURSE_COLORS = [
    '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

export default function CourseTracker() {
    const { user } = useAuth();

    // State
    const [courses, setCourses] = useState<Course[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);

    // Syllabus & Grading State
    const [syllabusWeeks, setSyllabusWeeks] = useState<SyllabusWeek[]>([]);
    const [dailyPlans, setDailyPlans] = useState<DailyPlan[]>([]);
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [courseDetailTab, setCourseDetailTab] = useState<'overview' | 'syllabus' | 'grades'>('overview');

    // Modals
    const [showAddCourse, setShowAddCourse] = useState(false);
    const [showCourseDetail, setShowCourseDetail] = useState<Course | null>(null);
    const [showSessionLogger, setShowSessionLogger] = useState(false);

    // Forms
    const [newCourseTitle, setNewCourseTitle] = useState('');
    const [newCourseColor, setNewCourseColor] = useState(COURSE_COLORS[0]);
    const [newCoursePurpose, setNewCoursePurpose] = useState<'academic' | 'personal' | 'work' | 'skill'>('academic');
    const [newCourseCredits, setNewCourseCredits] = useState(3);
    const [newSubjectTitle, setNewSubjectTitle] = useState('');

    // Assessment Form
    const [newAssessmentTitle, setNewAssessmentTitle] = useState('');
    const [newAssessmentScore, setNewAssessmentScore] = useState(0);
    const [newAssessmentTotal, setNewAssessmentTotal] = useState(100);
    const [newAssessmentWeight, setNewAssessmentWeight] = useState(10);
    const [newAssessmentCategory, setNewAssessmentCategory] = useState<'exam' | 'quiz' | 'homework' | 'project' | 'other'>('homework');

    // Session Logger
    const [sessionMode, setSessionMode] = useState<'manual' | 'timer'>('manual');
    const [selectedCourse, setSelectedCourse] = useState<string>('');
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [manualHours, setManualHours] = useState(0);
    const [manualMinutes, setManualMinutes] = useState(30);
    const [sessionNotes, setSessionNotes] = useState('');

    // Timer
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const timerStartRef = useRef<Date | null>(null);

    // Load courses
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const coursesRef = collection(db, `users/${user.uid}/courses`);
        const q = query(coursesRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const courseData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Course[];
            setCourses(courseData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // Load subjects for all courses
    useEffect(() => {
        if (!user || courses.length === 0) return;

        const loadSubjects = async () => {
            const allSubjects: Subject[] = [];
            for (const course of courses) {
                const subjectsRef = collection(db, `users/${user.uid}/courses/${course.id}/subjects`);
                const snap = await getDocs(subjectsRef);
                snap.docs.forEach(doc => {
                    allSubjects.push({
                        id: doc.id,
                        courseId: course.id,
                        ...doc.data()
                    } as Subject);
                });
            }
            setSubjects(allSubjects);
        };
        loadSubjects();
    }, [user, courses]);

    // Timer logic
    useEffect(() => {
        if (isTimerRunning) {
            timerRef.current = setInterval(() => {
                setTimerSeconds(prev => prev + 1);
            }, 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isTimerRunning]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Add Course
    const handleAddCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newCourseTitle.trim()) return;

        try {
            const coursesRef = collection(db, `users/${user.uid}/courses`);
            await addDoc(coursesRef, {
                title: newCourseTitle.trim(),
                color: newCourseColor,
                purpose: newCoursePurpose,
                credits: newCourseCredits,
                gradingScale: '4.0',
                totalTimeStudied: 0,
                createdAt: serverTimestamp()
            });
            setNewCourseTitle('');
            setNewCoursePurpose('academic');
            setNewCourseCredits(3);
            setShowAddCourse(false);
        } catch (error) {
            console.error('Error adding course:', error);
        }
    };

    // Delete Course - CASCADE DELETE (removes all sessions, subjects, and updates XP)
    const handleDeleteCourse = async (courseId: string) => {
        if (!user || !confirm('Delete this course? This will also delete all subjects, study sessions, and their associated XP.')) return;

        try {
            // 1. Get all study sessions for this course
            const sessionsRef = collection(db, `users/${user.uid}/studySessions`);
            const sessionsQuery = query(sessionsRef, where('courseId', '==', courseId));
            const sessionsSnap = await getDocs(sessionsQuery);

            // 2. Calculate total minutes to subtract
            let totalMinutesToSubtract = 0;
            sessionsSnap.docs.forEach(doc => {
                const session = doc.data();
                totalMinutesToSubtract += session.durationMinutes || 0;
            });

            // 3. Delete all study sessions for this course
            for (const sessionDoc of sessionsSnap.docs) {
                await deleteDoc(sessionDoc.ref);
            }

            // 4. Get and delete all subjects for this course
            const subjectsRef = collection(db, `users/${user.uid}/courses/${courseId}/subjects`);
            const subjectsSnap = await getDocs(subjectsRef);
            for (const subjectDoc of subjectsSnap.docs) {
                await deleteDoc(subjectDoc.ref);
            }

            // 5. Delete the course itself
            await deleteDoc(doc(db, `users/${user.uid}/courses/${courseId}`));

            // 6. Subtract XP based on study time (10 XP per 30 minutes studied)
            if (totalMinutesToSubtract > 0) {
                const xpToSubtract = Math.floor(totalMinutesToSubtract / 30) * 10;
                const statsRef = doc(db, `users/${user.uid}/stats/summary`);
                await updateDoc(statsRef, {
                    totalXP: increment(-xpToSubtract)
                });
            }

            setShowCourseDetail(null);
            console.log(`Deleted course ${courseId} with ${totalMinutesToSubtract} minutes of sessions`);
        } catch (error) {
            console.error('Error deleting course:', error);
        }
    };

    // Delete Subject - CASCADE DELETE (removes related sessions)
    const handleDeleteSubject = async (courseId: string, subjectId: string) => {
        if (!user || !confirm('Delete this subject and its study sessions?')) return;

        try {
            // 1. Get all study sessions for this subject
            const sessionsRef = collection(db, `users/${user.uid}/studySessions`);
            const sessionsQuery = query(sessionsRef, where('subjectId', '==', subjectId));
            const sessionsSnap = await getDocs(sessionsQuery);

            // 2. Calculate total minutes and delete sessions
            let totalMinutesToSubtract = 0;
            for (const sessionDoc of sessionsSnap.docs) {
                const session = sessionDoc.data();
                totalMinutesToSubtract += session.durationMinutes || 0;
                await deleteDoc(sessionDoc.ref);
            }

            // 3. Update course total time
            if (totalMinutesToSubtract > 0) {
                const courseRef = doc(db, `users/${user.uid}/courses/${courseId}`);
                await updateDoc(courseRef, {
                    totalTimeStudied: increment(-totalMinutesToSubtract)
                });
            }

            // 4. Delete the subject
            await deleteDoc(doc(db, `users/${user.uid}/courses/${courseId}/subjects/${subjectId}`));

            // 5. Update local state
            setSubjects(prev => prev.filter(s => s.id !== subjectId));

            console.log(`Deleted subject ${subjectId} with ${totalMinutesToSubtract} minutes`);
        } catch (error) {
            console.error('Error deleting subject:', error);
        }
    };

    // Add Subject
    const handleAddSubject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !showCourseDetail || !newSubjectTitle.trim()) return;

        try {
            const subjectsRef = collection(db, `users/${user.uid}/courses/${showCourseDetail.id}/subjects`);
            await addDoc(subjectsRef, {
                title: newSubjectTitle.trim(),
                timeStudied: 0
            });
            setNewSubjectTitle('');
            // Refresh subjects
            const snap = await getDocs(subjectsRef);
            const updated = snap.docs.map(doc => ({
                id: doc.id,
                courseId: showCourseDetail.id,
                ...doc.data()
            } as Subject));
            setSubjects(prev => [...prev.filter(s => s.courseId !== showCourseDetail.id), ...updated]);
        } catch (error) {
            console.error('Error adding subject:', error);
        }
    };

    // ========== GRADING SYSTEM FUNCTIONS ==========

    // Load assessments when course detail opens
    useEffect(() => {
        if (!user || !showCourseDetail) {
            setAssessments([]);
            return;
        }

        const assessmentsRef = collection(db, `users/${user.uid}/courses/${showCourseDetail.id}/assessments`);
        const unsubscribe = onSnapshot(assessmentsRef, (snapshot) => {
            const assessmentData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Assessment[];
            setAssessments(assessmentData);
        });

        return () => unsubscribe();
    }, [user, showCourseDetail]);

    // Add Assessment
    const handleAddAssessment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !showCourseDetail || !newAssessmentTitle.trim()) return;

        try {
            const assessmentsRef = collection(db, `users/${user.uid}/courses/${showCourseDetail.id}/assessments`);
            await addDoc(assessmentsRef, {
                courseId: showCourseDetail.id,
                title: newAssessmentTitle.trim(),
                score: newAssessmentScore,
                totalPoints: newAssessmentTotal,
                weight: newAssessmentWeight,
                category: newAssessmentCategory,
                date: new Date().toISOString().split('T')[0]
            });
            // Reset form
            setNewAssessmentTitle('');
            setNewAssessmentScore(0);
            setNewAssessmentTotal(100);
            setNewAssessmentWeight(10);
            setNewAssessmentCategory('homework');
        } catch (error) {
            console.error('Error adding assessment:', error);
        }
    };

    // Delete Assessment
    const handleDeleteAssessment = async (assessmentId: string) => {
        if (!user || !showCourseDetail || !confirm('Delete this assessment?')) return;
        try {
            await deleteDoc(doc(db, `users/${user.uid}/courses/${showCourseDetail.id}/assessments/${assessmentId}`));
        } catch (error) {
            console.error('Error deleting assessment:', error);
        }
    };

    // Calculate course grade (weighted average)
    const calculateCourseGrade = (courseAssessments: Assessment[]): number => {
        if (courseAssessments.length === 0) return 0;

        let totalWeightedScore = 0;
        let totalWeight = 0;

        courseAssessments.forEach(a => {
            const percentage = (a.score / a.totalPoints) * 100;
            totalWeightedScore += percentage * (a.weight / 100);
            totalWeight += a.weight / 100;
        });

        return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
    };

    // Get letter grade from percentage
    const getLetterGrade = (percentage: number): string => {
        if (percentage >= 90) return 'A';
        if (percentage >= 80) return 'B';
        if (percentage >= 70) return 'C';
        if (percentage >= 60) return 'D';
        return 'F';
    };

    // Get grade color
    const getGradeColor = (percentage: number): string => {
        if (percentage >= 90) return 'text-green-400';
        if (percentage >= 80) return 'text-blue-400';
        if (percentage >= 70) return 'text-yellow-400';
        return 'text-red-400';
    };

    // ========== SYLLABUS FUNCTIONS ==========

    // Load syllabus weeks when course detail opens
    useEffect(() => {
        if (!user || !showCourseDetail) {
            setSyllabusWeeks([]);
            setDailyPlans([]);
            return;
        }

        const weeksRef = collection(db, `users/${user.uid}/courses/${showCourseDetail.id}/syllabusWeeks`);
        const q = query(weeksRef, orderBy('weekNumber', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const weeksData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as SyllabusWeek[];
            setSyllabusWeeks(weeksData);
        });

        return () => unsubscribe();
    }, [user, showCourseDetail]);

    // Add Syllabus Week
    const handleAddSyllabusWeek = async () => {
        if (!user || !showCourseDetail) return;

        const nextWeekNum = syllabusWeeks.length + 1;
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + (nextWeekNum - 1) * 7);

        try {
            const weeksRef = collection(db, `users/${user.uid}/courses/${showCourseDetail.id}/syllabusWeeks`);
            const weekDoc = await addDoc(weeksRef, {
                courseId: showCourseDetail.id,
                weekNumber: nextWeekNum,
                startDate: startOfWeek.toISOString().split('T')[0],
                summary: '',
                isCurrent: nextWeekNum === 1
            });

            // Create 7 daily plans for this week
            const plansRef = collection(db, `users/${user.uid}/courses/${showCourseDetail.id}/syllabusWeeks/${weekDoc.id}/dailyPlans`);
            for (let i = 0; i < 7; i++) {
                const planDate = new Date(startOfWeek);
                planDate.setDate(startOfWeek.getDate() + i);
                await addDoc(plansRef, {
                    weekId: weekDoc.id,
                    date: planDate.toISOString().split('T')[0],
                    topic: '',
                    status: 'planned'
                });
            }
        } catch (error) {
            console.error('Error adding syllabus week:', error);
        }
    };

    // Update daily plan topic
    const handleUpdateDailyPlan = async (weekId: string, planId: string, topic: string) => {
        if (!user || !showCourseDetail) return;
        try {
            const planRef = doc(db, `users/${user.uid}/courses/${showCourseDetail.id}/syllabusWeeks/${weekId}/dailyPlans/${planId}`);
            await updateDoc(planRef, { topic });
        } catch (error) {
            console.error('Error updating daily plan:', error);
        }
    };

    // Toggle daily plan status
    const handleToggleDailyPlan = async (weekId: string, planId: string, currentStatus: string) => {
        if (!user || !showCourseDetail) return;
        const newStatus = currentStatus === 'completed' ? 'planned' : 'completed';
        try {
            const planRef = doc(db, `users/${user.uid}/courses/${showCourseDetail.id}/syllabusWeeks/${weekId}/dailyPlans/${planId}`);
            await updateDoc(planRef, { status: newStatus });
        } catch (error) {
            console.error('Error toggling daily plan:', error);
        }
    };

    // Update week summary
    const handleUpdateWeekSummary = async (weekId: string, summary: string) => {
        if (!user || !showCourseDetail) return;
        try {
            const weekRef = doc(db, `users/${user.uid}/courses/${showCourseDetail.id}/syllabusWeeks/${weekId}`);
            await updateDoc(weekRef, { summary });
        } catch (error) {
            console.error('Error updating week summary:', error);
        }
    };


    // Start Timer
    const startTimer = () => {
        timerStartRef.current = new Date();
        setTimerSeconds(0);
        setIsTimerRunning(true);
    };

    // Stop Timer and Save
    const stopTimer = () => {
        setIsTimerRunning(false);
        // Timer seconds already updated
    };

    // Log Study Session
    const handleLogSession = async () => {
        if (!user || !selectedCourse || !selectedSubject) {
            alert('Please select a course and subject');
            return;
        }

        const durationMinutes = sessionMode === 'manual'
            ? (manualHours * 60) + manualMinutes
            : Math.floor(timerSeconds / 60);

        if (durationMinutes < 1) {
            alert('Session must be at least 1 minute');
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        const dayOfWeek = new Date().getDay();

        try {
            // 1. Add study session
            const sessionsRef = collection(db, `users/${user.uid}/studySessions`);
            await addDoc(sessionsRef, {
                courseId: selectedCourse,
                subjectId: selectedSubject,
                startTime: timerStartRef.current || new Date(),
                endTime: new Date(),
                durationMinutes,
                notes: sessionNotes,
                date: today
            });

            // 2. Update subject time
            const subjectRef = doc(db, `users/${user.uid}/courses/${selectedCourse}/subjects/${selectedSubject}`);
            await updateDoc(subjectRef, {
                timeStudied: increment(durationMinutes)
            });

            // 3. Update course total time
            const courseRef = doc(db, `users/${user.uid}/courses/${selectedCourse}`);
            await updateDoc(courseRef, {
                totalTimeStudied: increment(durationMinutes)
            });

            // 4. Award XP (10 XP per hour = durationMinutes / 6)
            const xpEarned = Math.max(1, Math.floor(durationMinutes / 6));
            const statsRef = doc(db, `users/${user.uid}/stats/summary`);
            await updateDoc(statsRef, {
                totalXP: increment(xpEarned),
                [`weeklyXP.${dayOfWeek}`]: increment(xpEarned)
            });

            // Reset form
            setShowSessionLogger(false);
            setSelectedCourse('');
            setSelectedSubject('');
            setManualHours(0);
            setManualMinutes(30);
            setSessionNotes('');
            setTimerSeconds(0);
            timerStartRef.current = null;

            alert(`Session logged! +${xpEarned} XP earned! 🎉`);
        } catch (error) {
            console.error('Error logging session:', error);
            alert('Failed to log session. Please try again.');
        }
    };

    // Get subjects for selected course
    const courseSubjects = subjects.filter(s => s.courseId === selectedCourse);
    const detailSubjects = showCourseDetail ? subjects.filter(s => s.courseId === showCourseDetail.id) : [];

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">📚 Study Manager</h2>
                    <p className="text-gray-400 mt-1">Track your courses, subjects, and study sessions</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowSessionLogger(true)}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition flex items-center gap-2"
                    >
                        ⏱️ Log Session
                    </button>
                    <button
                        onClick={() => setShowAddCourse(true)}
                        className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-lg transition flex items-center gap-2"
                    >
                        + Add Course
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-dark-card p-4 rounded-xl border border-gray-800">
                    <p className="text-sm text-gray-400">Total Courses</p>
                    <p className="text-2xl font-bold text-blue-500">{courses.length}</p>
                </div>
                <div className="bg-dark-card p-4 rounded-xl border border-gray-800">
                    <p className="text-sm text-gray-400">Total Subjects</p>
                    <p className="text-2xl font-bold text-purple-500">{subjects.length}</p>
                </div>
                <div className="bg-dark-card p-4 rounded-xl border border-gray-800">
                    <p className="text-sm text-gray-400">Total Study Time</p>
                    <p className="text-2xl font-bold text-green-500">
                        {Math.floor(courses.reduce((sum, c) => sum + (c.totalTimeStudied || 0), 0) / 60)}h
                    </p>
                </div>
                <div className="bg-dark-card p-4 rounded-xl border border-gray-800">
                    <p className="text-sm text-gray-400">This Week</p>
                    <p className="text-2xl font-bold text-orange-500">
                        {/* Would need to calculate from studySessions */}
                        📊
                    </p>
                </div>
            </div>

            {/* Course Grid */}
            {courses.length === 0 ? (
                <div className="bg-dark-card p-12 rounded-xl border border-gray-800 text-center">
                    <span className="text-4xl mb-4 block">📚</span>
                    <h3 className="text-xl font-semibold text-gray-400 mb-2">No courses yet</h3>
                    <p className="text-gray-500 mb-4">Add your first course to start tracking!</p>
                    <button
                        onClick={() => setShowAddCourse(true)}
                        className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-lg transition"
                    >
                        + Add Your First Course
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {courses.map((course) => (
                        <div
                            key={course.id}
                            onClick={() => setShowCourseDetail(course)}
                            className="bg-dark-card p-6 rounded-xl border border-gray-800 hover:border-gray-600 cursor-pointer transition group"
                            style={{ borderLeftColor: course.color, borderLeftWidth: '4px' }}
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-white group-hover:text-primary-400 transition">
                                        {course.title}
                                    </h3>
                                    <p className="text-sm text-gray-400 mt-1">
                                        {subjects.filter(s => s.courseId === course.id).length} subjects
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold" style={{ color: course.color }}>
                                        {Math.floor((course.totalTimeStudied || 0) / 60)}h
                                    </p>
                                    <p className="text-xs text-gray-500">{(course.totalTimeStudied || 0) % 60}m</p>
                                </div>
                            </div>
                            <div className="mt-4 h-2 bg-dark-bg rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                        width: `${Math.min(((course.totalTimeStudied || 0) / 600) * 100, 100)}%`,
                                        backgroundColor: course.color
                                    }}
                                ></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Goal: 10 hours</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Course Modal */}
            {showAddCourse && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-dark-card p-6 rounded-2xl border border-gray-800 w-full max-w-md">
                        <h3 className="text-xl font-bold text-white mb-4">Add New Course</h3>
                        <form onSubmit={handleAddCourse} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Course Title</label>
                                <input
                                    type="text"
                                    value={newCourseTitle}
                                    onChange={(e) => setNewCourseTitle(e.target.value)}
                                    placeholder="e.g., Thermodynamics, Calculus"
                                    className="w-full px-4 py-2 bg-dark-bg border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Color</label>
                                <div className="flex gap-2 flex-wrap">
                                    {COURSE_COLORS.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setNewCourseColor(color)}
                                            className={`w-8 h-8 rounded-full transition ${newCourseColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-dark-card' : ''}`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Purpose</label>
                                <select
                                    value={newCoursePurpose}
                                    onChange={(e) => setNewCoursePurpose(e.target.value as any)}
                                    className="w-full px-4 py-2 bg-dark-bg border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                >
                                    <option value="academic">📚 Academic</option>
                                    <option value="personal">🌱 Personal Growth</option>
                                    <option value="work">💼 Work</option>
                                    <option value="skill">🎯 Skill Development</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Credits</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="6"
                                    value={newCourseCredits}
                                    onChange={(e) => setNewCourseCredits(parseInt(e.target.value) || 3)}
                                    className="w-full px-4 py-2 bg-dark-bg border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddCourse(false)}
                                    className="flex-1 px-4 py-2 bg-dark-bg border border-gray-700 text-gray-400 rounded-lg hover:text-white transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-lg transition"
                                >
                                    Add Course
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Course Detail Modal - TABBED VERSION */}
            {showCourseDetail && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-dark-card p-6 rounded-2xl border border-gray-800 w-full max-w-2xl max-h-[90vh] overflow-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: showCourseDetail.color }}></span>
                                {showCourseDetail.title}
                                <span className="text-sm font-normal text-gray-400">({showCourseDetail.credits || 3} credits)</span>
                            </h3>
                            <button onClick={() => { setShowCourseDetail(null); setCourseDetailTab('overview'); }} className="text-gray-400 hover:text-white text-xl">✕</button>
                        </div>

                        {/* Stats Bar */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-dark-bg p-3 rounded-lg">
                                <span className="text-gray-400 text-sm">Study Time</span>
                                <p className="text-lg font-bold" style={{ color: showCourseDetail.color }}>
                                    {Math.floor((showCourseDetail.totalTimeStudied || 0) / 60)}h {(showCourseDetail.totalTimeStudied || 0) % 60}m
                                </p>
                            </div>
                            <div className="bg-dark-bg p-3 rounded-lg">
                                <span className="text-gray-400 text-sm">Current Grade</span>
                                <p className={`text-lg font-bold ${getGradeColor(calculateCourseGrade(assessments))}`}>
                                    {assessments.length > 0 ? `${calculateCourseGrade(assessments).toFixed(1)}% (${getLetterGrade(calculateCourseGrade(assessments))})` : 'No grades'}
                                </p>
                            </div>
                        </div>

                        {/* Tab Navigation */}
                        <div className="flex gap-1 mb-4 bg-dark-bg p-1 rounded-lg">
                            <button
                                onClick={() => setCourseDetailTab('overview')}
                                className={`flex-1 py-2 px-4 rounded-md font-semibold transition ${courseDetailTab === 'overview' ? 'bg-primary-500 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                📋 Overview
                            </button>
                            <button
                                onClick={() => setCourseDetailTab('syllabus')}
                                className={`flex-1 py-2 px-4 rounded-md font-semibold transition ${courseDetailTab === 'syllabus' ? 'bg-primary-500 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                📅 Syllabus
                            </button>
                            <button
                                onClick={() => setCourseDetailTab('grades')}
                                className={`flex-1 py-2 px-4 rounded-md font-semibold transition ${courseDetailTab === 'grades' ? 'bg-primary-500 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                📊 Grades
                            </button>
                        </div>

                        {/* ===== OVERVIEW TAB ===== */}
                        {courseDetailTab === 'overview' && (
                            <div>
                                <h4 className="text-md font-semibold text-white mb-3">Subjects</h4>
                                <form onSubmit={handleAddSubject} className="flex gap-2 mb-4">
                                    <input
                                        type="text"
                                        value={newSubjectTitle}
                                        onChange={(e) => setNewSubjectTitle(e.target.value)}
                                        placeholder="Add new subject..."
                                        className="flex-1 px-3 py-2 bg-dark-bg border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500"
                                    />
                                    <button type="submit" className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-lg transition text-sm">
                                        + Add
                                    </button>
                                </form>
                                <div className="space-y-2 mb-4">
                                    {detailSubjects.length === 0 ? (
                                        <p className="text-gray-500 text-center py-4">No subjects yet. Add one above!</p>
                                    ) : (
                                        detailSubjects.map(subject => (
                                            <div key={subject.id} className="flex items-center justify-between p-3 bg-dark-bg rounded-lg">
                                                <span className="text-white">{subject.title}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm text-gray-400">
                                                        {Math.floor((subject.timeStudied || 0) / 60)}h {(subject.timeStudied || 0) % 60}m
                                                    </span>
                                                    <button onClick={() => handleDeleteSubject(showCourseDetail.id, subject.id)} className="text-gray-500 hover:text-red-500 transition">
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ===== SYLLABUS TAB ===== */}
                        {courseDetailTab === 'syllabus' && (
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-md font-semibold text-white">Weekly Study Plan</h4>
                                    <button onClick={handleAddSyllabusWeek} className="px-3 py-1 bg-primary-500 hover:bg-primary-600 text-white text-sm rounded-lg transition">
                                        + Add Week
                                    </button>
                                </div>
                                {syllabusWeeks.length === 0 ? (
                                    <p className="text-gray-500 text-center py-8">No weeks planned yet. Click "Add Week" to start!</p>
                                ) : (
                                    <div className="space-y-4">
                                        {syllabusWeeks.map(week => {
                                            const weekStart = new Date(week.startDate);
                                            const weekEnd = new Date(weekStart);
                                            weekEnd.setDate(weekStart.getDate() + 6);
                                            return (
                                                <div key={week.id} className="bg-dark-bg rounded-lg p-4 border border-gray-700">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <h5 className="font-semibold text-white">
                                                            Week {week.weekNumber} ({weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                                                        </h5>
                                                        {week.isCurrent && <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">Current</span>}
                                                    </div>
                                                    <p className="text-gray-400 text-sm mb-2">Click "+ Add Week" to add daily plans (coming soon)</p>
                                                    <textarea
                                                        placeholder="Week summary... (optional)"
                                                        value={week.summary}
                                                        onBlur={(e) => handleUpdateWeekSummary(week.id, e.target.value)}
                                                        onChange={(e) => {
                                                            setSyllabusWeeks(prev => prev.map(w => w.id === week.id ? { ...w, summary: e.target.value } : w));
                                                        }}
                                                        className="w-full px-3 py-2 bg-dark-card border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500 resize-none"
                                                        rows={2}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ===== GRADES TAB ===== */}
                        {courseDetailTab === 'grades' && (
                            <div>
                                <h4 className="text-md font-semibold text-white mb-3">Add Assessment</h4>
                                <form onSubmit={handleAddAssessment} className="space-y-3 mb-4 p-4 bg-dark-bg rounded-lg">
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            type="text"
                                            value={newAssessmentTitle}
                                            onChange={(e) => setNewAssessmentTitle(e.target.value)}
                                            placeholder="Title (e.g., Midterm)"
                                            className="px-3 py-2 bg-dark-card border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500"
                                            required
                                        />
                                        <select
                                            value={newAssessmentCategory}
                                            onChange={(e) => setNewAssessmentCategory(e.target.value as any)}
                                            className="px-3 py-2 bg-dark-card border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500"
                                        >
                                            <option value="homework">📝 Homework</option>
                                            <option value="quiz">📋 Quiz</option>
                                            <option value="exam">📚 Exam</option>
                                            <option value="project">🔧 Project</option>
                                            <option value="other">📌 Other</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">Score</label>
                                            <input
                                                type="number"
                                                value={newAssessmentScore}
                                                onChange={(e) => setNewAssessmentScore(parseFloat(e.target.value) || 0)}
                                                className="w-full px-3 py-2 bg-dark-card border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">Out of</label>
                                            <input
                                                type="number"
                                                value={newAssessmentTotal}
                                                onChange={(e) => setNewAssessmentTotal(parseFloat(e.target.value) || 100)}
                                                className="w-full px-3 py-2 bg-dark-card border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">Weight %</label>
                                            <input
                                                type="number"
                                                value={newAssessmentWeight}
                                                onChange={(e) => setNewAssessmentWeight(parseFloat(e.target.value) || 10)}
                                                className="w-full px-3 py-2 bg-dark-card border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500"
                                            />
                                        </div>
                                    </div>
                                    <button type="submit" className="w-full py-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-lg transition">
                                        Add Assessment
                                    </button>
                                </form>

                                <h4 className="text-md font-semibold text-white mb-3">Assessments</h4>
                                {assessments.length === 0 ? (
                                    <p className="text-gray-500 text-center py-4">No assessments yet. Add one above!</p>
                                ) : (
                                    <div className="space-y-2">
                                        {assessments.map(assessment => {
                                            const percentage = (assessment.score / assessment.totalPoints) * 100;
                                            return (
                                                <div key={assessment.id} className="flex items-center justify-between p-3 bg-dark-bg rounded-lg">
                                                    <div>
                                                        <span className="text-white font-medium">{assessment.title}</span>
                                                        <span className="text-gray-400 text-sm ml-2">({assessment.category})</span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className={`font-bold ${getGradeColor(percentage)}`}>
                                                            {assessment.score}/{assessment.totalPoints} ({percentage.toFixed(0)}%)
                                                        </span>
                                                        <span className="text-gray-400 text-sm">{assessment.weight}%</span>
                                                        <button onClick={() => handleDeleteAssessment(assessment.id)} className="text-gray-500 hover:text-red-500 transition">
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Footer Buttons */}
                        <div className="flex gap-2 pt-4 border-t border-gray-800 mt-4">
                            <button
                                onClick={() => handleDeleteCourse(showCourseDetail.id)}
                                className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition"
                            >
                                Delete Course
                            </button>
                            <button
                                onClick={() => { setShowCourseDetail(null); setCourseDetailTab('overview'); }}
                                className="flex-1 px-4 py-2 bg-dark-bg border border-gray-700 text-white rounded-lg hover:bg-gray-700 transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Session Logger Modal */}
            {showSessionLogger && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-dark-card p-6 rounded-2xl border border-gray-800 w-full max-w-md">
                        <h3 className="text-xl font-bold text-white mb-4">⏱️ Log Study Session</h3>

                        {/* Mode Toggle */}
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => setSessionMode('manual')}
                                className={`flex-1 py-2 rounded-lg font-semibold transition ${sessionMode === 'manual' ? 'bg-primary-500 text-white' : 'bg-dark-bg text-gray-400'
                                    }`}
                            >
                                ✏️ Manual
                            </button>
                            <button
                                onClick={() => setSessionMode('timer')}
                                className={`flex-1 py-2 rounded-lg font-semibold transition ${sessionMode === 'timer' ? 'bg-primary-500 text-white' : 'bg-dark-bg text-gray-400'
                                    }`}
                            >
                                ⏱️ Timer
                            </button>
                        </div>

                        {/* Course & Subject Selection */}
                        <div className="space-y-3 mb-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Course</label>
                                <select
                                    value={selectedCourse}
                                    onChange={(e) => { setSelectedCourse(e.target.value); setSelectedSubject(''); }}
                                    className="w-full px-4 py-2 bg-dark-bg border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                >
                                    <option value="">Select a course...</option>
                                    {courses.map(c => (
                                        <option key={c.id} value={c.id}>{c.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Subject</label>
                                <select
                                    value={selectedSubject}
                                    onChange={(e) => setSelectedSubject(e.target.value)}
                                    className="w-full px-4 py-2 bg-dark-bg border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                    disabled={!selectedCourse}
                                >
                                    <option value="">Select a subject...</option>
                                    {courseSubjects.map(s => (
                                        <option key={s.id} value={s.id}>{s.title}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Manual Mode */}
                        {sessionMode === 'manual' && (
                            <div className="mb-4">
                                <label className="block text-sm text-gray-400 mb-1">Duration</label>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <input
                                            type="number"
                                            min="0"
                                            max="24"
                                            value={manualHours}
                                            onChange={(e) => setManualHours(parseInt(e.target.value) || 0)}
                                            className="w-full px-4 py-2 bg-dark-bg border border-gray-700 rounded-lg text-white text-center"
                                        />
                                        <p className="text-xs text-gray-500 text-center mt-1">Hours</p>
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="number"
                                            min="0"
                                            max="59"
                                            value={manualMinutes}
                                            onChange={(e) => setManualMinutes(parseInt(e.target.value) || 0)}
                                            className="w-full px-4 py-2 bg-dark-bg border border-gray-700 rounded-lg text-white text-center"
                                        />
                                        <p className="text-xs text-gray-500 text-center mt-1">Minutes</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Timer Mode */}
                        {sessionMode === 'timer' && (
                            <div className="mb-4 text-center">
                                <p className="text-5xl font-mono text-white mb-4">{formatTime(timerSeconds)}</p>
                                <div className="flex gap-2 justify-center">
                                    {!isTimerRunning ? (
                                        <button
                                            onClick={startTimer}
                                            className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition"
                                        >
                                            ▶️ Start
                                        </button>
                                    ) : (
                                        <button
                                            onClick={stopTimer}
                                            className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition"
                                        >
                                            ⏹️ Stop
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setTimerSeconds(0)}
                                        className="px-4 py-2 bg-dark-bg border border-gray-700 text-gray-400 rounded-lg hover:text-white transition"
                                    >
                                        🔄 Reset
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        <div className="mb-4">
                            <label className="block text-sm text-gray-400 mb-1">Notes (optional)</label>
                            <textarea
                                value={sessionNotes}
                                onChange={(e) => setSessionNotes(e.target.value)}
                                placeholder="What did you study?"
                                rows={2}
                                className="w-full px-4 py-2 bg-dark-bg border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500 resize-none"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => { setShowSessionLogger(false); setIsTimerRunning(false); }}
                                className="flex-1 px-4 py-2 bg-dark-bg border border-gray-700 text-gray-400 rounded-lg hover:text-white transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleLogSession}
                                disabled={!selectedCourse || !selectedSubject || isTimerRunning}
                                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                💾 Save Session
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
