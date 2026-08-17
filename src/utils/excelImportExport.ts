import * as XLSX from 'xlsx';
import { StudentAccount, TeacherAccount, Subject } from '../types';

export interface ParsedStudentRow {
  nama: string;
  kelas: string;
  noAbsen: string;
  nisn: string;
  username: string;
  password: string;
  isValid: boolean;
  errorMessage?: string;
}

export interface ParsedTeacherRow {
  name: string;
  nip: string;
  username: string;
  password: string;
  subjectId: string;
  subjectName: string;
  assignedClasses: string[];
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Generates and downloads a clean, beautifully formatted Excel template for Student Import.
 */
export function downloadStudentTemplate(): void {
  const sampleData = [
    {
      'Nama Lengkap': 'Andi Pratama',
      'Kelas': '8.1',
      'No. Absen': '1',
      'NISN': '0081234001',
      'Password (Opsional)': 'pass123',
    },
    {
      'Nama Lengkap': 'Budi Santoso',
      'Kelas': '8.1',
      'No. Absen': '2',
      'NISN': '0081234002',
      'Password (Opsional)': 'pass123',
    },
    {
      'Nama Lengkap': 'Dian Permata',
      'Kelas': '8.2',
      'No. Absen': '1',
      'NISN': '0082234001',
      'Password (Opsional)': 'pass123',
    },
    {
      'Nama Lengkap': 'Fajar Nugraha',
      'Kelas': '8.11',
      'No. Absen': '1',
      'NISN': '0081123401',
      'Password (Opsional)': 'pass123',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);

  // Set column widths for neat display
  worksheet['!cols'] = [
    { wch: 28 }, // Nama Lengkap
    { wch: 12 }, // Kelas
    { wch: 14 }, // No. Absen
    { wch: 20 }, // NISN
    { wch: 22 }, // Password
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Siswa');

  // Add an instruction sheet for clarity
  const instructionData = [
    { 'PANDUAN PENGISIAN TEMPLATE IMPORT SISWA': 'Petunjuk Tambahan:' },
    { 'PANDUAN PENGISIAN TEMPLATE IMPORT SISWA': '1. Kolom Nama Lengkap, Kelas, dan NISN WAJIB diisi.' },
    { 'PANDUAN PENGISIAN TEMPLATE IMPORT SISWA': '2. NISN digunakan siswa sebagai username untuk masuk ke portal.' },
    { 'PANDUAN PENGISIAN TEMPLATE IMPORT SISWA': '3. Jika Password dikosongkan, sistem otomatis memberikan password default "pass123".' },
    { 'PANDUAN PENGISIAN TEMPLATE IMPORT SISWA': '4. Jangan mengubah nama header di baris pertama lembar "Data Siswa".' },
  ];
  const instructionSheet = XLSX.utils.json_to_sheet(instructionData);
  instructionSheet['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(workbook, instructionSheet, 'Petunjuk Pengisian');

  XLSX.writeFile(workbook, 'Template_Import_Akun_Siswa.xlsx');
}

/**
 * Generates and downloads a clean, beautifully formatted Excel template for Teacher Import.
 */
export function downloadTeacherTemplate(subjects: Subject[]): void {
  const subjectListStr = subjects.length > 0
    ? subjects.map(s => `${s.name} (${s.code || 'Tanpa Kode'})`).join(', ')
    : 'Belum ada mata pelajaran. Buat mata pelajaran terlebih dahulu di admin.';

  const sampleData = [
    {
      'Nama Lengkap Guru': 'Drs. Bambang Wijaya, M.Pd.',
      'NIP / NIK (Opsional)': '198001012005011001',
      'Username Login': 'bambang_ipa',
      'Password Login': 'gurupass123',
      'Mata Pelajaran Pengampuan': subjects[0] ? subjects[0].name : 'IPA',
      'Kelas Mengajar (Contoh: 7.1, 7.2)': '7.1, 7.2',
    },
    {
      'Nama Lengkap Guru': 'Siti Aminah, S.Pd.',
      'NIP / NIK (Opsional)': '198502022010012002',
      'Username Login': 'siti_mtk',
      'Password Login': 'gurupass123',
      'Mata Pelajaran Pengampuan': subjects[1] ? subjects[1].name : (subjects[0] ? subjects[0].name : 'Matematika'),
      'Kelas Mengajar (Contoh: 7.1, 7.2)': '8.1, 8.2',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 32 }, // Nama Lengkap
    { wch: 24 }, // NIP/NIK
    { wch: 20 }, // Username
    { wch: 20 }, // Password
    { wch: 35 }, // Mata Pelajaran
    { wch: 32 }, // Kelas Mengajar
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Guru');

  // Add Instructions & Subject Reference sheet
  const refData = [
    { 'PETUNJUK IMPORT GURU': '1. Kolom Nama Lengkap Guru, Username Login, dan Password Login WAJIB diisi.' },
    { 'PETUNJUK IMPORT GURU': '2. Isikan kolom Mata Pelajaran Pengampuan dengan nama atau kode mata pelajaran yang sudah ada di sistem.' },
    { 'PETUNJUK IMPORT GURU': `DAFTAR MATA PELAJARAN TERSEDIA DI SISTEM:` },
    ...subjects.map(s => ({
      'PETUNJUK IMPORT GURU': `• ${s.name} ${s.code ? `[Kode: ${s.code}]` : ''}`
    }))
  ];
  const refSheet = XLSX.utils.json_to_sheet(refData);
  refSheet['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(workbook, refSheet, 'Petunjuk & Daftar Mapel');

  XLSX.writeFile(workbook, 'Template_Import_Akun_Guru.xlsx');
}

/**
 * Parses an uploaded Excel or CSV file for Students.
 */
export async function parseStudentExcelFile(file: File): Promise<ParsedStudentRow[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) return [];

  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  
  const parsedRows: ParsedStudentRow[] = rawRows.map((row) => {
    // Flexible header mapping
    const findValue = (keys: string[]): string => {
      for (const k of Object.keys(row)) {
        const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const targetKey of keys) {
          if (cleanK === targetKey.toLowerCase().replace(/[^a-z0-9]/g, '') || cleanK.includes(targetKey.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
            return String(row[k]).trim();
          }
        }
      }
      return '';
    };

    const nama = findValue(['namalengkap', 'nama', 'namasiswa']);
    const kelas = findValue(['kelas', 'kelastugas']);
    const noAbsen = findValue(['noabsen', 'absen', 'nomorabsen']);
    const nisn = findValue(['nisn', 'nomornisn', 'nis']);
    const username = findValue(['username']) || nisn;
    const password = findValue(['password', 'pass']) || 'pass123';

    let isValid = true;
    const errs: string[] = [];

    if (!nama) {
      isValid = false;
      errs.push('Nama belum diisi');
    }
    if (!kelas) {
      isValid = false;
      errs.push('Kelas belum diisi');
    }
    if (!nisn) {
      isValid = false;
      errs.push('NISN belum diisi');
    }

    return {
      nama,
      kelas,
      noAbsen,
      nisn,
      username,
      password: password || 'pass123',
      isValid,
      errorMessage: errs.join(', '),
    };
  });

  return parsedRows.filter(r => r.nama || r.nisn || r.kelas); // filter out completely empty rows
}

/**
 * Parses an uploaded Excel or CSV file for Teachers.
 */
export async function parseTeacherExcelFile(
  file: File,
  subjects: Subject[]
): Promise<ParsedTeacherRow[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) return [];

  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const parsedRows: ParsedTeacherRow[] = rawRows.map((row) => {
    const findValue = (keys: string[]): string => {
      for (const k of Object.keys(row)) {
        const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const targetKey of keys) {
          if (cleanK === targetKey.toLowerCase().replace(/[^a-z0-9]/g, '') || cleanK.includes(targetKey.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
            return String(row[k]).trim();
          }
        }
      }
      return '';
    };

    const name = findValue(['namalengkapguru', 'nama', 'namaguru', 'namalengkap']);
    const nip = findValue(['nipnik', 'nip', 'nik']);
    const username = findValue(['usernamelogin', 'username', 'user']);
    const password = findValue(['passwordlogin', 'password', 'pass']) || 'gurupass123';
    const subjectInput = findValue(['matapelajaranpengampuan', 'matapelajaran', 'mapel', 'subject']);
    const classesInput = findValue(['kelasmengajar', 'kelasamfuan', 'kelas', 'assignedclasses']);

    const assignedClasses = classesInput
      ? classesInput.split(/[,;\n]+/).map(c => c.trim()).filter(Boolean)
      : [];

    // Match subject with available subjects
    let subjectId = '';
    let subjectName = subjectInput || 'Belum Ditentukan';

    if (subjectInput && subjects.length > 0) {
      const cleanInput = subjectInput.toLowerCase().trim();
      const matched = subjects.find(
        s => s.name.toLowerCase().includes(cleanInput) ||
             cleanInput.includes(s.name.toLowerCase()) ||
             (s.code && s.code.toLowerCase().trim() === cleanInput)
      );
      if (matched) {
        subjectId = matched.id;
        subjectName = matched.name;
      } else {
        // Fallback to first available subject if name doesn't match
        subjectId = subjects[0].id;
        subjectName = `${subjects[0].name} (Otomatis)`;
      }
    } else if (subjects.length > 0) {
      subjectId = subjects[0].id;
      subjectName = subjects[0].name;
    }

    let isValid = true;
    const errs: string[] = [];

    if (!name) {
      isValid = false;
      errs.push('Nama Guru belum diisi');
    }
    if (!username) {
      isValid = false;
      errs.push('Username belum diisi');
    }

    return {
      name,
      nip,
      username,
      password: password || 'gurupass123',
      subjectId,
      subjectName,
      assignedClasses,
      isValid,
      errorMessage: errs.join(', '),
    };
  });

  return parsedRows.filter(r => r.name || r.username);
}

/**
 * Exports a list of student accounts to a formatted Excel file.
 */
export function exportStudentsToExcel(students: StudentAccount[], fileName: string = 'Data_Akun_Siswa.xlsx'): void {
  const data = students.map((s, idx) => ({
    'No.': idx + 1,
    'No. Absen': s.noAbsen || '-',
    'Nama Siswa': s.nama,
    'Kelas': s.kelas,
    'NISN (Username)': s.nisn,
    'Password': s.password || 'pass123',
    'Tanggal Terdaftar': s.createdAt ? new Date(s.createdAt).toLocaleDateString('id-ID') : '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 12 },
    { wch: 28 },
    { wch: 12 },
    { wch: 20 },
    { wch: 16 },
    { wch: 18 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Siswa');
  XLSX.writeFile(workbook, fileName);
}

/**
 * Exports a list of teacher accounts to a formatted Excel file.
 */
export function exportTeachersToExcel(teachers: TeacherAccount[], subjects: Subject[], fileName: string = 'Data_Akun_Guru.xlsx'): void {
  const data = teachers.map((t, idx) => {
    const subj = subjects.find(s => s.id === t.subjectId);
    return {
      'No.': idx + 1,
      'Nama Guru': t.name,
      'NIP / NIK': t.nip || '-',
      'Mata Pelajaran': subj ? `${subj.name} (${subj.code || '-'})` : '-',
      'Kelas Mengajar': (t.assignedClasses && t.assignedClasses.length > 0) ? t.assignedClasses.join(', ') : 'Semua Kelas',
      'Username Login': t.username,
      'Password': t.password,
      'Tanggal Dibuat': t.createdAt ? new Date(t.createdAt).toLocaleDateString('id-ID') : '-',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 30 },
    { wch: 22 },
    { wch: 25 },
    { wch: 28 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Guru');
  XLSX.writeFile(workbook, fileName);
}

export interface StudentProgressExportRow {
  student: StudentAccount;
  completedCount: number;
  totalCount: number;
  percentage: number;
  subjectName: string;
  lastActive?: number;
}

/**
 * Exports detailed student progress summary to a formatted Excel file.
 */
export function exportStudentProgressToExcel(
  rows: StudentProgressExportRow[],
  fileName: string = 'Rekap_Progres_Belajar_Siswa.xlsx'
): void {
  const data = rows.map((r, idx) => {
    let statusText = 'Belum Mulai';
    if (r.percentage === 100) statusText = 'TUNTAS (100%)';
    else if (r.percentage > 0) statusText = `Sedang Berjalan (${r.percentage}%)`;

    return {
      'No.': idx + 1,
      'No. Absen': r.student.noAbsen || '-',
      'Nama Siswa': r.student.nama,
      'Kelas': r.student.kelas,
      'NISN': r.student.nisn,
      'Mata Pelajaran': r.subjectName,
      'Materi Selesai': r.completedCount,
      'Total Materi': r.totalCount,
      'Progres (%)': `${r.percentage}%`,
      'Status Ketuntasan': statusText,
      'Aktivitas Terakhir': r.lastActive
        ? new Date(r.lastActive).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Belum Ada Aktivitas',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 6 },  // No.
    { wch: 12 }, // No. Absen
    { wch: 28 }, // Nama Siswa
    { wch: 12 }, // Kelas
    { wch: 18 }, // NISN
    { wch: 22 }, // Mata Pelajaran
    { wch: 16 }, // Materi Selesai
    { wch: 14 }, // Total Materi
    { wch: 14 }, // Progres (%)
    { wch: 24 }, // Status Ketuntasan
    { wch: 24 }, // Aktivitas Terakhir
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Progres Siswa');
  XLSX.writeFile(workbook, fileName);
}

