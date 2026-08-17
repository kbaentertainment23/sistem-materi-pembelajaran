import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Atom,
  Compass,
  Rocket,
  Sparkles,
  Lightbulb,
  GraduationCap,
  BookOpen,
  Calculator,
  BrainCircuit,
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { SubjectSelector } from './components/SubjectSelector';
import { CategoryList } from './components/CategoryList';
import { CategoryDetail } from './components/CategoryDetail';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminDashboard } from './components/AdminDashboard';
import { DriveGuideModal } from './components/DriveGuideModal';
import { ExamExitModal } from './components/ExamExitModal';
import { AntiCheatModal } from './components/AntiCheatModal';
import { InitialLoginScreen } from './components/InitialLoginScreen';
import { Subject, Category, Material, TeacherAccount, StudentAccount, AuthSession } from './types';
import { fetchSubjects, fetchCategories, fetchMaterials, fetchTeachers, fetchStudents, seedInitialDataIfNeeded, getSiteLogoUrl, saveStudentProgress, fetchStudentProgress, purgeDemoAccountsAndData } from './lib/dataService';

import { INITIAL_SUBJECTS, INITIAL_CATEGORIES, INITIAL_MATERIALS } from './utils/initialData';
import { confirmExitExam, useExamSession } from './utils/examSession';
import { filterContentForStudent } from './utils/classFilter';

