"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { BrainCircuit, Lock, Mail, ChevronRight, Sparkles, Loader2 } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      const userMetadata = data.user?.user_metadata;
      
      if (!userMetadata) {
        throw new Error("User profile not found. Please contact support.");
      }

      const token = data.session?.access_token;
      document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Strict`;
      
      const userProfile = {
        id: data.user?.id,
        email: data.user?.email,
        name: userMetadata.name,
        role: userMetadata.role,
        restaurant_id: userMetadata.restaurant_id
      };
      
      localStorage.setItem("user", JSON.stringify(userProfile));

      if (userMetadata.role === "Admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/staff/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060608] relative overflow-hidden font-sans">
      {/* Premium Background Effects */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
         <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary blur-[150px] rounded-full animate-pulse" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-secondary blur-[150px] rounded-full opacity-50" />
      </div>
      
      <div className="relative z-10 w-full max-w-xl p-4">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-12 animate-in fade-in slide-in-from-top-10 duration-1000">
          <div className="w-20 h-20 bg-gradient-to-tr from-primary to-secondary rounded-[2.5rem] flex items-center justify-center shadow-[0_20px_50px_rgba(139,92,246,0.3)] mb-6 animate-float-premium border border-white/20">
             <BrainCircuit size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter text-gradient">Nexinbe</h1>
          <p className="text-[10px] text-primary font-black tracking-[0.4em] uppercase mt-3">Intelligence Hub</p>
        </div>

        {/* Login Card */}
        <div className="glass-card p-12 bg-white/[0.02] border-white/10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-700">
          <div className="mb-10 text-center">
             <h2 className="text-2xl font-black text-white mb-2">Welcome Back</h2>
             <p className="text-gray-500 text-sm font-medium">Access your training intelligence portal</p>
          </div>
          
          {error && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs mb-8 flex items-center gap-3 animate-in fade-in zoom-in">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Email System</label>
              <div className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-primary transition-colors">
                  <Mail size={20} />
                </div>
                <input
                  type="email"
                  required
                  className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] pl-16 pr-6 py-5 text-white placeholder-gray-700 focus:border-primary/50 transition-all outline-none"
                  placeholder="name@restaurant.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Security Key</label>
              <div className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-primary transition-colors">
                  <Lock size={20} />
                </div>
                <input
                  type="password"
                  required
                  className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] pl-16 pr-6 py-5 text-white placeholder-gray-700 focus:border-primary/50 transition-all outline-none"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-white text-black font-black text-xl rounded-[1.5rem] shadow-[0_20px_40px_-10px_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-95 transition-all flex justify-center items-center gap-3 group"
            >
              {loading ? (
                <Loader2 className="animate-spin text-black" size={24} />
              ) : (
                <>
                  Connect Neural Link
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-12 pt-10 border-t border-white/5 text-center">
            <p className="text-gray-500 text-sm font-medium">
              New to the platform?{" "}
              <span 
                onClick={() => router.push('/signup')} 
                className="text-primary hover:text-white cursor-pointer transition-colors font-black"
              >
                Create Hub
              </span>
            </p>
          </div>
        </div>
        
        {/* Footer info */}
        <div className="mt-12 flex justify-center gap-10 opacity-30 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
           <span>Secured by Supabase</span>
           <span>v2.0 Premium</span>
        </div>
      </div>
    </div>
  );
}
