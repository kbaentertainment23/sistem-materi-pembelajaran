import { Material, QuizQuestion, FlashcardItem } from '../types';

export function shuffleQuizQuestions(questions: QuizQuestion[]): QuizQuestion[] {
  if (!questions || questions.length === 0) return [];

  // 1. Fisher-Yates shuffle on the question array order
  const shuffledQuestions = [...questions];
  for (let i = shuffledQuestions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
  }

  // 2. Fisher-Yates shuffle on options of each question and update correctAnswerIndex
  return shuffledQuestions.map((q) => {
    if (!q.options || q.options.length === 0) return q;

    const correctText = q.options[q.correctAnswerIndex] ?? q.options[0];

    const shuffledOptions = [...q.options];
    for (let i = shuffledOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
    }

    const newCorrectIndex = shuffledOptions.indexOf(correctText);

    return {
      ...q,
      options: shuffledOptions,
      correctAnswerIndex: newCorrectIndex !== -1 ? newCorrectIndex : 0,
    };
  });
}

export function getDefaultQuizQuestions(
  material: Material,
  categoryName?: string,
  subjectName?: string
): QuizQuestion[] {
  if (material.quizQuestions && material.quizQuestions.length > 0) {
    return shuffleQuizQuestions(material.quizQuestions);
  }

  const title = material.title;
  const topicName = categoryName || 'Umum';

  // Custom tailored fallback questions combining Topik and Material title
  const baseQuestions: QuizQuestion[] = [
    {
      id: 'q1',
      question: `Dalam topik "${topicName}", apa fokus utama yang dipelajari pada modul materi "${title}"?`,
      options: [
        'Menghafal rumus tanpa memahami maknanya',
        `Memahami konsep spesifik dan penerapan materi ${title} dalam topik ${topicName}`,
        'Hanya untuk menyelesaikan tugas sekolah tanpa dibaca',
        'Menyimpan file di Google Drive tanpa dibaca'
      ],
      correctAnswerIndex: 1,
      explanation: `Tujuan utama pembelajaran ${title} pada topik ${topicName} adalah agar siswa menguasai konsep inti sub-bahasan ini dan mampu mengaplikasikannya secara nyata.`
    },
    {
      id: 'q2',
      question: `Saat menganalisis permasalahan pada materi "${title}" (Topik: ${topicName}), dimensi profil lulusan mana yang paling terasah?`,
      options: [
        'Pasif dan mengandalkan jawaban teman tanpa diperiksa',
        'Tidak mencatat poin-poin penting dari slide',
        'Penalaran Kritis & Kemandirian dalam memecahkan soal',
        'Menyerah saat menemukan pertanyaan yang sulit'
      ],
      correctAnswerIndex: 2,
      explanation: `Penalaran Kritis & Kemandirian (bagian dari 8 Dimensi Profil Lulusan) melatih siswa untuk menganalisis fakta dan memecahkan soal spesifik ${title} pada topik ${topicName}.`
    },
    {
      id: 'q3',
      question: `Bagaimana penerapan dimensi "Gotong Royong & Komunikasi" dalam konteks mempelajari "${title}" pada topik "${topicName}"?`,
      options: [
        'Bekerja sendirian tanpa pernah mau menerima masukan orang lain',
        'Menutup diri saat kerja kelompok pembelajaran',
        'Mengabaikan hasil diskusi tim',
        `Aktif berdiskusi dengan teman untuk memahami sub-bahasan ${title} dengan santun`
      ],
      correctAnswerIndex: 3,
      explanation: `Dimensi Gotong Royong dan Komunikasi membantu siswa berkolaborasi memahami materi ${title} dalam ranah topik ${topicName}.`
    },
    {
      id: 'q4',
      question: `Langkah utama untuk membuktikan bahwa kamu menguasai materi "${title}" dari topik "${topicName}" adalah...`,
      options: [
        `Bisa menjelaskan kembali konsep ${title} dengan bahasamu sendiri secara logis`,
        'Hanya menghafal judul modulnya saja',
        'Menjawab semua kuis secara asal pilih tanpa membaca',
        'Hanya membuka halaman slide tanpa menyimak isinya'
      ],
      correctAnswerIndex: 0,
      explanation: `Daya penalaran kritis dan kreativitas tercermin saat kamu mampu memformulasikan konsep ${title} (${topicName}) dengan bahasa sendiri.`
    },
    {
      id: 'q5',
      question: `Jika menemukan bagian yang sulit pada modul "${title}" dalam topik "${topicName}", sikap belajar yang tepat adalah...`,
      options: [
        'Langsung menutup modul dan tidak melanjutkannya',
        'Aktif bertanya, mencari referensi tambahan, dan tidak mudah menyerah',
        'Menunggu kunci jawaban tanpa mencoba menjawab',
        'Menyalahkan teman atau materi yang sulit'
      ],
      correctAnswerIndex: 1,
      explanation: `Kemampuan refleksi dan kemandirian mengajarkan siswa untuk proaktif menemukan solusi saat mempelajari ${title}.`
    },
    {
      id: 'q6',
      question: `Mengapa keterkaitan antara materi "${title}" dan topik utama "${topicName}" penting dihubungkan dengan kehidupan nyata?`,
      options: [
        'Hanya agar kuis terlihat lebih panjang',
        'Karena disuruh oleh guru mata pelajaran',
        'Agar pembelajaran menjadi lebih bermakna, kontekstual, dan mudah diingat',
        'Supaya materi terasa lebih rumit'
      ],
      correctAnswerIndex: 2,
      explanation: `Pembelajaran kontekstual menghubungkan sub-materi ${title} dengan topik ${topicName} serta penerapannya di dunia nyata.`
    },
    {
      id: 'q7',
      question: `Dalam dimensi "Kreativitas", bagaimana siswa dapat mengekspresikan pemahaman pada materi "${title}" (${topicName})?`,
      options: [
        'Menyalin mentah-mentah teks dari internet tanpa dibaca',
        'Menghindari pembuatan proyek atau tugas kreatif',
        'Menyimpan catatan dalam bentuk yang tidak rapi',
        `Membuat ringkasan visual, peta konsep, atau pemikiran baru seputar ${title}`
      ],
      correctAnswerIndex: 3,
      explanation: `Kreativitas memungkinkan siswa mengolah informasi sub-materi ${title} menjadi bentuk peta pikiran atau gagasan baru.`
    },
    {
      id: 'q8',
      question: `Apa yang harus dilakukan siswa sebelum mengerjakan kuis evaluasi pada materi "${title}" (${topicName})?`,
      options: [
        'Membaca dan menyimak ringkasan materi serta catatan penting terlebih dahulu',
        'Langsung menjawab tanpa membaca pertanyaan',
        'Membuka banyak tab lain untuk mengabaikan materi',
        'Menebak jawaban secara acak'
      ],
      correctAnswerIndex: 0,
      explanation: `Mempersiapkan diri dengan mengulas materi ${title} terlebih dahulu melatih kedisiplinan dan tanggung jawab belajar.`
    },
    {
      id: 'q9',
      question: `Dimensi "Keimanan & Ketakwaan" serta "Kesehatan & Kebugaran" mengingatkan siswa agar...`,
      options: [
        'Belajar tanpa istirahat hingga larut malam',
        'Menjaga keseimbangan antara belajar, berdoa, dan kesehatan fisik/mental',
        'Mengabaikan pola tidur dan makan saat belajar',
        'Merasa cemas secara berlebihan saat ujian'
      ],
      correctAnswerIndex: 1,
      explanation: 'Profil lulusan yang utuh mencakup kecerdasan intelektual, emosional, spiritual, serta stamina fisik yang sehat.'
    },
    {
      id: 'q10',
      question: `Setelah menyelesaikan latihan kuis materi "${title}" (Topik: ${topicName}), tindakan terbaik berikutnya adalah...`,
      options: [
        'Mengabaikan nilai dan langsung menutup kuis',
        'Merasa puas walau masih banyak jawaban yang salah',
        'Mengevaluasi jawaban yang belum tepat dan mempelajari ulang pembahasannya',
        'Menghapus riwayat latihan'
      ],
      correctAnswerIndex: 2,
      explanation: 'Proses umpan balik dan evaluasi mandiri adalah kunci utama peningkatan pemahaman secara berkelanjutan.'
    }
  ];

  return shuffleQuizQuestions(baseQuestions);
}

