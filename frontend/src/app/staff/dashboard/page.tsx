"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut, BrainCircuit, Trophy, RotateCcw, ChevronRight,
  CheckCircle2, XCircle, BookOpen, Star, Zap, Target, Clock,
  Award, Flame, Sparkles, TrendingUp,
} from "lucide-react";

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

  // ── XP / Level helpers ───────────────────────────────────────
  const LEVELS = [
    { level: 1, name: 'Beginner',     min: 0,   max: 100  },
    { level: 2, name: 'Menu Learner', min: 101, max: 300  },
    { level: 3, name: 'Service Pro',  min: 301, max: 600  },
    { level: 4, name: 'Sales Expert', min: 601, max: null as null },
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
    // Re-fetch a fresh random set of questions for each new session
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
      // Build submission payload from tracked answers
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
        ? "border-purple-500 bg-purple-500/20 text-white"
        : "border-white/10 bg-white/[0.03] text-gray-300 hover:border-purple-500/50 hover:bg-purple-500/10 hover:text-white cursor-pointer";
    }
    if (option === currentQ.correct_answer) return "border-emerald-500 bg-emerald-500/20 text-emerald-200";
    if (option === selectedAnswer && option !== currentQ.correct_answer)
      return "border-red-500 bg-red-500/20 text-red-300";
    return "border-white/5 bg-black/10 text-gray-500";
  };

  const getOptionIcon = (option: string) => {
    if (!isAnswerRevealed) return null;
    if (option === currentQ.correct_answer)
      return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
    if (option === selectedAnswer && option !== currentQ.correct_answer)
      return <XCircle className="w-5 h-5 text-red-400 shrink-0" />;
    return null;
  };

  // ── IDLE SCREEN ──────────────────────────────────────────────
  const IdleScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="relative mb-8">
        <div className="w-32 h-32 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-2xl shadow-purple-500/30">
          <BrainCircuit className="w-16 h-16 text-white" />
        </div>
        <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
          {questions.length}
        </div>
      </div>

      <h2 className="text-4xl font-bold text-white mb-3">Ready to Train?</h2>
      <p className="text-gray-400 max-w-md mb-2">
        You have{" "}
        <span className="text-purple-400 font-semibold">{questions.length} approved questions</span>{" "}
        waiting for you. Test your knowledge on menu items, allergens, pairings, and more.
      </p>
      <p className="text-sm text-gray-600 mb-10">Pass rate: 70% or higher</p>

      <div className="flex gap-6 mb-12">
        {[
          { icon: Target, label: "Questions", value: String(questions.length), color: "text-purple-400" },
          { icon: Clock, label: "~Est Time", value: `${questions.length * 0.5}min`, color: "text-blue-400" },
          { icon: Award, label: "Pass Score", value: "70%", color: "text-emerald-400" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="flex flex-col items-center gap-2 bg-white/[0.03] border border-white/10 rounded-2xl p-5 w-28">
            <Icon className={`w-6 h-6 ${color}`} />
            <span className="text-xl font-bold text-white">{value}</span>
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Gamification Panel ── */}
      {profile && (() => {
        const info = getXpInfo(profile.xp);
        return (
          <div className="w-full max-w-md mb-8 space-y-3">
            {/* Level + Streak row */}
            <div className="flex gap-3">
              <div className="flex-1 flex items-center gap-3 bg-white/[0.03] border border-white/10 rounded-2xl p-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Level {profile.level}</p>
                  <p className="text-sm font-bold text-white">{profile.levelName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/20 rounded-2xl px-5">
                <Flame className="w-5 h-5 text-orange-400" />
                <div>
                  <p className="text-xl font-black text-orange-400">{profile.streak}</p>
                  <p className="text-[10px] text-gray-500">day streak</p>
                </div>
              </div>
            </div>
            {/* XP Bar */}
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" /> {profile.xp} XP</span>
                {info.max !== null
                  ? <span>Next level at {info.max} XP</span>
                  : <span className="text-purple-400 font-bold">MAX LEVEL</span>}
              </div>
              <div className="h-2.5 bg-black/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full transition-all duration-700"
                  style={{ width: `${info.pct}%` }}
                />
              </div>
              {info.max !== null && (
                <p className="text-[11px] text-gray-600 mt-1.5">{info.xpInLevel} / {info.rangeSize} XP to {LEVELS[profile.level]?.name}</p>
              )}
            </div>
          </div>
        );
      })()}

      <button
        onClick={startQuiz}
        disabled={questions.length === 0}
        className="relative group px-10 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-lg rounded-2xl shadow-xl shadow-purple-500/30 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span className="flex items-center gap-3">
          <Zap className="w-5 h-5" />
          Start Training Quiz
          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </span>
      </button>

      {error && (
        <p className="mt-6 text-red-400 text-sm bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/20">
          {error}
        </p>
      )}
    </div>
  );

  // ── PLAYING SCREEN ────────────────────────────────────────────
  const PlayingScreen = () => (
    <div className="max-w-2xl mx-auto w-full px-4 py-8">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span className="text-purple-400 font-medium">{score} correct</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
          />
        </div>
        <div className="flex gap-1.5 mt-3">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                i < currentIndex
                  ? userAnswers[i] === questions[i].correct_answer
                    ? "bg-emerald-500"
                    : "bg-red-500"
                  : i === currentIndex
                  ? "bg-purple-500"
                  : "bg-white/10"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 mb-6">
        <p className="text-xs font-semibold text-purple-400/70 uppercase tracking-widest mb-4">
          Training Question
        </p>
        <h3 className="text-xl font-semibold text-white leading-relaxed">
          {currentQ.question}
        </h3>
      </div>

      {/* Options */}
      <div className="space-y-3 mb-8">
        {currentQ.options.map((option, i) => (
          <button
            key={i}
            onClick={() => handleSelectAnswer(option)}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 text-left font-medium ${getOptionStyle(option)}`}
          >
            <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold ${
              !isAnswerRevealed
                ? selectedAnswer === option
                  ? "bg-purple-500 text-white"
                  : "bg-white/10 text-gray-400"
                : option === currentQ.correct_answer
                ? "bg-emerald-500/30 text-emerald-300"
                : option === selectedAnswer
                ? "bg-red-500/30 text-red-300"
                : "bg-white/5 text-gray-600"
            }`}>
              {String.fromCharCode(65 + i)}
            </span>
            <span className="flex-1">{option}</span>
            {getOptionIcon(option)}
          </button>
        ))}
      </div>

      {/* Feedback + Next */}
      {isAnswerRevealed && (
        <div className="animate-fade-in">
          <div className={`p-4 rounded-2xl mb-4 flex items-center gap-3 ${
            selectedAnswer === currentQ.correct_answer
              ? "bg-emerald-500/10 border border-emerald-500/20"
              : "bg-red-500/10 border border-red-500/20"
          }`}>
            {selectedAnswer === currentQ.correct_answer ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <p className="text-emerald-300 text-sm font-medium">Correct! Well done.</p>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                <p className="text-red-300 text-sm font-medium">
                  Not quite. The correct answer is: <span className="font-bold text-white">{currentQ.correct_answer}</span>
                </p>
              </>
            )}
          </div>

          <button
            onClick={handleNext}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-lg rounded-2xl shadow-lg shadow-purple-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {currentIndex < questions.length - 1 ? (
              <>Next Question <ChevronRight className="w-5 h-5" /></>
            ) : (
              <>See Results <Trophy className="w-5 h-5" /></>
            )}
          </button>
        </div>
      )}
    </div>
  );

  // ── RESULTS SCREEN ────────────────────────────────────────────
  const ResultsScreen = () => (
    <div className="max-w-2xl mx-auto w-full px-4 py-8">
      <div className={`text-center mb-10 p-10 rounded-3xl border ${
        isPassing
          ? "bg-emerald-500/5 border-emerald-500/20"
          : "bg-red-500/5 border-red-500/20"
      }`}>
        <div className={`w-28 h-28 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl font-black shadow-xl ${
          isPassing
            ? "bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-emerald-500/30"
            : "bg-gradient-to-tr from-red-500 to-rose-400 shadow-red-500/30"
        }`}>
          {isPassing ? <Trophy className="w-12 h-12 text-white" /> : <RotateCcw className="w-12 h-12 text-white" />}
        </div>

        <h2 className={`text-5xl font-black mb-2 ${isPassing ? "text-emerald-400" : "text-red-400"}`}>
          {percentage}%
        </h2>
        <p className={`text-2xl font-bold mb-2 ${isPassing ? "text-emerald-200" : "text-red-200"}`}>
          {isPassing ? "🎉 You Passed!" : "Keep Practicing"}
        </p>
        <p className="text-gray-400 text-sm">
          {score} out of {questions.length} correct
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Correct", value: score, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
          { label: "Wrong", value: questions.length - score, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
          { label: "Score", value: `${percentage}%`, color: isPassing ? "text-emerald-400" : "text-red-400", bg: "bg-white/5 border-white/10" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`border rounded-2xl p-4 text-center ${bg}`}>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* XP Earned Card */}
      {(xpResult || submittingXp) && (
        <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-purple-900/60 to-indigo-900/40 border border-purple-500/30 animate-fade-in">
          {submittingXp ? (
            <div className="flex items-center gap-2 text-purple-300 text-sm"><Zap className="w-4 h-4 animate-pulse" /> Saving your XP...</div>
          ) : xpResult && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <p className="text-sm font-bold text-white">XP Earned This Round</p>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="text-center">
                  <p className="text-3xl font-black text-yellow-400">+{xpResult.xpEarned}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Total XP</p>
                </div>
                {xpResult.bonusXp > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/20 border border-orange-500/30 rounded-full">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    <span className="text-xs font-bold text-orange-300">+{xpResult.bonusXp} Streak Bonus!</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-full">
                  <Trophy className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs font-bold text-purple-300">{xpResult.levelName}</span>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                  <span>{xpResult.newXp} XP total</span>
                  <span><TrendingUp className="w-3 h-3 inline mr-0.5" />Level {xpResult.newLevel}</span>
                </div>
                {(() => {
                  const info = getXpInfo(xpResult.newXp);
                  return (
                    <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-yellow-400 rounded-full transition-all duration-1000" style={{ width: `${info.pct}%` }} />
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={startQuiz}
          className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" /> Retake Quiz
        </button>
        <button
          onClick={() => setIsReviewing(!isReviewing)}
          className="flex-1 py-3 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-white font-bold rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <BookOpen className="w-4 h-4" /> {isReviewing ? "Hide" : "Review"} Answers
        </button>
      </div>

      {/* Review section */}
      {isReviewing && (
        <div className="space-y-4 animate-fade-in">
          <h3 className="text-lg font-bold text-white mb-4">Answer Review</h3>
          {questions.map((q, i) => {
            const isCorrect = userAnswers[i] === q.correct_answer;
            return (
              <div key={q.id} className={`p-5 rounded-2xl border ${isCorrect ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"}`}>
                <div className="flex items-start gap-3 mb-3">
                  {isCorrect
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                    : <XCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                  }
                  <p className="text-sm font-medium text-gray-200 leading-relaxed">{q.question}</p>
                </div>
                {!isCorrect && (
                  <div className="ml-8 space-y-1">
                    <p className="text-xs text-red-400">Your answer: <span className="text-red-300">{userAnswers[i] ?? "Not answered"}</span></p>
                    <p className="text-xs text-emerald-400">Correct answer: <span className="text-emerald-300 font-semibold">{q.correct_answer}</span></p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── MAIN RENDER ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white font-sans">
      {/* Nav */}
      <nav className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-bold text-xl shadow-lg shadow-purple-500/20">
              N
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Nexinbe</h1>
              <p className="text-xs text-purple-300/70 font-medium tracking-wider uppercase">Staff Training</p>
            </div>
          </div>

          <div className="flex items-center gap-5">
            {quizState !== "idle" && (
              <button
                onClick={() => setQuizState("idle")}
                className="text-sm text-gray-400 hover:text-white transition flex items-center gap-1.5"
              >
                <BookOpen size={15} /> Training Hub
              </button>
            )}
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-white">{user?.name || "Staff"}</p>
              <div className="flex items-center justify-end gap-2 mt-0.5">
                {profile && (
                  <>
                    <span className="text-xs text-yellow-400 flex items-center gap-0.5"><Star className="w-3 h-3" /> {profile.xp} XP</span>
                    <span className="text-gray-700 text-xs">·</span>
                    <span className="text-xs text-orange-400 flex items-center gap-0.5"><Flame className="w-3 h-3" /> {profile.streak}d</span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all text-sm font-medium text-gray-300 hover:text-white"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </nav>


      <main className="max-w-5xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
            <p className="text-gray-500 text-sm">Loading your training materials...</p>
          </div>
        ) : (
          <>
            {quizState === "idle" && <IdleScreen />}
            {quizState === "playing" && <PlayingScreen />}
            {quizState === "results" && <ResultsScreen />}
          </>
        )}
      </main>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
