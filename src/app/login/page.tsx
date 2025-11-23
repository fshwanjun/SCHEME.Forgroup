// src/app/login/page.tsx

import AuthForm from "@/components/auth/AuthForm"; // 👈 새로 만든 컴포넌트를 불러옵니다.

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-stone-100">
      {/* 컴포넌트를 렌더링합니다. 모든 로직은 AuthForm.tsx 안에 있습니다. */}
      <AuthForm />
    </div>
  );
}
