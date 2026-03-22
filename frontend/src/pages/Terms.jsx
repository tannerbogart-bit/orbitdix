import { useNavigate } from 'react-router-dom'

export default function Terms() {
  const navigate = useNavigate()
  const updated  = 'March 21, 2026'

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
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>Terms of Service</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '40px' }}>Last updated: {updated}</p>

        {[
          {
            h: '1. Acceptance of Terms',
            p: 'By creating an account or using OrbitSix ("the Service"), you agree to these Terms of Service. If you do not agree, do not use the Service. We may update these terms from time to time; continued use of the Service after changes constitutes acceptance.',
          },
          {
            h: '2. Description of Service',
            p: 'OrbitSix is a professional networking intelligence tool that helps users map warm introduction paths through their existing contact network. The Service includes network import tools, path-finding algorithms, an AI-powered agent, and outreach tracking.',
          },
          {
            h: '3. Account Registration',
            p: 'You must provide accurate information when creating an account. You are responsible for maintaining the security of your credentials and for all activity under your account. You must be at least 18 years old to use the Service.',
          },
          {
            h: '4. Acceptable Use',
            p: 'You agree not to: use the Service for spam or unsolicited outreach; scrape or harvest data from the Service; attempt to reverse-engineer or circumvent any security measures; violate any applicable laws or third-party platform terms (including LinkedIn\'s User Agreement); use the Service to harass, defame, or harm others.',
          },
          {
            h: '5. Your Data',
            p: 'You retain ownership of the contact data you import into OrbitSix. By importing data, you represent that you have the right to do so under applicable law and any applicable platform terms. You grant OrbitSix a limited license to process and store your data solely to provide the Service.',
          },
          {
            h: '6. Subscriptions and Billing',
            p: 'Paid plans are billed monthly through Stripe. You may cancel at any time; cancellation takes effect at the end of the current billing period and you retain access until then. No refunds are issued for partial months. We reserve the right to change pricing with 30 days\' notice.',
          },
          {
            h: '7. AI-Generated Content',
            p: 'The Service uses artificial intelligence to generate draft messages and network insights. AI-generated content may contain errors or inaccuracies. You are solely responsible for reviewing, editing, and deciding whether to send any message drafted by the Service.',
          },
          {
            h: '8. Limitation of Liability',
            p: 'The Service is provided "as is" without warranties of any kind. To the maximum extent permitted by law, OrbitSix shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, even if advised of the possibility of such damages. Our total liability shall not exceed the amount you paid in the 12 months preceding the claim.',
          },
          {
            h: '9. Termination',
            p: 'We may suspend or terminate your account for violations of these Terms. You may delete your account at any time. Upon termination, your data will be deleted in accordance with our Privacy Policy.',
          },
          {
            h: '10. Contact',
            p: 'Questions about these terms? Email us at hello@orbitsix.com.',
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
