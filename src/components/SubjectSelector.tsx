import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Sparkles,
  ArrowRight,
  Layers,
  GraduationCap,
  BookCheck,
  Award,
  BookMarked,
  Compass,
  Atom,
  Flame,
  Target,
  Smile,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { Subject, Category, Material, TeacherAccount, AuthSession } from '../types';
import { getSubjectIcon } from '../utils/subjectIcons';
import { getTeachersForSubject, doesTeacherTeachClass } from '../utils/classFilter';

interface SubjectSelectorProps {
  subjects: Subject[];
  categories: Category[];
  materials: Material[];
  teachers?: TeacherAccount[];
  completedMaterialIds?: string[];
  searchQuery: string;
  onSelectSubject: (subjectId: string) => void;
  onOpenGuide?: () => void;
  authSession?: AuthSession | null;
}

// 8 Dimensi Profil Lulusan
const GRADUATE_DIMENSIONS_TAGS = [
  'Keimanan & Ketakwaan',
  'Kewargaan / Kebinekaan',
  'Penalaran Kritis',
  'Kreativitas',
  'Gotong Royong',
  'Kemandirian',
  'Kesehatan & Kebugaran',
  'Komunikasi & Kolaborasi',
];

// Helper to assign vibrant color palettes per subject
function getSubjectTheme(subjName: string, code?: string) {
  const name = (subjName + ' ' + (code || '')).toLowerCase();
  if (name.includes('informatika') || name.includes('tik') || name.includes('komputer')) {
    return {
      bgIcon: 'bg-cyan-50 border-cyan-100 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white',
      badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      tag: '💻 Digital & Coding',
      borderTop: 'from-cyan-500 to-blue-600',
      glow: 'group-hover:shadow-cyan-500/10',
    };
  }
  if (name.includes('ipa') || name.includes('sains') || name.includes('biologi') || name.includes('fisika')) {
    return {
      bgIcon: 'bg-emerald-50 border-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      tag: '🔬 Lab & Eksperimen',
      borderTop: 'from-emerald-500 to-teal-600',
      glow: 'group-hover:shadow-emerald-500/10',
    };
  }
  if (name.includes('matematika') || name.includes('mtk')) {
    return {
      bgIcon: 'bg-violet-50 border-violet-100 text-violet-600 group-hover:bg-violet-600 group-hover:text-white',
      badge: 'bg-violet-50 text-violet-700 border-violet-200',
      tag: '📐 Rumus & Trik',
      borderTop: 'from-violet-500 to-indigo-600',
      glow: 'group-hover:shadow-violet-500/10',
    };
  }
  if (name.includes('inggris') || name.includes('english')) {
    return {
      bgIcon: 'bg-rose-50 border-rose-100 text-rose-600 group-hover:bg-rose-600 group-hover:text-white',
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      tag: '🗣️ World English',
      borderTop: 'from-rose-500 to-pink-600',
      glow: 'group-hover:shadow-rose-500/10',
    };
  }
  if (name.includes('indonesia') || name.includes('bahasa')) {
    return {
      bgIcon: 'bg-amber-50 border-amber-100 text-amber-600 group-hover:bg-amber-600 group-hover:text-white',
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
      tag: '📚 Literasi & Karya',
      borderTop: 'from-amber-500 to-orange-600',
      glow: 'group-hover:shadow-amber-500/10',
    };
  }
  if (name.includes('ips') || name.includes('sejarah') || name.includes('geografi') || name.includes('pancasila') || name.includes('ppkn')) {
    return {
      bgIcon: 'bg-sky-50 border-sky-100 text-sky-600 group-hover:bg-sky-600 group-hover:text-white',
      badge: 'bg-sky-50 text-sky-700 border-sky-200',
      tag: '🌍 Wawasan Nusantara',
      borderTop: 'from-sky-500 to-indigo-600',
      glow: 'group-hover:shadow-sky-500/10',
    };
  }
  return {
    bgIcon: 'bg-indigo-50 border-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    tag: '✨ Modul Pembelajaran',
    borderTop: 'from-indigo-500 to-purple-600',
    glow: 'group-hover:shadow-indigo-500/10',
  };
}

