import { useNavigate } from 'react-router-dom'

export default function Terms() {
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
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>Terms of Service</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '40px' }}>Last updated: {updated}</p>

        {[
          {
            h: '1. Acceptance of Terms',
            p: 'By creating an account or using OrbitSix ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to all of these Terms, you may not use the Service. We may update these Terms from time to time; we will notify you of material changes by email or in-app notice. Continued use of the Service after changes take effect constitutes your acceptance of the revised Terms.',
          },
          {
            h: '2. The Service',
            p: 'OrbitSix is a professional networking intelligence platform operated by OrbitSix ("we," "us," or "our"). The Service helps users map warm introduction paths through their existing professional contact network. Features include network import tools, BFS path-finding, an AI-powered agent, outreach tracking, and target account management.',
          },
          {
            h: '3. Eligibility and Account Registration',
            p: 'You must be at least 18 years old and capable of entering a binding contract to use the Service. You agree to provide accurate, current, and complete information when creating your account and to keep it up to date. You are solely responsible for safeguarding your credentials and for all activity that occurs under your account. Notify us immediately at hello@orbitsix.ai if you suspect unauthorized access.',
          },
          {
            h: '4. Acceptable Use',
            p: 'You agree not to: (a) use the Service for unsolicited bulk outreach or spam; (b) scrape, crawl, or harvest data from the Service in an automated fashion; (c) reverse-engineer, decompile, or circumvent any security measures of the Service; (d) violate any applicable law, regulation, or third-party platform terms (including LinkedIn\'s User Agreement); (e) use the Service to harass, defame, threaten, or harm any person; (f) upload contact data you do not have the right to process; (g) misrepresent your identity or affiliation; or (h) interfere with or disrupt the integrity or performance of the Service.',
          },
          {
            h: '5. Your Data and Content',
            p: 'You retain full ownership of the contact data, notes, and content you import or create within the Service. By using the Service, you represent that you have all rights necessary to import and process such data under applicable law (including GDPR, CCPA, and any applicable platform terms). You grant OrbitSix a limited, non-exclusive, royalty-free license to store and process your data solely to provide the Service to you. We do not sell your data or use it to train AI models.',
          },
          {
            h: '6. AI-Generated Content',
            p: 'The Service uses Anthropic\'s Claude AI API to generate draft messages, network insights, and recommendations. AI-generated content may contain errors, inaccuracies, or inappropriate suggestions. You are solely responsible for reviewing, editing, and deciding whether to use any AI-generated content. OrbitSix makes no warranty that AI-generated content is accurate, appropriate, or fit for any particular purpose.',
          },
          {
            h: '7. Subscriptions and Billing',
            p: 'Paid plans are billed monthly in advance via Stripe. By subscribing, you authorize us to charge your payment method on a recurring basis. You may cancel at any time from your account settings; cancellation takes effect at the end of the current billing period and you retain access until then. No refunds are provided for partial billing periods or unused features. We reserve the right to change pricing with at least 30 days\' written notice. Failure to pay may result in suspension or termination of your account.',
          },
          {
            h: '8. Intellectual Property',
            p: 'The Service, including its software, design, trademarks, and documentation, is owned by OrbitSix and protected by intellectual property laws. These Terms do not grant you any rights to our intellectual property except the limited right to use the Service as described. You may not copy, modify, distribute, sell, or lease any part of the Service.',
          },
          {
            h: '9. Indemnification',
            p: 'You agree to indemnify, defend, and hold harmless OrbitSix and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising out of or relating to: (a) your use of the Service in violation of these Terms; (b) your violation of any applicable law or third-party rights; (c) contact data or content you import or create in the Service; or (d) any dispute between you and a third party arising from your use of the Service.',
          },
          {
            h: '10. Disclaimers',
            p: 'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS. YOUR USE OF THE SERVICE IS AT YOUR SOLE RISK.',
          },
          {
            h: '11. Limitation of Liability',
            p: 'TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, ORBITSIX SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF OR INABILITY TO USE THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID TO US IN THE 12 MONTHS PRECEDING THE CLAIM OR (B) $100.',
          },
          {
            h: '12. Termination',
            p: 'We may suspend or terminate your access to the Service at any time, with or without cause, with or without notice, including for violation of these Terms. You may delete your account at any time from your account settings. Upon termination, your right to use the Service ceases immediately. Sections 5, 9, 10, 11, 13, and 14 survive termination.',
          },
          {
            h: '13. Governing Law and Dispute Resolution',
            p: 'These Terms are governed by the laws of the State of Delaware, without regard to conflict of law principles. Any dispute arising from or relating to these Terms or the Service shall first be subject to good-faith negotiation. If unresolved within 30 days, disputes shall be resolved by binding arbitration under the rules of the American Arbitration Association in Delaware, except that either party may seek injunctive relief in court for intellectual property violations. You waive any right to participate in a class action lawsuit or class-wide arbitration.',
          },
          {
            h: '14. General',
            p: 'These Terms constitute the entire agreement between you and OrbitSix regarding the Service and supersede all prior agreements. If any provision is found unenforceable, the remaining provisions remain in full force. Our failure to enforce any right is not a waiver of that right. You may not assign your rights under these Terms without our consent. We may assign our rights freely. Notices to you will be sent to the email on your account.',
          },
          {
            h: '15. Contact',
            p: 'Questions about these Terms? Email us at hello@orbitsix.ai.',
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
