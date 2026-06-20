
import React from 'react';
import { TEMPLATES, ICONS } from '../constants';
import { Template } from '../types';

interface TemplateSectionProps {
  onTemplateSelect?: (template: Template) => void;
}

const TemplateSection: React.FC<TemplateSectionProps> = ({ onTemplateSelect }) => {
  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-white tracking-tight mb-4">Resource Vault</h1>
          <p className="text-zinc-400 text-lg">Download standard, battle-tested legal frameworks internalized by Ethikon.</p>
        </header>

        <div className="bg-[#171717] border border-[#262626] rounded-2xl overflow-hidden mb-20">
          <div className="grid grid-cols-1 divide-y divide-[#262626]">
            {TEMPLATES.map((doc) => (
              <div key={doc.id} className="p-6 flex items-center justify-between hover:bg-[#212121] transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#262626] flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
                    <ICONS.File />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{doc.category}</span>
                    <h3 className="font-semibold text-white text-lg leading-tight">{doc.title}</h3>
                    <p className="text-xs text-zinc-500 mt-1">{doc.description}</p>
                  </div>
                </div>
                <button 
                  onClick={() => onTemplateSelect?.(doc)}
                  className="px-5 py-2.5 bg-white text-black text-xs font-bold rounded-xl hover:bg-zinc-200 transition-colors shadow-sm"
                >
                  GET ACCESS
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateSection;
