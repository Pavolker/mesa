
import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Search, Activity, BookOpen, Music, History, Edit3 } from 'lucide-react';

interface WindowProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const Window: React.FC<WindowProps> = ({ title, icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-[#e8e4d9]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#ece9df] transition-colors"
      >
        <div className="flex items-center gap-3 text-[#7b6d5b]">
          {icon}
          <span className="text-[11px] font-semibold uppercase tracking-wider">{title}</span>
        </div>
        {isOpen ? <ChevronDown size={14} className="text-[#b1afa7]" /> : <ChevronRight size={14} className="text-[#b1afa7]" />}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 overflow-y-auto max-h-[300px] text-sm text-[#555] animate-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};

export default Window;
