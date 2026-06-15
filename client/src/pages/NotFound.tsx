import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <Card className="border-slate-800 bg-slate-950/80 backdrop-blur-md shadow-2xl text-slate-100 text-center">
          <CardHeader className="space-y-1 pb-6 border-b border-slate-900 flex flex-col items-center">
            <div className="bg-red-500/10 text-red-500 p-3 rounded-full mb-4">
              <AlertTriangle className="h-10 w-10" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-white">
              Page Not Found
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              The page you are looking for does not exist or has been moved.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 pb-6">
            <p className="text-sm text-slate-400 mb-6">
              Please check the URL or click the button below to return to the dashboard.
            </p>
            <Link href="/">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 h-11">
                <Home className="h-4 w-4" />
                Return to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