export function getDefaultFlashcards(
  material: Material,
  categoryName?: string,
  subjectName?: string
): FlashcardItem[] {
  if (material.flashcards && material.flashcards.length > 0) {
    return material.flashcards;
  }

  const title = material.title;
  const topicName = categoryName || 'Umum';

  return [
    {
      id: 'f1',
      front: `Topik: ${topicName} | Materi: ${title}`,
      back: `Fokus pada pemahaman konsep dasar sub-bahasan "${title}" dalam kerangka topik "${topicName}".`
    },
    {
      id: 'f2',
      front: `8 Dimensi Profil Lulusan: Penalaran Kritis (${title})`,
      back: `Melatih siswa untuk berpikir secara analitis, objektif, dan logis saat mempelajari ${title} pada topik ${topicName}.`
    },
    {
      id: 'f3',
      front: `8 Dimensi Profil Lulusan: Kemandirian & Kreativitas (${title})`,
      back: `Siswa aktif belajar mandiri menyerap poin penting ${title} dan mampu menuangkan gagasan dalam ringkasan visual.`
    },
    {
      id: 'f4',
      front: 'Tips Active Recall & Retensi',
      back: `Gunakan teknik active recall: jelaskan kembali konsep "${title}" (${topicName}) kepada teman atau buat ringkasan di Catatan Siswa.`
    }
  ];
}

export function formatTargetGradeLabel(targetGrade?: string): string {
  switch (targetGrade) {
    case 'smp-7':
      return 'SMP Kelas 7 (Fase D)';
    case 'smp-8':
      return 'SMP Kelas 8 (Fase D)';
    case 'smp-9':
      return 'SMP Kelas 9 (Fase D)';
    case 'sma-10':
      return 'SMA / SMK Kelas 10 (Fase E)';
    case 'sma-11':
      return 'SMA / SMK Kelas 11 (Fase F)';
    case 'sma-12':
      return 'SMA / SMK Kelas 12 (Fase F)';
    case 'sd-4-6':
      return 'SD Kelas 4 - 6 (Fase C)';
    case 'umum':
      return 'Umum / Adaptif';
    default:
      return 'SMP Kelas 7 (Fase D)';
  }
}

export async function fetchAIGeneratedQuiz(
  material: Material,
  categoryName?: string,
  subjectName?: string
): Promise<{ quizQuestions: QuizQuestion[]; flashcards: FlashcardItem[] } | null> {
  try {
    const res = await fetch('/api/generate-quiz', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: material.title,
        description: material.description,
        categoryName: categoryName || '',
        subjectName: subjectName || '',
        targetGrade: material.targetGrade || 'smp-7',
      }),
    });

    if (!res.ok) {
      console.warn('Gagal memanggil AI endpoint untuk kuis:', res.statusText);
      return null;
    }

    const data = await res.json();
    if (data.quizQuestions && data.flashcards) {
      return data;
    }
    return null;
  } catch (err) {
    console.error('Error fetching AI generated quiz:', err);
    return null;
  }
}