export default function App() {
  const examSession = useExamSession();
  const [subjects, setSubjects] = useState<Subject[]>(() => {
    try {
      const saved = localStorage.getItem('sistem_materi_subj_cache');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem('sistem_materi_cat_cache');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [materials, setMaterials] = useState<Material[]>(() => {
    try {
      const saved = localStorage.getItem('sistem_materi_mat_cache');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [siteLogoUrl, setSiteLogoUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('sistem_materi_logo_url') || '';
    } catch {
      return '';
    }
  });

  const [isLoading, setIsLoading] = useState(false);


  // Search & Navigation
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('sistem_materi_selected_subject_id') || null;
    } catch {
      return null;
    }
  });
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('sistem_materi_selected_category_id') || null;
    } catch {
      return null;
    }
  });

  // Admin & Teacher Auth Sessions & Modals
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => {
    try {
      const saved = localStorage.getItem('sistem_materi_auth_session');
      if (saved) return JSON.parse(saved);
    } catch {}
    if (localStorage.getItem('sistem_materi_admin_auth') === 'true') {
      return { role: 'admin' };
    }
    return null;
  });

  const [viewMode, setViewMode] = useState<'dashboard' | 'student_preview'>('dashboard');

  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return authSession?.role === 'admin' || localStorage.getItem('sistem_materi_admin_auth') === 'true';
  });
  const [teachers, setTeachers] = useState<TeacherAccount[]>(() => {
    try {
      const saved = localStorage.getItem('sistem_materi_teachers_cache');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [students, setStudents] = useState<StudentAccount[]>([]);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Student progress & notes persistence (Keyed by student ID)
  const [completedMaterialIds, setCompletedMaterialIds] = useState<string[]>(() => {
    if (authSession?.student) {
      try {
        const saved = localStorage.getItem(`sistem_materi_prog_${authSession.student.id}`);
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [userNotes, setUserNotes] = useState<Record<string, string>>(() => {
    if (authSession?.student) {
      try {
        const saved = localStorage.getItem(`sistem_materi_notes_${authSession.student.id}`);
        return saved ? JSON.parse(saved) : {};
      } catch {
        return {};
      }
    }
    return {};
  });

  // Sync student progress on account switch or login
  useEffect(() => {
    if (authSession?.student) {
      const studentId = authSession.student.id;
      // Load local cache for this student
      try {
        const localProg = localStorage.getItem(`sistem_materi_prog_${studentId}`);
        setCompletedMaterialIds(localProg ? JSON.parse(localProg) : []);

        const localNotes = localStorage.getItem(`sistem_materi_notes_${studentId}`);
        setUserNotes(localNotes ? JSON.parse(localNotes) : {});
      } catch {
        setCompletedMaterialIds([]);
        setUserNotes({});
      }

      // Sync latest progress from Firestore DB
      fetchStudentProgress(studentId).then((dbProg) => {
        if (Array.isArray(dbProg)) {
          setCompletedMaterialIds(dbProg);
          try {
            localStorage.setItem(`sistem_materi_prog_${studentId}`, JSON.stringify(dbProg));
          } catch {}
        }
      });
    } else {
      setCompletedMaterialIds([]);
      setUserNotes({});
    }
  }, [authSession?.student?.id]);

  // Load Data from Firestore in parallel
  const loadData = async (showLoading = false) => {
    if (showLoading && categories.length === 0) {
      setIsLoading(true);
    }
    try {
      const [subjData, catData, matData, logoData, teacherData, studentData] = await Promise.all([
        fetchSubjects(),
        fetchCategories(),
        fetchMaterials(),
        getSiteLogoUrl(),
        fetchTeachers(),
        fetchStudents(),
      ]);
      setSubjects(subjData);
      setCategories(catData);
      setMaterials(matData);
      if (logoData !== undefined) {
        setSiteLogoUrl(logoData);
      }
      setTeachers(teacherData);
      setStudents(studentData);
      try {
        localStorage.setItem('sistem_materi_teachers_cache', JSON.stringify(teacherData));
      } catch {}
    } catch (err) {
      console.error('Error loading data from Firestore:', err);
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    purgeDemoAccountsAndData().finally(() => {
      loadData(false);
    });
    seedInitialDataIfNeeded().catch(console.warn);
  }, []);

  // Ensure selectedSubjectId stays in sync with selectedCategoryId
  useEffect(() => {
    if (selectedCategoryId && categories.length > 0) {
      const cat = categories.find((c) => c.id === selectedCategoryId);
      if (cat && cat.subjectId && cat.subjectId !== selectedSubjectId) {
        setSelectedSubjectId(cat.subjectId);
        localStorage.setItem('sistem_materi_selected_subject_id', cat.subjectId);
      }
    }
  }, [selectedCategoryId, categories, selectedSubjectId]);

  // Always scroll immediately to the very top whenever view changes across all navigation levels
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (typeof document !== 'undefined') {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [selectedSubjectId, selectedCategoryId, viewMode]);

  const handleSelectSubject = (subjectId: string) => {
    confirmExitExam(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      setSelectedSubjectId(subjectId);
      localStorage.setItem('sistem_materi_selected_subject_id', subjectId);
      setSelectedCategoryId(null);
      localStorage.removeItem('sistem_materi_selected_category_id');
    });
  };

  const handleBackToSubjects = () => {
    confirmExitExam(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      setSelectedSubjectId(null);
      localStorage.removeItem('sistem_materi_selected_subject_id');
      setSelectedCategoryId(null);
      localStorage.removeItem('sistem_materi_selected_category_id');
    });
  };

  const handleSelectCategory = (catId: string | null) => {
    confirmExitExam(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      setSelectedCategoryId(catId);
      if (catId) {
        localStorage.setItem('sistem_materi_selected_category_id', catId);
      } else {
        localStorage.removeItem('sistem_materi_selected_category_id');
      }
    });
  };

  // Save student progress to localStorage & Firestore per student ID
  const handleToggleCompleted = (materialId: string) => {
    setCompletedMaterialIds((prev) => {
      const next = prev.includes(materialId) ? prev.filter((id) => id !== materialId) : [...prev, materialId];
      if (authSession?.student) {
        const studentId = authSession.student.id;
        try {
          localStorage.setItem(`sistem_materi_prog_${studentId}`, JSON.stringify(next));
        } catch {}
        saveStudentProgress(studentId, next, authSession.student.nama, authSession.student.kelas);
      } else {
        try {
          localStorage.setItem('sistem_materi_completed', JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  const handleSaveNote = (materialId: string, noteText: string) => {
    setUserNotes((prev) => {
      const next = { ...prev, [materialId]: noteText };
      if (authSession?.student) {
        try {
          localStorage.setItem(`sistem_materi_notes_${authSession.student.id}`, JSON.stringify(next));
        } catch {}
      } else {
        try {
          localStorage.setItem('sistem_materi_notes', JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  // Auth Handlers (Admin / Teacher / Student)
  const handleAuthLoginSuccess = async (session: AuthSession) => {
    setAuthSession(session);
    setViewMode('dashboard');
    try {
      localStorage.setItem('sistem_materi_auth_session', JSON.stringify(session));
    } catch {}

    // ALWAYS reset selection on login so student starts at "Pilih Mata Pelajaran"!
    setSelectedSubjectId(null);
    localStorage.removeItem('sistem_materi_selected_subject_id');
    setSelectedCategoryId(null);
    localStorage.removeItem('sistem_materi_selected_category_id');

    if (session.student) {
      const studentId = session.student.id;
      // Load local cache for this student immediately
      try {
        const local = localStorage.getItem(`sistem_materi_prog_${studentId}`);
        setCompletedMaterialIds(local ? JSON.parse(local) : []);
      } catch {
        setCompletedMaterialIds([]);
      }

      // Sync latest progress from Firestore
      const dbProgress = await fetchStudentProgress(studentId);
      if (Array.isArray(dbProgress)) {
        setCompletedMaterialIds(dbProgress);
        try {
          localStorage.setItem(`sistem_materi_prog_${studentId}`, JSON.stringify(dbProgress));
        } catch {}
      }
    } else {
      setCompletedMaterialIds([]);
    }

    if (session.role === 'admin') {
      setIsAdmin(true);
      localStorage.setItem('sistem_materi_admin_auth', 'true');
    } else {
      setIsAdmin(false);
      localStorage.removeItem('sistem_materi_admin_auth');
    }
  };

  const handleAdminLogout = () => {
    setAuthSession(null);
    setIsAdmin(false);
    setViewMode('dashboard');
    setSelectedSubjectId(null);
    setSelectedCategoryId(null);
    setCompletedMaterialIds([]);
    setUserNotes({});
    localStorage.removeItem('sistem_materi_auth_session');
    localStorage.removeItem('sistem_materi_admin_auth');
    localStorage.removeItem('sistem_materi_selected_subject_id');
    localStorage.removeItem('sistem_materi_selected_category_id');
  };

  // Class-based content filtering for students
  const {
    filteredSubjects: studentVisibleSubjects,
    filteredCategories: studentVisibleCategories,
    filteredMaterials: studentVisibleMaterials,
  } = useMemo(() => {
    if (authSession?.role === 'student' && authSession.student) {
      return filterContentForStudent(
        authSession.student,
        teachers,
        subjects,
        categories,
        materials
      );
    }
    return {
      filteredSubjects: subjects,
      filteredCategories: categories,
      filteredMaterials: materials,
    };
  }, [authSession, teachers, subjects, categories, materials]);

  // Auto-reset selected subject & category if student has no access to them
  useEffect(() => {
    if (authSession?.role === 'student') {
      if (selectedSubjectId && !studentVisibleSubjects.some((s) => s.id === selectedSubjectId)) {
        setSelectedSubjectId(null);
        setSelectedCategoryId(null);
        localStorage.removeItem('sistem_materi_selected_subject_id');
        localStorage.removeItem('sistem_materi_selected_category_id');
      } else if (selectedCategoryId && !studentVisibleCategories.some((c) => c.id === selectedCategoryId)) {
        setSelectedCategoryId(null);
        localStorage.removeItem('sistem_materi_selected_category_id');
      }
    }
  }, [authSession?.role, selectedSubjectId, selectedCategoryId, studentVisibleSubjects, studentVisibleCategories]);

  const currentSubject = studentVisibleSubjects.find((s) => s.id === selectedSubjectId);
  const selectedCategory = studentVisibleCategories.find((c) => c.id === selectedCategoryId);

  // Per-Subject Progress Calculation
  const activeSubjectCats = currentSubject
    ? studentVisibleCategories.filter((c) => c.subjectId === currentSubject.id || (!c.subjectId && currentSubject.id === 'informatika'))
    : [];
  const activeSubjectCatIds = activeSubjectCats.map((c) => c.id);
  const activeSubjectMaterials = currentSubject
    ? studentVisibleMaterials.filter((m) => activeSubjectCatIds.includes(m.categoryId) && m.isPublished)
    : [];
  const activeSubjectCompletedCount = activeSubjectMaterials.filter((m) =>
    completedMaterialIds.includes(m.id)
  ).length;

  // Optimistic Delete Handlers
  const handleDeleteSubjectOptimistic = (id: string) => {
    setSubjects((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      try {
        localStorage.setItem('sistem_materi_subj_cache', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setCategories((prev) => {
      const updated = prev.filter((c) => c.subjectId !== id);
      try {
        localStorage.setItem('sistem_materi_cat_cache', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleDeleteMaterialOptimistic = (id: string) => {
    setMaterials((prev) => {
      const updated = prev.filter((m) => m.id !== id);
      try {
        localStorage.setItem('sistem_materi_mat_cache', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleDeleteCategoryOptimistic = (id: string) => {
    setCategories((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      try {
        localStorage.setItem('sistem_materi_cat_cache', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setMaterials((prev) => {
      const updated = prev.filter((m) => m.categoryId !== id);
      try {
        localStorage.setItem('sistem_materi_mat_cache', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  if (!authSession) {
    return (
      <InitialLoginScreen
        onLoginSuccess={handleAuthLoginSuccess}
        siteLogoUrl={siteLogoUrl}
      />
    );
  }

  if ((authSession.role === 'admin' || authSession.role === 'teacher') && viewMode === 'dashboard') {
    return (
      <>
        <AdminDashboard
          isOpen={true}
          onClose={handleAdminLogout}
          onLogout={handleAdminLogout}
          onSwitchToStudentView={() => setViewMode('student_preview')}
          subjects={subjects}
          categories={categories}
          materials={materials}
          teachers={teachers}
          students={students}
          authSession={authSession}
          onRefreshData={loadData}
          onOpenGuide={() => setIsGuideOpen(true)}
          onDeleteSubjectOptimistic={handleDeleteSubjectOptimistic}
          onDeleteMaterialOptimistic={handleDeleteMaterialOptimistic}
          onDeleteCategoryOptimistic={handleDeleteCategoryOptimistic}
          siteLogoUrl={siteLogoUrl}
          onUpdateSiteLogoUrl={(newUrl) => setSiteLogoUrl(newUrl)}
        />
        <DriveGuideModal
          isOpen={isGuideOpen}
          onClose={() => setIsGuideOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-slate-50/90 text-slate-800 font-sans antialiased flex flex-col selection:bg-indigo-500 selection:text-white relative overflow-x-hidden bg-grid-pattern pb-[env(safe-area-inset-bottom,0px)]">
      
      {/* Student Preview Mode Banner for Admin/Teacher */}
      {(authSession.role === 'admin' || authSession.role === 'teacher') && viewMode === 'student_preview' && (
        <div className="bg-indigo-900 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between shadow-md relative z-50 border-b border-indigo-700">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
            <span>Mode Pratinjau Siswa — Anda sedang melihat tampilan portal siswa.</span>
          </div>
          <button
            onClick={() => setViewMode('dashboard')}
            className="px-3 py-1 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-lg transition-colors cursor-pointer text-xs shrink-0 shadow-xs"
          >
            Kembali ke Halaman {authSession.role === 'teacher' ? 'Guru' : 'Admin'}
          </button>
        </div>
      )}
      
      {/* Decorative Educational Background Ornaments & Glows */}
      {!examSession.isActive && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {/* Soft Radial Ambient Color Glows */}
          <div className="absolute -top-24 -left-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/3 -right-20 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

          {/* Floating Educational Doodles & Badges */}
          <div className="hidden lg:block">
            <div className="absolute top-28 left-8 text-indigo-400/25 animate-float">
              <Atom className="w-14 h-14" />
            </div>
            <div className="absolute top-44 right-12 text-sky-400/25 animate-float-delayed">
              <Rocket className="w-12 h-12" />
            </div>
            <div className="absolute top-1/2 left-6 text-purple-400/20 animate-float-delayed">
              <Calculator className="w-11 h-11" />
            </div>
            <div className="absolute top-2/3 right-10 text-emerald-400/20 animate-float">
              <BrainCircuit className="w-12 h-12" />
            </div>
            <div className="absolute bottom-28 left-14 text-amber-400/25 animate-float">
              <Lightbulb className="w-12 h-12" />
            </div>
            <div className="absolute bottom-20 right-20 text-rose-400/20 animate-float-delayed">
              <Compass className="w-11 h-11" />
            </div>
          </div>
        </div>
      )}

      {/* Navbar with subtle Admin login button top-right */}
      {!examSession.isActive && (
        <Navbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isAdmin={isAdmin}
          authSession={authSession}
          onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
          onOpenAdminDashboard={() => setIsAdminDashboardOpen(true)}
          onLogoutAdmin={handleAdminLogout}
          completedCount={activeSubjectCompletedCount}
          totalMaterialsCount={activeSubjectMaterials.length}
          selectedSubjectName={currentSubject?.name}
          onGoHome={handleBackToSubjects}
          logoUrl={siteLogoUrl}
        />
      )}

      {/* Main Content View Container */}
      <main className={examSession.isActive ? "flex-1 w-full relative z-10 p-0 m-0" : "flex-1 w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-8 relative z-10"}>
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="py-24 flex flex-col items-center justify-center space-y-4"
            >
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-sm sm:text-base font-semibold text-slate-500">Menghubungkan ke Database Firestore...</p>
            </motion.div>
          ) : selectedCategory ? (
            <motion.div
              key={`category-detail-${selectedCategory.id}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              onAnimationStart={() => {
                window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
              }}
            >
              <CategoryDetail
                category={selectedCategory}
                subjectName={subjects.find((s) => s.id === (selectedCategory.subjectId || selectedSubjectId))?.name}
                materials={studentVisibleMaterials.filter((m) => m.categoryId === selectedCategory.id)}
                completedMaterialIds={completedMaterialIds}
                onToggleCompleted={handleToggleCompleted}
                userNotes={userNotes}
                onSaveNote={handleSaveNote}
                onBackToHome={() => handleSelectCategory(null)}
                authSession={authSession}
              />
            </motion.div>
          ) : selectedSubjectId ? (
            <motion.div
              key={`category-list-${selectedSubjectId}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              onAnimationStart={() => {
                window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
              }}
            >
              <CategoryList
                currentSubject={currentSubject}
                categories={studentVisibleCategories}
                materials={studentVisibleMaterials}
                searchQuery={searchQuery}
                completedMaterialIds={completedMaterialIds}
                onSelectCategory={(catId) => handleSelectCategory(catId)}
                onBackToSubjects={handleBackToSubjects}
                onOpenGuide={() => setIsGuideOpen(true)}
                authSession={authSession}
              />
            </motion.div>
          ) : (
            <motion.div
              key="subject-selector"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              onAnimationStart={() => {
                window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
              }}
            >
              <SubjectSelector
                subjects={studentVisibleSubjects}
                categories={studentVisibleCategories}
                materials={studentVisibleMaterials}
                teachers={teachers}
                completedMaterialIds={completedMaterialIds}
                searchQuery={searchQuery}
                onSelectSubject={handleSelectSubject}
                onOpenGuide={() => setIsGuideOpen(true)}
                authSession={authSession}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      {!examSession.isActive && (
        <footer className="bg-white/80 backdrop-blur-md border-t border-slate-200/70 py-3 sm:py-4 text-center text-xs sm:text-sm text-slate-500 mt-6 sm:mt-10 relative z-10">
          <div className="w-full px-3 sm:px-6 lg:px-8 flex items-center justify-center">
            <p className="font-medium text-slate-500 text-xs sm:text-sm">
              © {new Date().getFullYear()} <span className="font-extrabold text-indigo-700 tracking-wider">SIMPEL</span> — Sistem Informasi Materi Pembelajaran Elektronik
            </p>
          </div>
        </footer>
      )}

      {/* Modals */}
      <DriveGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      <ExamExitModal />
      <AntiCheatModal />

    </div>
  );
}
