import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Home() {
  return (
 
    <div className="flex h-screen w-full items-center justify-center bg-[#0a0a0a] p-4 font-sans relative overflow-hidden">
        
      {/* Background Orbs */}
      <div className="absolute top-0 -left-20 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 -right-20 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      <Card className="w-full max-w-md text-center shadow-2xl bg-black/40 border-white/10 backdrop-blur-xl relative z-10">
        <CardHeader className="pt-12 pb-6">
           <div className="text-7xl mb-6 filter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] animate-bounce duration-[3000ms]">🗓️</div>
           <CardTitle className="text-4xl font-black text-white tracking-tight">Zerovide</CardTitle>
           <CardDescription className="text-gray-400 text-lg font-medium">Virtual Queue System</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pb-12 px-8">
            <p className="text-gray-400 text-sm leading-relaxed">
                Seamlessly manage lines, reduce wait times, and delight your customers with AI-powered predictions.
            </p>
            <div className="grid gap-4 mt-4">
                <Link href="/admin">
                    <Button className="w-full h-12 text-lg bg-white text-black hover:bg-gray-200 font-bold shadow-lg shadow-white/10" size="lg">
                        Business Login
                    </Button>
                </Link>
                <Link href="/super-admin">
                    <Button variant="ghost" className="w-full text-gray-500 hover:text-white hover:bg-white/5">
                        Super Admin Access
                    </Button>
                </Link>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}