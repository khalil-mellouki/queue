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
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold">{business.name}</h1>
                <p className="text-neutral-500">Admin Dashboard</p>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border shadow-sm">
                    <div className={`w-3 h-3 rounded-full ${business.isOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                    <span className="text-sm font-medium text-neutral-600">
                        {business.isOnline ? "Online" : "Offline"}
                    </span>
                </div>
                 <Button 
                    variant="outline"
                    className="text-red-500 border-red-200 hover:bg-red-50"
                    onClick={handleLogout}
                >
                    Logout
                </Button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Control Panel */}
            <Card className="border-2 border-black/10 shadow-lg md:col-span-1">
                <CardHeader>
                    <CardTitle>Queue Control</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-black/5 p-8 rounded-xl text-center">
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Now Serving</p>
                        <p className="text-7xl font-black mt-2">#{business.currentServing}</p>
                        {currentTicket ? (
                             <p className="text-xl mt-2 font-medium text-blue-600 animate-pulse bg-blue-50 inline-block px-4 py-1 rounded-full">
                                {currentTicket.name || "Guest"}
                             </p>
                        ) : (
                             <p className="text-sm text-gray-400 mt-2">Waiting...</p>
                        )}
                    </div>

                    <Button 
                        size="lg" 
                        className="w-full text-xl py-8 font-bold" 
                        onClick={() => nextCustomer({ slug })}
                        disabled={!business.isOnline || business.currentServing > business.lastIssued}
                    >
                        Call Next Customer
                    </Button>

                     <Button 
                        variant="ghost" 
                        className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => {
                            if(confirm("Are you sure? This will cancel all tickets.")) {
                                resetQueue({ slug });
                            }
                        }}
                     >
                         Reset Queue
                     </Button>
                </CardContent>
            </Card>

            {/* Right Column: QR & Stats */}
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Join Queue</CardTitle>
                        <CardDescription>Scan to join</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center">
                        <div className="bg-white p-4 rounded-xl border shadow-sm">
                            <QRCode 
                                id="qr-code-svg"
                                value={joinUrl} 
                                size={180} 
                            />
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-4 w-full"
                            onClick={downloadQR}
                        >
                            Download QR
                        </Button>
                        <a href={joinUrl} target="_blank" className="mt-2 text-xs font-mono bg-neutral-100 p-2 rounded block w-full text-center truncate">
                            {joinUrl}
                        </a>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Statistics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between items-center border-b pb-2">
                             <span className="text-neutral-500">Total Issued</span>
                             <span className="font-bold">#{business.lastIssued}</span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2">
                             <span className="text-neutral-500">Waiting</span>
                             <span className="font-bold">{business.activeCount ?? 0}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>

      </div>
    </div>
  );
}
