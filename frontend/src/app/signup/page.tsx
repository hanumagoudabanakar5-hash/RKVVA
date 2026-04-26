"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { BrainCircuit, User, Mail, Lock, Building, Shield, ChevronRight, Loader2, Sparkles, CheckCircle2 } from "lucide-react";

function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Staff");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantId, setRestaurantId] = useState("");

  useEffect(() => {
    const rid = searchParams.get("restaurant_id");
    if (rid) {
      setRestaurantId(rid);
      setRole("Staff");
    }
  }, [searchParams]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (role === "Staff" && !restaurantId) {
        throw new Error("Staff must provide a Restaurant ID");
      }
      
      if (role === "Admin" && !restaurantName) {
        throw new Error("Admins must provide a Restaurant Name");
      }

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
            restaurant_id: role === "Staff" ? restaurantId : null,
          }
        }
      });

      if (authError) throw authError;
      if (!data.user) throw new Error("Signup failed");

      if (role === "Admin") {
        const { data: restaurant, error: restError } = await supabase
          .from('restaurants')
          .insert([{ name: restaurantName }])
          .select()
          .single();

        if (restError) throw restError;

        const { error: updateError } = await supabase
          .from('users')
          .update({ restaurant_id: restaurant.id })
          .eq('id', data.user.id);

        if (updateError) throw updateError;

        await supabase.auth.updateUser({
          data: { restaurant_id: restaurant.id }
        });
        
        data.user.user_metadata.restaurant_id = restaurant.id;
      }

      const token = data.session?.access_token;
      if (token) {
        document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Strict`;
      }
      
      const userProfile = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata.name,
        role: data.user.user_metadata.role,
        restaurant_id: data.user.user_metadata.restaurant_id
      };
      localStorage.setItem("user", JSON.stringify(userProfile));

      if (role === "Admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/staff/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative z-10 w-full max-w-2xl p-4">
      {/* Header */}
      <div className="flex flex-col items-center mb-10 animate-in fade-in slide-in-from-top-10 duration-1000">
        <div className="w-16 h-16 bg-gradient-to-tr from-primary to-secondary rounded-2xl flex items-center justify-center shadow-2xl mb-6 border border-white/20">
           <BrainCircuit size={32} className="text-white" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tighter text-gradient">Create Neural Hub</h1>
        <p className="text-[9px] text-gray-500 font-black tracking-[0.4em] uppercase mt-3">Personnel Enrollment</p>
      </div>

      <div className="glass-card p-10 bg-white/[0.02] border-white/10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-700">
        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs mb-8 flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="grid sm:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Full Name</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-primary transition-colors">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  required
                  className="w-full bg-black/40 border border-white/10 rounded-2xl pl-14 pr-6 py-4 text-white placeholder-gray-700 focus:border-primary/50 transition-all outline-none text-sm"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Email Node</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-primary transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  className="w-full bg-black/40 border border-white/10 rounded-2xl pl-14 pr-6 py-4 text-white placeholder-gray-700 focus:border-primary/50 transition-all outline-none text-sm"
                  placeholder="name@nexus.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Security Key</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-primary transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  className="w-full bg-black/40 border border-white/10 rounded-2xl pl-14 pr-6 py-4 text-white placeholder-gray-700 focus:border-primary/50 transition-all outline-none text-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Access Tier</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-primary transition-colors">
                  <Shield size={18} />
                </div>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={!!searchParams.get("restaurant_id")}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl pl-14 pr-6 py-4 text-white focus:border-primary/50 transition-all outline-none text-sm appearance-none disabled:opacity-40"
                >
                  <option value="Staff">Staff Member</option>
                  <option value="Admin">Restaurant Admin</option>
                </select>
              </div>
            </div>

            {role === "Admin" ? (
              <div className="space-y-2.5 animate-in slide-in-from-right-4">
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Restaurant Identity</label>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-primary transition-colors">
                    <Building size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-2xl pl-14 pr-6 py-4 text-white placeholder-gray-700 focus:border-primary/50 transition-all outline-none text-sm"
                    placeholder="Enter Restaurant Name"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 animate-in slide-in-from-right-4">
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Neural Connection ID</label>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-primary transition-colors">
                    <CheckCircle2 size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    readOnly={!!searchParams.get("restaurant_id")}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl pl-14 pr-6 py-4 text-white placeholder-gray-700 focus:border-primary/50 transition-all outline-none text-sm read-only:opacity-50"
                    placeholder="Link ID from Admin"
                    value={restaurantId}
                    onChange={(e) => setRestaurantId(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-white text-black font-black text-lg rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex justify-center items-center gap-3 group"
              >
                {loading ? (
                  <Loader2 className="animate-spin text-black" size={24} />
                ) : (
                  <>
                    Initialize Profile
                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        <div className="mt-12 pt-8 border-t border-white/5 text-center">
          <p className="text-gray-500 text-sm font-medium">
            Already have a link?{" "}
            <span 
              onClick={() => router.push('/login')} 
              className="text-primary hover:text-white cursor-pointer transition-colors font-black"
            >
              Authorize Login
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Signup() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060608] relative overflow-hidden font-sans p-6">
      {/* Premium Background Effects */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
         <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-primary blur-[150px] rounded-full animate-pulse" />
         <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-secondary blur-[150px] rounded-full opacity-50" />
      </div>
      
      <Suspense fallback={<div className="text-white">Connecting...</div>}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
