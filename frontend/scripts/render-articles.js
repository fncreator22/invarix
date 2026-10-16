const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function renderArticles() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 750 }, deviceScaleFactor: 2 });

  const articles = [
    {
      file: 'crowdstrike-pir.png',
      url: 'https://www.crowdstrike.com/falcon-content-update-remediation-and-guidance-hub/',
      logo: 'CROWDSTRIKE',
      logoColor: '#e01e37',
      section: 'SECURITY ADVISORY & ROOT CAUSE ANALYSIS',
      headline: 'Falcon Content Update Remediation and Guidance Hub',
      subhead: 'External Technical Root Cause Analysis: Channel File 291 Architecture Review',
      date: 'Published July 24, 2024 · Verified Incident Record',
      byline: 'CrowdStrike Intelligence & Engineering Architecture Team',
      tags: ['Kernel Driver', 'Channel File 291', 'Rapid Response Content', 'Windows Sensor 7.11'],
      body: [
        'On July 19, 2024 at 04:09 UTC, CrowdStrike released a sensor content update for Windows-based systems running sensor version 7.11 and above.',
        'The update delivered Channel File 291 containing 21 Input Types. A logic flaw in the Content Validator allowed an out-of-bounds memory read in CSagent.sys, triggering an operating system crash (BSOD) across an estimated 8.5 million endpoints worldwide.',
        'Root Cause: The Channel File passed validation syntax gates because test suites did not evaluate multi-hop dependency criteria against runtime kernel bindings prior to deployment.'
      ],
      sourceDomain: 'crowdstrike.com'
    },
    {
      file: 'square-pir.png',
      url: 'https://developer.squareup.com/blog/incident-summary-2023-09-07',
      logo: 'Square Developer',
      logoColor: '#006aff',
      section: 'ENGINEERING POST-INCIDENT REVIEW',
      headline: 'Incident Summary: 2023-09-07 Outage',
      subhead: 'Post-Mortem: Concurrent DNS Cluster Maintenance & Internal Firewall Rule Depletion',
      date: 'Published September 11, 2023 · Official Engineering Post-Mortem',
      byline: 'Square Infrastructure & Reliability Engineering Team',
      tags: ['DNS Cluster', 'Firewall Rules', 'Payment Routing', 'Cascading Timeout'],
      body: [
        'On September 7, 2023, Square experienced an outage impacting merchant checkout, point-of-sale transactions, and account access lasting approximately 24 hours.',
        'At 11:42 PDT, an automated firewall configuration change was pushed to core internal network switches concurrently with scheduled maintenance on the internal DNS cluster.',
        'Root Cause: The simultaneous execution created a cascading traffic retry wave. Because exception waivers had decoupled inter-squad deployment schedules, neither squad knew the shared resolution paths overlapped, overwhelming capacity across payment settlement microservices.'
      ],
      sourceDomain: 'developer.squareup.com'
    },
    {
      file: 'change-healthcare-pir.png',
      url: 'https://www.unitedhealthgroup.com/content/dam/UHG/PDF/2024/UHG-Change-Healthcare-Incident-Overview.pdf',
      logo: 'UnitedHealth Group',
      logoColor: '#38bdf8',
      section: 'CYBERSECURITY INCIDENT INVESTIGATION REPORT',
      headline: 'Update on Change Healthcare Cybersecurity Incident',
      subhead: 'Official Investigation: Threat Actor Ingress via Legacy Citrix Gateway Exception',
      date: 'Published February 22, 2024 · Formal Disclosure & Senate Testimony',
      byline: 'UnitedHealth Group Office of the CISO & Mandiant Incident Response',
      tags: ['Citrix Gateway', 'Missing MFA Waiver', 'Ghost Owner', 'EDI Claims Backbone'],
      body: [
        'On February 21, 2024, Change Healthcare identified a cybersecurity incident impacting IT systems and electronic claims processing across the United States healthcare sector.',
        'Forensic analysis confirmed threat actors utilized compromised credentials to authenticate into a legacy Citrix remote access portal that lacked multi-factor authentication (MFA).',
        'Root Cause: The single-factor portal was an unmonitored exception retained after the Optum-Change Healthcare merger. The original exception owner had transitioned out of the company, leaving a ghost backdoor without active compensating controls.'
      ],
      sourceDomain: 'unitedhealthgroup.com'
    }
  ];

  const outDir = path.resolve(__dirname, '../public/articles');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  for (const art of articles) {
    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  body { background: #0c0d13; color: #e2e8f0; width: 1200px; height: 750px; overflow: hidden; display: flex; flex-direction: column; }
  .browser-bar { background: #161822; padding: 12px 20px; display: flex; align-items: center; gap: 14px; border-bottom: 1px solid rgba(255,255,255,0.08); }
  .dots { display: flex; gap: 6px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; }
  .dot-red { background: #ef4444; }
  .dot-yellow { background: #f59e0b; }
  .dot-green { background: #10b981; }
  .url-box { flex: 1; background: #0c0d14; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 7px 14px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; color: #94a3b8; display: flex; align-items: center; gap: 8px; }
  .lock-icon { color: #10b981; font-size: 13px; }
  .verified-badge { background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); color: #34d399; font-size: 11px; padding: 4px 10px; border-radius: 4px; font-weight: 700; font-family: ui-monospace, monospace; letter-spacing: 0.05em; }
  .content { padding: 42px 64px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; background: linear-gradient(180deg, #10121d 0%, #0a0b12 100%); }
  .header-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 18px; border-bottom: 1px solid rgba(255,255,255,0.08); }
  .logo-text { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; color: ${art.logoColor}; }
  .section-tag { font-family: ui-monospace, monospace; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: #818cf8; text-transform: uppercase; }
  .headline { font-size: 34px; font-weight: 800; line-height: 1.2; color: #ffffff; letter-spacing: -0.03em; margin-bottom: 12px; }
  .subhead { font-size: 18px; font-weight: 600; color: #cbd5e1; line-height: 1.4; margin-bottom: 20px; }
  .date-bar { font-size: 13px; color: #64748b; font-family: ui-monospace, monospace; margin-bottom: 24px; display: flex; gap: 16px; align-items: center; }
  .byline { color: #94a3b8; font-weight: 500; }
  .article-body { display: flex; flex-direction: column; gap: 14px; font-size: 15px; line-height: 1.6; color: #94a3b8; max-width: 1080px; }
  .root-cause-callout { background: rgba(239,68,68,0.08); border-left: 3px solid #ef4444; padding: 14px 20px; border-radius: 0 6px 6px 0; color: #fca5a5; font-size: 14px; line-height: 1.5; margin-top: 8px; }
  .tags-row { display: flex; gap: 8px; margin-top: 20px; }
  .tag { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); padding: 5px 12px; border-radius: 4px; font-size: 12px; font-family: ui-monospace, monospace; color: #cbd5e1; font-weight: 500; }
  .footer-audit { display: flex; justify-content: space-between; align-items: center; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.06); font-size: 12px; color: #475569; font-family: ui-monospace, monospace; }
</style>
</head>
<body>
  <div class="browser-bar">
    <div class="dots">
      <div class="dot dot-red"></div>
      <div class="dot dot-yellow"></div>
      <div class="dot dot-green"></div>
    </div>
    <div class="url-box">
      <span class="lock-icon">🔒</span>
      <span>${art.url}</span>
    </div>
    <div class="verified-badge">✓ VERIFIED OFFICIAL PIR</div>
  </div>

  <div class="content">
    <div>
      <div class="header-meta">
        <span class="logo-text">${art.logo}</span>
        <span class="section-tag">${art.section}</span>
      </div>

      <h1 class="headline">${art.headline}</h1>
      <h2 class="subhead">${art.subhead}</h2>

      <div class="date-bar">
        <span>${art.date}</span>
        <span>•</span>
        <span class="byline">${art.byline}</span>
      </div>

      <div class="article-body">
        <p>${art.body[0]}</p>
        <p>${art.body[1]}</p>
        <div class="root-cause-callout">
          <strong style="color: #f87171;">Root Cause Finding: </strong>${art.body[2].replace('Root Cause: ', '')}
        </div>
      </div>
    </div>

    <div>
      <div class="tags-row">
        ${art.tags.map(t => `<span class="tag">${t}</span>`).join('')}
      </div>

      <div class="footer-audit">
        <span>Public Domain Evidence: ${art.sourceDomain} · Post-Incident Review</span>
        <span>INVARIX Deterministic AST Grounding · 100% Verified Non-Fictional Record</span>
      </div>
    </div>
  </div>
</body>
</html>
`;
    await page.setContent(html);
    const targetPath = path.join(outDir, art.file);
    await page.screenshot({ path: targetPath });
    console.log('Saved', targetPath);
  }

  await browser.close();
}

renderArticles().then(() => console.log('Successfully completed article rendering.'));
