"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SuperAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const verifySuper = useMutation(api.queue.verifySuperAdmin);
  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("1234");

  const businesses = useQuery(api.queue.getAllBusinesses);
  const createBusiness = useMutation(api.queue.createBusiness);
  const updateBusiness = useMutation(api.queue.updateBusiness);
  const deleteBusiness = useMutation(api.queue.deleteBusiness);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editPassword, setEditPassword] = useState("");

  // Simple hardcoded super-admin check for demo
  // Secure backend check
  const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const isValid = await verifySuper({ user: username, password });
        if (isValid) {
            setIsAuthenticated(true);
        } else {
            alert("Access Denied");
        }
      } catch (e) {
        alert("Error verifying credentials");
      }
  };

  const handleCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newSlug || !newName) return;
      try {
          await createBusiness({ 
              slug: newSlug, 
              name: newName, 
              password: newPassword 
          });
          setNewSlug("");
          setNewName("");
          setNewPassword("1234");
          alert("Business created!");
      } catch (err: any) {
          alert("Error: " + err.message);
      }
  };

  const startEdit = (b: any) => {
      setEditingId(b._id);
      setEditName(b.name);
      setEditSlug(b.slug);
      setEditPassword(""); // Reset to empty, only fill if changing
  };

  const handleUpdate = async () => {
    if(!editingId) return;
    await updateBusiness({
        id: editingId as any,
        name: editName,
        slug: editSlug,
        password: editPassword
    });
    setEditingId(null);
  };

  const handleDelete = async (id: any) => {
      if(confirm("Are you sure? This will delete the business and all tickets permanently.")) {
        await deleteBusiness({ id });
      }
  };

  if (!isAuthenticated) {
      return (
          <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-black p-4">
               <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
                   <CardHeader className="text-center pb-2">
                       <div className="mx-auto bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-3xl shadow-inner">
                           🛡️
                       </div>
                       <CardTitle className="text-2xl font-bold text-white">Super Admin</CardTitle>
                       <CardDescription className="text-gray-400">Restricted Access</CardDescription>
                   </CardHeader>
                   <CardContent>
                       <form onSubmit={handleLogin} className="space-y-4">
                           <Input 
                                type="text" 
                                placeholder="Username" 
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="bg-black/20 border-white/10 text-white placeholder:text-gray-500 text-center text-lg tracking-widest"
                            />
                           <Input 
                                type="password" 
                                placeholder="Master Password" 
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="bg-black/20 border-white/10 text-white placeholder:text-gray-500 text-center text-lg tracking-widest"
                            />
                           <Button type="submit" className="w-full bg-white text-black hover:bg-gray-200 font-bold">
                               Verify Identity
                           </Button>
                       </form>
                   </CardContent>
               </Card>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 md:p-12 font-sans selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto space-y-12">
          
          {/* Top Bar */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/10 pb-8">
             <div>
                 <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2">
                     Overview
                 </h1>
                 <p className="text-neutral-400 font-medium">Manage all businesses and subscriptions.</p>
             </div>
             <Button 
                variant="default" 
                onClick={() => setIsAuthenticated(false)}
                className="bg-white text-black hover:bg-white/10 hover:text-white border-0 font-bold"
            >
                Log Out
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Create Board */}
              <div className="lg:col-span-1 order-last lg:order-first">
                  <div className="sticky top-8">
                      <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20 shadow-2xl overflow-hidden">
                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
                          <CardHeader>
                              <CardTitle className="text-white flex items-center gap-2">
                                  <span className="bg-indigo-500/20 p-2 rounded-lg text-indigo-400">✨</span>
                                  New Business
                              </CardTitle>
                              <CardDescription className="text-indigo-200/60">Launch a new queue instance</CardDescription>
                          </CardHeader>
                          <CardContent>
                              <form onSubmit={handleCreate} className="space-y-5">
                                  <div className="space-y-2">
                                      <label className="text-xs font-bold uppercase tracking-wider text-indigo-300/80 pl-1">Business Name</label>
                                      <Input 
                                        value={newName} 
                                        onChange={e => setNewName(e.target.value)} 
                                        placeholder="e.g. The Coffee Spot" 
                                        className="bg-black/20 border-white/10 text-white placeholder:text-white/20 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                                        required 
                                      />
                                  </div>
                                  <div className="space-y-2">
                                      <label className="text-xs font-bold uppercase tracking-wider text-indigo-300/80 pl-1">Slug (URL)</label>
                                      <Input 
                                        value={newSlug} 
                                        onChange={e => setNewSlug(e.target.value)} 
                                        placeholder="e.g. coffee-spot" 
                                        className="bg-black/20 border-white/10 text-white placeholder:text-white/20 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono text-sm"
                                        required 
                                      />
                                  </div>
                                  <div className="space-y-2">
                                      <label className="text-xs font-bold uppercase tracking-wider text-indigo-300/80 pl-1">Password</label>
                                      <Input 
                                        value={newPassword} 
                                        onChange={e => setNewPassword(e.target.value)} 
                                        placeholder="1234" 
                                        className="bg-black/20 border-white/10 text-white placeholder:text-white/20 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono text-sm"
                                        required 
                                      />
                                  </div>
                                  <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-12 shadow-lg shadow-indigo-500/20">
                                      🚀 Launch Site
                                  </Button>
                              </form>
                          </CardContent>
                      </Card>
                  </div>
              </div>

              {/* List Board */}
              <div className="lg:col-span-2 space-y-6">
                  <h2 className="text-xl font-bold flex items-center gap-3">
                      <span className="bg-white/5 px-3 py-1 rounded-full text-sm text-neutral-400 border border-white/5">{businesses?.length ?? 0}</span>
                      Active Deployments
                  </h2>
                  
                  <div className="grid gap-4">
                      {businesses?.map(b => (
                          <div 
                            key={b._id} 
                            className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all hover:border-white/10 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
                          >
                              {editingId === b._id ? (
                                  <div className="w-full space-y-4 animate-in fade-in zoom-in-95 duration-200">
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                          <Input 
                                            value={editName} 
                                            onChange={e => setEditName(e.target.value)} 
                                            placeholder="Name"
                                            className="bg-black/40 border-white/20 text-white" 
                                          />
                                          <Input 
                                            value={editSlug} 
                                            onChange={e => setEditSlug(e.target.value)} 
                                            placeholder="Slug"
                                            className="bg-black/40 border-white/20 text-white font-mono" 
                                          />
                                          <Input 
                                            value={editPassword} 
                                            onChange={e => setEditPassword(e.target.value)} 
                                            placeholder="New Pass (Optional)" 
                                            className="bg-black/40 border-white/20 text-white" 
                                          />
                                      </div>
                                      <div className="flex gap-3">
                                          <Button onClick={handleUpdate} size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white">Save Changes</Button>
                                          <Button variant="ghost" onClick={() => setEditingId(null)} size="sm" className="text-gray-400 hover:text-white">Cancel</Button>
                                      </div>
                                  </div>
                              ) : (
                                  <>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-bold text-xl tracking-tight text-white group-hover:text-indigo-400 transition-colors">{b.name}</h3>
                                            <Badge variant="outline" className={`border-0 uppercase text-[10px] tracking-wider font-bold px-2 py-0.5 ${b.isOnline ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                                                {b.isOnline ? "Online" : "Offline"}
                                            </Badge>
                                        </div>
                                        <a 
                                            href={`/queue/${b.slug}`}
                                            target="_blank"
                                            rel="noopener noreferrer" 
                                            className="text-sm text-gray-500 font-mono hover:text-indigo-400 hover:underline flex items-center gap-2"
                                        >
                                            /queue/{b.slug} 
                                            <span className="opacity-50">↗</span>
                                        </a>
                                    </div>

                                    <div className="flex items-center gap-6 md:gap-8 w-full md:w-auto justify-between md:justify-end">
                                        <div className="text-right space-y-1 min-w-[80px]">
                                            <p className="text-xs font-bold uppercase text-gray-600">Stats</p>
                                            <div className="flex items-baseline gap-1 justify-end">
                                                <span className="text-white font-mono font-bold">{b.activeCount ?? 0}</span>
                                                <span className="text-gray-600 text-xs">waiting</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="sm" onClick={() => startEdit(b)} className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8 p-0" title="Edit">
                                                ✏️
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(b._id)} className="text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 h-8 w-8 p-0" title="Delete">
                                                🗑️
                                            </Button>
                                        </div>
                                    </div>
                                  </>
                              )}
                          </div>
                      ))}
                      {!businesses && <div className="text-gray-500 italic">No businesses found.</div>}
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
}
