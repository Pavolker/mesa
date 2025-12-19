
import { GoogleGenAI, Type } from "@google/genai";
import { DictionaryResult, RhymeResult, LiteraryReference } from "../types";
import { offlineService } from "./offlineService";

const apiKey = process.env.API_KEY || '';
const isConfigured = apiKey.length > 0 && apiKey !== 'PLACEHOLDER_API_KEY';

const ai = new GoogleGenAI({ apiKey: apiKey });

// Helper simples de cache
const getFromCache = <T>(key: string): T | null => {
  try {
    const cached = localStorage.getItem(`cache_${key}`);
    if (cached) return JSON.parse(cached);
  } catch (e) {
    console.warn("Erro ao ler cache", e);
  }
  return null;
};

const saveToCache = (key: string, data: any) => {
  try {
    localStorage.setItem(`cache_${key}`, JSON.stringify(data));
  } catch (e) {
    console.warn("Erro ao salvar cache", e);
  }
};

export const geminiService = {
  async getDefinition(word: string): Promise<DictionaryResult> {
    const cacheKey = `dict_${word.toLowerCase().trim()}`;
    const cached = getFromCache<DictionaryResult>(cacheKey);
    if (cached) return cached;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Forneça a definição, etimologia, sinônimos e antônimos da palavra "${word}" em português brasileiro. 
        Se a palavra não existir ou estiver escrita incorretamente, sugira correções ortográficas ou palavras parecidas no campo "didYouMean" e deixe a definição vazia.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              definition: { type: Type.STRING },
              etymology: { type: Type.STRING },
              synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
              antonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
              didYouMean: { type: Type.ARRAY, items: { type: Type.STRING } } // Novo campo
            },
            required: ["word", "definition", "synonyms", "antonyms"]
          },
        },
      });
      const result = JSON.parse(response.text);
      saveToCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error("Erro API Dicionário:", error);
      throw error;
    }
  },

  async getRhymes(word: string): Promise<RhymeResult> {
    if (!isConfigured) return offlineService.getRhymesOffline(word);

    const cacheKey = `rhyme_${word.toLowerCase().trim()}`;
    const cached = getFromCache<RhymeResult>(cacheKey);
    if (cached) return cached;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Liste rimas para a palavra "${word}" em português. Classifique por tipo (consonante/toante), número de sílabas e tonicidade.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              rhymes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    word: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['consonante', 'toante'] },
                    syllables: { type: Type.INTEGER },
                    tonicity: { type: Type.STRING, enum: ['oxítona', 'paroxítona', 'proparoxítona'] }
                  },
                  required: ["word", "type", "syllables", "tonicity"]
                }
              }
            },
            required: ["word", "rhymes"]
          },
        },
      });
      const result = JSON.parse(response.text);
      saveToCache(cacheKey, result);
      return result;
    } catch (error) {
      console.warn("Erro API Rimas, usando offline fallback:", error);
      // Fallback offline
      return offlineService.getRhymesOffline(word);
    }
  },

  async getLiteraryReference(query: string): Promise<LiteraryReference> {
    const cleanQuery = query.toLowerCase().trim();

    // Interceptação para Paulo Volker ou Referência Bibliográficas
    if (cleanQuery.includes("paulo volker") || cleanQuery.includes("referencia bibliograficas") || cleanQuery.includes("referência bibliográficas")) {
      return {
        author: "Paulo Volker",
        period: "Contemporâneo",
        style: "Filosófico, Analítico e Poético",
        works: [
          "Livro das Bulas",
          "A Neurociência das Emoções",
          "Filosofia Contemporânea Chinesa",
          "Empresa de 1 Real",
          "O Re-verso do Filósofo",
          "Filosofia da Música",
          "Filosofia do Prompt",
          "Sistema Humano de Interrogação",
          "Estratégia da Pergunta",
          "Platão: O Algoritmo da Pergunta",
          "Manual Avançado para Mentirosos",
          "Conversas de Avião",
          "Excalibur",
          "Discursos Póstumos"
        ],
        themes: [
          "Filosofia da Mente",
          "Empreendedorismo",
          "Música e Emoção",
          "Inteligência Artificial (Prompts)",
          "Educação"
        ]
      };
    }

    const cacheKey = `lit_${cleanQuery}_v3`; // v3 para nova tentativa
    const cached = getFromCache<LiteraryReference>(cacheKey);
    if (cached) return cached;

    // Função auxiliar para tentar a chamada
    const fetchInfo = async (useSearch: boolean) => {
      return ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Analise o termo literário: "${query}".
        ${useSearch ? 'Consulte a internet para verificar dados recentes.' : 'Use seu conhecimento literário.'}
        
        Gere um JSON estrito (sem Markdown) com:
        - author: Nome
        - works: Lista de obras principais (array)
        - period: Período/Movimento
        - style: Estilo (sintético)
        - themes: Temas (array)
        
        Responda APENAS o JSON.`,
        config: {
          tools: useSearch ? [{ googleSearch: {} }] : undefined,
        },
      });
    };

    try {
      let response;
      try {
        // Tentativa 1: Com busca
        response = await fetchInfo(true);
      } catch (err) {
        console.warn("Busca falhou, tentando offline...", err);
        // Tentativa 2: Sem busca (fallback)
        response = await fetchInfo(false);
      }

      let text = response.text || "";
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();

      if (!text) throw new Error("Resposta vazia");

      const result = JSON.parse(text);
      // Validação básica
      if (!result.author) throw new Error("JSON incompleto");

      saveToCache(cacheKey, result);
      return result;

    } catch (error: any) {
      console.error("Erro Final Lit:", error);
      const msg = error.message || "";
      let userMsg = "Ocorreu um erro ao buscar informações.";

      if (msg.includes("403") || msg.includes("API key") || msg.includes("401")) {
        userMsg = "Erro de Permissão/API Key. Verifique seu arquivo .env.local";
      }

      return {
        author: "Não encontrado",
        period: "-",
        style: userMsg,
        works: [],
        themes: []
      };
    }
  },

  async checkSpelling(text: string): Promise<string> {
    if (!isConfigured) return "⚠️ Erro: Chave de API não configurada no arquivo .env.local.";

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Atue como um revisor editorial experiente. Analise o seguinte texto em português e aponte apenas erros ortográficos contextuais e problemas de concordância sutis. Seja breve e direto. Não reescreva o texto, apenas aponte os pontos de atenção. Texto: \n\n${text}`,
        config: {
          systemInstruction: "Você é um consultor linguístico para escritores literários. Seu tom é formal, útil e técnico."
        }
      });
      return response.text;
    } catch (error: any) {
      console.error("Erro API Spelling:", error);
      if (error.message?.includes('403') || error.message?.includes('API key')) {
        return "⚠️ Erro de Autenticação: Verifique sua API Key.";
      }
      return "Serviço de revisão indisponível no momento. Verifique sua conexão.";
    }
  },

  async continueText(context: string): Promise<string> {
    if (!isConfigured) return "⚠️ O Sopro Criativo precisa que uma Chave de API válida seja configurada no arquivo .env.local.";

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Atue como um co-autor literário. Analise o estilo, o tom e o contexto do seguinte fragmento de texto e escreva uma continuação natural de cerca de 2 a 3 frases. Mantenha estritamente a voz do autor. Não adicione introduções ou comentários seus, retorne APENAS o texto sugerido para a continuação.\n\nTexto atual:\n${context}`,
        config: {
          systemInstruction: "Você é um assistente criativo invisível. Sua única missão é ajudar o autor a superar bloqueios mantendo a integridade estilística da obra."
        }
      });
      return response.text || "O autor silenciou... (tente novamente)";
    } catch (error) {
      console.error("Erro API Continue:", error);
      return "Não foi possível invocar a inspiração agora. (Erro de Conexão ou API)";
    }
  }
};
