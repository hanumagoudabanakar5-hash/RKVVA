"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut, BrainCircuit, Trophy, RotateCcw, ChevronRight,
  CheckCircle2, XCircle, BookOpen, Star, Zap, Target, Clock,
  Award, Flame, Sparkles, TrendingUp, User, LayoutDashboard,
  Timer, Loader2, Shield, Gem
} from "lucide-react";
import ChatAssistant from "@/components/ChatAssistant";

type Question = {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  approved: boolean;
};

type QuizState = "idle" | "playing" | "results";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001";

export default function StaffDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Quiz state
  const [quizState, setQuizState] = useState<QuizState>("idle");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<(string | null)[]>([]);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [isReviewing, setIsReviewing] = useState(false);

  // Gamification state
  const [profile, setProfile] = useState<{ xp: number; level: number; levelName: string; streak: number } | null>(null);
  const [xpResult, setXpResult] = useState<any>(null);
  const [submittingXp, setSubmittingXp] = useState(false);

  // AUTH GUARD
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(storedUser);
    setUser(parsed);
    initProfile(parsed);
    fetchLessonQuestions();
  }, [router]);

  const LEVELS = [
    { level: 1, name: 'Trainee',        min: 0,   max: 100  },
    { level: 2, name: 'Knowledge Seeker', min: 101, max: 300  },
    { level: 3, name: 'Service Artist',  min: 301, max: 600  },
    { level: 4, name: 'Grand Master',    min: 601, max: null as null },
  ];

  const getXpInfo = (xp: number) => {
    const tier = [...LEVELS].reverse().find(l => xp >= l.min) ?? LEVELS[0];
    if (tier.max === null) return { ...tier, pct: 100, xpInLevel: xp - tier.min, rangeSize: null };
    const rangeSize = tier.max - tier.min;
    const xpInLevel = xp - tier.min;
    return { ...tier, pct: Math.min(100, Math.round((xpInLevel / rangeSize) * 100)), xpInLevel, rangeSize };
  };

  const initProfile = (u: any) =>
    setProfile({ xp: u.xp ?? 0, level: u.level ?? 1, levelName: getXpInfo(u.xp ?? 0).name, streak: u.streak ?? 0 });

  const getAuthHeader = (): Record<string, string> => {
    const cookies = typeof document !== 'undefined' ? document.cookie.split('; ') : [];
    const tokenCookie = cookies.find(row => row.startsWith('token='));
    return tokenCookie ? { 'Authorization': `Bearer ${tokenCookie.split('=')[1]}` } : {};
  };

  const fetchLessonQuestions = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${API_URL}/api/questions/lesson`,
        { headers: { ...getAuthHeader() } }
      );
      if (res.ok) {
        const data = await res.json();
        setQuestions(data);
        if (data.length === 0) setError("No approved questions yet. Ask your admin to approve some questions.");
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Failed to load training questions.");
      }
    } catch {
      setError("Cannot connect to the server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    localStorage.removeItem("user");
    router.push("/login");
  };

  const startQuiz = () => {
    fetchLessonQuestions();
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setUserAnswers(new Array(questions.length).fill(null));
    setIsAnswerRevealed(false);
    setScore(0);
    setIsReviewing(false);
    setQuizState("playing");
  };

  const handleSelectAnswer = (option: string) => {
    if (isAnswerRevealed) return;
    setSelectedAnswer(option);
    setIsAnswerRevealed(true);
    if (option === questions[currentIndex].correct_answer) {
      setScore((s) => s + 1);
    }
    const newAnswers = [...userAnswers];
    newAnswers[currentIndex] = option;
    setUserAnswers(newAnswers);
  };

  const submitQuizProgress = async (answers: { question_id: string; correct: boolean }[]) => {
    if (!user?.id) return;
    setSubmittingXp(true);
    try {
      const res = await fetch(`${API_URL}/api/progress/submit`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ answers }),
      });
      if (res.ok) {
        const data = await res.json();
        setXpResult(data);
        setProfile(prev => prev ? { ...prev, xp: data.newXp, level: data.newLevel, levelName: data.levelName } : null);
        const stored = localStorage.getItem('user');
        if (stored) localStorage.setItem('user', JSON.stringify({ ...JSON.parse(stored), xp: data.newXp, level: data.newLevel }));
      }
    } catch { /* silent */ }
    finally { setSubmittingXp(false); }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setIsAnswerRevealed(false);
    } else {
      const submission = questions.map((q, i) => ({
        question_id: q.id,
        correct: userAnswers[i] === q.correct_answer,
      }));
      submitQuizProgress(submission);
      setXpResult(null);
      setQuizState("results");
    }
  };

  const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  const isPassing = percentage >= 70;
  const currentQ = questions[currentIndex];

  const getOptionStyle = (option: string) => {
    if (!isAnswerRevealed) {
      return selectedAnswer === option
        ? "border-primary bg-primary/20 text-white shadow-[0_0_30px_rgba(139,92,246,0.3)] scale-[1.02]"
        : "border-white/10 bg-white/[0.03] text-gray-400 hover:border-primary/50 hover:bg-primary/5 hover:text-white cursor-pointer";
    }
    if (option === currentQ.correct_answer) return "border-emerald-500 bg-emerald-500/20 text-emerald-200 shadow-[0_0_30px_rgba(16,185,129,0.2)]";
    if (option === selectedAnswer && option !== currentQ.correct_answer)
      return "border-red-500 bg-red-500/20 text-red-300 shadow-[0_0_30px_rgba(239,68,68,0.2)]";
    return "border-white/5 bg-black/40 text-gray-600 grayscale opacity-50";
  };

  // ── IDLE SCREEN ──────────────────────────────────────────────
  const IdleScreen = () => (
    <div className="max-w-6xl mx-auto px-6 py-12 animate-in slide-in-from-bottom-10 duration-700">
      <div className="grid lg:grid-cols-12 gap-10">
        
        {/* Left: Hero/Call to Action */}
        <div className="lg:col-span-8 space-y-8">
          <div className="glass-card p-12 relative overflow-hidden group min-h-[450px] flex flex-col justify-center bg-gradient-to-br from-primary/10 via-transparent to-secondary/5 border-primary/20">
            {/* Premium Background Pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('/premium_dark_abstract_training_bg_1777112178236.png')] bg-cover bg-center" />
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
               <BrainCircuit size={280} />
            </div>
            
            <div className="relative z-10 max-w-xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 text-primary font-black text-[10px] uppercase tracking-widest mb-8 animate-glow">
                <Sparkles size={14} /> Intelligence Platform
              </div>
              <h2 className="text-5xl font-black text-white mb-6 leading-tight text-gradient">
                Elevate Your <br />Expertise.
              </h2>
              <p className="text-gray-400 text-lg mb-10 leading-relaxed font-medium">
                Bridge the gap between service and excellence. Complete your training assessments to unlock your full potential and dominate the leaderboard.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6">
                <button
                  onClick={startQuiz}
                  disabled={questions.length === 0}
                  className="hover-lift flex items-center justify-center gap-3 px-10 py-5 bg-white text-black font-black text-xl rounded-[2rem] shadow-2xl active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed group"
                >
                  <Zap className="w-6 h-6 fill-black group-hover:animate-pulse" />
                  Initiate Training
                  <ChevronRight className="w-6 h-6 transition-transform group-hover:translate-x-1" />
                </button>
                
                <div className="flex items-center gap-4 px-6 border-l border-white/10">
                  <div>
                    <p className="text-2xl font-black text-white">{questions.length}</p>
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Active Modules</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Training Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Target, label: "Efficiency", value: "88%", color: "text-purple-400" },
              { icon: Timer, label: "Avg Time", value: "2.4m", color: "text-blue-400" },
              { icon: Shield, label: "Accuracy", value: "92%", color: "text-emerald-400" },
              { icon: Gem, label: "Milestones", value: "24", color: "text-orange-400" },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="glass-card p-8 flex flex-col items-center gap-3 hover-lift border-white/5 bg-white/[0.01]">
                <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-2 ${color}`}>
                  <Icon size={24} />
                </div>
                <span className="text-3xl font-black text-white tracking-tighter">{value}</span>
                <span className="text-[10px] uppercase tracking-widest text-gray-600 font-black">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Profile & Gamification */}
        <div className="lg:col-span-4 space-y-8">
          {profile && (() => {
            const info = getXpInfo(profile.xp);
            return (
              <div className="glass-card p-10 flex flex-col items-center text-center bg-gradient-to-b from-white/[0.04] to-transparent">
                <div className="relative mb-8">
                  <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-tr from-primary to-secondary p-1 shadow-[0_20px_50px_-10px_rgba(139,92,246,0.5)] animate-float-premium">
                    <div className="w-full h-full rounded-[2.3rem] bg-[#09090b] flex items-center justify-center text-white font-black text-4xl border-2 border-white/10">
                      {user?.name?.charAt(0).toUpperCase() || "S"}
                    </div>
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-accent p-3 rounded-2xl shadow-xl border-4 border-[#09090b] animate-bounce">
                    <Flame className="w-5 h-5 text-white" />
                  </div>
                </div>

                <h3 className="text-2xl font-black text-white mb-2">{user?.name}</h3>
                <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-gray-400 font-black uppercase tracking-widest mb-10">
                  {profile.levelName} • Level {profile.level}
                </div>

                <div className="w-full space-y-6">
                  <div className="flex justify-between items-end">
                    <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Level Progress</span>
                    <span className="text-sm font-black text-primary">{info.pct}%</span>
                  </div>
                  <div className="h-4 bg-black/60 rounded-full p-1 border border-white/5 overflow-hidden liquid-fill">
                    <div
                      className="h-full bg-gradient-to-r from-primary via-secondary to-blue-400 rounded-full transition-all duration-1000 shadow-[0_0_20px_var(--primary-glow)]"
                      style={{ width: `${info.pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-gray-600">
                    <span>{profile.xp} Total XP</span>
                    <span>Next: {info.max} XP</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full mt-10">
                  <div className="glass-card p-5 bg-white/5 hover:bg-white/10 transition-colors border-white/5">
                    <p className="text-2xl font-black text-white">{profile.streak}</p>
                    <p className="text-[9px] uppercase font-black text-gray-500 tracking-widest mt-1">Day Streak</p>
                  </div>
                  <div className="glass-card p-5 bg-white/5 hover:bg-white/10 transition-colors border-white/5">
                    <p className="text-2xl font-black text-accent">{profile.xp}</p>
                    <p className="text-[9px] uppercase font-black text-gray-500 tracking-widest mt-1">Global XP</p>
                  </div>
                </div>
              </div>
            );
          })()}
          
          <div className="glass-card p-8 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent border-emerald-500/20 group cursor-default">
             <div className="flex items-center justify-between mb-6">
               <div className="flex items-center gap-3">
                 <div className="p-2.5 bg-emerald-500/20 rounded-xl">
                   <Trophy className="w-5 h-5 text-emerald-400" />
                 </div>
                 <h4 className="font-black text-sm text-white uppercase tracking-tight">Active Challenge</h4>
               </div>
               <span className="text-[10px] font-black text-emerald-500 animate-pulse">LIVE</span>
             </div>
             <p className="text-xs text-gray-400 mb-6 leading-relaxed">
               Maintain your <span className="text-emerald-400 font-black">Daily Streak</span> to earn a multiplier on your XP rewards!
             </p>
             <div className="flex gap-2">
               {[1, 2, 3, 4, 5].map(i => (
                 <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= 3 ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-white/5"}`} />
               ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── PLAYING SCREEN ────────────────────────────────────────────
  const PlayingScreen = () => (
    <div className="max-w-4xl mx-auto w-full px-6 py-12 animate-in slide-in-from-bottom-10 duration-500">
      {/* Quiz Navigation Header */}
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-6">
           <div className="w-14 h-14 rounded-2xl glass-card flex items-center justify-center text-primary font-black text-xl shadow-2xl border-primary/20">
             {currentIndex + 1}
           </div>
           <div>
             <p className="text-[11px] uppercase font-black text-gray-600 tracking-widest mb-1">Assessment Track</p>
             <p className="text-lg font-black text-white">Question {currentIndex + 1} <span className="text-gray-600">/ {questions.length}</span></p>
           </div>
        </div>
        
        <div className="hidden sm:flex gap-3 bg-black/40 p-2.5 rounded-3xl border border-white/5">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`w-10 h-2 rounded-full transition-all duration-500 ${
                i < currentIndex
                  ? userAnswers[i] === questions[i].correct_answer
                    ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                    : "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                  : i === currentIndex
                  ? "bg-primary w-16 shadow-[0_0_15px_rgba(139,92,246,0.6)] animate-pulse"
                  : "bg-white/10"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Question Card */}
      <div className="glass-card p-16 mb-12 relative overflow-hidden min-h-[300px] flex flex-col justify-center bg-gradient-to-br from-white/[0.04] to-transparent border-t-2 border-t-primary/30">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
           <Sparkles size={180} />
        </div>
        <div className="flex items-center gap-3 mb-8">
           <div className="w-1 h-8 bg-primary rounded-full" />
           <p className="text-[11px] font-black text-primary uppercase tracking-widest">Intelligence Check</p>
        </div>
        <h3 className="text-3xl sm:text-4xl font-black text-white leading-tight relative z-10 tracking-tight">
          {currentQ.question}
        </h3>
      </div>

      {/* Options Grid */}
      <div className="grid gap-6 mb-12">
        {currentQ.options.map((option, i) => (
          <button
            key={i}
            onClick={() => handleSelectAnswer(option)}
            disabled={isAnswerRevealed}
            className={`group w-full flex items-center gap-8 p-8 rounded-3xl border-2 transition-all duration-500 text-left font-bold hover-lift ${getOptionStyle(option)}`}
          >
            <span className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-xl font-black transition-all duration-500 ${
              !isAnswerRevealed
                ? selectedAnswer === option
                  ? "bg-primary text-white scale-110 shadow-lg"
                  : "bg-white/10 text-gray-500 group-hover:bg-primary/20 group-hover:text-primary group-hover:scale-105"
                : option === currentQ.correct_answer
                ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                : option === selectedAnswer
                ? "bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)]"
                : "bg-white/5 text-gray-700"
            }`}>
              {String.fromCharCode(65 + i)}
            </span>
            <span className="flex-1 text-xl tracking-tight">{option}</span>
            {isAnswerRevealed && option === currentQ.correct_answer && <div className="p-2 bg-emerald-500/20 rounded-full animate-in zoom-in-50"><CheckCircle2 className="w-8 h-8 text-emerald-400" /></div>}
            {isAnswerRevealed && option === selectedAnswer && option !== currentQ.correct_answer && <div className="p-2 bg-red-500/20 rounded-full animate-in zoom-in-50"><XCircle className="w-8 h-8 text-red-400" /></div>}
          </button>
        ))}
      </div>

      {/* Controls */}
      {isAnswerRevealed && (
        <div className="animate-in fade-in slide-in-from-top-6 duration-700">
          <div className={`p-8 rounded-[2.5rem] mb-12 flex items-center gap-8 glass-card border-2 ${
            selectedAnswer === currentQ.correct_answer
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-red-500/30 bg-red-500/5"
          }`}>
            <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-2xl ${
               selectedAnswer === currentQ.correct_answer ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
            }`}>
              {selectedAnswer === currentQ.correct_answer ? <Gem size={32} /> : <AlertTriangle className="animate-pulse" size={32} />}
            </div>
            <div>
              <h4 className="text-xl font-black text-white mb-1">
                {selectedAnswer === currentQ.correct_answer ? "Outstanding Accuracy!" : "Concept Review Required"}
              </h4>
              <p className="text-gray-400 font-medium">
                {selectedAnswer === currentQ.correct_answer 
                  ? "Your understanding of this protocol is perfect. Continue the streak!" 
                  : <>The precise answer is <span className="text-emerald-400 font-black">{currentQ.correct_answer}</span>. Keep learning!</>}
              </p>
            </div>
          </div>

          <button
            onClick={handleNext}
            className="w-full py-6 bg-white text-black font-black text-2xl rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4"
          >
            {currentIndex < questions.length - 1 ? (
              <>Proceed to Next Module <ChevronRight className="w-8 h-8" /></>
            ) : (
              <>Finalize Assessment <Trophy className="w-8 h-8" /></>
            )}
          </button>
        </div>
      )}
    </div>
  );

  // ── RESULTS SCREEN ────────────────────────────────────────────
  const ResultsScreen = () => (
    <div className="max-w-5xl mx-auto w-full px-6 py-12 animate-in zoom-in-95 duration-1000">
      <div className="glass-card p-20 text-center relative overflow-hidden border-2 border-white/5">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent pointer-events-none" />
        
        <div className={`w-40 h-40 rounded-[3rem] mx-auto mb-12 flex items-center justify-center shadow-2xl relative z-10 animate-float-premium ${
          isPassing
            ? "bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-emerald-500/40"
            : "bg-gradient-to-tr from-red-500 to-rose-400 shadow-red-500/40"
        }`}>
          {isPassing ? <Trophy className="w-20 h-20 text-white" /> : <RotateCcw className="w-20 h-20 text-white" />}
        </div>

        <h2 className="text-8xl font-black text-white mb-4 leading-none tracking-tighter text-gradient">
          {percentage}%
        </h2>
        <p className={`text-3xl font-black mb-12 ${isPassing ? "text-emerald-400" : "text-red-400"}`}>
          {isPassing ? "MISSION SUCCESS" : "MISSION FAILED"}
        </p>
        
        <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto mb-16">
          {[
            { label: "Correct", value: score, color: "text-emerald-400" },
            { label: "Accuracy", value: `${percentage}%`, color: "text-primary" },
            { label: "Time Taken", value: "2:14", color: "text-blue-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass-card p-8 bg-white/[0.02] border-white/5">
              <p className={`text-4xl font-black ${color} tracking-tighter`}>{value}</p>
              <p className="text-[11px] uppercase font-black text-gray-600 mt-2 tracking-widest">{label}</p>
            </div>
          ))}
        </div>
        
        {/* XP Gain Visualization */}
        {(xpResult || submittingXp) && (
          <div className="max-w-md mx-auto mb-16 glass-card p-10 border-primary/30 animate-in slide-in-from-bottom-8 duration-1000">
            {submittingXp ? (
               <div className="flex flex-col items-center justify-center gap-6 py-4">
                 <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                 <span className="font-black text-primary uppercase tracking-widest text-xs">Syncing Performance Data...</span>
               </div>
            ) : xpResult && (
              <div className="space-y-10">
                <div className="flex justify-center gap-12">
                  <div className="text-center group">
                    <div className="text-5xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">+{xpResult.xpEarned}</div>
                    <div className="text-[11px] font-black text-gray-600 uppercase mt-2 tracking-widest">Base XP</div>
                  </div>
                  {xpResult.bonusXp > 0 && (
                    <div className="text-center group">
                      <div className="text-5xl font-black text-accent drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">+{xpResult.bonusXp}</div>
                      <div className="text-[11px] font-black text-gray-600 uppercase mt-2 tracking-widest">Streak Multiplier</div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                   <div className="flex justify-between text-xs font-black text-gray-400 uppercase tracking-widest">
                     <span>{xpResult.levelName}</span>
                     <span>Level {xpResult.newLevel}</span>
                   </div>
                   <div className="h-4 bg-black/60 rounded-full overflow-hidden p-1 border border-white/5 liquid-fill">
                      <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full shadow-[0_0_15px_var(--primary-glow)]" style={{ width: `${getXpInfo(xpResult.newXp).pct}%` }} />
                   </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-6 justify-center relative z-10">
          <button
            onClick={startQuiz}
            className="px-12 py-5 bg-white text-black font-black text-xl rounded-[2.5rem] hover:scale-105 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-2xl"
          >
            <RotateCcw className="w-6 h-6" /> Retake Training
          </button>
          <button
            onClick={() => setIsReviewing(!isReviewing)}
            className="px-12 py-5 glass-card text-white font-black text-xl rounded-[2.5rem] hover:bg-white/5 transition-all active:scale-95 flex items-center justify-center gap-3 border-white/10"
          >
            {isReviewing ? <XCircle size={24} /> : <BookOpen size={24} />} 
            {isReviewing ? "Close Review" : "Review Performance"}
          </button>
        </div>
      </div>

      {/* Review Section */}
      {isReviewing && (
        <div className="mt-16 space-y-8 animate-in slide-in-from-bottom-12 duration-1000">
          <div className="flex items-center justify-between px-4">
             <h3 className="text-3xl font-black text-white flex items-center gap-4 tracking-tighter">
                <LayoutDashboard className="text-primary" /> Session Intelligence
             </h3>
             <span className="text-xs font-black text-gray-600 uppercase tracking-widest">Detailed Audit</span>
          </div>
          <div className="grid gap-6">
            {questions.map((q, i) => {
              const isCorrect = userAnswers[i] === q.correct_answer;
              return (
                <div key={q.id} className={`glass-card p-10 border-l-8 transition-all hover:scale-[1.01] ${isCorrect ? "border-l-emerald-500 bg-emerald-500/[0.02]" : "border-l-red-500 bg-red-500/[0.02]"}`}>
                  <div className="flex items-start gap-8">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-2xl ${isCorrect ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
                       {isCorrect ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
                    </div>
                    <div className="flex-1">
                      <p className="text-xl font-bold text-white mb-6 leading-tight tracking-tight">{q.question}</p>
                      {!isCorrect && (
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="p-6 bg-black/40 rounded-3xl border border-white/5">
                            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Your Selection</p>
                            <p className="text-red-400 font-bold">{userAnswers[i] || "No Answer Provided"}</p>
                          </div>
                          <div className="p-6 bg-black/40 rounded-3xl border border-emerald-500/20 border-dashed">
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Required Knowledge</p>
                            <p className="text-emerald-400 font-bold">{q.correct_answer}</p>
                          </div>
                        </div>
                      )}
                      {isCorrect && (
                         <div className="p-6 bg-black/40 rounded-3xl border border-emerald-500/20 border-dashed">
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Validated Response</p>
                            <p className="text-emerald-200 font-bold">{q.correct_answer}</p>
                         </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#060608] text-white font-sans selection:bg-primary/30 relative">
      
      {/* Premium Background Noise & Gradients */}
      <div className="fixed inset-0 pointer-events-none opacity-20 overflow-hidden">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary blur-[150px] rounded-full" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary blur-[150px] rounded-full opacity-50" />
      </div>

      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#060608]/80 backdrop-blur-3xl px-8 h-24 flex items-center justify-between">
        <div className="flex items-center gap-6 group cursor-pointer" onClick={() => setQuizState("idle")}>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center font-black text-2xl shadow-[0_10px_30px_rgba(139,92,246,0.3)] group-hover:scale-110 transition-transform duration-500">
            N
          </div>
          <div className="hidden sm:block">
            <h1 className="text-2xl font-black text-white tracking-tighter leading-none">Nexinbe</h1>
            <p className="text-[10px] text-primary font-black tracking-[0.3em] uppercase mt-1.5 animate-pulse">Intelligence Hub</p>
          </div>
        </div>

        <div className="flex items-center gap-10">
          <div className="hidden lg:flex items-center gap-6 border-r border-white/10 pr-10">
             <div className="text-right">
                <p className="text-sm font-black text-white leading-none">{user?.name}</p>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1.5">{profile?.levelName || "Trainee"}</p>
             </div>
             <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-primary">
                {profile?.level || 1}
             </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 transition-all text-sm font-black text-gray-400 hover:text-red-400 group"
          >
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[70vh] gap-10">
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <BrainCircuit className="w-10 h-10 text-primary animate-pulse" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-white font-black tracking-[0.4em] uppercase text-xs mb-3">Syncing Neural Link</p>
              <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">Optimizing Training Environments</p>
            </div>
          </div>
        ) : (
          <div className="pb-32">
            {quizState === "idle" && <IdleScreen />}
            {quizState === "playing" && <PlayingScreen />}
            {quizState === "results" && <ResultsScreen />}
          </div>
        )}
      </main>

      {/* Persistent AI Assistant */}
      <ChatAssistant />
    </div>
  );
}
