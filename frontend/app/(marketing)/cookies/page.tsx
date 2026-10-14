import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "Explanation of cookies, local storage, and privacy tokens used by the Reprieve platform.",
};

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      updated="11 October 2026"
      intro={
        <>
          <strong>Zero Ad Tracking Guarantee:</strong> Reprieve does not use third-party advertising cookies,
          behavioral tracking pixels, or cross-site tracking scripts. We only utilize strictly necessary authentication
          cookies and local storage keys essential to delivering the service.
        </>
      }
      sections={[
        {
          id: "what-are-cookies",
          title: "What Are Cookies?",
          body: (
            <>
              <p>
                Cookies are small text files stored on your computer or mobile device when you visit a web application.
                They allow web applications to identify your authenticated session, remember your workspace preferences,
                and maintain security boundaries.
              </p>
              <p>
                In addition to HTTP cookies, modern web applications utilize Local Storage and Session Storage to store
                client-side state without transmitting it on every HTTP request header.
              </p>
            </>
          ),
        },
        {
          id: "cookies-we-use",
          title: "Cookies & Storage Keys We Use",
          body: (
            <>
              <p>Reprieve only sets strictly necessary first-party and essential service tokens:</p>
              <ul>
                <li>
                  <strong className="font-mono text-xs">__session / __client_uat (Clerk):</strong> Strictly necessary
                  authentication session tokens provided by Clerk to authenticate your account, maintain active login state,
                  and verify cryptographic JSON Web Tokens (JWT).
                </li>
                <li>
                  <strong className="font-mono text-xs">reprieve_workspace (Local Storage):</strong> Stores your currently
                  selected workspace identifier so you return directly to your active architecture graph without repeated picker prompts.
                </li>
                <li>
                  <strong className="font-mono text-xs">reprieve_theme (Local Storage):</strong> Remembers your display preferences
                  (dark mode / light mode).
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "cookie-consent-analysis",
          title: "Why You Don't See an Intrusive Cookie Banner",
          body: (
            <>
              <p>
                Under the European Union ePrivacy Directive (Directive 2002/58/EC Article 5(3)) and European Data Protection
                Board (EDPB) Guidelines 05/2020:
              </p>
              <p className="border-l-2 border-brand pl-4 italic">
                Cookies that are &quot;strictly necessary in order to provide an information society service explicitly requested
                by the subscriber or user&quot; are legally exempt from the requirement for prior consent banners.
              </p>
              <p>
                Because Reprieve operates with <strong>zero advertising networks, zero marketing pixels (e.g. Meta Pixel, Google Ads),
                and zero third-party cross-site behavioral trackers</strong>, we are not required to disrupt your engineering workflow
                with intrusive cookie consent popups.
              </p>
            </>
          ),
        },
        {
          id: "managing-cookies",
          title: "How to Manage & Disable Cookies",
          body: (
            <>
              <p>
                You can configure your browser to reject cookies or notify you when a cookie is placed.
                Most web browsers allow control of cookies through browser settings (e.g., Chrome, Firefox, Safari, Edge).
              </p>
              <p>
                <em>Note:</em> Because the cookies we use are strictly necessary for authentication and multi-tenant security,
                disabling all cookies in your browser will prevent you from signing in to the Reprieve dashboard.
              </p>
            </>
          ),
        },
        {
          id: "contact",
          title: "Questions About Cookies",
          body: (
            <>
              <p>
                If you have questions regarding our use of cookies or tracking technologies, please contact our security team at{" "}
                <a href="mailto:privacy@reprieve.dev" className="text-brand hover:underline font-mono">
                  privacy@reprieve.dev
                </a>.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
