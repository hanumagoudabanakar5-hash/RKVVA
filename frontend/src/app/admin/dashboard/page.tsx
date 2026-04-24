"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText, CheckCircle, Loader2, LogOut, File, FileType2, BrainCircuit, Trash2, Edit2, Check, X, Zap, Users, UserPlus, Star, Flame, Trophy, AlertTriangle, TrendingUp, Shield, BarChart3 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"knowledge" | "quiz" | "staff">("knowledge");
  
  // Knowledge Base State
  const [files, setFiles] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quiz Generation State
  const [questions, setQuestions] = useState<any[]>([]);
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [quizError, setQuizError] = useState("");
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  // Staff Management State
  const [staffList, setStaffList] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [staffLoading, setStaffLoading] = useState(false);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: "", email: "", password: "" });
  const [addingStaff, setAddingStaff] = useState(false);
  const [staffError, setStaffError] = useState("");

  // AUTH GUARD
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(storedUser);
    if (parsed.role !== "Admin") {
      router.push('/staff/dashboard');
      return;
    }
    setUser(parsed);
    fetchFiles();
    fetchQuestions();
    fetchStaff();
    fetchStats();
  }, [router]);

  // Removed loadForId dev helper

  const getAuthHeader = (): Record<string, string> => {
    const cookies = typeof document !== 'undefined' ? document.cookie.split('; ') : [];
    const tokenCookie = cookies.find(row => row.startsWith('token='));
    return tokenCookie ? { 'Authorization': `Bearer ${tokenCookie.split('=')[1]}` } : {};
  };

  // --- STAFF LOGIC ---
  const fetchStaff = async () => {
    setStaffLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/staff`, {
        headers: { ...getAuthHeader() }
      });
      if (res.ok) setStaffList(await res.json());
    } catch { /* silent */ } finally { setStaffLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/staff/stats`, {
        headers: { ...getAuthHeader() }
      });
      if (res.ok) setStats(await res.json());
    } catch { /* silent */ }
  };

  const handleAddStaff = async () => {
    if (!user?.restaurant_id || !newStaff.name || !newStaff.email || !newStaff.password) return;
    setAddingStaff(true);
    setStaffError("");
    try {
      const res = await fetch(`${API_URL}/api/staff`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeader()
        },
        body: JSON.stringify({ ...newStaff }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add staff");
      setStaffList([data, ...staffList]);
      setNewStaff({ name: "", email: "", password: "" });
      setShowAddStaff(false);
      fetchStats();
    } catch (e: any) { setStaffError(e.message); }
    finally { setAddingStaff(false); }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm("Remove this staff member?")) return;
    try {
      const res = await fetch(`${API_URL}/api/staff/${id}`, { 
        method: "DELETE",
        headers: { ...getAuthHeader() }
      });
      if (res.ok) {
        setStaffList(staffList.filter(s => s.id !== id));
        fetchStats();
      }
    } catch { /* silent */ }
  };

  // --- KNOWLEDGE BASE LOGIC ---

  const fetchFiles = async () => {
    try {
      const res = await fetch(`${API_URL}/api/files`, {
        headers: { ...getAuthHeader() }
      });
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      }
    } catch (err) {
      console.error("Failed to fetch files", err);
    }
  };

  const handleLogout = () => {
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    localStorage.removeItem("user");
    router.push("/login");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!user?.restaurant_id) return;
    setUploading(true);
    setError("");
    setUploadProgress(10); 

    const formData = new FormData();
    formData.append("file", file);
    formData.append("restaurant_id", user.restaurant_id);
    formData.append("type", "menu"); 

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => (prev >= 90 ? 90 : prev + 10));
      }, 500);

      const res = await fetch(`${API_URL}/api/files/upload`, {
        method: "POST",
        headers: { ...getAuthHeader() },
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setFiles([data.file, ...files]);
      
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 1000);
      
    } catch (err: any) {
      setError(err.message);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // --- QUIZ GENERATION LOGIC ---

  const fetchQuestions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/questions`, {
        headers: { ...getAuthHeader() }
      });
      if (res.ok) {
        const data = await res.json();
        setQuestions(data);
      }
    } catch (err) {
      console.error("Failed to fetch questions", err);
    }
  };

  const generateQuestions = async () => {
    if (!user?.restaurant_id || !topic) return;
    setIsGenerating(true);
    setQuizError("");

    try {
      const res = await fetch(`${API_URL}/api/questions/generate`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeader()
        },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate questions");
      
      setQuestions([...data.questions, ...questions]);
      setTopic("");
    } catch (err: any) {
      setQuizError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const approveQuestion = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/questions/approve/${id}`, { 
        method: "POST",
        headers: { ...getAuthHeader() }
      });
      if (res.ok) {
        setQuestions(questions.map(q => q.id === id ? { ...q, approved: true } : q));
      }
    } catch (err) {
      console.error("Failed to approve", err);
    }
  };

  const deleteQuestion = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/questions/${id}`, { 
        method: "DELETE",
        headers: { ...getAuthHeader() }
      });
      if (res.ok) {
        setQuestions(questions.filter(q => q.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  const startEditing = (q: any) => {
    setEditingQuestionId(q.id);
    setEditForm({ question: q.question, options: [...q.options], correct_answer: q.correct_answer });
  };

  const saveEdit = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/questions/${id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeader()
        },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const updated = await res.json();
        setQuestions(questions.map(q => q.id === id ? updated : q));
        setEditingQuestionId(null);
      }
    } catch (err) {
      console.error("Failed to update", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white font-sans selection:bg-purple-500/30">
      {/* Top Navigation */}
      <nav className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-bold text-xl shadow-lg shadow-purple-500/20">
              N
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Nexinbe</h1>
              <p className="text-xs text-purple-300/70 font-medium tracking-wider uppercase">Admin Portal</p>
            </div>
          </div>
          
          <div className="flex gap-1 absolute left-1/2 -translate-x-1/2">
            {(["knowledge", "quiz", "staff"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  if (tab === "staff") { fetchStaff(); fetchStats(); }
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all capitalize ${
                  activeTab === tab ? "bg-white/10 text-white" : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                }`}
              >
                {tab === "knowledge" ? "Knowledge Base" : tab === "quiz" ? "Quiz Generation" : "Staff"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-white">{user?.name || 'Loading...'}</p>
              <p className="text-xs text-gray-400">Admin</p>
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


      <main className="max-w-7xl mx-auto px-6 py-12 grid lg:grid-cols-3 gap-8">
        
        {/* TAB 1: KNOWLEDGE BASE */}
        {activeTab === "knowledge" && (
          <>
            {/* Left Column: Upload Zone */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Upload Knowledge</h2>
                <p className="text-gray-400 text-sm">Upload Menus or SOPs. Our AI will automatically extract and parse the content into semantic vectors for training.</p>
              </div>

              <div 
                className={`
                  relative overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-300 ease-out bg-white/[0.02]
                  ${isDragging ? "border-purple-500 bg-purple-500/10 scale-[1.02]" : "border-white/10 hover:border-purple-500/50 hover:bg-white/[0.04]"}
                  ${uploading ? "pointer-events-none opacity-80" : "cursor-pointer"}
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !uploading && fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  className="hidden" 
                  accept=".pdf,.docx,.txt,.csv"
                />
                
                <div className="p-16 flex flex-col items-center justify-center text-center">
                  {uploading ? (
                    <div className="flex flex-col items-center gap-6">
                      <div className="relative">
                        <Loader2 className="w-16 h-16 text-purple-500 animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                          {uploadProgress}%
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-white mb-1">Processing Document...</h3>
                        <p className="text-sm text-purple-200/60 max-w-[280px]">Extracting text and generating semantic AI embeddings.</p>
                      </div>
                      <div className="w-full max-w-xs h-1.5 bg-gray-800 rounded-full overflow-hidden mt-2">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300 ease-out"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-20 h-20 bg-gradient-to-b from-white/10 to-white/5 rounded-full flex items-center justify-center mb-6 shadow-xl border border-white/5">
                        <UploadCloud className="w-10 h-10 text-purple-400" />
                      </div>
                      <h3 className="text-xl font-medium text-white mb-2">Drag & Drop your files here</h3>
                      <p className="text-gray-400 text-sm mb-6">or click internally to browse from your computer</p>
                      <div className="flex items-center gap-3 text-xs font-medium text-gray-500 bg-black/40 px-4 py-2 rounded-full border border-white/5">
                        <span className="flex items-center gap-1"><FileType2 size={14}/> PDF</span>
                        <span className="w-1 h-1 rounded-full bg-gray-600"/>
                        <span className="flex items-center gap-1"><FileText size={14}/> DOCX</span>
                        <span className="w-1 h-1 rounded-full bg-gray-600"/>
                        <span>TXT</span>
                        <span className="w-1 h-1 rounded-full bg-gray-600"/>
                        <span>CSV</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>
                  {error}
                </div>
              )}
            </div>

            {/* Right Column: Files List */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                 <h2 className="text-xl font-bold">Processed Files</h2>
                 <span className="bg-white/10 text-xs font-bold px-2 py-1 rounded-md text-gray-300">{files.length}</span>
              </div>

              <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-2 h-[calc(100vh-280px)] overflow-y-auto">
                {files.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
                    <File className="w-12 h-12 text-gray-600 mb-4" />
                    <p className="text-sm font-medium text-gray-400">No files processed yet</p>
                    <p className="text-xs text-gray-500 mt-1">Upload a document to see it here</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {files.map((file) => (
                      <div key={file.id} className="group flex items-center gap-4 p-4 rounded-2xl hover:bg-white/[0.04] transition-colors cursor-pointer border border-transparent hover:border-white/5">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                          <FileText size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate group-hover:text-purple-300 transition-colors">{file.file_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500 capitalize">{file.type}</span>
                            <span className="text-[10px] text-gray-600">•</span>
                            <span className="text-xs text-gray-500">{new Date(file.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <CheckCircle className="w-5 h-5 text-emerald-500/70 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* TAB 2: QUIZ GENERATION */}
        {activeTab === "quiz" && (
          <div className="lg:col-span-3 space-y-8">
            <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8">
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <BrainCircuit className="text-purple-400" /> AI Quiz Generation
              </h2>
              <p className="text-gray-400 text-sm mb-6">Type a topic to generate 5 targeted multiple-choice questions from your knowledge base.</p>
              
              <div className="flex gap-4">
                <input 
                  type="text" 
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Summer Menu Allergens, Wine Pairings, Steak Doneness..." 
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  onKeyDown={(e) => e.key === 'Enter' && generateQuestions()}
                />
                <button 
                  onClick={generateQuestions}
                  disabled={isGenerating || !topic}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium px-6 py-3 rounded-xl transition flex items-center gap-2"
                >
                  {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Generate"}
                </button>
              </div>

              {quizError && (
                <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {quizError}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold">Generated Questions</h3>
              {questions.length === 0 ? (
                <p className="text-gray-500 text-sm">No questions generated yet.</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {questions.map(q => (
                    <div key={q.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:border-purple-500/50 transition">
                      {editingQuestionId === q.id ? (
                        <div className="space-y-4">
                          <textarea 
                            value={editForm.question}
                            onChange={(e) => setEditForm({...editForm, question: e.target.value})}
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm"
                          />
                          {editForm.options.map((opt: string, i: number) => (
                            <div key={i} className="flex gap-2">
                              <input 
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const newOpts = [...editForm.options];
                                  newOpts[i] = e.target.value;
                                  setEditForm({...editForm, options: newOpts});
                                }}
                                className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-sm"
                              />
                              <button 
                                onClick={() => setEditForm({...editForm, correct_answer: opt})}
                                className={`px-2 rounded-lg text-xs font-bold ${editForm.correct_answer === opt ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-gray-400'}`}
                              >
                                Correct
                              </button>
                            </div>
                          ))}
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setEditingQuestionId(null)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400"><X size={16}/></button>
                            <button onClick={() => saveEdit(q.id)} className="p-2 bg-emerald-500/20 hover:bg-emerald-500/40 rounded-lg text-emerald-400"><Check size={16}/></button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-start gap-4 mb-4">
                            <h4 className="font-medium text-purple-100">{q.question}</h4>
                            <div className="flex gap-1 shrink-0">
                              <button onClick={() => startEditing(q)} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded"><Edit2 size={14}/></button>
                              <button onClick={() => deleteQuestion(q.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded"><Trash2 size={14}/></button>
                            </div>
                          </div>
                          
                          <div className="space-y-2 mb-4">
                            {q.options.map((opt: string, i: number) => (
                              <div key={i} className={`p-2 rounded-lg text-sm border ${q.correct_answer === opt ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' : 'bg-black/20 border-white/5 text-gray-300'}`}>
                                {opt}
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${q.approved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                              {q.approved ? 'Approved' : 'Pending Review'}
                            </span>
                            {!q.approved && (
                              <button onClick={() => approveQuestion(q.id)} className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1">
                                <CheckCircle size={14}/> Approve
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: STAFF MANAGEMENT */}
        {activeTab === "staff" && (
          <div className="lg:col-span-3 space-y-8">

            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Users, label: "Total Staff", value: stats?.totalStaff ?? "—", color: "from-purple-600 to-indigo-600", glow: "shadow-purple-500/20" },
                { icon: Star, label: "Avg XP", value: stats?.avgXp ?? "—", color: "from-blue-600 to-cyan-600", glow: "shadow-blue-500/20" },
                { icon: TrendingUp, label: "Completion Rate", value: stats ? `${stats.completionRate}%` : "—", color: "from-emerald-600 to-teal-600", glow: "shadow-emerald-500/20" },
                { icon: BarChart3, label: "Approved Quizzes", value: stats?.totalApprovedQuestions ?? "—", color: "from-orange-600 to-amber-600", glow: "shadow-orange-500/20" },
              ].map(({ icon: Icon, label, value, color, glow }) => (
                <div key={label} className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 flex items-center gap-4 hover:border-white/20 transition">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg ${glow} shrink-0`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-white">{value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Weak Areas */}
            {stats?.weakAreas?.length > 0 && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-red-400 flex items-center gap-2 mb-4"><AlertTriangle size={16}/> Most Failed Questions (Weak Areas)</h3>
                <div className="space-y-3">
                  {stats.weakAreas.map((w: any, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-red-500 w-5 shrink-0">#{i+1}</span>
                      <p className="text-sm text-gray-300 flex-1 truncate">{w.question}</p>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">{w.failCount} fails</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Staff List Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-2"><Shield size={22} className="text-purple-400"/> Staff Members</h2>
              <button
                onClick={() => { setShowAddStaff(!showAddStaff); setStaffError(""); }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-bold rounded-xl transition shadow-lg shadow-purple-500/20"
              >
                <UserPlus size={16}/> Add Staff
              </button>
            </div>

            {/* Add Staff Form */}
            {showAddStaff && (
              <div className="bg-white/[0.03] border border-purple-500/20 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-purple-300">New Staff Member</h3>
                <div className="grid sm:grid-cols-3 gap-3">
                  {(["name", "email", "password"] as const).map((field) => (
                    <input
                      key={field}
                      type={field === "password" ? "password" : "text"}
                      placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                      value={newStaff[field]}
                      onChange={e => setNewStaff({ ...newStaff, [field]: e.target.value })}
                      className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  ))}
                </div>
                {staffError && <p className="text-red-400 text-xs bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">{staffError}</p>}
                <div className="flex gap-3">
                  <button onClick={handleAddStaff} disabled={addingStaff} className="flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition">
                    {addingStaff ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check size={16}/>} Create Account
                  </button>
                  <button onClick={() => setShowAddStaff(false)} className="px-5 py-2 bg-white/5 hover:bg-white/10 text-gray-400 text-sm font-medium rounded-xl transition">Cancel</button>
                </div>
              </div>
            )}

            {/* Staff Table */}
            {staffLoading ? (
              <div className="flex items-center justify-center py-16 gap-3 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin"/> Loading staff...
              </div>
            ) : staffList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                <Users className="w-14 h-14 text-gray-700 mb-4"/>
                <p className="text-gray-400 font-medium">No staff members yet</p>
                <p className="text-gray-600 text-sm mt-1">Click "Add Staff" to invite your first team member.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {staffList.map((s) => (
                  <div key={s.id} className="group flex items-center gap-5 p-5 bg-white/[0.02] border border-white/10 rounded-2xl hover:border-white/20 hover:bg-white/[0.04] transition">
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-lg text-white shrink-0">
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{s.name}</p>
                      <p className="text-xs text-gray-500 truncate">{s.email}</p>
                    </div>
                    {/* Stats pills */}
                    <div className="hidden md:flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 font-medium">
                        <Star className="w-3 h-3"/> {s.xp ?? 0} XP
                      </span>
                      <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 font-medium">
                        <Trophy className="w-3 h-3"/> Lv {s.level ?? 1}
                      </span>
                      <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 font-medium">
                        <Flame className="w-3 h-3"/> {s.streak ?? 0} streak
                      </span>
                    </div>
                    {/* Joined */}
                    <span className="hidden lg:block text-xs text-gray-600">{new Date(s.created_at).toLocaleDateString()}</span>
                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteStaff(s.id)}
                      className="opacity-0 group-hover:opacity-100 transition p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 size={15}/>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
