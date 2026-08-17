import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { Subject, Category, Material, AdminSettings, TeacherAccount, StudentAccount } from '../types';
import { INITIAL_SUBJECTS, INITIAL_CATEGORIES, INITIAL_MATERIALS } from '../utils/initialData';

const SUBJECTS_COL = 'subjects';
const CATEGORIES_COL = 'categories';
const MATERIALS_COL = 'materials';
const SETTINGS_COL = 'settings';
const TEACHERS_COL = 'teachers';
const STUDENTS_COL = 'students';
const ADMIN_DOC_ID = 'admin_config';

export const DEFAULT_PIN = '12345';
export const DEFAULT_SETTINGS_PASSWORD = 'admin12345';

// Initialize default settings doc if needed
export async function seedInitialDataIfNeeded(): Promise<void> {
  try {
    // Settings doc
    const settingsRef = doc(db, SETTINGS_COL, ADMIN_DOC_ID);
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      await setDoc(settingsRef, {
        adminPin: DEFAULT_PIN,
        siteTitle: 'Sistem Pembelajaran Interaktif',
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('Error checking settings Firestore:', err);
  }
}

// Clear all data permanently from Firestore & localStorage
export async function clearAllFirestoreData(): Promise<void> {
  try {
    // Clear localStorage
    localStorage.removeItem('sistem_materi_subj_cache');
    localStorage.removeItem('sistem_materi_cat_cache');
    localStorage.removeItem('sistem_materi_mat_cache');
    localStorage.removeItem('sistem_materi_selected_subject_id');

    // Clear Subjects
    const subjSnap = await getDocs(collection(db, SUBJECTS_COL));
    if (!subjSnap.empty) {
      const batch = writeBatch(db);
      subjSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }

    // Clear Categories
    const catSnap = await getDocs(collection(db, CATEGORIES_COL));
    if (!catSnap.empty) {
      const batch = writeBatch(db);
      catSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }

    // Clear Materials
    const matSnap = await getDocs(collection(db, MATERIALS_COL));
    if (!matSnap.empty) {
      const batch = writeBatch(db);
      matSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (err) {
    console.warn('Error clearing Firestore data:', err);
  }
}

// Subject CRUD
export async function fetchSubjects(): Promise<Subject[]> {
  try {
    const q = query(collection(db, SUBJECTS_COL), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return [];
    }
    const res = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Subject));
    try {
      localStorage.setItem('sistem_materi_subj_cache', JSON.stringify(res));
    } catch {}
    return res;
  } catch (err) {
    console.warn('Firestore subjects unavailable, using local cache:', err);
    try {
      const saved = localStorage.getItem('sistem_materi_subj_cache');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  }
}

export async function createSubject(subj: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subject> {
  const newRef = doc(collection(db, SUBJECTS_COL));
  const newSubj: Subject = {
    ...subj,
    id: newRef.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await setDoc(newRef, newSubj);
  return newSubj;
}

export async function updateSubject(id: string, updates: Partial<Subject>): Promise<void> {
  const ref = doc(db, SUBJECTS_COL, id);
  await updateDoc(ref, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteSubject(id: string): Promise<void> {
  const ref = doc(db, SUBJECTS_COL, id);
  await deleteDoc(ref);

  // Also update or delete categories linked to this subject
  const catQ = query(collection(db, CATEGORIES_COL), where('subjectId', '==', id));
  const catSnap = await getDocs(catQ);
  const batch = writeBatch(db);
  catSnap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
  await batch.commit();
}

// Category CRUD
export async function fetchCategories(): Promise<Category[]> {
  try {
    const q = query(collection(db, CATEGORIES_COL), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    const res = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
    try {
      localStorage.setItem('sistem_materi_cat_cache', JSON.stringify(res));
    } catch {}
    return res;
  } catch (err) {
    console.warn('Firestore categories unavailable, using local cache:', err);
    try {
      const saved = localStorage.getItem('sistem_materi_cat_cache');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  }
}

export async function createCategory(cat: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
  const newRef = doc(collection(db, CATEGORIES_COL));
  const newCat: Category = {
    ...cat,
    id: newRef.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await setDoc(newRef, newCat);
  return newCat;
}

export async function updateCategory(id: string, updates: Partial<Category>): Promise<void> {
  const ref = doc(db, CATEGORIES_COL, id);
  await updateDoc(ref, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteCategory(id: string): Promise<void> {
  const ref = doc(db, CATEGORIES_COL, id);
  await deleteDoc(ref);

  // Also delete associated materials
  const matQ = query(collection(db, MATERIALS_COL), where('categoryId', '==', id));
  const matSnap = await getDocs(matQ);
  const batch = writeBatch(db);
  matSnap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
  await batch.commit();
}

// Material CRUD
export async function fetchMaterials(categoryId?: string): Promise<Material[]> {
  try {
    let q = query(collection(db, MATERIALS_COL), orderBy('order', 'asc'));
    if (categoryId) {
      q = query(collection(db, MATERIALS_COL), where('categoryId', '==', categoryId), orderBy('order', 'asc'));
    }
    const snapshot = await getDocs(q);
    const res = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Material));
    if (!categoryId) {
      try {
        localStorage.setItem('sistem_materi_mat_cache', JSON.stringify(res));
      } catch {}
    }
    return res;
  } catch (err) {
    console.warn('Firestore materials unavailable, using local cache:', err);
    try {
      const saved = localStorage.getItem('sistem_materi_mat_cache');
      if (saved) {
        const cached = JSON.parse(saved) as Material[];
        return categoryId ? cached.filter((m) => m.categoryId === categoryId) : cached;
      }
    } catch {}
    return [];
  }
}

export async function createMaterial(mat: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>): Promise<Material> {
  const newRef = doc(collection(db, MATERIALS_COL));
  const newMat: Material = {
    ...mat,
    id: newRef.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await setDoc(newRef, newMat);
  return newMat;
}

export async function updateMaterial(id: string, updates: Partial<Material>): Promise<void> {
  const ref = doc(db, MATERIALS_COL, id);
  await updateDoc(ref, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteMaterial(id: string): Promise<void> {
  const ref = doc(db, MATERIALS_COL, id);
  await deleteDoc(ref);
}

// Admin PIN Settings
export async function getAdminPin(): Promise<string> {
  try {
    const settingsRef = doc(db, SETTINGS_COL, ADMIN_DOC_ID);
    const snap = await getDoc(settingsRef);
    if (snap.exists() && snap.data().adminPin) {
      return snap.data().adminPin;
    }
  } catch (e) {
    console.warn('Could not read admin pin from Firestore:', e);
  }
  return DEFAULT_PIN;
}

export async function setAdminPin(newPin: string): Promise<void> {
  const settingsRef = doc(db, SETTINGS_COL, ADMIN_DOC_ID);
  await setDoc(
    settingsRef,
    {
      adminPin: newPin,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

// Settings Password
export async function getSettingsPassword(): Promise<string> {
  try {
    const settingsRef = doc(db, SETTINGS_COL, ADMIN_DOC_ID);
    const snap = await getDoc(settingsRef);
    if (snap.exists() && snap.data().settingsPassword) {
      return snap.data().settingsPassword;
    }
  } catch (e) {
    console.warn('Could not read settings password from Firestore:', e);
  }
  try {
    return localStorage.getItem('sistem_materi_settings_password') || DEFAULT_SETTINGS_PASSWORD;
  } catch {
    return DEFAULT_SETTINGS_PASSWORD;
  }
}

export async function setSettingsPassword(newPassword: string): Promise<void> {
  const settingsRef = doc(db, SETTINGS_COL, ADMIN_DOC_ID);
  await setDoc(
    settingsRef,
    {
      settingsPassword: newPassword,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
  try {
    localStorage.setItem('sistem_materi_settings_password', newPassword);
  } catch {}
}

// Site Logo Settings
export async function getSiteLogoUrl(): Promise<string> {
  try {
    const settingsRef = doc(db, SETTINGS_COL, ADMIN_DOC_ID);
    const snap = await getDoc(settingsRef);
    if (snap.exists() && snap.data().logoUrl !== undefined) {
      return snap.data().logoUrl;
    }
  } catch (e) {
    console.warn('Could not read site logo from Firestore:', e);
  }
  try {
    return localStorage.getItem('sistem_materi_logo_url') || '';
  } catch {
    return '';
  }
}

export async function setSiteLogoUrl(logoUrl: string): Promise<void> {
  const settingsRef = doc(db, SETTINGS_COL, ADMIN_DOC_ID);
  await setDoc(
    settingsRef,
    {
      logoUrl: logoUrl,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
  try {
    localStorage.setItem('sistem_materi_logo_url', logoUrl);
  } catch {}
}

// Teacher Account CRUD Operations
export async function fetchTeachers(): Promise<TeacherAccount[]> {
  try {
    const q = query(collection(db, TEACHERS_COL), orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    const res = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as TeacherAccount));
    try {
      localStorage.setItem('sistem_materi_teachers_cache', JSON.stringify(res));
    } catch {}
    return res;
  } catch (err) {
    console.warn('Firestore teachers unavailable, using local cache:', err);
    try {
      const saved = localStorage.getItem('sistem_materi_teachers_cache');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  }
}

export async function createTeacher(
  teacherData: Omit<TeacherAccount, 'id' | 'createdAt' | 'updatedAt'>
): Promise<TeacherAccount> {
  const newRef = doc(collection(db, TEACHERS_COL));
  const newTeacher: TeacherAccount = {
    ...teacherData,
    id: newRef.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await setDoc(newRef, newTeacher);
  
  // Update local cache
  try {
    const current = await fetchTeachers();
    const updated = [...current.filter(t => t.id !== newTeacher.id), newTeacher];
    localStorage.setItem('sistem_materi_teachers_cache', JSON.stringify(updated));
  } catch {}

  return newTeacher;
}

export async function updateTeacher(id: string, updates: Partial<TeacherAccount>): Promise<void> {
  const ref = doc(db, TEACHERS_COL, id);
  await updateDoc(ref, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  // Update local cache
  try {
    const current = await fetchTeachers();
    const updated = current.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t);
    localStorage.setItem('sistem_materi_teachers_cache', JSON.stringify(updated));
  } catch {}
}

export async function deleteTeacher(id: string): Promise<void> {
  const ref = doc(db, TEACHERS_COL, id);
  await deleteDoc(ref);

  // Update local cache
  try {
    const current = await fetchTeachers();
    const updated = current.filter(t => t.id !== id);
    localStorage.setItem('sistem_materi_teachers_cache', JSON.stringify(updated));
  } catch {}
}

export async function bulkCreateTeachers(
  teachersData: Omit<TeacherAccount, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<TeacherAccount[]> {
  const createdTeachers: TeacherAccount[] = [];
  const batchSize = 400;
  for (let i = 0; i < teachersData.length; i += batchSize) {
    const chunk = teachersData.slice(i, i + batchSize);
    const batch = writeBatch(db);
    for (const tData of chunk) {
      const newRef = doc(collection(db, TEACHERS_COL));
      const newTeacher: TeacherAccount = {
        ...tData,
        id: newRef.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      batch.set(newRef, newTeacher);
      createdTeachers.push(newTeacher);
    }
    await batch.commit();
  }

  // Update local cache
  try {
    const current = await fetchTeachers();
    const updated = [...current, ...createdTeachers];
    localStorage.setItem('sistem_materi_teachers_cache', JSON.stringify(updated));
  } catch {}

  return createdTeachers;
}

export async function authenticateTeacher(username: string, pass: string): Promise<TeacherAccount | null> {
  const cleanUser = username.trim().toLowerCase();
  const cleanPass = pass.trim();
  if (!cleanUser || !cleanPass) return null;

  try {
    const teachers = await fetchTeachers();
    const found = teachers.find(
      (t) => t.username.trim().toLowerCase() === cleanUser && t.password.trim() === cleanPass
    );
    return found || null;
  } catch (err) {
    console.error('Error authenticating teacher:', err);
    return null;
  }
}

// Student Account CRUD Operations
const DEMO_NISNS = [
  '0012345678',
  '0098765432',
  '0081234001',
  '0081234002',
  '0081234003',
  '0082234001',
  '0082234002',
  '0081123401',
];

const DEMO_NAMES = [
  'Andi Pratama',
  'Budi Santoso',
  'Citra Dewi',
  'Dian Permata',
  'Eka Kurniawan',
  'Fajar Nugraha',
  'Siti Rahmawati',
];

export async function purgeDemoAccountsAndData(): Promise<void> {
  try {
    // 1. Fetch current students from Firestore
    const snap = await getDocs(collection(db, STUDENTS_COL));
    if (!snap.empty) {
      const demoDocs = snap.docs.filter((d) => {
        const data = d.data();
        const id = d.id;
        const nisn = (data.nisn || '').trim();
        const nama = (data.nama || '').trim();
        return (
          id.startsWith('std_demo_') ||
          DEMO_NISNS.includes(nisn) ||
          DEMO_NAMES.includes(nama)
        );
      });

      if (demoDocs.length > 0) {
        const batch = writeBatch(db);
        demoDocs.forEach((d) => {
          batch.delete(d.ref);
        });
        await batch.commit();
      }
    }

    // 2. Clear demo progress records if any
    const progSnap = await getDocs(collection(db, STUDENT_PROGRESS_COL));
    if (!progSnap.empty) {
      const demoProgDocs = progSnap.docs.filter((d) => {
        const id = d.id;
        const data = d.data();
        const sName = (data.studentName || '').trim();
        return (
          id.startsWith('std_demo_') ||
          DEMO_NAMES.includes(sName) ||
          DEMO_NISNS.includes(id)
        );
      });
      if (demoProgDocs.length > 0) {
        const batch = writeBatch(db);
        demoProgDocs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    }

    // 3. Clean localStorage cache
    try {
      const saved = localStorage.getItem('sistem_materi_students_cache');
      if (saved) {
        const list: StudentAccount[] = JSON.parse(saved);
        const filtered = list.filter(
          (s) =>
            !s.id.startsWith('std_demo_') &&
            !DEMO_NISNS.includes(s.nisn?.trim()) &&
            !DEMO_NAMES.includes(s.nama?.trim())
        );
        localStorage.setItem('sistem_materi_students_cache', JSON.stringify(filtered));
      }
    } catch {}

    // Clean specific demo progress localStorage keys
    DEMO_NISNS.forEach((nisn) => {
      localStorage.removeItem(`sistem_materi_prog_${nisn}`);
    });
    ['std_demo_1', 'std_demo_2'].forEach((id) => {
      localStorage.removeItem(`sistem_materi_prog_${id}`);
    });
  } catch (err) {
    console.warn('Error purging demo accounts:', err);
  }
}

export async function fetchStudents(): Promise<StudentAccount[]> {
  try {
    const q = query(collection(db, STUDENTS_COL), orderBy('nama', 'asc'));
    const snapshot = await getDocs(q);
    const res = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as StudentAccount));
    try {
      localStorage.setItem('sistem_materi_students_cache', JSON.stringify(res));
    } catch {}
    return res;
  } catch (err) {
    console.warn('Firestore students unavailable, using local cache:', err);
    try {
      const saved = localStorage.getItem('sistem_materi_students_cache');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  }
}

export async function createStudent(
  studentData: Omit<StudentAccount, 'id' | 'createdAt' | 'updatedAt'>
): Promise<StudentAccount> {
  const newRef = doc(collection(db, STUDENTS_COL));
  const newStudent: StudentAccount = {
    ...studentData,
    id: newRef.id,
    password: studentData.password || 'pass123',
    username: studentData.username || studentData.nisn,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await setDoc(newRef, newStudent);

  // Update local cache
  try {
    const current = await fetchStudents();
    const updated = [...current.filter((s) => s.id !== newStudent.id), newStudent];
    localStorage.setItem('sistem_materi_students_cache', JSON.stringify(updated));
  } catch {}

  return newStudent;
}

export async function updateStudent(id: string, updates: Partial<StudentAccount>): Promise<void> {
  const ref = doc(db, STUDENTS_COL, id);
  await updateDoc(ref, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  // Update local cache
  try {
    const current = await fetchStudents();
    const updated = current.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s));
    localStorage.setItem('sistem_materi_students_cache', JSON.stringify(updated));
  } catch {}
}

export async function deleteStudent(id: string): Promise<void> {
  const ref = doc(db, STUDENTS_COL, id);
  await deleteDoc(ref);

  // Update local cache
  try {
    const current = await fetchStudents();
    const updated = current.filter((s) => s.id !== id);
    localStorage.setItem('sistem_materi_students_cache', JSON.stringify(updated));
  } catch {}
}

export async function bulkCreateStudents(
  studentsData: Omit<StudentAccount, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<StudentAccount[]> {
  const createdStudents: StudentAccount[] = [];
  const batchSize = 400;
  for (let i = 0; i < studentsData.length; i += batchSize) {
    const chunk = studentsData.slice(i, i + batchSize);
    const batch = writeBatch(db);
    for (const stdData of chunk) {
      const newRef = doc(collection(db, STUDENTS_COL));
      const newStudent: StudentAccount = {
        ...stdData,
        id: newRef.id,
        password: stdData.password || 'pass123',
        username: stdData.username || stdData.nisn,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      batch.set(newRef, newStudent);
      createdStudents.push(newStudent);
    }
    await batch.commit();
  }

  // Update local cache
  try {
    const current = await fetchStudents();
    const updated = [...current, ...createdStudents];
    localStorage.setItem('sistem_materi_students_cache', JSON.stringify(updated));
  } catch {}

  // Sync any newly introduced classes into master classes
  try {
    const newClasses = Array.from(
      new Set(studentsData.map((s) => (s.kelas || '').trim()).filter(Boolean))
    );
    if (newClasses.length > 0) {
      const currentMaster = await fetchMasterClasses();
      const merged = Array.from(new Set([...currentMaster, ...newClasses])).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
      );
      if (merged.length > currentMaster.length) {
        await saveMasterClasses(merged);
      }
    }
  } catch (err) {
    console.warn('Error syncing master classes on bulkCreateStudents:', err);
  }

  return createdStudents;
}

export async function authenticateStudent(nisnOrUser: string, pass: string): Promise<StudentAccount | null> {
  const cleanInput = nisnOrUser.trim().toLowerCase();
  const cleanPass = pass.trim();
  if (!cleanInput || !cleanPass) return null;

  try {
    const students = await fetchStudents();
    const found = students.find(
      (s) =>
        (s.nisn.trim().toLowerCase() === cleanInput || s.username.trim().toLowerCase() === cleanInput) &&
        s.password.trim() === cleanPass
    );
    return found || null;
  } catch (err) {
    console.error('Error authenticating student:', err);
    return null;
  }
}

// Student Progress Persistence
const STUDENT_PROGRESS_COL = 'student_progress';

export async function saveStudentProgress(
  studentId: string,
  completedMaterialIds: string[],
  studentName?: string,
  kelas?: string
): Promise<void> {
  if (!studentId) return;
  try {
    const ref = doc(db, STUDENT_PROGRESS_COL, studentId);
    const payload = {
      studentId,
      completedMaterialIds,
      ...(studentName ? { studentName } : {}),
      ...(kelas ? { kelas } : {}),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(ref, payload, { merge: true });
    try {
      localStorage.setItem(`sistem_materi_prog_${studentId}`, JSON.stringify(completedMaterialIds));
    } catch {}
  } catch (err) {
    console.warn('Error saving student progress to Firestore:', err);
  }
}

export async function fetchStudentProgress(studentId: string): Promise<string[]> {
  if (!studentId) return [];
  try {
    const ref = doc(db, STUDENT_PROGRESS_COL, studentId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      return data.completedMaterialIds || [];
    }
  } catch (err) {
    console.warn('Error fetching student progress from Firestore:', err);
  }
  try {
    const local = localStorage.getItem(`sistem_materi_prog_${studentId}`);
    return local ? JSON.parse(local) : [];
  } catch {
    return [];
  }
}

export async function fetchAllStudentProgress(): Promise<Record<string, { studentId: string; studentName?: string; kelas?: string; completedMaterialIds: string[]; updatedAt: string }>> {
  try {
    const snap = await getDocs(collection(db, STUDENT_PROGRESS_COL));
    const result: Record<string, any> = {};
    snap.docs.forEach((d) => {
      const data = d.data();
      result[d.id] = {
        studentId: d.id,
        studentName: data.studentName || '',
        kelas: data.kelas || '',
        completedMaterialIds: data.completedMaterialIds || [],
        updatedAt: data.updatedAt || '',
      };
    });
    return result;
  } catch (err) {
    console.warn('Error fetching all student progress:', err);
    return {};
  }
}

export async function resetStudentMaterialProgress(
  studentId: string,
  materialId: string,
  studentName?: string,
  kelas?: string
): Promise<string[]> {
  if (!studentId || !materialId) return [];
  try {
    const currentProg = await fetchStudentProgress(studentId);
    const updated = currentProg.filter((id) => id !== materialId);
    const ref = doc(db, STUDENT_PROGRESS_COL, studentId);
    const payload = {
      studentId,
      completedMaterialIds: updated,
      ...(studentName ? { studentName } : {}),
      ...(kelas ? { kelas } : {}),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(ref, payload, { merge: true });
    try {
      localStorage.setItem(`sistem_materi_prog_${studentId}`, JSON.stringify(updated));
    } catch {}
    return updated;
  } catch (err) {
    console.error('Error resetting student material progress:', err);
    throw err;
  }
}

export async function resetAllStudentProgress(
  studentId: string,
  studentName?: string,
  kelas?: string
): Promise<void> {
  if (!studentId) return;
  try {
    const ref = doc(db, STUDENT_PROGRESS_COL, studentId);
    const payload = {
      studentId,
      completedMaterialIds: [],
      ...(studentName ? { studentName } : {}),
      ...(kelas ? { kelas } : {}),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(ref, payload, { merge: true });
    try {
      localStorage.setItem(`sistem_materi_prog_${studentId}`, JSON.stringify([]));
    } catch {}
  } catch (err) {
    console.error('Error resetting all student progress:', err);
    throw err;
  }
}

// Master Classes & Grades Configuration
const MASTER_CONFIG_DOC = 'master_academic_config';

export interface GradeConfig {
  id: string;
  label: string;
  subLabel: string;
}

export const DEFAULT_GRADES: GradeConfig[] = [
  { id: '7', label: 'Kelas 7', subLabel: 'Jenjang SMP' },
  { id: '8', label: 'Kelas 8', subLabel: 'Jenjang SMP' },
  { id: '9', label: 'Kelas 9', subLabel: 'Jenjang SMP' },
  { id: '10', label: 'Kelas 10', subLabel: 'SMA / SMK' },
  { id: '11', label: 'Kelas 11', subLabel: 'SMA / SMK' },
  { id: '12', label: 'Kelas 12', subLabel: 'SMA / SMK' },
];

export const DEFAULT_PRESET_CLASSES = [
  '7.1', '7.2', '7.3', '7.4',
  '8.1', '8.2', '8.3', '8.4',
  '9.1', '9.2', '9.3', '9.4',
  '10A', '10B', '11A', '11B', '12A', '12B',
];

export async function fetchMasterGrades(): Promise<GradeConfig[]> {
  try {
    const ref = doc(db, SETTINGS_COL, MASTER_CONFIG_DOC);
    const snap = await getDoc(ref);
    if (snap.exists() && snap.data().grades && Array.isArray(snap.data().grades)) {
      return snap.data().grades;
    }
  } catch (err) {
    console.warn('Could not fetch master grades from Firestore:', err);
  }
  try {
    const cached = localStorage.getItem('sistem_materi_master_grades');
    if (cached) return JSON.parse(cached);
  } catch {}
  return DEFAULT_GRADES;
}

export async function saveMasterGrades(grades: GradeConfig[]): Promise<void> {
  try {
    const ref = doc(db, SETTINGS_COL, MASTER_CONFIG_DOC);
    await setDoc(ref, { grades, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn('Could not save master grades to Firestore:', err);
  }
  try {
    localStorage.setItem('sistem_materi_master_grades', JSON.stringify(grades));
  } catch {}
}

export async function fetchMasterClasses(): Promise<string[]> {
  try {
    const ref = doc(db, SETTINGS_COL, MASTER_CONFIG_DOC);
    const snap = await getDoc(ref);
    if (snap.exists() && snap.data().customClasses && Array.isArray(snap.data().customClasses)) {
      return snap.data().customClasses;
    }
  } catch (err) {
    console.warn('Could not fetch master classes from Firestore:', err);
  }
  try {
    const cached = localStorage.getItem('sistem_materi_master_classes');
    if (cached) return JSON.parse(cached);
  } catch {}
  return DEFAULT_PRESET_CLASSES;
}

export async function saveMasterClasses(customClasses: string[]): Promise<void> {
  try {
    const ref = doc(db, SETTINGS_COL, MASTER_CONFIG_DOC);
    await setDoc(ref, { customClasses, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn('Could not save master classes to Firestore:', err);
  }
  try {
    localStorage.setItem('sistem_materi_master_classes', JSON.stringify(customClasses));
  } catch {}
}

/**
 * Renames a class in all student documents and teacher assignments that belong to that class.
 */
export async function renameClassInStudents(oldClass: string, newClass: string): Promise<number> {
  const cleanOld = oldClass.trim();
  const cleanNew = newClass.trim();
  if (!cleanOld || !cleanNew || cleanOld === cleanNew) return 0;

  const students = await fetchStudents();
  const targets = students.filter((s) => (s.kelas || '').trim().toLowerCase() === cleanOld.toLowerCase());
  
  if (targets.length > 0) {
    const batch = writeBatch(db);
    targets.forEach((s) => {
      const ref = doc(db, STUDENTS_COL, s.id);
      batch.update(ref, { kelas: cleanNew, updatedAt: new Date().toISOString() });
    });
    await batch.commit();

    // Update local cache
    try {
      const updated = students.map((s) =>
        (s.kelas || '').trim().toLowerCase() === cleanOld.toLowerCase() ? { ...s, kelas: cleanNew } : s
      );
      localStorage.setItem('sistem_materi_students_cache', JSON.stringify(updated));
    } catch {}
  }

  // Also sync teachers' assigned classes
  try {
    const teachers = await fetchTeachers();
    const teachersToUpdate = teachers.filter((t) =>
      (t.assignedClasses || []).some((c) => c.trim().toLowerCase() === cleanOld.toLowerCase())
    );
    if (teachersToUpdate.length > 0) {
      const batch = writeBatch(db);
      teachersToUpdate.forEach((t) => {
        const updatedClasses = (t.assignedClasses || []).map((c) =>
          c.trim().toLowerCase() === cleanOld.toLowerCase() ? cleanNew : c
        );
        const ref = doc(db, TEACHERS_COL, t.id);
        batch.update(ref, { assignedClasses: updatedClasses, updatedAt: new Date().toISOString() });
      });
      await batch.commit();

      const updatedAllTeachers = teachers.map((t) => ({
        ...t,
        assignedClasses: (t.assignedClasses || []).map((c) =>
          c.trim().toLowerCase() === cleanOld.toLowerCase() ? cleanNew : c
        ),
      }));
      localStorage.setItem('sistem_materi_teachers_cache', JSON.stringify(updatedAllTeachers));
    }
  } catch (err) {
    console.warn('Error syncing teachers on rename class:', err);
  }

  // Also update master classes list if present
  const masterClasses = await fetchMasterClasses();
  const updatedMaster = masterClasses.map((c) => (c.trim().toLowerCase() === cleanOld.toLowerCase() ? cleanNew : c));
  if (!updatedMaster.includes(cleanNew)) {
    updatedMaster.push(cleanNew);
  }
  await saveMasterClasses(updatedMaster);

  return targets.length;
}

/**
 * Deletes a class, with option to delete students inside or move them to another class, and syncs teachers.
 */
export async function deleteClassAndStudents(
  className: string,
  alsoDeleteStudents: boolean = false,
  moveToClass?: string
): Promise<{ affectedStudents: number }> {
  const cleanName = className.trim();
  const students = await fetchStudents();
  const targets = students.filter((s) => (s.kelas || '').trim().toLowerCase() === cleanName.toLowerCase());

  if (targets.length > 0) {
    const batch = writeBatch(db);
    if (alsoDeleteStudents) {
      targets.forEach((s) => {
        const ref = doc(db, STUDENTS_COL, s.id);
        batch.delete(ref);
      });
    } else if (moveToClass) {
      targets.forEach((s) => {
        const ref = doc(db, STUDENTS_COL, s.id);
        batch.update(ref, { kelas: moveToClass.trim(), updatedAt: new Date().toISOString() });
      });
    }
    await batch.commit();

    // Update local cache
    try {
      let updated: StudentAccount[];
      if (alsoDeleteStudents) {
        updated = students.filter((s) => (s.kelas || '').trim().toLowerCase() !== cleanName.toLowerCase());
      } else if (moveToClass) {
        updated = students.map((s) =>
          (s.kelas || '').trim().toLowerCase() === cleanName.toLowerCase() ? { ...s, kelas: moveToClass.trim() } : s
        );
      } else {
        updated = students;
      }
      localStorage.setItem('sistem_materi_students_cache', JSON.stringify(updated));
    } catch {}
  }

  // Sync teachers' assigned classes: remove the deleted class or change it to moveToClass
  try {
    const teachers = await fetchTeachers();
    const teachersToUpdate = teachers.filter((t) =>
      (t.assignedClasses || []).some((c) => c.trim().toLowerCase() === cleanName.toLowerCase())
    );
    if (teachersToUpdate.length > 0) {
      const batch = writeBatch(db);
      teachersToUpdate.forEach((t) => {
        let updatedClasses: string[];
        if (moveToClass) {
          updatedClasses = (t.assignedClasses || []).map((c) =>
            c.trim().toLowerCase() === cleanName.toLowerCase() ? moveToClass.trim() : c
          );
        } else {
          updatedClasses = (t.assignedClasses || []).filter(
            (c) => c.trim().toLowerCase() !== cleanName.toLowerCase()
          );
        }
        const ref = doc(db, TEACHERS_COL, t.id);
        batch.update(ref, { assignedClasses: updatedClasses, updatedAt: new Date().toISOString() });
      });
      await batch.commit();

      const updatedAllTeachers = teachers.map((t) => {
        let updatedClasses: string[];
        if (moveToClass) {
          updatedClasses = (t.assignedClasses || []).map((c) =>
            c.trim().toLowerCase() === cleanName.toLowerCase() ? moveToClass.trim() : c
          );
        } else {
          updatedClasses = (t.assignedClasses || []).filter(
            (c) => c.trim().toLowerCase() !== cleanName.toLowerCase()
          );
        }
        return { ...t, assignedClasses: updatedClasses };
      });
      localStorage.setItem('sistem_materi_teachers_cache', JSON.stringify(updatedAllTeachers));
    }
  } catch (err) {
    console.warn('Error syncing teachers on delete class:', err);
  }

  // Remove from master classes list
  const masterClasses = await fetchMasterClasses();
  const updatedMaster = masterClasses.filter((c) => c.trim().toLowerCase() !== cleanName.toLowerCase());
  await saveMasterClasses(updatedMaster);

  return { affectedStudents: targets.length };
}

/**
 * Deletes a grade level (e.g. Grade 12), with option to delete or reassign students, and syncs teachers.
 */
export async function deleteGradeLevel(
  gradeId: string,
  alsoDeleteStudents: boolean = false
): Promise<{ affectedStudents: number }> {
  const cleanGrade = gradeId.trim().toUpperCase();
  const students = await fetchStudents();
  
  const isMatchGrade = (cls: string) => {
    const clean = (cls || '').trim().toUpperCase();
    if (cleanGrade === '7') return /^(KELAS\s*)?(7|VII)(\.|\s|[A-Z]|$)/i.test(clean);
    if (cleanGrade === '8') return /^(KELAS\s*)?(8|VIII)(\.|\s|[A-Z]|$)/i.test(clean);
    if (cleanGrade === '9') return /^(KELAS\s*)?(9|IX)(\.|\s|[A-Z]|$)/i.test(clean);
    if (cleanGrade === '10') return /^(KELAS\s*)?(10|X)(\.|\s|[A-Z]|$)/i.test(clean);
    if (cleanGrade === '11') return /^(KELAS\s*)?(11|XI)(\.|\s|[A-Z]|$)/i.test(clean);
    if (cleanGrade === '12') return /^(KELAS\s*)?(12|XII)(\.|\s|[A-Z]|$)/i.test(clean);
    return clean === cleanGrade;
  };

  const targets = students.filter((s) => isMatchGrade(s.kelas || ''));

  if (targets.length > 0 && alsoDeleteStudents) {
    const batch = writeBatch(db);
    targets.forEach((s) => {
      const ref = doc(db, STUDENTS_COL, s.id);
      batch.delete(ref);
    });
    await batch.commit();

    try {
      const updated = students.filter((s) => !isMatchGrade(s.kelas || ''));
      localStorage.setItem('sistem_materi_students_cache', JSON.stringify(updated));
    } catch {}
  }

  // Remove matching classes from teachers assigned classes
  try {
    const teachers = await fetchTeachers();
    const teachersToUpdate = teachers.filter((t) =>
      (t.assignedClasses || []).some((c) => isMatchGrade(c))
    );
    if (teachersToUpdate.length > 0) {
      const batch = writeBatch(db);
      teachersToUpdate.forEach((t) => {
        const updatedClasses = (t.assignedClasses || []).filter((c) => !isMatchGrade(c));
        const ref = doc(db, TEACHERS_COL, t.id);
        batch.update(ref, { assignedClasses: updatedClasses, updatedAt: new Date().toISOString() });
      });
      await batch.commit();

      const updatedAllTeachers = teachers.map((t) => ({
        ...t,
        assignedClasses: (t.assignedClasses || []).filter((c) => !isMatchGrade(c)),
      }));
      localStorage.setItem('sistem_materi_teachers_cache', JSON.stringify(updatedAllTeachers));
    }
  } catch (err) {
    console.warn('Error syncing teachers on delete grade:', err);
  }

  // Remove from master grades list
  const currentGrades = await fetchMasterGrades();
  const updatedGrades = currentGrades.filter((g) => g.id.toUpperCase() !== cleanGrade);
  await saveMasterGrades(updatedGrades);

  // Remove matching master classes
  const masterClasses = await fetchMasterClasses();
  const updatedMasterClasses = masterClasses.filter((c) => !isMatchGrade(c));
  await saveMasterClasses(updatedMasterClasses);

  return { affectedStudents: targets.length };
}



