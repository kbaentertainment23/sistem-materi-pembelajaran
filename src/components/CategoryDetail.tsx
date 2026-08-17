import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Presentation,
  Layers,
  Sparkles,
  Award,
  Lock,
  X,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { Category, Material, AuthSession } from '../types';
import { MaterialViewer } from './MaterialViewer';
import { confirmExitExam, useExamSession } from '../utils/examSession';

interface CategoryDetailProps {
  category: Category;
  subjectName?: string;
  materials: Material[];
  completedMaterialIds: string[];
  onToggleCompleted: (materialId: string) => void;
  userNotes: Record<string, string>;
  onSaveNote: (materialId: string, noteText: string) => void;
  onBackToHome: () => void;
  authSession?: AuthSession | null;
}

export const CategoryDetail: React.FC<CategoryDetailProps> = ({
  category,
  subjectName,
  materials,
  completedMaterialIds,
  onToggleCompleted,
  userNotes,
  onSaveNote,
  onBackToHome,
  authSession,
}) => {
  const isTeacherOrAdmin = authSession?.role === 'admin' || authSession?.role === 'teacher';

  // Only published materials, ordered canonically
  const publishedMaterials = useMemo(() => {
    return materials.filter((m) => m.isPublished).sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [materials]);

  // Helper to determine if a material at a given index is unlocked
  const isMaterialUnlocked = (index: number) => {
    if (index <= 0) return true;
    // Material is unlocked if all previous materials 0..index-1 are completed
    return publishedMaterials.slice(0, index).every((m) => completedMaterialIds.includes(m.id));
  };

  const [activeMaterialId, setActiveMaterialId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`sistem_materi_active_mat_${category.id}`);
      if (saved && publishedMaterials.some((m) => m.id === saved)) {
        return saved;
      }
    } catch {}
    return publishedMaterials.length > 0 ? publishedMaterials[0].id : '';
  });

  const [lockedMatModal, setLockedMatModal] = useState<{
    targetTitle: string;
    targetLabel: string;
    targetIndex: number;
    requiredTitle: string;
    requiredLabel: string;
    requiredId: string;
  } | null>(null);

  useEffect(() => {
    if (activeMaterialId) {
      localStorage.setItem(`sistem_materi_active_mat_${category.id}`, activeMaterialId);
    }
  }, [activeMaterialId, category.id]);

  // Scroll to top when entering category detail
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (typeof document !== 'undefined') {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [category.id]);

  // Ensure activeMaterialId is valid and not a locked material for students
  useEffect(() => {
    if (publishedMaterials.length === 0) return;

    const currentIdx = publishedMaterials.findIndex((m) => m.id === activeMaterialId);
    
    // If current material is not in list OR for students it's currently locked
    if (currentIdx === -1 || (!isTeacherOrAdmin && !isMaterialUnlocked(currentIdx))) {
      // Find the highest unlocked material
      let highestUnlockedIdx = 0;
      for (let i = 0; i < publishedMaterials.length; i++) {
        if (isMaterialUnlocked(i)) {
          highestUnlockedIdx = i;
        } else {
          break;
        }
      }
      setActiveMaterialId(publishedMaterials[highestUnlockedIdx].id);
    }
  }, [publishedMaterials, completedMaterialIds, activeMaterialId, isTeacherOrAdmin]);

  const activeMaterial = publishedMaterials.find((m) => m.id === activeMaterialId) || publishedMaterials[0];
  const currentIndex = publishedMaterials.findIndex((m) => m.id === (activeMaterial?.id));

  const activePillRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll the active pill into view within the horizontal bar
  useEffect(() => {
    if (activePillRef.current) {
      activePillRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeMaterialId]);

  const examSession = useExamSession();
  const completedCount = publishedMaterials.filter((m) => completedMaterialIds.includes(m.id)).length;
  const isAllCompleted = publishedMaterials.length > 0 && completedCount === publishedMaterials.length;

  // Helper to format material label (Materi N or Test N)
  const getMaterialLabels = useMemo(() => {
    let mCount = 0;
    let tCount = 0;
    return publishedMaterials.map((mat) => {
      const isGoogleForm =
        mat.type === 'gform' ||
        mat.originalUrl?.includes('docs.google.com/forms') ||
        mat.originalUrl?.includes('forms.gle') ||
        mat.embedUrl?.includes('docs.google.com/forms') ||
        mat.embedUrl?.includes('forms.gle');

      if (isGoogleForm) {
        tCount++;
        return `Test ${tCount}`;
      } else {
        mCount++;
        return `Materi ${mCount}`;
      }
    });
  }, [publishedMaterials]);

  const handleMaterialPillClick = (mat: Material, index: number) => {
    const unlocked = isMaterialUnlocked(index) || isTeacherOrAdmin;

    if (unlocked) {
      if (activeMaterialId !== mat.id) {
        confirmExitExam(() => setActiveMaterialId(mat.id));
      }
    } else {
      // Show locked alert modal
      const prevIdx = index - 1;
      const prevMat = publishedMaterials[prevIdx];
      const prevLabel = getMaterialLabels[prevIdx] || `Materi ${prevIdx + 1}`;
      const targetLabel = getMaterialLabels[index] || `Materi ${index + 1}`;

      setLockedMatModal({
        targetTitle: mat.title,
        targetLabel,
        targetIndex: index + 1,
        requiredTitle: prevMat?.title || prevLabel,
        requiredLabel: prevLabel,
        requiredId: prevMat?.id || '',
      });
    }
  };

  return (
    <div className="space-y-3 sm:space-y-6 animate-in fade-in duration-300">
      
      {/* Top Navigation & Breadcrumb */}
      {!examSession.isActive && (
        <div className="flex items-center justify-between gap-2.5">
          <button
            onClick={() => confirmExitExam(onBackToHome)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white text-xs font-extrabold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 shrink-0 cursor-pointer group ring-2 ring-indigo-300/60"
          >
            <ArrowLeft className="w-4 h-4 text-white stroke-[3] group-hover:-translate-x-0.5 transition-transform" />
            <span>Kembali</span>
          </button>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold truncate max-w-[200px] sm:max-w-none bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <span onClick={() => confirmExitExam(onBackToHome)} className="hover:text-indigo-600 cursor-pointer shrink-0">Topik</span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span className="text-slate-900 font-bold truncate">{category.title}</span>
          </div>
        </div>
      )}

      {/* Category Header Card (Matching SubjectSelector theme) */}
      {!examSession.isActive && (
        <div className="relative overflow-hidden rounded-xl sm:rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white p-3 sm:p-5 lg:p-6 border border-indigo-500/30 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-5">
          {/* Subtle Ambient Glows */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 left-10 w-60 h-60 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-1.5 sm:space-y-2.5 max-w-3xl">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-extrabold bg-indigo-500/25 text-indigo-200 border border-indigo-400/40 flex items-center gap-1 backdrop-blur-xs">
                <Sparkles className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-amber-300" />
                <span>Modul Ajar</span>
              </span>
              {subjectName && (
                <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-white/10 text-indigo-200 border border-white/15">
                  {subjectName}
                </span>
              )}
              {isAllCompleted ? (
                <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 flex items-center gap-1 backdrop-blur-xs">
                  <Award className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-emerald-300" />
                  <span>Tuntas</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-amber-400/20 text-amber-200 border border-amber-300/40 backdrop-blur-xs">
                  Aktif
                </span>
              )}
            </div>

            <div>
              <h1 className="text-base sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-snug drop-shadow-xs">
                {category.title}
              </h1>
              {category.description ? (
                <p className="text-[11px] sm:text-sm text-indigo-100/90 font-medium mt-0.5 leading-relaxed line-clamp-1 sm:line-clamp-2">
                  {category.description}
                </p>
              ) : (
                <p className="text-[11px] sm:text-sm text-indigo-100/90 font-medium mt-0.5 leading-relaxed">
                  {publishedMaterials.length} Materi Pembelajaran Digital
                </p>
              )}
            </div>
          </div>

          {/* Progress Badge */}
          <div className="relative z-10 bg-slate-800/80 backdrop-blur-md px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl border border-slate-700/80 shrink-0 flex flex-col justify-center gap-1 shadow-xs w-full lg:w-auto lg:min-w-[220px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs text-slate-300 font-bold">Progres Topik</span>
              <span 
                key={`cat-detail-pct-${publishedMaterials.length > 0 ? Math.round((completedCount / publishedMaterials.length) * 100) : 0}`} 
                className="text-[10px] sm:text-xs font-black text-amber-300 bg-amber-400/20 border border-amber-300/40 px-1.5 py-0.5 rounded-md animate-in zoom-in-95 duration-300 inline-block"
              >
                {publishedMaterials.length > 0 ? Math.round((completedCount / publishedMaterials.length) * 100) : 0}%
              </span>
            </div>
            <div className="w-full bg-slate-900/90 rounded-full h-1.5 sm:h-2 overflow-hidden border border-slate-700/60 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-indigo-400 via-emerald-400 to-teal-300 transition-all duration-700 ease-out rounded-full"
                style={{ width: `${publishedMaterials.length > 0 ? Math.round((completedCount / publishedMaterials.length) * 100) : 0}%` }}
              />
            </div>
            <div className="text-[10px] sm:text-[11px] font-extrabold text-indigo-200/90 text-right">
              {completedCount}/{publishedMaterials.length} Materi Selesai
            </div>
          </div>
        </div>
      )}

      {/* Material Selector Tabs / Cards */}
      {publishedMaterials.length === 0 ? (
        <div className="p-6 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
          <BookOpen className="w-7 h-7 mx-auto text-slate-300" />
          <h3 className="font-bold text-slate-700 text-sm">Materi Belum Tersedia</h3>
          <p className="text-xs text-slate-400">Belum ada link materi yang diunggah untuk topik ini.</p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          
          {/* Slim & Interactive Responsive Material Selector */}
          {!examSession.isActive && (
            <div className="bg-slate-100/90 sm:bg-slate-100/80 p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-2xs space-y-1 sm:space-y-1.5">
              
              {/* Ultra-Slim Header & Quick Navigation */}
              <div className="flex items-center justify-between gap-2 px-1 py-0.5 select-none">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <BookOpen className="w-3 h-3" />
                  </div>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-800 truncate">
                    Pilih Modul
                  </span>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-500 bg-white border border-slate-200/90 px-1.5 py-0.2 rounded-md shrink-0">
                    {currentIndex + 1}/{publishedMaterials.length}
                  </span>
                </div>

                {/* Compact Prev / Next Controls */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    disabled={currentIndex <= 0}
                    onClick={() => {
                      if (currentIndex > 0) {
                        const prev = publishedMaterials[currentIndex - 1];
                        confirmExitExam(() => setActiveMaterialId(prev.id));
                      }
                    }}
                    className="h-7 px-2 text-[10px] sm:text-xs font-bold rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white text-slate-700 transition-all flex items-center gap-0.5 cursor-pointer active:scale-95 shadow-2xs"
                    title="Materi Sebelumnya"
                  >
                    <ChevronLeft className="w-3 h-3" />
                    <span className="hidden xs:inline">Prev</span>
                  </button>
                  <button
                    disabled={currentIndex >= publishedMaterials.length - 1}
                    onClick={() => {
                      if (currentIndex < publishedMaterials.length - 1) {
                        const nextMat = publishedMaterials[currentIndex + 1];
                        const nextIdx = currentIndex + 1;
                        handleMaterialPillClick(nextMat, nextIdx);
                      }
                    }}
                    className={`h-7 px-2 text-[10px] sm:text-xs font-bold rounded-lg border transition-all flex items-center gap-0.5 cursor-pointer active:scale-95 shadow-2xs ${
                      currentIndex >= publishedMaterials.length - 1
                        ? 'opacity-30 border-slate-200 bg-white text-slate-700'
                        : !isMaterialUnlocked(currentIndex + 1) && !isTeacherOrAdmin
                        ? 'border-slate-200/90 bg-slate-100 text-slate-500 hover:bg-slate-200'
                        : 'border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                    title={
                      !isMaterialUnlocked(currentIndex + 1) && !isTeacherOrAdmin
                        ? 'Materi Selanjutnya Terkunci (Selesaikan materi saat ini terlebih dahulu)'
                        : 'Materi Selanjutnya'
                    }
                  >
                    <span className="hidden xs:inline">Next</span>
                    {!isMaterialUnlocked(currentIndex + 1) && !isTeacherOrAdmin && currentIndex < publishedMaterials.length - 1 ? (
                      <Lock className="w-2.5 h-2.5 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>

              {/* Interactive Horizontal Scrollable Pills Carousel on Mobile / Neat Wrap on Desktop */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5 px-0.5 -mx-0.5 sm:mx-0 sm:px-0 sm:flex-wrap">
                {publishedMaterials.map((mat, index) => {
                  const buttonLabel = getMaterialLabels[index] || `Materi ${index + 1}`;
                  const isActive = activeMaterial && activeMaterial.id === mat.id;
                  const isMatCompleted = completedMaterialIds.includes(mat.id);
                  const isUnlocked = isMaterialUnlocked(index) || isTeacherOrAdmin;

                  return (
                    <button
                      key={mat.id}
                      ref={isActive ? activePillRef : null}
                      onClick={() => handleMaterialPillClick(mat, index)}
                      title={`${buttonLabel}${mat.title && mat.title !== buttonLabel ? ` (${mat.title})` : ''}${
                        isMatCompleted ? ' (Selesai)' : !isUnlocked ? ' (Terkunci)' : ''
                      }`}
                      className={`h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-lg sm:rounded-xl text-[11px] sm:text-xs border transition-all flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap active:scale-95 select-none ${
                        isMatCompleted && isActive
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500 shadow-xs font-black ring-2 ring-emerald-300/80'
                          : isMatCompleted && !isActive
                          ? 'bg-emerald-50 hover:bg-emerald-100/80 text-emerald-900 border-emerald-300 font-bold shadow-2xs'
                          : isActive
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs font-black ring-2 ring-indigo-200'
                          : !isUnlocked
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-400 border-slate-200/90 shadow-2xs'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/90 hover:border-indigo-300 font-bold shadow-2xs'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded text-[9px] font-black flex items-center justify-center shrink-0 ${
                          isMatCompleted && isActive
                            ? 'bg-emerald-950/30 text-emerald-100'
                            : isMatCompleted && !isActive
                            ? 'bg-emerald-600 text-white'
                            : isActive
                            ? 'bg-indigo-800 text-white'
                            : !isUnlocked
                            ? 'bg-slate-200 text-slate-500'
                            : 'bg-slate-100 border border-slate-200/80 text-slate-600'
                        }`}
                      >
                        {!isUnlocked ? <Lock className="w-2.5 h-2.5" /> : index + 1}
                      </span>

                      <span className={`font-extrabold ${!isUnlocked ? 'text-slate-500' : ''}`}>
                        {buttonLabel}
                      </span>

                      {isMatCompleted ? (
                        <CheckCircle2
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive ? 'text-emerald-100' : 'text-emerald-600'
                          }`}
                        />
                      ) : !isUnlocked ? (
                        <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Sequential Completion Banner (Prompting next module) */}
          {!examSession.isActive && activeMaterial && completedMaterialIds.includes(activeMaterial.id) && currentIndex < publishedMaterials.length - 1 && (
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200/90 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl flex items-center justify-between gap-2 shadow-2xs animate-in fade-in duration-300">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-emerald-950 truncate">
                    Materi ini telah tuntas! Modul berikutnya sudah terbuka.
                  </p>
                  <p className="text-[11px] text-emerald-700 font-semibold truncate hidden sm:block">
                    Lanjut ke {getMaterialLabels[currentIndex + 1]}: {publishedMaterials[currentIndex + 1]?.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  const nextMat = publishedMaterials[currentIndex + 1];
                  confirmExitExam(() => setActiveMaterialId(nextMat.id));
                }}
                className="h-7 sm:h-8 px-2.5 sm:px-3.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs flex items-center gap-1 shrink-0 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                <span>Lanjut Belajar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Active Material Embedded Viewer */}
          <AnimatePresence mode="wait">
            {activeMaterial && (
              <motion.div
                key={activeMaterial.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <MaterialViewer
                  material={activeMaterial}
                  category={category}
                  subjectName={subjectName}
                  isCompleted={completedMaterialIds.includes(activeMaterial.id)}
                  onToggleCompleted={onToggleCompleted}
                />
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      )}

      {/* Locked Material Alert Modal */}
      {lockedMatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200 relative">
            <button
              onClick={() => setLockedMatModal(null)}
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
                  Materi Terkunci
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                  Selesaikan Materi Sebelumnya
                </h3>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs text-slate-700 leading-relaxed">
              <p>
                Untuk mengakses <strong>{lockedMatModal.targetLabel} ({lockedMatModal.targetTitle})</strong>, kamu harus menyelesaikan materi prasyarat terlebih dahulu secara berurutan.
              </p>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-500">Materi yang Harus Diselesaikan:</p>
                  <p className="font-extrabold text-slate-900 truncate">
                    {lockedMatModal.requiredLabel}: {lockedMatModal.requiredTitle}
                  </p>
                </div>
                <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200 shrink-0">
                  Belum Selesai
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              {lockedMatModal.requiredId && (
                <button
                  onClick={() => {
                    const reqId = lockedMatModal.requiredId;
                    setLockedMatModal(null);
                    confirmExitExam(() => setActiveMaterialId(reqId));
                  }}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <span>Buka {lockedMatModal.requiredLabel}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setLockedMatModal(null)}
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
