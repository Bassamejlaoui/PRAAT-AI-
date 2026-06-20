
import React from 'react';
import { LEGAL_KNOWLEDGE, ICONS } from '../constants';

interface KnowledgeBaseProps {
  onTopicSelect?: (topicTitle: string) => void;
}

const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ onTopicSelect }) => {
  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <header className="mb-12 border-b border-[#262626] pb-8">
          <h1 className="text-4xl font-bold text-white tracking-tight mb-4">Ethikon Core Knowledge</h1>
          <p className="text-zinc-400 text-lg">
            Internalized operating procedures and insights for startup legal structures. Click a topic to explore details with Ethikon.
          </p>
        </header>

        <div className="space-y-12 pb-20">
          {LEGAL_KNOWLEDGE.map((topic) => (
            <div 
              key={topic.id} 
              className="group cursor-pointer"
              onClick={() => onTopicSelect?.(topic.title)}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded bg-[#171717] border border-[#262626] flex items-center justify-center text-zinc-400 group-hover:text-blue-500 transition-colors">
                  <ICONS.Library />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{topic.category}</span>
                  <h2 className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors leading-tight">
                    {topic.title}
                  </h2>
                </div>
              </div>
              <p className="text-zinc-400 mb-6 leading-relaxed group-hover:text-zinc-300 transition-colors">
                {topic.summary}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {topic.keyInsights.map((insight, i) => (
                  <div key={i} className="flex gap-3 items-start bg-[#171717] p-3.5 rounded-xl border border-[#262626] group-hover:border-[#3f3f3f] transition-all">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                    <span className="text-sm text-zinc-300 font-medium">{insight}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 flex items-center gap-2 text-xs text-blue-500 font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Discuss with Ethikon AI</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;
