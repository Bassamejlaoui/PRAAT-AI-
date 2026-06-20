
import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { ICONS, SUGGESTED_PROMPTS } from '../constants';
import { gemini } from '../services/gemini';

interface ChatWindowProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  initialPrompt?: string | null;
  onPromptHandled?: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, setMessages, initialPrompt, onPromptHandled }) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleSend = async (customInput?: string) => {
    const textToSend = customInput || input;
    if (!textToSend.trim() || isTyping) return;

    const userMsg: Message = { role: 'user', content: textToSend, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const modelMsg: Message = { role: 'model', content: '', timestamp: new Date() };
    setMessages(prev => [...prev, modelMsg]);

    let fullResponse = '';
    try {
      // Pass the *updated* history (messages + userMsg) if you want full context, 
      // but the gemini service adds the history internally from the array passed.
      const currentHistory = [...messages]; 
      const stream = gemini.chatStream(currentHistory, textToSend);
      for await (const chunk of stream) {
        if (chunk) {
          fullResponse += chunk;
          setMessages(prev => {
            const last = [...prev];
            last[last.length - 1] = { ...last[last.length - 1], content: fullResponse };
            return last;
          });
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsTyping(false);
    }
  };

  // Process initial prompt if passed from another view
  useEffect(() => {
    if (initialPrompt) {
      handleSend(initialPrompt);
      if (onPromptHandled) onPromptHandled();
    }
  }, [initialPrompt]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Centered Content Thread */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar"
      >
        <div className="max-w-3xl mx-auto px-6 pt-12 pb-48">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 animate-fade-up">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-black font-black text-2xl mb-6">E</div>
              <h1 className="text-3xl font-semibold text-white mb-8 tracking-tight">How can I assist your startup today?</h1>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(prompt)}
                    className="p-4 bg-[#171717] border border-[#262626] rounded-xl text-left hover:bg-[#212121] transition-colors text-sm text-zinc-300"
                  >
                    <p className="font-medium">{prompt}</p>
                    <p className="text-[11px] text-zinc-500 mt-1">Legal Co-Pilot Guidance</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-12">
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className="animate-fade-up group"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                      msg.role === 'model' 
                      ? 'bg-zinc-800 text-white border-zinc-700' 
                      : 'bg-indigo-600 text-white border-indigo-500'
                    }`}>
                      {msg.role === 'model' ? <span className="font-bold text-xs leading-none">E</span> : <span className="text-xs">U</span>}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold text-zinc-500 mb-1 tracking-wider uppercase">
                        {msg.role === 'model' ? 'Ethikon AI' : 'You'}
                      </div>
                      <div className="text-[15px] leading-[1.6] text-[#d1d1d1] whitespace-pre-wrap">
                        {msg.content || (isTyping && idx === messages.length - 1 ? (
                          <div className="flex gap-1.5 py-2">
                            <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-pulse"></div>
                            <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-pulse delay-100"></div>
                            <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-pulse delay-200"></div>
                          </div>
                        ) : '')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Capsule Input - Sticky to bottom center */}
      <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-none">
        <div className="max-w-3xl mx-auto pointer-events-auto">
          <div className="relative bg-[#171717] border border-[#262626] rounded-[26px] p-2 shadow-2xl">
            <div className="flex items-end">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Ethikon anything..."
                className="w-full bg-transparent border-none px-4 py-3 text-[15px] text-white placeholder-zinc-500 focus:ring-0 outline-none resize-none max-h-48 custom-scrollbar"
                style={{ height: 'auto' }}
              />
              <button 
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
                className={`p-2 rounded-full transition-all flex items-center justify-center mb-1 mr-1 ${
                  input.trim() && !isTyping ? 'bg-white text-black' : 'bg-[#2f2f2f] text-[#4f4f4f]'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
              </button>
            </div>
          </div>
          <p className="text-center text-[10px] text-zinc-600 mt-3 font-medium">
            Ethikon AI can make mistakes. Check important legal information.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
