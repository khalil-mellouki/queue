import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-neutral-100 p-4">
      <Card className="w-full max-w-md text-center shadow-xl">
        <CardHeader>
           <div className="text-6xl mb-4">🗓️</div>
           <CardTitle className="text-3xl font-bold">Q-Flow</CardTitle>
           <CardDescription>Queue Management System</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <p className="text-neutral-500">
                Welcome to the Q-Flow platform. 
            </p>
            <div className="grid gap-4">
                <Link href="/admin">
                    <Button className="w-full" size="lg">Business Login</Button>
                </Link>
                <Link href="/super-admin">
                    <Button variant="outline" className="w-full">Super Admin</Button>
                </Link>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}