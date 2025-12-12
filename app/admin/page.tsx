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
    <div className="min-h-screen flex items-center justify-center bg-neutral-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Business Login</CardTitle>
          <CardDescription>Manage your queue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Input 
                placeholder="Business Slug (e.g. coffee-shop)" 
                value={slug}
                onChange={e => setSlug(e.target.value)}
                required
              />
            </div>
            <div>
              <Input 
                type="password" 
                placeholder="Password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Checking..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
