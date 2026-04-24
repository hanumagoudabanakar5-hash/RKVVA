"use client";

import Link from "next/link";
import { Shield, Users, LogIn, UserPlus, Zap } from "lucide-react";

const pages = [
  {
    href: "/admin/dashboard",
    icon: Shield,
    label: "Admin Dashboard",
    desc: "Upload files, generate & manage quiz questions",
    color: "from-purple-600 to-indigo-600",
    glow: "shadow-purple-500/30",
  },
  {
    href: "/staff/dashboard",
    icon: Users,
    label: "Staff Dashboard",
    desc: "Take training quizzes and review your scores",
    color: "from-blue-600 to-cyan-600",
    glow: "shadow-blue-500/30",
  },
  {
    href: "/login",
    icon: LogIn,
    label: "Login Page",
    desc: "Sign in with email and password",
    color: "from-gray-600 to-gray-700",
    glow: "shadow-gray-500/20",
  },
  {
    href: "/signup",
    icon: UserPlus,
    label: "Signup Page",
    desc: "Create a new Admin or Staff account",
    color: "from-gray-600 to-gray-700",
    glow: "shadow-gray-500/20",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="flex flex-col items-center mb-10">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-black text-3xl shadow-xl shadow-purple-500/30 mb-4">
          N
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">Nexinbe</h1>
        <p className="text-gray-500 text-sm mt-1">Restaurant Training Platform</p>
      </div>

      {/* Dev mode badge */}
      <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-yellow-400 text-xs font-semibold mb-8">
        <Zap className="w-3.5 h-3.5" />
        DEV MODE — Auth disabled. All pages are freely accessible.
      </div>

      {/* Page cards */}
      <div className="grid sm:grid-cols-2 gap-4 w-full max-w-xl">
        {pages.map(({ href, icon: Icon, label, desc, color, glow }) => (
          <Link
            key={href}
            href={href}
            className={`group relative p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all hover:border-white/20 hover:scale-[1.02] active:scale-100`}
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3 shadow-lg ${glow}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <p className="font-bold text-white text-sm mb-0.5">{label}</p>
            <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
            <span className="absolute top-4 right-4 text-gray-600 group-hover:text-gray-400 transition text-lg">→</span>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-gray-700 text-xs">
        Auth will be re-enabled after testing is complete.
      </p>
    </div>
  );
}
