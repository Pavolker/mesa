
import { RhymeResult } from '../types';

// Pequena lista de sufixos comuns e regras para fallback offline
const SUFFIX_MAPPING: Record<string, string[]> = {
  'ão': ['coração', 'mão', 'pão', 'chão', 'ilusão', 'paixão', 'canção', 'ação', 'emoção', 'razão'],
  'ar': ['amar', 'olhar', 'mar', 'lugar', 'falar', 'pensar', 'sonhar', 'voar', 'cantar', 'estar'],
  'er': ['viver', 'saber', 'ter', 'ler', 'escrever', 'poder', 'querer', 'ver', 'ser', 'entender'],
  'ir': ['sentir', 'partir', 'sorrir', 'abrir', 'pedir', 'ouvir', 'dormir', 'existir', 'fluir', 'cair'],
  'or': ['amor', 'dor', 'flor', 'calor', 'sabor', 'valor', 'temor', 'cor', 'motor', 'favor'],
  'ada': ['amada', 'estrada', 'nada', 'chegada', 'alvorada', 'jornada', 'morada', 'calada', 'espada'],
  'ente': ['mente', 'gente', 'quente', 'frente', 'sente', 'presente', 'ausente', 'urgente', 'vivente'],
  'al': ['final', 'real', 'igual', 'natural', 'sinal', 'mortal', 'leal', 'banal', 'atemporal'],
  'ento': ['vento', 'tempo', 'momento', 'pensamento', 'sentimento', 'lento', 'atento', 'assento'],
  'ia': ['dia', 'magia', 'poesia', 'alegria', 'fantasia', 'guia', 'bacia', 'fria', 'melodia']
};

export const offlineService = {
  // Rimas baseadas em sufixos simples (fallback)
  getRhymesOffline(word: string): RhymeResult {
    const cleanWord = word.toLowerCase().trim();
    const ending2 = cleanWord.slice(-2);
    const ending3 = cleanWord.slice(-3);
    const ending4 = cleanWord.slice(-4);
    
    let rhymes: string[] = [];

    // Tenta encontrar matches nas listas pré-definidas
    if (SUFFIX_MAPPING[ending4]) rhymes = [...rhymes, ...SUFFIX_MAPPING[ending4]];
    if (SUFFIX_MAPPING[ending3]) rhymes = [...rhymes, ...SUFFIX_MAPPING[ending3]];
    if (SUFFIX_MAPPING[ending2]) rhymes = [...rhymes, ...SUFFIX_MAPPING[ending2]];
    
    // Filtra a própria palavra
    rhymes = rhymes.filter(w => w !== cleanWord);
    
    // Remove duplicatas
    rhymes = [...new Set(rhymes)];

    return {
      word: word,
      rhymes: rhymes.map(r => ({
        word: r,
        type: 'consonante', // Simplificação
        syllables: 0, // Desconhecido offline simples
        tonicity: 'paroxítona' // Chute estatístico, não preciso
      }))
    };
  }
};
