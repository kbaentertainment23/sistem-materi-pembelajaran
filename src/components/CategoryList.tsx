import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Layers,
  GraduationCap,
  ArrowUpDown,
  BrainCircuit,
  Sparkles,
  ChevronRight,
  Award,
  Lock,
  Unlock,
  AlertCircle,
  X,
} from 'lucide-react';
import { Subject, Category, Material, AuthSession } from '../types';
import { getSubjectIcon } from '../utils/subjectIcons';

interface CategoryListProps {
  currentSubject?: Subject | null;
  categories: Category[];
  materials: Material[];
  searchQuery: string;
  completedMaterialIds: string[];
  onSelectCategory: (categoryId: string) => void;
  onBackToSubjects?: () => void;
  onOpenGuide?: () => void;
  authSession?: AuthSession | null;
}

type SortOption = 'default' | 'alpha-asc' | 'alpha-desc' | 'date-desc' | 'date-asc';

export const CategoryList: React.FC<CategoryListProps> = ({
  currentSubject,
  categories,
  materials,
  searchQuery,
  completedMaterialIds,
  onSelectCategory,
  onBackToSubjects,
  authSession,
}) => {
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [lockedModalData, setLockedModalData] = useState<{
    targetTopicTitle: string;
    targetTopicNumber: number;
    requiredTopicTitle: string;
    requiredTopicNumber: number;
    requiredTopicId: string;
    completedMatsCount: number;
    totalMatsCount: number;
  } | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (typeof document !== 'undefined') {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [currentSubject?.id]);

  const isTeacherOrAdmin = authSession?.role === 'admin' || authSession?.role === 'teacher';

  // Filter categories by subject (if subject is selected) and searchQuery
  const subjectCategories = currentSubject
    ? categories.filter((cat) => cat.subjectId === currentSubject.id || (!cat.subjectId && currentSubject.id === 'informatika'))
    : categories;

  // Base canonical sequential ordering of categories within the subject
  const sequentialCategories = useMemo(() => {
    return [...subjectCategories].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [subjectCategories]);

  // Helper map: for each categoryId, is it unlocked?
  const categoryUnlockMap = useMemo(() => {
    const map: Record<string, { isUnlocked: boolean; prevCategory?: Category; prevCatNumber?: number }> = {};
    
    sequentialCategories.forEach((cat, index) => {
      if (index === 0) {
        // First topic is always unlocked
        map[cat.id] = { isUnlocked: true };
      } else {
        const prevCat = sequentialCategories[index - 1];
        // Check if all preceding categories are completed
        const allPrecedingCompleted = sequentialCategories.slice(0, index).every((prev) => {
          const prevMats = materials.filter((m) => m.categoryId === prev.id && m.isPublished);
          return prevMats.length === 0 || prevMats.every((m) => completedMaterialIds.includes(m.id));
        });

        map[cat.id] = {
          isUnlocked: allPrecedingCompleted,
          prevCategory: prevCat,
          prevCatNumber: index,
        };
      }
    });

    return map;
  }, [sequentialCategories, materials, completedMaterialIds]);

  const filteredCategories = subjectCategories.filter((cat) => {
    const q = searchQuery.toLowerCase();
    const titleMatch = cat.title.toLowerCase().includes(q);
    const descMatch = cat.description?.toLowerCase().includes(q);

    // Also match material titles inside this category
    const catMats = materials.filter((m) => m.categoryId === cat.id);
    const matMatch = catMats.some((m) => m.title.toLowerCase().includes(q));

    return titleMatch || descMatch || matMatch;
  });

  const sortedCategories = [...filteredCategories].sort((a, b) => {
    if (sortBy === 'alpha-asc') {
      return a.title.localeCompare(b.title, 'id', { sensitivity: 'base' });
    }
    if (sortBy === 'alpha-desc') {
      return b.title.localeCompare(a.title, 'id', { sensitivity: 'base' });
    }
    if (sortBy === 'date-desc') {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    }
    if (sortBy === 'date-asc') {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeA - timeB;
    }
    return (a.order || 0) - (b.order || 0);
  });

  const handleCardClick = (cat: Category, catIndexInSequence: number) => {
    const unlockInfo = categoryUnlockMap[cat.id];
    const isUnlocked = unlockInfo?.isUnlocked || isTeacherOrAdmin;

    if (isUnlocked) {
      onSelectCategory(cat.id);
    } else if (unlockInfo?.prevCategory) {
      const prevCat = unlockInfo.prevCategory;
      const prevMats = materials.filter((m) => m.categoryId === prevCat.id && m.isPublished);
      const completedMats = prevMats.filter((m) => completedMaterialIds.includes(m.id)).length;

      setLockedModalData({
        targetTopicTitle: cat.title,
        targetTopicNumber: catIndexInSequence + 1,
        requiredTopicTitle: prevCat.title,
        requiredTopicNumber: unlockInfo.prevCatNumber || catIndexInSequence,
        requiredTopicId: prevCat.id,
        completedMatsCount: completedMats,
        totalMatsCount: prevMats.length,
      });
    }
  };

  return (
    <div className="space-y-3 sm:space-y-6 animate-in fade-in duration-300">
      
      {/* Top Navigation & Breadcrumb */}
      {currentSubject && (
        <div className="flex items-center justify-between gap-2.5">
          <button
            onClick={onBackToSubjects}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white text-xs font-extrabold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 shrink-0 cursor-pointer group ring-2 ring-indigo-300/60"
          >
            <ArrowLeft className="w-4 h-4 text-white stroke-[3] group-hover:-translate-x-0.5 transition-transform" />
            <span>Pilih Mapel</span>
          </button>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold truncate max-w-[220px] sm:max-w-none bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <span onClick={onBackToSubjects} className="hover:text-indigo-600 cursor-pointer shrink-0">Mapel</span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span className="text-slate-900 font-bold truncate">{currentSubject.name}</span>
          </div>
        </div>
      )}

      {/* Subject Header Card (Matching SubjectSelector theme) */}
      {currentSubject && (() => {
        const totalMatsInSubj = materials.filter((m) => {
          const cat = categories.find((c) => c.id === m.categoryId);
          return (cat?.subjectId === currentSubject.id || (!cat?.subjectId && currentSubject.id === 'informatika')) && m.isPublished;
        });
        const completedMatsInSubj = totalMatsInSubj.filter((m) => completedMaterialIds.includes(m.id)).length;
        const subjProgressPct = totalMatsInSubj.length > 0 ? Math.round((completedMatsInSubj / totalMatsInSubj.length) * 100) : 0;
        const isSubjAllCompleted = totalMatsInSubj.length > 0 && completedMatsInSubj === totalMatsInSubj.length;

        return (
          <div className="relative overflow-hidden rounded-xl sm:rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white p-3 sm:p-5 lg:p-6 border border-indigo-500/30 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-5">
            {/* Subtle Ambient Glows */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 left-10 w-60 h-60 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 space-y-1.5 sm:space-y-2.5 max-w-3xl">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-extrabold bg-indigo-500/25 text-indigo-200 border border-indigo-400/40 flex items-center gap-1 backdrop-blur-xs">
                  <Sparkles className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-amber-300" />
                  <span>Mata Pelajaran</span>
                </span>
                {currentSubject.code && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-white/10 text-indigo-200 border border-white/15 font-mono">
                    {currentSubject.code}
                  </span>
                )}
                {isSubjAllCompleted ? (
                  <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 flex items-center gap-1 backdrop-blur-xs">
                    <Award className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-emerald-300" />
                    <span>Semua Topik Tuntas</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-amber-400/20 text-amber-200 border border-amber-300/40 backdrop-blur-xs">
                    Aktif
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5 sm:gap-3 pt-0.5">
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/30 border border-indigo-300/40 ring-2 ring-white/10">
                  {getSubjectIcon(currentSubject.icon, 'w-4.5 h-4.5 sm:w-6 sm:h-6')}
                </div>
                <div>
                  <h1 className="text-base sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-snug drop-shadow-xs">
                    {currentSubject.name}
                  </h1>
                  <p className="text-[11px] sm:text-sm text-indigo-100/90 font-medium mt-0.5 leading-relaxed">
                    {sortedCategories.length} Topik Pembelajaran • {totalMatsInSubj.length} Modul Ajar
                  </p>
                </div>
              </div>
            </div>

            {/* Progress Badge */}
            <div className="relative z-10 bg-slate-800/80 backdrop-blur-md px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl border border-slate-700/80 shrink-0 flex flex-col justify-center gap-1 shadow-xs w-full lg:w-auto lg:min-w-[220px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] sm:text-xs text-slate-300 font-bold">Progres Mapel</span>
                <span 
                  key={`subj-pct-${subjProgressPct}`}
                  className="text-[10px] sm:text-xs font-black text-amber-300 bg-amber-400/20 border border-amber-300/40 px-1.5 py-0.5 rounded-md animate-in zoom-in-95 duration-300 inline-block"
                >
                  {subjProgressPct}%
                </span>
              </div>
              <div className="w-full bg-slate-900/90 rounded-full h-1.5 sm:h-2 overflow-hidden border border-slate-700/60 shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-indigo-400 via-emerald-400 to-teal-300 transition-all duration-700 ease-out rounded-full"
                  style={{ width: `${subjProgressPct}%` }}
                />
              </div>
              <div className="text-[10px] sm:text-[11px] font-extrabold text-indigo-200/90 text-right">
                {completedMatsInSubj}/{totalMatsInSubj.length} Materi Selesai
              </div>
            </div>
          </div>
        );
      })()}

      {/* Symmetrical Topic Section Bar */}
      <div className="bg-slate-100/90 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-2.5 sm:gap-3 select-none">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <span className="text-xs sm:text-sm font-extrabold text-slate-700 truncate">
            Daftar Topik Pembelajaran <span className="text-slate-500 font-semibold text-[11px] sm:text-xs">({sortedCategories.length} Topik)</span>
          </span>
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-1.5 bg-white hover:bg-slate-50 transition-colors px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 text-xs shrink-0 shadow-2xs">
          <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span className="text-slate-500 font-bold text-[11px] sm:text-xs hidden sm:inline">Urutan:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-transparent font-extrabold text-slate-700 focus:outline-none cursor-pointer text-xs pr-0.5"
          >
            <option value="default">Urutan Topik</option>
            <option value="alpha-asc">Abjad (A - Z)</option>
            <option value="alpha-desc">Abjad (Z - A)</option>
            <option value="date-desc">Terbaru</option>
            <option value="date-asc">Terlama</option>
          </select>
        </div>
      </div>

      {/* Grid of Topic Cards */}
      {sortedCategories.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
          <BookOpen className="w-8 h-8 mx-auto text-slate-300" />
          <h3 className="font-bold text-slate-700 text-sm">Topik Belum Tersedia</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? `Tidak ada topik yang cocok dengan pencarian "${searchQuery}".`
              : `Belum ada topik yang dibuat untuk mata pelajaran ini.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3.5 sm:gap-6">
          {sortedCategories.map((cat) => {
            const seqIndex = sequentialCategories.findIndex((c) => c.id === cat.id);
            const displayTopicNum = seqIndex >= 0 ? seqIndex + 1 : 1;
            const unlockInfo = categoryUnlockMap[cat.id];
            const isUnlocked = unlockInfo?.isUnlocked || isTeacherOrAdmin;

            const catMats = materials.filter((m) => m.categoryId === cat.id && m.isPublished);
            const completedCountInCat = catMats.filter((m) => completedMaterialIds.includes(m.id)).length;
            const isAllCompleted = catMats.length > 0 && completedCountInCat === catMats.length;
            const catProgressPct = catMats.length > 0 ? Math.round((completedCountInCat / catMats.length) * 100) : 0;

            return (
              <div
                key={cat.id}
                onClick={() => handleCardClick(cat, seqIndex)}
                className={`group rounded-2xl p-4 sm:p-5 border transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[175px] sm:min-h-[190px] relative overflow-hidden active:scale-[0.98] ${
                  isAllCompleted
                    ? 'border-emerald-300 shadow-2xs hover:border-emerald-500 bg-gradient-to-b from-white via-emerald-50/20 to-white'
                    : !isUnlocked
                    ? 'border-slate-200 bg-slate-50/80 hover:bg-slate-100/80 hover:border-slate-300 shadow-2xs opacity-90'
                    : 'bg-white border-slate-200/90 shadow-2xs hover:shadow-xl hover:-translate-y-1 hover:border-indigo-300'
                }`}
              >
                {/* Accent Top Border Gradient */}
                <div
                  className={`absolute top-0 left-0 w-full h-1.5 transition-all ${
                    isAllCompleted
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 group-hover:h-2'
                      : !isUnlocked
                      ? 'bg-slate-300'
                      : 'bg-gradient-to-r from-indigo-500 via-sky-500 to-purple-500 group-hover:h-2'
                  }`}
                />

                <div className="space-y-2.5 sm:space-y-3 pt-0.5 sm:pt-1">
                  {/* Top Row: Icon + Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl border flex items-center justify-center transition-all shrink-0 ${
                        isAllCompleted
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                          : !isUnlocked
                          ? 'bg-slate-200/80 border-slate-300 text-slate-500'
                          : 'bg-indigo-50 border-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'
                      }`}
                    >
                      {getSubjectIcon(cat.icon, 'w-5 h-5 sm:w-6 sm:h-6')}
                    </div>

                    <div className="shrink-0">
                      {isAllCompleted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-black bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-300 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          Selesai 100%
                        </span>
                      ) : !isUnlocked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-extrabold rounded-lg bg-slate-200/80 text-slate-600 border border-slate-300">
                          <Lock className="w-3 h-3 text-slate-500 shrink-0" />
                          Terkunci
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-[11px] font-extrabold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {catMats.length} Materi
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border font-mono ${
                        !isUnlocked ? 'bg-slate-200/60 text-slate-500 border-slate-300' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        Topik #{String(displayTopicNum).padStart(2, '0')}
                      </span>
                      {isTeacherOrAdmin && !unlockInfo?.isUnlocked && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                          Akses Guru
                        </span>
                      )}
                    </div>
                    <h3 className={`font-heading text-base sm:text-lg font-extrabold line-clamp-2 tracking-tight leading-snug transition-colors ${
                      !isUnlocked ? 'text-slate-700' : 'text-slate-900 group-hover:text-indigo-600'
                    }`}>
                      {cat.title}
                    </h3>
                  </div>

                  {/* Progress Status Bar */}
                  <div className="space-y-1 sm:space-y-1.5 pt-0.5">
                    <div className="flex items-center justify-between text-xs font-extrabold">
                      <span className="text-slate-500 font-semibold text-[11px] sm:text-xs">
                        {!isUnlocked ? 'Status:' : 'Progres:'}
                      </span>
                      <span
                        className={
                          isAllCompleted
                            ? 'text-emerald-700 font-black flex items-center gap-1 text-[11px] sm:text-xs'
                            : !isUnlocked
                            ? 'text-slate-500 font-bold text-[11px] sm:text-xs flex items-center gap-1'
                            : 'text-indigo-600 font-black text-[11px] sm:text-xs'
                        }
                      >
                        {!isUnlocked ? (
                          <span>Belum Terbuka</span>
                        ) : (
                          <>
                            <span key={`cat-pct-${catProgressPct}`} className="animate-in zoom-in-95 duration-300 inline-block">
                              {catProgressPct}%
                            </span>
                            <span>({completedCountInCat}/{catMats.length})</span>
                          </>
                        )}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200/70 rounded-full h-1.5 sm:h-2 overflow-hidden border border-slate-300/60 shadow-inner">
                      <div
                        className={`h-full transition-all duration-700 ease-out rounded-full ${
                          isAllCompleted
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                            : !isUnlocked
                            ? 'bg-slate-300 w-0'
                            : 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-blue-500'
                        }`}
                        style={{ width: !isUnlocked ? '0%' : `${catProgressPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-2.5 sm:pt-3 mt-2.5 sm:mt-3 border-t border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-500">
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-500">{catMats.length} Modul Ajar</span>
                  <span
                    className={`font-extrabold flex items-center gap-1 text-xs ${
                      isAllCompleted
                        ? 'text-emerald-700'
                        : !isUnlocked
                        ? 'text-slate-500 group-hover:text-slate-700'
                        : 'text-indigo-600 group-hover:text-indigo-700'
                    }`}
                  >
                    {!isUnlocked ? (
                      <>
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Terkunci</span>
                      </>
                    ) : (
                      <>
                        <span>{isAllCompleted ? 'Review' : 'Buka Modul'}</span>
                        <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Locked Topic Alert Modal */}
      {lockedModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200 relative">
            <button
              onClick={() => setLockedModalData(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 shadow-xs">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                  Mekanisme Belajar Berurutan
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                  Topik Belum Terbuka
                </h3>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs text-slate-700 leading-relaxed">
              <p>
                Untuk mengakses <strong>Topik #{lockedModalData.targetTopicNumber}: {lockedModalData.targetTopicTitle}</strong>, kamu harus menyelesaikan seluruh materi di topik sebelumnya terlebih dahulu.
              </p>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-500">Prasyarat Topik:</p>
                  <p className="font-extrabold text-slate-900 truncate">
                    Topik #{lockedModalData.requiredTopicNumber}: {lockedModalData.requiredTopicTitle}
                  </p>
                </div>
                <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200 shrink-0">
                  {lockedModalData.completedMatsCount}/{lockedModalData.totalMatsCount} Selesai
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  const reqId = lockedModalData.requiredTopicId;
                  setLockedModalData(null);
                  onSelectCategory(reqId);
                }}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span>Buka Topik #{lockedModalData.requiredTopicNumber}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLockedModalData(null)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

