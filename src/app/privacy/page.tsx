'use client';

import { motion } from 'framer-motion';
import Header from '@/components/Header';
import MobileMenu from '@/components/MobileMenu';
import HomeContainer from '@/components/HomeContainer';

export default function PrivacyPage() {
  return (
    <div className="flex h-screen flex-col md:gap-4">
      <Header isFixed={false} />
      <MobileMenu />
      <HomeContainer
        isFixed={false}
        addClassName="studio-typography p-5 flex-1 flex flex-col gap-5 overflow-y-auto md:overflow-y-hidden pt-20 md:pt-0">
        <motion.div
          className="page-studio"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
          {/* [좌측] 데스크탑 빈 영역 (50%) */}
          <div className="hidden h-full md:block md:w-2/5" />

          {/* [우측] 컨텐츠 영역 (50%) */}
          <div className="flex w-full min-w-0 flex-col gap-8 md:w-3/5 md:overflow-y-auto md:pr-5">
            {/* 타이틀 */}
            <h3>Privacy Policy</h3>

            {/* Intro */}
            <p>
              FOR (&ldquo;we&rdquo;, &ldquo;us&rdquo;) respects your privacy. This policy explains how we collect and
              use personal information when you visit our website or contact us.
            </p>

            {/* Information We Collect */}
            <div className="flex flex-col gap-2">
              <h5>Information We Collect</h5>
              <ul className="flex flex-col space-y-1">
                <li>Information you provide when contacting us (such as name, email, and message)</li>
                <li>Limited technical data (such as browser type and anonymized usage data)</li>
              </ul>
            </div>

            {/* How We Use Information */}
            <div className="flex flex-col gap-2">
              <h5>How We Use Information</h5>
              <p>We use your information only to:</p>
              <ul className="flex flex-col space-y-1">
                <li>Respond to inquiries</li>
                <li>Operate and improve our website</li>
              </ul>
              <p>We do not sell personal data or use it for advertising.</p>
            </div>

            {/* Legal Basis */}
            <div className="flex flex-col gap-2">
              <h5>Legal Basis (EU Visitors)</h5>
              <p>We process personal data based on legitimate interest or your consent, in accordance with the GDPR.</p>
            </div>

            {/* Cookies & Analytics */}
            <div className="flex flex-col gap-2">
              <h5>Cookies & Analytics</h5>
              <p>
                We may use limited, privacy-friendly analytics to understand website performance. No advertising or
                cross-site tracking is used. You can control cookies through your browser settings.
              </p>
            </div>

            {/* Data Retention */}
            <div className="flex flex-col gap-2">
              <h5>Data Retention</h5>
              <p>We keep personal data only as long as necessary to manage communications and business records.</p>
            </div>

            {/* Your Rights */}
            <div className="flex flex-col gap-2">
              <h5>Your Rights</h5>
              <ul className="flex flex-col space-y-1">
                <li>You have the right to access, correct, or delete your personal data.</li>
                <li>EU and California residents have additional rights under applicable data protection laws.</li>
              </ul>
            </div>

            {/* Contact */}
            <div className="flex flex-col gap-2">
              <h5>Contact</h5>
              <span>FOR</span>
              <a href="mailto:contact@studio-for.com" className="transition-opacity hover:opacity-60">
                contact@studio-for.com
              </a>
              <span>San Francisco, USA</span>
            </div>

            {/* 하단 여백 */}
            <div className="h-20" />
          </div>
        </motion.div>
      </HomeContainer>
    </div>
  );
}
