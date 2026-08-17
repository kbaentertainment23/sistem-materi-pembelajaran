import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  LogOut, 
  Sparkles, 
  CheckCircle2, 
  Award, 
  LayoutDashboard, 
  User, 
  BookOpen,
  GraduationCap
} from 'lucide-react';
import { AuthSession } from '../types';
import { confirmExitExam } from '../utils/examSession';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  authSession: AuthSession | null;
  isAdmin?: boolean;
  completedCount: number;
  totalMaterialsCount: number;
  onLogout: () => void;
  onOpenAdminDashboard?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  authSession,
  isAdmin = false,
  completedCount,
  totalMaterialsCount,
  onLogout,
  onOpenAdminDashboard,
}) => {
  // Freeze screen scrolling completely when profile modal is open
  useEffect(() => {
    if (!isOpen) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.touchAction = originalBodyTouchAction;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !authSession) return null;

  const progressPercent = totalMaterialsCount > 0 ? Math.round((completedCount / totalMaterialsCount) * 100) : 0;

  const getAvatarLetter = () => {
    if (authSession.role === 'student' && authSession.student?.nama) {
      return authSession.student.nama.charAt(0).toUpperCase();
    }
    if (authSession.role === 'teacher' && authSession.teacher?.name) {
      return authSession.teacher.name.charAt(0).toUpperCase();
    }
    return 'A';
  };

  const getFullName = () => {
    if (authSession.role === 'student' && authSession.student) {
      return authSession.student.nama;
    }
    if (authSession.role === 'teacher' && authSession.teacher) {
      return authSession.teacher.name;
    }
    return 'Administrator Pengelola';
  };

  const modalContent = (
    <div 
      id="user-profile-modal-overlay"
      className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-labelledby="user-profile-title"
    >
      {/* Modal Card Container */}
      <div 
        id="user-profile-modal-card"
        className="relative w-full max-w-[380px] sm:max-w-[430px] bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-left my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 relative overflow-hidden">
          {/* Subtle Ambient Glows */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-sky-500/10 rounded-full blur-xl pointer-events-none" />

          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              {/* Avatar Letter */}
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-lg border-2 border-white/20 shrink-0 mt-0.5 ${
                authSession.role === 'student'
                  ? 'bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-700'
                  : authSession.role === 'teacher'
                  ? 'bg-gradient-to-tr from-indigo-700 to-purple-800'
                  : 'bg-gradient-to-tr from-amber-500 to-orange-600'
              }`}>
                {getAvatarLetter()}
              </div>

              {/* Identity Header Info */}
              <div className="min-w-0 flex-1">
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-extrabold text-amber-300 bg-amber-400/20 border border-amber-300/30 px-2.5 py-0.5 rounded-full mb-1.5 backdrop-blur-xs">
                  <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span>
                    {authSession.role === 'student'
                      ? 'Akun Siswa Terdaftar'
                      : authSession.role === 'teacher'
                      ? 'Akun Guru Pengampu'
                      : 'Akun Administrator'}
                  </span>
                </span>

                {/* Full Name Display */}
                <h3 
                  id="user-profile-title"
                  className="font-black text-base sm:text-lg text-white leading-snug break-words whitespace-normal"
                >
                  {getFullName()}
                </h3>
              </div>
            </div>

            {/* Close Button */}
            <button
              id="close-user-profile-btn"
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              aria-label="Tutup Profil"
              title="Tutup Profil (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Details */}
        <div className="p-4 sm:p-5 space-y-3.5 max-h-[calc(85vh-120px)] overflow-y-auto">
          {authSession.role === 'student' && authSession.student ? (
            <>
              {/* Full Name Explicit Details Card */}
              <div className="bg-slate-50 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/80">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  Nama Lengkap Siswa
                </span>
                <span className="font-black text-slate-900 text-sm sm:text-base leading-snug break-words block">
                  {authSession.student.nama}
                </span>
              </div>

              {/* Class & Absen Grid */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Kelas
                  </span>
                  <span className="font-black text-slate-800 text-sm sm:text-base">
                    {authSession.student.kelas}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    No. Absen
                  </span>
                  <span className="font-black text-slate-800 text-sm sm:text-base">
                    {authSession.student.noAbsen || '-'}
                  </span>
                </div>
              </div>

              {/* NISN Details */}
              {authSession.student.nisn && (
                <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      NISN Siswa
                    </span>
                    <span className="font-black text-slate-800 font-mono text-xs sm:text-sm">
                      {authSession.student.nisn}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/90 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Terverifikasi</span>
                  </span>
                </div>
              )}

              {/* Learning Progress Summary */}
              <div className="bg-indigo-50/70 p-3 sm:p-3.5 rounded-xl border border-indigo-100 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-950">
                  <span className="flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Progres Belajar Mandiri</span>
                  </span>
                  <span className="text-indigo-700 font-black text-xs sm:text-sm">{progressPercent}%</span>
                </div>
                <div className="w-full bg-white rounded-full h-2 overflow-hidden border border-indigo-200/80 shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 text-right">
                  {completedCount} dari {totalMaterialsCount} materi telah diselesaikan
                </div>
              </div>
            </>
          ) : (authSession.role === 'teacher' || authSession.role === 'admin' || isAdmin) ? (
            <div className="space-y-2.5">
              {onOpenAdminDashboard && (
                <button
                  id="open-admin-dashboard-from-profile"
                  type="button"
                  onClick={() => {
                    onClose();
                    confirmExitExam(onOpenAdminDashboard);
                  }}
                  className="w-full py-2.5 sm:py-3 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Buka Dashboard Pengelola</span>
                </button>
              )}
            </div>
          ) : null}

          {/* Divider */}
          <div className="h-px bg-slate-200 w-full my-1" />

          {/* Logout Button */}
          <button
            id="profile-logout-btn"
            type="button"
            onClick={() => {
              onClose();
              confirmExitExam(onLogout);
            }}
            className="w-full py-2.5 sm:py-3 px-3 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 hover:text-rose-800 font-bold text-xs sm:text-sm rounded-xl sm:rounded-2xl border border-rose-200 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
          >
            <LogOut className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Keluar Akun ({authSession.role === 'student' ? 'Siswa' : authSession.role === 'teacher' ? 'Guru' : 'Admin'})</span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
