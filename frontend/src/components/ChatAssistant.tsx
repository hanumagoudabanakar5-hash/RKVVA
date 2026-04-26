'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, X, Send, Mic, MicOff, Volume2, 
  VolumeX, Loader2, Sparkles, BrainCircuit, Zap,
  Layers, Ghost, MoreHorizontal
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAutoSpeech, setIsAutoSpeech] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [retrievedChunks, setRetrievedChunks] = useState<any[]>([]);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        handleSendMessage(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        // Handle "network" error gracefully without crashing/showing overlay
        if (event.error === 'network') {
          console.warn('Speech Recognition: Network error. Please check your connection.');
        } else {
          console.error('Speech recognition error:', event.error);
        }
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // Load Chat History
    const loadHistory = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assistant/history`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            setMessages(data.map((m: any) => ({
              role: m.role,
              content: m.content
            })));
          }
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    };

    loadHistory();
  }, []);

  const handleSendMessage = async (text: string = input) => {
    if (!text.trim()) return;

    const userMessage: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assistant/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ 
          message: text,
          history: messages 
        }),
      });

      const data = await response.json();
      if (response.ok && data.reply) {
        const assistantMessage: Message = { role: 'assistant', content: data.reply };
        setMessages((prev) => [...prev, assistantMessage]);
        setRetrievedChunks(data.chunks || []);
        
        if (isAutoSpeech) {
          speak(data.reply);
        }
      } else {
        const errorText = data.error || "Neural link interrupted.";
        const errorMessage: Message = { 
          role: 'assistant', 
          content: `${errorText}` 
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: Message = { 
        role: 'assistant', 
        content: "Neural link interrupted. Please verify your connection to the Training Hub." 
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="fixed bottom-8 right-8 z-[9999] flex flex-col items-end pointer-events-none">
      {/* Premium Chat Interface */}
      {isOpen && (
        <div className="pointer-events-auto mb-8 w-[95vw] max-w-[1000px] h-[80vh] max-h-[800px] flex overflow-hidden animate-in slide-in-from-bottom-12 fade-in zoom-in-95 duration-700 rounded-[2.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] border border-white/10 glass-card">
          
          {/* Sidebar: Neural Memory */}
          <div className="w-64 sm:w-72 border-r border-white/5 bg-black/40 flex flex-col hidden sm:flex">
            <div className="p-6 border-b border-white/5">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Neural Memory</h3>
              <div className="flex items-center gap-2 text-primary">
                <Layers size={16} />
                <span className="text-sm font-bold">Active Context</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {retrievedChunks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <div className="w-12 h-12 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-center mb-4">
                    <BrainCircuit size={24} className="text-gray-700" />
                  </div>
                  <h5 className="text-[11px] font-black text-white uppercase mb-2">Memory Vault Empty</h5>
                  <p className="text-[10px] text-gray-600 font-medium leading-relaxed">
                    Upload training manuals in the <span className="text-primary/60">Training Hub</span> to enable AI memory and context retrieval.
                  </p>
                </div>
              ) : (
                retrievedChunks.map((chunk, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-primary/30 transition-all group">
                    <div className="flex items-center gap-2 mb-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-primary/50 group-hover:bg-primary transition-colors" />
                       <span className="text-[9px] font-black text-gray-500 uppercase tracking-tighter">Source Chunk {idx + 1}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 line-clamp-3 leading-relaxed">
                      {chunk.content}
                    </p>
                    <div className="mt-2 flex justify-end">
                       <span className="text-[8px] text-primary/40 font-mono">{(chunk.similarity * 100).toFixed(1)}% match</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 border-t border-white/5">
              <div className="flex items-center gap-3 text-gray-500">
                <BrainCircuit size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Core Status: Optimized</span>
              </div>
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col relative bg-[#09090b]/60">
            {/* Animated Glow Background behind chat */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
               <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-primary blur-[100px] rounded-full animate-pulse" />
            </div>

            {/* Futuristic Header */}
            <div className="relative z-10 p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-br from-white/[0.03] to-transparent">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-tr from-primary via-secondary to-blue-500 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                    <BrainCircuit size={24} className="text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-[#09090b] rounded-full" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-tight leading-none">Neural Assistant</h3>
                  <p className="text-[10px] text-emerald-500/70 font-black uppercase tracking-widest mt-1">Ready for uplink</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsAutoSpeech(!isAutoSpeech)}
                  className={`p-2.5 rounded-xl transition-all duration-300 border ${isAutoSpeech ? 'bg-primary/20 border-primary/40 text-primary' : 'border-white/5 text-gray-500 hover:text-white hover:bg-white/5'}`}
                  title="Auto Speech (STS)"
                >
                  {isAutoSpeech ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2.5 text-gray-500 hover:text-white hover:bg-white/5 border border-white/5 rounded-xl transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Fluid Messages Area */}
            <div className="relative z-10 flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth custom-scrollbar">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <div className="w-20 h-20 bg-white/[0.02] border border-white/5 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner animate-float-premium">
                    <Sparkles size={32} className="text-primary opacity-50" />
                  </div>
                  <h4 className="text-xl font-black text-white mb-2 tracking-tight">Neural Link Ready</h4>
                  <p className="text-[12px] text-gray-500 max-w-[240px] leading-relaxed font-medium">
                    Connected to training repository. Memory sidebar will populate with relevant context.
                  </p>
                </div>
              )}
              
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                  <div className={`relative max-w-[85%] p-4 text-sm leading-relaxed ${
                    m.role === 'user' 
                      ? 'bg-white text-black font-bold rounded-[1.5rem] rounded-tr-none' 
                      : 'glass-card bg-white/[0.04] text-gray-200 border-white/10 rounded-[1.5rem] rounded-tl-none backdrop-blur-xl'
                  }`}>
                    {m.content}
                    {m.role === 'assistant' && (
                      <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                         <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Neural Link v2.0</span>
                         <button 
                           onClick={() => speak(m.content)}
                           className="p-1 rounded-lg hover:bg-white/5 transition-colors text-gray-500 hover:text-primary"
                         >
                           <Volume2 size={12} />
                         </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="glass-card bg-white/[0.02] p-4 rounded-[1.5rem] rounded-tl-none flex gap-1.5 items-center">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* High-End Input Section */}
            <div className="relative z-10 p-6 bg-black/40 border-t border-white/5">
              <div className="flex items-center gap-3 bg-white/[0.02] border border-white/10 rounded-[1.8rem] p-2 focus-within:border-primary/50 transition-all duration-500 group">
                <button 
                  onClick={toggleListening}
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 ${isListening ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                >
                  {isListening ? (
                    <div className="voice-wave">
                      <div style={{ animationDelay: '0s' }} />
                      <div style={{ animationDelay: '0.1s' }} />
                      <div style={{ animationDelay: '0.2s' }} />
                      <div style={{ animationDelay: '0.3s' }} />
                    </div>
                  ) : <MicOff size={20} />}
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask the Neural Assistant..."
                  className="flex-1 bg-transparent border-none focus:outline-none text-sm font-medium px-1 text-white placeholder-gray-700"
                />
                <button 
                  onClick={() => handleSendMessage()}
                  disabled={isLoading || !input.trim()}
                  className="w-10 h-10 bg-white text-black rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-20 transition-all"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Neural Core Button */}
      <div className="relative flex items-center justify-center pointer-events-auto">
         {/* Orbiting Rings */}
         {!isOpen && (
           <div className="absolute w-24 h-24 border border-primary/20 rounded-full animate-ping pointer-events-none" style={{ animationDuration: '3s' }} />
         )}
         
         <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-20 h-20 rounded-[2.2rem] flex items-center justify-center shadow-[0_20px_60px_-10px_rgba(139,92,246,0.6)] transition-all duration-700 hover:scale-110 active:scale-95 relative group overflow-hidden border-2 ${isOpen ? 'bg-white border-white' : 'bg-[#09090b] border-primary/30'}`}
        >
          {/* Animated Gradient Background inside button */}
          {!isOpen && (
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-secondary/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
          )}
          
          <div className="relative z-10">
            {isOpen ? (
              <X size={36} className="text-black rotate-90 animate-in fade-in zoom-in duration-500" />
            ) : (
              <div className="relative flex items-center justify-center">
                 <div className="absolute w-12 h-12 bg-primary/20 blur-xl rounded-full animate-pulse" />
                 <BrainCircuit size={36} className="text-white group-hover:text-primary transition-colors duration-500" />
              </div>
            )}
          </div>
          
          {!isOpen && (
            <div className="absolute top-5 right-5 w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,1)]" />
          )}
        </button>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.5);
        }
        @keyframes wave {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.5); }
        }
        .voice-wave {
          display: flex;
          align-items: center;
          gap: 2px;
        }
        .voice-wave div {
          width: 2px;
          height: 10px;
          background: white;
          border-radius: 2px;
          animation: wave 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
