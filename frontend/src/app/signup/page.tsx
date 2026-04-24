"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Staff");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantId, setRestaurantId] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. If Staff, verify restaurantId is provided
      if (role === "Staff" && !restaurantId) {
        throw new Error("Staff must provide a Restaurant ID");
      }
      
      // 2. If Admin, verify restaurantName is provided
      if (role === "Admin" && !restaurantName) {
        throw new Error("Admins must provide a Restaurant Name");
      }

      // 3. Perform Supabase Auth Signup
      // We pass the metadata which the SQL Trigger will use to populate public.users
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
            // If it's staff, we pass the existing restaurantId
            restaurant_id: role === "Staff" ? restaurantId : null,
          }
        }
      });

      if (authError) throw authError;

      if (!data.user) throw new Error("Signup failed");

      // 4. Special logic for Admins: Create the restaurant and link it
      if (role === "Admin") {
        // Create the restaurant record
        const { data: restaurant, error: restError } = await supabase
          .from('restaurants')
          .insert([{ name: restaurantName }])
          .select()
          .single();

        if (restError) throw restError;

        // Update the public.users record with the new restaurant_id
        const { error: updateError } = await supabase
          .from('users')
          .update({ restaurant_id: restaurant.id })
          .eq('id', data.user.id);

        if (updateError) throw updateError;

        // Also update the Auth Metadata so subsequent sessions have the ID
        const { error: authUpdateError } = await supabase.auth.updateUser({
          data: { restaurant_id: restaurant.id }
        });

        if (authUpdateError) throw authUpdateError;
        
        // Update local session metadata for immediate use
        data.user.user_metadata.restaurant_id = restaurant.id;
      }

      // Store token and user info
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

      // Redirect
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-black p-4">
      <div className="w-full max-w-md backdrop-blur-xl bg-white/10 p-8 rounded-2xl shadow-2xl border border-white/20 transition-all hover:scale-[1.01] duration-300">
        <h2 className="text-3xl font-bold text-white text-center mb-6 tracking-tight">
          Join Nexinbe
        </h2>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-1">Full Name</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2.5 rounded-lg bg-black/40 border border-purple-500/30 text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-purple-200 mb-1">Email Address</label>
            <input
              type="email"
              required
              className="w-full px-4 py-2.5 rounded-lg bg-black/40 border border-purple-500/30 text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              placeholder="staff@nexinbe.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-purple-200 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2.5 rounded-lg bg-black/40 border border-purple-500/30 text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-purple-200 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-black/40 border border-purple-500/30 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition appearance-none"
            >
              <option value="Staff">Staff</option>
              <option value="Admin">Admin</option>
            </select>
          </div>

          {role === "Admin" ? (
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-1">Restaurant Name</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2.5 rounded-lg bg-black/40 border border-purple-500/30 text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                placeholder="My Awesome Cafe"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-1">Restaurant ID (from Admin)</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2.5 rounded-lg bg-black/40 border border-purple-500/30 text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                placeholder="uuid-from-your-admin"
                value={restaurantId}
                onChange={(e) => setRestaurantId(e.target.value)}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg font-medium shadow-lg hover:shadow-purple-500/30 transition-all active:scale-95 flex justify-center items-center"
          >
            {loading ? (
              <span className="animate-spin h-5 w-5 border-2 border-white/20 border-t-white rounded-full"></span>
            ) : (
              "Sign Up"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-purple-200/60 text-sm">
          Already have an account?{" "}
          <span 
            onClick={() => router.push('/login')} 
            className="text-purple-400 hover:text-white cursor-pointer transition"
          >
            Sign in
          </span>
        </p>
      </div>
    </div>
  );
}
