// src/app/admin/page.tsx

"use client";

import { useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import AboutManager from "@/components/admin/AboutManager";
import ProjectManager from "@/components/admin/ProjectManager";
import { cn } from "@/lib/utils";

type Tab = "about" | "project";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("about");

  return (
    <AdminShell activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="animate-in fade-in zoom-in-95 duration-300">
        {activeTab === "about" ? <AboutManager /> : <ProjectManager />}
      </div>
    </AdminShell>
  );
}
