import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ExternalLink,
  Maximize2,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Presentation,
  Layers,
  Focus,
  X,
  Video,
  Play,
  FileText,
  ClipboardList,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Lock,
} from 'lucide-react';
import { Material, Category } from '../types';
import { MiniQuizSection } from './MiniQuizSection';
import { FocusMusicBar } from './FocusMusicBar';
import { playCompletionSound, playPopSound } from '../utils/audioSynth';
import { startExamSession, stopExamSession, useExamSession, requestLockdownFullscreen } from '../utils/examSession';

interface MaterialViewerProps {
  material: Material;
  category?: Category;
  subjectName?: string;
  isCompleted: boolean;
  onToggleCompleted: (materialId: string) => void;
  userNote?: string;
  onSaveNote?: (materialId: string, noteText: string) => void;
}

export const MaterialViewer: React.FC<MaterialViewerProps> = ({
  material,
  category,
  subjectName,
  isCompleted,
  onToggleCompleted,
}) => {
  const examSession = useExamSession();
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [showReflection, setShowReflection] = useState(true);

  // Sumatif Google Form Anti-Cheat Exam State
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [examTimeSeconds, setExamTimeSeconds] = useState(0);
  const [showFinishConfirmModal, setShowFinishConfirmModal] = useState(false);

  // Exam timer listener
  useEffect(() => {
    let interval: any;
    if (material.type === 'gform' && isExamStarted && !examSession.isTerminated) {
      interval = setInterval(() => {
        setExamTimeSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setExamTimeSeconds(0);
    }
    return () => clearInterval(interval);
  }, [material.type, isExamStarted, examSession.isTerminated]);

  // Sync active exam status with global examSession state manager
  useEffect(() => {
    if (material.type === 'gform' && (isExamStarted || isKioskMode)) {
      startExamSession(material.id, material.title, { enableLockdown: true });
    } else {
      stopExamSession();
    }
    return () => {
      stopExamSession();
    };
  }, [material.type, isExamStarted, isKioskMode, material.id, material.title]);

  // Reset local exam view if session is terminated due to max violations
  useEffect(() => {
    if (examSession.isTerminated) {
      setIsExamStarted(false);
      setIsKioskMode(false);
      exitFullscreenMode();
    }
  }, [examSession.isTerminated]);

  const requestFullscreenMode = () => {
    try {
      const docEl = document.documentElement as any;
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      } else if (docEl.msRequestFullscreen) {
        docEl.msRequestFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen request rejected or unsupported:', err);
    }
  };

  const exitFullscreenMode = () => {
    try {
      const doc = document as any;
      if (doc.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement) {
        if (doc.exitFullscreen) {
          doc.exitFullscreen().catch(() => {});
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        } else if (doc.msExitFullscreen) {
          doc.msExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Exit fullscreen failed:', err);
    }
  };

  // Automatically request fullscreen when Kiosk Mode is activated
  useEffect(() => {
    if (isKioskMode) {
      requestFullscreenMode();
    }
  }, [isKioskMode]);

  // Freeze background page scrolling during Kiosk Mode, active exam, or Focus Mode
  useEffect(() => {
    if (isKioskMode || isFocusMode || (material.type === 'gform' && isExamStarted)) {
      const originalOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, [isKioskMode, isFocusMode, isExamStarted, material.type]);

  // Handle Escape key to close focus mode
  useEffect(() => {
    if (!isFocusMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFocusMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode]);

  // Prevent accidental tab close or page reload during active exam
  useEffect(() => {
    if (material.type !== 'gform' || (!isExamStarted && !isKioskMode)) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Ujian sedang berlangsung! Yakin ingin keluar?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [material.type, isExamStarted, isKioskMode]);

  const isGoogleForm =
    material.type === 'gform' ||
    material.originalUrl?.includes('docs.google.com/forms') ||
    material.originalUrl?.includes('forms.gle') ||
    material.embedUrl?.includes('docs.google.com/forms') ||
    material.embedUrl?.includes('forms.gle');

  const formatTimer = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleFinishExam = () => {
    playCompletionSound();
    if (!isCompleted) {
      onToggleCompleted(material.id);
    }
    setIsExamStarted(false);
    setIsKioskMode(false);
    exitFullscreenMode();
    stopExamSession();
    setShowFinishConfirmModal(false);
  };

  const handleOpenFocusMode = () => {
    playPopSound();
    setIsFocusMode(true);
  };

  const handleToggleFullscreen = () => {
    const iframeContainer = document.getElementById(`material-frame-container-${material.id}`);
    if (iframeContainer) {
      if (!document.fullscreenElement) {
        iframeContainer.requestFullscreen().catch((err) => console.warn(err));
        setIsFullscreen(true);
      } else {
        document.exitFullscreen().catch((err) => console.warn(err));
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      
      {/* Material Top Header & Controls */}
      <div className="bg-white p-4 sm:p-5 lg:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border shadow-2xs ${
                material.type === 'gform'
                  ? 'bg-purple-50 text-purple-900 border-purple-300 font-extrabold'
                  : material.type === 'youtube'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : material.type === 'video'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : material.type === 'canva'
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : material.type === 'pdf'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              {material.type === 'gform' ? (
                <>
                  <ClipboardList className="w-4 h-4 text-purple-700 shrink-0" />
                  <span>Tes / Sumatif Google Form</span>
                </>
              ) : material.type === 'youtube' ? (
                <>
                  <Play className="w-4 h-4 fill-rose-600 text-rose-600 shrink-0" />
                  <span>Video YouTube</span>
                </>
              ) : material.type === 'video' ? (
                <>
                  <Video className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Video Drive / File</span>
                </>
              ) : material.type === 'canva' ? (
                <>
                  <Layers className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Canva Presentation</span>
                </>
              ) : material.type === 'pdf' ? (
                <>
                  <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Dokumen PDF</span>
                </>
              ) : (
                <>
                  <Presentation className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Google Slide / Doc</span>
                </>
              )}
            </span>

            {isCompleted && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Selesai Dikerjakan</span>
              </span>
            )}
          </div>

          <div className="bg-gradient-to-r from-indigo-50/90 via-slate-50/60 to-white/40 p-3.5 sm:p-4 rounded-2xl border border-indigo-100/90 border-l-4 border-l-indigo-600 shadow-2xs">
            <h2 className="font-heading font-black text-slate-950 text-xl sm:text-2xl lg:text-3xl tracking-tight leading-snug sm:leading-tight">
              {material.title}
            </h2>
          </div>
        </div>

        {/* Control Buttons & Automatic Status Indicator */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 w-full lg:w-auto flex-wrap sm:flex-nowrap">
          {!isGoogleForm ? (
            <button
              onClick={handleOpenFocusMode}
              className="flex-1 min-w-[100px] lg:flex-initial min-h-[42px] sm:min-h-[44px] px-3 sm:px-4 py-2 text-xs sm:text-sm font-black rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer text-center ring-2 ring-indigo-500/20 active:scale-95"
              title="Sembunyikan navigasi & gangguan untuk fokus membaca"
            >
              <Focus className="w-4 h-4 text-indigo-200 shrink-0" />
              <span className="font-extrabold text-xs sm:text-sm text-white tracking-wide whitespace-nowrap">Mode Fokus</span>
            </button>
          ) : (
            <button
              onClick={() => {
                playPopSound();
                setIsKioskMode(true);
                if (!isExamStarted) {
                  setIsExamStarted(true);
                }
                startExamSession(material.id, material.title, { enableLockdown: true });
                requestLockdownFullscreen();
              }}
              className="flex-1 min-w-[110px] lg:flex-initial min-h-[42px] sm:min-h-[44px] px-3 sm:px-4 py-2 text-xs sm:text-sm font-black rounded-xl bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer text-center ring-2 ring-purple-600/30 active:scale-95"
              title="Aktifkan Mode Kiosk Ujian layar penuh tanpa toolbar & navigasi keluar"
            >
              <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0" />
              <span className="font-extrabold text-xs sm:text-sm text-white tracking-wide whitespace-nowrap">
                <span className="sm:hidden">Mode Kiosk</span>
                <span className="hidden sm:inline">Mode Kiosk Ujian</span>
              </span>
            </button>
          )}

          {/* Automatic Progress Status Indicator (Non-clickable Badge) */}
          {isCompleted ? (
            <div 
              className="flex-1 min-w-[110px] lg:flex-initial min-h-[42px] sm:min-h-[44px] px-3 sm:px-4 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-2xs select-none"
              title="Materi ini telah tuntas diselesaikan"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="whitespace-nowrap tracking-wide">
                <span className="sm:hidden">Selesai ✓</span>
                <span className="hidden sm:inline">Status: Selesai ✓</span>
              </span>
            </div>
          ) : isGoogleForm ? (
            <div
              className="flex-1 min-w-[115px] lg:flex-initial min-h-[42px] sm:min-h-[44px] px-3 sm:px-4 py-2 rounded-xl bg-purple-50 text-purple-900 border border-purple-300 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-2xs select-none"
              title="Selesaikan ujian Google Form dan klik Selesai Ujian untuk otomatis menyelesaikan materi"
            >
              <Clock className="w-4 h-4 text-purple-600 shrink-0" />
              <span className="whitespace-nowrap tracking-wide">
                <span className="sm:hidden">Belum Selesai</span>
                <span className="hidden sm:inline">Belum Selesai (Ujian)</span>
              </span>
            </div>
          ) : (
            <div
              className="flex-1 min-w-[115px] lg:flex-initial min-h-[42px] sm:min-h-[44px] px-3 sm:px-4 py-2 rounded-xl bg-amber-50 text-amber-900 border border-amber-300 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-2xs select-none"
              title="Selesaikan Mini Kuis di bagian bawah materi ini untuk otomatis menandai selesai"
            >
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="whitespace-nowrap tracking-wide">
                <span className="sm:hidden">Belum Selesai</span>
                <span className="hidden sm:inline">Belum Selesai (Kuis)</span>
              </span>
            </div>
          )}

          {!isGoogleForm && (
            <a
              href={material.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-w-[100px] lg:flex-initial min-h-[42px] sm:min-h-[44px] px-3 sm:px-4 py-2 text-xs sm:text-sm font-black text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 hover:border-indigo-400 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-2xs text-center cursor-pointer ring-2 ring-slate-200/50 active:scale-95"
              title="Buka di tab baru / Google Drive / Canva"
            >
              <ExternalLink className="w-4 h-4 shrink-0 text-indigo-600" />
              <span className="font-extrabold text-xs sm:text-sm text-slate-900 tracking-wide whitespace-nowrap">
                <span className="sm:hidden">Tab Baru</span>
                <span className="hidden sm:inline">Buka di Tab Baru</span>
              </span>
            </a>
          )}
        </div>

      </div>

      {/* Focus Music Player Bar */}
      {material.type !== 'gform' && <FocusMusicBar />}

      {/* Special Sumatif Exam Intro Banner for Google Form */}
      {material.type === 'gform' && !isExamStarted && (
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 rounded-2xl p-5 sm:p-6 text-white border border-purple-500/30 shadow-xl space-y-5">
          <div className="flex items-center gap-3 border-b border-purple-500/20 pb-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-2xl border border-purple-400/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-purple-300 animate-pulse" />
            </div>
            <div>
              <span className="text-[11px] font-mono text-purple-300 uppercase font-bold tracking-wider">
                Halaman Ujian Sumatif (Sistem Anti-Curang)
              </span>
              <h3 className="text-base sm:text-lg font-black text-white leading-snug">
                {material.title}
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
              <h4 className="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Peraturan Security Ujian:</span>
              </h4>
              <ul className="space-y-1.5 text-slate-300 list-disc list-inside text-[11px] leading-relaxed">
                <li>Siswa wajib mengerjakan ujian langsung di dalam sistem ini.</li>
                <li><strong className="text-amber-300">Dilarang keluar/berpindah tab browser</strong> atau berpindah ke aplikasi lain.</li>
                <li>Sistem akan secara otomatis mencatat <strong className="text-rose-400">jumlah pelanggaran</strong> jika keluar halaman.</li>
                <li>Kerjakan dengan jujur, tertib, dan mandiri.</li>
              </ul>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-purple-300 flex items-center gap-1.5 text-xs">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>Kesiapan Sesi:</span>
                </h4>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  Google Form telah disiapkan di dalam aplikasi. Tekan tombol di bawah untuk membuka soal dalam Mode Kiosk Ujian terkunci.
                </p>
              </div>

              <button
                onClick={() => {
                  playPopSound();
                  setIsExamStarted(true);
                  setIsKioskMode(true);
                  startExamSession(material.id, material.title, { enableLockdown: true });
                  requestLockdownFullscreen();
                }}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-purple-950/50 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-purple-200" />
                <span>Mulai Ujian Mode Kiosk</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Exam Control Security Bar (When Google Form exam is active) */}
      {material.type === 'gform' && isExamStarted && (
        <div className="bg-slate-900 border border-purple-500/40 rounded-2xl p-2.5 sm:p-3.5 text-white shadow-lg space-y-2.5">
          {/* Top Row: Info & Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-1.5 sm:p-2 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-xl shrink-0">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse text-purple-400" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider font-bold bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30 shrink-0">
                    <span className="hidden sm:inline">Ujian Sumatif Aktif</span>
                    <span className="sm:hidden">Ujian Aktif</span>
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-200 mt-0.5 truncate max-w-[180px] sm:max-w-xs">
                  {material.title}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 justify-end flex-wrap">
              <button
                onClick={() => {
                  playPopSound();
                  setIsKioskMode(true);
                  requestFullscreenMode();
                }}
                className="px-2.5 sm:px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-200 shrink-0" />
                <span>Mode Kiosk</span>
              </button>

              <button
                onClick={handleToggleFullscreen}
                className="px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 hidden sm:flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                <Maximize2 className="w-3.5 h-3.5 shrink-0" />
                <span>Layar Penuh</span>
              </button>

              <button
                onClick={() => {
                  playPopSound();
                  setShowFinishConfirmModal(true);
                }}
                className="px-2.5 sm:px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-md flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-100 shrink-0" />
                <span>Selesai Ujian</span>
              </button>
            </div>
          </div>

          {/* Bottom Telemetry Bar: Sejajar & Rapi */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[10px] font-mono flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-emerald-300 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-lg flex items-center gap-1 shrink-0 font-bold">
                <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>Waktu: <strong className="text-emerald-200">{formatTimer(examTimeSeconds)}</strong></span>
              </span>

              <div
                className={`px-2 py-0.5 rounded-lg border font-bold flex items-center gap-1 shrink-0 ${
                  examSession.violationsCount === 0
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                    : 'bg-rose-950/90 text-rose-300 border-rose-800/80 animate-pulse'
                }`}
              >
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>Pelanggaran Tab: <strong className="font-black">{examSession.violationsCount}/3</strong></span>
              </div>
            </div>

            <div className="text-slate-400 text-[10px] hidden md:flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-purple-400" />
              <span>Sistem Pengawasan Aktif</span>
            </div>
          </div>
        </div>
      )}

      {/* FULL-SCREEN LOCKED KIOSK MODE OVERLAY */}
      {isKioskMode && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col w-screen h-screen overflow-hidden select-none animate-in fade-in duration-200">
          {/* Kiosk Top Navigation / Security Bar */}
          <div className="bg-slate-900 border-b border-purple-500/40 px-2.5 sm:px-4 py-2 text-white shrink-0 shadow-lg select-none">
            {/* Primary Row: Title & Selesai Ujian Button */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 sm:w-9 sm:h-9 bg-purple-500/20 border border-purple-500/40 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-purple-300 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] sm:text-[10px] font-mono font-extrabold bg-purple-500/30 text-purple-200 border border-purple-400/40 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                      <span className="hidden sm:inline">MODE KIOSK UJIAN TERKUNCI</span>
                      <span className="sm:hidden">KIOSK TERKUNCI</span>
                    </span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-100 truncate max-w-[130px] sm:max-w-xs md:max-w-md mt-0.5">
                    {material.title}
                  </h3>
                </div>
              </div>

              {/* Right Action: Selesai Ujian Button (ALWAYS VISIBLE & UNTRUNCATED) */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => {
                    playPopSound();
                    setShowFinishConfirmModal(true);
                  }}
                  className="px-2.5 sm:px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-extrabold rounded-xl shadow-md transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-100 shrink-0" />
                  <span>Selesai Ujian</span>
                </button>
              </div>
            </div>

            {/* Telemetry Row (Timer & Pelanggaran Status - Sejajar & Rapi) */}
            {material.type === 'gform' && (
              <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[10px] font-mono">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {/* Timer Chip */}
                  {isExamStarted && (
                    <div className="text-emerald-300 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-lg flex items-center gap-1 shrink-0 font-bold">
                      <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>Waktu: <strong className="text-emerald-200">{formatTimer(examTimeSeconds)}</strong></span>
                    </div>
                  )}

                  {/* Pelanggaran Chip */}
                  <div
                    className={`px-2 py-0.5 rounded-lg border font-bold flex items-center gap-1 shrink-0 ${
                      examSession.violationsCount === 0
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                        : 'bg-rose-950/90 text-rose-300 border-rose-800/80 animate-pulse'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>Pelanggaran Tab: <strong className="font-black">{examSession.violationsCount}/3</strong></span>
                  </div>
                </div>

                <div className="hidden md:flex items-center gap-1 text-slate-400 text-[10px]">
                  <ShieldAlert className="w-3 h-3 text-purple-400" />
                  <span>Sistem Anti-Curang Aktif</span>
                </div>
              </div>
            )}
          </div>

          {/* Kiosk Embedded Iframe Area */}
          <div
            className="w-full flex-1 relative bg-slate-900"
            onContextMenu={(e) => {
              if (material.type === 'gform') e.preventDefault();
            }}
            onCopy={(e) => {
              if (material.type === 'gform') e.preventDefault();
            }}
            onDragStart={(e) => {
              if (material.type === 'gform') e.preventDefault();
            }}
          >
            <iframe
              src={material.embedUrl}
              className="w-full h-full border-none bg-white"
              title={material.title}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Embedded Viewer Container (Standard View) */}
      {(material.type !== 'gform' || isExamStarted) && !isKioskMode && (
        <div className="w-full space-y-2.5">
          
          <div
            id={`material-frame-container-${material.id}`}
            onContextMenu={(e) => {
              if (material.type === 'gform') e.preventDefault();
            }}
            onCopy={(e) => {
              if (material.type === 'gform') e.preventDefault();
            }}
            className="relative w-full transition-all duration-300 rounded-2xl border border-slate-300 shadow-sm bg-slate-950 overflow-hidden flex flex-col h-[52vh] sm:h-[62vh] md:h-[68vh] min-h-[380px] sm:min-h-[520px] md:min-h-[640px]"
          >
            {/* Header Bar */}
            <div className="bg-slate-900 text-slate-300 px-3.5 py-2 border-b border-slate-800 flex items-center justify-between text-xs shrink-0 select-none">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <span className="font-mono text-[11px] truncate max-w-[200px] sm:max-w-xs text-slate-400 ml-1">
                  {material.type === 'gform' ? 'Google Form Ujian Sumatif (Embedded Kiosk Mode)' : `Pratinjau Materi (${material.type})`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {material.type === 'gform' && (
                  <button
                    onClick={() => {
                      playPopSound();
                      setIsKioskMode(true);
                    }}
                    className="hover:text-white flex items-center gap-1 bg-purple-900/80 hover:bg-purple-800 text-purple-200 border border-purple-700 px-2.5 py-1 rounded-lg transition-colors text-[11px] font-bold"
                    title="Buka tampilan Kiosk tanpa toolbar"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Mode Kiosk</span>
                  </button>
                )}

                <button
                  onClick={handleToggleFullscreen}
                  className="hover:text-white flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors text-[11px]"
                  title="Tampilkan materi layar penuh"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Layar Penuh</span>
                </button>
              </div>
            </div>

            {/* Embedded Iframe with sandbox protection against top navigation */}
            <iframe
              src={material.embedUrl}
              className="w-full h-full flex-1 border-none bg-white"
              title={material.title}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Reflection / Self-Check Questions Accordion */}
      {material.reflectionQuestions && material.reflectionQuestions.length > 0 && (
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-5 space-y-3">
          <button
            onClick={() => setShowReflection(!showReflection)}
            className="w-full flex items-center justify-between text-left min-h-[40px]"
          >
            <div className="flex items-center gap-2 text-indigo-950 font-bold text-sm">
              <HelpCircle className="w-5 h-5 text-indigo-600" />
              <span>Pertanyaan Refleksi & Pemahaman</span>
            </div>
            {showReflection ? (
              <ChevronUp className="w-4 h-4 text-indigo-600" />
            ) : (
              <ChevronDown className="w-4 h-4 text-indigo-600" />
            )}
          </button>

          {showReflection && (
            <div className="pt-2 border-t border-indigo-100/80 space-y-2">
              <p className="text-xs text-indigo-800">
                Gunakan pertanyaan ini untuk menguji sejauh mana Anda memahami materi di atas:
              </p>
              <ul className="space-y-2">
                {material.reflectionQuestions.map((q, idx) => (
                  <li
                    key={idx}
                    className="p-3.5 bg-white rounded-xl border border-indigo-100 text-xs font-medium text-slate-800 flex items-start gap-2.5 shadow-2xs"
                  >
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      {idx + 1}
                    </span>
                    <span className="pt-0.5 leading-relaxed">{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Mini Kuis & Flashcard Interaktif (Hanya jika bukan Google Form) */}
      {material.type !== 'gform' && !material.originalUrl?.includes('docs.google.com/forms') && !material.originalUrl?.includes('forms.gle') && (
        <MiniQuizSection
          material={material}
          categoryName={category?.title}
          subjectName={subjectName}
          isCompleted={isCompleted}
          onToggleCompleted={onToggleCompleted}
        />
      )}

      {/* Fullscreen Distraction-Free Focus Mode (Reading Mode) - Optimized for Mobile & Desktop */}
      {isFocusMode && createPortal(
        <div 
          id="focus-reading-mode-portal"
          className="fixed inset-0 z-[99990] bg-slate-950 flex flex-col text-slate-100 animate-in fade-in duration-200 p-1.5 sm:p-3 sm:p-4"
        >
          {/* Top Bar inside Focus Mode - Compact, clean, and space-saving */}
          <div className="bg-slate-900/95 border border-slate-800 rounded-xl sm:rounded-2xl p-2 sm:p-3 mb-1.5 sm:mb-2.5 flex items-center justify-between gap-2 shrink-0 shadow-xl backdrop-blur-md">
            
            {/* Left: Indicator & Material Title */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <Focus className="w-4 h-4 sm:w-4.5 sm:h-4.5 animate-pulse" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30 shrink-0">
                    Mode Fokus
                  </span>
                  {isCompleted && (
                    <span className="text-[9px] sm:text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 shrink-0">
                      Selesai
                    </span>
                  )}
                </div>
                <h3 
                  className="font-extrabold text-xs sm:text-sm text-white truncate max-w-[130px] xs:max-w-[200px] sm:max-w-md mt-0.5 leading-tight"
                  title={material.title}
                >
                  {material.title}
                </h3>
              </div>
            </div>

            {/* Right: Quick Controls & Exit Button */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Status Badge */}
              <div
                className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-bold rounded-lg sm:rounded-xl border flex items-center gap-1 select-none shrink-0 ${
                  isCompleted
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : isGoogleForm
                    ? 'bg-purple-950/70 text-purple-200 border-purple-800/80'
                    : 'bg-amber-950/70 text-amber-200 border-amber-800/80'
                }`}
                title={isCompleted ? 'Status: Selesai' : 'Belum Selesai'}
              >
                <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isCompleted ? 'text-emerald-400' : isGoogleForm ? 'text-purple-400' : 'text-amber-400'}`} />
                <span className="hidden sm:inline">
                  {isCompleted
                    ? 'Selesai ✓'
                    : isGoogleForm
                    ? 'Ujian'
                    : 'Belum'}
                </span>
              </div>

              {/* Fullscreen Toggle */}
              <button
                type="button"
                onClick={handleToggleFullscreen}
                className="p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-lg sm:rounded-xl border border-slate-700/80 flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                title="Layar Penuh"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Layar Penuh</span>
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsFocusMode(false)}
                className="px-2.5 sm:px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs rounded-lg sm:rounded-xl shadow-xs flex items-center gap-1 transition-all cursor-pointer shrink-0 active:scale-95"
                title="Tutup Mode Fokus (Esc)"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Tutup</span>
                <span className="hidden sm:inline">Mode Fokus</span>
              </button>
            </div>

          </div>

          {/* Main Focus Reading Container */}
          <div className="flex-1 w-full relative overflow-hidden bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl shadow-2xl">
            <iframe
              src={material.embedUrl}
              className="w-full h-full border-none bg-white"
              title={`${material.title} (Focus Mode)`}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>

        </div>,
        document.body
      )}

      {/* FINISH EXAM CONFIRMATION MODAL */}
      {showFinishConfirmModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-purple-500/40 text-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center gap-3 border-b border-purple-500/20 pb-4">
              <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Konfirmasi Selesai Ujian</h3>
                <p className="text-xs text-slate-400">Pemeriksaan Akhir Sesi Ujian</p>
              </div>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
              <p className="font-bold text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Perhatian Sebelum Keluar:</span>
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                <li>Pastikan Anda telah menekan tombol <strong className="text-emerald-400">Kirim (Submit)</strong> di dalam formulir Google Form.</li>
                <li>Durasi pengerjaan: <strong className="text-purple-300">{formatTimer(examTimeSeconds)}</strong></li>
                <li>Catatan pelanggaran: <strong className={examSession.violationsCount === 0 ? "text-emerald-400" : "text-rose-400"}>{examSession.violationsCount}/3</strong></li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  playPopSound();
                  setShowFinishConfirmModal(false);
                }}
                className="px-4 py-2.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
              >
                Kembali ke Soal
              </button>
              <button
                onClick={handleFinishExam}
                className="px-4 py-2.5 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Ya, Selesai Ujian</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};


