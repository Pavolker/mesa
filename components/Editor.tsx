
import React, { useState, useEffect, useRef } from 'react';
import { WritingProject } from '../types';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface EditorProps {
  project: WritingProject;
  onChange: (content: string) => void;
  onTitleChange: (title: string) => void;
  isFocusMode: boolean;
}

const Editor: React.FC<EditorProps> = ({ project, onChange, onTitleChange, isFocusMode }) => {
  const [stats, setStats] = useState({ words: 0, chars: 0, paragraphs: 0 });
  const [zoom, setZoom] = useState(100); // 100% default
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const text = project.content.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const chars = text.length;
    const paragraphs = text ? text.split(/\n+/).length : 0;
    setStats({ words, chars, paragraphs });
  }, [project.content]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') {
        e.preventDefault();
        insertMarkdown('**', '**');
      } else if (e.key === 'i') {
        e.preventDefault();
        insertMarkdown('*', '*');
      }
    }
  };

  const insertMarkdown = (prefix: string, suffix: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selected = text.substring(start, end);
    const before = text.substring(0, start);
    const after = text.substring(end);
    const newValue = `${before}${prefix}${selected}${suffix}${after}`;
    onChange(newValue);

    // Reset cursor
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const adjustZoom = (delta: number) => {
    setZoom(prev => Math.min(Math.max(prev + delta, 50), 200));
  };

  return (
    <div className={`flex flex-col h-full transition-all duration-500 ease-in-out ${isFocusMode ? 'max-w-4xl mx-auto' : 'w-full'}`}>
      <div className="flex-1 overflow-y-auto px-8 md:px-16 py-12">
        <input
          type="text"
          value={project.title}
          placeholder="Sem título"
          onChange={(e) => onTitleChange(e.target.value)}
          style={{ fontSize: `${3 * (zoom / 100)}rem` }}
          className="w-full serif-text font-semibold bg-transparent border-none outline-none mb-10 text-[#444] placeholder-[#ccc]"
        />
        <textarea
          ref={textareaRef}
          value={project.content}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Comece a sua história..."
          style={{ fontSize: `${1.5 * (zoom / 100)}rem` }}
          className="w-full h-full min-h-[70vh] leading-loose serif-text bg-transparent border-none outline-none resize-none text-[#333] placeholder-[#d1cfc7]"
          autoFocus
        />
      </div>

      <div className="h-10 border-t border-[#e8e4d9] flex items-center justify-between px-6 text-[10px] uppercase tracking-widest text-[#999] bg-[#fcfaf2]">
        <div className="flex gap-4">
          <span>{stats.words} PALAVRAS</span>
          <span>{stats.chars} CARACTERES</span>
          <span>{stats.paragraphs} PARÁGRAFOS</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => adjustZoom(-10)}
              className="hover:text-[#7b6d5b] transition-colors"
              title="Diminuir Zoom"
            >
              <ZoomOut size={14} />
            </button>
            <span className="w-8 text-center">{zoom}%</span>
            <button
              onClick={() => adjustZoom(10)}
              className="hover:text-[#7b6d5b] transition-colors"
              title="Aumentar Zoom"
            >
              <ZoomIn size={14} />
            </button>
          </div>
          <span>MARCAÇÃO: MD</span>
        </div>
      </div>
    </div>
  );
};

export default Editor;
