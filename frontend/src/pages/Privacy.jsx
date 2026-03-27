import { useNavigate } from 'react-router-dom'

export default function Privacy() {
  const navigate = useNavigate()
  const updated  = 'March 26, 2026'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', color: 'var(--text-primary)' }}>
      <nav style={{ padding: '16px 32px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="3" fill="white" />
              <circle cx="9" cy="9" r="7" stroke="white" strokeWidth="1.5" fill="none" />
              <circle cx="9" cy="2" r="1.5" fill="white" /><circle cx="9" cy="16" r="1.5" fill="white" />
              <circle cx="2" cy="9" r="1.5" fill="white" /><circle cx="16" cy="9" r="1.5" fill="white" />
            </svg>
          </div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px' }}>OrbitSix</span>
        </div>
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '56px 32px 80px' }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>Privacy Policy</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '40px' }}>Last updated: {updated}</p>

        {[
          {
            h: '1. Who We Are',
            p: 'OrbitSix ("we," "us," or "our") operates the OrbitSix platform at orbitsix.ai. This Privacy Policy explains how we collect, use, store, and share information about you when you use our Service. For questions, contact us at hello@orbitsix.ai.',
          },
          {
            h: '2. Information We Collect',
            p: 'We collect: (a) Account information you provide — name, email address, password hash, company, role, and profile details; (b) Contact data you import — names, job titles, companies, LinkedIn profile URLs, and email addresses of your professional contacts, imported via CSV or browser extension; (c) Usage data — IP address at signup, log files, browser type, pages visited, features used, and timestamps; (d) Payment information — processed entirely by Stripe; we store only your Stripe customer ID, not card numbers; (e) Communications — support emails you send us.',
          },
          {
            h: '3. Contact Data You Import',
            p: 'OrbitSix processes the professional contact data you import on your behalf to power network path-finding, AI analysis, and outreach features. By importing contact data, you represent that you have the legal right to process it. We do not sell, share, rent, or use your imported contact data to build profiles on third parties, for advertising, or for any purpose other than providing the Service to you.',
          },
          {
            h: '4. How We Use Your Information',
            p: 'We use your information to: provide, operate, and improve the Service; authenticate your account and maintain security; generate AI-powered network insights and draft messages using Anthropic\'s API; send transactional emails (account verification, password reset, service notices) via Resend; process billing via Stripe; respond to support requests; enforce our Terms of Service; and comply with legal obligations. We record your IP address and timestamp when you agree to our Terms as proof of consent.',
          },
          {
            h: '5. AI Processing',
            p: 'When you use the AI agent, your messages and relevant network context are sent to Anthropic\'s API to generate responses. This is governed by Anthropic\'s API usage policy. We do not use your data to train AI models. AI-generated draft messages are stored on our servers only if you explicitly save them to your Outreach Tracker.',
          },
          {
            h: '6. Data Sharing',
            p: 'We do not sell your personal information. We share data only with: (a) Sub-processors who act on our behalf under confidentiality obligations — Anthropic (AI inference), Stripe (billing), Resend (transactional email), Railway (cloud hosting); (b) Law enforcement or regulators when required by applicable law or valid legal process; (c) A successor entity in a merger, acquisition, or sale of assets — you will be notified before your data is transferred and becomes subject to a different privacy policy.',
          },
          {
            h: '7. International Data Transfers',
            p: 'OrbitSix is hosted in the United States. If you access the Service from the EEA, UK, or other regions with data protection laws, your data will be transferred to and processed in the US. We rely on Standard Contractual Clauses and sub-processor agreements to ensure adequate protection for such transfers.',
          },
          {
            h: '8. Data Retention',
            p: 'We retain your account data and imported contacts for as long as your account is active. If you delete your account, we will delete your personal data and imported contact data within 30 days, except where we must retain it for legal, regulatory, or legitimate business purposes (e.g., billing records for tax compliance, which we retain for 7 years).',
          },
          {
            h: '9. Security',
            p: 'We use industry-standard security measures: HTTPS/TLS encryption for all data in transit; bcrypt hashing for passwords (never stored in plaintext); JWT-based authentication with expiry and refresh tokens; access controls scoping data strictly to the authenticated account. No security measure is 100% guaranteed. In the event of a data breach affecting your rights, we will notify you as required by applicable law.',
          },
          {
            h: '10. Cookies and Local Storage',
            p: 'We use browser localStorage to store your authentication tokens (access and refresh). We do not use third-party tracking cookies, advertising pixels, or cross-site tracking technologies. Our Chrome extension stores your API token and sync timestamps in chrome.storage.local, which is private to the extension and not accessible to websites.',
          },
          {
            h: '11. Your Rights (EEA / UK — GDPR)',
            p: 'If you are in the EEA or UK, you have the right to: access your personal data; correct inaccurate data; request deletion ("right to be forgotten"); restrict or object to processing; data portability (receive your data in a machine-readable format); and lodge a complaint with your local supervisory authority. To exercise these rights, email hello@orbitsix.ai. We will respond within 30 days.',
          },
          {
            h: '12. Your Rights (California — CCPA)',
            p: 'If you are a California resident, you have the right to: know what personal information we collect, use, disclose, or sell; request deletion of your personal information; opt out of the sale of personal information (we do not sell personal information); and not be discriminated against for exercising these rights. To submit a request, email hello@orbitsix.ai with "California Privacy Request" in the subject line.',
          },
          {
            h: '13. Children',
            p: 'The Service is not directed to children under 18. We do not knowingly collect personal information from anyone under 18. If we learn we have collected such data, we will delete it promptly. If you believe we have collected data from a child, contact us at hello@orbitsix.ai.',
          },
          {
            h: '14. Changes to This Policy',
            p: 'We may update this Privacy Policy from time to time. We will notify you of material changes by email to the address on your account or by in-app notice at least 14 days before the change takes effect. The "Last updated" date at the top of this page will always reflect the most recent revision. Continued use of the Service after changes take effect constitutes acceptance.',
          },
          {
            h: '15. Contact',
            p: 'For privacy questions, data requests, or to report a concern: email hello@orbitsix.ai.',
          },
        ].map(({ h, p }) => (
          <div key={h} style={{ marginBottom: '28px' }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '17px', fontWeight: 700, margin: '0 0 8px', color: 'var(--text-primary)' }}>{h}</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{p}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
