import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  HelpCircle,
  Sparkles,
  CheckCircle2,
  XCircle,
  Share2,
  RotateCcw,
  UserCheck,
  Award,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Flame,
  Zap,
  GraduationCap,
  Layers,
  Edit2,
  Loader2,
  Wand2,
  Image as ImageIcon,
  Download,
  FileCheck,
  ShieldCheck,
  Volume2,
  VolumeX,
  Lightbulb,
  Clock,
  Bot,
  Trophy,
  Play,
  User,
} from 'lucide-react';
import { Material } from '../types';
import {
  getDefaultQuizQuestions,
  getDefaultFlashcards,
  fetchAIGeneratedQuiz,
  shuffleQuizQuestions,
  formatTargetGradeLabel,
} from '../utils/quizGenerator';
import { playCompletionSound, playPopSound } from '../utils/audioSynth';
import { generateResultImageCard } from '../utils/certificateGenerator';
import {
  getGamificationState,
  addExp,
  recordQuizCompletion,
  recordFlashcardFlip,
  getCurrentLevelInfo,
  ALL_BADGES,
  playAudioFx,
  BadgeInfo,
} from '../utils/gamification';
import {
  fetchAIAnalogy,
  fetchAIHint,
  speakText,
  stopSpeech,
} from '../utils/aiTutor';

interface MiniQuizSectionProps {
  material: Material;
  categoryName?: string;
  subjectName?: string;
  isCompleted?: boolean;
  onToggleCompleted?: (materialId: string) => void;
}