export const SubjectSelector: React.FC<SubjectSelectorProps> = ({
  subjects,
  categories,
  materials,
  teachers = [],
  completedMaterialIds = [],
  searchQuery,
  onSelectSubject,
  authSession,
}) => {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (typeof document !== 'undefined') {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, []);

  const currentStudent = authSession?.role === 'student' ? authSession.student : undefined;

  const filteredSubjects = subjects.filter((subj) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = subj.name.toLowerCase().includes(q);
    const codeMatch = subj.code?.toLowerCase().includes(q);
    const descMatch = subj.description?.toLowerCase().includes(q);

    const subjCats = categories.filter((c) => c.subjectId === subj.id);
    const catMatch = subjCats.some((c) => c.title.toLowerCase().includes(q));

    return nameMatch || codeMatch || descMatch || catMatch;
  });

  // Global student progress across all materials
  const totalAllPublished = materials.filter((m) => m.isPublished).length;
  const totalAllCompleted = materials.filter((m) => m.isPublished && completedMaterialIds.includes(m.id)).length;
  const globalProgressPct = totalAllPublished > 0 ? Math.round((totalAllCompleted / totalAllPublished) * 100) : 0;
  const isGlobalAllCompleted = totalAllPublished > 0 && totalAllCompleted === totalAllPublished;

  return (
    <div className="space-y-3 sm:space-y-6 animate-in fade-in duration-300">
      
      {/* Subject Header Card (High-Contrast, Eye-Friendly Vibrant Background) */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white p-3 sm:p-5 lg:p-6 border border-indigo-500/30 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-5">
        
        {/* Subtle Ambient Glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 w-60 h-60 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-1.5 sm:space-y-2.5 max-w-3xl">
          
          {/* Top Badges */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-extrabold bg-indigo-500/25 text-indigo-200 border border-indigo-400/40 flex items-center gap-1 backdrop-blur-xs">
              <Sparkles className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-amber-300" />
              <span>Portal Pembelajaran</span>
            </span>
            {currentStudent ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-cyan-500/25 text-cyan-200 border border-cyan-400/40 flex items-center gap-1.5 backdrop-blur-xs">
                <GraduationCap className="w-3.5 h-3.5 text-cyan-300" />
                <span>Kelas {currentStudent.kelas}</span>
                {currentStudent.noAbsen && <span className="opacity-80 font-mono">• No. {currentStudent.noAbsen}</span>}
              </span>
            ) : (
              <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-extrabold bg-red-500/25 text-red-200 border border-red-400/40 flex items-center gap-1 backdrop-blur-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                <span>Kurikulum Merdeka</span>
              </span>
            )}
            {isGlobalAllCompleted ? (
              <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 flex items-center gap-1 backdrop-blur-xs">
                <Award className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-emerald-300" />
                <span>Semua Materi Tuntas</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-amber-400/20 text-amber-200 border border-amber-300/40 backdrop-blur-xs">
                Aktif
              </span>
            )}
          </div>

          <div>
            <h1 className="text-base sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-snug drop-shadow-xs">
              {currentStudent ? `Mata Pelajaran Kelas ${currentStudent.kelas}` : 'Mata Pelajaran Sekolah'}
            </h1>
            <p className="text-[11px] sm:text-sm text-indigo-100/90 font-medium mt-0.5 leading-relaxed">
              {currentStudent 
                ? `Materi dan modul pembelajaran disesuaikan dengan guru pengampu di kelas ${currentStudent.kelas}. (${filteredSubjects.length} mapel, ${materials.length} materi interaktif)`
                : `Eksplorasi ${subjects.length} mata pelajaran, ${categories.length} topik modul ajar, dan ${materials.length} materi interaktif.`}
            </p>
          </div>

          {/* 8 Dimensi Profil Lulusan Tags Bar */}
          <div className="pt-0.5 flex flex-col sm:flex-row sm:items-center gap-1.5 text-xs">
            <div className="flex items-center gap-1 text-amber-300 font-extrabold shrink-0 text-[10px] sm:text-xs">
              <Award className="w-3 h-3 text-amber-300 shrink-0" />
              <span>Dimensi Profil:</span>
            </div>
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none sm:flex-wrap">
              {GRADUATE_DIMENSIONS_TAGS.slice(0, 6).map((tag, idx) => (
                <span key={idx} className="bg-white/10 hover:bg-white/15 text-slate-200 px-1.5 sm:px-2.5 py-0.5 rounded-md sm:rounded-lg border border-white/15 text-[9px] sm:text-[11px] font-bold shrink-0 transition-colors">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Global Progress & Quick Stats Box (High Contrast & Clear) */}
        <div className="relative z-10 bg-slate-800/80 backdrop-blur-md px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl border border-slate-700/80 shrink-0 flex flex-col justify-center gap-1 shadow-xs w-full lg:w-auto lg:min-w-[220px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs text-slate-300 font-bold">Total Progres Belajar</span>
            <span 
              key={`global-pct-${globalProgressPct}`}
              className="text-[10px] sm:text-xs font-black text-amber-300 bg-amber-400/20 border border-amber-300/40 px-1.5 py-0.5 rounded-md animate-in zoom-in-95 duration-300 inline-block"
            >
              {globalProgressPct}%
            </span>
          </div>
          <div className="w-full bg-slate-900/90 rounded-full h-1.5 sm:h-2 overflow-hidden border border-slate-700/60 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-indigo-400 via-emerald-400 to-teal-300 transition-all duration-700 ease-out rounded-full"
              style={{ width: `${globalProgressPct}%` }}
            />
          </div>
          <div className="text-[10px] sm:text-[11px] font-extrabold text-indigo-200/90 text-right">
            {totalAllCompleted}/{totalAllPublished} Materi Selesai
          </div>
        </div>
      </div>

      {/* Symmetrical Subject Filter Bar (Clear informational section label) */}
      <div className="bg-slate-100/90 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-2.5 select-none cursor-default">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <BookMarked className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs sm:text-sm font-extrabold text-slate-700">
            Daftar Mata Pelajaran <span className="text-slate-500 font-semibold text-[11px] sm:text-xs">({filteredSubjects.length} Mapel Tersedia)</span>
          </span>
        </div>
        {currentStudent && (
          <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-100 hidden sm:inline-block">
            Sesuai Penugasan Guru Kelas {currentStudent.kelas}
          </span>
        )}
      </div>

      {/* Grid of Subjects */}
      {filteredSubjects.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
          <BookOpen className="w-8 h-8 mx-auto text-slate-300" />
          <h3 className="font-bold text-slate-700 text-sm">Mata Pelajaran Tidak Ditemukan</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {currentStudent
              ? `Belum ada mata pelajaran atau materi yang ditugaskan oleh guru untuk Kelas ${currentStudent.kelas}.`
              : `Tidak ada mata pelajaran yang cocok dengan pencarian "${searchQuery}".`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3.5 sm:gap-6">
          {filteredSubjects.map((subj) => {
            const subjCats = categories.filter((c) => c.subjectId === subj.id || (!c.subjectId && subj.id === 'informatika'));
            const catIds = subjCats.map((c) => c.id);
            const subjMats = materials.filter((m) => catIds.includes(m.categoryId) && m.isPublished);

            const completedCount = subjMats.filter((m) => completedMaterialIds.includes(m.id)).length;
            const totalCount = subjMats.length;
            const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            const isFullyCompleted = totalCount > 0 && completedCount === totalCount;

            const theme = getSubjectTheme(subj.name, subj.code);

            // Find teacher(s) for this subject
            const subjTeachers = getTeachersForSubject(subj, teachers);
            const primaryTeacher = currentStudent
              ? (subjTeachers.find((t) => doesTeacherTeachClass(t, currentStudent.kelas)) || subjTeachers[0])
              : subjTeachers[0];

            return (
              <div
                key={subj.id}
                onClick={() => onSelectSubject(subj.id)}
                className={`group bg-white rounded-2xl p-4 sm:p-5 border transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[175px] sm:min-h-[190px] relative overflow-hidden active:scale-[0.98] ${
                  isFullyCompleted
                    ? 'border-emerald-300 shadow-2xs hover:border-emerald-500 bg-gradient-to-b from-white via-emerald-50/20 to-white'
                    : 'border-slate-200/90 shadow-2xs hover:shadow-xl hover:-translate-y-1 hover:border-indigo-300'
                }`}
              >
                {/* Accent Top Border Gradient */}
                <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${isFullyCompleted ? 'from-emerald-500 to-teal-500' : theme.borderTop} group-hover:h-2 transition-all`} />

                <div className="space-y-2.5 sm:space-y-3 pt-0.5 sm:pt-1">
                  {/* Top Row: Colorful Subject Icon + Code Badge + Completed Marker */}
                  <div className="flex items-center justify-between gap-2">
                    <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl border flex items-center justify-center transition-all shrink-0 ${isFullyCompleted ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : theme.bgIcon}`}>
                      {getSubjectIcon(subj.icon, 'w-5 h-5 sm:w-6 sm:h-6')}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      {isFullyCompleted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-black bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-300 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          Selesai 100%
                        </span>
                      ) : (
                        <>
                          {subj.code && (
                            <span className="px-2 py-0.5 text-[10px] sm:text-[11px] font-extrabold bg-slate-100 text-slate-700 rounded-md uppercase border border-slate-200 font-mono">
                              {subj.code}
                            </span>
                          )}
                          <span className={`px-2.5 py-0.5 text-[10px] sm:text-[11px] font-extrabold rounded-lg border ${theme.badge}`}>
                            {subjCats.length} Topik
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Title & Tag */}
                  <div>
                    <h3 className="font-heading text-base sm:text-lg font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 tracking-tight leading-snug">
                      {subj.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/80">
                        <span>{theme.tag}</span>
                      </span>
                      {primaryTeacher && (
                        <span className="text-[10px] sm:text-[11px] font-bold text-indigo-700 bg-indigo-50/80 px-1.5 py-0.5 rounded-md border border-indigo-100 truncate max-w-[140px]" title={`Guru: ${primaryTeacher.name}`}>
                          👤 {primaryTeacher.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress Status Bar */}
                  <div className="space-y-1 sm:space-y-1.5 pt-0.5">
                    <div className="flex items-center justify-between text-xs font-extrabold">
                      <span className="text-slate-500 font-semibold text-[11px] sm:text-xs">Progres:</span>
                      <span className={isFullyCompleted ? "text-emerald-700 font-black flex items-center gap-1 text-[11px] sm:text-xs" : "text-indigo-600 font-black text-[11px] sm:text-xs"}>
                        <span key={`subj-pct-${progressPercent}`} className="animate-in zoom-in-95 duration-300 inline-block">
                          {progressPercent}%
                        </span>
                        <span>({completedCount}/{totalCount})</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 sm:h-2 overflow-hidden border border-slate-200/60 shadow-inner">
                      <div
                        className={`h-full transition-all duration-700 ease-out rounded-full ${
                          isFullyCompleted
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                            : 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-blue-500'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Link Row */}
                <div className="pt-2.5 sm:pt-3 mt-2.5 sm:mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-500">{subjMats.length} Modul Belajar</span>
                  <span className={`font-extrabold flex items-center gap-1 text-xs ${isFullyCompleted ? 'text-emerald-700' : 'text-indigo-600 group-hover:text-indigo-700'}`}>
                    <span>{isFullyCompleted ? 'Review' : 'Mulai Belajar'}</span>
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

