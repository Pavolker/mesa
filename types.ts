
export type TextType = 'conto' | 'poema' | 'crônica' | 'geral';

export interface WritingProject {
  id: string;
  title: string;
  content: string;
  type: TextType;
  updatedAt: number;
  createdAt: number;
  version: number;
  wordGoal?: number;
}

export interface ProjectMetadata {
  id: string;
  title: string;
  updatedAt: number;
  type: TextType;
}

export interface DictionaryResult {
  word: string;
  definition: string;
  etymology?: string;
  synonyms: string[];
  antonyms: string[];
  didYouMean?: string[]; // Sugestões ortográficas
}

export interface RhymeResult {
  word: string;
  rhymes: Array<{
    word: string;
    type: 'consonante' | 'toante';
    syllables: number;
    tonicity: 'oxítona' | 'paroxítona' | 'proparoxítona';
  }>;
}

export interface LiteraryReference {
  author: string;
  works: string[];
  period: string;
  style: string;
  themes: string[];
}
