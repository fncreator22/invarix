import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How INVARIX collects, processes, and protects your architectural graph data and personal information.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="16 October 2026"
      intro={
        <>
          <strong>Commitment to Data Sovereignty:</strong> INVARIX is built on the principle of minimal data extraction.
          We process only the architectural metadata and exception records required to compute graph blast radiuses and
          temporal collisions. We never sell your data, and we enforce a strict <strong>Zero Model Training</strong> guarantee
          across all AI subprocessors.
        </>
      }
      sections={[
        {
          id: "data-controller",
          title: "Data Controller & Contact",
          body: (
            <>
              <p>
                INVARIX Inc. (&quot;INVARIX&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is the data controller
                responsible for your personal data and architectural metadata under the EU General Data Protection Regulation
                (GDPR), UK GDPR, and California Consumer Privacy Act (CCPA/CPRA).
              </p>
              <p>
                If you have any questions regarding this Privacy Policy, your data protection rights, or our security practices,
                contact our Data Protection Team at{" "}
                <a href="mailto:privacy@invarix.dev" className="text-brand hover:underline font-mono">
                  privacy@invarix.dev
                </a>.
              </p>
            </>
          ),
        },
        {
          id: "data-we-collect",
          title: "What User Data We Collect",
          body: (
            <>
              <p>We collect and process the following categories of data when you access INVARIX:</p>
              <ul>
                <li>
                  <strong>Identity &amp; Account Data:</strong> Your name, work email address, and authentication identifiers
                  processed via our authentication provider (Clerk).
                </li>
                <li>
                  <strong>Architectural &amp; Exception Metadata:</strong> Service identifiers, dependency links, control frameworks,
                  exception records (e.g., security waivers, skipped tests, feature flag overrides), expiry dates, and engineer assignment tags.
                  We do not ingest your production source code or raw database contents.
                </li>
                <li>
                  <strong>Steward Agent &amp; Operational Logs:</strong> Conversational queries asked to the Steward AI assistant,
                  memory turns, session tokens, IP addresses, client headers, and deterministic audit trail entries.
                </li>
                <li>
                  <strong>Contact &amp; Consultation Inquiries:</strong> Name, work email, company name, and service fleet scale
                  voluntarily submitted via our architecture audit booking forms.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "why-we-collect",
          title: "Why We Collect Each Piece of Data & Lawful Basis",
          body: (
            <>
              <p>
                Under GDPR Article 6, we only process personal data when a valid lawful basis applies:
              </p>
              <ul>
                <li>
                  <strong>Account Provisioning &amp; Multi-Tenant Isolation (Contractual Necessity):</strong> We process your email
                  and credentials to authenticate you, enforce workspace role-based access control (RBAC), and isolate tenant graphs in FalkorDB.
                </li>
                <li>
                  <strong>Computing Blast Radius &amp; Centrality (Contractual Necessity):</strong> We parse exception records and service
                  dependencies to compute Avalanche Centrality ($P = p_0^h$), detect temporal expiry collisions, and surface proof paths.
                </li>
                <li>
                  <strong>System Security &amp; Auditability (Legitimate Interests):</strong> We log API requests and maintain immutable
                  audit logs to detect unauthorized access, protect API keys, and enforce rate limits.
                </li>
                <li>
                  <strong>Direct Inquiries &amp; Consultations (Consent):</strong> Information submitted through booking forms is used solely
                  to schedule the requested architecture audit and communicate relevant findings. You may withdraw consent at any time.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "ai-processing",
          title: "AI Processing & Zero Model Training Invariant",
          body: (
            <>
              <p>
                INVARIX incorporates the Steward agent for natural language graph exploration. We enforce strict architectural boundaries:
              </p>
              <ul>
                <li>
                  <strong>Deterministic Core:</strong> Risk scores, detection rules (R1–R8), and collision timelines are computed
                  purely by deterministic Cypher graph algorithms, never by probabilistic LLMs.
                </li>
                <li>
                  <strong>Zero Foundation Model Training:</strong> Neither INVARIX nor our AI infrastructure partners (e.g., Google Cloud Vertex AI, OpenAI)
                  use your workspace data, exceptions, queries, or Steward conversations to train, evaluate, or fine-tune public AI models.
                </li>
                <li>
                  <strong>Opt-Out Control:</strong> Workspace administrators can completely disable AI reasoning features via Workspace Settings.
                  When disabled, the graph intelligence engine continues to run deterministically with zero data egress to AI endpoints.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "subprocessors",
          title: "Third-Party Subprocessors",
          body: (
            <>
              <p>
                We partner with vetted subprocessors adhering to stringent SOC2, ISO 27001, and standard contractual clauses (SCCs):
              </p>
              <ul>
                <li>
                  <strong>Clerk Inc. (USA):</strong> User authentication, session management, and multi-factor authentication.
                </li>
                <li>
                  <strong>FalkorDB Ltd. / Redis:</strong> Managed low-latency graph database infrastructure storing tenant graph nodes and memory facts.
                </li>
                <li>
                  <strong>Google Cloud / AWS:</strong> Cloud hosting, API routing, serverless execution, and encrypted storage.
                </li>
                <li>
                  <strong>Google Gemini API / OpenAI API:</strong> Ephemeral inference for Steward conversational tooling, bound by zero-data-retention enterprise agreements.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "data-rights",
          title: "Data Deletion, Correction & User Rights",
          body: (
            <>
              <p>
                You retain full sovereign ownership over your data. Under GDPR, CCPA, and global privacy frameworks, you have the right to:
              </p>
              <ul>
                <li>
                  <strong>Request Deletion (Right to Erasure):</strong> You can delete any workspace immediately via Workspace Settings,
                  which permanently flushes all related tenant graphs (<code className="font-mono text-xs">org_*</code> and <code className="font-mono text-xs">mem_*</code>).
                  To request complete deletion of your user identity across all systems, email{" "}
                  <a href="mailto:privacy@invarix.dev" className="text-brand hover:underline font-mono">
                    privacy@invarix.dev
                  </a>.
                </li>
                <li>
                  <strong>Request Correction (Right to Rectification):</strong> You can modify service records, owners, and exception details directly in the app.
                  For account or identity corrections that cannot be modified self-service, contact us to update your verified records.
                </li>
                <li>
                  <strong>Data Portability:</strong> You can export full exception graphs and detection outputs in structured JSON or CSV format at any time.
                </li>
                <li>
                  <strong>Response SLA:</strong> We respond to and execute verified data subject requests within <strong>30 calendar days</strong> without charge.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "retention-security",
          title: "Retention & Security Standards",
          body: (
            <>
              <p>
                We enforce defense-in-depth security measures across the INVARIX stack:
              </p>
              <ul>
                <li>
                  <strong>Encryption:</strong> All data is encrypted in transit using TLS 1.3 and at rest using AES-256.
                </li>
                <li>
                  <strong>API Key Protection:</strong> Generated API keys are stored solely as one-way SHA-256 cryptographic hashes; raw secrets are never recoverable from our database.
                </li>
                <li>
                  <strong>Retention Timelines:</strong> Active workspace graph nodes persist until deleted by workspace owners. Ephemeral Steward conversational memory turns are pruned after 90 days.
                </li>
              </ul>
            </>
          ),
        },
      ]}
    />
  );
}