export const MiniQuizSection: React.FC<MiniQuizSectionProps> = ({
  material,
  categoryName,
  subjectName,
  isCompleted = false,
  onToggleCompleted,
}) => {
  const [activeTab, setActiveTab] = useState<'quiz' | 'flashcards'>('quiz');

  // Authenticated Student identity state (automatically resolved from account)
  const [studentInfo, setStudentInfo] = useState<{
    name: string;
    className: string;
    absen: string;
    nisn?: string;
    role?: string;
  }>(() => {
    try {
      const raw = localStorage.getItem('sistem_materi_auth_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.student) {
          return {
            name: parsed.student.nama || 'Siswa',
            className: parsed.student.kelas || 'Kelas',
            absen: parsed.student.noAbsen || '-',
            nisn: parsed.student.nisn || '',
            role: 'student',
          };
        }
        if (parsed.teacher) {
          return {
            name: parsed.teacher.name || 'Guru',
            className: 'Guru Pengampu',
            absen: '-',
            nisn: '',
            role: 'teacher',
          };
        }
        if (parsed.role === 'admin') {
          return {
            name: 'Administrator',
            className: 'Admin',
            absen: '-',
            nisn: '',
            role: 'admin',
          };
        }
      }
      const savedName = localStorage.getItem('simpel_student_name');
      const savedClass = localStorage.getItem('simpel_student_class');
      const savedAbsen = localStorage.getItem('simpel_student_absen');
      if (savedName) {
        return {
          name: savedName,
          className: savedClass || 'Kelas',
          absen: savedAbsen || '-',
          nisn: '',
          role: 'student',
        };
      }
    } catch {}
    return {
      name: 'Siswa Pembelajar',
      className: 'Kelas Siswa',
      absen: '01',
      nisn: '',
      role: 'student',
    };
  });

  const studentName = studentInfo.name;
  const studentClass = studentInfo.className;
  const studentAbsen = studentInfo.absen;

  // Quiz active state
  const [isQuizStarted, setIsQuizStarted] = useState(false);

  // Dynamic Quiz & Flashcard state
  const [questions, setQuestions] = useState(() => getDefaultQuizQuestions(material, categoryName, subjectName));
  const [flashcards, setFlashcards] = useState(() => getDefaultFlashcards(material, categoryName, subjectName));
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageDownloaded, setImageDownloaded] = useState(false);

  // Flashcard state
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Interactive Config parameters for current material
  const cfg = material.interactiveConfig || {};
  const enableGamification = cfg.enableGamification ?? true;
  const enableTimeAttack = cfg.enableTimeAttack ?? false;
  const timeAttackSeconds = cfg.timeAttackSeconds || 30;
  const enableLifelines = cfg.enableLifelines ?? true;
  const enableAITutor = cfg.enableAITutor ?? true;

  // Gamification state
  const [gamificationState, setGamificationState] = useState(() => getGamificationState());
  const [showBadgesModal, setShowBadgesModal] = useState(false);
  const [newEarnedBadges, setNewEarnedBadges] = useState<BadgeInfo[]>([]);

  // Time Attack Timer State
  const [timeLeft, setTimeLeft] = useState(timeAttackSeconds);

  // Lifelines State (50:50 & AI Hint)
  const [usedFiftyFifty, setUsedFiftyFifty] = useState<Record<number, boolean>>({});
  const [disabledOptions, setDisabledOptions] = useState<number[]>([]);
  const [showAIHintModal, setShowAIHintModal] = useState(false);
  const [aiHintText, setAiHintText] = useState<string | null>(null);
  const [loadingHint, setLoadingHint] = useState(false);

  // AI Tutor & Audio State
  const [showAnalogiModal, setShowAnalogiModal] = useState(false);
  const [analogiText, setAnalogiText] = useState<string | null>(null);
  const [loadingAnalogi, setLoadingAnalogi] = useState(false);
  const [isSpeakingAudio, setIsSpeakingAudio] = useState(false);

  // Listen to session storage changes
  useEffect(() => {
    const updateStudentData = () => {
      try {
        const raw = localStorage.getItem('sistem_materi_auth_session');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.student) {
            setStudentInfo({
              name: parsed.student.nama || 'Siswa',
              className: parsed.student.kelas || 'Kelas',
              absen: parsed.student.noAbsen || '-',
              nisn: parsed.student.nisn || '',
              role: 'student',
            });
            return;
          }
          if (parsed.teacher) {
            setStudentInfo({
              name: parsed.teacher.name || 'Guru',
              className: 'Guru Pengampu',
              absen: '-',
              nisn: '',
              role: 'teacher',
            });
            return;
          }
          if (parsed.role === 'admin') {
            setStudentInfo({
              name: 'Administrator',
              className: 'Admin',
              absen: '-',
              nisn: '',
              role: 'admin',
            });
            return;
          }
        }
      } catch {}
    };

    updateStudentData();
    window.addEventListener('storage', updateStudentData);
    return () => window.removeEventListener('storage', updateStudentData);
  }, []);

  // Time Attack Countdown Effect
  useEffect(() => {
    if (!enableTimeAttack || !isQuizStarted || isAnswered || isQuizCompleted || activeTab !== 'quiz') return;

    setTimeLeft(timeAttackSeconds);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!isAnswered) {
            setIsAnswered(true);
            setSelectedOption(-1);
            setUserAnswers((p) => [...p, -1]);
            playAudioFx('wrong');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentQuestionIndex, isAnswered, isQuizCompleted, activeTab, enableTimeAttack, isQuizStarted, timeAttackSeconds]);

  // Reset quiz state when material or topic changes
  useEffect(() => {
    setQuestions(getDefaultQuizQuestions(material, categoryName, subjectName));
    setFlashcards(getDefaultFlashcards(material, categoryName, subjectName));
    handleRestartQuiz();
  }, [material.id, categoryName, subjectName]);

  const handleGenerateAIQuiz = async () => {
    playPopSound();
    setIsGeneratingAI(true);

    const contextDesc = categoryName
      ? `Topik "${categoryName}" - Materi "${material.title}"`
      : `Materi "${material.title}"`;

    const gradeLabel = formatTargetGradeLabel(material.targetGrade);

    setAiMessage(`AI Gemini sedang menyusun 10 soal kuis & flashcard terkalibrasi untuk ${gradeLabel} (${contextDesc})...`);

    const result = await fetchAIGeneratedQuiz(material, categoryName, subjectName);
    setIsGeneratingAI(false);

    if (result && result.quizQuestions.length > 0) {
      setQuestions(shuffleQuizQuestions(result.quizQuestions));
      setFlashcards(result.flashcards);
      handleRestartQuiz();
      playCompletionSound();
      setAiMessage(`✨ Berhasil! 10 soal kuis & flashcard terkalibrasi untuk ${gradeLabel} telah dibuat oleh AI.`);
      setTimeout(() => setAiMessage(null), 5000);
    } else {
      setAiMessage(`ℹ️ Menggunakan 10 soal standar spesifik untuk ${contextDesc}.`);
      setTimeout(() => setAiMessage(null), 5000);
    }
  };

  const handleStartQuiz = () => {
    playPopSound();
    setQuestions((prev) => shuffleQuizQuestions(prev));
    setIsQuizStarted(true);
  };

  // Trigger celebratory fireworks animation
  const triggerCelebration = (intense = false) => {
    try {
      if (intense) {
        // Grand finale fireworks burst
        const count = 200;
        const defaults = { origin: { y: 0.7 } };

        function fire(particleRatio: number, opts: confetti.Options) {
          confetti({
            ...defaults,
            ...opts,
            particleCount: Math.floor(count * particleRatio),
          });
        }

        fire(0.25, {
          spread: 26,
          startVelocity: 55,
        });
        fire(0.2, {
          spread: 60,
        });
        fire(0.35, {
          spread: 100,
          decay: 0.91,
          scalar: 0.8,
        });
        fire(0.1, {
          spread: 120,
          startVelocity: 25,
          decay: 0.92,
          scalar: 1.2,
        });
        fire(0.1, {
          spread: 120,
          startVelocity: 45,
        });
      } else {
        // Single correct answer fireworks burst
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'],
        });
      }
    } catch {
      // Ignore if confetti not available
    }
  };

  const handleSelectOption = (index: number) => {
    if (isAnswered) return;

    setSelectedOption(index);
    setIsAnswered(true);

    const currentQ = questions[currentQuestionIndex];
    const isCorrect = index === currentQ.correctAnswerIndex;

    setUserAnswers((prev) => [...prev, index]);

    if (isCorrect) {
      setScore((prev) => prev + 1);
      playCompletionSound();
      triggerCelebration(false);
      if (enableGamification) {
        const { newState } = addExp(15);
        setGamificationState(newState);
      }
    } else {
      playPopSound();
      playAudioFx('wrong');
    }
  };

  const handleNextQuestion = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    stopSpeech();
    setIsSpeakingAudio(false);
    playPopSound();
    setDisabledOptions([]);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setIsQuizCompleted(true);
      playCompletionSound();
      triggerCelebration(true);

      if (enableGamification) {
        const { state, newBadges } = recordQuizCompletion(score, questions.length, enableTimeAttack);
        const bonusExp = score === questions.length ? 100 : 50;
        const { newState } = addExp(bonusExp);
        setGamificationState(newState);
        if (newBadges.length > 0) {
          setNewEarnedBadges(newBadges);
        }
      }

      // Automatically mark material as completed when finishing quiz
      if (onToggleCompleted && !isCompleted) {
        onToggleCompleted(material.id);
      }
    }
  };

  const handleRestartQuiz = () => {
    stopSpeech();
    setIsSpeakingAudio(false);
    setQuestions((prev) => shuffleQuizQuestions(prev));
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setIsQuizCompleted(false);
    setUserAnswers([]);
    setShowReview(false);
    setUsedFiftyFifty({});
    setDisabledOptions([]);
    setIsQuizStarted(false);
  };

  const handlePlayAgain = async () => {
    stopSpeech();
    setIsSpeakingAudio(false);
    playPopSound();

    // Reset quiz state immediately to start screen
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setIsQuizCompleted(false);
    setUserAnswers([]);
    setShowReview(false);
    setUsedFiftyFifty({});
    setDisabledOptions([]);
    setIsQuizStarted(true);

    // Otomatis buat paket soal baru dengan AI Gemini
    setIsGeneratingAI(true);
    const contextDesc = categoryName
      ? `Topik "${categoryName}" - Materi "${material.title}"`
      : `Materi "${material.title}"`;
    const gradeLabel = formatTargetGradeLabel(material.targetGrade);

    setAiMessage(`AI Gemini sedang menyusun paket soal kuis baru untuk ${gradeLabel} (${contextDesc})...`);

    try {
      const result = await fetchAIGeneratedQuiz(material, categoryName, subjectName);
      if (result && result.quizQuestions.length > 0) {
        setQuestions(shuffleQuizQuestions(result.quizQuestions));
        setFlashcards(result.flashcards);
        playCompletionSound();
        setAiMessage(`✨ Paket soal kuis baru berhasil dibuat oleh AI! Selamat mengerjakan.`);
        setTimeout(() => setAiMessage(null), 4000);
      } else {
        setQuestions((prev) => shuffleQuizQuestions(prev));
      }
    } catch {
      setQuestions((prev) => shuffleQuizQuestions(prev));
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // 50:50 Lifeline Handler
  const handleUseFiftyFifty = () => {
    if (usedFiftyFifty[currentQuestionIndex] || isAnswered) return;
    playPopSound();
    const currentQ = questions[currentQuestionIndex];
    const correctIdx = currentQ.correctAnswerIndex;
    const wrongIndices = currentQ.options
      .map((_, i) => i)
      .filter((i) => i !== correctIdx);

    const shuffledWrong = wrongIndices.sort(() => 0.5 - Math.random());
    const toDisable = shuffledWrong.slice(0, 2);
    setDisabledOptions(toDisable);
    setUsedFiftyFifty((prev) => ({ ...prev, [currentQuestionIndex]: true }));
  };

  // AI Hint Lifeline Handler
  const handleGetAIHint = async () => {
    if (isAnswered) return;
    playPopSound();
    setLoadingHint(true);
    setShowAIHintModal(true);
    const hint = await fetchAIHint(questions[currentQuestionIndex].question, questions[currentQuestionIndex].options);
    setAiHintText(hint);
    setLoadingHint(false);
  };

  // AI Tutor Analogi Handler
  const handleGetAnalogi = async () => {
    playPopSound();
    setShowAnalogiModal(true);
    setLoadingAnalogi(true);
    const currentQ = questions[currentQuestionIndex];
    const analogy = await fetchAIAnalogy(currentQ.question, currentQ.options);
    setAnalogiText(analogy);
    setLoadingAnalogi(false);
  };

  // TTS Voice Handler
  const handleToggleTTS = (textToSpeak: string) => {
    if (isSpeakingAudio) {
      stopSpeech();
      setIsSpeakingAudio(false);
    } else {
      const success = speakText(textToSpeak, () => setIsSpeakingAudio(false));
      if (success) setIsSpeakingAudio(true);
    }
  };

  const finalScorePercent = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  const handleDownloadResultImage = async () => {
    playPopSound();
    setIsGeneratingImage(true);

    try {
      const dataUrl = await generateResultImageCard({
        studentName: studentName.trim(),
        studentClass: studentClass.trim(),
        studentAbsen: studentAbsen.trim(),
        materialTitle: material.title,
        subjectName: subjectName || '',
        categoryName: categoryName || '',
        score,
        totalQuestions: questions.length,
        scorePercent: finalScorePercent,
        completionDate: new Date().toLocaleString('id-ID', {
          dateStyle: 'full',
          timeStyle: 'short',
        }),
      });

      if (dataUrl) {
        const link = document.createElement('a');
        const cleanName = (studentName || 'Siswa').replace(/[^a-zA-Z0-9]/g, '_');
        link.download = `Kartu_Hasil_MiniKuis_${cleanName}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setImageDownloaded(true);
        setTimeout(() => setImageDownloaded(false), 6000);
      }
    } catch (err) {
      console.error('Gagal membuat gambar kartu hasil:', err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs p-3.5 sm:p-5 md:p-6 space-y-4 sm:space-y-5 min-w-0 max-w-full overflow-hidden">
      
      {/* Header & Mode Switcher Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 pb-3.5 sm:pb-4 border-b border-slate-100">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5 sm:mt-0">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
                Mini Kuis & Flashcard
              </h3>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                Latihan Mandiri
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0 inline-flex items-center gap-1">
                <GraduationCap className="w-3 h-3 text-indigo-600" />
                <span>Target: {formatTargetGradeLabel(material.targetGrade)}</span>
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-normal mt-0.5">
              Uji pemahamanmu setelah membaca materi. Hasil kuis dapat dibagikan langsung!
            </p>
          </div>
        </div>

        {/* Mode Switcher & AI Generator Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={handleGenerateAIQuiz}
            disabled={isGeneratingAI}
            className="w-full sm:w-auto px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-xs disabled:opacity-50 shrink-0"
            title="Sistem AI Gemini akan menyusun 10 soal kuis pilihan ganda & flashcard baru berdasarkan materi ini"
          >
            {isGeneratingAI ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-200" />
            ) : (
              <Wand2 className="w-3.5 h-3.5 text-amber-300" />
            )}
            <span>{isGeneratingAI ? 'AI Menyusun...' : 'Buat Soal AI (10 Soal)'}</span>
          </button>

          <div className="grid grid-cols-2 sm:flex items-center gap-1 bg-slate-100 p-1 rounded-xl sm:rounded-2xl w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('quiz')}
              className={`px-3.5 py-2 min-h-[40px] sm:min-h-[44px] rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'quiz'
                  ? 'bg-white text-indigo-700 shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Mini Kuis ({questions.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('flashcards')}
              className={`px-3.5 py-2 min-h-[40px] sm:min-h-[44px] rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'flashcards'
                  ? 'bg-white text-indigo-700 shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Flashcard ({flashcards.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Gamification Level, EXP & Daily Streak Banner */}
      {enableGamification && (
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 text-white rounded-2xl p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs border border-indigo-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/80 border border-indigo-400/40 text-xl flex items-center justify-center shadow-xs">
              {getCurrentLevelInfo(gamificationState.exp).icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-amber-300 uppercase tracking-wide">
                  Level {gamificationState.level}: {getCurrentLevelInfo(gamificationState.exp).title}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-indigo-200 border border-white/10">
                  {gamificationState.exp} EXP
                </span>
              </div>
              {/* EXP Progress Bar */}
              <div className="w-36 sm:w-48 bg-white/20 h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      ((gamificationState.exp - getCurrentLevelInfo(gamificationState.exp).minExp) /
                        (getCurrentLevelInfo(gamificationState.exp).nextLevelMinExp - getCurrentLevelInfo(gamificationState.exp).minExp)) *
                        100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-amber-500/20 px-2.5 py-1 rounded-xl border border-amber-500/30 text-amber-300 font-extrabold text-xs">
              <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>{gamificationState.dailyStreak} Hari Streak</span>
            </div>

            <button
              type="button"
              onClick={() => setShowBadgesModal(true)}
              className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white flex items-center gap-1 transition-all cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-300" />
              <span>Lencana ({gamificationState.unlockedBadges.length}/{ALL_BADGES.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* AI STATUS / NOTIFICATION BANNER */}
      {aiMessage && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3 flex items-center gap-2.5 text-xs text-purple-900 font-medium animate-fadeIn">
          {isGeneratingAI ? (
            <Loader2 className="w-4 h-4 text-purple-600 animate-spin shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
          )}
          <span>{aiMessage}</span>
        </div>
      )}

      {/* STUDENT IDENTITY CARD & QUIZ LAUNCHER */}
      <div className="bg-gradient-to-br from-indigo-50/80 via-slate-50 to-purple-50/70 border border-indigo-100/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Student Profile Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-3.5 border-b border-indigo-100/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-700 text-white font-black text-sm sm:text-base flex items-center justify-center shadow-md shadow-indigo-300/40 shrink-0 ring-2 ring-white">
              {studentName ? studentName.charAt(0).toUpperCase() : 'S'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-slate-900 text-sm sm:text-base leading-tight truncate">
                  {studentName}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200/80 shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Akun Terverifikasi</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 mt-1 text-xs text-slate-600 font-semibold flex-wrap">
                <span className="px-2 py-0.5 bg-indigo-100/80 text-indigo-800 rounded-lg border border-indigo-200/70 font-black text-[11px]">
                  Kelas {studentClass}
                </span>
                <span className="px-2 py-0.5 bg-white text-slate-700 rounded-lg border border-slate-200 font-black text-[11px] shadow-2xs">
                  No. Absen {studentAbsen}
                </span>
                {studentInfo.nisn && (
                  <span className="text-[11px] text-slate-500 font-medium">
                    NISN: <strong>{studentInfo.nisn}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {isCompleted ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Materi Selesai ✓</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-bold shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Siap Mengerjakan</span>
              </div>
            )}
          </div>
        </div>

        {/* Pre-flight Quiz Overview Card (When Quiz has NOT started yet) */}
        {!isQuizStarted && activeTab === 'quiz' && !isQuizCompleted && (
          <div className="space-y-3.5 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="bg-white p-3 rounded-xl border border-indigo-100/90 shadow-2xs flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 font-bold">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Jumlah Soal</span>
                  <span className="font-extrabold text-slate-800 truncate block">{questions.length} Soal Pilihan Ganda</span>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-indigo-100/90 shadow-2xs flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 font-bold">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Penilaian</span>
                  <span className="font-extrabold text-slate-800 truncate block">Interaktif & Otomatis</span>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-indigo-100/90 shadow-2xs flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Reward EXP</span>
                  <span className="font-extrabold text-slate-800 truncate block">+15 EXP Tiap Jawaban Benar</span>
                </div>
              </div>
            </div>

            {/* Start Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <p className="text-xs text-slate-500 font-medium">
                Siap menguji pemahaman materi ini? Klik tombol di samping untuk langsung mulai mengerjakan kuis.
              </p>

              <button
                type="button"
                onClick={handleStartQuiz}
                className="px-6 py-3 min-h-[48px] bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-700 hover:to-purple-800 active:scale-98 text-white font-black text-sm rounded-xl shadow-md hover:shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2.5 transition-all cursor-pointer ring-2 ring-indigo-300/40 shrink-0"
              >
                <Play className="w-4 h-4 fill-white text-white shrink-0" />
                <span>Mulai Mini Kuis</span>
                <ArrowRight className="w-4 h-4 shrink-0 stroke-[2.5]" />
              </button>
            </div>
          </div>
        )}

        {/* Active Quiz Compact Indicator Bar */}
        {isQuizStarted && !isQuizCompleted && activeTab === 'quiz' && (
          <div className="flex items-center justify-between gap-2 pt-1 text-xs">
            <span className="text-indigo-950 font-extrabold flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>Sesi Kuis Berlangsung</span>
            </span>
            <button
              type="button"
              onClick={handleRestartQuiz}
              className="text-[11px] font-bold text-slate-500 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Kembali / Ulangi</span>
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: MINI KUIS SECTION */}
      {activeTab === 'quiz' && (
        <div className="min-w-0">
          {!isQuizStarted && !isQuizCompleted ? null : isQuizCompleted ? (
            /* QUIZ COMPLETED RESULT CARD */
            <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6 shadow-xl border border-indigo-800 relative overflow-hidden animate-in zoom-in-95 duration-300 min-w-0">
              
              {/* Decorative Glow */}
              <div className="absolute -top-10 -right-10 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

              <div className="text-center space-y-2">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-amber-400/20 border border-amber-300/40 text-amber-300 flex items-center justify-center mx-auto shadow-lg animate-bounce">
                  <Award className="w-8 h-8 sm:w-9 sm:h-9" />
                </div>
                <h4 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-tight leading-snug">
                  {finalScorePercent === 100
                    ? '🎉 Sempurna! Skormu 100%'
                    : finalScorePercent >= 75
                    ? '🌟 Hebat! Kamu Sangat Memahami Materi'
                    : '💪 Tetap Semangat! Tingkatkan Lagi'}
                </h4>
                <p className="text-xs text-indigo-200 font-normal px-2">
                  Kuis materi <strong className="text-white">"{material.title}"</strong> selesai dikerjakan!
                </p>
              </div>

              {/* Score & Student Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/10 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-white/10 min-w-0">
                <div className="space-y-1 min-w-0">
                  <span className="text-[11px] text-indigo-300 font-medium block">Identitas Siswa</span>
                  <div className="text-xs sm:text-sm font-bold text-white truncate">{studentName}</div>
                  <div className="text-xs text-indigo-200 truncate">
                    Kelas: <strong>{studentClass}</strong> • Absen: <strong>{studentAbsen}</strong>
                  </div>
                </div>

                <div className="space-y-1 md:text-right border-t md:border-t-0 md:border-l border-white/10 pt-2.5 md:pt-0 md:pl-4 min-w-0">
                  <span className="text-[11px] text-indigo-300 font-medium block">Nilai Akhir Kuis</span>
                  <div className="text-2xl font-black text-amber-300 flex items-center md:justify-end gap-1.5">
                    <span>{finalScorePercent}</span>
                    <span className="text-xs text-indigo-200 font-semibold">/ 100</span>
                  </div>
                  <div className="text-xs text-emerald-300 font-semibold">
                    {score} dari {questions.length} soal benar
                  </div>
                </div>
              </div>

              {/* Automatic Material Completion Status Notification */}
              <div className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-extrabold shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>Materi ini telah otomatis ditandai Selesai ✓</span>
              </div>

              {/* Action Buttons: Download PNG & Share via WhatsApp */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <button
                    type="button"
                    onClick={handlePlayAgain}
                    disabled={isGeneratingAI}
                    className="w-full sm:w-auto px-4.5 py-3 bg-gradient-to-r from-slate-800 to-indigo-950 hover:from-indigo-800 hover:to-purple-900 active:scale-98 text-white font-bold text-xs rounded-xl border border-indigo-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shrink-0 disabled:opacity-60"
                    title="Mulai ulang dan buat paket soal kuis baru secara otomatis dengan AI"
                  >
                    {isGeneratingAI ? (
                      <Loader2 className="w-4 h-4 animate-spin text-purple-300" />
                    ) : (
                      <Wand2 className="w-4 h-4 text-amber-300" />
                    )}
                    <span>{isGeneratingAI ? 'Menyusun Soal AI Baru...' : 'Coba Kuis Lagi (Buat Soal Baru)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadResultImage}
                    disabled={isGeneratingImage}
                    className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-black text-xs rounded-xl transition-all shadow-lg shadow-indigo-950/60 flex items-center justify-center gap-2 cursor-pointer border border-indigo-400/30 disabled:opacity-50 shrink-0 hover:scale-[1.02] active:scale-95"
                  >
                    {isGeneratingImage ? (
                      <Loader2 className="w-4 h-4 animate-spin text-purple-200" />
                    ) : (
                      <Download className="w-4 h-4 text-amber-300" />
                    )}
                    <span>
                      {isGeneratingImage
                        ? 'Memproses Gambar Kartu PNG HD...'
                        : 'Unduh Kartu Hasil Kuis (Gambar PNG)'}
                    </span>
                  </button>
                </div>

                {/* Helper notice explaining the anti-tamper image feature */}
                <div className="bg-slate-900/80 border border-indigo-900/80 rounded-xl p-3 flex items-start gap-2.5 text-[11px] text-indigo-200">
                  <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Kartu Hasil Digital Resmi:</strong> Menekan tombol di atas akan <strong>mengunduh Kartu Hasil Belajar berbentuk gambar PNG HD</strong> beresolusi tinggi dengan jaminan otentisitas dan stempel terverifikasi secara langsung ke perangkat Anda.
                  </p>
                </div>

                {imageDownloaded && (
                  <div className="bg-emerald-950/90 border border-emerald-700 rounded-xl p-3 text-xs text-emerald-200 flex items-center gap-2 animate-fadeIn shadow-md">
                    <Download className="w-4 h-4 text-amber-300 shrink-0 animate-bounce" />
                    <span>
                      ✨ <strong>Kartu_Hasil_MiniKuis.png</strong> berhasil terunduh dengan kualitas HD! Gambar siap disimpan atau dilampirkan sebagai laporan belajar.
                    </span>
                  </div>
                )}
              </div>

              {/* Review Jawaban Accordion */}
              <div className="pt-3 border-t border-white/10 space-y-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setShowReview(!showReview)}
                  className="w-full flex items-center justify-between text-xs font-bold text-indigo-200 hover:text-white transition-colors cursor-pointer bg-white/5 px-3.5 py-2.5 rounded-xl border border-white/10"
                >
                  <div className="flex items-center gap-2 truncate">
                    <BookOpen className="w-4 h-4 text-amber-300 shrink-0" />
                    <span className="truncate">Review Soal & Pembahasan ({questions.length})</span>
                  </div>
                  <span className="shrink-0 ml-2">{showReview ? 'Sembunyikan ▲' : 'Lihat Detail ▼'}</span>
                </button>

                {showReview && (
                  <div className="space-y-3 pt-2 min-w-0">
                    {questions.map((q, qIdx) => {
                      const userAnsIdx = userAnswers[qIdx];
                      const isCorrect = userAnsIdx === q.correctAnswerIndex;

                      return (
                        <div
                          key={qIdx}
                          className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-3 sm:p-3.5 space-y-2 text-xs min-w-0"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-indigo-300">Soal #{qIdx + 1}:</span>
                            {isCorrect ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1 shrink-0">
                                <CheckCircle2 className="w-3 h-3" /> Benar (+10)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30 flex items-center gap-1 shrink-0">
                                <XCircle className="w-3 h-3" /> Salah
                              </span>
                            )}
                          </div>

                          <p className="font-semibold text-white leading-relaxed break-words">{q.question}</p>

                          <div className="space-y-1 text-[11px] pt-1">
                            <div className="text-slate-300 break-words">
                              Jawabanmu:{' '}
                              <span
                                className={
                                  isCorrect ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'
                                }
                              >
                                {userAnsIdx !== undefined ? `${String.fromCharCode(65 + userAnsIdx)}. ${q.options[userAnsIdx]}` : 'Tidak dijawab'}
                              </span>
                            </div>
                            {!isCorrect && (
                              <div className="text-emerald-300 font-medium break-words">
                                Jawaban Benar:{' '}
                                <strong>
                                  {String.fromCharCode(65 + q.correctAnswerIndex)}. {q.options[q.correctAnswerIndex]}
                                </strong>
                              </div>
                            )}
                          </div>

                          {q.explanation && (
                            <p className="text-[10px] text-indigo-200/90 italic bg-white/5 p-2 rounded-lg border border-white/5 mt-1 break-words">
                              💡 <strong>Pembahasan:</strong> {q.explanation}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          ) : (
            /* ACTIVE QUIZ QUESTION VIEW */
            <div className="space-y-4 min-w-0">
              {/* Interactive Progress Map & Stats Bar */}
              <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-2xs">
                {/* Top Row: Progress Stats & Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-xs shrink-0">
                      #{currentQuestionIndex + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-black text-slate-800">
                          Soal {currentQuestionIndex + 1} dari {questions.length}
                        </span>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 shrink-0">
                          {Math.round(((currentQuestionIndex + (isAnswered ? 1 : 0)) / questions.length) * 100)}% Selesai
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {questions.length - (currentQuestionIndex + (isAnswered ? 1 : 0))} soal tersisa
                      </p>
                    </div>
                  </div>

                  {/* Live Score Counter */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200/80 shadow-2xs">
                      <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
                      <span>Skor Sementara: {score} / {questions.length}</span>
                    </div>
                  </div>
                </div>

                {/* Animated Progress Bar */}
                <div className="relative w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden">
                  <motion.div
                    className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentQuestionIndex + (isAnswered ? 1 : 0)) / questions.length) * 100}%` }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                </div>

                {/* Interactive Question Steps Indicator Map (1 to N) */}
                <div className="flex items-center justify-between gap-1 overflow-x-auto pt-1 pb-0.5 scrollbar-none">
                  {questions.map((_, qIdx) => {
                    const isPast = qIdx < currentQuestionIndex;
                    const isCurrent = qIdx === currentQuestionIndex;
                    const userAnsIdx = userAnswers[qIdx];
                    const isCorrect = userAnsIdx !== undefined && userAnsIdx === questions[qIdx].correctAnswerIndex;

                    return (
                      <motion.div
                        key={qIdx}
                        whileHover={{ scale: 1.12 }}
                        className={`flex-1 min-w-[24px] sm:min-w-[28px] h-7 sm:h-8 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black flex items-center justify-center transition-all border ${
                          isPast
                            ? isCorrect
                              ? 'bg-emerald-500 text-white border-emerald-600 shadow-2xs'
                              : 'bg-rose-500 text-white border-rose-600 shadow-2xs'
                            : isCurrent
                            ? 'bg-indigo-600 text-white border-indigo-700 ring-2 ring-indigo-400/40 shadow-xs'
                            : 'bg-white text-slate-400 border-slate-200'
                        }`}
                        title={`Soal #${qIdx + 1}${isPast ? (isCorrect ? ' (Benar)' : ' (Salah)') : isCurrent ? ' (Sedang Dikerjakan)' : ''}`}
                      >
                        {isPast ? (
                          isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />
                        ) : (
                          <span>{qIdx + 1}</span>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Time Attack Timer & Lifelines Bar */}
              {(enableTimeAttack || enableLifelines || enableAITutor) && !isAnswered && (
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl">
                  {/* Time Attack Countdown */}
                  {enableTimeAttack && (
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-indigo-200 shadow-2xs">
                      <Clock className={`w-4 h-4 ${timeLeft <= 5 ? 'text-rose-600 animate-bounce' : 'text-indigo-600'}`} />
                      <span className="text-xs font-extrabold text-slate-800">
                        Waktu: <span className={timeLeft <= 5 ? 'text-rose-600 font-black' : 'text-indigo-700'}>{timeLeft}s</span>
                      </span>
                    </div>
                  )}

                  {/* Lifelines: 50:50 & AI Hint */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {enableLifelines && (
                      <>
                        <button
                          type="button"
                          onClick={handleUseFiftyFifty}
                          disabled={!!usedFiftyFifty[currentQuestionIndex] || isAnswered}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            usedFiftyFifty[currentQuestionIndex]
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              : 'bg-amber-500 hover:bg-amber-600 text-white shadow-2xs active:scale-95'
                          }`}
                          title="Eliminasi 2 pilihan jawaban yang salah"
                        >
                          <Zap className="w-3.5 h-3.5 text-yellow-200" />
                          <span>50:50 Eliminasi</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleGetAIHint}
                          disabled={isAnswered}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                          title="Dapatkan petunjuk pintar tanpa langsung membocorkan jawaban"
                        >
                          <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
                          <span>Petunjuk AI</span>
                        </button>
                      </>
                    )}

                    {/* AI Tutor Companion Analogi */}
                    {enableAITutor && (
                      <button
                        type="button"
                        onClick={handleGetAnalogi}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                        title="Tanyakan ke AI Tutor analogi sederhana kehidupan sehari-hari"
                      >
                        <Bot className="w-3.5 h-3.5 text-purple-200" />
                        <span>Analogi Sederhana</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Animated Question Content Container */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestionIndex}
                  initial={{ opacity: 0, x: 25, scale: 0.98 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -25, scale: 0.98 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="space-y-3.5 sm:space-y-4 min-w-0"
                >
                  {/* Question Text Box */}
                  <div className="p-4 sm:p-5 md:p-6 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white rounded-2xl sm:rounded-3xl space-y-2.5 border border-slate-800 shadow-md min-w-0 break-words relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider text-indigo-300 bg-indigo-500/20 px-2.5 py-1 rounded-full border border-indigo-500/30">
                        Pertanyaan Refleksi #{currentQuestionIndex + 1}
                      </span>

                      <div className="flex items-center gap-2">
                        {enableAITutor && (
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleTTS(
                                `${questions[currentQuestionIndex].question}. Pilihan jawaban: ${questions[
                                  currentQuestionIndex
                                ].options.join(', ')}`
                              )
                            }
                            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-indigo-200 hover:text-white transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                            title="Dengar Narasi Suara Soal (Text-To-Speech)"
                          >
                            {isSpeakingAudio ? (
                              <VolumeX className="w-4 h-4 text-rose-400 animate-pulse" />
                            ) : (
                              <Volume2 className="w-4 h-4 text-amber-300" />
                            )}
                            <span className="hidden sm:inline">{isSpeakingAudio ? 'Hentikan' : 'Suara AI'}</span>
                          </button>
                        )}
                        <span className="text-[11px] text-indigo-200/80 font-medium hidden sm:inline">Pilih 1 Jawaban Terbaik</span>
                      </div>
                    </div>
                    <h4 className="text-sm sm:text-base md:text-lg font-extrabold leading-relaxed text-white break-words">
                      {questions[currentQuestionIndex].question}
                    </h4>
                  </div>

                  {/* Options List with Stagger Animations */}
                  <div className="space-y-2.5 sm:space-y-3 min-w-0">
                    {questions[currentQuestionIndex].options.map((optionText, idx) => {
                      const currentQ = questions[currentQuestionIndex];
                      const isSelected = selectedOption === idx;
                      const isCorrect = idx === currentQ.correctAnswerIndex;
                      const isDisabled5050 = disabledOptions.includes(idx);

                      let optionStyle =
                        'bg-white text-slate-800 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 hover:shadow-xs';

                      if (isDisabled5050) {
                        optionStyle = 'bg-slate-100 text-slate-400 border-slate-200 opacity-40 cursor-not-allowed line-through';
                      } else if (isAnswered) {
                        if (isCorrect) {
                          optionStyle = 'bg-emerald-50/90 text-emerald-950 border-emerald-500 font-bold ring-2 ring-emerald-500/30 shadow-xs';
                        } else if (isSelected && !isCorrect) {
                          optionStyle = 'bg-rose-50/90 text-rose-950 border-rose-400 font-semibold ring-1 ring-rose-300 shadow-xs';
                        } else {
                          optionStyle = 'bg-slate-50/80 text-slate-400 border-slate-200 opacity-55';
                        }
                      }

                      return (
                        <motion.button
                          key={idx}
                          type="button"
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, delay: idx * 0.05 }}
                          whileHover={!isAnswered && !isDisabled5050 ? { scale: 1.01, x: 3 } : {}}
                          whileTap={!isAnswered && !isDisabled5050 ? { scale: 0.98 } : {}}
                          onClick={() => handleSelectOption(idx)}
                          disabled={isAnswered || isDisabled5050}
                          className={`w-full p-3.5 sm:p-4 min-h-[50px] rounded-2xl border text-xs sm:text-sm text-left transition-all flex items-start gap-3 cursor-pointer min-w-0 ${optionStyle}`}
                        >
                          <span
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center shrink-0 border transition-all ${
                              isAnswered && isCorrect
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : isAnswered && isSelected && !isCorrect
                                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                : isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {String.fromCharCode(65 + idx)}
                          </span>

                          <span className="pt-0.5 leading-relaxed flex-1 break-words min-w-0 font-semibold text-slate-800">
                            {optionText}
                          </span>

                          {isAnswered && isCorrect && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                            </motion.div>
                          )}
                          {isAnswered && isSelected && !isCorrect && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
                              <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Feedback Explanation & Next Button */}
                  {isAnswered && (
                    <motion.div
                      initial={{ opacity: 0, y: 15, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.3, type: 'spring', bounce: 0.2 }}
                      className="p-4 sm:p-5 bg-gradient-to-r from-indigo-50/90 via-purple-50/90 to-indigo-50/90 border border-indigo-200/90 rounded-2xl space-y-3.5 shadow-xs min-w-0"
                    >
                      <div className="flex items-start gap-2.5 text-xs min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                          <Sparkles className="w-4 h-4 text-amber-300" />
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <span className="font-extrabold text-indigo-950 text-xs block">Penjelasan & Pembahasan:</span>
                          <p className="text-indigo-950 leading-relaxed font-medium break-words text-xs sm:text-sm">
                            {questions[currentQuestionIndex].explanation ||
                              'Jawaban yang tepat berdasarkan konsep dan substansi materi pembelajaran.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          type="button"
                          onClick={handleNextQuestion}
                          className="w-full sm:w-auto justify-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <span>
                            {currentQuestionIndex < questions.length - 1 ? 'Soal Berikutnya' : 'Lihat Hasil Kuis'}
                          </span>
                          <ArrowRight className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FLASHCARD SECTION */}
      {activeTab === 'flashcards' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span className="font-bold text-slate-700">Kartu {currentCardIndex + 1} dari {flashcards.length}</span>
            <span className="text-[11px] text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full font-bold">💡 Klik kartu untuk membalik (Pertanyaan / Jawaban)</span>
          </div>

          {/* Interactive Flip Card with motion */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentCardIndex}-${isFlipped}`}
              initial={{ opacity: 0, rotateY: isFlipped ? -90 : 90, scale: 0.96 }}
              animate={{ opacity: 1, rotateY: 0, scale: 1 }}
              exit={{ opacity: 0, rotateY: isFlipped ? 90 : -90, scale: 0.96 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={() => {
                playPopSound();
                setIsFlipped(!isFlipped);
              }}
              className="w-full min-h-[220px] sm:min-h-[240px] bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer shadow-lg border border-indigo-800 transition-all hover:border-indigo-500 relative overflow-hidden group select-none"
            >
              <div className="absolute top-0 right-0 w-36 h-36 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
              <span className="absolute top-4 left-4 text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-white/10 text-indigo-200 border border-white/10 shadow-2xs">
                {isFlipped ? '🔑 JAWABAN / PENJELASAN' : '❓ PERTANYAAN / ISTILAH'}
              </span>

              <div className="my-auto space-y-2 max-w-lg">
                <h4 className="text-base sm:text-lg font-extrabold text-white leading-relaxed">
                  {isFlipped ? flashcards[currentCardIndex].back : flashcards[currentCardIndex].front}
                </h4>
              </div>

              <span className="text-[11px] text-indigo-300/80 font-medium group-hover:text-amber-300 transition-colors pt-2">
                (Klik untuk membalik kartu 🔄)
              </span>
            </motion.div>
          </AnimatePresence>

          {/* Flashcard Navigation Controls */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={() => {
                playPopSound();
                setIsFlipped(false);
                setCurrentCardIndex((prev) => (prev > 0 ? prev - 1 : flashcards.length - 1));
              }}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kartu Sebelumnya</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={() => {
                playPopSound();
                setIsFlipped(false);
                if (enableGamification) {
                  const { state, newBadges } = recordFlashcardFlip();
                  const { newState } = addExp(10);
                  setGamificationState(newState);
                  if (newBadges.length > 0) {
                    setNewEarnedBadges(newBadges);
                  }
                }
                setCurrentCardIndex((prev) => (prev < flashcards.length - 1 ? prev + 1 : 0));
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>Kartu Berikutnya</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      )}

      {/* BADGES & GAMIFICATION MODAL */}
      <AnimatePresence>
        {showBadgesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-fadeIn">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-5 sm:p-6 max-w-lg w-full space-y-4 shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <h3 className="font-extrabold text-base text-white">Lencana & Achievement Siswa</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBadgesModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin">
                {ALL_BADGES.map((badge) => {
                  const isUnlocked = gamificationState.unlockedBadges.includes(badge.id);
                  return (
                    <div
                      key={badge.id}
                      className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-all ${
                        isUnlocked
                          ? 'bg-slate-800/90 border-amber-500/40 text-white shadow-xs'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-500 opacity-60'
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${badge.color} text-2xl flex items-center justify-center shrink-0 shadow-md`}>
                        {badge.icon}
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-xs sm:text-sm text-white">{badge.title}</h4>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${isUnlocked ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-500'}`}>
                            {isUnlocked ? 'Terkumpul ✓' : 'Terkunci 🔒'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">{badge.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-800 text-center">
                <button
                  type="button"
                  onClick={() => setShowBadgesModal(false)}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  Tutup Lencana
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI HINT MODAL */}
      <AnimatePresence>
        {showAIHintModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-fadeIn">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-indigo-800 text-white rounded-3xl p-5 sm:p-6 max-w-md w-full space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-indigo-950 pb-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-300" />
                  <h3 className="font-extrabold text-sm text-white">Petunjuk Pintar AI</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAIHintModal(false)}
                  className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 bg-indigo-950/60 border border-indigo-800/80 rounded-2xl space-y-2">
                {loadingHint ? (
                  <div className="flex items-center justify-center gap-2 py-4 text-xs text-indigo-300 font-bold">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                    <span>AI Gemini sedang merumuskan petunjuk...</span>
                  </div>
                ) : (
                  <p className="text-xs text-indigo-100 leading-relaxed font-medium">
                    {aiHintText || 'Fokus pada kata kunci utama pertanyaan dan eliminasi opsi yang saling bertolak belakang!'}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowAIHintModal(false)}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Paham, Kembali ke Soal
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI TUTOR ANALOGI MODAL */}
      <AnimatePresence>
        {showAnalogiModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-fadeIn">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-purple-800 text-white rounded-3xl p-5 sm:p-6 max-w-md w-full space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-purple-950 pb-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-purple-400" />
                  <h3 className="font-extrabold text-sm text-white">Analogi Sederhana AI Tutor</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAnalogiModal(false)}
                  className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 bg-purple-950/60 border border-purple-800/80 rounded-2xl space-y-2">
                {loadingAnalogi ? (
                  <div className="flex items-center justify-center gap-2 py-4 text-xs text-purple-300 font-bold">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-300" />
                    <span>AI Companion menyusun analogi kehidupan nyata...</span>
                  </div>
                ) : (
                  <p className="text-xs text-purple-100 leading-relaxed font-medium">
                    {analogiText}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                {analogiText && (
                  <button
                    type="button"
                    onClick={() => handleToggleTTS(analogiText)}
                    className="px-3 py-2 bg-purple-900/80 hover:bg-purple-800 text-purple-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-purple-700"
                  >
                    <Volume2 className="w-4 h-4 text-amber-300" />
                    <span>Suara</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowAnalogiModal(false)}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  Mengerti
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
