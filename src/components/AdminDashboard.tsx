import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  HelpCircle,
  Link,
  Eye,
  EyeOff,
  Key,
  ShieldCheck,
  Settings,
  Layers,
  FileSpreadsheet,
  AlertCircle,
  Save,
  ArrowUp,
  ArrowDown,
  Lock,
  RotateCcw,
  Sparkles,
  GraduationCap,
  BookOpen,
  Image as ImageIcon,
  Upload,
  ImagePlus,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Folder,
  FolderOpen,
  Search,
  Filter,
  Users,
  UserPlus,
  UserCheck,
  User,
  ShieldAlert,
  LogOut,
  Download,
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Copy,
  CopyCheck,
  School,
  SlidersHorizontal,
  KeyRound,
  AlertTriangle,
  Table as TableIcon,
  LayoutGrid,
  ArrowUpDown,
} from 'lucide-react';
import { Subject, Category, Material, MaterialType, TeacherAccount, StudentAccount, AuthSession, StudentProgressRecord } from '../types';
import { getSubjectIcon } from '../utils/subjectIcons';
import { ImportExcelModal } from './ImportExcelModal';
import {
  downloadStudentTemplate,
  downloadTeacherTemplate,
  exportStudentsToExcel,
  exportTeachersToExcel,
  exportStudentProgressToExcel,
  StudentProgressExportRow,
} from '../utils/excelImportExport';
import {
  createSubject,
  updateSubject,
  deleteSubject,
  createCategory,
  updateCategory,
  deleteCategory,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  fetchStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  setAdminPin,
  getAdminPin,
  seedInitialDataIfNeeded,
  clearAllFirestoreData,
  setSiteLogoUrl,
  fetchAllStudentProgress,
  resetStudentMaterialProgress,
  resetAllStudentProgress,
  fetchMasterGrades,
  saveMasterGrades,
  fetchMasterClasses,
  saveMasterClasses,
  renameClassInStudents,
  deleteClassAndStudents,
  deleteGradeLevel,
  GradeConfig,
  DEFAULT_GRADES,
  DEFAULT_PRESET_CLASSES,
} from '../lib/dataService';
import { parseEmbedUrl, parseLogoUrl } from '../utils/urlParser';
import { IconPicker } from './IconPicker';
import { formatTargetGradeLabel } from '../utils/quizGenerator';

const getGradeCategory = (cls: string): string => {
  const clean = (cls || '').trim().toUpperCase();
  if (/^(KELAS\s*)?(7|VII)(\.|\s|[A-Z]|$)/i.test(clean)) return '7';
  if (/^(KELAS\s*)?(8|VIII)(\.|\s|[A-Z]|$)/i.test(clean)) return '8';
  if (/^(KELAS\s*)?(9|IX)(\.|\s|[A-Z]|$)/i.test(clean)) return '9';
  if (/^(KELAS\s*)?(10|X)(\.|\s|[A-Z]|$)/i.test(clean)) return '10';
  if (/^(KELAS\s*)?(11|XI)(\.|\s|[A-Z]|$)/i.test(clean)) return '11';
  if (/^(KELAS\s*)?(12|XII)(\.|\s|[A-Z]|$)/i.test(clean)) return '12';
  return 'other';
};

interface AdminDashboardProps {
  isOpen?: boolean;
  onClose: () => void;
  onLogout?: () => void;
  onSwitchToStudentView?: () => void;
  subjects: Subject[];
  categories: Category[];
  materials: Material[];
  teachers?: TeacherAccount[];
  students?: StudentAccount[];
  authSession?: AuthSession | null;
  onRefreshData: () => Promise<void>;
  onOpenGuide: () => void;
  onDeleteSubjectOptimistic?: (id: string) => void;
  onDeleteMaterialOptimistic?: (id: string) => void;
  onDeleteCategoryOptimistic?: (id: string) => void;
  siteLogoUrl?: string;
  onUpdateSiteLogoUrl?: (url: string) => void;
}


