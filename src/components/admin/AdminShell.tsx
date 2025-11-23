"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  Loader2,
  LayoutDashboard,
  FileText,
  FolderKanban,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface AdminShellProps {
  children: React.ReactNode;
  activeTab: "about" | "project";
  onTabChange: (tab: "about" | "project") => void;
}

export default function AdminShell({
  children,
  activeTab,
  onTabChange,
}: AdminShellProps) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // 인증 및 관리자 권한 확인 로직
  useEffect(() => {
    const checkAuthAndRole = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      // 관리자 권한 확인
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", session.user.id)
        .single();

      if (error || !profile || !profile.is_admin) {
        alert("관리자 권한이 없습니다.");
        router.push("/login");
      } else {
        setIsAdmin(true);
      }
    };

    checkAuthAndRole();

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.push("/login");
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-lg text-stone-600 bg-stone-950">
        <Loader2 className="animate-spin h-8 w-8 text-stone-500 mb-4" />
        <span>관리자 권한 확인 중...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-stone-200 font-sans">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-stone-800 bg-stone-950 sticky top-0 z-30">
        <div className="flex items-center gap-2 text-stone-100">
          <span className="font-bold text-lg tracking-tight">HJ.supacms</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="text-stone-400 hover:text-white"
        >
          {isMobileOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </Button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar - Responsive */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r border-stone-800 bg-stone-950 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6 border-b border-stone-800 flex justify-between items-center">
          <div className="flex items-center gap-2 text-stone-100">
            <svg
              className="fill-white h-8 w-auto"
              viewBox="0 0 146 48"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M145.238 18.2001C145.276 15.0909 143.426 12.0454 141.74 10.8829C140.397 9.95728 139.411 9.54079 137.243 8.72091C134.148 7.55098 132.136 5.5256 129.062 3.16516C126.663 1.32323 122.691 -0.322158 118.11 0.05409C113.919 0.39758 110.57 2.27508 108.721 4.85453C106.683 7.69792 104.648 11.5868 103.433 16.5089C102.771 19.1894 102.426 22.585 100.331 22.8321C97.8062 23.1307 96.0778 19.4197 94.2725 15.5785C90.7469 8.07791 88.5397 4.07864 83.3425 1.47298C79.6797 -0.36334 73.4068 -0.190191 68.2206 2.03361C61.642 4.85453 50.5565 5.1428 44.0749 2.12065C38.0538 -0.686239 33.0305 0.388221 28.0375 1.69573C21.8406 3.31865 17.5836 2.34247 13.5757 1.07239C9.3608 -0.262258 5.13037 -0.113444 1.70922 3.83155C-0.269127 6.11337 -0.230677 9.81783 0.340582 12.2887C1.23867 16.1691 3.21427 18.216 3.94483 21.4759C4.44193 23.6941 4.56644 26.7219 3.87067 30.3299C3.13829 34.1261 2.78674 36.334 3.89264 39.7193C4.91432 42.8472 7.57196 45.1346 10.8768 45.6363C16.8659 46.5451 20.9435 43.4967 26.2551 38.0365C33.5835 30.504 38.5033 31.8461 40.4331 32.1082C45.6458 32.8167 49.1585 39.1474 55.2977 43.6156C63.148 49.3295 76.9919 45.4978 79.6925 44.5263C83.1036 43.2983 89.5349 42.149 92.8141 44.2202C97.0335 46.8858 105.417 48.3028 113.051 46.3589C119.379 44.7472 123.571 45.057 126.417 46.0799C132.666 48.3262 139.732 47.3959 142.343 46.0331C144.316 45.0045 146.155 43.8458 145.932 40.6814C145.77 38.3846 144.47 36.7907 143.371 35.7687C141.582 34.1036 139.833 32.4115 139.916 30.0791C139.957 28.9578 140.262 27.962 141.053 27.1795C143.741 24.5196 145.197 21.6238 145.238 18.2001ZM21.8086 17.8089C19.4778 17.8931 17.1561 17.5618 17.0563 16.2337C16.9401 14.681 19.8247 14.2074 21.847 14.0923C23.8226 13.9809 26.5508 14.2289 26.6377 15.6516C26.7311 17.164 24.122 17.7247 21.8086 17.8089ZM71.3745 16.1523C70.0187 16.4658 68.6885 15.7161 68.5585 14.5659C68.4037 13.1994 69.571 12.372 70.8087 12.183C72.008 11.9995 73.1542 12.503 73.3345 13.702C73.4856 14.7034 72.7028 15.8453 71.3745 16.1523ZM70.2054 31.6374C67.9433 32.345 65.5886 30.9289 64.9936 29.0336C64.4379 27.2628 65.5447 24.7096 68.357 23.9824C71.0394 23.2898 72.8328 24.9969 73.2393 26.6386C73.7657 28.7678 72.1645 31.0244 70.2054 31.6374ZM119.343 35.895C118.727 35.252 118.631 33.9445 118.614 33.2416C118.598 32.5359 118.664 30.2157 119.783 30.1549C121.273 30.0735 122.269 34.1495 121.549 35.8772C121.193 36.7336 119.953 36.5324 119.343 35.895ZM126.133 19.1351C124.486 19.1333 122.365 18.6232 121.459 18.1505C120.968 17.8941 120.26 17.3484 119.946 16.6699C119.657 16.0437 119.535 15.236 119.901 14.3029C120.186 13.5794 120.809 13.1385 122.152 13.3819C123.495 13.6252 127.034 15.9595 127.709 16.6914C128.504 17.5553 128.196 19.1379 126.133 19.1351Z" />
            </svg>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden text-stone-500 hover:text-stone-200"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 py-6 px-3 space-y-6 overflow-y-auto">
          <div>
            <h3 className="px-3 text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Management
            </h3>
            <nav className="space-y-1">
              <button
                onClick={() => {
                  onTabChange("about");
                  setIsMobileOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  activeTab === "about"
                    ? "bg-stone-800 text-white"
                    : "text-stone-400 hover:text-stone-100 hover:bg-stone-900"
                )}
              >
                <FileText className="h-4 w-4" />
                About Page
              </button>
              <button
                onClick={() => {
                  onTabChange("project");
                  setIsMobileOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  activeTab === "project"
                    ? "bg-stone-800 text-white"
                    : "text-stone-400 hover:text-stone-100 hover:bg-stone-900"
                )}
              >
                <FolderKanban className="h-4 w-4" />
                Projects
              </button>
            </nav>
          </div>
        </div>

        <div className="p-4 border-t border-stone-800">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-stone-800 flex items-center justify-center text-xs font-bold text-stone-400">
              HJ
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-200 truncate">
                Admin
              </p>
              <button
                onClick={handleLogout}
                className="text-xs text-stone-500 hover:text-red-400 flex items-center gap-1 transition-colors"
              >
                <LogOut className="h-3 w-3" /> Logout
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content - Added left padding to account for fixed sidebar */}
      <div className="md:pl-64 min-h-screen flex flex-col bg-stone-950/50 transition-all duration-300">
        <header className="h-16 border-b border-stone-800 bg-stone-950/50 backdrop-blur-sm hidden md:flex items-center justify-between px-8 sticky top-0 z-10">
          <h2 className="text-lg font-semibold text-stone-100">
            {activeTab === "about" ? "About Management" : "Project Management"}
          </h2>
          {/* Optional: Add header actions here */}
        </header>

        <main className="flex-1 p-4 md:p-8">
          <div className="max-w-5xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
