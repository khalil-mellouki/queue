"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function QueuePage() {
  const params = useParams();
  const slug = params.slug as string;
  
  // Local state for form
  const [name, setName] = useState("");
  const [ticketId, setTicketId] = useState<string | null>(null);
  
  useEffect(() => {
    const storedId = localStorage.getItem(`queue-ticket-${slug}`);
    if (storedId) setTicketId(storedId);
  }, [slug]);

  const business = useQuery(api.queue.getBusiness, { slug });
  
  // Fetch active ticket only if we have an ID
  const activeTicket = useQuery(api.queue.getActiveTicket, ticketId ? { 
    ticketId: ticketId as Id<"tickets">
  } : "skip");

  const joinQueue = useMutation(api.queue.joinQueue);
  const leaveQueue = useMutation(api.queue.leaveQueue);
  
  // --- NOTIFICATIONS & SOUND ---
  const [hasNotifiedReady, setHasNotifiedReady] = useState(false);
  const [hasNotifiedNext, setHasNotifiedNext] = useState(false); // New state for "Next Up"
  const [hasNotifiedTurn, setHasNotifiedTurn] = useState(false);
  // NEW: In-App Notification State
  const [inAppNotification, setInAppNotification] = useState<{title: string, body: string} | null>(null);
  
  // Ref for a single AudioContext instance
  const audioCtxRef = useRef<AudioContext | null>(null);
  // Ref for notification timeout to prevent auto-close race conditions
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const unlockAudio = () => {
    try {
        const CtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!CtxClass) return;
        
        // Create only if doesn't exist
        if (!audioCtxRef.current) {
            audioCtxRef.current = new CtxClass();
        }
        
        // Resume if suspended (browser requirements)
        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
    } catch (e) {
        console.error("Audio unlock failed", e);
    }
  };

  const playChime = () => {
    try {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(500, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.error("Audio play failed", e);
    }
  };

  const sendNotification = (title: string, body: string) => {
      // 1. Try Native Notification (Best effort for background)
      if ("Notification" in window && Notification.permission === "granted") {
          try {
            new Notification(title, { body, icon: "/icon.png" });
          } catch(e) { console.error("Native notification failed", e); }
      }

      // 2. ALWAYS Show In-App Notification (Guaranteed visibility)
      setInAppNotification({ title, body });
      
      // 3. Play Sound
      playChime();

      // Clear previous timeout if exists
      if (notificationTimeoutRef.current) {
          clearTimeout(notificationTimeoutRef.current);
      }

      // Auto-dismiss after 7 seconds
      notificationTimeoutRef.current = setTimeout(() => {
          setInAppNotification(null);
          notificationTimeoutRef.current = null;
      }, 7000);
  };

  useEffect(() => {
      if (!activeTicket || !business) return;

      const peopleAhead = activeTicket.peopleAhead;
      
      /* 
      // 1. Removed "Heads Up" to reduce noise as requested
      if (peopleAhead > 0 && peopleAhead <= 2 && !isTurn && !hasNotifiedReady) {
          sendNotification("Heads Up! ⚠️", `${peopleAhead} people ahead of you.`);
          setHasNotifiedReady(true);
      }
      */

      /*
      // 2. Removed "You Are Next" as requested - only "Your Turn" remains
      if (peopleAhead === 0 && !isTurn && !hasNotifiedNext) {
          sendNotification("You Are Next! 🚨", "Get ready to be called.");
          setHasNotifiedNext(true);
      }
      */

      // 3. "Your Turn" Notification (Strict check: ONLY if currently being served, not if already passed)
      if (activeTicket.number === business.currentServing && !hasNotifiedTurn) {
          sendNotification("It's Your Turn! 🏃", "Please go to the counter now.");
          setHasNotifiedTurn(true);
      }
  }, [activeTicket, business, hasNotifiedReady, hasNotifiedNext, hasNotifiedTurn]);
  
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    
    // Request notification permission immediately and unlock audio
    unlockAudio();
    if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
    }

    try {
      // joinQueue returns the new ticketId
      const newTicketId = await joinQueue({ slug, name: name || undefined });
      
      localStorage.setItem(`queue-ticket-${slug}`, newTicketId);
      setTicketId(newTicketId);
    } catch (err) {
      console.error(err);
      alert("Failed to join queue");
    }
  };

  const handleLeave = async () => {
      if (confirm("Leave this queue? You will lose your spot.")) {
          if (ticketId) {
             await leaveQueue({ slug, ticketId: ticketId as Id<"tickets"> });
          }
          setTicketId(null);
          localStorage.removeItem(`queue-ticket-${slug}`);
          // Don't clear name - remember it for next time!
      }
  }

  if (business === undefined) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (business === null) return <div className="flex h-screen items-center justify-center">Business not found.</div>;

  // Prevent flash
  if (ticketId && activeTicket === undefined) {
      return <div className="flex h-screen items-center justify-center">Loading ticket...</div>;
  }

  // Check offline first (only if not already waiting)
  if (!business.isOnline && !activeTicket) {
      return (
          <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6 text-center">
              <div className="text-6xl mb-4">😴</div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">We Are Closed</h1>
              <p className="text-gray-500">The queue is currently not accepting new tickets.</p>
          </div>
      );
  }

  // Decide UI State
  let uiState: 'join' | 'waiting' | 'close' | 'turn' | 'byebye' = 'join';
  let bgColor = "bg-white";
  let statusText = "Join the Queue";
  let statusEmoji = "👋";

  if (activeTicket) {
      const position = activeTicket.number - business.currentServing;
      
      if (position <= 0) {
          if (activeTicket.number === business.currentServing) {
              uiState = 'turn';
              bgColor = "bg-green-500 animate-pulse";
              statusText = "It's Your Turn!";
              statusEmoji = "🏃";
          } else if (activeTicket.number < business.currentServing) {
              uiState = 'byebye';
              bgColor = "bg-blue-400"; // Bye Bye Blue
              statusText = "Thanks for visiting!";
              statusEmoji = "👋";
          }
          } else if (position <= 2) { // Only 2 people ahead
          uiState = 'close';
          bgColor = "bg-yellow-400";
          statusText = "Get Ready!";
          statusEmoji = "⚠️";
      } else {
          uiState = 'waiting';
          bgColor = "bg-blue-500";
          statusText = "Relax & Wait";
          statusEmoji = "☕";
      }
  }

  // --- RENDERING ---
  
  // Silent unlocker: When user taps ANYWHERE, unlock audio if needed
  const handleGlobalClick = () => {
      unlockAudio();
  };

  // Join Screen
  if (!activeTicket) {
    return (
      <div 
        className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center p-4"
        onClick={handleGlobalClick} // Unlock on interaction
      >
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <h1 className="text-2xl font-bold">{business.name}</h1>
            <p className="text-neutral-500">Virtual Queue</p>
          </CardHeader>
          <CardContent>
            <div className="mb-8 text-center bg-gray-50 p-6 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Current Serving</p>
                <p className="text-5xl font-black text-black">#{business.currentServing}</p>
            </div>
            
              <form onSubmit={handleJoin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Your Name (Optional)</label>
                  <Input 
                    type="text" 
                    placeholder="e.g. Alex" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-lg py-6"
                    maxLength={20}
                  />
                  <p className="text-xs text-neutral-400">Enter your name so we can call you.</p>
                </div>
              <Button type="submit" size="lg" className="w-full text-lg py-6 bg-black hover:bg-neutral-800">
                Get Ticket
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Status Screen
  return (
      <div 
        className={`min-h-screen transition-colors duration-500 ease-in-out flex flex-col ${uiState === 'turn' || uiState === 'close' || uiState === 'waiting' || uiState === 'byebye' ? bgColor : 'bg-neutral-50'}`}
        onClick={handleGlobalClick} // Unlock on interaction
      >
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-white">
        
        <div className="mb-6 animate-in zoom-in duration-300">
            <span className="text-6xl filter drop-shadow-lg">{statusEmoji}</span>
        </div>

        <h1 className={`text-4xl font-bold mb-2 drop-shadow-md ${uiState === 'close' ? 'text-black' : 'text-white'}`}>
            {statusText}
        </h1>
        
        <div className={`mt-8 bg-white/20 backdrop-blur-md rounded-2xl p-8 border border-white/30 shadow-2xl w-full max-w-sm`}>
            <p className={`text-sm uppercase tracking-widest mb-2 font-medium ${uiState === 'close' ? 'text-black/70' : 'text-white/80'}`}>Your Ticket</p>
            <div className={`text-8xl font-black tracking-tighter ${uiState === 'close' ? 'text-black' : 'text-white'}`}>
                {activeTicket.number}
            </div>
        </div>

        <div className="mt-8 space-y-2">
             <div className={`text-lg font-medium bg-black/10 px-4 py-2 rounded-full backdrop-blur-sm ${uiState === 'close' ? 'text-black' : 'text-white'}`}>
                Now Serving: <span className="font-bold">#{business.currentServing}</span>
             </div>
             {activeTicket.peopleAhead > 0 && (
                 <div className="space-y-4">
                     <div className={`text-sm opacity-80 ${uiState === 'close' ? 'text-black' : 'text-white'}`}>
                         {activeTicket.peopleAhead} people ahead of you
                     </div>
                 </div>
             )}
             
             {/* Smart AI Wait Time: Shown if waiting, even if 0 ahead */}
             {(activeTicket.peopleAhead >= 0 && activeTicket.number > business.currentServing) && (
                <div className={`mt-2 inline-flex items-center gap-3 px-5 py-3 rounded-xl border backdrop-blur-md shadow-lg ${uiState === 'close' ? 'bg-gradient-to-r from-indigo-100 to-purple-100 border-indigo-200 text-indigo-900' : 'bg-gradient-to-r from-indigo-500/30 to-purple-500/30 border-white/20 text-white'}`}>
                    <div className="bg-white/20 p-2 rounded-lg">
                        <span className="text-xl">🧠</span>
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] uppercase font-bold tracking-widest opacity-80 leading-none mb-1">Predicted by AI</p>
                        <p className="text-lg font-black leading-none">
                            ~{(activeTicket as any).estimatedWaitTime ? (activeTicket as any).estimatedWaitTime : "< 1"} min
                        </p>
                    </div>
                </div>
             )}
        </div>

      </div>

      <div className="p-6 space-y-4">
          <Button 
            variant="ghost" 
            className={`w-full ${uiState === 'close' ? 'text-black hover:bg-black/10' : 'text-white hover:bg-white/20'}`}
            onClick={handleLeave}
          >
              Leave Queue
          </Button>
      </div>

      {/* IN-APP NOTIFICATION OVERLAY */}
      {inAppNotification && (
        <div className="fixed top-4 left-4 right-4 z-50 animate-in slide-in-from-top duration-300">
             <div className="bg-white text-black p-4 rounded-xl shadow-2xl border-l-4 border-blue-500 flex items-start gap-4">
                 <div className="text-3xl">🔔</div>
                 <div>
                     <h3 className="font-bold text-lg">{inAppNotification.title}</h3>
                     <p className="text-gray-600 leading-tight">{inAppNotification.body}</p>
                 </div>
                 <button 
                    onClick={() => setInAppNotification(null)}
                    className="ml-auto text-gray-400 hover:text-black"
                 >
                     ✕
                 </button>
             </div>
        </div>
      )}
    </div>
  );
}