export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isOpen = true,
  onClose,
  onLogout,
  onSwitchToStudentView,
  subjects,
  categories,
  materials,
  teachers = [],
  students = [],
  authSession = null,
  onRefreshData,
  onOpenGuide,
  onDeleteSubjectOptimistic,
  onDeleteMaterialOptimistic,
  onDeleteCategoryOptimistic,
  siteLogoUrl = '',
  onUpdateSiteLogoUrl,
}) => {
  const isTeacherRole = authSession?.role === 'teacher';
  const currentTeacher = authSession?.teacher;
  const assignedSubject = subjects.find((s) => s.id === currentTeacher?.subjectId);
  const availableSubjects = isTeacherRole && currentTeacher
    ? (subjects.filter((s) => s.id === currentTeacher.subjectId).length > 0
        ? subjects.filter((s) => s.id === currentTeacher.subjectId)
        : [assignedSubject || { id: currentTeacher.subjectId || 'informatika', name: (currentTeacher.subjectId || 'Informatika').toUpperCase(), icon: 'BookOpen', code: '' }])
    : subjects;

  const [activeTab, setActiveTab] = useState<'subjects' | 'categories' | 'materials' | 'progress' | 'tester' | 'students' | 'teachers' | 'settings'>(
    isTeacherRole ? 'categories' : 'subjects'
  );

  // Import Excel Modal States
  const [importModalType, setImportModalType] = useState<'students' | 'teachers' | null>(null);
  const [importSuccessBanner, setImportSuccessBanner] = useState<string>('');

  const handleImportSuccess = async (count: number, message: string) => {
    setImportSuccessBanner(message);
    await onRefreshData();
    setTimeout(() => {
      setImportSuccessBanner('');
    }, 7000);
  };

  // Auto redirect teacher if on forbidden tab
  useEffect(() => {
    if (isTeacherRole && ['subjects', 'teachers', 'students', 'settings'].includes(activeTab)) {
      setActiveTab('categories');
    }
  }, [isTeacherRole, activeTab]);

  // Selected subject filter for category & material list
  const [selectedSubjIdFilter, setSelectedSubjIdFilter] = useState<string>('all');
  const [selectedCatIdFilter, setSelectedCatIdFilter] = useState<string>('all');

  // Accordion Grouping States for Categories & Materials
  const [collapsedCatSubjects, setCollapsedCatSubjects] = useState<Record<string, boolean>>({});
  const [collapsedMatSubjects, setCollapsedMatSubjects] = useState<Record<string, boolean>>({});
  const [collapsedMatCategories, setCollapsedMatCategories] = useState<Record<string, boolean>>({});

  // Search queries for admin lists
  const [catSearchQuery, setCatSearchQuery] = useState('');
  const [matSearchQuery, setMatSearchQuery] = useState('');

  const toggleCatSubject = (subjId: string) => {
    setCollapsedCatSubjects((prev) => ({ ...prev, [subjId]: !(prev[subjId] ?? true) }));
  };

  const toggleMatSubject = (subjId: string) => {
    setCollapsedMatSubjects((prev) => ({ ...prev, [subjId]: !(prev[subjId] ?? true) }));
  };

  const toggleMatCategory = (catId: string) => {
    setCollapsedMatCategories((prev) => ({ ...prev, [catId]: !(prev[catId] ?? true) }));
  };

  const expandAllCatSubjects = () => {
    const next: Record<string, boolean> = {};
    subjects.forEach((s) => (next[s.id] = false));
    setCollapsedCatSubjects(next);
  };
  const collapseAllCatSubjects = () => {
    const next: Record<string, boolean> = {};
    subjects.forEach((s) => (next[s.id] = true));
    setCollapsedCatSubjects(next);
  };

  const expandAllMatGroups = () => {
    const nextSubj: Record<string, boolean> = {};
    subjects.forEach((s) => (nextSubj[s.id] = false));
    const nextCat: Record<string, boolean> = {};
    categories.forEach((c) => (nextCat[c.id] = false));
    setCollapsedMatSubjects(nextSubj);
    setCollapsedMatCategories(nextCat);
  };
  const collapseAllMatGroups = () => {
    const nextSubj: Record<string, boolean> = {};
    subjects.forEach((s) => (nextSubj[s.id] = true));
    const nextCat: Record<string, boolean> = {};
    categories.forEach((c) => (nextCat[c.id] = true));
    setCollapsedMatSubjects(nextSubj);
    setCollapsedMatCategories(nextCat);
  };

  // Settings PIN State
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinSuccessMsg, setPinSuccessMsg] = useState('');
  const [pinErrorMsg, setPinErrorMsg] = useState('');

  // Logo Settings State
  const [inputLogoUrl, setInputLogoUrl] = useState(siteLogoUrl);
  const [logoSuccessMsg, setLogoSuccessMsg] = useState('');
  const [logoErrorMsg, setLogoErrorMsg] = useState('');
  const [isLogoSaving, setIsLogoSaving] = useState(false);

  useEffect(() => {
    setInputLogoUrl(siteLogoUrl);
  }, [siteLogoUrl, isOpen]);

  const handleSaveLogo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLogoErrorMsg('');
    setLogoSuccessMsg('');
    setIsLogoSaving(true);
    try {
      const finalUrl = inputLogoUrl.trim();
      await setSiteLogoUrl(finalUrl);
      if (onUpdateSiteLogoUrl) {
        onUpdateSiteLogoUrl(finalUrl);
      }
      setLogoSuccessMsg(finalUrl ? 'Logo berhasil diperbarui dan disimpan!' : 'Logo telah direset ke tampilan default.');
      setTimeout(() => setLogoSuccessMsg(''), 3000);
    } catch (err) {
      setLogoErrorMsg('Gagal menyimpan logo ke database.');
    } finally {
      setIsLogoSaving(false);
    }
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setLogoErrorMsg('Ukuran file maksimal 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setInputLogoUrl(event.target.result as string);
        setLogoErrorMsg('');
      }
    };
    reader.readAsDataURL(file);
  };


  // Subject Form & Modal State
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [subjName, setSubjName] = useState('');
  const [subjCode, setSubjCode] = useState('');
  const [subjDescription, setSubjDescription] = useState('');
  const [subjIcon, setSubjIcon] = useState('Code2');
  const [subjOrder, setSubjOrder] = useState<number | ''>('');
  const [subjSearchQuery, setSubjSearchQuery] = useState('');
  const [subjSortBy, setSubjSortBy] = useState<'order' | 'name' | 'topics'>('order');

  // Category Form & Modal State
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [catSubjectId, setCatSubjectId] = useState('');
  const [catTitle, setCatTitle] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catIcon, setCatIcon] = useState('BrainCircuit');
  const [catOrder, setCatOrder] = useState<number | ''>('');
  const [categorySubjectFilter, setCategorySubjectFilter] = useState<string>('all');

  // Material Form & Modal State
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [matSubjectId, setMatSubjectId] = useState('');
  const [matCategoryId, setMatCategoryId] = useState('');
  const [matTitle, setMatTitle] = useState('');
  const [matOriginalUrl, setMatOriginalUrl] = useState('');
  const [matDescription, setMatDescription] = useState('');
  const [matOrder, setMatOrder] = useState<number | ''>('');
  const [matTargetGrade, setMatTargetGrade] = useState<string>('smp-7');
  const [matIsPublished, setMatIsPublished] = useState(true);
  const [matReflectionQuestions, setMatReflectionQuestions] = useState<string>('');
  const [matTypeFilter, setMatTypeFilter] = useState<string>('all');
  const [matModalTab, setMatModalTab] = useState<'basic' | 'quiz' | 'gamification'>('basic');

  // Material Interactive Config State
  const [isInteractiveSectionExpanded, setIsInteractiveSectionExpanded] = useState(false);
  const [matEnableGamification, setMatEnableGamification] = useState(true);
  const [matEnableTimeAttack, setMatEnableTimeAttack] = useState(false);
  const [matTimeAttackSeconds, setMatTimeAttackSeconds] = useState(30);
  const [matEnableLifelines, setMatEnableLifelines] = useState(true);
  const [matEnableAITutor, setMatEnableAITutor] = useState(true);

  // Student Management State
  const [studentList, setStudentList] = useState<StudentAccount[]>(students);
  const [editingStudent, setEditingStudent] = useState<StudentAccount | null>(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentNama, setStudentNama] = useState('');
  const [studentKelas, setStudentKelas] = useState('');
  const [studentNoAbsen, setStudentNoAbsen] = useState('');
  const [studentNisn, setStudentNisn] = useState('');
  const [studentUsername, setStudentUsername] = useState('');
  const [studentPassword, setStudentPassword] = useState('pass123');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  
  // Hierarchical Grade & Subclass Navigation State
  const [studentGradeFilter, setStudentGradeFilter] = useState<string>('all'); // 'all', '7', '8', '9', '10', '11', '12', 'other'
  const [studentSubClassFilter, setStudentSubClassFilter] = useState<string>('all'); // 'all' or specific class e.g. '7.1'
  const [studentSortBy, setStudentSortBy] = useState<'absen' | 'nama' | 'nisn'>('absen');
  const [copiedNisnId, setCopiedNisnId] = useState<string | null>(null);
  const [showAllPasswords, setShowAllPasswords] = useState(false);
  const [resetPassConfirmStudent, setResetPassConfirmStudent] = useState<StudentAccount | null>(null);

  // Master Classes & Grades Management States
  const [masterGrades, setMasterGrades] = useState<GradeConfig[]>(DEFAULT_GRADES);
  const [masterClasses, setMasterClasses] = useState<string[]>(DEFAULT_PRESET_CLASSES);
  
  // Modals for Class / Rombel Management
  const [isClassManagerModalOpen, setIsClassManagerModalOpen] = useState(false);
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [newClassNameInput, setNewClassNameInput] = useState('');
  const [newClassGradeSelection, setNewClassGradeSelection] = useState('7');

  const [isEditClassModalOpen, setIsEditClassModalOpen] = useState(false);
  const [editClassOldName, setEditClassOldName] = useState('');
  const [editClassNewName, setEditClassNewName] = useState('');

  const [isDeleteClassModalOpen, setIsDeleteClassModalOpen] = useState(false);
  const [deleteClassTarget, setDeleteClassTarget] = useState('');
  const [deleteClassOption, setDeleteClassOption] = useState<'delete_students' | 'keep_students' | 'move_students'>('keep_students');
  const [deleteClassMoveTarget, setDeleteClassMoveTarget] = useState('');

  // Modals for Grade Level Management (e.g. Hapus Kelas 12)
  const [isDeleteGradeModalOpen, setIsDeleteGradeModalOpen] = useState(false);
  const [deleteGradeTarget, setDeleteGradeTarget] = useState<GradeConfig | null>(null);
  const [deleteGradeOption, setDeleteGradeOption] = useState<'delete_students' | 'keep_students'>('delete_students');

  const [isAddGradeModalOpen, setIsAddGradeModalOpen] = useState(false);
  const [newGradeIdInput, setNewGradeIdInput] = useState('');
  const [newGradeLabelInput, setNewGradeLabelInput] = useState('');
  const [newGradeSubLabelInput, setNewGradeSubLabelInput] = useState('');

  // Unified, synchronized list of all available classes
  const allAvailableClasses: string[] = useMemo(() => {
    return Array.from(
      new Set<string>([
        ...masterClasses,
        ...studentList.map((s) => (s.kelas || '').trim()).filter(Boolean),
      ])
    ).sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [masterClasses, studentList]);

  // Tab filters for Teacher Form & Student Modal class selectors
  const [teacherClassGradeTab, setTeacherClassGradeTab] = useState<string>('all');
  const [studentModalGradeTab, setStudentModalGradeTab] = useState<string>('all');

  useEffect(() => {
    if (students.length > 0) {
      setStudentList(students);
    } else {
      fetchStudents().then(setStudentList);
    }
  }, [students]);

  // Load Master Grades & Master Classes on load
  useEffect(() => {
    fetchMasterGrades().then((g) => {
      if (g && g.length > 0) setMasterGrades(g);
    });
    fetchMasterClasses().then((c) => {
      if (c && c.length > 0) setMasterClasses(c);
    });
  }, [isOpen]);

  // Handler: Add New Class / Rombel
  const handleCreateNewClass = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newClassNameInput.trim();
    if (!clean) {
      showNotify('error', 'Nama rombel/kelas tidak boleh kosong');
      return;
    }
    
    // Check if already exists in masterClasses
    const exists = masterClasses.some((c) => c.toLowerCase() === clean.toLowerCase());
    if (exists) {
      showNotify('error', `Rombel "${clean}" sudah terdaftar`);
      return;
    }

    try {
      const updated = [...masterClasses, clean].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
      );
      setMasterClasses(updated);
      await saveMasterClasses(updated);
      showNotify('success', `Rombel baru "${clean}" berhasil ditambahkan!`);
      setNewClassNameInput('');
      setIsAddClassModalOpen(false);
    } catch (err) {
      showNotify('error', 'Gagal menambahkan rombel');
    }
  };

  // Handler: Rename / Edit Class
  const handleSaveRenamedClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOld = editClassOldName.trim();
    const cleanNew = editClassNewName.trim();
    if (!cleanNew) {
      showNotify('error', 'Nama kelas baru tidak boleh kosong');
      return;
    }
    if (cleanOld.toLowerCase() === cleanNew.toLowerCase()) {
      setIsEditClassModalOpen(false);
      return;
    }

    setIsSaving(true);
    try {
      const affectedCount = await renameClassInStudents(cleanOld, cleanNew);
      
      // Update local master classes
      const updatedMaster = masterClasses.map((c) =>
        c.toLowerCase() === cleanOld.toLowerCase() ? cleanNew : c
      );
      if (!updatedMaster.some((c) => c.toLowerCase() === cleanNew.toLowerCase())) {
        updatedMaster.push(cleanNew);
      }
      setMasterClasses(updatedMaster);

      // Refresh students
      const updatedStudents = await fetchStudents();
      setStudentList(updatedStudents);
      if (studentSubClassFilter === cleanOld) {
        setStudentSubClassFilter(cleanNew);
      }
      await onRefreshData();

      showNotify(
        'success',
        `Kelas "${cleanOld}" berhasil diubah menjadi "${cleanNew}" (${affectedCount} siswa diperbarui)!`
      );
      setIsEditClassModalOpen(false);
    } catch (err) {
      showNotify('error', 'Gagal memperbarui nama kelas');
    } finally {
      setIsSaving(false);
    }
  };

  // Handler: Delete Class
  const handleExecuteDeleteClass = async () => {
    if (!deleteClassTarget) return;
    setIsSaving(true);
    try {
      const alsoDelete = deleteClassOption === 'delete_students';
      const moveTo = deleteClassOption === 'move_students' ? deleteClassMoveTarget : undefined;
      
      const { affectedStudents } = await deleteClassAndStudents(deleteClassTarget, alsoDelete, moveTo);
      
      // Update local master classes
      const updatedMaster = masterClasses.filter((c) => c.toLowerCase() !== deleteClassTarget.toLowerCase());
      setMasterClasses(updatedMaster);

      // Refresh student list
      const updatedStudents = await fetchStudents();
      setStudentList(updatedStudents);

      if (studentSubClassFilter === deleteClassTarget) {
        setStudentSubClassFilter('all');
      }

      await onRefreshData();

      let msg = `Rombel "${deleteClassTarget}" berhasil dihapus.`;
      if (alsoDelete && affectedStudents > 0) {
        msg += ` Beserta ${affectedStudents} akun siswa di dalamnya.`;
      } else if (moveTo && affectedStudents > 0) {
        msg += ` ${affectedStudents} siswa dipindahkan ke kelas "${moveTo}".`;
      }
      showNotify('success', msg);
      setIsDeleteClassModalOpen(false);
    } catch (err) {
      showNotify('error', 'Gagal menghapus rombel');
    } finally {
      setIsSaving(false);
    }
  };

  // Handler: Delete Grade Level (e.g. Hapus Kelas 12)
  const handleExecuteDeleteGrade = async () => {
    if (!deleteGradeTarget) return;
    setIsSaving(true);
    try {
      const alsoDelete = deleteGradeOption === 'delete_students';
      const { affectedStudents } = await deleteGradeLevel(deleteGradeTarget.id, alsoDelete);

      // Update local master grades
      const updatedGrades = masterGrades.filter((g) => g.id !== deleteGradeTarget.id);
      setMasterGrades(updatedGrades);

      // Refresh students
      const updatedStudents = await fetchStudents();
      setStudentList(updatedStudents);

      // Refresh master classes
      const updatedClasses = await fetchMasterClasses();
      setMasterClasses(updatedClasses);

      if (studentGradeFilter === deleteGradeTarget.id) {
        setStudentGradeFilter('all');
        setStudentSubClassFilter('all');
      }

      await onRefreshData();

      let msg = `Tingkat "${deleteGradeTarget.label}" berhasil dihapus dari sistem.`;
      if (alsoDelete && affectedStudents > 0) {
        msg += ` ${affectedStudents} akun siswa di tingkat ini telah dihapus.`;
      }
      showNotify('success', msg);
      setIsDeleteGradeModalOpen(false);
      setDeleteGradeTarget(null);
    } catch (err) {
      showNotify('error', 'Gagal menghapus tingkat kelas');
    } finally {
      setIsSaving(false);
    }
  };

  // Handler: Add New Grade Level
  const handleCreateNewGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newGradeIdInput.trim();
    const cleanLabel = newGradeLabelInput.trim();
    const cleanSub = newGradeSubLabelInput.trim() || 'Tingkat Khusus';

    if (!cleanId || !cleanLabel) {
      showNotify('error', 'ID dan Nama Tingkat harus diisi');
      return;
    }

    if (masterGrades.some((g) => g.id.toLowerCase() === cleanId.toLowerCase())) {
      showNotify('error', `Tingkat dengan ID "${cleanId}" sudah ada`);
      return;
    }

    try {
      const newGradeObj: GradeConfig = {
        id: cleanId,
        label: cleanLabel,
        subLabel: cleanSub,
      };
      const updated = [...masterGrades, newGradeObj];
      setMasterGrades(updated);
      await saveMasterGrades(updated);
      showNotify('success', `Tingkat baru "${cleanLabel}" berhasil ditambahkan!`);
      setNewGradeIdInput('');
      setNewGradeLabelInput('');
      setNewGradeSubLabelInput('');
      setIsAddGradeModalOpen(false);
    } catch (err) {
      showNotify('error', 'Gagal menambahkan tingkat kelas');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNisnId(id);
    setTimeout(() => setCopiedNisnId(null), 2000);
  };

  const resetStudentForm = () => {
    setEditingStudent(null);
    setStudentNama('');
    setStudentKelas('');
    setStudentNoAbsen('');
    setStudentNisn('');
    setStudentUsername('');
    setStudentPassword('pass123');
  };

  const handleOpenAddStudentModal = (presetClass?: string) => {
    resetStudentForm();
    if (presetClass && presetClass !== 'all') {
      setStudentKelas(presetClass);
      // Auto-suggest next attendance number
      const studentsInClass = studentList.filter((s) => (s.kelas || '').trim().toLowerCase() === presetClass.trim().toLowerCase());
      const maxAbsen = studentsInClass.reduce((max, s) => {
        const num = parseInt(s.noAbsen || '0', 10);
        return isNaN(num) ? max : Math.max(max, num);
      }, 0);
      setStudentNoAbsen(String(maxAbsen + 1));
    }
    setIsStudentModalOpen(true);
  };

  const handleEditStudent = (s: StudentAccount) => {
    setEditingStudent(s);
    setStudentNama(s.nama);
    setStudentKelas(s.kelas);
    setStudentNoAbsen(s.noAbsen || '');
    setStudentNisn(s.nisn);
    setStudentUsername(s.username || s.nisn);
    setStudentPassword(s.password || 'pass123');
    setIsStudentModalOpen(true);
  };

  const handleDeleteStudent = (id: string, nama: string) => {
    setDeleteConfirmItem({ id, title: nama, type: 'student' as any });
  };

  const handleResetStudentPassword = (s: StudentAccount) => {
    setResetPassConfirmStudent(s);
  };

  const handleExecuteResetStudentPassword = async () => {
    if (!resetPassConfirmStudent) return;
    const target = resetPassConfirmStudent;
    setResetPassConfirmStudent(null);
    try {
      await updateStudent(target.id, {
        ...target,
        password: 'pass123',
      });
      showNotify('success', `Password siswa "${target.nama}" berhasil direset ke "pass123"`);
      const updated = await fetchStudents();
      setStudentList(updated);
      await onRefreshData();
    } catch (err) {
      showNotify('error', 'Gagal mereset password siswa');
    }
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentNama.trim()) {
      showNotify('error', 'Nama siswa tidak boleh kosong');
      return;
    }
    if (!studentNisn.trim()) {
      showNotify('error', 'NISN siswa tidak boleh kosong');
      return;
    }
    if (!studentKelas.trim()) {
      showNotify('error', 'Kelas siswa tidak boleh kosong');
      return;
    }

    setIsSaving(true);
    try {
      const cleanKelas = studentKelas.trim();
      const cleanAbsen = studentNoAbsen.trim() || undefined;

      // Sync custom class to masterClasses if new
      if (cleanKelas && !masterClasses.some((c) => c.toLowerCase() === cleanKelas.toLowerCase())) {
        const updatedMaster = [...masterClasses, cleanKelas].sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
        );
        setMasterClasses(updatedMaster);
        saveMasterClasses(updatedMaster).catch(console.warn);
      }

      if (editingStudent) {
        await updateStudent(editingStudent.id, {
          nama: studentNama.trim(),
          kelas: cleanKelas,
          noAbsen: cleanAbsen,
          nisn: studentNisn.trim(),
          username: studentUsername.trim() || studentNisn.trim(),
          password: studentPassword.trim() || 'pass123',
        });
        showNotify('success', `Data siswa "${studentNama.trim()}" berhasil diperbarui`);
      } else {
        await createStudent({
          nama: studentNama.trim(),
          kelas: cleanKelas,
          noAbsen: cleanAbsen,
          nisn: studentNisn.trim(),
          username: studentUsername.trim() || studentNisn.trim(),
          password: studentPassword.trim() || 'pass123',
        });
        showNotify('success', `Akun siswa "${studentNama.trim()}" berhasil dibuat`);
      }
      setIsStudentModalOpen(false);
      resetStudentForm();
      const updated = await fetchStudents();
      setStudentList(updated);
      await onRefreshData();
    } catch (err) {
      showNotify('error', 'Gagal menyimpan akun siswa');
    } finally {
      setIsSaving(false);
    }
  };
  const [editingTeacher, setEditingTeacher] = useState<TeacherAccount | null>(null);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const [teacherNip, setTeacherNip] = useState('');
  const [teacherUsername, setTeacherUsername] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherSubjectId, setTeacherSubjectId] = useState('');
  const [teacherAssignedClasses, setTeacherAssignedClasses] = useState<string[]>([]);
  const [newCustomClassInput, setNewCustomClassInput] = useState('');
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [teacherSubjectFilter, setTeacherSubjectFilter] = useState<string>('all');
  const [teacherSortBy, setTeacherSortBy] = useState<'nama' | 'mapel' | 'username' | 'nip'>('nama');
  const [showAllTeacherPasswords, setShowAllTeacherPasswords] = useState(false);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [copiedTeacherId, setCopiedTeacherId] = useState<string | null>(null);
  const [teacherModalGradeTab, setTeacherModalGradeTab] = useState<string>('all');

  // Student Management Filter State
  const [studentClassFilter, setStudentClassFilter] = useState<string>('all');
  const [collapsedStudentClasses, setCollapsedStudentClasses] = useState<Record<string, boolean>>({});

  const toggleStudentClassCollapse = (cls: string) => {
    setCollapsedStudentClasses((prev) => ({ ...prev, [cls]: !prev[cls] }));
  };

  // Student Progress Tracking State
  const [studentProgressMap, setStudentProgressMap] = useState<Record<string, StudentProgressRecord>>({});
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const [progressGradeFilter, setProgressGradeFilter] = useState<string>('all'); // 'all', '7', '8', '9', etc.
  const [progressSubClassFilter, setProgressSubClassFilter] = useState<string>('all'); // 'all' or '7.1', etc.
  const [progressSubjectFilter, setProgressSubjectFilter] = useState<string>('all');
  const [progressStatusFilter, setProgressStatusFilter] = useState<'all' | 'completed' | 'in_progress' | 'not_started'>('all');
  const [progressSearchQuery, setProgressSearchQuery] = useState<string>('');
  const [progressSortBy, setProgressSortBy] = useState<'absen' | 'nama' | 'highest' | 'lowest' | 'recent'>('absen');
  const [progressViewMode, setProgressViewMode] = useState<'table' | 'cards'>('table');
  const [expandedProgressStudentIds, setExpandedProgressStudentIds] = useState<Record<string, boolean>>({});
  const [progressCopiedNisn, setProgressCopiedNisn] = useState<string | null>(null);

  // Student Progress Reset Dialog State
  const [resetProgressConfirm, setResetProgressConfirm] = useState<{
    studentId: string;
    studentName: string;
    studentClass: string;
    materialId?: string;
    materialTitle?: string;
    isAll?: boolean;
  } | null>(null);
  const [isResettingProgress, setIsResettingProgress] = useState<boolean>(false);

  const handleExecuteResetProgress = async () => {
    if (!resetProgressConfirm) return;
    setIsResettingProgress(true);
    try {
      const { studentId, studentName, studentClass, materialId, materialTitle, isAll } = resetProgressConfirm;
      if (isAll) {
        await resetAllStudentProgress(studentId, studentName, studentClass);
        setStudentProgressMap((prev) => ({
          ...prev,
          [studentId]: {
            studentId,
            studentName: studentName || '',
            kelas: studentClass || '',
            completedMaterialIds: [],
            updatedAt: new Date().toISOString(),
          },
        }));
        showNotify('success', `Seluruh progres siswa ${studentName} (${studentClass}) berhasil di-reset.`);
      } else if (materialId) {
        const updated = await resetStudentMaterialProgress(studentId, materialId, studentName, studentClass);
        setStudentProgressMap((prev) => {
          const existing = prev[studentId] || { studentId, studentName, kelas: studentClass, completedMaterialIds: [] };
          return {
            ...prev,
            [studentId]: {
              ...existing,
              studentName: studentName || existing.studentName,
              kelas: studentClass || existing.kelas,
              completedMaterialIds: updated,
              updatedAt: new Date().toISOString(),
            },
          };
        });
        showNotify('success', `Progres materi "${materialTitle || 'Materi'}" untuk siswa ${studentName} berhasil di-reset. Siswa dapat mengulang materi sekarang.`);
      }
      setResetProgressConfirm(null);
    } catch (err) {
      console.error('Error in handleExecuteResetProgress:', err);
      showNotify('error', 'Gagal me-reset progres siswa');
    } finally {
      setIsResettingProgress(false);
    }
  };

  const toggleStudentProgressExpanded = (studentId: string) => {
    setExpandedProgressStudentIds((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  const expandAllStudentProgress = (studentIds: string[]) => {
    const next: Record<string, boolean> = {};
    studentIds.forEach((id) => (next[id] = true));
    setExpandedProgressStudentIds(next);
  };

  const collapseAllStudentProgress = () => {
    setExpandedProgressStudentIds({});
  };

  const loadStudentProgressData = async () => {
    setIsLoadingProgress(true);
    try {
      const map = await fetchAllStudentProgress();
      setStudentProgressMap(map);
    } catch (err) {
      console.error('Error fetching progress:', err);
    } finally {
      setIsLoadingProgress(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'progress') {
      loadStudentProgressData();
    }
  }, [activeTab]);

  useEffect(() => {
    if (subjects.length > 0 && !teacherSubjectId) {
      setTeacherSubjectId(subjects[0].id);
    }
  }, [subjects, teacherSubjectId]);

  // Lock teacher subject ID if teacher role
  useEffect(() => {
    if (isTeacherRole && currentTeacher?.subjectId) {
      setCatSubjectId(currentTeacher.subjectId);
      setMatSubjectId(currentTeacher.subjectId);
      setSelectedSubjIdFilter(currentTeacher.subjectId);
    }
  }, [isTeacherRole, currentTeacher]);

  const toggleShowPassword = (id: string) => {
    setShowPasswordMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleTeacherClass = (cls: string) => {
    setTeacherAssignedClasses((prev) =>
      prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls]
    );
  };

  const selectAllClassesForGrade = (gradeId: string) => {
    const classesInGrade = allAvailableClasses.filter((cls) => {
      if (gradeId === 'all') return true;
      return getGradeCategory(cls) === gradeId;
    });
    setTeacherAssignedClasses((prev) => Array.from(new Set([...prev, ...classesInGrade])));
  };

  const deselectAllClassesForGrade = (gradeId: string) => {
    const classesInGrade = allAvailableClasses.filter((cls) => {
      if (gradeId === 'all') return true;
      return getGradeCategory(cls) === gradeId;
    });
    setTeacherAssignedClasses((prev) => prev.filter((c) => !classesInGrade.includes(c)));
  };

  const handleAddCustomClass = async () => {
    const trimmed = newCustomClassInput.trim();
    if (!trimmed) return;
    if (!teacherAssignedClasses.includes(trimmed)) {
      setTeacherAssignedClasses((prev) => [...prev, trimmed]);
    }
    // Also sync to masterClasses so it is immediately available across all forms and filters
    if (!masterClasses.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      const updated = [...masterClasses, trimmed].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
      );
      setMasterClasses(updated);
      await saveMasterClasses(updated);
    }
    setNewCustomClassInput('');
  };

  const resetTeacherForm = () => {
    setEditingTeacher(null);
    setTeacherName('');
    setTeacherNip('');
    setTeacherUsername('');
    setTeacherPassword('');
    setTeacherAssignedClasses([]);
    setNewCustomClassInput('');
    if (subjects.length > 0) setTeacherSubjectId(subjects[0].id);
  };

  const handleOpenAddTeacherModal = (defaultSubjectId?: string) => {
    resetTeacherForm();
    if (defaultSubjectId && defaultSubjectId !== 'all') {
      setTeacherSubjectId(defaultSubjectId);
    } else if (subjects.length > 0) {
      setTeacherSubjectId(subjects[0].id);
    }
    setIsTeacherModalOpen(true);
  };

  const handleEditTeacher = (t: TeacherAccount) => {
    setEditingTeacher(t);
    setTeacherName(t.name);
    setTeacherNip(t.nip || '');
    setTeacherUsername(t.username);
    setTeacherPassword(t.password);
    setTeacherSubjectId(t.subjectId);
    setTeacherAssignedClasses(t.assignedClasses || []);
    setIsTeacherModalOpen(true);
  };

  const handleDeleteTeacher = (id: string, name: string) => {
    setDeleteConfirmItem({ id, title: name, type: 'teacher' as any });
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName.trim()) {
      showNotify('error', 'Nama guru tidak boleh kosong');
      return;
    }
    if (!teacherUsername.trim()) {
      showNotify('error', 'Username guru tidak boleh kosong');
      return;
    }
    if (!teacherPassword.trim()) {
      showNotify('error', 'Password guru tidak boleh kosong');
      return;
    }
    if (!teacherSubjectId) {
      showNotify('error', 'Pilih mata pelajaran pengampuan guru');
      return;
    }

    const teacherList = teachers || [];
    const duplicate = teacherList.find(
      (t) => t.username.trim().toLowerCase() === teacherUsername.trim().toLowerCase() && (!editingTeacher || t.id !== editingTeacher.id)
    );
    if (duplicate) {
      showNotify('error', `Username "@${teacherUsername.trim()}" sudah digunakan. Gunakan username lain.`);
      return;
    }

    setIsSaving(true);
    try {
      // Sync any new assigned classes into masterClasses
      const newAssigned = teacherAssignedClasses.filter(
        (c) => !masterClasses.some((mc) => mc.toLowerCase() === c.toLowerCase())
      );
      if (newAssigned.length > 0) {
        const updatedMaster = [...masterClasses, ...newAssigned].sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
        );
        setMasterClasses(updatedMaster);
        saveMasterClasses(updatedMaster).catch(console.warn);
      }

      if (editingTeacher) {
        await updateTeacher(editingTeacher.id, {
          name: teacherName.trim(),
          nip: teacherNip.trim() || undefined,
          username: teacherUsername.trim(),
          password: teacherPassword.trim(),
          subjectId: teacherSubjectId,
          assignedClasses: teacherAssignedClasses,
        });
        showNotify('success', 'Akun guru berhasil diperbarui');
      } else {
        await createTeacher({
          name: teacherName.trim(),
          nip: teacherNip.trim() || undefined,
          username: teacherUsername.trim(),
          password: teacherPassword.trim(),
          subjectId: teacherSubjectId,
          assignedClasses: teacherAssignedClasses,
        });
        showNotify('success', 'Akun guru baru berhasil ditambahkan');
      }
      resetTeacherForm();
      setIsTeacherModalOpen(false);
      await onRefreshData();
    } catch (err) {
      showNotify('error', 'Gagal menyimpan akun guru');
    } finally {
      setIsSaving(false);
    }
  };

  // Scoped Categories and Materials based on Role
  const displayedCategories = isTeacherRole && currentTeacher
    ? categories.filter((c) => (c.subjectId || 'informatika') === currentTeacher.subjectId)
    : categories;

  const displayedMaterials = isTeacherRole && currentTeacher
    ? materials.filter((m) => {
        const cat = categories.find((c) => c.id === m.categoryId);
        return cat ? (cat.subjectId || 'informatika') === currentTeacher.subjectId : true;
      })
    : materials;

  const teacherList = teachers || [];
  const filteredTeachersList = teacherList
    .filter((t) => {
      // Filter by subject
      if (teacherSubjectFilter !== 'all' && t.subjectId !== teacherSubjectFilter) {
        return false;
      }
      // Search query
      if (!teacherSearchQuery.trim()) return true;
      const q = teacherSearchQuery.toLowerCase();
      const subj = subjects.find((s) => s.id === t.subjectId);
      const classesStr = (t.assignedClasses || []).join(' ').toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        (t.nip && t.nip.toLowerCase().includes(q)) ||
        t.username.toLowerCase().includes(q) ||
        classesStr.includes(q) ||
        (subj && subj.name.toLowerCase().includes(q)) ||
        (subj && subj.code && subj.code.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (teacherSortBy === 'nama') {
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      }
      if (teacherSortBy === 'mapel') {
        const subjA = subjects.find((s) => s.id === a.subjectId)?.name || '';
        const subjB = subjects.find((s) => s.id === b.subjectId)?.name || '';
        const cmp = subjA.localeCompare(subjB, undefined, { sensitivity: 'base' });
        return cmp !== 0 ? cmp : a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      }
      if (teacherSortBy === 'username') {
        return a.username.localeCompare(b.username, undefined, { sensitivity: 'base' });
      }
      if (teacherSortBy === 'nip') {
        return (a.nip || '').localeCompare(b.nip || '', undefined, { numeric: true });
      }
      return 0;
    });
  const [parsedEmbed, setParsedEmbed] = useState<{ embedUrl: string; type: MaterialType; isValid: boolean; message?: string }>({
    embedUrl: '',
    type: 'gdrive',
    isValid: false,
  });

  // Tester Standalone URL State
  const [testInputUrl, setTestInputUrl] = useState('');
  const [testResult, setTestResult] = useState<ReturnType<typeof parseEmbedUrl> | null>(null);

  // General Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  // Delete confirmation modal state
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{
    id: string;
    title: string;
    type: 'material' | 'category' | 'subject' | 'teacher' | 'student';
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (subjects.length > 0 && !catSubjectId) {
      setCatSubjectId(subjects[0].id);
    }
    if (subjects.length > 0 && !matSubjectId) {
      setMatSubjectId(subjects[0].id);
    }
  }, [subjects]);

  useEffect(() => {
    if (categories.length > 0) {
      const activeSubjId = matSubjectId || (subjects[0]?.id || '');
      const availableCats = categories.filter((c) => c.subjectId === activeSubjId);
      if (availableCats.length > 0) {
        if (!matCategoryId || !availableCats.some((c) => c.id === matCategoryId)) {
          setMatCategoryId(availableCats[0].id);
        }
      } else {
        setMatCategoryId('');
      }
    }
  }, [categories, matSubjectId, subjects]);

  const handleMatSubjectChange = (newSubjId: string) => {
    setMatSubjectId(newSubjId);
    const availableCats = categories.filter((c) => (c.subjectId || 'informatika') === newSubjId);
    if (availableCats.length > 0) {
      setMatCategoryId(availableCats[0].id);
    } else {
      setMatCategoryId('');
    }
  };

  // Live convert material URL as user types
  useEffect(() => {
    if (matOriginalUrl) {
      const res = parseEmbedUrl(matOriginalUrl);
      setParsedEmbed(res);
    } else {
      setParsedEmbed({ embedUrl: '', type: 'gdrive', isValid: false });
    }
  }, [matOriginalUrl]);

  if (!isOpen) return null;

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Conflict state detection for real-time order validation
  const subjOrderConflict = subjOrder !== ''
    ? subjects.find((s) => s.order === Number(subjOrder) && (!editingSubject || s.id !== editingSubject.id))
    : null;

  const activeCatSubjId = catSubjectId || (subjects[0]?.id || 'informatika');
  const catOrderConflict = catOrder !== ''
    ? categories.find(
        (c) => (c.subjectId || 'informatika') === activeCatSubjId && c.order === Number(catOrder) && (!editingCategory || c.id !== editingCategory.id)
      )
    : null;

  const matOrderConflict = matOrder !== ''
    ? materials.find(
        (m) => m.categoryId === matCategoryId && m.order === Number(matOrder) && (!editingMaterial || m.id !== editingMaterial.id)
      )
    : null;

  // --- Subject Handlers ---
  const handleOpenAddSubjectModal = () => {
    resetSubjectForm();
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjName.trim()) {
      showNotify('error', 'Nama mata pelajaran tidak boleh kosong');
      return;
    }

    const maxSubjOrder = subjects.reduce((max, s) => Math.max(max, s.order || 0), 0);
    const finalOrder = subjOrder === '' ? maxSubjOrder + 1 : Number(subjOrder) || 1;

    // Check duplicate order
    const duplicateSubj = subjects.find(
      (s) => s.order === finalOrder && (!editingSubject || s.id !== editingSubject.id)
    );
    if (duplicateSubj) {
      showNotify(
        'error',
        `Urutan #${finalOrder} sudah digunakan oleh mata pelajaran "${duplicateSubj.name}". Silakan ubah nomor urutan agar tidak tertumpuk!`
      );
      return;
    }

    setIsSaving(true);
    try {
      if (editingSubject) {
        await updateSubject(editingSubject.id, {
          name: subjName.trim(),
          code: subjCode.trim().toUpperCase() || undefined,
          description: subjDescription.trim(),
          icon: subjIcon,
          order: finalOrder,
        });
        showNotify('success', 'Mata pelajaran berhasil diperbarui');
      } else {
        await createSubject({
          name: subjName.trim(),
          code: subjCode.trim().toUpperCase() || undefined,
          description: subjDescription.trim(),
          icon: subjIcon,
          order: finalOrder,
        });
        showNotify('success', 'Mata pelajaran baru berhasil ditambahkan');
      }
      resetSubjectForm();
      setIsSubjectModalOpen(false);
      await onRefreshData();
    } catch (err) {
      showNotify('error', 'Gagal menyimpan mata pelajaran');
    } finally {
      setIsSaving(false);
    }
  };

  const resetSubjectForm = () => {
    setEditingSubject(null);
    setSubjName('');
    setSubjCode('');
    setSubjDescription('');
    setSubjIcon('Code2');
    setSubjOrder('');
  };

  const handleEditSubject = (subj: Subject) => {
    setEditingSubject(subj);
    setSubjName(subj.name);
    setSubjCode(subj.code || '');
    setSubjDescription(subj.description || '');
    setSubjIcon(subj.icon || 'Code2');
    setSubjOrder(subj.order || '');
    setIsSubjectModalOpen(true);
  };

  const handleDeleteSubject = (id: string, name: string) => {
    setDeleteConfirmItem({ id, title: name, type: 'subject' });
  };

  // --- Category Handlers ---
  const handleOpenAddCategoryModal = (defaultSubjId?: string) => {
    resetCategoryForm();
    if (defaultSubjId && defaultSubjId !== 'all') {
      setCatSubjectId(defaultSubjId);
    }
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catTitle.trim()) {
      showNotify('error', 'Judul kategori tidak boleh kosong');
      return;
    }

    const targetSubjId = catSubjectId || (subjects[0]?.id || 'informatika');
    const sameSubjectCats = categories.filter((c) => (c.subjectId || 'informatika') === targetSubjId);
    const maxCatOrder = sameSubjectCats.reduce((max, c) => Math.max(max, c.order || 0), 0);
    const finalOrder = catOrder === '' ? maxCatOrder + 1 : Number(catOrder) || 1;

    // Check duplicate order
    const duplicateCat = sameSubjectCats.find(
      (c) => c.order === finalOrder && (!editingCategory || c.id !== editingCategory.id)
    );
    if (duplicateCat) {
      showNotify(
        'error',
        `Urutan #${finalOrder} sudah digunakan oleh topik "${duplicateCat.title}". Silakan ubah nomor urutan agar tidak tertumpuk!`
      );
      return;
    }

    setIsSaving(true);
    try {
      const creatorId = isTeacherRole && currentTeacher ? currentTeacher.id : (editingCategory?.createdBy || 'admin');
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          subjectId: targetSubjId,
          title: catTitle.trim(),
          description: catDescription.trim(),
          icon: catIcon,
          order: finalOrder,
          createdBy: creatorId,
        });
        showNotify('success', 'Topik berhasil diperbarui');
      } else {
        await createCategory({
          subjectId: targetSubjId,
          title: catTitle.trim(),
          description: catDescription.trim(),
          icon: catIcon,
          order: finalOrder,
          createdBy: creatorId,
        });
        showNotify('success', 'Topik baru berhasil ditambahkan');
      }
      resetCategoryForm();
      setIsCategoryModalOpen(false);
      await onRefreshData();
    } catch (err) {
      showNotify('error', 'Gagal menyimpan topik');
    } finally {
      setIsSaving(false);
    }
  };

  const resetCategoryForm = () => {
    setEditingCategory(null);
    if (isTeacherRole && currentTeacher?.subjectId) {
      setCatSubjectId(currentTeacher.subjectId);
    } else if (categorySubjectFilter && categorySubjectFilter !== 'all') {
      setCatSubjectId(categorySubjectFilter);
    } else if (subjects.length > 0) {
      setCatSubjectId(subjects[0].id);
    }
    setCatTitle('');
    setCatDescription('');
    setCatIcon('BrainCircuit');
    setCatOrder('');
  };

  const handleEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCatSubjectId(cat.subjectId || (subjects[0]?.id || 'informatika'));
    setCatTitle(cat.title);
    setCatDescription(cat.description || '');
    setCatIcon(cat.icon || 'BrainCircuit');
    setCatOrder(cat.order || '');
    setIsCategoryModalOpen(true);
  };

  const handleDeleteCategory = (id: string, title: string) => {
    setDeleteConfirmItem({ id, title, type: 'category' });
  };

  // --- Material Handlers ---
  const handleOpenAddMaterialModal = (defaultSubjId?: string, defaultCatId?: string) => {
    resetMaterialForm();
    const effectiveSubjId = (isTeacherRole && currentTeacher?.subjectId) || (defaultSubjId && defaultSubjId !== 'all' ? defaultSubjId : (subjects[0]?.id || ''));
    setMatSubjectId(effectiveSubjId);
    
    const availableCats = categories.filter((c) => (c.subjectId || 'informatika') === effectiveSubjId);
    if (defaultCatId && availableCats.some((c) => c.id === defaultCatId)) {
      setMatCategoryId(defaultCatId);
    } else if (availableCats.length > 0) {
      setMatCategoryId(availableCats[0].id);
    } else {
      setMatCategoryId('');
    }
    setMatModalTab('basic');
    setIsMaterialModalOpen(true);
  };

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matTitle.trim()) {
      showNotify('error', 'Judul materi tidak boleh kosong');
      return;
    }
    if (!matCategoryId) {
      showNotify('error', 'Pilih kategori materi terlebih dahulu');
      return;
    }
    if (!matOriginalUrl.trim()) {
      showNotify('error', 'Masukkan link Google Drive, Canva, atau Google Form');
      return;
    }

    const sameCategoryMats = materials.filter((m) => m.categoryId === matCategoryId);
    const maxMatOrder = sameCategoryMats.reduce((max, m) => Math.max(max, m.order || 0), 0);
    const finalOrder = matOrder === '' ? maxMatOrder + 1 : Number(matOrder) || 1;

    // Check duplicate order
    const duplicateMat = sameCategoryMats.find(
      (m) => m.order === finalOrder && (!editingMaterial || m.id !== editingMaterial.id)
    );
    if (duplicateMat) {
      showNotify(
        'error',
        `Urutan #${finalOrder} sudah digunakan oleh materi "${duplicateMat.title}". Silakan ubah nomor urutan agar tidak tertumpuk!`
      );
      return;
    }

    const parsed = parseEmbedUrl(matOriginalUrl);

    setIsSaving(true);
    try {
      const reflectionArray = matReflectionQuestions
        .split('\n')
        .map((q) => q.trim())
        .filter((q) => q.length > 0);

      const interactiveConfig = {
        enableGamification: matEnableGamification,
        enableTimeAttack: matEnableTimeAttack,
        timeAttackSeconds: Number(matTimeAttackSeconds) || 30,
        enableLifelines: matEnableLifelines,
        enableAITutor: matEnableAITutor,
      };

      const creatorId = isTeacherRole && currentTeacher ? currentTeacher.id : (editingMaterial?.createdBy || 'admin');

      if (editingMaterial) {
        await updateMaterial(editingMaterial.id, {
          categoryId: matCategoryId,
          title: matTitle.trim(),
          type: parsed.type,
          originalUrl: matOriginalUrl.trim(),
          embedUrl: parsed.embedUrl,
          order: finalOrder,
          description: matDescription.trim(),
          targetGrade: matTargetGrade,
          isPublished: matIsPublished,
          reflectionQuestions: reflectionArray,
          interactiveConfig,
          createdBy: creatorId,
        });
        showNotify('success', 'Materi berhasil diperbarui');
      } else {
        await createMaterial({
          categoryId: matCategoryId,
          title: matTitle.trim(),
          type: parsed.type,
          originalUrl: matOriginalUrl.trim(),
          embedUrl: parsed.embedUrl,
          order: finalOrder,
          description: matDescription.trim(),
          targetGrade: matTargetGrade,
          isPublished: matIsPublished,
          reflectionQuestions: reflectionArray,
          interactiveConfig,
          createdBy: creatorId,
        });
        showNotify('success', 'Materi baru berhasil ditambahkan');
      }

      resetMaterialForm();
      setIsMaterialModalOpen(false);
      await onRefreshData();
    } catch (err) {
      showNotify('error', 'Gagal menyimpan materi');
    } finally {
      setIsSaving(false);
    }
  };

  const resetMaterialForm = () => {
    setEditingMaterial(null);
    const targetSubj = (isTeacherRole && currentTeacher?.subjectId) || (subjects[0]?.id || '');
    setMatSubjectId(targetSubj);
    const defaultCat = categories.find((c) => (c.subjectId || 'informatika') === targetSubj);
    setMatCategoryId(defaultCat?.id || '');
    setMatTitle('');
    setMatOriginalUrl('');
    setMatDescription('');
    setMatOrder('');
    setMatTargetGrade('smp-7');
    setMatIsPublished(true);
    setMatReflectionQuestions('');
    setMatEnableGamification(true);
    setMatEnableTimeAttack(false);
    setMatTimeAttackSeconds(30);
    setMatEnableLifelines(true);
    setMatEnableAITutor(true);
    setParsedEmbed({ embedUrl: '', type: 'gdrive', isValid: false });
  };

  const handleEditMaterial = (mat: Material) => {
    setEditingMaterial(mat);
    const foundCat = categories.find((c) => c.id === mat.categoryId);
    const parentSubjId = foundCat ? foundCat.subjectId : (subjects[0]?.id || '');
    setMatSubjectId(parentSubjId);
    setMatCategoryId(mat.categoryId);
    setMatTitle(mat.title);
    setMatOriginalUrl(mat.originalUrl);
    setMatDescription(mat.description || '');
    setMatOrder(mat.order || '');
    setMatTargetGrade(mat.targetGrade || 'smp-7');
    setMatIsPublished(mat.isPublished ?? true);
    setMatReflectionQuestions((mat.reflectionQuestions || []).join('\n'));

    const cfg = mat.interactiveConfig || {};
    setMatEnableGamification(cfg.enableGamification ?? true);
    setMatEnableTimeAttack(cfg.enableTimeAttack ?? false);
    setMatTimeAttackSeconds(cfg.timeAttackSeconds ?? 30);
    setMatEnableLifelines(cfg.enableLifelines ?? true);
    setMatEnableAITutor(cfg.enableAITutor ?? true);

    setMatModalTab('basic');
    setIsMaterialModalOpen(true);
  };

  const handleDeleteMaterial = (id: string, title: string) => {
    setDeleteConfirmItem({ id, title, type: 'material' });
  };

  const handleConfirmAction = async () => {
    if (!deleteConfirmItem) return;
    const target = deleteConfirmItem;
    // Close modal immediately so UI feels instantaneous
    setDeleteConfirmItem(null);

    if (target.type === 'material') {
      onDeleteMaterialOptimistic?.(target.id);
      showNotify('success', `Materi "${target.title}" berhasil dihapus`);
      try {
        await deleteMaterial(target.id);
        await onRefreshData();
      } catch (err) {
        console.error('Error deleting material:', err);
        showNotify('error', 'Gagal menghapus materi dari database');
      }
    } else if (target.type === 'category') {
      onDeleteCategoryOptimistic?.(target.id);
      showNotify('success', `Topik "${target.title}" berhasil dihapus`);
      try {
        await deleteCategory(target.id);
        await onRefreshData();
      } catch (err) {
        console.error('Error deleting category:', err);
        showNotify('error', 'Gagal menghapus topik dari database');
      }
    } else if (target.type === 'subject') {
      onDeleteSubjectOptimistic?.(target.id);
      showNotify('success', `Mata pelajaran "${target.title}" berhasil dihapus`);
      try {
        await deleteSubject(target.id);
        await onRefreshData();
      } catch (err) {
        console.error('Error deleting subject:', err);
        showNotify('error', 'Gagal menghapus mata pelajaran dari database');
      }
    } else if ((target.type as string) === 'teacher') {
      showNotify('success', `Akun guru "${target.title}" berhasil dihapus`);
      try {
        await deleteTeacher(target.id);
        await onRefreshData();
      } catch (err) {
        console.error('Error deleting teacher:', err);
        showNotify('error', 'Gagal menghapus akun guru dari database');
      }
    } else if ((target.type as string) === 'student') {
      // Optimistic update locally
      setStudentList((prev) => prev.filter((s) => s.id !== target.id));
      showNotify('success', `Akun siswa "${target.title}" berhasil dihapus`);
      try {
        await deleteStudent(target.id);
        const updated = await fetchStudents();
        setStudentList(updated);
        await onRefreshData();
      } catch (err) {
        console.error('Error deleting student:', err);
        showNotify('error', 'Gagal menghapus akun siswa dari database');
        const rollback = await fetchStudents();
        setStudentList(rollback);
      }
    }
  };

  // --- PIN Setting Handler ---
  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinSuccessMsg('');
    setPinErrorMsg('');

    if (newPin.length < 4) {
      setPinErrorMsg('PIN minimal 4 karakter');
      return;
    }
    if (newPin !== confirmPin) {
      setPinErrorMsg('Konfirmasi PIN tidak cocok');
      return;
    }

    try {
      await setAdminPin(newPin.trim());
      setPinSuccessMsg('PIN Admin berhasil diperbarui!');
      setNewPin('');
      setConfirmPin('');
    } catch (err) {
      setPinErrorMsg('Gagal memperbarui PIN');
    }
  };

  const filteredMaterials =
    selectedCatIdFilter === 'all'
      ? materials
      : materials.filter((m) => m.categoryId === selectedCatIdFilter);

  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-slate-100 flex flex-col relative selection:bg-indigo-500 selection:text-white">
      {/* Unified Sticky Header & Tabs Navigation Container */}
      <div className="sticky top-0 z-40 w-full shadow-md">
        {/* Top Header Navigation - Full Width */}
        <header className="w-full bg-slate-950 text-white border-b border-slate-800">
          <div className="w-full px-3 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Left info brand & badge */}
            <div className="flex items-center gap-3 min-w-0">
              {siteLogoUrl ? (
                <img src={parseLogoUrl(siteLogoUrl)} alt="Logo" className="w-10 h-10 object-contain rounded-xl bg-white/10 p-1 border border-white/20 shrink-0 shadow-xs" />
              ) : (
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-xs ${
                  isTeacherRole 
                    ? 'bg-indigo-500/20 border-indigo-400/40 text-indigo-300' 
                    : 'bg-amber-500/20 border-amber-400/40 text-amber-400'
                }`}>
                  {isTeacherRole ? <UserCheck className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-heading font-black text-sm sm:text-lg leading-tight truncate text-white">
                    {isTeacherRole ? `Dashboard Guru: ${currentTeacher?.name}` : 'Dashboard Utama Admin'}
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-2xs ${
                    isTeacherRole ? 'bg-indigo-600 text-white border border-indigo-400/60' : 'bg-amber-500 text-slate-950 border border-amber-300 font-extrabold'
                  }`}>
                    {isTeacherRole ? 'Akun Guru' : 'Administrator'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 truncate mt-0.5 font-medium">
                  {isTeacherRole 
                    ? `Pengampu: ${assignedSubject ? assignedSubject.name : 'Utama'} • Kelola Topik & Materi`
                    : 'Kelola Mapel, Topik, Materi, Siswa, Guru & Sistem'
                  }
                </p>
              </div>
            </div>

            {/* Right Action Control Buttons - Mobile Optimized */}
            <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-slate-800/80">
              <button
                type="button"
                onClick={onOpenGuide}
                className="flex-1 sm:flex-initial px-3 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-amber-300 hover:text-amber-200 text-xs font-bold rounded-xl border border-amber-500/50 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs hover:border-amber-400"
              >
                <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">Panduan</span>
              </button>
              {onSwitchToStudentView && (
                <button
                  type="button"
                  onClick={onSwitchToStudentView}
                  className="flex-1 sm:flex-initial px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-indigo-600/40 border border-indigo-400/60 shrink-0"
                  title="Lihat Pratinjau Tampilan Siswa"
                >
                  <Eye className="w-4 h-4 shrink-0 text-indigo-100" />
                  <span className="truncate">Tampilan Siswa</span>
                </button>
              )}
              <button
                type="button"
                onClick={onLogout || onClose}
                className="flex-1 sm:flex-initial px-3.5 py-2 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-black rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-rose-600/40 border border-rose-400/60 shrink-0"
                title="Keluar dari Akun"
              >
                <LogOut className="w-4 h-4 shrink-0 text-rose-100" />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </header>

        {/* Full Width Navigation Bar / Tabs */}
        <nav className="w-full bg-slate-900 border-b border-slate-800 shadow-sm">
          <div className="w-full px-3 sm:px-6 lg:px-8 flex gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-2">
            {!isTeacherRole && (
              <button
                type="button"
                onClick={() => setActiveTab('subjects')}
                className={`py-2 px-3 sm:px-4 font-bold text-xs rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0 border ${
                  activeTab === 'subjects'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40 border-blue-400'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white hover:border-slate-600'
                }`}
              >
                <GraduationCap className={`w-4 h-4 ${activeTab === 'subjects' ? 'text-white' : 'text-blue-400'}`} />
                <span>Mata Pelajaran</span>
                <span className={`px-1.5 py-0.5 text-[10px] rounded-md font-mono font-bold ${
                  activeTab === 'subjects' ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-200'
                }`}>{subjects.length}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`py-2 px-3 sm:px-4 font-bold text-xs rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0 border ${
                activeTab === 'categories'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/40 border-violet-400'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white hover:border-slate-600'
              }`}
            >
              <Layers className={`w-4 h-4 ${activeTab === 'categories' ? 'text-white' : 'text-violet-400'}`} />
              <span>Topik Pembelajaran</span>
              <span className={`px-1.5 py-0.5 text-[10px] rounded-md font-mono font-bold ${
                activeTab === 'categories' ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-200'
              }`}>{displayedCategories.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('materials')}
              className={`py-2 px-3 sm:px-4 font-bold text-xs rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0 border ${
                activeTab === 'materials'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/40 border-emerald-400'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white hover:border-slate-600'
              }`}
            >
              <FileSpreadsheet className={`w-4 h-4 ${activeTab === 'materials' ? 'text-white' : 'text-emerald-400'}`} />
              <span>Kelola Materi</span>
              <span className={`px-1.5 py-0.5 text-[10px] rounded-md font-mono font-bold ${
                activeTab === 'materials' ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-200'
              }`}>{displayedMaterials.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('progress')}
              className={`py-2 px-3 sm:px-4 font-bold text-xs rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0 border ${
                activeTab === 'progress'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/40 border-amber-400'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white hover:border-slate-600'
              }`}
            >
              <BarChart3 className={`w-4 h-4 ${activeTab === 'progress' ? 'text-white' : 'text-amber-400'}`} />
              <span>Progres Siswa</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tester')}
              className={`py-2 px-3 sm:px-4 font-bold text-xs rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0 border ${
                activeTab === 'tester'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/40 border-sky-400'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white hover:border-slate-600'
              }`}
            >
              <Link className={`w-4 h-4 ${activeTab === 'tester' ? 'text-white' : 'text-sky-400'}`} />
              <span>Uji Link</span>
            </button>

            {!isTeacherRole && (
              <button
                type="button"
                onClick={() => setActiveTab('students')}
                className={`py-2 px-3 sm:px-4 font-bold text-xs rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0 border ${
                  activeTab === 'students'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/40 border-purple-400'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white hover:border-slate-600'
                }`}
              >
                <GraduationCap className={`w-4 h-4 ${activeTab === 'students' ? 'text-white' : 'text-purple-400'}`} />
                <span>Akun Siswa</span>
                <span className={`px-1.5 py-0.5 text-[10px] rounded-md font-mono font-bold ${
                  activeTab === 'students' ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-200'
                }`}>{studentList.length}</span>
              </button>
            )}

            {!isTeacherRole && (
              <button
                type="button"
                onClick={() => setActiveTab('teachers')}
                className={`py-2 px-3 sm:px-4 font-bold text-xs rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0 border ${
                  activeTab === 'teachers'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40 border-indigo-400'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white hover:border-slate-600'
                }`}
              >
                <Users className={`w-4 h-4 ${activeTab === 'teachers' ? 'text-white' : 'text-indigo-400'}`} />
                <span>Akun Guru</span>
                <span className={`px-1.5 py-0.5 text-[10px] rounded-md font-mono font-bold ${
                  activeTab === 'teachers' ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-200'
                }`}>{teacherList.length}</span>
              </button>
            )}

            {!isTeacherRole && (
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`py-2 px-3 sm:px-4 font-bold text-xs rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0 border ${
                  activeTab === 'settings'
                    ? 'bg-slate-700 text-white shadow-md shadow-slate-700/40 border-slate-500'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white hover:border-slate-600'
                }`}
              >
                <Lock className={`w-4 h-4 ${activeTab === 'settings' ? 'text-white' : 'text-slate-400'}`} />
                <span>Pengaturan Sistem</span>
              </button>
            )}
          </div>
        </nav>
      </div>

      {/* Full Width Main Content Body Container */}
      <main className="w-full flex-1 p-4 sm:p-6 lg:p-8">
        {/* Global Notification */}
        {notification && (
          <div
            className={`mb-6 p-4 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all shadow-xs ${
              notification.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{notification.message}</span>
          </div>
        )}

        {/* Teacher Role Context Alert */}
        {isTeacherRole && (
          <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-indigo-950 font-medium shadow-xs">
            <div className="flex items-center gap-2.5">
              <UserCheck className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>
                <strong>Akses Pengelolaan Guru ({currentTeacher?.name}):</strong> Pengampu Mata Pelajaran <strong className="text-indigo-700">{assignedSubject ? assignedSubject.name : 'Utama'}</strong>. Anda dapat mengelola topik &amp; materi pembelajaran.
              </span>
            </div>
            <span className="text-[10px] bg-indigo-200/80 text-indigo-900 font-extrabold px-2.5 py-1 rounded-lg uppercase shrink-0">
              Akses Guru Terisolasi
            </span>
          </div>
        )}        {/* Tab 0: MANAGE SUBJECTS */}
        {activeTab === 'subjects' && (() => {
          const filteredSubjects = subjects
            .filter((s) => {
              if (!subjSearchQuery.trim()) return true;
              const q = subjSearchQuery.toLowerCase();
              return (
                s.name.toLowerCase().includes(q) ||
                (s.code && s.code.toLowerCase().includes(q)) ||
                (s.description && s.description.toLowerCase().includes(q))
              );
            })
            .sort((a, b) => {
              if (subjSortBy === 'name') return a.name.localeCompare(b.name);
              if (subjSortBy === 'topics') {
                const countA = categories.filter((c) => c.subjectId === a.id || (!c.subjectId && a.id === 'informatika')).length;
                const countB = categories.filter((c) => c.subjectId === b.id || (!c.subjectId && b.id === 'informatika')).length;
                return countB - countA;
              }
              return (a.order || 0) - (b.order || 0);
            });

          return (
            <div className="space-y-5">
              {/* Header Toolbar */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                      <BookOpen className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900">
                        Kelola Mata Pelajaran
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Kelola kurikulum mata pelajaran, nomor urutan, kode singkat, dan topik pembelajaran
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap justify-end">
                  <span className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200">
                    {subjects.length} Mapel Terdaftar
                  </span>
                  <button
                    type="button"
                    onClick={handleOpenAddSubjectModal}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Tambah Mata Pelajaran</span>
                  </button>
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari mata pelajaran / kode..."
                    value={subjSearchQuery}
                    onChange={(e) => setSubjSearchQuery(e.target.value)}
                    className="w-full pl-8.5 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                  />
                  {subjSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setSubjSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
                  <select
                    value={subjSortBy}
                    onChange={(e) => setSubjSortBy(e.target.value as any)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                  >
                    <option value="order">Urutkan: Nomor Urutan</option>
                    <option value="name">Urutkan: Nama (A-Z)</option>
                    <option value="topics">Urutkan: Jumlah Topik</option>
                  </select>
                </div>
              </div>

              {/* Grid of Subject Cards */}
              {filteredSubjects.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 space-y-3">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm">Tidak ada mata pelajaran ditemukan</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {subjSearchQuery ? 'Coba sesuaikan kata kunci pencarian Anda.' : 'Belum ada mata pelajaran terdaftar.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenAddSubjectModal}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Mata Pelajaran Baru</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSubjects.map((s) => {
                    const subjCats = categories.filter((c) => c.subjectId === s.id || (!c.subjectId && s.id === 'informatika'));
                    const subjMaterialsCount = materials.filter((m) => {
                      const cat = categories.find((c) => c.id === m.categoryId);
                      return cat ? (cat.subjectId === s.id || (!cat.subjectId && s.id === 'informatika')) : (s.id === 'informatika');
                    }).length;

                    return (
                      <div
                        key={s.id}
                        className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all p-5 flex flex-col justify-between group"
                      >
                        <div className="space-y-3">
                          {/* Top row: Icon + Badges */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100/80 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                              {getSubjectIcon(s.icon, "w-6 h-6 text-indigo-600")}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">
                                Urutan #{s.order}
                              </span>
                              {s.code && (
                                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-700 rounded-md border border-slate-200 uppercase">
                                  {s.code}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Subject Name & Description */}
                          <div>
                            <h4 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1" title={s.name}>
                              {s.name}
                            </h4>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 min-h-[32px]">
                              {s.description || 'Mata pelajaran dalam kurikulum sekolah.'}
                            </p>
                          </div>

                          {/* Stats Counters */}
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-center">
                            <div className="p-2 bg-slate-50/80 rounded-xl border border-slate-100">
                              <span className="block text-xs font-black text-slate-800">{subjCats.length}</span>
                              <span className="text-[10px] text-slate-400 font-medium">Topik / Bab</span>
                            </div>
                            <div className="p-2 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                              <span className="block text-xs font-black text-indigo-700">{subjMaterialsCount}</span>
                              <span className="text-[10px] text-indigo-500 font-medium">Bahan Ajar</span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-between gap-2 pt-4 mt-3 border-t border-slate-100">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setCategorySubjectFilter(s.id);
                                setActiveTab('categories');
                              }}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              Lihat Topik
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenAddCategoryModal(s.id)}
                              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                              title={`Tambah Topik ke ${s.name}`}
                            >
                              + Topik
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditSubject(s)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Mata Pelajaran"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSubject(s.id, s.name)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Mata Pelajaran"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* Tab 1: MANAGE MATERIALS */}
        {activeTab === 'materials' && (() => {
          const publishedCount = displayedMaterials.filter((m) => m.isPublished).length;
          const draftCount = displayedMaterials.filter((m) => !m.isPublished).length;

          return (
            <div className="space-y-5">
              {/* Header Toolbar */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                      <Layers className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900">
                        Kelola Materi Pembelajaran
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Organisasi bahan ajar interaktif (Slide Canva, Drive Video, YouTube, PDF, Form Sumatif)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap justify-end">
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
                      {publishedCount} Publik
                    </span>
                    {draftCount > 0 && (
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-xl border border-slate-200">
                        {draftCount} Draft
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenAddMaterialModal(selectedSubjIdFilter !== 'all' ? selectedSubjIdFilter : undefined, selectedCatIdFilter !== 'all' ? selectedCatIdFilter : undefined)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Tambah Materi Baru</span>
                  </button>
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {/* Search bar */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari materi / URL..."
                      value={matSearchQuery}
                      onChange={(e) => setMatSearchQuery(e.target.value)}
                      className="w-full pl-8.5 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                    />
                    {matSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setMatSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Filter Subject */}
                  <div>
                    <select
                      value={selectedSubjIdFilter}
                      onChange={(e) => {
                        setSelectedSubjIdFilter(e.target.value);
                        setSelectedCatIdFilter('all');
                      }}
                      disabled={isTeacherRole}
                      className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer disabled:bg-slate-100 disabled:text-slate-500"
                    >
                      {!isTeacherRole && <option value="all">Semua Mapel ({subjects.length})</option>}
                      {availableSubjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.code ? `[${s.code}]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filter Category */}
                  <div>
                    <select
                      value={selectedCatIdFilter}
                      onChange={(e) => setSelectedCatIdFilter(e.target.value)}
                      className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                    >
                      <option value="all">Semua Topik ({displayedCategories.length})</option>
                      {displayedCategories
                        .filter((c) => selectedSubjIdFilter === 'all' || (c.subjectId || 'informatika') === selectedSubjIdFilter)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Filter Material Type */}
                  <div>
                    <select
                      value={matTypeFilter}
                      onChange={(e) => setMatTypeFilter(e.target.value)}
                      className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                    >
                      <option value="all">Semua Tipe Media</option>
                      <option value="canva">Canva Presentation</option>
                      <option value="youtube">YouTube Video</option>
                      <option value="video">Drive Video</option>
                      <option value="gform">Google Form / Kuis</option>
                      <option value="pdf">Dokumen / PDF</option>
                      <option value="gdrive">Google Drive Link</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 font-semibold pt-2 border-t border-slate-200/80">
                  <span>Menampilkan {displayedMaterials.length} total bahan ajar</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={expandAllMatGroups}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold rounded-lg border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                    >
                      Buka Semua
                    </button>
                    <button
                      type="button"
                      onClick={collapseAllMatGroups}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold rounded-lg border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                    >
                      Tutup Semua
                    </button>
                  </div>
                </div>
              </div>

              {/* Accordion Grouped by Subject -> Category -> Material */}
              <div className="space-y-4">
                {availableSubjects.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
                    <p className="text-xs font-medium">Belum ada mata pelajaran terdaftar.</p>
                  </div>
                ) : (
                  availableSubjects
                    .filter((s) => selectedSubjIdFilter === 'all' || s.id === selectedSubjIdFilter)
                    .map((s) => {
                      const subjCats = displayedCategories.filter((c) => c.subjectId === s.id || (!c.subjectId && s.id === 'informatika'));
                      const subjMaterials = displayedMaterials.filter((m) => {
                        const cat = categories.find((c) => c.id === m.categoryId);
                        const belongsToSubj = cat ? (cat.subjectId === s.id || (!cat.subjectId && s.id === 'informatika')) : (s.id === 'informatika');
                        const matchesCatFilter = selectedCatIdFilter === 'all' || m.categoryId === selectedCatIdFilter;
                        const matchesTypeFilter = matTypeFilter === 'all' || m.type === matTypeFilter;
                        const matchesSearch = !matSearchQuery || m.title.toLowerCase().includes(matSearchQuery.toLowerCase()) || m.originalUrl.toLowerCase().includes(matSearchQuery.toLowerCase());
                        return belongsToSubj && matchesCatFilter && matchesTypeFilter && matchesSearch;
                      });

                      const isSubjCollapsed = matSearchQuery.trim() !== '' ? false : (collapsedMatSubjects[s.id] ?? true);

                      return (
                        <div
                          key={s.id}
                          className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition-all"
                        >
                          {/* Subject Header Accordion */}
                          <div
                            onClick={() => toggleMatSubject(s.id)}
                            className="group w-full px-4 py-3.5 bg-slate-50/90 hover:bg-slate-100/90 border-b border-slate-200/80 flex items-center justify-between cursor-pointer select-none transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs">
                                {getSubjectIcon(s.icon, "w-4 h-4 text-indigo-600")}
                              </div>
                              <div>
                                <h4 className="font-extrabold text-sm text-slate-800 leading-snug group-hover:text-indigo-600 transition-colors">
                                  {s.name} {s.code && <span className="font-mono text-slate-400 text-xs font-normal">[{s.code}]</span>}
                                </h4>
                              </div>
                              <span className="px-2 py-0.5 text-[11px] font-extrabold bg-indigo-100 text-indigo-800 rounded-lg shrink-0">
                                {subjMaterials.length} Materi
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-transform duration-200 ${
                                  isSubjCollapsed ? '' : 'rotate-180 text-indigo-600'
                                }`}
                              >
                                <ChevronDown className="w-4 h-4" />
                              </div>
                            </div>
                          </div>

                          {/* Subject Body */}
                          {!isSubjCollapsed && (
                            <div className="p-3.5 space-y-3 bg-slate-50/40">
                              {subjMaterials.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white space-y-2">
                                  <p className="text-xs font-medium">Belum ada materi pembelajaran yang sesuai filter pada mata pelajaran ini.</p>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAddMaterialModal(s.id)}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Tambah Materi Sekarang</span>
                                  </button>
                                </div>
                              ) : (
                                subjCats
                                  .filter((c) => selectedCatIdFilter === 'all' || c.id === selectedCatIdFilter)
                                  .map((c) => {
                                    const catMaterials = subjMaterials.filter((m) => m.categoryId === c.id);
                                    if (catMaterials.length === 0) return null;

                                    const isCatCollapsed = matSearchQuery.trim() !== '' ? false : (collapsedMatCategories[c.id] ?? true);

                                    return (
                                      <div
                                        key={c.id}
                                        className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs"
                                      >
                                        {/* Category Accordion Bar */}
                                        <div
                                          onClick={() => toggleMatCategory(c.id)}
                                          className="group px-3.5 py-2.5 bg-indigo-50/30 hover:bg-indigo-50/70 border-b border-indigo-100/60 flex items-center justify-between cursor-pointer select-none transition-colors"
                                        >
                                          <div className="flex items-center gap-2.5 min-w-0">
                                            {isCatCollapsed ? (
                                              <Folder className="w-4 h-4 text-indigo-600 shrink-0" />
                                            ) : (
                                              <FolderOpen className="w-4 h-4 text-indigo-600 shrink-0" />
                                            )}
                                            <span className="font-extrabold text-xs text-slate-800 truncate group-hover:text-indigo-700 transition-colors">
                                              Topik: {c.title}
                                            </span>
                                            <span className="px-1.5 py-0.2 text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded-md">
                                              {catMaterials.length}
                                            </span>
                                          </div>
                                          
                                          <div className="flex items-center gap-1.5 shrink-0">
                                            <div
                                              className={`w-6 h-6 rounded-md flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-transform duration-200 ${
                                                isCatCollapsed ? '' : 'rotate-180 text-indigo-600'
                                              }`}
                                            >
                                              <ChevronDown className="w-3.5 h-3.5" />
                                            </div>
                                          </div>
                                        </div>

                                        {/* Materials inside this category */}
                                        {!isCatCollapsed && (
                                          <div className="p-3 space-y-2.5">
                                            {catMaterials.map((mat) => (
                                              <div
                                                key={mat.id}
                                                className="bg-slate-50/70 hover:bg-white p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-2xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
                                              >
                                                <div className="flex-1 min-w-0 space-y-1.5">
                                                  <div className="flex flex-wrap items-center gap-1.5">
                                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-white text-slate-700 rounded border border-slate-200 uppercase">
                                                      Urutan #{mat.order}
                                                    </span>
                                                    <span
                                                      className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                                                        mat.type === 'gform'
                                                          ? 'bg-purple-100 text-purple-800 border-purple-300'
                                                          : mat.type === 'youtube'
                                                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                          : mat.type === 'video'
                                                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                          : mat.type === 'canva'
                                                          ? 'bg-violet-50 text-violet-700 border-violet-200'
                                                          : mat.type === 'pdf'
                                                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                          : 'bg-blue-50 text-blue-700 border-blue-200'
                                                      }`}
                                                    >
                                                      {mat.type === 'gform'
                                                        ? 'Tes Google Form (Sumatif)'
                                                        : mat.type === 'youtube'
                                                        ? 'YouTube'
                                                        : mat.type === 'video'
                                                        ? 'Drive Video'
                                                        : mat.type === 'canva'
                                                        ? 'Canva'
                                                        : mat.type === 'pdf'
                                                        ? 'PDF'
                                                        : 'Google Drive'}
                                                    </span>
                                                    {mat.isPublished ? (
                                                      <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 rounded border border-emerald-100">
                                                        Publik
                                                      </span>
                                                    ) : (
                                                      <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-200 text-slate-600 rounded">
                                                        Draft
                                                      </span>
                                                    )}
                                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 rounded border border-indigo-100 inline-flex items-center gap-1">
                                                      <GraduationCap className="w-3 h-3 text-indigo-600" />
                                                      <span>{formatTargetGradeLabel(mat.targetGrade)}</span>
                                                    </span>

                                                    {/* Interactive Badges */}
                                                    {mat.interactiveConfig?.enableGamification && (
                                                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-50 text-amber-800 rounded border border-amber-200" title="Gamifikasi Aktif">
                                                        🏆 Gamifikasi
                                                      </span>
                                                    )}
                                                    {mat.interactiveConfig?.enableTimeAttack && (
                                                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-rose-50 text-rose-800 rounded border border-rose-200" title="Time Attack Aktif">
                                                        ⚡ {mat.interactiveConfig.timeAttackSeconds}s
                                                      </span>
                                                    )}
                                                    {mat.interactiveConfig?.enableAITutor && (
                                                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-sky-50 text-sky-800 rounded border border-sky-200" title="AI Tutor Aktif">
                                                        🤖 AI Tutor
                                                      </span>
                                                    )}
                                                  </div>
                                                  
                                                  <h5 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-snug break-words">
                                                    {mat.title}
                                                  </h5>
                                                  
                                                  <div className="flex items-center gap-2">
                                                    <a
                                                      href={mat.originalUrl}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="text-[10px] font-mono text-indigo-600 hover:underline truncate max-w-sm sm:max-w-md inline-block"
                                                      title="Buka link asli materi"
                                                    >
                                                      {mat.originalUrl}
                                                    </a>
                                                  </div>
                                                </div>

                                                <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                                                  <button
                                                    type="button"
                                                    onClick={() => handleEditMaterial(mat)}
                                                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs rounded-xl border border-amber-200 transition-colors flex items-center gap-1 cursor-pointer"
                                                    title="Edit Materi"
                                                  >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                    <span>Edit</span>
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleDeleteMaterial(mat.id, mat.title)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                                                    title="Hapus Materi"
                                                  >
                                                    <Trash2 className="w-4 h-4" />
                                                  </button>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          );
        })()}

        {/* Tab 2: MANAGE CATEGORIES */}
        {activeTab === 'categories' && (() => {
          const filteredCategories = displayedCategories.filter((c) => {
            const matchesSubject = categorySubjectFilter === 'all' || (c.subjectId || 'informatika') === categorySubjectFilter;
            const matchesSearch = !catSearchQuery || c.title.toLowerCase().includes(catSearchQuery.toLowerCase()) || (c.description && c.description.toLowerCase().includes(catSearchQuery.toLowerCase()));
            return matchesSubject && matchesSearch;
          });

          return (
            <div className="space-y-5">
              {/* Header Toolbar */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                      <Folder className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900">
                        Kelola Topik &amp; Bab Pembelajaran
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Kelola modul materi, bab, dan silabus berdasarkan mata pelajaran
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap justify-end">
                  <span className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200">
                    {displayedCategories.length} Total Topik
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenAddCategoryModal(categorySubjectFilter !== 'all' ? categorySubjectFilter : undefined)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Tambah Topik Baru</span>
                  </button>
                </div>
              </div>

              {/* Subject Pill Filters & Search Bar */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                {/* Subject Selector Pills */}
                {!isTeacherRole && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                    <button
                      type="button"
                      onClick={() => setCategorySubjectFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        categorySubjectFilter === 'all'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      Semua Mapel ({displayedCategories.length})
                    </button>
                    {availableSubjects.map((s) => {
                      const count = displayedCategories.filter((c) => (c.subjectId || 'informatika') === s.id).length;
                      const isSel = categorySubjectFilter === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setCategorySubjectFilter(s.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                            isSel
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          <span>{s.name}</span>
                          <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${isSel ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari judul topik / kata kunci..."
                      value={catSearchQuery}
                      onChange={(e) => setCatSearchQuery(e.target.value)}
                      className="w-full pl-8.5 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                    />
                    {catSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setCatSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={expandAllCatSubjects}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                    >
                      Buka Semua
                    </button>
                    <button
                      type="button"
                      onClick={collapseAllCatSubjects}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                    >
                      Tutup Semua
                    </button>
                  </div>
                </div>
              </div>

              {/* Accordion Grouped by Subject */}
              <div className="space-y-4">
                {availableSubjects.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
                    <p className="text-xs font-medium">Belum ada mata pelajaran terdaftar.</p>
                  </div>
                ) : (
                  availableSubjects
                    .filter((s) => categorySubjectFilter === 'all' || s.id === categorySubjectFilter)
                    .map((s) => {
                      const subjCats = displayedCategories.filter((c) => {
                        const belongsToSubject = c.subjectId === s.id || (!c.subjectId && s.id === 'informatika');
                        const matchesSearch = !catSearchQuery || c.title.toLowerCase().includes(catSearchQuery.toLowerCase()) || (c.description && c.description.toLowerCase().includes(catSearchQuery.toLowerCase()));
                        return belongsToSubject && matchesSearch;
                      });

                      const isCollapsed = catSearchQuery.trim() !== '' ? false : (collapsedCatSubjects[s.id] ?? (isTeacherRole ? false : false));

                      return (
                        <div
                          key={s.id}
                          className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition-all"
                        >
                          {/* Subject Accordion Header */}
                          <div
                            onClick={() => toggleCatSubject(s.id)}
                            className="w-full px-4 py-3.5 bg-slate-50/90 hover:bg-slate-100/90 border-b border-slate-200/80 flex items-center justify-between cursor-pointer select-none transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs">
                                {getSubjectIcon(s.icon, "w-4 h-4 text-indigo-600")}
                              </div>
                              <div>
                                <h4 className="font-extrabold text-sm text-slate-800 leading-snug">
                                  {s.name} {s.code && <span className="font-mono text-slate-400 text-xs font-normal">[{s.code}]</span>}
                                </h4>
                              </div>
                              <span className="px-2 py-0.5 text-[11px] font-extrabold bg-indigo-100 text-indigo-800 rounded-lg shrink-0">
                                {subjCats.length} Topik
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenAddCategoryModal(s.id);
                                }}
                                className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg border border-slate-200 transition-colors shadow-2xs"
                              >
                                + Topik
                              </button>
                              <button
                                type="button"
                                className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                                title={isCollapsed ? "Buka Topik" : "Tutup Topik"}
                              >
                                {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          {/* Accordion Body */}
                          {!isCollapsed && (
                            <div className="p-4 space-y-3 bg-slate-50/40">
                              {subjCats.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white space-y-2">
                                  <p className="text-xs font-medium">Belum ada topik untuk mata pelajaran ini.</p>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAddCategoryModal(s.id)}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Tambah Topik Sekarang</span>
                                  </button>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {subjCats.map((c) => {
                                    const countMat = materials.filter((m) => m.categoryId === c.id).length;
                                    return (
                                      <div
                                        key={c.id}
                                        className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all flex flex-col justify-between gap-3 group"
                                      >
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded border border-slate-200">
                                              Urutan #{c.order}
                                            </span>
                                            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 rounded border border-emerald-100">
                                              {countMat} Materi
                                            </span>
                                          </div>
                                          
                                          <h5 className="font-extrabold text-sm text-slate-800 leading-snug group-hover:text-indigo-600 transition-colors">
                                            {c.title}
                                          </h5>
                                          
                                          {c.description ? (
                                            <p className="text-xs text-slate-500 line-clamp-2">{c.description}</p>
                                          ) : (
                                            <p className="text-xs text-slate-400 italic">Tidak ada deskripsi tambahan</p>
                                          )}
                                        </div>

                                        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                                          <div className="flex items-center gap-1">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSelectedSubjIdFilter(s.id);
                                                setSelectedCatIdFilter(c.id);
                                                setActiveTab('materials');
                                              }}
                                              className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                                            >
                                              Lihat Materi
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleOpenAddMaterialModal(s.id, c.id)}
                                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                                            >
                                              + Materi
                                            </button>
                                          </div>

                                          <div className="flex items-center gap-1 shrink-0">
                                            <button
                                              type="button"
                                              onClick={() => handleEditCategory(c)}
                                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                              title="Edit Topik"
                                            >
                                              <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteCategory(c.id, c.title)}
                                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                              title="Hapus Topik"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          );
        })()}

        {/* Tab: PROGRES BELAJAR SISWA */}
        {activeTab === 'progress' && (
          <div className="space-y-6">
            {/* Top Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl shadow-lg border border-indigo-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-indigo-500/20 rounded-xl text-indigo-300 border border-indigo-500/30">
                    <BarChart3 className="w-5 h-5" />
                  </span>
                  <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
                    Pemantauan & Rekapitulasi Progres Siswa
                  </h3>
                </div>
                <p className="text-xs text-indigo-200/80 max-w-2xl leading-relaxed">
                  {isTeacherRole && currentTeacher ? (
                    <>
                      Menampilkan progres materi & ujian siswa untuk kelas mengajar:{' '}
                      <strong className="text-white bg-indigo-500/30 px-2 py-0.5 rounded border border-indigo-400/30 font-semibold">
                        {currentTeacher.assignedClasses && currentTeacher.assignedClasses.length > 0
                          ? currentTeacher.assignedClasses.map((c) => `Kelas ${c}`).join(', ')
                          : 'Semua Kelas'}
                      </strong>{' '}
                      | Mapel: <strong className="text-white font-semibold">{assignedSubject?.name || 'Mata Pelajaran'}</strong>
                    </>
                  ) : (
                    'Pantau tingkat penyelesaian materi dan pengerjaan ujian siswa secara realtime, terstruktur per angkatan dan per kelas.'
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                <button
                  type="button"
                  onClick={loadStudentProgressData}
                  disabled={isLoadingProgress}
                  className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingProgress ? 'animate-spin' : ''}`} />
                  <span>{isLoadingProgress ? 'Memuat...' : 'Refresh Data'}</span>
                </button>
              </div>
            </div>

            {/* Computation & Data Processing */}
            {(() => {
              // 1. Determine allowed students based on Teacher role & assigned classes
              const allStudents = studentList || [];
              let allowedStudents = allStudents;

              if (isTeacherRole && currentTeacher) {
                const teacherClasses = currentTeacher.assignedClasses || [];
                if (teacherClasses.length > 0) {
                  allowedStudents = allStudents.filter((s) => teacherClasses.includes(s.kelas));
                }
              }

              // 2. Determine target materials for calculation
              let targetSubjectId = isTeacherRole && currentTeacher ? currentTeacher.subjectId : progressSubjectFilter;
              let targetCats = categories;
              if (targetSubjectId !== 'all') {
                targetCats = categories.filter((c) => (c.subjectId || 'informatika') === targetSubjectId);
              }
              const targetCatIds = targetCats.map((c) => c.id);
              const targetMaterials = materials.filter(
                (m) => targetCatIds.includes(m.categoryId) && m.isPublished !== false
              );

              // 3. Helper to calculate student progress percentage
              const getStudentProgressInfo = (student: StudentAccount) => {
                const prog = studentProgressMap[student.id] || studentProgressMap[student.nisn];
                const completedIds = prog?.completedMaterialIds || [];
                const doneCount = targetMaterials.filter((m) => completedIds.includes(m.id)).length;
                const totalCount = targetMaterials.length;
                const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
                return {
                  completedIds,
                  doneCount,
                  totalCount,
                  percent,
                  updatedAt: prog?.updatedAt,
                };
              };

              // 4. Calculate stats for each grade level
              const gradeStats = masterGrades.map((grade) => {
                const studentsInGrade = allowedStudents.filter((s) => {
                  const clean = (s.kelas || '').toUpperCase();
                  if (grade.id === '7') return /^(KELAS\s*)?(7|VII)(\.|\s|[A-Z]|$)/i.test(clean);
                  if (grade.id === '8') return /^(KELAS\s*)?(8|VIII)(\.|\s|[A-Z]|$)/i.test(clean);
                  if (grade.id === '9') return /^(KELAS\s*)?(9|IX)(\.|\s|[A-Z]|$)/i.test(clean);
                  if (grade.id === '10') return /^(KELAS\s*)?(10|X)(\.|\s|[A-Z]|$)/i.test(clean);
                  if (grade.id === '11') return /^(KELAS\s*)?(11|XI)(\.|\s|[A-Z]|$)/i.test(clean);
                  if (grade.id === '12') return /^(KELAS\s*)?(12|XII)(\.|\s|[A-Z]|$)/i.test(clean);
                  return getGradeCategory(s.kelas) === grade.id;
                });

                let sumPercent = 0;
                studentsInGrade.forEach((s) => {
                  const { percent } = getStudentProgressInfo(s);
                  sumPercent += percent;
                });
                const avg = studentsInGrade.length > 0 ? Math.round(sumPercent / studentsInGrade.length) : 0;

                return {
                  ...grade,
                  studentCount: studentsInGrade.length,
                  avgProgress: avg,
                };
              });

              // 5. Determine subClasses for the selected grade filter
              let subClasses: string[] = [];
              if (progressGradeFilter === 'all') {
                const clsSet = new Set<string>();
                allowedStudents.forEach((s) => {
                  if (s.kelas && s.kelas.trim()) clsSet.add(s.kelas.trim());
                });
                subClasses = Array.from(clsSet).sort((a, b) =>
                  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
                );
              } else {
                const clsSet = new Set<string>();
                allowedStudents.forEach((s) => {
                  const clean = (s.kelas || '').toUpperCase();
                  let match = false;
                  if (progressGradeFilter === '7') match = /^(KELAS\s*)?(7|VII)(\.|\s|[A-Z]|$)/i.test(clean);
                  else if (progressGradeFilter === '8') match = /^(KELAS\s*)?(8|VIII)(\.|\s|[A-Z]|$)/i.test(clean);
                  else if (progressGradeFilter === '9') match = /^(KELAS\s*)?(9|IX)(\.|\s|[A-Z]|$)/i.test(clean);
                  else if (progressGradeFilter === '10') match = /^(KELAS\s*)?(10|X)(\.|\s|[A-Z]|$)/i.test(clean);
                  else if (progressGradeFilter === '11') match = /^(KELAS\s*)?(11|XI)(\.|\s|[A-Z]|$)/i.test(clean);
                  else if (progressGradeFilter === '12') match = /^(KELAS\s*)?(12|XII)(\.|\s|[A-Z]|$)/i.test(clean);
                  else if (progressGradeFilter === 'other') {
                    match = !/^(KELAS\s*)?(7|8|9|10|11|12|VII|VIII|IX|X|XI|XII)(\.|\s|[A-Z]|$)/i.test(clean);
                  }
                  if (match && s.kelas && s.kelas.trim()) {
                    clsSet.add(s.kelas.trim());
                  }
                });
                subClasses = Array.from(clsSet).sort((a, b) =>
                  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
                );
              }

              // 6. Filter students according to Grade, Subclass, Search, and Status
              const filteredStudents = allowedStudents.filter((s) => {
                const cls = (s.kelas || 'Tanpa Kelas').trim();
                const clean = cls.toUpperCase();

                // Grade check
                let matchesGrade = true;
                if (progressGradeFilter !== 'all') {
                  if (progressGradeFilter === '7') matchesGrade = /^(KELAS\s*)?(7|VII)(\.|\s|[A-Z]|$)/i.test(clean);
                  else if (progressGradeFilter === '8') matchesGrade = /^(KELAS\s*)?(8|VIII)(\.|\s|[A-Z]|$)/i.test(clean);
                  else if (progressGradeFilter === '9') matchesGrade = /^(KELAS\s*)?(9|IX)(\.|\s|[A-Z]|$)/i.test(clean);
                  else if (progressGradeFilter === '10') matchesGrade = /^(KELAS\s*)?(10|X)(\.|\s|[A-Z]|$)/i.test(clean);
                  else if (progressGradeFilter === '11') matchesGrade = /^(KELAS\s*)?(11|XI)(\.|\s|[A-Z]|$)/i.test(clean);
                  else if (progressGradeFilter === '12') matchesGrade = /^(KELAS\s*)?(12|XII)(\.|\s|[A-Z]|$)/i.test(clean);
                  else if (progressGradeFilter === 'other') {
                    matchesGrade = !/^(KELAS\s*)?(7|8|9|10|11|12|VII|VIII|IX|X|XI|XII)(\.|\s|[A-Z]|$)/i.test(clean);
                  }
                }

                // Subclass check
                const matchesSubClass = progressSubClassFilter === 'all' || cls === progressSubClassFilter;

                // Search query check
                const q = progressSearchQuery.trim().toLowerCase();
                const matchesSearch =
                  !q ||
                  s.nama.toLowerCase().includes(q) ||
                  s.nisn.toLowerCase().includes(q) ||
                  cls.toLowerCase().includes(q) ||
                  (s.noAbsen && s.noAbsen.includes(q)) ||
                  (s.username && s.username.toLowerCase().includes(q));

                // Status check
                let matchesStatus = true;
                if (progressStatusFilter !== 'all') {
                  const { percent } = getStudentProgressInfo(s);
                  if (progressStatusFilter === 'completed') matchesStatus = percent === 100;
                  else if (progressStatusFilter === 'in_progress') matchesStatus = percent > 0 && percent < 100;
                  else if (progressStatusFilter === 'not_started') matchesStatus = percent === 0;
                }

                return matchesGrade && matchesSubClass && matchesSearch && matchesStatus;
              });

              // 7. Sort students
              filteredStudents.sort((a, b) => {
                const infoA = getStudentProgressInfo(a);
                const infoB = getStudentProgressInfo(b);

                if (progressSortBy === 'highest') {
                  return infoB.percent - infoA.percent;
                }
                if (progressSortBy === 'lowest') {
                  return infoA.percent - infoB.percent;
                }
                if (progressSortBy === 'recent') {
                  const timeA = infoA.updatedAt ? new Date(infoA.updatedAt).getTime() : 0;
                  const timeB = infoB.updatedAt ? new Date(infoB.updatedAt).getTime() : 0;
                  return timeB - timeA;
                }
                if (progressSortBy === 'nama') {
                  return a.nama.localeCompare(b.nama);
                }
                // Default: absen (grouped by class if all classes)
                if (progressSubClassFilter === 'all') {
                  const compClass = (a.kelas || '').localeCompare(b.kelas || '', undefined, { numeric: true, sensitivity: 'base' });
                  if (compClass !== 0) return compClass;
                }
                const numA = parseInt(a.noAbsen || '9999', 10);
                const numB = parseInt(b.noAbsen || '9999', 10);
                if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
                  return numA - numB;
                }
                return a.nama.localeCompare(b.nama);
              });

              // 8. Overall Summary Stats calculation
              let totalCompletionSum = 0;
              let fullyCompletedCount = 0;
              let inProgressCount = 0;
              let notStartedCount = 0;

              filteredStudents.forEach((s) => {
                const { percent } = getStudentProgressInfo(s);
                totalCompletionSum += percent;
                if (percent === 100) fullyCompletedCount++;
                else if (percent > 0) inProgressCount++;
                else notStartedCount++;
              });

              const avgPercentage =
                filteredStudents.length > 0
                  ? Math.round(totalCompletionSum / filteredStudents.length)
                  : 0;

              // Handle Export to Excel
              const handleExportExcel = () => {
                const selectedSubjectObj = subjects.find((s) => s.id === targetSubjectId);
                const subjectName = selectedSubjectObj ? selectedSubjectObj.name : (targetSubjectId === 'all' ? 'Semua Mata Pelajaran' : targetSubjectId);
                
                const rows: StudentProgressExportRow[] = filteredStudents.map((s) => {
                  const info = getStudentProgressInfo(s);
                  return {
                    student: s,
                    completedCount: info.doneCount,
                    totalCount: info.totalCount,
                    percentage: info.percent,
                    subjectName,
                    lastActive: info.updatedAt ? new Date(info.updatedAt).getTime() : undefined,
                  };
                });

                let fileName = 'Rekap_Progres_Siswa';
                if (progressGradeFilter !== 'all') fileName += `_Tingkat_${progressGradeFilter}`;
                if (progressSubClassFilter !== 'all') fileName += `_Kelas_${progressSubClassFilter.replace(/[^a-zA-Z0-9]/g, '_')}`;
                fileName += '.xlsx';

                exportStudentProgressToExcel(rows, fileName);
                showNotify('success', `Berhasil mengekspor ${rows.length} data progres siswa ke Excel!`);
              };

              return (
                <div className="space-y-6">
                  {/* Summary Metric Stats Row */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-1 hover:border-indigo-200 transition-all">
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Total Terpantau</span>
                        <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                          <Users className="w-4 h-4" />
                        </span>
                      </div>
                      <div className="text-2xl font-black text-slate-900">{filteredStudents.length}</div>
                      <p className="text-[10px] text-slate-500 font-medium">Siswa pada filter aktif</p>
                    </div>

                    <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-1 hover:border-emerald-200 transition-all">
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Rata-rata Progres</span>
                        <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                          <TrendingUp className="w-4 h-4" />
                        </span>
                      </div>
                      <div className="text-2xl font-black text-emerald-600">{avgPercentage}%</div>
                      <p className="text-[10px] text-slate-500 font-medium">Penyelesaian materi & ujian</p>
                    </div>

                    <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-1 hover:border-emerald-200 transition-all">
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Tuntas 100%</span>
                        <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                          <CheckCircle2 className="w-4 h-4" />
                        </span>
                      </div>
                      <div className="text-2xl font-black text-indigo-600">{fullyCompletedCount}</div>
                      <p className="text-[10px] text-slate-500 font-medium">Siswa lulus semua materi</p>
                    </div>

                    <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-1 hover:border-blue-200 transition-all">
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Item Materi Aktif</span>
                        <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                          <FileSpreadsheet className="w-4 h-4" />
                        </span>
                      </div>
                      <div className="text-2xl font-black text-slate-900">{targetMaterials.length}</div>
                      <p className="text-[10px] text-slate-500 font-medium">Materi & soal ujian terdata</p>
                    </div>
                  </div>

                  {/* LEVEL 1: HIERARCHICAL GRADE / ANGKATAN SELECTOR */}
                  <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <School className="w-4 h-4 text-indigo-600" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                          Langkah 1: Pilih Tingkat Kelas (Angkatan)
                        </h4>
                      </div>
                      <span className="text-[11px] font-bold text-slate-500">
                        {allowedStudents.length} Siswa Terdaftar
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
                      {/* All Grades Card */}
                      <button
                        type="button"
                        onClick={() => {
                          setProgressGradeFilter('all');
                          setProgressSubClassFilter('all');
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                          progressGradeFilter === 'all'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                            : 'bg-white hover:bg-slate-100/80 text-slate-800 border-slate-200 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black">Semua Tingkat</span>
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                              progressGradeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {allowedStudents.length}
                          </span>
                        </div>
                        <p className={`text-[10px] font-medium mt-1 ${progressGradeFilter === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>
                          Seluruh Siswa
                        </p>
                        <div className="mt-2 flex items-center justify-between text-[10px] font-bold">
                          <span className={progressGradeFilter === 'all' ? 'text-emerald-300' : 'text-emerald-600'}>
                            Avg: {avgPercentage}%
                          </span>
                          <span className={progressGradeFilter === 'all' ? 'text-slate-400' : 'text-slate-400'}>
                            {fullyCompletedCount} tuntas
                          </span>
                        </div>
                      </button>

                      {/* Individual Grade Cards */}
                      {gradeStats.map((g) => {
                        const isSelected = progressGradeFilter === g.id;

                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => {
                              setProgressGradeFilter(g.id);
                              setProgressSubClassFilter('all');
                            }}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-500/20'
                                : 'bg-white hover:bg-indigo-50/50 text-slate-800 border-slate-200 shadow-2xs'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black">{g.label}</span>
                              <span
                                className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                                  isSelected ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700'
                                }`}
                              >
                                {g.studentCount}
                              </span>
                            </div>
                            <p className={`text-[10px] font-medium mt-1 ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                              {g.subLabel}
                            </p>
                            <div className="mt-2 flex items-center justify-between text-[10px] font-bold">
                              <span className={isSelected ? 'text-emerald-200' : 'text-emerald-600'}>
                                Avg: {g.avgProgress}%
                              </span>
                              <span className={isSelected ? 'text-indigo-200' : 'text-slate-400'}>
                                {g.studentCount > 0 ? 'Aktif' : 'Kosong'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* LEVEL 2: SUB-CLASS / ROMBEL SELECTOR */}
                  <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-600" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                          Langkah 2: Pilih Rombongan Belajar (Rombel)
                          {progressGradeFilter !== 'all' && (
                            <span className="text-indigo-600 ml-1">
                              - Tingkat {progressGradeFilter}
                            </span>
                          )}
                        </h4>
                      </div>
                      <span className="text-[11px] font-bold text-slate-500">
                        {subClasses.length} Rombel Tersedia
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {/* All Subclasses Pill */}
                      <button
                        type="button"
                        onClick={() => setProgressSubClassFilter('all')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center gap-2 ${
                          progressSubClassFilter === 'all'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-2xs'
                        }`}
                      >
                        <span>Semua Rombel</span>
                        <span
                          className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                            progressSubClassFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {allowedStudents.filter((s) => {
                            if (progressGradeFilter === 'all') return true;
                            const clean = (s.kelas || '').toUpperCase();
                            if (progressGradeFilter === '7') return /^(KELAS\s*)?(7|VII)(\.|\s|[A-Z]|$)/i.test(clean);
                            if (progressGradeFilter === '8') return /^(KELAS\s*)?(8|VIII)(\.|\s|[A-Z]|$)/i.test(clean);
                            if (progressGradeFilter === '9') return /^(KELAS\s*)?(9|IX)(\.|\s|[A-Z]|$)/i.test(clean);
                            if (progressGradeFilter === '10') return /^(KELAS\s*)?(10|X)(\.|\s|[A-Z]|$)/i.test(clean);
                            if (progressGradeFilter === '11') return /^(KELAS\s*)?(11|XI)(\.|\s|[A-Z]|$)/i.test(clean);
                            if (progressGradeFilter === '12') return /^(KELAS\s*)?(12|XII)(\.|\s|[A-Z]|$)/i.test(clean);
                            return true;
                          }).length}
                        </span>
                      </button>

                      {/* Individual Subclass Pills */}
                      {subClasses.map((cls) => {
                        const classStudents = allowedStudents.filter((s) => (s.kelas || '').trim().toLowerCase() === cls.toLowerCase());
                        const count = classStudents.length;
                        const isSelected = progressSubClassFilter === cls;

                        // Calculate average for this subclass
                        let classSum = 0;
                        classStudents.forEach((s) => {
                          const { percent } = getStudentProgressInfo(s);
                          classSum += percent;
                        });
                        const classAvg = count > 0 ? Math.round(classSum / count) : 0;

                        return (
                          <button
                            key={cls}
                            type="button"
                            onClick={() => setProgressSubClassFilter(cls)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center gap-2 shadow-2xs ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-500/20'
                                : 'bg-white hover:bg-indigo-50/70 text-slate-800 border-slate-200/90 hover:border-indigo-200'
                            }`}
                          >
                            <span>Kelas {cls}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                              }`}
                            >
                              {count}
                            </span>
                            <span
                              className={`text-[9px] font-extrabold ${
                                isSelected ? 'text-emerald-200' : 'text-emerald-600'
                              }`}
                            >
                              {classAvg}%
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* LEVEL 3: SEARCH, SUBJECT FILTER, STATUS FILTER, SORT & VIEW ACTIONS */}
                  <div className="bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                      {/* Search Bar */}
                      <div className="relative flex-1 min-w-[240px]">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Cari nama siswa, NISN, no absen, atau rombel..."
                          value={progressSearchQuery}
                          onChange={(e) => setProgressSearchQuery(e.target.value)}
                          className="w-full pl-9.5 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                        {progressSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setProgressSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Dropdown Filters & Actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Subject Filter (Admin) */}
                        {!isTeacherRole && (
                          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 border border-slate-200 rounded-xl shadow-2xs">
                            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[11px] font-bold text-slate-600">Mapel:</span>
                            <select
                              value={progressSubjectFilter}
                              onChange={(e) => setProgressSubjectFilter(e.target.value)}
                              className="bg-transparent text-xs font-extrabold text-slate-800 focus:outline-none cursor-pointer"
                            >
                              <option value="all">Semua Mata Pelajaran</option>
                              {subjects.map((subj) => (
                                <option key={subj.id} value={subj.id}>
                                  {subj.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Status Filter */}
                        <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 border border-slate-200 rounded-xl shadow-2xs">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-[11px] font-bold text-slate-600">Status:</span>
                          <select
                            value={progressStatusFilter}
                            onChange={(e) => setProgressStatusFilter(e.target.value as any)}
                            className="bg-transparent text-xs font-extrabold text-slate-800 focus:outline-none cursor-pointer"
                          >
                            <option value="all">Semua Status ({filteredStudents.length})</option>
                            <option value="completed">Tuntas 100% ({fullyCompletedCount})</option>
                            <option value="in_progress">Sedang Belajar ({inProgressCount})</option>
                            <option value="not_started">Belum Mulai ({notStartedCount})</option>
                          </select>
                        </div>

                        {/* Sort By Filter */}
                        <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 border border-slate-200 rounded-xl shadow-2xs">
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-[11px] font-bold text-slate-600">Urutan:</span>
                          <select
                            value={progressSortBy}
                            onChange={(e) => setProgressSortBy(e.target.value as any)}
                            className="bg-transparent text-xs font-extrabold text-slate-800 focus:outline-none cursor-pointer"
                          >
                            <option value="absen">No. Absen</option>
                            <option value="nama">Nama (A - Z)</option>
                            <option value="highest">Progres Tertinggi (100% → 0%)</option>
                            <option value="lowest">Progres Terendah (0% → 100%)</option>
                            <option value="recent">Aktivitas Terkini</option>
                          </select>
                        </div>

                        {/* View Mode Toggle */}
                        <div className="flex items-center bg-white p-0.5 border border-slate-200 rounded-xl shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setProgressViewMode('table')}
                            className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                              progressViewMode === 'table'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                            title="Tampilan Tabel Data"
                          >
                            <TableIcon className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline text-[11px]">Tabel</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setProgressViewMode('cards')}
                            className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                              progressViewMode === 'cards'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                            title="Tampilan Kartu Siswa"
                          >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline text-[11px]">Kartu</span>
                          </button>
                        </div>

                        {/* Expand / Collapse All Details */}
                        <button
                          type="button"
                          onClick={() => {
                            const allIds = filteredStudents.map((s) => s.id);
                            const someExpanded = Object.values(expandedProgressStudentIds).some(Boolean);
                            if (someExpanded) {
                              collapseAllStudentProgress();
                            } else {
                              expandAllStudentProgress(allIds);
                            }
                          }}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-extrabold text-xs rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          {Object.values(expandedProgressStudentIds).some(Boolean) ? (
                            <>
                              <ChevronUp className="w-3.5 h-3.5" />
                              <span>Tutup Rincian</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3.5 h-3.5" />
                              <span>Buka Rincian</span>
                            </>
                          )}
                        </button>

                        {/* Export Excel Button */}
                        <button
                          type="button"
                          onClick={handleExportExcel}
                          disabled={filteredStudents.length === 0}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Export Excel</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* LEVEL 4: INTERACTIVE DATA PRESENTATION (TABLE OR CARD VIEW) */}
                  {filteredStudents.length === 0 ? (
                    <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
                      <BarChart3 className="w-12 h-12 mx-auto text-slate-300" />
                      <div className="space-y-1">
                        <h4 className="text-sm font-black text-slate-700">Tidak ada data siswa ditemukan</h4>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                          Tidak ada siswa yang sesuai dengan filter tingkat, rombel, atau kata kunci pencarian saat ini.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setProgressGradeFilter('all');
                          setProgressSubClassFilter('all');
                          setProgressSearchQuery('');
                          setProgressStatusFilter('all');
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                      >
                        Reset Semua Filter
                      </button>
                    </div>
                  ) : progressViewMode === 'table' ? (
                    /* TABEL DATA PROGRES SISWA INTERAKTIF */
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                              <th className="py-3 px-4 w-16 text-center">Absen</th>
                              <th className="py-3 px-4">Nama Siswa & NISN</th>
                              <th className="py-3 px-3 text-center">Kelas</th>
                              <th className="py-3 px-4 min-w-[200px]">Progres Penyelesaian</th>
                              <th className="py-3 px-3 text-center">Materi/Ujian</th>
                              <th className="py-3 px-3 text-center">Status</th>
                              <th className="py-3 px-4 text-slate-500 font-medium">Aktivitas Terakhir</th>
                              <th className="py-3 px-4 text-center w-28">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {filteredStudents.map((student, idx) => {
                              const info = getStudentProgressInfo(student);
                              const isExpanded = !!expandedProgressStudentIds[student.id];

                              return (
                                <React.Fragment key={student.id}>
                                  <tr className={`hover:bg-indigo-50/30 transition-colors ${isExpanded ? 'bg-indigo-50/20' : ''}`}>
                                    {/* Absen / No */}
                                    <td className="py-3.5 px-4 text-center">
                                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-black rounded-lg text-xs border border-slate-200">
                                        {student.noAbsen || idx + 1}
                                      </span>
                                    </td>

                                    {/* Nama & NISN */}
                                    <td className="py-3.5 px-4">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs shrink-0 border border-indigo-200">
                                          {student.nama.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="font-extrabold text-slate-900 truncate">
                                            {student.nama}
                                          </div>
                                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mt-0.5">
                                            <span>NISN: {student.nisn}</span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                navigator.clipboard.writeText(student.nisn);
                                                setProgressCopiedNisn(student.nisn);
                                                setTimeout(() => setProgressCopiedNisn(null), 2000);
                                              }}
                                              className="p-0.5 hover:text-indigo-600 transition-colors cursor-pointer"
                                              title="Salin NISN"
                                            >
                                              {progressCopiedNisn === student.nisn ? (
                                                <CopyCheck className="w-3 h-3 text-emerald-600" />
                                              ) : (
                                                <Copy className="w-3 h-3 text-slate-400" />
                                              )}
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </td>

                                    {/* Kelas */}
                                    <td className="py-3.5 px-3 text-center">
                                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-black rounded-lg text-[11px] border border-indigo-100/80 inline-block">
                                        {student.kelas}
                                      </span>
                                    </td>

                                    {/* Progres Bar & Persen */}
                                    <td className="py-3.5 px-4">
                                      <div className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                          <span className={`font-black ${
                                            info.percent === 100
                                              ? 'text-emerald-600'
                                              : info.percent > 0
                                              ? 'text-indigo-600'
                                              : 'text-slate-500'
                                          }`}>
                                            {info.percent}%
                                          </span>
                                          <span className="text-[10px] font-bold text-slate-400">
                                            {info.percent === 100 ? 'Selesai 100%' : `${info.doneCount}/${info.totalCount} Selesai`}
                                          </span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                                          <div
                                            className={`h-full rounded-full transition-all duration-500 ${
                                              info.percent === 100
                                                ? 'bg-emerald-500'
                                                : info.percent > 50
                                                ? 'bg-indigo-600'
                                                : info.percent > 0
                                                ? 'bg-amber-500'
                                                : 'bg-slate-300'
                                            }`}
                                            style={{ width: `${info.percent}%` }}
                                          />
                                        </div>
                                      </div>
                                    </td>

                                    {/* Selesai / Total */}
                                    <td className="py-3.5 px-3 text-center">
                                      <span className="font-bold text-slate-700">
                                        {info.doneCount} <span className="text-slate-400 font-normal">/ {info.totalCount}</span>
                                      </span>
                                    </td>

                                    {/* Status Badge */}
                                    <td className="py-3.5 px-3 text-center">
                                      {info.percent === 100 ? (
                                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-black rounded-lg text-[10px] border border-emerald-200 inline-flex items-center gap-1">
                                          <Check className="w-3 h-3" />
                                          <span>TUNTAS</span>
                                        </span>
                                      ) : info.percent > 0 ? (
                                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-black rounded-lg text-[10px] border border-indigo-200 inline-block">
                                          BERJALAN
                                        </span>
                                      ) : (
                                        <span className="px-2.5 py-1 bg-slate-100 text-slate-500 font-black rounded-lg text-[10px] border border-slate-200 inline-block">
                                          BELUM
                                        </span>
                                      )}
                                    </td>

                                    {/* Aktivitas Terakhir */}
                                    <td className="py-3.5 px-4 text-[11px] text-slate-500">
                                      {info.updatedAt ? (
                                        <span className="font-medium text-slate-700">
                                          {new Date(info.updatedAt).toLocaleDateString('id-ID', {
                                            day: 'numeric',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 italic">Belum ada aktivitas</span>
                                      )}
                                    </td>

                                    {/* Aksi Button */}
                                    <td className="py-3.5 px-4 text-center">
                                      <button
                                        type="button"
                                        onClick={() => toggleStudentProgressExpanded(student.id)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer ${
                                          isExpanded
                                            ? 'bg-indigo-600 text-white shadow-2xs'
                                            : 'bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200'
                                        }`}
                                      >
                                        <span>{isExpanded ? 'Tutup' : 'Rincian'}</span>
                                        {isExpanded ? (
                                          <ChevronUp className="w-3 h-3" />
                                        ) : (
                                          <ChevronDown className="w-3 h-3" />
                                        )}
                                      </button>
                                    </td>
                                  </tr>

                                  {/* Accordion Detail Row */}
                                  {isExpanded && (
                                    <tr className="bg-slate-50/70">
                                      <td colSpan={8} className="p-4 border-t border-b border-slate-200">
                                        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
                                          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-2.5 gap-2">
                                            <h5 className="font-extrabold text-xs text-slate-800 flex items-center gap-2">
                                              <BookOpen className="w-4 h-4 text-indigo-600" />
                                              <span>Rincian Status Materi & Ujian: {student.nama} ({student.kelas})</span>
                                            </h5>
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100">
                                                {info.doneCount} dari {info.totalCount} Selesai ({info.percent}%)
                                              </span>
                                              {info.doneCount > 0 && (
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setResetProgressConfirm({
                                                      studentId: student.id,
                                                      studentName: student.nama,
                                                      studentClass: student.kelas,
                                                      isAll: true,
                                                    })
                                                  }
                                                  className="px-2.5 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 rounded-lg text-[11px] font-extrabold flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-2xs"
                                                  title="Reset seluruh materi yang diselesaikan siswa ini"
                                                >
                                                  <RotateCcw className="w-3 h-3" />
                                                  <span>Reset Semua</span>
                                                </button>
                                              )}
                                            </div>
                                          </div>

                                          {targetCats.length === 0 ? (
                                            <p className="text-xs text-slate-500 italic">
                                              Belum ada topik atau materi aktif pada filter ini.
                                            </p>
                                          ) : (
                                            <div className="space-y-3">
                                              {targetCats.map((cat) => {
                                                const catMaterials = targetMaterials.filter((m) => m.categoryId === cat.id);
                                                if (catMaterials.length === 0) return null;

                                                const catDone = catMaterials.filter((m) => info.completedIds.includes(m.id)).length;

                                                return (
                                                  <div
                                                    key={cat.id}
                                                    className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5"
                                                  >
                                                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                                                      <span className="font-bold text-xs text-slate-800">
                                                        Topik: {cat.title}
                                                      </span>
                                                      <span className="text-[10px] font-black text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                                        {catDone}/{catMaterials.length} Selesai
                                                      </span>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                      {catMaterials.map((mat, mIdx) => {
                                                        const isDone = info.completedIds.includes(mat.id);
                                                        const isGForm = mat.originalUrl?.includes('forms.gle') || mat.originalUrl?.includes('docs.google.com/forms');
                                                        const itemLabel = isGForm ? `Tes ${mIdx + 1}` : `Materi ${mIdx + 1}`;

                                                        return (
                                                          <div
                                                            key={mat.id}
                                                            className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 transition-all ${
                                                              isDone
                                                                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                                                                : 'bg-white border-slate-200 text-slate-700'
                                                            }`}
                                                          >
                                                            <div className="min-w-0 space-y-0.5">
                                                              <div className="font-bold truncate flex items-center gap-1.5">
                                                                <span className={`px-1.5 py-0.5 text-[9px] font-black rounded ${
                                                                  isGForm ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                                                                }`}>
                                                                  {itemLabel}
                                                                </span>
                                                                <span className="truncate" title={mat.title}>{mat.title}</span>
                                                              </div>
                                                            </div>

                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                              <span
                                                                className={`px-2 py-0.5 text-[10px] font-black rounded-md shrink-0 ${
                                                                  isDone
                                                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                                                    : 'bg-slate-200 text-slate-600'
                                                                }`}
                                                              >
                                                                {isDone ? '✓ Selesai' : 'Belum'}
                                                              </span>

                                                              {isDone && (
                                                                <button
                                                                  type="button"
                                                                  onClick={() =>
                                                                    setResetProgressConfirm({
                                                                      studentId: student.id,
                                                                      studentName: student.nama,
                                                                      studentClass: student.kelas,
                                                                      materialId: mat.id,
                                                                      materialTitle: mat.title,
                                                                      isAll: false,
                                                                    })
                                                                  }
                                                                  className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 rounded-md text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-2xs"
                                                                  title="Reset materi ini agar siswa dapat mengerjakan ulang"
                                                                >
                                                                  <RotateCcw className="w-2.5 h-2.5" />
                                                                  <span>Reset</span>
                                                                </button>
                                                              )}
                                                            </div>
                                                          </div>
                                                        );
                                                      })}
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    /* TAMPILAN KARTU SISWA (CARD VIEW) */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {filteredStudents.map((student, idx) => {
                        const info = getStudentProgressInfo(student);
                        const isExpanded = !!expandedProgressStudentIds[student.id];

                        return (
                          <div
                            key={student.id}
                            className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-indigo-300 transition-all p-4 space-y-3 flex flex-col justify-between"
                          >
                            <div className="space-y-3">
                              {/* Header Card */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm shrink-0 border border-indigo-200">
                                    {student.nama.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="font-extrabold text-sm text-slate-900 truncate">
                                      {student.nama}
                                    </h4>
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mt-0.5">
                                      <span>NISN: {student.nisn}</span>
                                    </div>
                                  </div>
                                </div>

                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-black text-[10px] rounded-md border border-indigo-100 shrink-0">
                                  Kelas {student.kelas}
                                </span>
                              </div>

                              {/* Progress bar */}
                              <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-black text-slate-800">{info.percent}% Tuntas</span>
                                  <span className="text-[10px] font-bold text-slate-500">
                                    {info.doneCount}/{info.totalCount} Selesai
                                  </span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      info.percent === 100
                                        ? 'bg-emerald-500'
                                        : info.percent > 50
                                        ? 'bg-indigo-600'
                                        : info.percent > 0
                                        ? 'bg-amber-500'
                                        : 'bg-slate-300'
                                    }`}
                                    style={{ width: `${info.percent}%` }}
                                  />
                                </div>
                              </div>

                              {/* Details Accordion inside Card */}
                              {isExpanded && (
                                <div className="pt-2 border-t border-slate-100 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="text-[10px] font-black uppercase text-slate-500">
                                      Rincian Materi ({info.doneCount}/{info.totalCount})
                                    </div>
                                    {info.doneCount > 0 && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setResetProgressConfirm({
                                            studentId: student.id,
                                            studentName: student.nama,
                                            studentClass: student.kelas,
                                            isAll: true,
                                          })
                                        }
                                        className="text-[10px] font-extrabold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer"
                                      >
                                        <RotateCcw className="w-2.5 h-2.5" />
                                        <span>Reset Semua</span>
                                      </button>
                                    )}
                                  </div>
                                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                    {targetMaterials.map((mat) => {
                                      const isDone = info.completedIds.includes(mat.id);
                                      return (
                                        <div
                                          key={mat.id}
                                          className={`p-2 rounded-lg border text-[11px] flex items-center justify-between gap-1.5 ${
                                            isDone ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-white text-slate-700 border-slate-200'
                                          }`}
                                        >
                                          <span className="truncate font-medium" title={mat.title}>{mat.title}</span>
                                          <div className="flex items-center gap-1 shrink-0">
                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${isDone ? 'bg-emerald-100 text-emerald-800' : 'text-slate-400'}`}>
                                              {isDone ? '✓ Selesai' : 'Belum'}
                                            </span>
                                            {isDone && (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setResetProgressConfirm({
                                                    studentId: student.id,
                                                    studentName: student.nama,
                                                    studentClass: student.kelas,
                                                    materialId: mat.id,
                                                    materialTitle: mat.title,
                                                    isAll: false,
                                                  })
                                                }
                                                className="p-1 text-rose-600 hover:text-rose-700 hover:bg-rose-100 rounded transition-colors cursor-pointer"
                                                title="Reset materi ini"
                                              >
                                                <RotateCcw className="w-3 h-3" />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Card Footer */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-[10px] text-slate-400">
                                {info.updatedAt
                                  ? `Aktif ${new Date(info.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`
                                  : 'Belum aktif'}
                              </span>

                              <button
                                type="button"
                                onClick={() => toggleStudentProgressExpanded(student.id)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <span>{isExpanded ? 'Tutup' : 'Detail'}</span>
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Tab 3: TESTER LINK */}
        {activeTab === 'tester' && (
          <div className="space-y-6">
            <div className="p-5 bg-gradient-to-br from-indigo-50 to-slate-50 border border-indigo-100 rounded-2xl space-y-4">
              <div>
                <h3 className="font-bold text-base text-indigo-950 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <span>Penguji Otomatis Konversi Link Google Drive & Canva</span>
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Tempelkan link Google Drive/Canva apa saja untuk menguji apakah URL berhasil dikonversi ke format embed viewer sebelum dimasukkan ke materi.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Tempel link Google Drive atau Canva di sini..."
                  value={testInputUrl}
                  onChange={(e) => {
                    setTestInputUrl(e.target.value);
                    if (e.target.value.trim()) {
                      setTestResult(parseEmbedUrl(e.target.value));
                    } else {
                      setTestResult(null);
                    }
                  }}
                  className="flex-1 py-2.5 px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  type="button"
                  onClick={() => setTestResult(parseEmbedUrl(testInputUrl))}
                  className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-xs"
                >
                  Uji URL
                </button>
              </div>

              {testResult && (
                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-slate-700">Hasil Konversi:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      testResult.isValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {testResult.isValid ? 'VALID' : 'TIDAK VALID'}
                    </span>
                    <span className="text-slate-500">Tipe: {testResult.type.toUpperCase()}</span>
                  </div>

                  <div className="font-mono text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-700 break-all">
                    {testResult.embedUrl || 'Kosong'}
                  </div>

                  {testResult.embedUrl && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-xs font-bold text-slate-700 mb-2 block">Live Preview Embedded Frame:</span>
                      <div className="w-full h-64 rounded-xl border border-slate-200 overflow-hidden bg-slate-900">
                        <iframe
                          src={testResult.embedUrl}
                          className="w-full h-full border-none"
                          title="Test Embed Preview"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="max-w-xl mx-auto space-y-6">
              
              {/* Custom Logo Card */}
              <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-800">Ubah Logo Header / Navbar</h3>
                    <p className="text-xs text-slate-500">Ganti logo bawaan dengan logo sekolah/instansi lewat Drive link atau URL gambar</p>
                  </div>
                </div>

                <form onSubmit={handleSaveLogo} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      URL Gambar atau Link Google Drive Logo
                    </label>
                    <div className="relative flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Tempel link Google Drive (https://drive.google.com/file/d/...) atau URL gambar..."
                        value={inputLogoUrl}
                        onChange={(e) => {
                          setInputLogoUrl(e.target.value);
                          setLogoErrorMsg('');
                        }}
                        className="flex-1 py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <label className="px-3 py-2 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl cursor-pointer transition-colors border border-indigo-200 flex items-center gap-1.5 shrink-0">
                        <Upload className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Mendukung link Google Drive, URL publik (.png, .jpg, .svg), atau unggah langsung gambar dari perangkat.
                    </p>
                  </div>

                  {/* Live Preview Card */}
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                      <span>Pratinjau Tampilan Header Navbar:</span>
                      {inputLogoUrl.trim() ? (
                        inputLogoUrl.includes('drive.google.com') || inputLogoUrl.includes('docs.google.com') ? (
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Link Drive Terkonversi
                          </span>
                        ) : (
                          <span className="text-indigo-600 font-semibold">URL Gambar Langsung</span>
                        )
                      ) : (
                        <span className="text-slate-400 font-normal">Menggunakan Logo Default</span>
                      )}
                    </div>

                    <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center gap-3">
                      {inputLogoUrl.trim() ? (
                        <div className="w-10 h-10 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs flex items-center justify-center p-0.5 relative group">
                          <img
                            src={parseLogoUrl(inputLogoUrl)}
                            alt="Pratinjau Logo"
                            className="w-full h-full object-contain rounded-lg"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="relative">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
                            <GraduationCap className="w-5 h-5 text-amber-300" />
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-red-600 border-2 border-white flex items-center justify-center text-[8px] text-white font-bold">
                            ✓
                          </div>
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-sm">Sistem Materi</span>
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-50 text-amber-800 rounded-full border border-amber-200">
                            Kurikulum Merdeka
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium">Portal Pembelajaran Digital & Presentasi Interaktif</p>
                      </div>
                    </div>
                  </div>

                  {logoErrorMsg && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{logoErrorMsg}</span>
                    </div>
                  )}

                  {logoSuccessMsg && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{logoSuccessMsg}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={isLogoSaving}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isLogoSaving ? 'Menyimpan...' : 'Simpan Logo'}</span>
                    </button>

                    {inputLogoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setInputLogoUrl('');
                          setLogoErrorMsg('');
                        }}
                        className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                        title="Reset ke logo default"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Change PIN Card */}
              <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">

                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-800">Ubah PIN Keamanan Admin Login</h3>
                    <p className="text-xs text-slate-500">Atur PIN unik untuk login awal admin</p>
                  </div>
                </div>

                <form onSubmit={handleChangePin} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">PIN Baru (Min. 4 Karakter)</label>
                    <input
                      type="password"
                      placeholder="Masukkan PIN baru"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono tracking-widest"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Konfirmasi PIN Baru</label>
                    <input
                      type="password"
                      placeholder="Ketik ulang PIN baru"
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value)}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono tracking-widest"
                      required
                    />
                  </div>

                  {pinErrorMsg && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                      {pinErrorMsg}
                    </div>
                  )}

                  {pinSuccessMsg && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>{pinSuccessMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Simpan PIN Baru
                  </button>
                </form>
              </div>

            </div>
          </div>
        )}

        {/* Tab: MANAGE STUDENT ACCOUNTS (AKUN SISWA) */}
        {activeTab === 'students' && !isTeacherRole && (
          <div className="space-y-6">
            
            {/* Top Action & Summary Command Bar */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                      <GraduationCap className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="font-extrabold text-base sm:text-lg text-slate-900">
                        Direktori & Manajemen Akun Siswa
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Kelola data peserta didik, pembagian rombongan belajar (rombel), dan kredensial login portal siswa.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
                  <button
                    type="button"
                    onClick={() => handleOpenAddStudentModal(studentSubClassFilter !== 'all' ? studentSubClassFilter : undefined)}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>+ Tambah Siswa Baru</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportModalType('students')}
                    className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Import data siswa masal dari file Excel"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import Excel (.xlsx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadStudentTemplate()}
                    className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Unduh format template Excel resmi"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Template</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const exportList = studentList.filter((s) => {
                        const cls = (s.kelas || 'Tanpa Kelas').trim();
                        const matchesGrade =
                          studentGradeFilter === 'all' ||
                          (() => {
                            const clean = cls.toUpperCase();
                            if (studentGradeFilter === '7') return /^(KELAS\s*)?(7|VII)(\.|\s|[A-Z]|$)/i.test(clean);
                            if (studentGradeFilter === '8') return /^(KELAS\s*)?(8|VIII)(\.|\s|[A-Z]|$)/i.test(clean);
                            if (studentGradeFilter === '9') return /^(KELAS\s*)?(9|IX)(\.|\s|[A-Z]|$)/i.test(clean);
                            if (studentGradeFilter === '10') return /^(KELAS\s*)?(10|X)(\.|\s|[A-Z]|$)/i.test(clean);
                            if (studentGradeFilter === '11') return /^(KELAS\s*)?(11|XI)(\.|\s|[A-Z]|$)/i.test(clean);
                            if (studentGradeFilter === '12') return /^(KELAS\s*)?(12|XII)(\.|\s|[A-Z]|$)/i.test(clean);
                            return true;
                          })();
                        const matchesSubClass = studentSubClassFilter === 'all' || cls === studentSubClassFilter;
                        return matchesGrade && matchesSubClass;
                      });
                      const fileName = studentSubClassFilter !== 'all'
                        ? `Data_Siswa_Kelas_${studentSubClassFilter}.xlsx`
                        : studentGradeFilter !== 'all'
                        ? `Data_Siswa_Tingkat_${studentGradeFilter}.xlsx`
                        : 'Data_Seluruh_Siswa.xlsx';
                      exportStudentsToExcel(exportList.length > 0 ? exportList : studentList, fileName);
                    }}
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Export data siswa yang sedang difilter ke Excel"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden sm:inline">Export Excel</span>
                  </button>
                </div>
              </div>

              {/* Quick Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
                <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Siswa Terdaftar</div>
                  <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5 flex items-center gap-1.5">
                    <span>{studentList.length}</span>
                    <span className="text-xs font-semibold text-slate-400">Akun</span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Rombel Terdata</div>
                  <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5 flex items-center gap-1.5">
                    <span>
                      {Array.from(new Set(studentList.map((s) => (s.kelas || 'Tanpa Kelas').trim()))).filter(Boolean).length}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">Kelas</span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Tingkat Terpilih</div>
                  <div className="text-base sm:text-lg font-black text-indigo-700 mt-0.5">
                    {studentGradeFilter === 'all' ? 'Semua Tingkat' : `Kelas ${studentGradeFilter}`}
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Rombel Aktif</div>
                  <div className="text-base sm:text-lg font-black text-indigo-700 mt-0.5 truncate">
                    {studentSubClassFilter === 'all' ? 'Semua Rombel' : `Kelas ${studentSubClassFilter}`}
                  </div>
                </div>
              </div>
            </div>

            {/* Banner Notification for Bulk Import */}
            {importSuccessBanner && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold flex items-center justify-between gap-3 shadow-2xs animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <span className="p-1 bg-emerald-600 text-white rounded-lg">
                    <Check className="w-4 h-4" />
                  </span>
                  <span>{importSuccessBanner}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setImportSuccessBanner('')}
                  className="text-emerald-700 hover:text-emerald-900 text-xs font-bold cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            )}

            {/* LEVEL 1: HIERARCHICAL GRADE SELECTOR (TINGKAT KELAS) */}
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <School className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    Langkah 1: Pilih Tingkat Kelas
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setNewGradeIdInput('');
                      setNewGradeLabelInput('');
                      setNewGradeSubLabelInput('');
                      setIsAddGradeModalOpen(true);
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-indigo-700 hover:text-indigo-800 text-[11px] font-extrabold rounded-lg border border-slate-200 hover:border-indigo-200 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Tingkat Baru</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsClassManagerModalOpen(true)}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-extrabold rounded-lg border border-indigo-200 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>Kelola Rombel & Tingkat</span>
                  </button>
                </div>
              </div>

              {/* Grade Level Buttons */}
              {(() => {
                const getGradeCount = (gradeId: string) => {
                  if (gradeId === 'all') return studentList.length;
                  return studentList.filter((s) => {
                    const clean = (s.kelas || '').trim().toUpperCase();
                    if (gradeId === '7') return /^(KELAS\s*)?(7|VII)(\.|\s|[A-Z]|$)/i.test(clean);
                    if (gradeId === '8') return /^(KELAS\s*)?(8|VIII)(\.|\s|[A-Z]|$)/i.test(clean);
                    if (gradeId === '9') return /^(KELAS\s*)?(9|IX)(\.|\s|[A-Z]|$)/i.test(clean);
                    if (gradeId === '10') return /^(KELAS\s*)?(10|X)(\.|\s|[A-Z]|$)/i.test(clean);
                    if (gradeId === '11') return /^(KELAS\s*)?(11|XI)(\.|\s|[A-Z]|$)/i.test(clean);
                    if (gradeId === '12') return /^(KELAS\s*)?(12|XII)(\.|\s|[A-Z]|$)/i.test(clean);
                    if (gradeId === 'other') {
                      return !/^(KELAS\s*)?(7|8|9|10|11|12|VII|VIII|IX|X|XI|XII)(\.|\s|[A-Z]|$)/i.test(clean);
                    }
                    return clean.startsWith(gradeId.toUpperCase()) || clean.includes(gradeId.toUpperCase());
                  }).length;
                };

                const gradesToDisplay: { id: string; label: string; subLabel: string; isCustom?: boolean }[] = [
                  { id: 'all', label: 'Semua Tingkat', subLabel: 'Semua Jenjang' },
                  ...masterGrades.map((g) => ({ ...g, isCustom: true })),
                ];

                const otherCount = getGradeCount('other');
                if (otherCount > 0 && !masterGrades.some((g) => g.id === 'other')) {
                  gradesToDisplay.push({ id: 'other', label: 'Lainnya', subLabel: 'Khusus / Umum' });
                }

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                    {gradesToDisplay.map((g) => {
                      const count = getGradeCount(g.id);
                      const isSelected = studentGradeFilter === g.id;

                      return (
                        <div
                          key={g.id}
                          className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group flex flex-col justify-between ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-500/20'
                              : 'bg-slate-50/80 hover:bg-slate-100 text-slate-800 border-slate-200/90'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setStudentGradeFilter(g.id);
                              setStudentSubClassFilter('all');
                            }}
                            className="w-full text-left cursor-pointer"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className={`text-xs font-black truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                                {g.label}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 text-[10px] font-black rounded-md shrink-0 ${
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                }`}
                              >
                                {count}
                              </span>
                            </div>
                            <span
                              className={`text-[10px] font-medium mt-1 block truncate ${
                                isSelected ? 'text-indigo-100' : 'text-slate-400'
                              }`}
                            >
                              {g.subLabel}
                            </span>
                          </button>

                          {/* Action Buttons for non-'all' grades (e.g. Hapus Kelas 12) */}
                          {g.id !== 'all' && (
                            <div className="flex items-center justify-end gap-1 mt-2 pt-1 border-t border-slate-200/40 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const gradeObj = masterGrades.find((mg) => mg.id === g.id) || {
                                    id: g.id,
                                    label: g.label,
                                    subLabel: g.subLabel,
                                  };
                                  setDeleteGradeTarget(gradeObj);
                                  setDeleteGradeOption('delete_students');
                                  setIsDeleteGradeModalOpen(true);
                                }}
                                className={`p-1 rounded-md text-[10px] flex items-center gap-0.5 font-bold transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'hover:bg-rose-500/80 text-rose-100 hover:text-white'
                                    : 'hover:bg-rose-100 text-rose-600'
                                }`}
                                title={`Hapus ${g.label}`}
                              >
                                <Trash2 className="w-3 h-3" />
                                <span className="text-[9px]">Hapus</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* LEVEL 2: SUB-CLASS / ROMBEL SELECTOR */}
            {(() => {
              // Extract all combined classes from studentList and masterClasses
              const allClassNames: string[] = Array.from(
                new Set<string>([
                  ...masterClasses,
                  ...studentList.map((s) => (s.kelas || '').trim()).filter(Boolean),
                ])
              ).sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

              const subClasses: string[] = allClassNames.filter((cls: string) => {
                if (studentGradeFilter === 'all') return true;
                const clean = cls.toUpperCase();
                if (studentGradeFilter === '7') return /^(KELAS\s*)?(7|VII)(\.|\s|[A-Z]|$)/i.test(clean);
                if (studentGradeFilter === '8') return /^(KELAS\s*)?(8|VIII)(\.|\s|[A-Z]|$)/i.test(clean);
                if (studentGradeFilter === '9') return /^(KELAS\s*)?(9|IX)(\.|\s|[A-Z]|$)/i.test(clean);
                if (studentGradeFilter === '10') return /^(KELAS\s*)?(10|X)(\.|\s|[A-Z]|$)/i.test(clean);
                if (studentGradeFilter === '11') return /^(KELAS\s*)?(11|XI)(\.|\s|[A-Z]|$)/i.test(clean);
                if (studentGradeFilter === '12') return /^(KELAS\s*)?(12|XII)(\.|\s|[A-Z]|$)/i.test(clean);
                if (studentGradeFilter === 'other') {
                  return !/^(KELAS\s*)?(7|8|9|10|11|12|VII|VIII|IX|X|XI|XII)(\.|\s|[A-Z]|$)/i.test(clean);
                }
                return clean.startsWith(studentGradeFilter.toUpperCase()) || clean.includes(studentGradeFilter.toUpperCase());
              });

              return (
                <div className="bg-slate-50/90 p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                        {studentGradeFilter === 'all'
                          ? 'Langkah 2: Pilih Rombongan Belajar (Rombel)'
                          : `Langkah 2: Pilih Sub-Kelas Tingkat ${studentGradeFilter}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {studentSubClassFilter !== 'all' && (
                        <button
                          type="button"
                          onClick={() => setStudentSubClassFilter('all')}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer mr-1"
                        >
                          Tampilkan Semua Rombel
                        </button>
                      )}
                      
                      <button
                        type="button"
                        onClick={() => {
                          setNewClassNameInput(studentGradeFilter !== 'all' ? `${studentGradeFilter}.` : '');
                          setNewClassGradeSelection(studentGradeFilter !== 'all' ? studentGradeFilter : '7');
                          setIsAddClassModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Tambah Rombel</span>
                      </button>

                      {studentSubClassFilter !== 'all' && (
                        <button
                          type="button"
                          onClick={() => handleOpenAddStudentModal(studentSubClassFilter)}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-extrabold rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>+ Siswa ke Kelas {studentSubClassFilter}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Subclass Pills Navigation */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {/* All Subclasses Pill */}
                    <button
                      type="button"
                      onClick={() => setStudentSubClassFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center gap-2 ${
                        studentSubClassFilter === 'all'
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-2xs'
                      }`}
                    >
                      <span>Semua Rombel</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                          studentSubClassFilter === 'all'
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {studentList.filter((s) => {
                          if (studentGradeFilter === 'all') return true;
                          const clean = (s.kelas || '').toUpperCase();
                          if (studentGradeFilter === '7') return /^(KELAS\s*)?(7|VII)(\.|\s|[A-Z]|$)/i.test(clean);
                          if (studentGradeFilter === '8') return /^(KELAS\s*)?(8|VIII)(\.|\s|[A-Z]|$)/i.test(clean);
                          if (studentGradeFilter === '9') return /^(KELAS\s*)?(9|IX)(\.|\s|[A-Z]|$)/i.test(clean);
                          if (studentGradeFilter === '10') return /^(KELAS\s*)?(10|X)(\.|\s|[A-Z]|$)/i.test(clean);
                          if (studentGradeFilter === '11') return /^(KELAS\s*)?(11|XI)(\.|\s|[A-Z]|$)/i.test(clean);
                          if (studentGradeFilter === '12') return /^(KELAS\s*)?(12|XII)(\.|\s|[A-Z]|$)/i.test(clean);
                          return true;
                        }).length}
                      </span>
                    </button>

                    {/* Individual Subclass Pills with Quick Actions */}
                    {subClasses.map((cls) => {
                      const count = studentList.filter((s) => (s.kelas || '').trim().toLowerCase() === cls.toLowerCase()).length;
                      const isSelected = studentSubClassFilter === cls;

                      return (
                        <div
                          key={cls}
                          className={`inline-flex items-center rounded-xl text-xs font-black border transition-all shadow-2xs group ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-500/20'
                              : 'bg-white hover:bg-indigo-50/70 text-slate-800 border-slate-200/90 hover:border-indigo-200'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setStudentSubClassFilter(cls)}
                            className="px-3 py-1.5 flex items-center gap-2 cursor-pointer"
                          >
                            <span>Kelas {cls}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                              }`}
                            >
                              {count}
                            </span>
                          </button>

                          {/* Quick Edit / Delete buttons for rombel */}
                          <div className={`flex items-center gap-0.5 pr-1.5 pl-0.5 border-l ${
                            isSelected ? 'border-indigo-400/50' : 'border-slate-100'
                          }`}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditClassOldName(cls);
                                setEditClassNewName(cls);
                                setIsEditClassModalOpen(true);
                              }}
                              className={`p-1 rounded-md transition-colors cursor-pointer ${
                                isSelected
                                  ? 'hover:bg-white/20 text-indigo-100 hover:text-white'
                                  : 'hover:bg-indigo-100 text-slate-400 hover:text-indigo-700'
                              }`}
                              title={`Edit / Ganti Nama Kelas ${cls}`}
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteClassTarget(cls);
                                setDeleteClassOption('keep_students');
                                const otherClasses = allClassNames.filter((c) => c !== cls);
                                setDeleteClassMoveTarget(otherClasses[0] || '');
                                setIsDeleteClassModalOpen(true);
                              }}
                              className={`p-1 rounded-md transition-colors cursor-pointer ${
                                isSelected
                                  ? 'hover:bg-rose-500 text-rose-200 hover:text-white'
                                  : 'hover:bg-rose-100 text-slate-400 hover:text-rose-600'
                              }`}
                              title={`Hapus Rombel ${cls}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Quick Inline "+ Rombel" Pill */}
                    <button
                      type="button"
                      onClick={() => {
                        setNewClassNameInput(studentGradeFilter !== 'all' ? `${studentGradeFilter}.` : '');
                        setNewClassGradeSelection(studentGradeFilter !== 'all' ? studentGradeFilter : '7');
                        setIsAddClassModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-dashed hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800 border border-dashed border-emerald-300 rounded-xl text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Rombel</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* LEVEL 3 & 4: SEARCH BAR, CONTROLS, AND PROFESSIONAL ENTERPRISE DATA TABLE */}
            {(() => {
              // Filter students according to Grade, Subclass, and Search query
              const filteredStudents = studentList.filter((s) => {
                const cls = (s.kelas || 'Tanpa Kelas').trim();
                const clean = cls.toUpperCase();

                // Grade check
                let matchesGrade = true;
                if (studentGradeFilter !== 'all') {
                  if (studentGradeFilter === '7') matchesGrade = /^(KELAS\s*)?(7|VII)(\.|\s|[A-Z]|$)/i.test(clean);
                  else if (studentGradeFilter === '8') matchesGrade = /^(KELAS\s*)?(8|VIII)(\.|\s|[A-Z]|$)/i.test(clean);
                  else if (studentGradeFilter === '9') matchesGrade = /^(KELAS\s*)?(9|IX)(\.|\s|[A-Z]|$)/i.test(clean);
                  else if (studentGradeFilter === '10') matchesGrade = /^(KELAS\s*)?(10|X)(\.|\s|[A-Z]|$)/i.test(clean);
                  else if (studentGradeFilter === '11') matchesGrade = /^(KELAS\s*)?(11|XI)(\.|\s|[A-Z]|$)/i.test(clean);
                  else if (studentGradeFilter === '12') matchesGrade = /^(KELAS\s*)?(12|XII)(\.|\s|[A-Z]|$)/i.test(clean);
                  else if (studentGradeFilter === 'other') {
                    matchesGrade = !/^(KELAS\s*)?(7|8|9|10|11|12|VII|VIII|IX|X|XI|XII)(\.|\s|[A-Z]|$)/i.test(clean);
                  }
                }

                // Subclass check
                const matchesSubClass = studentSubClassFilter === 'all' || cls === studentSubClassFilter;

                // Search query check
                const q = studentSearchQuery.trim().toLowerCase();
                const matchesSearch =
                  !q ||
                  s.nama.toLowerCase().includes(q) ||
                  s.nisn.toLowerCase().includes(q) ||
                  cls.toLowerCase().includes(q) ||
                  (s.noAbsen && s.noAbsen.includes(q)) ||
                  (s.username && s.username.toLowerCase().includes(q));

                return matchesGrade && matchesSubClass && matchesSearch;
              });

              // Sorting
              filteredStudents.sort((a, b) => {
                if (studentSortBy === 'absen') {
                  // Group first by class if showing multiple classes
                  if (studentSubClassFilter === 'all') {
                    const compClass = (a.kelas || '').localeCompare(b.kelas || '', undefined, { numeric: true, sensitivity: 'base' });
                    if (compClass !== 0) return compClass;
                  }
                  const numA = parseInt(a.noAbsen || '', 10);
                  const numB = parseInt(b.noAbsen || '', 10);
                  const hasA = !isNaN(numA);
                  const hasB = !isNaN(numB);
                  if (hasA && hasB) {
                    if (numA !== numB) return numA - numB;
                  } else if (hasA) return -1;
                  else if (hasB) return 1;
                  return a.nama.localeCompare(b.nama);
                } else if (studentSortBy === 'nama') {
                  return a.nama.localeCompare(b.nama);
                } else if (studentSortBy === 'nisn') {
                  return a.nisn.localeCompare(b.nisn);
                }
                return 0;
              });

              return (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-0">
                  
                  {/* Table Control Bar */}
                  <div className="p-3.5 sm:p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    
                    {/* Live Search Box */}
                    <div className="relative flex-1 min-w-[240px]">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Cari nama siswa, NISN, no. absen, atau kelas..."
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 shadow-2xs"
                      />
                      {studentSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setStudentSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Table Filters & Fast Options */}
                    <div className="flex items-center gap-2 flex-wrap shrink-0 justify-between md:justify-end">
                      {/* Sorting selector */}
                      <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 border border-slate-200 rounded-xl shadow-2xs text-xs">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[11px] font-bold text-slate-500">Urutkan:</span>
                        <select
                          value={studentSortBy}
                          onChange={(e) => setStudentSortBy(e.target.value as any)}
                          className="bg-transparent font-extrabold text-slate-800 focus:outline-none cursor-pointer text-xs"
                        >
                          <option value="absen">No. Absen (1 - 99)</option>
                          <option value="nama">Nama Siswa (A - Z)</option>
                          <option value="nisn">NISN Siswa</option>
                        </select>
                      </div>

                      {/* Toggle show/hide all passwords */}
                      <button
                        type="button"
                        onClick={() => setShowAllPasswords((prev) => !prev)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                          showAllPasswords
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                        title="Tampilkan / Sembunyikan kata sandi untuk seluruh siswa"
                      >
                        {showAllPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span className="text-[11px]">{showAllPasswords ? 'Tutup Password' : 'Lihat Password'}</span>
                      </button>

                      {/* Add Student Quick Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenAddStudentModal(studentSubClassFilter !== 'all' ? studentSubClassFilter : undefined)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>+ Siswa</span>
                      </button>
                    </div>
                  </div>

                  {/* Status Bar */}
                  <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div>
                      Menampilkan <strong className="text-slate-800">{filteredStudents.length}</strong> siswa
                      {studentSubClassFilter !== 'all' && (
                        <span> di <strong className="text-indigo-700">Kelas {studentSubClassFilter}</strong></span>
                      )}
                      {studentGradeFilter !== 'all' && studentSubClassFilter === 'all' && (
                        <span> pada <strong className="text-indigo-700">Tingkat {studentGradeFilter}</strong></span>
                      )}
                      {studentSearchQuery && (
                        <span> dengan kata kunci "<em>{studentSearchQuery}</em>"</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                      Default password: <span className="font-bold text-slate-600">pass123</span>
                    </div>
                  </div>

                  {/* Responsive Enterprise Data Table */}
                  {filteredStudents.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 space-y-3">
                      <GraduationCap className="w-12 h-12 mx-auto text-slate-300" />
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-700">Tidak ada akun siswa yang sesuai</h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                          {studentSearchQuery
                            ? `Pencarian "${studentSearchQuery}" tidak menemukan data pada filter saat ini.`
                            : `Belum ada siswa terdaftar pada kelas yang dipilih.`}
                        </p>
                      </div>
                      <div className="pt-2 flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenAddStudentModal(studentSubClassFilter !== 'all' ? studentSubClassFilter : undefined)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>+ Tambah Siswa ke Kelas Ini</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100/80 text-slate-700 uppercase tracking-wider font-extrabold text-[10px] border-b border-slate-200">
                            <th className="py-3 px-3.5 text-center w-16">Absen</th>
                            <th className="py-3 px-4">Nama Lengkap Siswa</th>
                            <th className="py-3 px-3.5 text-center w-28">Kelas / Rombel</th>
                            <th className="py-3 px-4">NISN (ID Login)</th>
                            <th className="py-3 px-4">Kata Sandi</th>
                            <th className="py-3 px-4 text-center w-28">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredStudents.map((s, idx) => {
                            const avatarInitial = s.nama.trim().charAt(0).toUpperCase() || 'S';
                            const colors = [
                              'bg-indigo-100 text-indigo-700 border-indigo-200',
                              'bg-emerald-100 text-emerald-700 border-emerald-200',
                              'bg-purple-100 text-purple-700 border-purple-200',
                              'bg-amber-100 text-amber-700 border-amber-200',
                              'bg-rose-100 text-rose-700 border-rose-200',
                              'bg-sky-100 text-sky-700 border-sky-200',
                            ];
                            const colorIndex = (s.nama.charCodeAt(0) || 0) % colors.length;
                            const avatarColor = colors[colorIndex];

                            return (
                              <tr
                                key={s.id}
                                className="hover:bg-indigo-50/40 transition-colors group"
                              >
                                {/* No. Absen */}
                                <td className="py-3 px-3.5 text-center">
                                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-slate-100 text-slate-800 font-mono font-black text-xs border border-slate-200/80 shadow-2xs">
                                    {s.noAbsen || idx + 1}
                                  </span>
                                </td>

                                {/* Nama Lengkap & Details */}
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs border shadow-2xs shrink-0 ${avatarColor}`}
                                    >
                                      {avatarInitial}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                                        <span className="truncate">{s.nama}</span>
                                      </div>
                                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                                        <span>User: @{s.username || s.nisn}</span>
                                        {s.noAbsen && <span>• Absen #{s.noAbsen}</span>}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Kelas / Rombel */}
                                <td className="py-3 px-3.5 text-center">
                                  <span className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-700 font-black text-xs rounded-lg border border-indigo-100 shadow-2xs">
                                    {s.kelas}
                                  </span>
                                </td>

                                {/* NISN with 1-click copy */}
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-slate-800 text-xs bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                                      {s.nisn}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(s.nisn, s.id + '-nisn')}
                                      className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                                      title="Salin NISN ke clipboard"
                                    >
                                      {copiedNisnId === s.id + '-nisn' ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                </td>

                                {/* Password with Toggle / Reset */}
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                                      {showAllPasswords ? (s.password || 'pass123') : '••••••••'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleResetStudentPassword(s)}
                                      className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors cursor-pointer"
                                      title="Reset kata sandi ke 'pass123'"
                                    >
                                      <KeyRound className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>

                                {/* Actions */}
                                <td className="py-3 px-4 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleEditStudent(s)}
                                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 rounded-lg transition-all cursor-pointer shadow-2xs active:scale-95"
                                      title={`Edit data akun ${s.nama}`}
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteStudent(s.id, s.nama)}
                                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-all cursor-pointer shadow-2xs active:scale-95"
                                      title={`Hapus akun siswa ${s.nama}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Table Footer */}
                  <div className="p-3 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>Sistem Direktori Aktif • Terhubung ke Firestore Cloud</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>Total: <strong className="text-slate-800">{studentList.length} Siswa</strong></span>
                      <button
                        type="button"
                        onClick={() => {
                          const exportList = studentList;
                          exportStudentsToExcel(exportList, 'Data_Seluruh_Siswa_Lengkap.xlsx');
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Unduh Semua Siswa (.xlsx)</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>
        )}

        {/* Tab 5: MANAGE TEACHER ACCOUNTS (AKUN GURU) */}
        {activeTab === 'teachers' && !isTeacherRole && (
          <div className="space-y-6">
            
            {/* Top Action & Summary Command Bar */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                      <Users className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="font-extrabold text-base sm:text-lg text-slate-900">
                        Direktori & Manajemen Akun Guru
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Kelola data pendidik, mata pelajaran pengampuan, pembagian kelas mengajar, dan kredensial login portal guru.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
                  <button
                    type="button"
                    onClick={() => handleOpenAddTeacherModal(teacherSubjectFilter !== 'all' ? teacherSubjectFilter : undefined)}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>+ Tambah Guru Baru</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportModalType('teachers')}
                    className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Import data guru masal dari file Excel"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import Excel (.xlsx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadTeacherTemplate(subjects)}
                    className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Unduh format template Excel guru resmi"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Template</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const exportList = filteredTeachersList.length > 0 ? filteredTeachersList : teacherList;
                      const selectedSubjObj = subjects.find((s) => s.id === teacherSubjectFilter);
                      const fileName = teacherSubjectFilter !== 'all' && selectedSubjObj
                        ? `Data_Guru_Mapel_${selectedSubjObj.name.replace(/\s+/g, '_')}.xlsx`
                        : 'Data_Seluruh_Guru.xlsx';
                      exportTeachersToExcel(exportList, subjects, fileName);
                    }}
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Export data guru yang sedang difilter ke Excel"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden sm:inline">Export Excel</span>
                  </button>
                </div>
              </div>

              {/* Quick Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
                <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Guru Terdaftar</div>
                  <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5 flex items-center gap-1.5">
                    <span>{teacherList.length}</span>
                    <span className="text-xs font-semibold text-slate-400">Pendidik</span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Mapel Terdata</div>
                  <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5 flex items-center gap-1.5">
                    <span>{new Set(teacherList.map((t) => t.subjectId)).size}</span>
                    <span className="text-xs font-semibold text-slate-400">/ {subjects.length} Mapel</span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Filter Mapel Aktif</div>
                  <div className="text-base sm:text-lg font-black text-indigo-700 mt-0.5 truncate">
                    {teacherSubjectFilter === 'all'
                      ? 'Semua Mapel'
                      : subjects.find((s) => s.id === teacherSubjectFilter)?.name || 'Mapel Terpilih'}
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Rombel Terjangkau</div>
                  <div className="text-base sm:text-lg font-black text-indigo-700 mt-0.5 truncate">
                    {Array.from(new Set(teacherList.flatMap((t) => t.assignedClasses || []))).length} Kelas
                  </div>
                </div>
              </div>
            </div>

            {/* Banner Notification for Bulk Import */}
            {importSuccessBanner && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold flex items-center justify-between gap-3 shadow-2xs animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <span className="p-1 bg-emerald-600 text-white rounded-lg">
                    <Check className="w-4 h-4" />
                  </span>
                  <span>{importSuccessBanner}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setImportSuccessBanner('')}
                  className="text-emerald-700 hover:text-emerald-900 text-xs font-bold cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            )}

            {/* LEVEL 1: FILTER BERDASARKAN MATA PELAJARAN PENGAMPUAN */}
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    Langkah 1: Filter Berdasarkan Mata Pelajaran Pengampuan
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  {teacherSubjectFilter === 'all'
                    ? 'Menampilkan guru dari seluruh mata pelajaran'
                    : `Menampilkan guru pengampu ${subjects.find((s) => s.id === teacherSubjectFilter)?.name || ''}`}
                </span>
              </div>

              {/* Subject Filter Pills Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-1">
                {/* All Subjects Tab */}
                <button
                  type="button"
                  onClick={() => setTeacherSubjectFilter('all')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 relative ${
                    teacherSubjectFilter === 'all'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-500/20'
                      : 'bg-slate-50/70 hover:bg-slate-100 text-slate-700 border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`p-1.5 rounded-lg ${teacherSubjectFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-700'}`}>
                      <Users className="w-4 h-4" />
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      teacherSubjectFilter === 'all' ? 'bg-white text-indigo-700' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {teacherList.length}
                    </span>
                  </div>
                  <div>
                    <div className="font-black text-xs">Semua Mapel</div>
                    <div className={`text-[10px] truncate ${teacherSubjectFilter === 'all' ? 'text-indigo-100' : 'text-slate-500'}`}>
                      Seluruh Guru
                    </div>
                  </div>
                </button>

                {/* Individual Subjects */}
                {subjects.map((subj) => {
                  const isSelected = teacherSubjectFilter === subj.id;
                  const countInSubject = teacherList.filter((t) => t.subjectId === subj.id).length;

                  return (
                    <button
                      key={subj.id}
                      type="button"
                      onClick={() => setTeacherSubjectFilter(subj.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 relative ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-500/20'
                          : 'bg-white hover:bg-indigo-50/40 text-slate-700 border-slate-200/80 hover:border-indigo-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`p-1.5 rounded-lg ${isSelected ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                          {getSubjectIcon(subj.icon, 'w-4 h-4')}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          isSelected ? 'bg-white text-indigo-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {countInSubject}
                        </span>
                      </div>
                      <div>
                        <div className="font-black text-xs truncate" title={subj.name}>
                          {subj.name}
                        </div>
                        <div className={`text-[10px] truncate font-mono ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                          {subj.code ? `[${subj.code}]` : 'Mapel Umum'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* LEVEL 2 & 3: SEARCH BAR, CONTROLS, AND PROFESSIONAL ENTERPRISE DATA TABLE */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              
              {/* Table Control Bar */}
              <div className="p-3.5 sm:p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  {/* Search Input */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari nama guru, NIP, username, kelas mengajar..."
                      value={teacherSearchQuery}
                      onChange={(e) => setTeacherSearchQuery(e.target.value)}
                      className="w-full pl-8.5 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800"
                    />
                    {teacherSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setTeacherSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Sort By Dropdown */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
                    <select
                      value={teacherSortBy}
                      onChange={(e) => setTeacherSortBy(e.target.value as any)}
                      className="px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="nama">Urutkan: Nama Guru (A-Z)</option>
                      <option value="mapel">Urutkan: Mata Pelajaran</option>
                      <option value="username">Urutkan: Username</option>
                      <option value="nip">Urutkan: NIP / NIK</option>
                    </select>
                  </div>
                </div>

                {/* Right Side Tools */}
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAllTeacherPasswords((prev) => !prev)}
                    className={`px-3 py-2 border rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                      showAllTeacherPasswords
                        ? 'bg-amber-500 text-white border-amber-500 shadow-amber-200'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                    title={showAllTeacherPasswords ? 'Sembunyikan password seluruh guru' : 'Tampilkan password seluruh guru'}
                  >
                    {showAllTeacherPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showAllTeacherPasswords ? 'Tutup Password' : 'Lihat Password'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenAddTeacherModal(teacherSubjectFilter !== 'all' ? teacherSubjectFilter : undefined)}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Guru</span>
                  </button>
                </div>
              </div>

              {/* Table Status / Filter Info Bar */}
              <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <div className="flex items-center gap-2 flex-wrap">
                  <span>
                    Menampilkan <strong className="text-slate-800">{filteredTeachersList.length}</strong> dari {teacherList.length} akun guru
                  </span>
                  {teacherSubjectFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[11px] font-bold rounded-md border border-indigo-100">
                      Mapel: {subjects.find((s) => s.id === teacherSubjectFilter)?.name || teacherSubjectFilter}
                      <button
                        type="button"
                        onClick={() => setTeacherSubjectFilter('all')}
                        className="hover:text-rose-600 ml-0.5 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {teacherSearchQuery && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 text-[11px] font-bold rounded-md border border-amber-100">
                      Pencarian: "{teacherSearchQuery}"
                      <button
                        type="button"
                        onClick={() => setTeacherSearchQuery('')}
                        className="hover:text-rose-600 ml-0.5 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <span>Tips: Klik username untuk menyalin kredensial login</span>
                </div>
              </div>

              {/* Responsive Enterprise Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[760px]">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                      <th className="py-3 px-3.5 text-center w-12">No.</th>
                      <th className="py-3 px-4">Nama Lengkap & NIP</th>
                      <th className="py-3 px-4">Mata Pelajaran</th>
                      <th className="py-3 px-4">Kelas Mengajar</th>
                      <th className="py-3 px-4">Username Login</th>
                      <th className="py-3 px-4">Kata Sandi</th>
                      <th className="py-3 px-4 text-center w-28">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredTeachersList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 px-4 text-center">
                          <div className="max-w-md mx-auto space-y-3">
                            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                              <Users className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="font-extrabold text-slate-800 text-sm">Tidak ada akun guru ditemukan</h4>
                              <p className="text-slate-500 text-xs mt-1">
                                {teacherSearchQuery || teacherSubjectFilter !== 'all'
                                  ? 'Coba sesuaikan kata kunci pencarian atau ubah filter mata pelajaran yang dipilih.'
                                  : 'Belum ada akun guru yang terdaftar. Tambahkan akun baru atau import data melalui Excel.'}
                              </p>
                            </div>
                            <div className="flex items-center justify-center gap-2 pt-2">
                              {teacherSearchQuery || teacherSubjectFilter !== 'all' ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTeacherSearchQuery('');
                                    setTeacherSubjectFilter('all');
                                  }}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                                >
                                  Reset Filter
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => handleOpenAddTeacherModal(teacherSubjectFilter !== 'all' ? teacherSubjectFilter : undefined)}
                                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Tambah Guru Baru</span>
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredTeachersList.map((teacher, idx) => {
                        const isVisible = showAllTeacherPasswords || showPasswordMap[teacher.id];
                        const assignedSubj = subjects.find((s) => s.id === teacher.subjectId);
                        const isCopied = copiedTeacherId === teacher.id;

                        // Generate a harmonious avatar background color based on name
                        const colors = ['bg-indigo-600', 'bg-emerald-600', 'bg-violet-600', 'bg-sky-600', 'bg-amber-600', 'bg-rose-600'];
                        const colorIndex = (teacher.name.charCodeAt(0) + (teacher.name.charCodeAt(1) || 0)) % colors.length;
                        const avatarBg = colors[colorIndex];
                        const initials = teacher.name
                          .split(' ')
                          .filter(Boolean)
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase();

                        return (
                          <tr
                            key={teacher.id}
                            className="hover:bg-indigo-50/30 transition-colors group"
                          >
                            {/* No. / Index */}
                            <td className="py-3 px-3.5 text-center font-bold text-slate-400 text-xs">
                              {idx + 1}
                            </td>

                            {/* Nama Lengkap & NIP */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-xl ${avatarBg} text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs`}>
                                  {initials}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-extrabold text-slate-900 text-xs group-hover:text-indigo-600 transition-colors truncate">
                                    {teacher.name}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    {teacher.nip ? (
                                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                                        NIP: {teacher.nip}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 italic">
                                        Tanpa NIP
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Mata Pelajaran */}
                            <td className="py-3 px-4">
                              {assignedSubj ? (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200/80 font-bold text-xs">
                                  {getSubjectIcon(assignedSubj.icon, 'w-3.5 h-3.5 text-emerald-600 shrink-0')}
                                  <span className="truncate max-w-[140px]">{assignedSubj.name}</span>
                                  {assignedSubj.code && (
                                    <span className="text-[10px] font-mono px-1 py-0.2 bg-emerald-200/60 rounded text-emerald-900">
                                      {assignedSubj.code}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-xs">Belum diatur</span>
                              )}
                            </td>

                            {/* Kelas Mengajar */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1 flex-wrap max-w-xs">
                                {teacher.assignedClasses && teacher.assignedClasses.length > 0 ? (
                                  teacher.assignedClasses.map((cls) => {
                                    const studentCountInClass = studentList.filter(
                                      (s) => (s.kelas || '').trim().toLowerCase() === cls.toLowerCase()
                                    ).length;

                                    return (
                                      <span
                                        key={cls}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 font-extrabold text-[10px] rounded-md border border-indigo-100"
                                        title={`${studentCountInClass} siswa di kelas ini`}
                                      >
                                        <span>Kelas {cls}</span>
                                        <span className="text-indigo-400 text-[9px] font-medium">({studentCountInClass})</span>
                                      </span>
                                    );
                                  })
                                ) : (
                                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-bold text-[10px] rounded-md border border-amber-200">
                                    Akses Semua Rombel
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Username Login */}
                            <td className="py-3 px-4">
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(teacher.username);
                                  setCopiedTeacherId(teacher.id);
                                  setTimeout(() => setCopiedTeacherId(null), 2000);
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg border border-slate-200 hover:border-indigo-200 font-mono text-xs font-bold transition-all cursor-pointer group/btn"
                                title="Klik untuk menyalin username login"
                              >
                                <span>@{teacher.username}</span>
                                {isCopied ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3 text-slate-400 group-hover/btn:text-indigo-600 opacity-60 group-hover/btn:opacity-100" />
                                )}
                              </button>
                            </td>

                            {/* Kata Sandi */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                <span className={`font-mono text-xs px-2 py-0.5 rounded-md border ${
                                  isVisible
                                    ? 'bg-amber-50 text-amber-900 border-amber-200 font-bold'
                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                                }`}>
                                  {isVisible ? teacher.password : '••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleShowPassword(teacher.id)}
                                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                  title={isVisible ? 'Sembunyikan password' : 'Lihat password'}
                                >
                                  {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>

                            {/* Aksi */}
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleEditTeacher(teacher)}
                                  className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Data Guru"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTeacher(teacher.id, teacher.name)}
                                  className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Hapus Akun Guru"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="p-3 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Sistem Direktori Guru Aktif • Terhubung ke Firestore Cloud</span>
                </div>
                <div className="flex items-center gap-3">
                  <span>Total: <strong className="text-slate-800">{teacherList.length} Guru</strong></span>
                  <button
                    type="button"
                    onClick={() => {
                      exportTeachersToExcel(teacherList, subjects, 'Data_Seluruh_Guru_Lengkap.xlsx');
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Semua Guru (.xlsx)</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}

      {/* Add / Edit Student Account Modal */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white shadow-xs ${editingStudent ? 'bg-amber-500' : 'bg-indigo-600'}`}>
                  {editingStudent ? <Edit2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {editingStudent ? 'Edit Data Akun Siswa' : 'Tambah Akun Siswa Baru'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {editingStudent ? `Memperbarui data peserta didik ${editingStudent.nama}` : 'Masukkan data peserta didik dan kredensial login portal'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsStudentModalOpen(false);
                  resetStudentForm();
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Lengkap Siswa <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="mis. Budi Santoso"
                  value={studentNama}
                  onChange={(e) => setStudentNama(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                  required
                />
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Kelas / Rombel Siswa <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-indigo-600 font-bold">
                      {studentKelas ? `Terpilih: Kelas ${studentKelas}` : 'Pilih atau ketik rombel'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Pilih dari daftar di bawah atau ketik langsung (mis. 7.1, 8.2)..."
                      value={studentKelas}
                      onChange={(e) => setStudentKelas(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                      required
                    />

                    {/* Synchronized Grade Level Filter & Quick Rombel Selector */}
                    <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                      {/* Grade Tabs in Modal */}
                      <div className="flex flex-wrap items-center gap-1 pb-1.5 border-b border-slate-200/60">
                        <button
                          type="button"
                          onClick={() => setStudentModalGradeTab('all')}
                          className={`px-2 py-0.5 text-[10px] font-black rounded-md transition-all cursor-pointer ${
                            studentModalGradeTab === 'all'
                              ? 'bg-slate-800 text-white shadow-2xs'
                              : 'bg-white hover:bg-slate-200 text-slate-600 border border-slate-200'
                          }`}
                        >
                          Semua Rombel
                        </button>
                        {masterGrades.map((g) => {
                          const countInGrade = allAvailableClasses.filter((c) => getGradeCategory(c) === g.id).length;
                          if (countInGrade === 0 && g.id !== '7' && g.id !== '8' && g.id !== '9') return null;
                          return (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => setStudentModalGradeTab(g.id)}
                              className={`px-2 py-0.5 text-[10px] font-black rounded-md transition-all cursor-pointer ${
                                studentModalGradeTab === g.id
                                  ? 'bg-indigo-600 text-white shadow-2xs'
                                  : 'bg-white hover:bg-indigo-50 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {g.label.replace('Tingkat ', '')}
                            </button>
                          );
                        })}
                      </div>

                      {/* Rombel Pills */}
                      {(() => {
                        const availableRombels = allAvailableClasses.filter((cls) => {
                          if (studentModalGradeTab === 'all') return true;
                          return getGradeCategory(cls) === studentModalGradeTab;
                        });

                        return (
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                            {availableRombels.map((c) => {
                              const isSelected = studentKelas.trim().toLowerCase() === c.trim().toLowerCase();
                              const count = studentList.filter(
                                (s) => (s.kelas || '').trim().toLowerCase() === c.toLowerCase()
                              ).length;

                              return (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => {
                                    setStudentKelas(c);
                                    // Auto-suggest next attendance number if adding a new student
                                    if (!editingStudent) {
                                      const studentsInClass = studentList.filter(
                                        (s) => (s.kelas || '').trim().toLowerCase() === c.trim().toLowerCase()
                                      );
                                      const maxAbsen = studentsInClass.reduce((max, s) => {
                                        const num = parseInt(s.noAbsen || '0', 10);
                                        return isNaN(num) ? max : Math.max(max, num);
                                      }, 0);
                                      setStudentNoAbsen(String(maxAbsen + 1));
                                    }
                                  }}
                                  className={`px-2 py-1 text-[11px] font-black rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                                    isSelected
                                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs ring-2 ring-indigo-500/20'
                                      : 'bg-white hover:bg-indigo-50 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  <span>Kelas {c}</span>
                                  <span
                                    className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                                      isSelected
                                        ? 'bg-white/20 text-white'
                                        : 'bg-slate-100 text-slate-500'
                                    }`}
                                  >
                                    {count}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    No. Absen Siswa <span className="text-slate-400 font-normal lowercase">(opsional / otomatis)</span>
                  </label>
                  <input
                    type="number"
                    placeholder="mis. 1, 2, 3..."
                    value={studentNoAbsen}
                    onChange={(e) => setStudentNoAbsen(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    No. Absen otomatis dihitung berdasarkan urutan siswa di rombel terpilih.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  NISN (ID Login Siswa) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="mis. 0012345678"
                  value={studentNisn}
                  onChange={(e) => setStudentNisn(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Username <span className="text-slate-400 font-normal lowercase">(opsional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Sama dengan NISN"
                    value={studentUsername}
                    onChange={(e) => setStudentUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Password <span className="text-amber-600">(default: pass123)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="pass123"
                    value={studentPassword}
                    onChange={(e) => setStudentPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-xs text-indigo-900 flex items-start gap-2.5">
                <span className="p-1 bg-indigo-200/80 text-indigo-800 rounded-md shrink-0 mt-0.5">
                  <KeyRound className="w-3.5 h-3.5" />
                </span>
                <div>
                  <p className="font-bold">Informasi Login Siswa:</p>
                  <p className="text-[11px] text-indigo-700/90 mt-0.5">
                    Siswa mengakses portal menggunakan <strong>NISN</strong> dan Password yang ditentukan.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsStudentModalOpen(false);
                    resetStudentForm();
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Menyimpan...' : editingStudent ? 'Simpan Perubahan' : 'Buat Akun Siswa'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Teacher Account Modal */}
      {isTeacherModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white shadow-xs ${editingTeacher ? 'bg-amber-500' : 'bg-indigo-600'}`}>
                  {editingTeacher ? <Edit2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {editingTeacher ? 'Edit Data Akun Guru' : 'Tambah Akun Guru Baru'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {editingTeacher ? `Memperbarui data dan hak akses ${editingTeacher.name}` : 'Masukkan data pendidik, mapel pengampuan, dan kredensial login'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsTeacherModalOpen(false);
                  resetTeacherForm();
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveTeacher} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Lengkap Guru <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="mis. Drs. Budi Santoso, M.Pd."
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  NIP / NIK <span className="text-slate-400 font-normal lowercase">(opsional / boleh kosong)</span>
                </label>
                <input
                  type="text"
                  placeholder="mis. 198503122010011002"
                  value={teacherNip}
                  onChange={(e) => setTeacherNip(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Username Login <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="mis. budi_ips"
                    value={teacherUsername}
                    onChange={(e) => setTeacherUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Password Login <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="mis. gurupass123"
                    value={teacherPassword}
                    onChange={(e) => setTeacherPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mata Pelajaran Pengampuan <span className="text-rose-500">*</span>
                </label>
                <select
                  value={teacherSubjectId}
                  onChange={(e) => setTeacherSubjectId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 cursor-pointer"
                  required
                >
                  {subjects.length === 0 ? (
                    <option value="">Belum ada mata pelajaran</option>
                  ) : (
                    subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.code ? `[${s.code}]` : ''}
                      </option>
                    ))
                  )}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Mata pelajaran ini mengunci topik & materi yang dapat dibuat dan dikelola oleh guru terkait.
                </p>
              </div>

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Setting Kelas Mengajar Guru <span className="text-slate-400 font-normal lowercase">(opsional / multi-kelas)</span>
                  </label>
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-slate-500 font-medium">Terpilih:</span>
                    <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 font-extrabold rounded-md text-[10px]">
                      {teacherAssignedClasses.length} Rombel
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                  {/* Grade Level Filter Tabs & Quick Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                    {/* Grade Tabs */}
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setTeacherClassGradeTab('all')}
                        className={`px-2 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                          teacherClassGradeTab === 'all'
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'bg-white hover:bg-slate-200 text-slate-600 border border-slate-200'
                        }`}
                      >
                        Semua ({allAvailableClasses.length})
                      </button>
                      {masterGrades.map((g) => {
                        const countInGrade = allAvailableClasses.filter((c) => getGradeCategory(c) === g.id).length;
                        if (countInGrade === 0 && g.id !== '7' && g.id !== '8' && g.id !== '9') return null;
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setTeacherClassGradeTab(g.id)}
                            className={`px-2 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                              teacherClassGradeTab === g.id
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-slate-200'
                            }`}
                          >
                            {g.label.replace('Tingkat ', '')} ({countInGrade})
                          </button>
                        );
                      })}
                    </div>

                    {/* Quick Selection Buttons */}
                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => selectAllClassesForGrade(teacherClassGradeTab)}
                        className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-md border border-indigo-200 cursor-pointer transition-colors"
                      >
                        + Pilih Semua {teacherClassGradeTab === 'all' ? 'Rombel' : `Tingkat ${teacherClassGradeTab}`}
                      </button>
                      {teacherAssignedClasses.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (teacherClassGradeTab === 'all') {
                              setTeacherAssignedClasses([]);
                            } else {
                              deselectAllClassesForGrade(teacherClassGradeTab);
                            }
                          }}
                          className="px-2 py-0.5 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-[10px] font-bold rounded-md border border-slate-200 hover:border-rose-200 cursor-pointer transition-colors"
                        >
                          Batalkan
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Synchronized Rombel Grid */}
                  {(() => {
                    const displayedClasses = allAvailableClasses.filter((cls) => {
                      if (teacherClassGradeTab === 'all') return true;
                      return getGradeCategory(cls) === teacherClassGradeTab;
                    });

                    if (displayedClasses.length === 0) {
                      return (
                        <div className="py-3 text-center text-xs text-slate-400 font-medium">
                          Belum ada rombel di tingkat ini.
                        </div>
                      );
                    }

                    return (
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {displayedClasses.map((cls) => {
                          const isSelected = teacherAssignedClasses.includes(cls);
                          const studentCount = studentList.filter(
                            (s) => (s.kelas || '').trim().toLowerCase() === cls.toLowerCase()
                          ).length;

                          return (
                            <button
                              key={cls}
                              type="button"
                              onClick={() => toggleTeacherClass(cls)}
                              className={`px-2.5 py-1 text-[11px] font-black rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs ring-2 ring-indigo-500/20'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50/70 hover:border-indigo-200'
                              }`}
                            >
                              <span>{isSelected ? `✓ Kelas ${cls}` : `+ ${cls}`}</span>
                              <span
                                className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {studentCount} siswa
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Add Custom Class input */}
                  <div className="flex gap-1.5 pt-1.5 border-t border-slate-200">
                    <input
                      type="text"
                      placeholder="Tambah rombel baru/khusus (mis. 7.5, 10-MIPA-1)..."
                      value={newCustomClassInput}
                      onChange={(e) => setNewCustomClassInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomClass();
                        }
                      }}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomClass}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah & Pilih</span>
                    </button>
                  </div>

                  {/* Selected Summary Badges */}
                  {teacherAssignedClasses.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold self-center mr-1">Rombel Terpilih:</span>
                      {teacherAssignedClasses.map((cls) => {
                        const count = studentList.filter(
                          (s) => (s.kelas || '').trim().toLowerCase() === cls.toLowerCase()
                        ).length;
                        return (
                          <span
                            key={cls}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 font-extrabold text-[10px] rounded-md border border-indigo-200 shadow-2xs"
                          >
                            Kelas {cls} <span className="text-indigo-400 font-medium">({count})</span>
                            <button
                              type="button"
                              onClick={() => toggleTeacherClass(cls)}
                              className="hover:text-rose-600 font-bold cursor-pointer ml-0.5 text-xs text-indigo-400 hover:bg-rose-50 rounded px-0.5"
                              title={`Hapus Kelas ${cls}`}
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Jika dikosongkan, guru dapat mengakses seluruh rombel.
                </p>
              </div>

              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Hak Akses Portal Guru:</p>
                  <p className="text-[11px] text-indigo-700/90 mt-0.5">
                    Guru login menggunakan username & kata sandi untuk mengelola materi mapel pengampuan dan memantau tugas kelas terkait.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsTeacherModalOpen(false);
                    resetTeacherForm();
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Menyimpan...' : editingTeacher ? 'Simpan Perubahan' : 'Buat Akun Guru'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150 my-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border bg-rose-100 border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-800">
                  Konfirmasi Hapus {
                    deleteConfirmItem.type === 'material'
                      ? 'Materi'
                      : deleteConfirmItem.type === 'subject'
                      ? 'Mata Pelajaran'
                      : (deleteConfirmItem.type as string) === 'teacher'
                      ? 'Akun Guru'
                      : (deleteConfirmItem.type as string) === 'student'
                      ? 'Akun Siswa'
                      : 'Topik'
                  }
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 font-medium">
              Apakah Anda yakin ingin menghapus{' '}
              {deleteConfirmItem.type === 'material'
                ? 'materi'
                : deleteConfirmItem.type === 'subject'
                ? 'mata pelajaran'
                : (deleteConfirmItem.type as string) === 'teacher'
                ? 'akun guru'
                : (deleteConfirmItem.type as string) === 'student'
                ? 'akun siswa'
                : 'topik'}{' '}
              <span className="font-bold text-slate-900">"{deleteConfirmItem.title}"</span>?
              {deleteConfirmItem.type === 'category' && (
                <p className="text-rose-600 font-semibold mt-1">
                  ⚠️ Semua materi di dalam topik ini juga akan terhapus secara otomatis.
                </p>
              )}
              {deleteConfirmItem.type === 'subject' && (
                <p className="text-rose-600 font-semibold mt-1">
                  ⚠️ Semua topik dan materi di bawah mata pelajaran ini akan terhapus.
                </p>
              )}
              {deleteConfirmItem.type === 'student' && (
                <p className="text-rose-600 font-semibold mt-1">
                  ⚠️ Data akun login, NISN, dan riwayat belajar siswa ini akan dihapus secara permanen.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {isDeleting ? (
                  <span>Memproses...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Student Password Modal */}
      {resetPassConfirmStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150 my-auto">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-black shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Reset Kata Sandi Siswa
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kembalikan kata sandi ke bawaan default
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-2">
              <p className="leading-relaxed">
                Apakah Anda ingin mereset kata sandi akun siswa <strong>"{resetPassConfirmStudent.nama}"</strong> (NISN: <code className="font-mono font-bold bg-amber-100/80 px-1 py-0.5 rounded text-amber-950">{resetPassConfirmStudent.nisn}</code>)?
              </p>
              <div className="p-2.5 bg-white rounded-xl border border-amber-200/80 text-[11px] text-amber-950 flex items-center justify-between">
                <span>Kata Sandi Baru:</span>
                <span className="font-mono font-black text-amber-900 bg-amber-100/60 px-2 py-0.5 rounded-md">pass123</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResetPassConfirmStudent(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteResetStudentPassword}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <KeyRound className="w-4 h-4" />
                <span>Ya, Reset Sandi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Student Progress Confirmation Modal */}
      {resetProgressConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150 my-auto">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-black shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  {resetProgressConfirm.isAll ? 'Reset Seluruh Progres Siswa' : 'Reset Progres Materi Siswa'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Siswa dapat mengerjakan ulang materi/kuis dari awal
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2.5">
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-semibold">Nama Siswa:</span>
                <span className="font-black text-slate-900">{resetProgressConfirm.studentName}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-semibold">Kelas:</span>
                <span className="font-black text-indigo-700 px-2 py-0.5 bg-indigo-50 rounded-md border border-indigo-100">
                  Kelas {resetProgressConfirm.studentClass}
                </span>
              </div>
              {resetProgressConfirm.materialTitle && (
                <div className="pt-2 border-t border-slate-200 flex flex-col gap-1 text-slate-600">
                  <span className="font-semibold">Materi yang di-reset:</span>
                  <span className="font-black text-slate-900 bg-white p-2.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
                    {resetProgressConfirm.materialTitle}
                  </span>
                </div>
              )}
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed font-medium">
                💡 <strong>Mekanisme Reset:</strong> Status materi ini akan dikembalikan ke status <em>Belum Selesai</em> pada akun siswa, sehingga siswa dapat membuka dan menyelesaikan ulang materi, mini kuis, atau formulir ujian tanpa hambatan.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isResettingProgress}
                onClick={() => setResetProgressConfirm(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isResettingProgress}
                onClick={handleExecuteResetProgress}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isResettingProgress ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>{resetProgressConfirm.isAll ? 'Ya, Reset Semua' : 'Ya, Reset Materi Ini'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Excel Modal */}
      <ImportExcelModal
        isOpen={importModalType !== null}
        onClose={() => setImportModalType(null)}
        type={importModalType || 'students'}
        subjects={subjects}
        onSuccess={handleImportSuccess}
      />

      {/* MODAL: Tambah Rombel Baru */}
      {isAddClassModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center font-black text-white shadow-xs">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Tambah Rombel / Kelas Baru</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Daftarkan rombongan belajar baru ke dalam sistem</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddClassModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewClass} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Rombel / Kelas <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="mis. 7.5, 8.4, 10-IPA-1, 12-MIPA"
                  value={newClassNameInput}
                  onChange={(e) => setNewClassNameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white text-slate-800"
                  required
                  autoFocus
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Format bebas, contoh: <strong>7.1</strong>, <strong>8-A</strong>, <strong>10 MIPA 1</strong>, <strong>12-IPS-2</strong>.
                </p>
              </div>

              {/* Quick Suggestion Buttons */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Saran Nama Cepat:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['7.1', '7.2', '7.3', '8.1', '8.2', '8.3', '9.1', '9.2', '9.3', '10A', '10B', '11A', '11B', '12A', '12B'].map((sugg) => (
                    <button
                      key={sugg}
                      type="button"
                      onClick={() => setNewClassNameInput(sugg)}
                      className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 text-[10px] font-extrabold rounded-lg border border-slate-200 transition-colors cursor-pointer"
                    >
                      {sugg}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddClassModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambahkan Rombel</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit / Ganti Nama Rombel */}
      {isEditClassModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-white shadow-xs">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Edit / Ganti Nama Rombel</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Ubah nama rombel "{editClassOldName}"</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditClassModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRenamedClass} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Rombel Baru <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editClassNewName}
                  onChange={(e) => setEditClassNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white text-slate-800"
                  required
                  autoFocus
                />
              </div>

              {(() => {
                const affected = studentList.filter(
                  (s) => (s.kelas || '').trim().toLowerCase() === editClassOldName.trim().toLowerCase()
                ).length;
                return (
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-xs text-indigo-900">
                    <p className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>Sinkronisasi Otomatis Data Siswa:</span>
                    </p>
                    <p className="text-[11px] text-indigo-700 mt-1 leading-relaxed">
                      Sebanyak <strong>{affected} akun siswa</strong> yang berada di kelas "{editClassOldName}" akan otomatis diperbarui ke nama kelas baru "{editClassNewName}".
                    </p>
                  </div>
                );
              })()}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditClassModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Nama Baru'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Hapus Rombel */}
      {isDeleteClassModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150 my-auto">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-black shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Hapus Rombel "{deleteClassTarget}"</h3>
                <p className="text-xs text-slate-500 mt-0.5">Tentukan bagaimana data siswa di kelas ini ditangani</p>
              </div>
            </div>

            {(() => {
              const studentsInTarget = studentList.filter(
                (s) => (s.kelas || '').trim().toLowerCase() === deleteClassTarget.trim().toLowerCase()
              );
              const otherClasses = Array.from(
                new Set<string>([
                  ...masterClasses,
                  ...studentList.map((s) => (s.kelas || '').trim()).filter(Boolean),
                ])
              ).filter((c) => c.toLowerCase() !== deleteClassTarget.toLowerCase());

              return (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900">
                    <p className="font-bold">Informasi Rombel:</p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Saat ini terdapat <strong>{studentsInTarget.length} akun siswa</strong> terdaftar di kelas "{deleteClassTarget}".
                    </p>
                  </div>

                  <div className="space-y-2 pt-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Pilihan Aksi Siswa:
                    </label>

                    {/* Option 1: Pindahkan Siswa */}
                    {studentsInTarget.length > 0 && otherClasses.length > 0 && (
                      <label className="flex items-start gap-3 p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 cursor-pointer transition-colors">
                        <input
                          type="radio"
                          name="deleteClassOption"
                          value="move_students"
                          checked={deleteClassOption === 'move_students'}
                          onChange={() => setDeleteClassOption('move_students')}
                          className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex-1 text-xs">
                          <p className="font-bold text-slate-800">Pindahkan siswa ke rombel lain</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Akun siswa tidak dihapus, melainkan dipindahkan ke kelas tujuan berikut:
                          </p>
                          {deleteClassOption === 'move_students' && (
                            <select
                              value={deleteClassMoveTarget}
                              onChange={(e) => setDeleteClassMoveTarget(e.target.value)}
                              className="mt-2 w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            >
                              {otherClasses.map((c) => (
                                <option key={c} value={c}>
                                  Kelas {c}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </label>
                    )}

                    {/* Option 2: Hapus Siswa Sekaligus */}
                    {studentsInTarget.length > 0 && (
                      <label className="flex items-start gap-3 p-3 bg-rose-50 hover:bg-rose-100/70 rounded-2xl border border-rose-200 cursor-pointer transition-colors">
                        <input
                          type="radio"
                          name="deleteClassOption"
                          value="delete_students"
                          checked={deleteClassOption === 'delete_students'}
                          onChange={() => setDeleteClassOption('delete_students')}
                          className="mt-0.5 text-rose-600 focus:ring-rose-500"
                        />
                        <div className="flex-1 text-xs text-rose-950">
                          <p className="font-bold text-rose-700">Hapus semua {studentsInTarget.length} akun siswa di kelas ini</p>
                          <p className="text-[11px] text-rose-600 mt-0.5">
                            Semua akun peserta didik di kelas {deleteClassTarget} akan dihapus permanen.
                          </p>
                        </div>
                      </label>
                    )}

                    {/* Option 3: Hapus rombel saja */}
                    <label className="flex items-start gap-3 p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="deleteClassOption"
                        value="keep_students"
                        checked={deleteClassOption === 'keep_students'}
                        onChange={() => setDeleteClassOption('keep_students')}
                        className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex-1 text-xs">
                        <p className="font-bold text-slate-800">Hanya hapus rombel dari daftar preset</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Hapus dari daftar rombel master tanpa menghapus akun siswa yang sudah ada.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeleteClassModalOpen(false)}
                disabled={isSaving}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteClass}
                disabled={isSaving}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isSaving ? 'Menghapus...' : 'Ya, Hapus Rombel Ini'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Hapus Tingkat Kelas (Misal: Hapus Kelas 12) */}
      {isDeleteGradeModalOpen && deleteGradeTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150 my-auto">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-black shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Hapus Tingkat "{deleteGradeTarget.label}"
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hapus seluruh jenjang {deleteGradeTarget.label} dari sistem aplikasi
                </p>
              </div>
            </div>

            {(() => {
              const studentsInGrade = studentList.filter((s) => {
                const clean = (s.kelas || '').trim().toUpperCase();
                const gid = deleteGradeTarget.id;
                if (gid === '7') return /^(KELAS\s*)?(7|VII)(\.|\s|[A-Z]|$)/i.test(clean);
                if (gid === '8') return /^(KELAS\s*)?(8|VIII)(\.|\s|[A-Z]|$)/i.test(clean);
                if (gid === '9') return /^(KELAS\s*)?(9|IX)(\.|\s|[A-Z]|$)/i.test(clean);
                if (gid === '10') return /^(KELAS\s*)?(10|X)(\.|\s|[A-Z]|$)/i.test(clean);
                if (gid === '11') return /^(KELAS\s*)?(11|XI)(\.|\s|[A-Z]|$)/i.test(clean);
                if (gid === '12') return /^(KELAS\s*)?(12|XII)(\.|\s|[A-Z]|$)/i.test(clean);
                return clean.startsWith(gid.toUpperCase()) || clean.includes(gid.toUpperCase());
              });

              return (
                <div className="space-y-3">
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 space-y-1">
                    <p className="font-extrabold text-rose-950 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Konfirmasi Penghapusan Jenjang / Tingkat:</span>
                    </p>
                    <p className="text-[11px] text-rose-700 leading-relaxed">
                      Anda akan menghapus tingkat <strong>{deleteGradeTarget.label} ({deleteGradeTarget.subLabel})</strong>. Terdapat total <strong>{studentsInGrade.length} akun siswa</strong> di tingkat ini.
                    </p>
                  </div>

                  <div className="space-y-2 pt-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Opsi Penghapusan:
                    </label>

                    <label className="flex items-start gap-3 p-3 bg-rose-50/70 hover:bg-rose-100/70 rounded-2xl border border-rose-200 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="deleteGradeOption"
                        value="delete_students"
                        checked={deleteGradeOption === 'delete_students'}
                        onChange={() => setDeleteGradeOption('delete_students')}
                        className="mt-0.5 text-rose-600 focus:ring-rose-500"
                      />
                      <div className="flex-1 text-xs">
                        <p className="font-bold text-rose-900">
                          Hapus Tingkat & Seluruh {studentsInGrade.length} Akun Siswa di dalamnya
                        </p>
                        <p className="text-[11px] text-rose-600 mt-0.5">
                          Menghapus tingkat {deleteGradeTarget.label} beserta seluruh rombel dan akun siswanya secara bersih.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="deleteGradeOption"
                        value="keep_students"
                        checked={deleteGradeOption === 'keep_students'}
                        onChange={() => setDeleteGradeOption('keep_students')}
                        className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex-1 text-xs">
                        <p className="font-bold text-slate-800">Hanya Hapus Tingkat dari Navigasi Master</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Tingkat dihapus dari menu, tetapi akun siswa tetap tersimpan di database.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeleteGradeModalOpen(false)}
                disabled={isSaving}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteGrade}
                disabled={isSaving}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isSaving ? 'Menghapus...' : `Hapus ${deleteGradeTarget.label}`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Tambah Tingkat Baru */}
      {isAddGradeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-white shadow-xs">
                  <School className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Tambah Tingkat Kelas Baru</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Tambahkan jenjang kelas baru ke dalam sistem</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddGradeModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewGrade} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Kode / ID Tingkat <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="mis. 6, 12, SD-5, X-TKJ"
                  value={newGradeIdInput}
                  onChange={(e) => setNewGradeIdInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white text-slate-800"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Label Tingkat <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="mis. Kelas 12, Kelas 6 SD"
                  value={newGradeLabelInput}
                  onChange={(e) => setNewGradeLabelInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Sub-label / Keterangan Jenjang
                </label>
                <input
                  type="text"
                  placeholder="mis. SMA / SMK, Jenjang SD, Khusus"
                  value={newGradeSubLabelInput}
                  onChange={(e) => setNewGradeSubLabelInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddGradeModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Simpan Tingkat</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Comprehensive Master Class & Grade Manager */}
      {isClassManagerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-white shadow-xs">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Manajemen Master Rombel & Tingkat Kelas</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Kelola, tambah, edit nama, dan hapus rombel maupun tingkat kelas</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsClassManagerModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800">
                  Total Rombel: {masterClasses.length} | Total Tingkat: {masterGrades.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewClassNameInput('');
                    setIsAddClassModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Rombel Baru</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewGradeIdInput('');
                    setNewGradeLabelInput('');
                    setNewGradeSubLabelInput('');
                    setIsAddGradeModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Tingkat Baru</span>
                </button>
              </div>
            </div>

            {/* Scrollable Container with Rombels & Grades */}
            <div className="flex-1 overflow-y-auto space-y-5 pr-1">
              {/* Section 1: Daftar Tingkat Kelas */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <School className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Daftar Tingkat Kelas ({masterGrades.length})
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {masterGrades.map((grade) => {
                    const studentCount = studentList.filter((s) => {
                      const clean = (s.kelas || '').trim().toUpperCase();
                      const gid = grade.id;
                      if (gid === '7') return /^(KELAS\s*)?(7|VII)(\.|\s|[A-Z]|$)/i.test(clean);
                      if (gid === '8') return /^(KELAS\s*)?(8|VIII)(\.|\s|[A-Z]|$)/i.test(clean);
                      if (gid === '9') return /^(KELAS\s*)?(9|IX)(\.|\s|[A-Z]|$)/i.test(clean);
                      if (gid === '10') return /^(KELAS\s*)?(10|X)(\.|\s|[A-Z]|$)/i.test(clean);
                      if (gid === '11') return /^(KELAS\s*)?(11|XI)(\.|\s|[A-Z]|$)/i.test(clean);
                      if (gid === '12') return /^(KELAS\s*)?(12|XII)(\.|\s|[A-Z]|$)/i.test(clean);
                      return clean.startsWith(gid.toUpperCase()) || clean.includes(gid.toUpperCase());
                    }).length;

                    return (
                      <div
                        key={grade.id}
                        className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-2 shadow-2xs hover:border-indigo-200 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-extrabold text-slate-900">{grade.label}</span>
                            <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-md border border-indigo-100">
                              {studentCount} siswa
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">{grade.subLabel}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteGradeTarget(grade);
                            setDeleteGradeOption('delete_students');
                            setIsDeleteGradeModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          title={`Hapus Tingkat ${grade.label}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Daftar Rombongan Belajar (Rombel) */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Daftar Semua Rombel ({masterClasses.length})
                  </h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {masterClasses.map((cls) => {
                    const count = studentList.filter((s) => (s.kelas || '').trim().toLowerCase() === cls.toLowerCase()).length;
                    return (
                      <div
                        key={cls}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-1 shadow-2xs hover:border-indigo-200 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-900 truncate">Kelas {cls}</p>
                          <p className="text-[10px] text-slate-400">{count} Siswa</p>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditClassOldName(cls);
                              setEditClassNewName(cls);
                              setIsEditClassModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title={`Ganti nama rombel ${cls}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteClassTarget(cls);
                              setDeleteClassOption('keep_students');
                              const otherClasses = masterClasses.filter((c) => c !== cls);
                              setDeleteClassMoveTarget(otherClasses[0] || '');
                              setIsDeleteClassModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title={`Hapus rombel ${cls}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsClassManagerModalOpen(false)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Selesai / Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: TAMBAH / EDIT MATA PELAJARAN                                      */}
      {/* ========================================================================= */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden transition-all my-8">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  {editingSubject ? <Edit2 className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                    {editingSubject ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingSubject ? 'Perbarui informasi mata pelajaran yang dipilih' : 'Tambahkan kurikulum mata pelajaran baru ke sistem'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSubjectModalOpen(false);
                  resetSubjectForm();
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveSubject} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Mata Pelajaran <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Matematika, IPA, Pemrograman"
                  value={subjName}
                  onChange={(e) => setSubjName(e.target.value)}
                  className="w-full py-2.5 px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kode Singkat (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Misal: MTK, INF, IPA"
                    value={subjCode}
                    onChange={(e) => setSubjCode(e.target.value)}
                    className="w-full py-2.5 px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-mono uppercase font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor Urutan Tampil
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder={`Otomatis (${subjects.reduce((max, s) => Math.max(max, s.order || 0), 0) + 1})`}
                    value={subjOrder}
                    onChange={(e) => setSubjOrder(e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                    className={`w-full py-2.5 px-3.5 bg-white border rounded-xl text-xs font-bold focus:outline-none focus:ring-2 ${
                      subjOrderConflict
                        ? 'border-rose-500 focus:ring-rose-500/20 text-rose-900 bg-rose-50/30'
                        : 'border-slate-200 focus:ring-indigo-500/20 text-slate-800'
                    }`}
                  />
                  {subjOrderConflict && (
                    <p className="text-[10px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>Urutan #{subjOrder} sudah dipakai oleh "{subjOrderConflict.name}"</span>
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deskripsi / Keterangan (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan singkat mengenai mata pelajaran ini..."
                  value={subjDescription}
                  onChange={(e) => setSubjDescription(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <IconPicker
                  label="Pilih Ikon Visual Mata Pelajaran"
                  value={subjIcon}
                  onChange={(iconKey) => setSubjIcon(iconKey)}
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsSubjectModalOpen(false);
                    resetSubjectForm();
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-200 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Menyimpan...' : editingSubject ? 'Simpan Perubahan' : 'Tambah Mata Pelajaran'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TAMBAH / EDIT TOPIK / KATEGORI                                   */}
      {/* ========================================================================= */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden transition-all my-8">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  {editingCategory ? <Edit2 className="w-5 h-5" /> : <Folder className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                    {editingCategory ? 'Edit Topik Pembelajaran' : 'Tambah Topik / Bab Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingCategory ? 'Perbarui informasi topik / bab pembelajaran' : 'Tambahkan topik baru ke dalam mata pelajaran terpilih'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  resetCategoryForm();
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              {/* Select Subject */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mata Pelajaran <span className="text-rose-500">*</span>
                </label>
                <select
                  value={catSubjectId}
                  onChange={(e) => setCatSubjectId(e.target.value)}
                  disabled={isTeacherRole}
                  className="w-full py-2.5 px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                  required
                >
                  {availableSubjects.length === 0 && <option value="">Belum ada mata pelajaran</option>}
                  {availableSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.code ? `(${s.code})` : ''}
                    </option>
                  ))}
                </select>
                {isTeacherRole && assignedSubject && (
                  <p className="text-[11px] text-indigo-600 font-medium mt-1">
                    * Dikunci khusus untuk mata pelajaran pengampuan Anda ({assignedSubject.name}).
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Judul Topik / Bab <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Berpikir Komputasional, Algoritma & Pemrograman"
                  value={catTitle}
                  onChange={(e) => setCatTitle(e.target.value)}
                  className="w-full py-2.5 px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Urutan Topik (1, 2, dst)
                </label>
                <input
                  type="number"
                  min={1}
                  placeholder={`Otomatis (${categories.filter((c) => (c.subjectId || 'informatika') === activeCatSubjId).reduce((max, c) => Math.max(max, c.order || 0), 0) + 1})`}
                  value={catOrder}
                  onChange={(e) => setCatOrder(e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                  className={`w-full py-2.5 px-3.5 bg-white border rounded-xl text-xs font-bold focus:outline-none focus:ring-2 ${
                    catOrderConflict
                      ? 'border-rose-500 focus:ring-rose-500/20 text-rose-900 bg-rose-50/30'
                      : 'border-slate-200 focus:ring-indigo-500/20 text-slate-800'
                  }`}
                />
                {catOrderConflict && (
                  <p className="text-[10px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>Urutan #{catOrder} sudah dipakai oleh topik "{catOrderConflict.title}"</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deskripsi Singkat Topik (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ringkasan atau silabus capaian pembelajaran dalam bab ini..."
                  value={catDescription}
                  onChange={(e) => setCatDescription(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <IconPicker
                  label="Pilih Ikon Visual Topik"
                  value={catIcon}
                  onChange={(iconKey) => setCatIcon(iconKey)}
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryModalOpen(false);
                    resetCategoryForm();
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-200 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Menyimpan...' : editingCategory ? 'Simpan Perubahan' : 'Tambah Topik Baru'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: TAMBAH / EDIT MATERI PEMBELAJARAN                                */}
      {/* ========================================================================= */}
      {isMaterialModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden transition-all my-8">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  {editingMaterial ? <Edit2 className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                    {editingMaterial ? 'Edit Materi Pembelajaran' : 'Tambah Materi Pembelajaran Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Atur konten bahan ajar, embed URL, kuis AI adaptif, dan fitur gamifikasi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMaterialModalOpen(false);
                  resetMaterialForm();
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-slate-200 px-6 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setMatModalTab('basic')}
                className={`py-3 px-4 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
                  matModalTab === 'basic'
                    ? 'border-indigo-600 text-indigo-700 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                1. Informasi Dasar &amp; Link
              </button>
              <button
                type="button"
                onClick={() => setMatModalTab('quiz')}
                className={`py-3 px-4 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
                  matModalTab === 'quiz'
                    ? 'border-indigo-600 text-indigo-700 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                2. Kuis AI &amp; Refleksi
              </button>
              <button
                type="button"
                onClick={() => setMatModalTab('gamification')}
                className={`py-3 px-4 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
                  matModalTab === 'gamification'
                    ? 'border-indigo-600 text-indigo-700 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                3. Gamifikasi &amp; Interaktif
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveMaterial} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* TAB 1: BASIC & LINK */}
              {matModalTab === 'basic' && (
                <div className="space-y-4">
                  {/* Select Subject First */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      1. Pilih Mata Pelajaran <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={matSubjectId}
                      onChange={(e) => handleMatSubjectChange(e.target.value)}
                      disabled={isTeacherRole}
                      className="w-full py-2.5 px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                      required
                    >
                      {availableSubjects.length === 0 && <option value="">Belum ada mata pelajaran</option>}
                      {availableSubjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.code ? `(${s.code})` : ''}
                        </option>
                      ))}
                    </select>
                    {isTeacherRole && assignedSubject && (
                      <p className="text-[11px] text-indigo-600 font-medium mt-1">
                        * Dikunci khusus untuk mata pelajaran pengampuan Anda ({assignedSubject.name}).
                      </p>
                    )}
                  </div>

                  {/* Select Category Filtered by Subject */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      2. Pilih Topik / Kategori Materi <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={matCategoryId}
                      onChange={(e) => setMatCategoryId(e.target.value)}
                      className="w-full py-2.5 px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      required
                    >
                      {categories.filter((c) => (c.subjectId || 'informatika') === matSubjectId).length === 0 && (
                        <option value="">Belum ada topik untuk mata pelajaran ini</option>
                      )}
                      {categories
                        .filter((c) => (c.subjectId || 'informatika') === matSubjectId)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      3. Judul Materi (Misal: Materi 1: Berpikir Komputasional) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Materi 1: Pengenalan 4 Pilar Komputasional"
                      value={matTitle}
                      onChange={(e) => setMatTitle(e.target.value)}
                      className="w-full py-2.5 px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      required
                    />
                  </div>

                  {/* Link URL */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        4. Link Drive, Canva, YouTube, atau Google Form <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={onOpenGuide}
                        className="text-[11px] text-indigo-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        Panduan Salin Link
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Tempel link Google Drive / Canva / YouTube / Google Form di sini"
                      value={matOriginalUrl}
                      onChange={(e) => setMatOriginalUrl(e.target.value)}
                      className="w-full py-2.5 px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-[11px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      required
                    />

                    {/* Auto Converter Status Badge */}
                    {matOriginalUrl && (
                      <div className={`mt-2.5 p-3 rounded-2xl text-xs border flex items-start gap-2.5 ${
                        parsedEmbed.isValid 
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          : 'bg-amber-50 text-amber-900 border-amber-200'
                      }`}>
                        <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                        <div>
                          <span className="font-black block">
                            Tipe Media:{' '}
                            {parsedEmbed.type === 'gform'
                              ? 'Tes Google Form (Sumatif)'
                              : parsedEmbed.type === 'youtube'
                              ? 'Video YouTube'
                              : parsedEmbed.type === 'canva'
                              ? 'Canva Presentation'
                              : parsedEmbed.type === 'video'
                              ? 'Video Google Drive'
                              : 'Google Drive / PDF'}
                          </span>
                          <span className="font-mono text-[10px] break-all block opacity-85 mt-0.5">
                            Embed Target: {parsedEmbed.embedUrl || 'Link Langsung'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Order & Published Toggle */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Urutan Tampil (1, 2, dst)
                      </label>
                      <input
                        type="number"
                        min={1}
                        placeholder={`Otomatis (${materials.filter((m) => m.categoryId === matCategoryId).reduce((max, m) => Math.max(max, m.order || 0), 0) + 1})`}
                        value={matOrder}
                        onChange={(e) => setMatOrder(e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                        className={`w-full py-2.5 px-3.5 bg-white border rounded-xl text-xs font-bold focus:outline-none focus:ring-2 ${
                          matOrderConflict
                            ? 'border-rose-500 focus:ring-rose-500/20 text-rose-900 bg-rose-50/30'
                            : 'border-slate-200 focus:ring-indigo-500/20 text-slate-800'
                        }`}
                      />
                      {matOrderConflict && (
                        <p className="text-[10px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>Urutan #{matOrder} sudah dipakai oleh "{matOrderConflict.title}"</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-end">
                      <label className="flex items-center gap-2.5 cursor-pointer py-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-xl w-full hover:bg-slate-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={matIsPublished}
                          onChange={(e) => setMatIsPublished(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        />
                        <span className="text-xs font-extrabold text-slate-800">Publikasikan Materi</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: AI QUIZ & REFLECTIONS */}
              {matModalTab === 'quiz' && (
                <div className="space-y-4">
                  {/* Target Grade for AI Quiz */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-indigo-600" />
                      <span>Target Tingkat Kelas &amp; Fase Pendidikan (Pengaturan Kuis AI)</span>
                    </label>
                    <select
                      value={matTargetGrade}
                      onChange={(e) => setMatTargetGrade(e.target.value)}
                      className="w-full py-2.5 px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="smp-7">SMP Kelas 7 (Fase D - Tingkat Dasar SMP)</option>
                      <option value="smp-8">SMP Kelas 8 (Fase D - Tingkat Menengah SMP)</option>
                      <option value="smp-9">SMP Kelas 9 (Fase D - Tingkat Lanjut SMP)</option>
                      <option value="sma-10">SMA / SMK Kelas 10 (Fase E - Tingkat Dasar SMA/SMK)</option>
                      <option value="sma-11">SMA / SMK Kelas 11 (Fase F - Tingkat Menengah SMA/SMK)</option>
                      <option value="sma-12">SMA / SMK Kelas 12 (Fase F - Tingkat Lanjut SMA/SMK)</option>
                      <option value="sd-4-6">SD Kelas 4 - 6 (Fase C - Sekolah Dasar)</option>
                      <option value="umum">Umum / Adaptif Sesuai Konten</option>
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">
                      AI Gemini akan menyesuaikan tingkat kesulitan soal, istilah kosakata, dan contoh analogi yang pas untuk jenjang ini.
                    </p>
                  </div>

                  {/* Reflection Questions */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Pertanyaan Refleksi Siswa (Pisahkan Per Baris)
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Contoh:&#10;1. Apa konsep yang paling kamu pahami dari materi ini?&#10;2. Berikan 1 contoh penerapan dalam kehidupan sehari-hari!&#10;3. Bagian mana yang masih membuatmu bingung?"
                      value={matReflectionQuestions}
                      onChange={(e) => setMatReflectionQuestions(e.target.value)}
                      className="w-full py-2.5 px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Setiap baris teks akan ditampilkan sebagai satu kotak pertanyaan refleksi bagi siswa setelah selesai membaca materi.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 3: GAMIFICATION & INTERACTIVE FEATURES */}
              {matModalTab === 'gamification' && (
                <div className="space-y-3">
                  <div className="p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl">
                    <p className="text-xs text-indigo-950 font-semibold leading-relaxed">
                      Atur fitur interaktif &amp; gamifikasi mana saja yang diaktifkan untuk materi ini untuk meningkatkan engagement belajar.
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    {/* Gamification Toggle */}
                    <label className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-300 transition-all shadow-2xs">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🏆</span>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">Sistem Gamifikasi &amp; Lencana 8 Dimensi</span>
                          <span className="text-[10px] text-slate-500 block">Siswa mendapatkan EXP, Level up, Badges, dan Daily Streak</span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={matEnableGamification}
                        onChange={(e) => setMatEnableGamification(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                    </label>

                    {/* Time Attack Toggle */}
                    <div className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-2.5 shadow-2xs">
                      <label className="flex items-center justify-between cursor-pointer">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">⚡</span>
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">Mode Tantangan Waktu (Time Attack)</span>
                            <span className="text-[10px] text-slate-500 block">Timer hitung mundur per soal kuis untuk melatih fokus</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={matEnableTimeAttack}
                          onChange={(e) => setMatEnableTimeAttack(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        />
                      </label>

                      {matEnableTimeAttack && (
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <span className="text-xs text-slate-600 font-bold">Durasi Waktu Per Soal:</span>
                          <select
                            value={matTimeAttackSeconds}
                            onChange={(e) => setMatTimeAttackSeconds(Number(e.target.value))}
                            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-slate-800 cursor-pointer"
                          >
                            <option value={15}>15 Detik (Sangat Cepat)</option>
                            <option value={30}>30 Detik (Standar Interaktif)</option>
                            <option value={45}>45 Detik (Sedang)</option>
                            <option value={60}>60 Detik (Santai)</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Lifelines Toggle */}
                    <label className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-300 transition-all shadow-2xs">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">💡</span>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">Bantuan Kuis (Lifelines 50:50 &amp; Petunjuk AI)</span>
                          <span className="text-[10px] text-slate-500 block">Opsi eliminasi 2 opsi salah dan petunjuk pintar dari materi</span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={matEnableLifelines}
                        onChange={(e) => setMatEnableLifelines(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                    </label>

                    {/* AI Tutor Toggle */}
                    <label className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-300 transition-all shadow-2xs">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🤖</span>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">AI Tutor Companion &amp; Suara</span>
                          <span className="text-[10px] text-slate-500 block">Tanya jawab analogi konsep dan narasi suara penjelasan materi</span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={matEnableAITutor}
                        onChange={(e) => setMatEnableAITutor(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-between gap-2.5 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  {matModalTab !== 'basic' && (
                    <button
                      type="button"
                      onClick={() => setMatModalTab(matModalTab === 'gamification' ? 'quiz' : 'basic')}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      &larr; Sebelumnya
                    </button>
                  )}
                  {matModalTab !== 'gamification' && (
                    <button
                      type="button"
                      onClick={() => setMatModalTab(matModalTab === 'basic' ? 'quiz' : 'gamification')}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Selanjutnya &rarr;
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMaterialModalOpen(false);
                      resetMaterialForm();
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-200 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'Menyimpan...' : editingMaterial ? 'Simpan Perubahan' : 'Tambah Materi Baru'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      </main>
    </div>
  );
};
