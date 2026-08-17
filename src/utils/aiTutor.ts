export async function fetchAIAnalogy(questionText: string, options: string[]): Promise<string> {
  try {
    const response = await fetch('/api/generate-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Analogi Sederhana AI',
        categoryName: 'Sains & Pembelajaran',
        description: `Berikan analogi sederhana kehidupan sehari-hari (maksimal 2 kalimat) untuk menjelaskan konsep dalam pertanyaan kuis ini: "${questionText}". Pilihan jawaban: ${options.join(', ')}.`,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.flashcards && data.flashcards.length > 0) {
        return data.flashcards[0].back || data.flashcards[0].front;
      }
    }
  } catch (err) {
    console.warn('AI Analogy fetch failed, falling back to local rule:', err);
  }

  return `Bayangkan konsep "${questionText.slice(0, 45)}..." seperti sistem kerja di kehidupan sehari-hari: di mana setiap bagian memiliki tugas spesifik untuk mencapai tujuan bersama secara efisien!`;
}

export async function fetchAIHint(questionText: string, options: string[]): Promise<string> {
  return `💡 **Petunjuk AI**: Fokus pada kata kunci utama dalam pertanyaan. Eliminasi pilihan yang bertentangan dengan prinsip dasar materi ini dan perhatikan keterkaitannya secara logis!`;
}

let isSpeechSpeaking = false;

export function speakText(text: string, onEnd?: () => void): boolean {
  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported in this browser.');
    return false;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  // Strip Markdown markers like **, *, _, #
  const cleanText = text.replace(/[*_#~`]/g, '');

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'id-ID';
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  // Try to find an Indonesian voice if available
  const voices = window.speechSynthesis.getVoices();
  const idVoice = voices.find((v) => v.lang.includes('id') || v.lang.includes('ID'));
  if (idVoice) {
    utterance.voice = idVoice;
  }

  utterance.onend = () => {
    isSpeechSpeaking = false;
    if (onEnd) onEnd();
  };

  utterance.onerror = () => {
    isSpeechSpeaking = false;
    if (onEnd) onEnd();
  };

  isSpeechSpeaking = true;
  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeech(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    isSpeechSpeaking = false;
  }
}

export function isSpeaking(): boolean {
  return 'speechSynthesis' in window && window.speechSynthesis.speaking;
}
