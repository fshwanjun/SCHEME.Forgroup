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
      // 회원가입 로직
      const result = await supabase.auth.signUp({
        email,
        password,
      });
      error = result.error;
    } else {
      // 로그인 로직
      const result = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      error = result.error;
    }

    setLoading(false);

    if (error) {
      alert(`인증 실패: ${error.message}`);
    } else if (isSigningUp) {
      alert("가입이 완료되었습니다. 이메일을 확인하여 인증을 완료해주세요.");
      setIsSigningUp(false);
      // 회원가입 후 폼 초기화
      setEmail("");
      setPassword("");
    } else {
      // 로그인 성공 시: 관리자 페이지로 이동
      router.push("/admin");
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">
          {isSigningUp ? "관리자 회원가입" : "관리자 로그인"}
        </CardTitle>
        <CardDescription className="text-center">
          포트폴리오 관리를 위해 접근합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">이메일</Label>
          <Input
            id="email"
            type="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">비밀번호</Label>
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
          {loading ? "처리 중..." : isSigningUp ? "회원가입" : "로그인"}
        </Button>
        <Button
          variant="link"
          className="w-full text-stone-500"
          onClick={() => setIsSigningUp((prev) => !prev)}
        >
          {isSigningUp ? "이미 계정이 있다면 로그인" : "계정이 없다면 회원가입"}
        </Button>
      </CardFooter>
    </Card>
  );
}
