"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  LogIn,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/auth/auth.service";

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [doorOpening, setDoorOpening] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!login.trim() || !password) {
      toast.error("Please enter email/phone and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await authService.login({
        login: login.trim(),
        password,
      });

      authService.saveSession(response);
      toast.success("Logged in successfully.");
      setDoorOpening(true);

      window.setTimeout(() => {
        router.replace("/dashboard");
        router.refresh();
      }, 1250);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl overflow-hidden rounded-3xl border bg-white shadow-xl md:min-h-[calc(100vh-3rem)] lg:grid-cols-[1.25fr_0.75fr]">
        <section className="relative hidden bg-slate-100 lg:block">
          <Image
            src="/images/plan-login-hero.png"
            alt="Plan and Achievement Management System"
            fill
            priority
            className="object-cover"
            sizes="65vw"
          />
        </section>

        <section className="flex items-center justify-center px-5 py-8 sm:px-8 lg:px-12">
          <Card className="w-full max-w-md border-0 shadow-none">
            <CardContent className="p-0">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-700 text-white shadow">
                    <LockKeyhole className="h-7 w-7" />
                  </div>
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-slate-950">Welcome Back</h1>
                <p className="mt-2 text-sm text-slate-500">
                  Sign in to access the Plan & Achievement Management System.
                </p>
              </div>

              <form onSubmit={onSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login">Email or phone number</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="login"
                      type="text"
                      value={login}
                      onChange={(event) => setLogin(event.target.value)}
                      placeholder="admin@plan.local"
                      className="h-12 pl-10"
                      autoComplete="username"
                      disabled={loading || doorOpening}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                      className="h-12 pl-10 pr-10"
                      autoComplete="current-password"
                      disabled={loading || doorOpening}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      disabled={loading || doorOpening}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading || doorOpening}
                  className="h-12 w-full bg-emerald-700 text-white hover:bg-emerald-800"
                >
                  {loading || doorOpening ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="mr-2 h-4 w-4" />
                  )}
                  {doorOpening ? "Opening Dashboard..." : loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>

              <div className="mt-8 rounded-2xl border bg-slate-50 p-4">
                <div className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-700" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Secure government system</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Your data is protected and access is controlled by user roles.
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-8 text-center text-xs font-medium uppercase tracking-[0.25em] text-emerald-700">
                One Vision. One Plan. One Achievement.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>

      {doorOpening && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-slate-950/95">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-emerald-400/20" />
          <div className="relative flex flex-col items-center gap-6">
            <div className="relative h-80 w-56 rounded-t-full border-4 border-emerald-400 bg-slate-900 shadow-2xl shadow-emerald-950/50">
              <div className="absolute inset-4 rounded-t-full bg-gradient-to-b from-emerald-500/20 to-emerald-950/20" />
              <div className="absolute inset-y-0 left-0 w-full origin-left animate-door-open rounded-t-full border-r border-emerald-300 bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-950 shadow-2xl">
                <div className="absolute left-1/2 top-14 h-16 w-16 -translate-x-1/2 rounded-full border border-white/25 bg-white/10" />
                <div className="absolute right-7 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-amber-300 shadow-lg shadow-amber-300/50" />
              </div>
              <div className="absolute inset-0 -z-10 rounded-t-full bg-emerald-400/20 blur-3xl" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-white">Opening Dashboard</p>
              <p className="mt-1 text-sm text-emerald-100">Please wait while your workspace is prepared...</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
