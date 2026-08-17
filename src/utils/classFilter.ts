import { Subject, Category, Material, TeacherAccount, StudentAccount } from '../types';

/**
 * Normalizes class strings so variations match seamlessly:
 * e.g. "Kelas 8.1", "8.1", "8-1", "8 1", "VIII.1", "VIII-1", "VIII 1", "8.1 " -> "8.1"
 * e.g. "Kelas 7A", "7A", "7-A", "VII A", "VII-A" -> "7A"
 * e.g. "9.2", "9-2", "IX.2", "Kelas 9.2" -> "9.2"
 */
export function normalizeClassName(raw: string | undefined | null): string {
  if (!raw) return '';
  let str = String(raw).trim().toUpperCase();
  
  // Remove prefixes like "KELAS", "ROMBEL", "TINGKAT", "CLASS", "KLAS"
  str = str.replace(/^(KELAS|ROMBEL|TINGKAT|CLASS|KLAS)\s*/i, '').trim();

  // Convert Roman numerals at start to numbers
  // XII -> 12, XI -> 11, X -> 10, IX -> 9, VIII -> 8, VII -> 7, VI -> 6, etc.
  str = str
    .replace(/^XII(\b|\.|\s|-|_)/i, '12$1')
    .replace(/^XI(\b|\.|\s|-|_)/i, '11$1')
    .replace(/^X(\b|\.|\s|-|_)/i, '10$1')
    .replace(/^IX(\b|\.|\s|-|_)/i, '9$1')
    .replace(/^VIII(\b|\.|\s|-|_)/i, '8$1')
    .replace(/^VII(\b|\.|\s|-|_)/i, '7$1')
    .replace(/^VI(\b|\.|\s|-|_)/i, '6$1')
    .replace(/^V(\b|\.|\s|-|_)/i, '5$1')
    .replace(/^IV(\b|\.|\s|-|_)/i, '4$1');

  // Standardize separators: replace dashes, underscores, spaces around dots/numbers
  // e.g. "8 - 1" -> "8.1", "8_1" -> "8.1", "8 1" -> "8.1"
  str = str.replace(/[\s\-_]+/g, '.');
  
  // If format is like "8.A" -> "8A", or "8.1" -> "8.1"
  str = str.replace(/^(\d+)\.([A-Z])$/, '$1$2');

  return str;
}

/**
 * Extracts assigned classes list from TeacherAccount safely
 * Handles Array of strings, comma-separated strings, or single string.
 */
