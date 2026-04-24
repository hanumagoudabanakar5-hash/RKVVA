"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
      // Use Supabase Auth instead of manual backend fetch
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // Get user metadata from the session
      const userMetadata = data.user?.user_metadata;
      
      if (!userMetadata) {
        throw new Error("User profile not found. Please contact support.");
      }

      // Store JWT in cookie for Next.js middleware to read (Supabase also handles this, but we keep it for consistency)
      const token = data.session?.access_token;
      document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Strict`;
      
      // Store user info in localStorage for client components
      const userProfile = {
        id: data.user?.id,
        email: data.user?.email,
        name: userMetadata.name,
        role: userMetadata.role,
        restaurant_id: userMetadata.restaurant_id
      };
      
      localStorage.setItem("user", JSON.stringify(userProfile));

      // Redirect based on role
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-black p-4">
      <div className="w-full max-w-md backdrop-blur-xl bg-white/10 p-8 rounded-2xl shadow-2xl border border-white/20 transition-all hover:scale-[1.01] duration-300">
        <h2 className="text-3xl font-bold text-white text-center mb-6 tracking-tight">
          Welcome to Nexinbe
        </h2>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg mb-6 text-sm text-center animate-pulse">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">Email Address</label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 rounded-lg bg-black/40 border border-purple-500/30 text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition flex-1"
              placeholder="admin@nexinbe.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-3 rounded-lg bg-black/40 border border-purple-500/30 text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition flex-1"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg font-medium shadow-lg hover:shadow-purple-500/30 transition-all active:scale-95 flex justify-center items-center"
          >
            {loading ? (
              <span className="animate-spin h-5 w-5 border-2 border-white/20 border-t-white rounded-full"></span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-purple-200/60 text-sm">
          Don't have an account?{" "}
          <span 
            onClick={() => router.push('/signup')} 
            className="text-purple-400 hover:text-white cursor-pointer transition"
          >
            Create one
          </span>
        </p>
      </div>
    </div>
  );
}
