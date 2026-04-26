"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  UploadCloud, FileText, CheckCircle, Loader2, LogOut, 
  File, FileType2, BrainCircuit, Trash2, Edit2, Check, X, 
  Zap, Users, UserPlus, Star, Flame, Trophy, AlertTriangle, 
  TrendingUp, Shield, BarChart3, Database, Search
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"knowledge" | "quiz" | "staff" | "insights">("knowledge");
  
  const [files, setFiles] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [questions, setQuestions] = useState<any[]>([]);
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [quizError, setQuizError] = useState("");
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({ question: "", options: [], correct_answer: "" });

  const [staffList, setStaffList] = useState<any[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: "", email: "", password: "" });
  const [addingStaff, setAddingStaff] = useState(false);
  const [staffError, setStaffError] = useState("");
  const [stats, setStats] = useState<any>(null);
  const [weakAreas, setWeakAreas] = useState<any[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);

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
    fetchWeakAreas();
  }, [router]);

  const fetchWeakAreas = async () => {
    setInsightsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/progress/weak-areas/current`, { headers: { ...getAuthHeader() } });
      if (res.ok) setWeakAreas(await res.json());
    } catch { /* silent */ }
    finally { setInsightsLoading(false); }
  };

  const getAuthHeader = (): Record<string, string> => {
    const cookies = typeof document !== 'undefined' ? document.cookie.split('; ') : [];
    const tokenCookie = cookies.find(row => row.startsWith('token='));
    return tokenCookie ? { 'Authorization': `Bearer ${tokenCookie.split('=')[1]}` } : {};
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/staff/stats`, { headers: { ...getAuthHeader() } });
      if (res.ok) setStats(await res.json());
    } catch { /* silent */ }
  };

  const fetchStaff = async () => {
    setStaffLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/staff`, { headers: { ...getAuthHeader() } });
      if (res.ok) setStaffList(await res.json());
    } catch { /* silent */ }
    finally { setStaffLoading(false); }
  };

  const handleAddStaff = async () => {
    // Legacy - invitation system used instead
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm("Remove this staff member?")) return;
    try {
      const res = await fetch(`${API_URL}/api/staff/${id}`, { method: "DELETE", headers: { ...getAuthHeader() } });
      if (res.ok) {
        setStaffList(staffList.filter(s => s.id !== id));
        fetchStats();
      }
    } catch { /* silent */ }
  };

  const fetchFiles = async () => {
    try {
      const res = await fetch(`${API_URL}/api/files`, { headers: { ...getAuthHeader() } });
      if (res.ok) setFiles(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchQuestions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/questions`, { headers: { ...getAuthHeader() } });
      if (res.ok) setQuestions(await res.json());
    } catch { /* silent */ }
  };

  const handleLogout = () => {
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    localStorage.removeItem("user");
    router.push("/login");
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
      const progressInterval = setInterval(() => setUploadProgress(prev => (prev >= 90 ? 90 : prev + 10)), 500);
      const res = await fetch(`${API_URL}/api/files/upload`, { method: "POST", headers: { ...getAuthHeader() }, body: formData });
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setFiles([data.file, ...files]);
    } catch (e: any) { setError(e.message); }
    finally { setTimeout(() => setUploading(false), 1000); }
  };

  const generateQuestions = async () => {
    if (!topic) return;
    setIsGenerating(true);
    setQuizError("");
    try {
      const res = await fetch(`${API_URL}/api/questions/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ topic, restaurant_id: user.restaurant_id }),
      });
      if (!res.ok) throw new Error("Failed to generate questions. Make sure you have uploaded files.");
      await fetchQuestions();
      setTopic("");
    } catch (e: any) { setQuizError(e.message); }
    finally { setIsGenerating(false); }
  };

  const approveQuestion = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/questions/${id}/approve`, { method: 'PATCH', headers: { ...getAuthHeader() } });
      if (res.ok) {
        setQuestions(questions.map(q => q.id === id ? { ...q, approved: true } : q));
        fetchStats();
      }
    } catch { /* silent */ }
  };

  const deleteQuestion = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/questions/${id}`, { method: 'DELETE', headers: { ...getAuthHeader() } });
      if (res.ok) {
        setQuestions(questions.filter(q => q.id !== id));
        fetchStats();
      }
    } catch { /* silent */ }
  };

  const startEditing = (q: any) => {
    setEditingQuestionId(q.id);
    setEditForm({ question: q.question, options: [...q.options], correct_answer: q.correct_answer });
  };

  const saveEdit = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/questions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        setQuestions(questions.map(q => q.id === id ? { ...q, ...editForm } : q));
        setEditingQuestionId(null);
      }
    } catch { /* silent */ }
  };

  const SidebarItem = ({ id, icon: Icon, label }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 ${
        activeTab === id 
          ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20" 
          : "text-gray-500 hover:text-white hover:bg-white/5"
      }`}
    >
      <Icon size={20} className={activeTab === id ? "text-white" : "group-hover:text-white transition-colors"} />
      <span className="font-bold text-sm tracking-tight">{label}</span>
      {activeTab === id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex font-sans selection:bg-purple-500/30">
      <aside className="w-72 border-r border-white/10 bg-[#09090b] flex flex-col p-6 sticky top-0 h-screen z-40">
        <div className="flex items-center gap-4 mb-12 px-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-black text-2xl shadow-xl shadow-purple-500/20">
            N
          </div>
          <div>
            <h1 className="text-xl font-black text-white leading-none">Nexinbe</h1>
            <p className="text-[10px] text-purple-400 font-bold tracking-[0.2em] uppercase mt-1">Admin Panel</p>
          </div>
        </div>

        <nav className="space-y-2 flex-1">
          <SidebarItem id="knowledge" icon={Database} label="Knowledge Base" />
          <SidebarItem id="quiz" icon={BrainCircuit} label="AI Quiz Lab" />
          <SidebarItem id="staff" icon={Users} label="Staff Management" />
          <SidebarItem id="insights" icon={BarChart3} label="Performance Insights" />
        </nav>

        <div className="mt-auto space-y-4 pt-8 border-t border-white/5">
           <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-2xl border border-white/5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-500 flex items-center justify-center font-bold text-xs">
                {user?.name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-gray-500 truncate">Administrator</p>
              </div>
           </div>
           <button 
             onClick={handleLogout}
             className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-red-400 transition-colors"
           >
             <LogOut size={18} />
             <span className="text-sm font-bold">Sign Out</span>
           </button>
        </div>
      </aside>

      <main className="flex-1 p-12 overflow-y-auto max-w-6xl">
        <header className="mb-12 flex justify-between items-end animate-in slide-in-from-top-4 duration-500">
           <div>
             <h2 className="text-4xl font-black text-white mb-2 tracking-tight">
               {activeTab === "knowledge" ? "Knowledge Base" : activeTab === "quiz" ? "AI Quiz Lab" : activeTab === "staff" ? "Staff Management" : "Performance Insights"}
             </h2>
              <p className="text-gray-500 font-medium">
                {activeTab === "knowledge" ? "Upload and process training documents for AI training." : 
                 activeTab === "quiz" ? "Generate AI-powered questions from your knowledge base." : 
                 activeTab === "staff" ? "Manage your restaurant staff accounts and track their performance." :
                 "Deep dive into team knowledge gaps and training efficiency."}
              </p>
            </div>
            
            {activeTab === "staff" && (
              <button
                 onClick={() => { setShowAddStaff(!showAddStaff); setStaffError(""); }}
                 className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-500 text-white text-sm font-bold rounded-2xl shadow-xl shadow-purple-500/20 hover:scale-105 transition-all"
               >
                 <UserPlus size={18}/> New Staff Member
               </button>
            )}
         </header>

        {activeTab === "knowledge" && (
          <div className="grid lg:grid-cols-5 gap-8 animate-in slide-in-from-bottom-10">
            <div className="lg:col-span-3 space-y-6">
              <div 
                className={`p-16 rounded-[2rem] bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl flex flex-col items-center justify-center text-center transition-all duration-300 border-2 border-dashed ${
                  isDragging ? "border-purple-500 bg-purple-500/5 scale-95" : "border-white/10 hover:border-white/20"
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileUpload(e.dataTransfer.files[0]); }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input type="file" ref={fileInputRef} onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])} className="hidden" accept=".pdf,.docx,.txt,.csv" />
                
                {uploading ? (
                  <div className="space-y-6">
                    <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto relative">
                      <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
                      <span className="absolute text-[10px] font-black text-white">{uploadProgress}%</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">Processing Document...</h3>
                      <p className="text-sm text-gray-500 max-w-xs mx-auto">Extracting text and generating AI embeddings for retrieval.</p>
                    </div>
                    <div className="w-64 h-1.5 bg-black/40 rounded-full overflow-hidden mx-auto">
                      <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-24 h-24 bg-gradient-to-b from-white/10 to-transparent rounded-3xl flex items-center justify-center mb-8 shadow-2xl border border-white/5">
                      <UploadCloud className="w-12 h-12 text-purple-500" />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-3">Drop your training manuals</h3>
                    <p className="text-gray-500 mb-8 max-w-xs mx-auto">Upload PDF, DOCX or CSV files to build your AI knowledge base.</p>
                    <div className="flex gap-3 text-[10px] font-black text-gray-400 bg-white/5 px-6 py-2.5 rounded-full border border-white/10">
                      <span className="flex items-center gap-1.5"><FileType2 size={12}/> PDF</span>
                      <span className="w-1 h-1 rounded-full bg-gray-700 mt-1.5" />
                      <span className="flex items-center gap-1.5"><FileText size={12}/> DOCX</span>
                      <span className="w-1 h-1 rounded-full bg-gray-700 mt-1.5" />
                      <span>CSV</span>
                    </div>
                  </>
                )}
              </div>
              {error && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
                   <AlertTriangle size={18} /> {error}
                </div>
              )}
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between px-2">
                 <h3 className="text-xl font-black flex items-center gap-2"><CheckCircle size={20} className="text-emerald-500"/> Indexed Files</h3>
                 <span className="text-[10px] font-black bg-white/10 px-3 py-1 rounded-full text-gray-400">{files.length} Total</span>
              </div>
              <div className="p-3 h-[500px] overflow-y-auto space-y-2 rounded-[2rem] bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl">
                {files.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-30">
                    <Database size={48} className="mb-4" />
                    <p className="text-sm font-bold uppercase tracking-widest">No documents indexed</p>
                  </div>
                ) : (
                  files.map(file => (
                    <div key={file.id} className="group flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
                        <FileText size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{file.file_name}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{file.type} • {new Date(file.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                         <CheckCircle className="text-emerald-500" size={18} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "quiz" && (
          <div className="space-y-8 animate-in slide-in-from-bottom-10">
            <div className="p-10 rounded-[2rem] bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                 <Zap size={140} />
              </div>
              <h3 className="text-2xl font-black mb-2 flex items-center gap-3">
                 <BrainCircuit className="text-purple-500" /> Generate New Assessments
              </h3>
              <p className="text-gray-500 mb-8 max-w-2xl">Focus the AI on a specific menu category or procedure to generate targeted questions for your staff.</p>
              
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                  <input 
                    type="text" 
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Allergen protocols for the Summer Menu..." 
                    className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-gray-700"
                    onKeyDown={(e) => e.key === 'Enter' && generateQuestions()}
                  />
                </div>
                <button 
                  onClick={generateQuestions}
                  disabled={isGenerating || !topic}
                  className="px-8 py-4 bg-purple-600 text-white font-black rounded-2xl shadow-xl shadow-purple-500/20 disabled:opacity-40 hover:scale-105 transition-all"
                >
                  {isGenerating ? <Loader2 className="animate-spin" /> : "Generate"}
                </button>
              </div>
              {quizError && <p className="mt-4 text-red-400 text-sm">{quizError}</p>}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {questions.map(q => (
                <div key={q.id} className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl border-t-4 border-t-purple-500/20">
                   {editingQuestionId === q.id ? (
                     <div className="space-y-4">
                        <textarea className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm" value={editForm.question} onChange={(e) => setEditForm({...editForm, question: e.target.value})} />
                        {editForm.options.map((opt: any, i: number) => (
                           <div key={i} className="flex gap-2">
                             <input className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm" value={opt} onChange={(e) => {
                               const newOpts = [...editForm.options]; newOpts[i] = e.target.value; setEditForm({...editForm, options: newOpts});
                             }} />
                             <button onClick={() => setEditForm({...editForm, correct_answer: opt})} className={`px-4 rounded-xl text-[10px] font-black ${editForm.correct_answer === opt ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-gray-500'}`}>CORRECT</button>
                           </div>
                        ))}
                        <div className="flex justify-end gap-2 pt-4">
                           <button onClick={() => setEditingQuestionId(null)} className="px-4 py-2 text-gray-500 font-bold">Cancel</button>
                           <button onClick={() => saveEdit(q.id)} className="px-6 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl font-bold">Save Changes</button>
                        </div>
                     </div>
                   ) : (
                     <>
                       <div className="flex justify-between items-start mb-6">
                         <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${q.approved ? 'bg-emerald-500/10 text-emerald-400' : 'bg-purple-500/10 text-purple-400'}`}>
                           {q.approved ? 'Live' : 'Pending Review'}
                         </div>
                         <div className="flex gap-1">
                           <button onClick={() => startEditing(q)} className="p-2 text-gray-600 hover:text-white transition-colors"><Edit2 size={16}/></button>
                           <button onClick={() => deleteQuestion(q.id)} className="p-2 text-gray-600 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                         </div>
                       </div>
                       <h4 className="text-lg font-bold text-white mb-6 leading-tight">{q.question}</h4>
                       <div className="space-y-2 mb-8">
                         {q.options.map((opt: string, i: number) => (
                           <div key={i} className={`p-4 rounded-2xl text-sm border ${q.correct_answer === opt ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200 font-bold' : 'bg-black/20 border-white/5 text-gray-400'}`}>
                             {opt}
                           </div>
                         ))}
                       </div>
                       {!q.approved && (
                         <button onClick={() => approveQuestion(q.id)} className="w-full py-4 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 font-black rounded-2xl transition-all flex items-center justify-center gap-2">
                           <CheckCircle size={18} /> Approve Question
                         </button>
                       )}
                     </>
                   )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "staff" && (
          <div className="space-y-12 animate-in slide-in-from-bottom-10">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Users, label: "Active Staff", value: stats?.totalStaff ?? "—", color: "text-purple-400" },
                { icon: Star, label: "Avg Experience", value: `${stats?.avgXp ?? 0} XP`, color: "text-orange-400" },
                { icon: TrendingUp, label: "Pass Rate", value: stats ? `${stats.completionRate}%` : "—", color: "text-emerald-500" },
                { icon: BarChart3, label: "Assessments", value: stats?.totalApprovedQuestions ?? "—", color: "text-blue-500" },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl">
                  <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4 ${color}`}>
                    <Icon size={20} />
                  </div>
                  <p className="text-3xl font-black text-white mb-1">{value}</p>
                  <p className="text-[10px] uppercase font-black text-gray-600 tracking-widest">{label}</p>
                </div>
              ))}
            </div>

            {showAddStaff && (
              <div className="p-10 rounded-[2rem] bg-white/[0.03] border border-purple-500/30 backdrop-blur-xl animate-in zoom-in-95">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-2xl font-black text-white mb-2">Invite Team Members</h3>
                    <p className="text-gray-500 text-sm">Give this Restaurant ID or Link to your staff members so they can register.</p>
                  </div>
                  <button onClick={() => setShowAddStaff(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest ml-1">Restaurant ID</label>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm font-mono text-purple-200">
                        {user?.restaurant_id}
                      </div>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(user?.restaurant_id || "");
                          alert("Restaurant ID copied!");
                        }}
                        className="px-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest ml-1">Direct Invite Link</label>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm truncate text-gray-400">
                        {`${typeof window !== 'undefined' ? window.location.origin : ''}/signup?restaurant_id=${user?.restaurant_id}`}
                      </div>
                      <button 
                        onClick={() => {
                          const link = `${window.location.origin}/signup?restaurant_id=${user?.restaurant_id}`;
                          navigator.clipboard.writeText(link);
                          alert("Invite Link copied!");
                        }}
                        className="px-6 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl shadow-lg shadow-purple-500/20 transition-all"
                      >
                        Copy Link
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-12 p-6 bg-purple-500/5 border border-purple-500/10 rounded-[1.5rem] flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                    <Shield size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Secure Registration</p>
                    <p className="text-xs text-gray-500">Staff will set their own secure passwords during the signup process.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
               {staffLoading ? (
                 <div className="flex items-center justify-center py-20 text-gray-500 gap-3"><Loader2 className="animate-spin" /> Loading team...</div>
               ) : (
                 staffList.map(s => (
                   <div key={s.id} className="p-6 rounded-[2rem] bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl flex items-center gap-6 hover:scale-[1.01] transition-all group">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-500 flex items-center justify-center font-black text-2xl">
                         {s.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                         <h4 className="font-bold text-white text-lg">{s.name}</h4>
                         <p className="text-xs text-gray-500">{s.email}</p>
                      </div>
                      <div className="hidden md:flex gap-6 items-center pr-8 border-r border-white/10">
                         <div className="text-center">
                            <p className="text-sm font-black text-white">{s.xp ?? 0}</p>
                            <p className="text-[9px] uppercase font-bold text-gray-600">XP</p>
                         </div>
                         <div className="text-center">
                            <p className="text-sm font-black text-purple-400">{s.level ?? 1}</p>
                            <p className="text-[9px] uppercase font-bold text-gray-600">LVL</p>
                         </div>
                      </div>
                      <button onClick={() => handleDeleteStaff(s.id)} className="p-3 rounded-2xl text-gray-700 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100">
                         <Trash2 size={20} />
                      </button>
                   </div>
                 ))
               )}
            </div>
          </div>
        )}

        {activeTab === "insights" && (
          <div className="space-y-12 animate-in slide-in-from-bottom-10">
            {/* Knowledge Gap Heatmap */}
            <div className="grid lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 p-10 rounded-[2rem] bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                   <TrendingUp size={120} />
                </div>
                <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Knowledge Gap Heatmap</h3>
                <p className="text-gray-500 text-sm mb-10">Identifying the most challenging concepts across your team.</p>
                
                {insightsLoading ? (
                  <div className="h-64 flex items-center justify-center gap-3 text-gray-500"><Loader2 className="animate-spin" /> Aggregating data...</div>
                ) : weakAreas.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center opacity-30 text-center">
                    <Database size={48} className="mb-4" />
                    <p className="text-sm font-bold uppercase tracking-widest">Insufficient data for heatmap</p>
                    <p className="text-[10px] mt-2">Staff must complete more quizzes to see insights.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {weakAreas.map((area, i) => (
                      <div key={area.question_id} className="group space-y-2">
                        <div className="flex justify-between items-end">
                          <p className="text-sm font-bold text-white max-w-[80%] truncate group-hover:text-purple-400 transition-colors">{area.question}</p>
                          <span className="text-xs font-black text-red-400 uppercase tracking-widest">{area.failCount} Fails</span>
                        </div>
                        <div className="h-3 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                           <div 
                             className="h-full bg-gradient-to-r from-red-500 to-rose-400 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(239,68,68,0.3)]" 
                             style={{ width: `${Math.min(100, (area.failCount / (stats?.totalStaff || 1)) * 100)}%` }} 
                           />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="lg:col-span-4 p-10 rounded-[2rem] bg-gradient-to-br from-purple-600/10 to-transparent border border-purple-500/20 backdrop-blur-xl">
                 <div className="w-12 h-12 bg-purple-600/20 rounded-2xl flex items-center justify-center text-purple-400 mb-6">
                    <Zap size={24} />
                 </div>
                 <h4 className="text-xl font-black text-white mb-4 leading-tight">Training Strategy</h4>
                 <p className="text-sm text-gray-400 leading-relaxed mb-8">
                   Based on your team's current performance, we recommend generating more questions focusing on <span className="text-purple-400 font-bold underline">Menu Ingredients</span> and <span className="text-purple-400 font-bold underline">Closing Protocols</span>.
                 </p>
                 <button 
                   onClick={() => setActiveTab("quiz")}
                   className="w-full py-4 bg-white text-black font-black rounded-2xl shadow-xl hover:scale-105 transition-all text-sm"
                 >
                   Adjust AI Quiz Focus
                 </button>
              </div>
            </div>

            {/* Performance Leaderboard */}
            <div className="p-10 rounded-[2rem] bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl">
               <div className="flex items-center justify-between mb-10">
                  <div>
                    <h3 className="text-2xl font-black text-white mb-1">Team Leaderboard</h3>
                    <p className="text-gray-500 text-sm">Top performing staff members by experience and accuracy.</p>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
                     <Trophy className="text-amber-400" size={18} />
                     <span className="text-xs font-black uppercase tracking-widest text-gray-400">Competitive View</span>
                  </div>
               </div>

               <div className="grid gap-4">
                  {[...staffList].sort((a,b) => (b.xp || 0) - (a.xp || 0)).slice(0, 5).map((s, i) => (
                    <div key={s.id} className="flex items-center gap-6 p-6 rounded-[1.5rem] bg-white/[0.01] border border-white/5 hover:bg-white/5 transition-all group">
                       <div className="w-10 h-10 font-black text-xl text-gray-600 flex items-center justify-center italic">#{i+1}</div>
                       <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600/20 to-indigo-500/20 flex items-center justify-center font-black text-purple-400">
                          {s.name.charAt(0)}
                       </div>
                       <div className="flex-1">
                          <p className="font-bold text-white">{s.name}</p>
                          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{s.levelName || "Trainee"} • Level {s.level ?? 1}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-xl font-black text-white">{s.xp ?? 0}</p>
                          <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Total XP</p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
