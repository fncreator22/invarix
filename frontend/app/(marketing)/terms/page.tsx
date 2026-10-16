import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and conditions governing the use of the INVARIX exception debt platform, CLI, and API.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="11 October 2026"
      intro={
        <>
          <strong>Enterprise Agreement:</strong> These Terms of Service constitute a legally binding agreement between you
          (or the organization you represent) and INVARIX Inc. By accessing our platform, using the INVARIX CLI,
          or connecting via the Model Context Protocol (MCP) server, you acknowledge and agree to these terms.
        </>
      }
      sections={[
        {
          id: "eligibility",
          title: "Eligibility & Age Restrictions",
          body: (
            <>
              <p>
                INVARIX is an enterprise software engineering and architecture risk management tool designed for business use.
                You must be at least <strong>18 years of age</strong> (or the age of majority in your jurisdiction) and have the
                legal authority to bind your organization to these terms to register an account or create a workspace.
              </p>
              <p>
                The platform is not directed to individuals under the age of 18, and we do not knowingly permit account creation by minors.
              </p>
            </>
          ),
        },
        {
          id: "service-scope",
          title: "The Service & Human-in-the-Loop Mandate",
          body: (
            <>
              <p>
                INVARIX provides graph-based exception intelligence, dependency topology analysis, Avalanche Centrality scoring,
                and temporal expiry collision forecasting.
              </p>
              <p>
                <strong>Human Approval Invariant:</strong> The Steward agent and MCP tools operate under read-only introspection.
                Any automated proposal (such as scheduling a review, adjusting a grace period, or flagging a waiver) produces a{" "}
                <code className="font-mono text-xs">ProposedAction</code> that requires explicit review and confirmation by an authorized human operator.
                INVARIX will never automatically alter production code or bypass pull request gates without your affirmative human command.
              </p>
            </>
          ),
        },
        {
          id: "high-risk-disclaimer",
          title: "High-Risk Advice & Security Disclaimer",
          body: (
            <>
              <p>
                <strong>Not a Cyber Warranty or Certified Audit:</strong> INVARIX is an architectural heuristic modeling tool.
                Graph algorithms, centrality calculations, and timeline simulations are decision-support heuristics designed to aid
                engineering teams in prioritizing debt.
              </p>
              <p>
                INVARIX does <em>not</em> guarantee that all security vulnerabilities, regulatory compliance gaps, or system outages
                will be detected or prevented. Using INVARIX does not replace formal SOC2/ISO 27001 audits, code reviews, penetration testing,
                or sound engineering practices. You remain solely responsible for validating all exceptions, waivers, and infrastructure changes.
              </p>
            </>
          ),
        },
        {
          id: "ip-ownership",
          title: "Intellectual Property & Customer Data Ownership",
          body: (
            <>
              <p>
                <strong>Your IP Remains Yours:</strong> You retain complete, unencumbered ownership and intellectual property rights in and to
                your source code, repository metadata, exception documentation, graph nodes, and custom playbooks ingested into INVARIX.
              </p>
              <p>
                <strong>No Model Training:</strong> INVARIX will never use your proprietary data, graph topology, or conversational queries to train
                or improve public foundational models.
              </p>
              <p>
                <strong>AI Outputs:</strong> To the extent that the Steward agent generates suggestions, runbooks, or synthesized summaries,
                INVARIX assigns to you all of its rights, title, and interest in such outputs, subject to third-party model license constraints.
              </p>
            </>
          ),
        },
        {
          id: "open-source-licensing",
          title: "Open Source Dependencies & Attributions",
          body: (
            <>
              <p>
                INVARIX is engineered with permissive open-source libraries (e.g., Next.js under MIT, FastAPI under MIT,
                FalkorDB client under BSD-3-Clause, Lucide icons under ISC, and typography under SIL Open Font License OFL 1.1).
              </p>
              <p>
                We do not incorporate copyleft (GPL/AGPL) libraries into our distribution. Full open-source attribution notices
                and license text are maintained in our public repository root and build manifests.
              </p>
            </>
          ),
        },
        {
          id: "acceptable-use",
          title: "Acceptable Use & API Integrity",
          body: (
            <>
              <p>You agree not to:</p>
              <ul>
                <li>Access or probe workspaces for which your organization has not been granted explicit membership.</li>
                <li>Exceed published API rate limits or launch denial-of-service attacks against our FalkorDB or API endpoints.</li>
                <li>Upload malicious payloads, de-anonymized personal health information (PHI), or unauthorized trade secrets.</li>
                <li>Reverse-engineer or extract raw algorithm weights for the purpose of building a competitive graph clone.</li>
              </ul>
            </>
          ),
        },
        {
          id: "fees-refunds",
          title: "Subscriptions, Cancellation & Refund Policy",
          body: (
            <>
              <p>
                <strong>Early Access Tier:</strong> During early access and hackathon evaluation periods, standard workspace tiers
                and sandbox exploration are provided free of charge.
              </p>
              <p>
                <strong>Commercial Subscriptions:</strong> For paid enterprise or team tiers:
              </p>
              <ul>
                <li>
                  <strong>Cancellation Anytime:</strong> You may cancel your subscription at any time via Workspace Billing Settings.
                  Cancellation takes effect at the end of the current billing cycle, with no further charges.
                </li>
                <li>
                  <strong>Refund Window:</strong> We offer a <strong>14-day money-back guarantee</strong> for annual or monthly billing plans
                  if you are unsatisfied with the service or encounter technical defects. To request a refund, email{" "}
                  <a href="mailto:billing@invarix.dev" className="text-brand hover:underline font-mono">
                    billing@invarix.dev
                  </a> within 14 days of payment.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "liability",
          title: "Limitation of Liability & Warranty",
          body: (
            <>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, INVARIX IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES
                OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.
              </p>
              <p>
                IN NO EVENT SHALL INVARIX INC. BE LIABLE FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
                INCLUDING LOSS OF PROFITS, DATA, OR BUSINESS INTERRUPTION ARISING FROM PRODUCTION OUTAGES, MISSED SECURITY WAIVERS,
                OR RELIANCE ON STEWARD AGENT SUGGESTIONS. OUR TOTAL LIABILITY SHALL NOT EXCEED THE TOTAL FEES PAID BY YOU IN THE
                TWELVE (12) MONTHS PRECEDING THE CLAIM.
              </p>
            </>
          ),
        },
        {
          id: "contact",
          title: "Legal Inquiries & Dispute Resolution",
          body: (
            <>
              <p>
                These terms are governed by the laws of the State of Delaware, without regard to conflict of law principles.
              </p>
              <p>
                Formal notices, legal inquiries, or copyright infringement notifications should be directed to{" "}
                <a href="mailto:legal@invarix.dev" className="text-brand hover:underline font-mono">
                  legal@invarix.dev
                </a>.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
