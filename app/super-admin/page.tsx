"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SuperAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
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
  const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      if (password === "admin123") {
          setIsAuthenticated(true);
      } else {
          alert("Wrong password");
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
          <div className="flex min-h-screen items-center justify-center bg-zinc-900">
               <form onSubmit={handleLogin} className="space-y-4 bg-white p-8 rounded-lg shadow-xl">
                   <h1 className="text-2xl font-bold">Super Admin</h1>
                   <Input 
                        type="password" 
                        placeholder="Master Password" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-64"
                    />
                   <Button type="submit" className="w-full">Access</Button>
               </form>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-neutral-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
             <h1 className="text-3xl font-bold">Platform Overview</h1>
             <Button variant="outline" onClick={() => setIsAuthenticated(false)}>Logout</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* List */}
              <div className="md:col-span-2 space-y-4">
                  <h2 className="text-xl font-semibold">Active Businesses</h2>
                  <div className="grid gap-4">
                      {businesses?.map(b => (
                          <Card key={b._id}>
                              <CardContent className="p-6">
                                  {editingId === b._id ? (
                                      <div className="space-y-4">
                                          <div className="grid grid-cols-3 gap-4">
                                              <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Name</label>
                                                <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Name" />
                                              </div>
                                              <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Slug</label>
                                                <Input value={editSlug} onChange={e => setEditSlug(e.target.value)} placeholder="Slug" />
                                              </div>
                                              <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">New Password</label>
                                                <Input 
                                                    value={editPassword} 
                                                    onChange={e => setEditPassword(e.target.value)} 
                                                    placeholder="Leave empty to keep" 
                                                />
                                              </div>
                                          </div>
                                          <div className="flex gap-2">
                                              <Button onClick={handleUpdate} size="sm">Save</Button>
                                              <Button variant="ghost" onClick={() => setEditingId(null)} size="sm">Cancel</Button>
                                          </div>
                                      </div>
                                  ) : (
                                      <div className="flex justify-between items-center">
                                          <div>
                                              <h3 className="font-bold text-lg">{b.name}</h3>
                                              <p className="text-sm text-gray-500 font-mono">/queue/{b.slug}</p>
                                          </div>
                                          <div className="flex items-center gap-4">
                                              <div className="text-right">
                                                  <Badge variant={b.isOnline ? "default" : "destructive"}>
                                                      {b.isOnline ? "ONLINE" : "OFFLINE"}
                                                  </Badge>
                                                  <div className="text-sm mt-1 text-gray-400 font-mono">
                                                      <div className="flex justify-end gap-2 text-xs">
                                                        <span>Total: {b.lastIssued}</span>
                                                        <span>•</span>
                                                        <span className="text-orange-400">Waiting: {b.activeCount ?? 0}</span>
                                                      </div>
                                                  </div>
                                              </div>
                                              <div className="flex flex-col gap-2">
                                                  <Button variant="outline" size="sm" onClick={() => startEdit(b)}>Edit</Button>
                                                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(b._id)}>Delete</Button>
                                              </div>
                                          </div>
                                      </div>
                                  )}
                              </CardContent>
                          </Card>
                      ))}
                      {!businesses && <p>Loading...</p>}
                  </div>
              </div>

              {/* Create */}
              <div>
                  <Card>
                      <CardHeader>
                          <CardTitle>Onboard Business</CardTitle>
                      </CardHeader>
                      <CardContent>
                          <form onSubmit={handleCreate} className="space-y-4">
                              <div>
                                  <label className="text-xs font-bold uppercase text-gray-500">Business Name</label>
                                  <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Joe's Burgers" required />
                              </div>
                              <div>
                                  <label className="text-xs font-bold uppercase text-gray-500">Slug (URL)</label>
                                  <Input value={newSlug} onChange={e => setNewSlug(e.target.value)} placeholder="e.g. joes-burgers" required />
                              </div>
                              <div>
                                  <label className="text-xs font-bold uppercase text-gray-500">Password</label>
                                  <Input value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="1234" required />
                              </div>
                              <Button type="submit" className="w-full">Create Business</Button>
                          </form>
                      </CardContent>
                  </Card>
              </div>
          </div>
      </div>
    </div>
  );
}
