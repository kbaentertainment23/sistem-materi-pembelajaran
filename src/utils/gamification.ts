export interface BadgeInfo {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  unlockedAt?: string;
}

export interface GamificationState {
  exp: number;
  level: number;
  unlockedBadges: string[]; // Badge IDs
  dailyStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  quizzesCompleted: number;
  perfectQuizzes: number;
  flashcardsFlipped: number;
}

export const GAMIFICATION_LEVELS = [
  { level: 1, title: 'Pembelajar Pemula', minExp: 0, maxExp: 100, icon: '🌱' },
  { level: 2, title: 'Pembuka Wawasan', minExp: 100, maxExp: 250, icon: '📖' },
  { level: 3, title: 'Penalari Kritis', minExp: 250, maxExp: 500, icon: '⚡' },
  { level: 4, title: 'Penjelajah Topik', minExp: 500, maxExp: 1000, icon: '🚀' },
  { level: 5, title: 'Master 8 Dimensi', minExp: 1000, maxExp: 9999, icon: '👑' },
];

export const ALL_BADGES: BadgeInfo[] = [
  {
    id: 'perfect_score',
    title: 'Skor Sempurna 🎯',
    description: 'Meraih nilai 100% pada pengerjaan kuis',
    icon: '🎯',
    color: 'from-amber-500 to-yellow-500',
  },
  {
    id: 'speed_master',
    title: 'Master Kilat ⚡',
    description: 'Menyelesaikan kuis dalam Mode Tantangan Waktu',
    icon: '⚡',
    color: 'from-purple-500 to-indigo-500',
  },
  {
    id: 'duta_8dimensi',
    title: 'Duta 8 Dimensi 🌟',
    description: 'Menyelesaikan kuis berorientasi 8 Dimensi Profil Lulusan',
    icon: '🌟',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'flashcard_pro',
    title: 'Master Kartu 🎴',
    description: 'Membalik & mempelajari 5 kartu flashcard',
    icon: '🎴',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'streak_3days',
    title: 'Penjaga Api 🔥',
    description: 'Mempertahankan konsistensi belajar (Streak 3 hari)',
    icon: '🔥',
    color: 'from-orange-500 to-rose-500',
  },
];

const STORAGE_KEY = 'sistem_materi_gamification_v1';

export function getGamificationState(): GamificationState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as GamificationState;
      // Update Daily Streak
      const today = new Date().toISOString().split('T')[0];
      if (parsed.lastActiveDate !== today) {
        const lastDate = new Date(parsed.lastActiveDate);
        const nowDate = new Date(today);
        const diffDays = Math.floor((nowDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));

        if (diffDays === 1) {
          parsed.dailyStreak += 1;
        } else if (diffDays > 1) {
          parsed.dailyStreak = 1;
        }
        parsed.lastActiveDate = today;
        saveGamificationState(parsed);
      }
      return parsed;
    }
  } catch (e) {
    console.warn('Error reading gamification state:', e);
  }

  const initialState: GamificationState = {
    exp: 0,
    level: 1,
    unlockedBadges: [],
    dailyStreak: 1,
    lastActiveDate: new Date().toISOString().split('T')[0],
    quizzesCompleted: 0,
    perfectQuizzes: 0,
    flashcardsFlipped: 0,
  };
  saveGamificationState(initialState);
  return initialState;
}

export function saveGamificationState(state: GamificationState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Error saving gamification state:', e);
  }
}

export function getCurrentLevelInfo(exp: number) {
  const current = GAMIFICATION_LEVELS.find((l) => exp >= l.minExp && exp < l.maxExp) || GAMIFICATION_LEVELS[GAMIFICATION_LEVELS.length - 1];
  const nextLevel = GAMIFICATION_LEVELS.find((l) => l.level === current.level + 1);
  return {
    ...current,
    nextLevelMinExp: nextLevel ? nextLevel.minExp : current.maxExp,
  };
}

export function addExp(amount: number): { newState: GamificationState; leveledUp: boolean; newLevel: number; earnedBadges: BadgeInfo[] } {
  const state = getGamificationState();
  const oldLevelInfo = getCurrentLevelInfo(state.exp);
  
  state.exp += amount;
  const newLevelInfo = getCurrentLevelInfo(state.exp);
  const leveledUp = newLevelInfo.level > oldLevelInfo.level;
  state.level = newLevelInfo.level;

  const earnedBadges: BadgeInfo[] = [];

  // Check 3-day streak badge
  if (state.dailyStreak >= 3 && !state.unlockedBadges.includes('streak_3days')) {
    state.unlockedBadges.push('streak_3days');
    const badge = ALL_BADGES.find((b) => b.id === 'streak_3days');
    if (badge) earnedBadges.push(badge);
  }

  saveGamificationState(state);

  if (leveledUp) {
    playAudioFx('level_up');
  } else if (amount > 0) {
    playAudioFx('exp');
  }

  return { newState: state, leveledUp, newLevel: state.level, earnedBadges };
}

export function recordQuizCompletion(score: number, totalQuestions: number, isTimeAttack: boolean): { state: GamificationState; newBadges: BadgeInfo[] } {
  const state = getGamificationState();
  state.quizzesCompleted += 1;
  const isPerfect = score === totalQuestions && totalQuestions > 0;
  if (isPerfect) state.perfectQuizzes += 1;

  const newBadges: BadgeInfo[] = [];

  // Perfect Score badge
  if (isPerfect && !state.unlockedBadges.includes('perfect_score')) {
    state.unlockedBadges.push('perfect_score');
    const b = ALL_BADGES.find((badge) => badge.id === 'perfect_score');
    if (b) newBadges.push(b);
  }

  // Speed Master badge
  if (isTimeAttack && !state.unlockedBadges.includes('speed_master')) {
    state.unlockedBadges.push('speed_master');
    const b = ALL_BADGES.find((badge) => badge.id === 'speed_master');
    if (b) newBadges.push(b);
  }

  // Duta 8 Dimensi badge
  if (score >= 3 && !state.unlockedBadges.includes('duta_8dimensi')) {
    state.unlockedBadges.push('duta_8dimensi');
    const b = ALL_BADGES.find((badge) => badge.id === 'duta_8dimensi');
    if (b) newBadges.push(b);
  }

  saveGamificationState(state);

  if (newBadges.length > 0) {
    playAudioFx('badge');
  }

  return { state, newBadges };
}

export function recordFlashcardFlip(): { state: GamificationState; newBadges: BadgeInfo[] } {
  const state = getGamificationState();
  state.flashcardsFlipped += 1;

  const newBadges: BadgeInfo[] = [];
  if (state.flashcardsFlipped >= 5 && !state.unlockedBadges.includes('flashcard_pro')) {
    state.unlockedBadges.push('flashcard_pro');
    const b = ALL_BADGES.find((badge) => badge.id === 'flashcard_pro');
    if (b) newBadges.push(b);
  }

  saveGamificationState(state);
  return { state, newBadges };
}

// Sound effects generator via Web Audio API
export function playAudioFx(type: 'exp' | 'level_up' | 'badge' | 'correct' | 'wrong' | 'pop') {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'exp') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.15); // E5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'level_up') {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.1 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.25);
      });
    } else if (type === 'badge') {
      const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.08 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.2);
      });
    } else if (type === 'correct') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'wrong') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'pop') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    }
  } catch (e) {
    // Audio Context fail fallback
  }
}