export function getTeacherAssignedClasses(teacher: TeacherAccount | undefined | null): string[] {
  if (!teacher) return [];
  const assigned = teacher.assignedClasses;
  if (!assigned) return [];
  if (Array.isArray(assigned)) {
    return assigned
      .flatMap((item) =>
        typeof item === 'string' ? item.split(',').map((s) => s.trim()).filter(Boolean) : []
      )
      .filter(Boolean);
  }
  if (typeof assigned === 'string') {
    return (assigned as string)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Checks if two class strings match (exact, case-insensitive, or normalized)
 */
export function isClassMatch(classA: string | undefined | null, classB: string | undefined | null): boolean {
  if (!classA || !classB) return false;
  const aClean = String(classA).trim().toUpperCase();
  const bClean = String(classB).trim().toUpperCase();
  if (aClean === bClean) return true;
  if (aClean === 'ALL' || aClean === 'SEMUA' || aClean === '*' || bClean === 'ALL' || bClean === 'SEMUA' || bClean === '*') return true;
  
  const normA = normalizeClassName(classA);
  const normB = normalizeClassName(classB);
  if (normA && normB && normA === normB) return true;

  return false;
}

/**
 * Checks if a teacher teaches a given student's class.
 * - If teacher has assignedClasses defined with items:
 *   Returns true ONLY if any assigned class matches student's class.
 * - If teacher has NO assignedClasses defined or empty array:
 *   Returns true (unrestricted / general teacher).
 */
export function doesTeacherTeachClass(teacher: TeacherAccount | undefined | null, studentClass: string | undefined | null): boolean {
  if (!teacher) return true;
  if (!studentClass) return true;
  const assigned = getTeacherAssignedClasses(teacher);
  if (assigned.length === 0) {
    return true; // Unrestricted / general teacher
  }
  return assigned.some((cls) => isClassMatch(cls, studentClass));
}

/**
 * Finds all teachers assigned to or associated with a subject.
 */
export function getTeachersForSubject(subj: Subject, teachers: TeacherAccount[]): TeacherAccount[] {
  if (!subj || !teachers || teachers.length === 0) return [];
  const subjId = (subj.id || '').trim().toLowerCase();
  const subjName = (subj.name || '').trim().toLowerCase();
  const subjCode = (subj.code || '').trim().toLowerCase();

  return teachers.filter((t) => {
    if (!t) return false;
    const tSubjId = (t.subjectId || '').trim().toLowerCase();

    // Check direct subjectId match (ID, Code, or Name)
    if (tSubjId && (tSubjId === subjId || tSubjId === subjCode || tSubjId === subjName)) {
      return true;
    }

    // Check if subject was created by this teacher
    if (subj.createdBy) {
      const createdBy = subj.createdBy.trim().toLowerCase();
      if (
        (t.id && t.id.toLowerCase() === createdBy) ||
        (t.username && t.username.toLowerCase() === createdBy) ||
        (t.name && t.name.toLowerCase() === createdBy)
      ) {
        return true;
      }
    }

    return false;
  });
}

/**
 * Filters materials, categories, and subjects visible for a student's class.
 */
export function filterContentForStudent(
  student: StudentAccount | undefined | null,
  teachers: TeacherAccount[],
  subjects: Subject[],
  categories: Category[],
  materials: Material[]
) {
  if (!student || !student.kelas) {
    return {
      filteredSubjects: subjects,
      filteredCategories: categories,
      filteredMaterials: materials,
    };
  }

  const studentClass = student.kelas;

  // Build teacher lookup map by id, username, name, and nip
  const teacherMap = new Map<string, TeacherAccount>();
  teachers.forEach((t) => {
    if (t.id) teacherMap.set(t.id.toLowerCase().trim(), t);
    if (t.username) {
      const u = t.username.toLowerCase().trim();
      teacherMap.set(u, t);
      teacherMap.set(`@${u}`, t);
    }
    if (t.name) teacherMap.set(t.name.toLowerCase().trim(), t);
    if (t.nip) teacherMap.set(t.nip.toLowerCase().trim(), t);
  });

  // Helper to find teacher for a createdBy value
  const getTeacherForCreator = (creatorId?: string): TeacherAccount | undefined => {
    if (!creatorId) return undefined;
    const clean = creatorId.trim().toLowerCase();
    return teacherMap.get(clean);
  };

  // Helper to check if a creator is allowed for this student's class
  const isCreatorAllowedForStudent = (creatorId?: string): boolean => {
    if (!creatorId || creatorId === 'admin') return true;
    const teacher = getTeacherForCreator(creatorId);
    if (teacher) {
      return doesTeacherTeachClass(teacher, studentClass);
    }
    return true;
  };

  // 1. FILTER SUBJECTS:
  // A subject is visible to studentClass IF:
  // - If subject.createdBy belongs to a teacher, that teacher MUST teach studentClass
  // - If there are teachers assigned to this subject (via subjectId or createdBy):
  //     At least one assigned teacher MUST teach studentClass!
  //     (If all assigned teachers have class restrictions and NONE teach studentClass, HIDE this subject!)
  // - If no teachers are assigned to this subject:
  //     It is treated as an admin/general subject and shown.
  const filteredSubjects = subjects.filter((subj) => {
    // Check subject creator
    if (subj.createdBy && !isCreatorAllowedForStudent(subj.createdBy)) {
      return false;
    }

    // Check all teachers linked to this subject
    const subjTeachers = getTeachersForSubject(subj, teachers);

    if (subjTeachers.length > 0) {
      // Are there teachers with class restrictions?
      const teachersWithRestrictions = subjTeachers.filter((t) => {
        const classes = getTeacherAssignedClasses(t);
        return classes.length > 0;
      });

      // If all teachers of this subject have class restrictions:
      if (teachersWithRestrictions.length === subjTeachers.length) {
        // Does ANY teacher teach this student's class?
        const anyTeachesThisClass = teachersWithRestrictions.some((t) =>
          doesTeacherTeachClass(t, studentClass)
        );
        if (!anyTeachesThisClass) {
          // No teacher of this subject teaches studentClass -> HIDE SUBJECT
          return false;
        }
      }
    }

    return true;
  });

  const visibleSubjectIds = new Set(
    filteredSubjects.map((s) => s.id.toLowerCase().trim())
  );
  filteredSubjects.forEach((s) => {
    if (s.code) visibleSubjectIds.add(s.code.toLowerCase().trim());
    if (s.name) visibleSubjectIds.add(s.name.toLowerCase().trim());
  });

  // 2. FILTER CATEGORIES:
  // A category is visible IF:
  // - Its parent subject is in visibleSubjects
  // - If category.createdBy belongs to a teacher, that teacher MUST teach studentClass
  const filteredCategories = categories.filter((cat) => {
    // Check creator
    if (cat.createdBy && !isCreatorAllowedForStudent(cat.createdBy)) {
      return false;
    }

    // Check parent subject visibility
    const catSubjId = (cat.subjectId || 'informatika').toLowerCase().trim();
    if (!visibleSubjectIds.has(catSubjId)) {
      const parentSubj = subjects.find(
        (s) =>
          s.id.toLowerCase() === catSubjId ||
          (s.code && s.code.toLowerCase() === catSubjId) ||
          s.name.toLowerCase() === catSubjId
      );
      if (parentSubj && !filteredSubjects.some((s) => s.id === parentSubj.id)) {
        return false;
      }
    }

    return true;
  });

  const visibleCategoryIds = new Set(filteredCategories.map((c) => c.id));

  // 3. FILTER MATERIALS:
  // A material is visible IF:
  // - Its parent category is in visibleCategories
  // - If material.createdBy belongs to a teacher, that teacher MUST teach studentClass
  const filteredMaterials = materials.filter((mat) => {
    // Parent category check
    if (!visibleCategoryIds.has(mat.categoryId)) {
      return false;
    }

    // Creator check
    if (mat.createdBy && !isCreatorAllowedForStudent(mat.createdBy)) {
      return false;
    }

    return true;
  });

  return {
    filteredSubjects,
    filteredCategories,
    filteredMaterials,
  };
}

