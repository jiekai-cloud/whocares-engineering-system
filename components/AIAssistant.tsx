
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Bot, Loader2, Sparkles, PieChart, Search, Link as LinkIcon, Gavel, Coins, Mic, MicOff } from 'lucide-react';
import { getProjectInsights, getPortfolioAnalysis, searchEngineeringKnowledge, parseVoiceCommand } from '../services/geminiService';
import { Project, Message } from '../types';

interface AIAssistantProps {
  projects: Project[];
  onAddProject?: (data: any) => void;
  onProjectClick?: (id: string) => void;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ projects, onAddProject, onProjectClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<(Message & { chunks?: any[] })[]>([
    { role: 'assistant', content: '您好！我是生活品質工程管理系統的智慧營造顧問。我可以幫您分析案場風險、查詢營造法規或市場最新建材報價。' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("您的瀏覽器不支援語音辨識功能，請使用 Chrome 或 Safari。");
      return;
    }

    // Stop if already started
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'zh-TW';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setInput(text);
      handleSendMessage(text, true); // True indicating voice input
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Dragging Logic
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, initialX: 0, initialY: 0, hasMoved: false });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current.isDragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        dragRef.current.hasMoved = true;
      }

      setPosition({
        x: dragRef.current.initialX + dx,
        y: dragRef.current.initialY + dy
      });
    };

    const handleMouseUp = () => {
      dragRef.current.isDragging = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!dragRef.current.isDragging) return;
      const touch = e.touches[0];
      const dx = touch.clientX - dragRef.current.startX;
      const dy = touch.clientY - dragRef.current.startY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        dragRef.current.hasMoved = true;
      }

      setPosition({
        x: dragRef.current.initialX + dx,
        y: dragRef.current.initialY + dy
      });
    };

    const handleTouchEnd = () => {
      dragRef.current.isDragging = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
      hasMoved: false
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    dragRef.current = {
      isDragging: true,
      startX: touch.clientX,
      startY: touch.clientY,
      initialX: position.x,
      initialY: position.y,
      hasMoved: false
    };
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen, isLoading]);

  const handleSendMessage = async (text?: string, isVoice = false) => {
    const messageText = text || input;
    if (!messageText.trim() || isLoading) return;

    setMessages(prev => [...prev, { role: 'user', content: messageText }]);
    setInput('');
    setIsLoading(true);

    try {
      let result;

      // 1. 如果是語音輸入，優先解析意圖
      if (isVoice) {
        const intentResult = await parseVoiceCommand(messageText);

        if (intentResult.intent === 'CREATE_PROJECT' && onAddProject) {
          // Trigger Add Project
          onAddProject(intentResult.data);
          result = { text: intentResult.response || "沒問題，正在為您開啟新增案件視窗並帶入資料。" };
        } else if (intentResult.intent === 'QUERY_PROJECT') {
          const keyword = intentResult.data?.keywords;
          const target = projects.find(p => p.name.includes(keyword) || p.clientName?.includes(keyword));

          if (target && onProjectClick) {
            onProjectClick(target.id);
            result = { text: `找到案件「${target.name}」，正帶您前往...` };
          } else {
            result = { text: `抱歉，找不到關鍵字為「${keyword}」的案件。` };
          }
        } else {
          // Fallback to General Chat
          result = { text: intentResult.response };
        }
      }
      // 2. 一般文字指令處理
      else if (messageText === '全案場風險報告') {
        result = await getPortfolioAnalysis(projects);
      } else if (messageText.includes('法規') || messageText.includes('價格') || messageText.includes('行情') || messageText.includes('查詢')) {
        result = await searchEngineeringKnowledge(messageText);
      } else {
        result = await getProjectInsights(projects[0], messageText);
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.text || "無法獲取建議。",
        chunks: result.chunks
      }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: "發生意外錯誤或無法連線 AI 服務。" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed bottom-4 right-4 lg:bottom-6 lg:right-6 z-50 transition-transform duration-75 ease-out will-change-transform"
      style={{
        transform: (isOpen && window.innerWidth < 640)
          ? 'none'
          : `translate(${position.x}px, ${position.y}px)`
      }}
    >
      {!isOpen && (
        <button
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onClick={() => {
            if (!dragRef.current.hasMoved) setIsOpen(true);
          }}
          className="w-14 h-14 bg-stone-900 text-white rounded-2xl flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95 group border-2 border-orange-600/20"
        >
          <div className="absolute inset-0 bg-orange-600 rounded-2xl animate-ping opacity-20 group-hover:opacity-40"></div>
          <Bot size={28} className="relative z-10" />
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:right-6 sm:bottom-6 bg-white sm:w-[450px] sm:h-[650px] sm:rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-stone-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
          {/* Header */}
          <div
            className="bg-stone-900 text-white p-5 flex items-center justify-between shrink-0 cursor-move"
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-600 rounded-xl">
                <Bot size={20} className="text-white" />
              </div>
              <div>
                <p className="font-black text-sm tracking-tight">生活品質 AI 營運顧問</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Warm Insight</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              onMouseDown={(e) => e.stopPropagation()}
              className="text-stone-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Chat Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-stone-50/30 scroll-smooth">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                  ? 'bg-orange-600 text-white rounded-tr-none font-medium'
                  : 'bg-white text-stone-800 border border-stone-100 rounded-tl-none'
                  }`}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {/* Render grounding links if they exist */}
                  {msg.chunks && msg.chunks.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap gap-2">
                      {msg.chunks.map((link, i) => (
                        <a
                          key={i}
                          href={link.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 bg-stone-50 hover:bg-stone-100 text-blue-600 text-[10px] font-bold px-2 py-1 rounded-lg border border-stone-200 transition-colors"
                        >
                          <LinkIcon size={10} /> {link.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-stone-400 mt-1 font-black uppercase tracking-tighter">
                  {msg.role === 'user' ? 'You' : '生活品質 AI'}
                </span>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-stone-100 p-4 rounded-2xl rounded-tl-none flex items-center gap-3 text-stone-400 shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-orange-600 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-orange-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-orange-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                  <span className="text-[10px] font-black italic uppercase tracking-widest">暖心思考中...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Action Chips */}
          <div className="px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar border-t border-stone-100 bg-white shrink-0">
            <button
              onClick={() => handleSendMessage('全案場風險報告')}
              className="flex items-center gap-1.5 bg-orange-50 text-orange-700 border border-orange-100 px-3 py-1.5 rounded-xl text-[10px] font-black whitespace-nowrap hover:bg-orange-100 transition-colors"
            >
              <PieChart size={12} /> 風險報告
            </button>
            <button
              onClick={() => handleSendMessage('查詢最新室內裝修消防法規')}
              className="flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-100 px-3 py-1.5 rounded-xl text-[10px] font-black whitespace-nowrap hover:bg-amber-100 transition-colors"
            >
              <Gavel size={12} /> 法規檢索
            </button>
          </div>

          {/* Input Area */}
          <div className="p-5 bg-white border-t border-stone-100 flex items-center gap-3 shrink-0">
            <button
              onClick={startListening}
              className={`p-3 rounded-full transition-all ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="輸入問題或指令..."
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl pl-4 pr-12 py-3.5 text-sm font-bold text-black outline-none focus:ring-2 focus:ring-orange-500/20 transition-all placeholder:text-stone-400"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={isLoading || !input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:opacity-20 transition-all active:scale-90"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
