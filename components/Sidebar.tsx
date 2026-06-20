
import React from 'react';
import { AppView } from '../types';
import { ICONS } from '../constants';

interface SidebarProps {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  onNewChat: () => void;
  onTagClick: (tag: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange, onNewChat, onTagClick }) => {
  const navItems = [
    { id: AppView.CHAT, label: 'Ethikon Chat', icon: <ICONS.Chat /> },
    { id: AppView.KNOWLEDGE, label: 'Legal Knowledge', icon: <ICONS.Library /> },
    { id: AppView.TEMPLATES, label: 'Document Vault', icon: <ICONS.File /> },
  ];

  return (
    <aside className="w-64 h-full bg-[#171717] flex flex-col shrink-0 hidden md:flex border-r border-[#262626]">
      {/* Top Section */}
      <div className="p-3.5">
        <button 
          onClick={onNewChat}
          className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg hover:bg-[#2f2f2f] transition-colors group"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center text-black text-[10px] font-bold">E</div>
            <span>New Chat</span>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500 group-hover:text-zinc-300"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 px-3 py-2 space-y-6 overflow-y-auto custom-scrollbar">
        <div>
          <p className="px-3 text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Workspace</p>
          <nav className="space-y-0.5">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeView === item.id 
                  ? 'bg-[#2f2f2f] text-white' 
                  : 'text-zinc-400 hover:bg-[#2f2f2f] hover:text-white'
                }`}
              >
                <span className="shrink-0 scale-90">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div>
          <button 
            onClick={() => onViewChange(AppView.KNOWLEDGE)}
            className="w-full text-left px-3 text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2 hover:text-zinc-300 transition-colors"
          >
            Knowledge Areas
          </button>
          <div className="space-y-0.5">
            {['SAFEs & Notes', 'Formation DE', 'Equity Splits'].map((tag) => (
              <button 
                key={tag} 
                onClick={() => onTagClick(tag)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-zinc-500 hover:bg-[#2f2f2f] hover:text-zinc-300 transition-colors truncate"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Profile Section */}
      <div className="p-3 border-t border-[#262626]">
        <button 
          onClick={() => onViewChange(AppView.SETTINGS)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300 hover:bg-[#2f2f2f] transition-colors"
        >
          <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-bold">JD</div>
          <span className="flex-1 text-left font-medium">Founder Access</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
