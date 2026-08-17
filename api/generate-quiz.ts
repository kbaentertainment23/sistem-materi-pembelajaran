import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow CORS for Vercel preview & production deployments
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on Vercel environment variables.',
      });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { title, description, categoryName, subjectName, targetGrade } = body;

    if (!title) {
      return res.status(400).json({ error: 'Judul materi diperlukan.' });
    }

    const TARGET_GRADE_MAP: Record<string, { label: string; levelDesc: string }> = {
      'smp-7': {
        label: 'SMP Kelas 7 (Fase D)',
        levelDesc: 'Gunakan Bahasa Indonesia baku yang lugas, komunikatif, dan mudah dipahami siswa remaja SMP usia 12-13 tahun. Kuis HARUS TIDAK TERLALU SUSAH, fokus pada pemahaman konsep dasar, istilah penting sederhana, serta contoh situasi nyata sehari-hari. HINDARI istilah akademis tinggi atau istilah teknis perguruan tinggi yang membingungkan.',
      },
      'smp-8': {
        label: 'SMP Kelas 8 (Fase D)',
        levelDesc: 'Gunakan Bahasa Indonesia baku yang jelas untuk siswa SMP usia 13-14 tahun. Soal berkategori sedang/dasar, menghubungkan konsep dengan penerapan praktis, tidak terlalu rumit, dan mudah dipikirkan secara logis oleh siswa SMP kelas 8.',
      },
      'smp-9': {
        label: 'SMP Kelas 9 (Fase D)',
        levelDesc: 'Gunakan Bahasa Indonesia baku untuk siswa SMP usia 14-15 tahun. Soal menguji pemahaman dan analisis sederhana tanpa jebakan istilah teknis tinggi yang berlebihan. Pas untuk tingkat akhir SMP.',
      },
      'sma-10': {
        label: 'SMA / SMK Kelas 10 (Fase E)',
        levelDesc: 'Gunakan Bahasa Indonesia baku yang menarik untuk siswa SMA/SMK kelas 10 (usia 15-16 tahun). Soal menguji fondasi konsep SMA/SMK, penalaran logis, dan penerapan praktis dengan tingkat kesulitan yang proporsional.',
      },
      'sma-11': {
        label: 'SMA / SMK Kelas 11 (Fase F)',
        levelDesc: 'Gunakan Bahasa Indonesia baku untuk siswa SMA/SMK kelas 11 (usia 16-17 tahun). Soal melatih penalaran kritis, studi kasus, dan analisis menengah sesuai kurikulum kelas 11.',
      },
      'sma-12': {
        label: 'SMA / SMK Kelas 12 (Fase F)',
        levelDesc: 'Gunakan Bahasa Indonesia baku untuk siswa SMA/SMK kelas 12 (usia 17-18 tahun). Soal melatih pemahaman komprehensif, persiapan ujian, dan pemecahan masalah kritis.',
      },
      'sd-4-6': {
        label: 'SD Kelas 4-6 (Fase C)',
        levelDesc: 'Gunakan bahasa yang sangat sederhana, ramah anak usia 9-12 tahun, kalimat pendek dan jelas. Soal bersifat konkrit, langsung ke konsep utama, dan sangat terjangkau.',
      },
      'umum': {
        label: 'Umum / Semua Tingkatan',
        levelDesc: 'Gunakan bahasa yang fleksibel, komunikatif, dan seimbang yang dapat dipahami oleh berbagai kalangan siswa.',
      },
    };

    const targetInfo = TARGET_GRADE_MAP[targetGrade || 'smp-7'] || TARGET_GRADE_MAP['smp-7'];

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `Buatkan TEPAT 10 soal pilihan ganda interaktif dan 5 kartu flashcard belajar mandiri untuk materi pembelajaran sekolah dengan ketentuan kombinasi unik:

DATA MATERI & TARGET TINGKAT KELAS:
- TOPIK UTAMA (Kategori): "${categoryName || 'Umum'}"
- MATERI SPESIFIK (Sub-topik/Modul): "${title}"
- MATA PELAJARAN: "${subjectName || 'Umum'}"
- DESKRIPSI MATERI: "${description || ''}"
- TARGET TINGKAT KELAS / FASE: "${targetInfo.label}"
- TIMESTAMP/SEED GENERASI: ${Date.now()}

PETUNJUK UTAMA TINGKAT KESULITAN & BAHASA (SANGAT PENTING):
1. Penyesuaian Tingkat Kesulitan untuk ${targetInfo.label}:
   - ${targetInfo.levelDesc}
   - DILARANG MEMBUAT SOAL YANG TERLALU SUSAH, TERLALU PANJANG BERBELIT-BELIT, ATAU MEMAKAI ISTILAH AKADEMIS PERGURUAN TINGGI.
   - Pastikan soal dapat dijawab dengan penalaran logis dan pemahaman materi yang wajar sesuai jenjang ${targetInfo.label}.

2. Kombinasi Spesifik Topik + Materi:
   - Soal kuis ini HARUS dibuat secara eksplisit sebagai kombinasi spesifik antara Topik ("${categoryName || 'Umum'}") dan Materi ("${title}").
   - Kuis untuk materi "${title}" HARUS BERBEDA dan UNIK dibanding materi-materi lain yang berada di dalam topik "${categoryName || 'Umum'}" yang sama.
   - Jangan membuat pertanyaan umum yang berlaku universal untuk seluruh topik. Buatlah pertanyaan yang menguji konsep khusus, istilah spesifik, studi kasus, atau prosedur yang hanya ada pada modul "${title}".

3. Integration 8 Dimensi Profil Lulusan:
   - Sertakan minimal 2 soal yang menekankan "8 Dimensi Profil Lulusan" (Dimensi: Keimanan & Ketakwaan kepada Tuhan YME, Kewargaan/Kebinekaan, Penalaran Kritis, Kreativitas, Gotong Royong, Kemandirian, Kesehatan & Kebugaran, Komunikasi & Kolaborasi). JANGAN gunakan istilah "Profil Pelajar Pancasila", gunakan "8 Dimensi Profil Lulusan".

4. Struktur Soal & Variasi Kunci Jawaban:
   - Setiap soal memiliki 4 pilihan jawaban (A, B, C, D), indeks jawaban benar (0-3), dan PENJELASAN RINGKAS (1-2 kalimat padat & jelas).
   - ACAK SEBARAN KUNCI JAWABAN: Sebar indeks jawaban benar (0, 1, 2, 3) secara acak dan seimbang pada pilihan A, B, C, dan D. JANGAN pernah menumpuk kunci jawaban pada opsi A (indeks 0).

5. Flashcard Pembelajaran:
   - Setiap flashcard memiliki sisi Depan (istilah/pertanyaan spesifik materi "${title}" dalam topik "${categoryName || 'Umum'}" untuk ${targetInfo.label}) dan sisi Belakang (jawaban/penjelasan ringkas padat).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        temperature: 0.8,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            quizQuestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  correctAnswerIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                },
                required: [
                  'id',
                  'question',
                  'options',
                  'correctAnswerIndex',
                  'explanation',
                ],
              },
            },
            flashcards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  front: { type: Type.STRING },
                  back: { type: Type.STRING },
                },
                required: ['id', 'front', 'back'],
              },
            },
          },
          required: ['quizQuestions', 'flashcards'],
        },
      },
    });

    const text = response.text || '{}';
    const parsedData = JSON.parse(text);
    return res.status(200).json(parsedData);
  } catch (err: unknown) {
    console.error('Error generating AI quiz:', err);
    return res.status(500).json({ error: 'Gagal membuat kuis otomatis dari AI.' });
  }
}
