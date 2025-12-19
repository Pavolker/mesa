import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, BookOpen, Music, History, Edit3, Save, Download,
  Maximize2, Minimize2, Trash2, List, Type as TypeIcon, Sparkles, ChevronRight,
  BarChart3, Calendar, Clock, Target, X, Upload, Eraser, Library, CloudUpload
} from 'lucide-react';
import Editor from './components/Editor';
import Window from './components/SupportPanel';
import { WritingProject, DictionaryResult, RhymeResult, LiteraryReference } from './types';
import { geminiService } from './services/geminiService';
import { libraryService, LibraryMatch } from './services/libraryService';

const STORAGE_KEY = 'mesa_escrita_data_v2'; // Nova chave para nova estrutura

const DEFAULT_PROJECT: WritingProject = {
  id: 'default',
  title: '',
  content: '',
  type: 'geral',
  updatedAt: Date.now(),
  createdAt: Date.now(),
  version: 1,
  wordGoal: 1000
};

const App: React.FC = () => {
  // State
  const [projects, setProjects] = useState<WritingProject[]>([DEFAULT_PROJECT]);
  const [activeProjectId, setActiveProjectId] = useState<string>('default');

  // Computed active project
  const project = useMemo(() =>
    projects.find(p => p.id === activeProjectId) || projects[0]
    , [projects, activeProjectId]);

  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [showProjectList, setShowProjectList] = useState(false); // Toggle da lista de projetos
  const [sidebarWidth, setSidebarWidth] = useState(384); // Default 384px (w-96)
  const [isResizing, setIsResizing] = useState(false);

  // Support Tool States
  const [wordQuery, setWordQuery] = useState('');
  const [dictResult, setDictResult] = useState<DictionaryResult | null>(null);
  const [isDictLoading, setIsDictLoading] = useState(false);

  const [rhymeQuery, setRhymeQuery] = useState('');
  const [rhymeResult, setRhymeResult] = useState<RhymeResult | null>(null);
  const [isRhymeLoading, setIsRhymeLoading] = useState(false);
  const [rhymeFilter, setRhymeFilter] = useState({ syllables: 0, tonicity: '' });

  const [litQuery, setLitQuery] = useState('');
  const [litResult, setLitResult] = useState<LiteraryReference | null>(null);
  const [isLitLoading, setIsLitLoading] = useState(false);

  const [spellingFeedback, setSpellingFeedback] = useState<string | null>(null);
  const [isSpellingLoading, setIsSpellingLoading] = useState(false);

  const [continuation, setContinuation] = useState<string | null>(null);
  const [isContinuing, setIsContinuing] = useState(false);

  // Library State
  const [libQuery, setLibQuery] = useState('');
  const [libResults, setLibResults] = useState<LibraryMatch[] | null>(null);
  const [isLibLoading, setIsLibLoading] = useState(false);
  const [isUploadingDb, setIsUploadingDb] = useState(false);

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProjects(parsed);
          setActiveProjectId(parsed[0].id);
        }
      } catch (e) {
        console.error("Erro ao carregar projetos", e);
      }
    } else {
      // Tenta migrar da versão antiga
      const oldSaved = localStorage.getItem('mesa_escrita_data');
      if (oldSaved) {
        try {
          const oldProject = JSON.parse(oldSaved);
          setProjects([oldProject]);
          setActiveProjectId(oldProject.id);
        } catch (e) { }
      }
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [projects]);

  // Derived Metrics
  const metrics = useMemo(() => {
    const text = project.content.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const chars = text.length;
    const paragraphs = text ? text.split(/\n+/).length : 0;
    const readingTime = Math.ceil(words / 200); // Média de 200 ppm
    const progress = project.wordGoal ? Math.min(100, (words / project.wordGoal) * 100) : 0;

    return { words, chars, paragraphs, readingTime, progress };
    return { words, chars, paragraphs, readingTime, progress };
  }, [project.content, project.wordGoal]);

  // Sidebar Resizing Logic
  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = document.body.clientWidth - mouseMoveEvent.clientX;
        if (newWidth > 250 && newWidth < 800) { // Min 250px, Max 800px
          setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  // Project Handlers
  const handleCreateProject = () => {
    const newProject: WritingProject = {
      ...DEFAULT_PROJECT,
      id: crypto.randomUUID(),
      title: 'Novo Texto',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setProjects(prev => [newProject, ...prev]);
    setActiveProjectId(newProject.id);
    setShowProjectList(false);
  };

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (projects.length <= 1) return; // Não deletar o último
    if (confirm('Tem certeza que deseja excluir este texto?')) {
      const newProjects = projects.filter(p => p.id !== id);
      setProjects(newProjects);
      if (activeProjectId === id) {
        setActiveProjectId(newProjects[0].id);
      }
    }
  };

  const updateActiveProject = (updates: Partial<WritingProject>) => {
    setProjects(prev => prev.map(p =>
      p.id === activeProjectId
        ? { ...p, ...updates, updatedAt: Date.now() }
        : p
    ));
  };

  // Content Handlers
  const handleContentChange = (content: string) => {
    updateActiveProject({ content });
  };

  const handleTitleChange = (title: string) => {
    updateActiveProject({ title });
  };

  const handleGoalChange = (val: string) => {
    const goal = parseInt(val) || 0;
    updateActiveProject({ wordGoal: goal });
  };

  // Tool Handlers (Mantidos iguais, apenas chamando geminiService atualizado)
  const handleSearchWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wordQuery.trim()) return;
    setIsDictLoading(true);
    try {
      const result = await geminiService.getDefinition(wordQuery);
      setDictResult(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsDictLoading(false);
    }
  };

  const handleSearchRhyme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rhymeQuery.trim()) return;
    setIsRhymeLoading(true);
    try {
      const result = await geminiService.getRhymes(rhymeQuery);
      setRhymeResult(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsRhymeLoading(false);
    }
  };

  const handleSearchLit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!litQuery.trim()) return;
    setIsLitLoading(true);
    try {
      const result = await geminiService.getLiteraryReference(litQuery);
      setLitResult(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLitLoading(false);
    }
  };

  const handleSearchLibrary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!libQuery.trim()) return;
    setIsLibLoading(true);
    try {
      const results = await libraryService.search(libQuery);
      setLibResults(results);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLibLoading(false);
    }
  };

  const handleSpellingCheck = async () => {
    if (!project.content.trim()) return;
    setIsSpellingLoading(true);
    try {
      const feedback = await geminiService.checkSpelling(project.content);
      setSpellingFeedback(feedback);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSpellingLoading(false);
    }
  };

  const handleContinueText = async () => {
    if (!project.content.trim()) return;
    setIsContinuing(true);
    setContinuation(null);
    try {
      const result = await geminiService.continueText(project.content);
      setContinuation(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsContinuing(false);
    }
  };

  const insertContinuation = () => {
    if (!continuation) return;
    const newContent = project.content.endsWith(' ') ? project.content + continuation : project.content + ' ' + continuation;
    handleContentChange(newContent);
    setContinuation(null);
  };

  const downloadFile = (type: 'txt' | 'md') => {
    const blob = new Blob([project.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title || 'escrito'}.${type} `;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const title = file.name.replace(/\.(txt|md)$/i, '');

      const newProject: WritingProject = {
        ...DEFAULT_PROJECT,
        id: crypto.randomUUID(),
        title: title,
        content: content,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      setProjects(prev => [newProject, ...prev]);
      setActiveProjectId(newProject.id);

      // Limpa o input para permitir selecionar o mesmo arquivo novamente se necessário
      event.target.value = '';
    };

    reader.readAsText(file);
  };

  const handleClearText = () => {
    if (!project.content.trim() && !project.title.trim()) return;
    if (confirm('Tem certeza que deseja apagar todo o conteúdo (título e texto) deste projeto? Esta ação é irreversível.')) {
      updateActiveProject({ content: '', title: '' });
    }
  };

  const handleDbUpload = async () => {
    if (!project.content.trim()) return;
    setIsUploadingDb(true);
    try {
      const response = await fetch('http://localhost:3001/api/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: project.title,
          content: project.content,
        }),
      });

      if (response.ok) {
        alert('Texto salvo no banco de dados com sucesso!');
      } else {
        const err = await response.json();
        alert(`Erro ao salvar: ${err.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Database upload error:', error);
      alert('Erro de conexão com o servidor local.');
    } finally {
      setIsUploadingDb(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#fcfaf2] overflow-hidden">
      {/* Sidebar for Navigation */}
      {!isFocusMode && (
        <aside className="w-14 border-r border-[#e8e4d9] flex flex-col items-center py-6 gap-6 bg-[#f4f1ea] z-20 relative">
          <div className="w-8 h-8 rounded-full bg-[#7b6d5b] flex items-center justify-center text-[#fcfaf2] font-serif font-bold text-lg mb-4 cursor-pointer" title="Menu Principal">
            M
          </div>

          <button
            onClick={() => setShowProjectList(!showProjectList)}
            title="Meus Projetos"
            className={`p - 2 rounded transition - colors ${showProjectList ? 'bg-[#e8e4d9] text-[#7b6d5b]' : 'text-[#7b6d5b] hover:bg-[#ece9df]'} `}
          >
            <BookOpen size={20} />
          </button>

          <button onClick={() => setIsSidebarVisible(!isSidebarVisible)} title="Alternar Painel Lateral" className="p-2 text-[#7b6d5b] hover:bg-[#ece9df] rounded transition-colors">
            <List size={20} />
          </button>

          <label title="Importar Arquivo (Backup)" className="p-2 text-[#7b6d5b] hover:bg-[#ece9df] rounded transition-colors cursor-pointer">
            <Upload size={20} />
            <input
              type="file"
              accept=".txt,.md"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button onClick={handleDbUpload} disabled={isUploadingDb} title="Salvar na Nuvem (Banco de Dados)" className={`p-2 text-[#7b6d5b] hover:bg-[#ece9df] rounded transition-colors ${isUploadingDb ? 'opacity-50' : ''}`}>
            <CloudUpload size={20} />
          </button>

          <button onClick={() => downloadFile('txt')} title="Salvar Backup (TXT)" className="p-2 text-[#7b6d5b] hover:bg-[#ece9df] rounded transition-colors">
            <Save size={20} />
          </button>

          <button onClick={() => downloadFile('md')} title="Exportar MD" className="p-2 text-[#7b6d5b] hover:bg-[#ece9df] rounded transition-colors">
            <Download size={20} />
          </button>

          <button onClick={handleClearText} title="Limpar Texto" className="p-2 text-[#7b6d5b] hover:bg-[#ece9df] rounded transition-colors">
            <Eraser size={20} />
          </button>

          <div className="mt-auto mb-4">
            <button onClick={() => setIsFocusMode(true)} title="Modo Foco" className="p-2 text-[#7b6d5b] hover:bg-[#ece9df] rounded transition-colors">
              <Maximize2 size={20} />
            </button>
          </div>

          {/* Project List Popover - Simplified */}
          {showProjectList && (
            <div className="absolute left-14 top-0 h-full w-64 bg-[#f4f1ea] border-r border-[#e8e4d9] shadow-lg p-4 flex flex-col animate-in slide-in-from-left duration-200 z-50">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-[#7b6d5b]">Meus Textos</span>
                <button onClick={handleCreateProject} className="p-1 hover:bg-[#e8e4d9] rounded text-[#7b6d5b]" title="Novo Texto">
                  <Edit3 size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {projects.map(p => (
                  <div
                    key={p.id}
                    onClick={() => { setActiveProjectId(p.id); setShowProjectList(false); }}
                    className={`p - 3 rounded border cursor - pointer transition - all group relative ${p.id === activeProjectId ? 'bg-[#fcfaf2] border-[#7b6d5b] shadow-sm' : 'bg-transparent border-transparent hover:bg-[#ece9df]'} `}
                  >
                    <p className={`font - serif text - sm font - medium ${p.id === activeProjectId ? 'text-[#333]' : 'text-[#666]'} `}>
                      {p.title || 'Sem título'}
                    </p>
                    <p className="text-[10px] text-[#999] mt-1">
                      {new Date(p.updatedAt).toLocaleDateString()}
                    </p>
                    <button
                      onClick={(e) => handleDeleteProject(p.id, e)}
                      className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 text-[#b1afa7] hover:text-red-400 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      )}

      {/* Main Editor Column */}
      <main className="flex-1 relative overflow-hidden flex flex-col bg-[#fcfaf2]">
        {isFocusMode && (
          <button
            onClick={() => setIsFocusMode(false)}
            className="absolute top-6 right-8 p-2 text-[#b1afa7] hover:text-[#7b6d5b] transition-all z-30"
          >
            <Minimize2 size={24} />
          </button>
        )}
        <div className="flex-1 h-full overflow-hidden">
          <Editor
            key={project.id} // Force re-mount on project switch
            project={project}
            onChange={handleContentChange}
            onTitleChange={handleTitleChange}
            isFocusMode={isFocusMode}
          />
        </div>
      </main>

      {/* Right Sidebar - Support Panel */}
      {!isFocusMode && isSidebarVisible && (
        <>
          {/* Resize Handle */}
          <div
            className="w-1 cursor-col-resize hover:bg-[#d1cfc7] active:bg-[#7b6d5b] transition-colors z-40 bg-transparent"
            onMouseDown={startResizing}
          />
          <aside
            className="border-l border-[#e8e4d9] bg-[#f4f1ea] flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-300"
            style={{ width: `${sidebarWidth}px` }}
          >
            <div className="p-4 border-b border-[#e8e4d9] bg-[#fcfaf2] flex items-center justify-between">
              <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#7b6d5b]">Mesa de Apoio</h2>
              <div className="flex gap-2">
                <span
                  className={`w - 2 h - 2 rounded - full transition - colors ${navigator.onLine ? 'bg-green-200' : 'bg-orange-300'} `}
                  title={navigator.onLine ? "Online" : "Modo Offline (Funcionalidades Limitadas)"}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Métricas do Texto */}
              <Window title="Métricas do Texto" icon={<BarChart3 size={14} />} defaultOpen={true}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#fcfaf2] border border-[#e8e4d9] p-2 rounded">
                      <span className="text-[8px] text-[#999] uppercase font-bold tracking-wider block">Palavras</span>
                      <span className="text-sm font-semibold text-[#555]">{metrics.words}</span>
                    </div>
                    <div className="bg-[#fcfaf2] border border-[#e8e4d9] p-2 rounded">
                      <span className="text-[8px] text-[#999] uppercase font-bold tracking-wider block">Parágrafos</span>
                      <span className="text-sm font-semibold text-[#555]">{metrics.paragraphs}</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] text-[#999] uppercase font-bold tracking-wider flex items-center gap-1">
                        <Target size={10} /> Meta de Escrita
                      </span>
                      <span className="text-[10px] text-[#7b6d5b] font-bold">{Math.round(metrics.progress)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#ece9df] rounded-full overflow-hidden border border-[#e8e4d9]">
                      <div
                        className="h-full bg-[#7b6d5b] transition-all duration-1000"
                        style={{ width: `${metrics.progress}% ` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <input
                        type="number"
                        value={project.wordGoal}
                        onChange={(e) => handleGoalChange(e.target.value)}
                        className="w-16 bg-transparent border-b border-[#d1cfc7] text-[10px] font-mono focus:outline-none focus:border-[#7b6d5b]"
                      />
                      <span className="text-[9px] text-[#aaa]">objetivo de palavras</span>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-[#e8e4d9] pt-3">
                    <div className="flex items-center gap-2 text-[#7b6d5b]">
                      <Clock size={12} className="opacity-50" />
                      <span className="text-[10px] uppercase tracking-wider font-medium">Tempo de leitura:</span>
                      <span className="text-[10px] font-bold">~{metrics.readingTime} min</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#7b6d5b]">
                      <Calendar size={12} className="opacity-50" />
                      <span className="text-[10px] uppercase tracking-wider font-medium">Início:</span>
                      <span className="text-[10px] font-bold">{new Date(project.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#7b6d5b]">
                      <History size={12} className="opacity-50" />
                      <span className="text-[10px] uppercase tracking-wider font-medium">Última edição:</span>
                      <span className="text-[10px] font-bold">{new Date(project.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              </Window>

              {/* Sopro Criativo (Continue Text) */}
              <Window title="Sopro Criativo" icon={<Sparkles size={14} />}>
                <p className="text-[10px] text-[#999] mb-4 leading-relaxed uppercase tracking-wider">
                  Utilize este recurso para superar bloqueios ou explorar novas direções sugeridas pelo co-autor digital.
                </p>
                <button
                  onClick={handleContinueText}
                  disabled={isContinuing || !project.content.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 border border-[#d1cfc7] rounded text-[10px] uppercase font-bold tracking-widest hover:bg-[#ece9df] transition-colors disabled:opacity-30 text-[#7b6d5b]"
                >
                  {isContinuing ? (
                    <span className="animate-pulse">Ouvindo o texto...</span>
                  ) : (
                    <>
                      <Sparkles size={12} />
                      Continuar Texto
                    </>
                  )}
                </button>

                {continuation && (
                  <div className="mt-4 p-4 bg-[#fcfaf2] border border-[#e8e4d9] rounded animate-in fade-in duration-500 relative group">
                    <button
                      onClick={() => setContinuation(null)}
                      className="absolute top-2 right-2 text-[#b1afa7] hover:text-[#7b6d5b] opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Fechar sugestão"
                    >
                      <X size={12} />
                    </button>
                    <p className="text-xs italic leading-relaxed text-[#666] serif-text pr-4">
                      "...{continuation}"
                    </p>
                    <button
                      onClick={insertContinuation}
                      className="mt-4 w-full py-1.5 bg-[#ece9df] text-[#7b6d5b] text-[9px] uppercase font-bold tracking-widest rounded hover:bg-[#d1cfc7] transition-colors flex items-center justify-center gap-1"
                    >
                      Incorporar ao texto <ChevronRight size={10} />
                    </button>
                  </div>
                )}
              </Window>

              {/* Library / Biblioteca */}
              <Window title="Biblioteca" icon={<Library size={14} />}>
                <form onSubmit={handleSearchLibrary} className="mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={libQuery}
                      onChange={(e) => setLibQuery(e.target.value)}
                      placeholder="Pesquisar nos arquivos..."
                      className="w-full bg-[#fcfaf2] border border-[#e8e4d9] rounded px-3 py-2 pr-8 text-xs focus:outline-none focus:border-[#7b6d5b]"
                    />
                    <button type="submit" className="absolute right-2 top-2 text-[#b1afa7] hover:text-[#7b6d5b]">
                      <Search size={14} />
                    </button>
                  </div>
                </form>
                {isLibLoading ? (
                  <div className="text-[10px] italic text-[#999] text-center py-4">Buscando na estante...</div>
                ) : libResults && (
                  <div className="space-y-4 relative group">
                    <button
                      onClick={() => { setLibResults(null); setLibQuery(''); }}
                      className="absolute top-0 right-0 text-[#b1afa7] hover:text-[#7b6d5b] opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Limpar busca"
                    >
                      <X size={12} />
                    </button>
                    {libResults.length === 0 ? (
                      <p className="text-[10px] text-[#999] text-center">Nenhuma referência encontrada.</p>
                    ) : (
                      <div className="space-y-3">
                        {libResults.map((match, i) => (
                          <div key={i} className="bg-[#fcfaf2] border border-[#e8e4d9] p-2 rounded">
                            <span className="text-[9px] uppercase font-bold text-[#7b6d5b] mb-1 block">{match.source}</span>
                            <p className="text-[11px] leading-relaxed text-[#555] font-serif">
                              {match.content.length > 150 ? match.content.substring(0, 150) + '...' : match.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Window>

              {/* Linguistic / Dictionary */}
              <Window title="Consulta Semântica" icon={<Search size={14} />}>
                <form onSubmit={handleSearchWord} className="mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={wordQuery}
                      onChange={(e) => setWordQuery(e.target.value)}
                      placeholder="Defina uma palavra..."
                      className="w-full bg-[#fcfaf2] border border-[#e8e4d9] rounded px-3 py-2 pr-8 text-xs focus:outline-none focus:border-[#7b6d5b]"
                    />
                    <button type="submit" className="absolute right-2 top-2 text-[#b1afa7] hover:text-[#7b6d5b]">
                      <Search size={14} />
                    </button>
                  </div>
                </form>
                {isDictLoading ? (
                  <div className="text-[10px] italic text-[#999] text-center py-4">Consultando fontes...</div>
                ) : dictResult && (
                  <div className="space-y-3 relative group">
                    <button
                      onClick={() => { setDictResult(null); setWordQuery(''); }}
                      className="absolute top-0 right-0 text-[#b1afa7] hover:text-[#7b6d5b] opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Limpar consulta"
                    >
                      <X size={12} />
                    </button>
                    <p className="font-semibold text-[#333] italic capitalize pr-4">{dictResult.word}</p>

                    {dictResult.didYouMean && dictResult.didYouMean.length > 0 ? (
                      <div className="bg-[#ece9df] p-2 rounded">
                        <p className="text-[9px] uppercase tracking-wider text-[#7b6d5b] mb-1">Você quis dizer?</p>
                        <div className="flex flex-wrap gap-1">
                          {dictResult.didYouMean.map(sug => (
                            <button
                              key={sug}
                              onClick={() => { setWordQuery(sug); handleSearchWord({ preventDefault: () => { } } as any); }}
                              className="px-2 py-1 bg-[#fcfaf2] border border-[#d1cfc7] rounded text-[10px] text-[#555] hover:border-[#7b6d5b] transition-colors"
                            >
                              {sug}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs leading-relaxed">{dictResult.definition}</p>
                        {dictResult.etymology && (
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-[#999]">Etimologia</span>
                            <p className="text-[11px] italic mt-1">{dictResult.etymology}</p>
                          </div>
                        )}
                        {dictResult.synonyms.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {dictResult.synonyms.slice(0, 5).map(s => (
                              <span key={s} className="px-1.5 py-0.5 bg-[#ece9df] rounded text-[10px] text-[#7b6d5b]">{s}</span>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </Window>

              {/* Rhyme Tool */}
              <Window title="Métrica e Rimas" icon={<Music size={14} />}>
                <form onSubmit={handleSearchRhyme} className="mb-4">
                  <input
                    type="text"
                    value={rhymeQuery}
                    onChange={(e) => setRhymeQuery(e.target.value)}
                    placeholder="Rimar com..."
                    className="w-full bg-[#fcfaf2] border border-[#e8e4d9] rounded px-3 py-2 text-xs focus:outline-none focus:border-[#7b6d5b]"
                  />
                </form>
                {isRhymeLoading ? (
                  <div className="text-[10px] italic text-[#999] text-center py-4">Sintonizando métrica...</div>
                ) : rhymeResult && (
                  <div className="space-y-4 relative group">
                    <button
                      onClick={() => { setRhymeResult(null); setRhymeQuery(''); }}
                      className="absolute top-0 right-0 text-[#b1afa7] hover:text-[#7b6d5b] opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Limpar rimas"
                    >
                      <X size={12} />
                    </button>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="flex flex-col">
                        <span className="text-[#999]">SÍLABAS</span>
                        <select
                          value={rhymeFilter.syllables}
                          onChange={(e) => setRhymeFilter({ ...rhymeFilter, syllables: parseInt(e.target.value) })}
                          className="bg-transparent border-b border-[#e8e4d9] py-1"
                        >
                          <option value={0}>Todas</option>
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                          <option value={4}>4+</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pr-4">
                      {rhymeResult.rhymes
                        .filter(r => rhymeFilter.syllables === 0 || r.syllables === 0 || r.syllables === rhymeFilter.syllables) // Fallback 0 para offline
                        .map((r, i) => (
                          <div key={i} className="flex flex-col p-2 bg-[#fcfaf2] border border-[#e8e4d9] rounded w-[calc(50%-4px)]">
                            <span className="text-xs font-medium text-[#333]">{r.word}</span>
                            <div className="flex justify-between mt-1 text-[8px] text-[#aaa] uppercase font-bold">
                              <span>{r.type}</span>
                              {r.tonicity && <span>{r.tonicity}</span>}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </Window>

              {/* Literary Reference */}
              <Window title="Referências Literárias" icon={<BookOpen size={14} />}>
                <form onSubmit={handleSearchLit} className="mb-4">
                  <input
                    type="text"
                    value={litQuery}
                    onChange={(e) => setLitQuery(e.target.value)}
                    placeholder="Autor, movimento ou obra..."
                    className="w-full bg-[#fcfaf2] border border-[#e8e4d9] rounded px-3 py-2 text-xs focus:outline-none focus:border-[#7b6d5b]"
                  />
                </form>
                {isLitLoading ? (
                  <div className="text-[10px] italic text-[#999] text-center py-4">Explorando arquivos...</div>
                ) : litResult && (
                  <div className="space-y-3 relative group">
                    <button
                      onClick={() => { setLitResult(null); setLitQuery(''); }}
                      className="absolute top-0 right-0 text-[#b1afa7] hover:text-[#7b6d5b] opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Limpar referência"
                    >
                      <X size={12} />
                    </button>
                    <p className="font-semibold text-[#333] text-sm pr-4">{litResult.author}</p>
                    <div className="flex gap-2 text-[10px] text-[#7b6d5b] font-bold">
                      <span>{litResult.period}</span>
                      <span className="text-[#d1cfc7]">|</span>
                      <span>{litResult.style}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-[#999]">Principais Obras</span>
                      <ul className="list-disc list-inside text-xs mt-1 space-y-0.5">
                        {litResult.works.map(w => <li key={w}>{w}</li>)}
                      </ul>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {litResult.themes.map(t => (
                        <span key={t} className="px-1.5 py-0.5 border border-[#e8e4d9] rounded text-[9px] text-[#999]">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </Window>

              {/* Versioning & Spelling Feedback */}
              <Window title="Revisão e Notas" icon={<Edit3 size={14} />}>
                <button
                  onClick={handleSpellingCheck}
                  disabled={isSpellingLoading}
                  className="w-full py-2 bg-[#7b6d5b] text-[#fcfaf2] text-[10px] uppercase font-bold tracking-widest rounded hover:bg-[#5e5345] transition-colors disabled:opacity-50"
                >
                  {isSpellingLoading ? 'Analisando...' : 'Consultar Revisor'}
                </button>

                {spellingFeedback && (
                  <div className="mt-4 p-3 bg-[#fcfaf2] border border-[#e8e4d9] rounded text-[11px] leading-relaxed text-[#666] whitespace-pre-wrap font-serif relative group">
                    <button
                      onClick={() => setSpellingFeedback(null)}
                      className="absolute top-2 right-2 text-[#b1afa7] hover:text-[#7b6d5b] opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Fechar revisão"
                    >
                      <X size={12} />
                    </button>
                    {spellingFeedback}
                  </div>
                )}

                <div className="mt-6 border-t border-[#e8e4d9] pt-4">
                  <div className="flex items-center gap-2 text-[#999] mb-3">
                    <History size={12} />
                    <span className="text-[9px] uppercase tracking-widest">Versões Recentes</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] p-2 hover:bg-[#ece9df] rounded cursor-pointer transition-colors group">
                      <span className="text-[#777]">Versão Atual</span>
                      <span className="text-[#bbb] group-hover:text-[#999]">{new Date(project.updatedAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              </Window>
            </div>

            {/* Footer Info */}
            <div className="p-3 bg-[#ece9df] border-t border-[#e8e4d9] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TypeIcon size={12} className="text-[#999]" />
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-[#999] uppercase tracking-tighter">Salvo:</span>
                  <span className="text-[9px] font-bold text-[#7b6d5b]">{new Date(project.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>
              </div>
              <span className="text-[9px] text-[#999]">v1.0.8</span>
            </div>
          </aside>
        </>
      )}
    </div>
  );
};

export default App;
