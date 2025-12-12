"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AdminLogin() {
  const router = useRouter();
  const verify = useMutation(api.queue.verifyPassword);
  
  const [slug, setSlug] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const isValid = await verify({ slug, password, setOnline: true });
      if (isValid) {
        // Simple auth: Save to localStorage for persistence in this session
        localStorage.setItem(`admin-auth-${slug}`, "true");
        router.push(`/admin/${slug}`);
      } else {
        setError("Invalid Credentials");
      }
    } catch (err) {
      setError("Login failed");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4 font-sans">
      <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl opacity-30"></div>
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl opacity-20"></div>
      </div>

      <Card className="w-full max-w-sm bg-black/40 border-white/10 backdrop-blur-xl shadow-2xl relative z-10 transition-all hover:border-white/20">
        <CardHeader className="text-center space-y-3 pb-2 pt-8">
          <div className="mx-auto w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-2xl shadow-inner">
             💼
          </div>
          <div>
              <CardTitle className="text-xl font-bold text-white tracking-tight">Business Login</CardTitle>
              <CardDescription className="text-gray-400 text-xs uppercase tracking-widest mt-1">Manage Your Queue</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pb-8 px-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500 pl-1">Slug</label>
              <Input 
                placeholder="e.g. coffee-shop" 
                value={slug}
                onChange={e => setSlug(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:bg-white/10 transition-colors h-10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500 pl-1">Password</label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:bg-white/10 transition-colors h-10"
              />
            </div>
            
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-2 rounded text-xs text-center">
                    {error}
                </div>
            )}
            
            <Button type="submit" className="w-full bg-white text-black hover:bg-gray-200 font-bold mt-2" disabled={loading}>
              {loading ? (
                  <span className="flex items-center gap-2">
                       <span className="animate-spin text-lg">◌</span> Checking...
                  </span>
              ) : "Enter Dashboard →"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
