export type MaterialType = 'gdrive' | 'canva' | 'pdf' | 'youtube' | 'video' | 'gform' | 'other';

export interface Subject {
  id: string;
  name: string;
  code?: string;
  description?: string;
  icon?: string;
  color?: string;
  order: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
}

export interface FlashcardItem {
  id: string;
  front: string;
  back: string;
}

export interface MaterialInteractiveConfig {
  enableGamification?: boolean; // System Level, EXP, Lencana 8 Dimensi & Daily Streak
  enableTimeAttack?: boolean;   // Mode Tantangan Waktu (15-30s) per soal
  timeAttackSeconds?: number;   // Durasi waktu per soal (default 30)
  enableLifelines?: boolean;    // Fitur Bantuan 50:50 & Petunjuk AI
  enableAITutor?: boolean;      // AI Tutor Companion (Analogi & Narasi Suara)
}

export interface TeacherAccount {
  id: string;
  name: string;
  nip?: string;
  username: string;
  password: string;
  subjectId: string;
  assignedClasses?: string[]; // e.g. ['7A', '7B', '8A']
  createdAt: string;
  updatedAt: string;
}

export interface Material {
  id: string;
  categoryId: string;
  title: string;
  type: MaterialType;
  originalUrl: string;
  embedUrl: string;
  order: number;
  description?: string;
  targetGrade?: string; // e.g. 'smp-7' | 'smp-8' | 'smp-9' | 'sma-10' | 'sma-11' | 'sma-12' | 'sd-4-6' | 'umum'
  isPublished: boolean;
  reflectionQuestions?: string[];
  quizQuestions?: QuizQuestion[];
  flashcards?: FlashcardItem[];
  interactiveConfig?: MaterialInteractiveConfig;
  createdBy?: string; // ID or username of teacher/admin who created this
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  subjectId?: string;
  title: string;
  description: string;
  icon: string;
  color?: string;
  order: number;
  createdBy?: string; // ID or username of teacher/admin who created this
  createdAt: string;
  updatedAt: string;
}

export interface StudentAccount {
  id: string;
  nama: string;
  kelas: string;
  noAbsen: string;
  nisn: string;
  username: string;
  password: string;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'admin' | 'teacher' | 'student';

export interface AuthSession {
  role: UserRole;
  teacher?: TeacherAccount;
  student?: StudentAccount;
}

export interface UserNote {
  materialId: string;
  content: string;
  updatedAt: string;
}

export interface UserProgress {
  completedMaterialIds: string[];
  notes: Record<string, string>; // materialId -> note text
}

export interface StudentProgressRecord {
  id?: string;
  studentId: string;
  studentName?: string;
  kelas?: string;
  completedMaterialIds: string[];
  updatedAt: string;
}

export interface AdminSettings {
  adminPin: string;
  siteTitle: string;
  updatedAt: string;
}
