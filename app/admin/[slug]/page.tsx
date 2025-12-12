"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdminDashboard() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();

  const business = useQuery(api.queue.getBusiness, { slug });
  // Fetch current serving ticket details
  const currentTicket = useQuery(api.queue.getTicketByNumber, 
    business ? { businessId: business._id, number: business.currentServing } : "skip"
  );
  // Fetch next ticket details (optional but nice)
  const nextTicket = useQuery(api.queue.getTicketByNumber, 
    business ? { businessId: business._id, number: business.currentServing + 1 } : "skip"
  );
  
  const nextCustomer = useMutation(api.queue.nextCustomer);
  const toggleStatus = useMutation(api.queue.toggleStatus);
  const resetQueue = useMutation(api.queue.resetQueue);
  
  const [isClient, setIsClient] = useState(false);

  const handleLogout = async () => {
      // Go offline
      await toggleStatus({ slug }); // We assume toggle to switch state. Since we are Online, this makes us Offline.
      // Clear local auth
      localStorage.removeItem(`admin-auth-${slug}`);
      router.push("/admin");
  };

  const downloadQR = () => {
      const svg = document.getElementById("qr-code-svg");
      if (!svg) return;
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);
          const pngFile = canvas.toDataURL("image/png");
          const downloadLink = document.createElement("a");
          downloadLink.download = `${slug}-qr.png`;
          downloadLink.href = `${pngFile}`;
          downloadLink.click();
      };
      img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };
    
  // Auth check
  useEffect(() => {
      setIsClient(true);
      const isAuth = localStorage.getItem(`admin-auth-${slug}`);
      if (!isAuth) {
          router.push("/admin");
      }
  }, [slug, router]);

  if (!isClient) return null;
  if (business === undefined) return <div className="p-8 text-center">Loading...</div>;
  if (business === null) return <div className="p-8 text-center">Business not found.</div>;

  const joinUrl = `${window.location.origin}/queue/${slug}`;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8 font-sans selection:bg-indigo-500/30">
        
        {/* Background Elements */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px]"></div>
        </div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-white/10">
            <div>
                <h1 className="text-4xl font-black tracking-tight mb-1">{business.name}</h1>
                <p className="text-gray-400 font-medium tracking-wide">Zerovide Admin</p>
            </div>
            
            <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md transition-all ${business.isOnline ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                    <div className={`w-2 h-2 rounded-full ${business.isOnline ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
                    <span className="text-xs font-bold uppercase tracking-wider">
                        {business.isOnline ? "System Online" : "System Offline"}
                    </span>
                </div>
                 <Button 
                    variant="default"
                    className="bg-white text-black hover:bg-white/10 hover:text-white transition-colors border-0 font-bold"
                    onClick={handleLogout}
                >
                    Logout
                </Button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Control Panel */}
            <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    
                    <div className="relative z-10 text-center space-y-6">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Now Serving Ticket</p>
                            <div className="relative inline-block">
                                <span className="text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 tracking-tighter">
                                    #{business.currentServing}
                                </span>
                            </div>
                            
                            <div className="h-10 mt-2">
                                {currentTicket ? (
                                     <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-500/30 px-6 py-2 rounded-full animate-in fade-in zoom-in duration-300">
                                        <span className="text-indigo-300 text-lg">👤</span>
                                        <span className="text-indigo-200 font-bold text-lg tracking-wide">
                                            {currentTicket.name || "Guest"}
                                        </span>
                                     </div>
                                ) : (
                                     <span className="text-sm text-gray-600 font-mono py-3 block">Waiting for customer...</span>
                                )}
                            </div>
                        </div>

                        <div className="pt-8 space-y-4">
                            <Button 
                                size="lg" 
                                className="w-full text-lg py-8 font-bold bg-white text-black hover:bg-gray-200 shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all hover:scale-[1.02] active:scale-[0.98]" 
                                onClick={() => nextCustomer({ slug })}
                                disabled={!business.isOnline || business.currentServing > business.lastIssued}
                            >
                                Call Next Customer ⚡
                            </Button>
                            
                            {/* Reset - Hidden by default or subtle */}
                             <Button 
                                variant="ghost" 
                                className="w-full text-xs text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                onClick={() => {
                                    if(confirm("DANGER ZONE: Reset Queue? This cannot be undone.")) {
                                        resetQueue({ slug });
                                    }
                                }}
                             >
                                 Reset System
                             </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: QR & Stats */}
            <div className="space-y-6">
                {/* QR Card */}
                <div className="bg-black/20 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <span className="bg-white/10 p-1.5 rounded-lg text-sm">📱</span> 
                        Join Access
                    </h3>
                    <div className="flex flex-col items-center bg-white/5 rounded-2xl p-6 border border-white/5">
                        <div className="bg-white p-4 rounded-xl shadow-lg mb-4">
                            <QRCode 
                                id="qr-code-svg"
                                value={joinUrl} 
                                size={160} 
                            />
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full border-white/10 hover:bg-white/10 text-gray-300"
                            onClick={downloadQR}
                        >
                            Download PNG ⬇️
                        </Button>
                        <a href={joinUrl} target="_blank" className="mt-4 text-[10px] text-gray-500 font-mono hover:text-indigo-400 transition-colors break-all text-center">
                            {joinUrl}
                        </a>
                    </div>
                </div>

                {/* Stats Card */}
                <div className="bg-black/20 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
                     <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <span className="bg-white/10 p-1.5 rounded-lg text-sm">📊</span> 
                        Real-time Stats
                    </h3>
                    <div className="space-y-1">
                        <div className="flex justify-between items-center p-3 hover:bg-white/5 rounded-xl transition-colors">
                             <span className="text-gray-400 text-sm font-medium">Total Tickets</span>
                             <span className="font-mono font-bold text-xl text-white">#{business.lastIssued}</span>
                        </div>
                        <div className="w-full h-px bg-white/5"></div>
                        <div className="flex justify-between items-center p-3 hover:bg-white/5 rounded-xl transition-colors">
                             <span className="text-gray-400 text-sm font-medium">People Waiting</span>
                             <span className="font-mono font-bold text-xl text-orange-400">{business.activeCount ?? 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}
