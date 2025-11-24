"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const router = useRouter();

  const handleAuth = async () => {
    setLoading(true);

    let error = null;

    if (isSigningUp) {
      // Sign-up flow
      const result = await supabase.auth.signUp({
        email,
        password,
      });
      error = result.error;
    } else {
      // Sign-in flow
      const result = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      error = result.error;
    }

    setLoading(false);

    if (error) {
      alert(`Authentication failed: ${error.message}`);
    } else if (isSigningUp) {
      alert("Sign-up complete. Please verify your email to activate the account.");
      setIsSigningUp(false);
      // Reset form after sign-up
      setEmail("");
      setPassword("");
    } else {
      // On successful sign-in, navigate to the admin dashboard
      router.push("/admin");
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">
          {isSigningUp ? "Admin Sign Up" : "Admin Login"}
        </CardTitle>
        <CardDescription className="text-center">
          Access the portfolio management dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAuth();
            }}
          />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button onClick={handleAuth} disabled={loading} className="w-full">
          {loading ? "Processing..." : isSigningUp ? "Sign Up" : "Log In"}
        </Button>
        <Button
          variant="link"
          className="w-full text-stone-500"
          onClick={() => setIsSigningUp((prev) => !prev)}
        >
          {isSigningUp ? "Already have an account? Log in" : "Need an account? Sign up"}
        </Button>
      </CardFooter>
    </Card>
  );
}
