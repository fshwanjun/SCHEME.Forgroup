// src/app/admin/page.tsx

'use client';

import { useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import StudioManager from '@/components/admin/StudioManager';
import ProjectManager from '@/components/admin/ProjectManager';
import LandingPageManager from '@/components/admin/LandingPageManager';

type Tab = 'studio' | 'project' | 'landing';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('studio');

  return (
    <AdminShell activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="animate-in fade-in zoom-in-95 duration-300">
        {activeTab === 'studio' ? (
          <StudioManager />
        ) : activeTab === 'project' ? (
          <ProjectManager />
        ) : (
          <LandingPageManager />
        )}
      </div>
    </AdminShell>
  );
}
