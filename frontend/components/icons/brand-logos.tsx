import React from "react";

export function GitHubBrandLogo({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-label="GitHub">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

export function GoogleBrandLogo({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-label="Google">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

export function AppleBrandLogo({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-label="Apple">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.42c.67-.82 1.13-1.96 1-3.11-1 .04-2.19.67-2.88 1.48-.6.7-1.13 1.83-.99 2.94 1.11.09 2.22-.52 2.87-1.31z" />
    </svg>
  );
}

export function SlackBrandLogo({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-label="Slack">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52z" fill="#E01E5A" />
      <path d="M6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A" />
      <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834z" fill="#36C5F0" />
      <path d="M8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0" />
      <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834z" fill="#2EB67D" />
      <path d="M17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D" />
      <path d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52z" fill="#ECB22E" />
      <path d="M15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E" />
    </svg>
  );
}

export function JiraBrandLogo({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-label="Jira">
      <path d="M11.53 2c0 5.264-4.267 9.531-9.53 9.531V2h9.53z" fill="#0052CC" />
      <path d="M11.53 11.531c0-5.264 4.267-9.531 9.53-9.531v9.531h-9.53z" fill="#2684FF" />
      <path d="M11.53 11.531c0 5.264-4.267 9.531-9.53 9.531v-9.531h9.53z" fill="#0052CC" />
      <path d="M21.06 11.531c-5.263 0-9.53 4.267-9.53 9.531h9.53v-9.531z" fill="#2684FF" />
    </svg>
  );
}

export function PagerDutyBrandLogo({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-label="PagerDuty">
      <path d="M4 2h10.5C18.09 2 21 4.91 21 8.5S18.09 15 14.5 15H9v7H4V2z" fill="#06AC38" />
      <path d="M9 7h5.5c.83 0 1.5.67 1.5 1.5S15.33 10 14.5 10H9V7z" fill="#ffffff" />
    </svg>
  );
}

export function DatadogBrandLogo({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-label="Datadog">
      <rect width="24" height="24" rx="4" fill="#632CA6" />
      <path d="M6 16.5c1.2-1.5 2.5-3 4-3.5 1.2-.4 2.8-.2 3.8.5.8.6 1.4 1.5 1.8 2.5.4 1 .5 2.2.4 3.5H6.5c-.3-1-.5-2-.5-3z" fill="#ffffff" />
      <circle cx="15.5" cy="8.5" r="2.5" fill="#ffffff" />
      <path d="M8 8c1-1.5 3-2 5-1.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function GitLabBrandLogo({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-label="GitLab">
      <path d="m23.6 9.6-1.5-4.5c-.2-.5-.8-.7-1.3-.4l-2.1 1.6H5.3L3.2 4.7c-.5-.3-1.1-.1-1.3.4L.4 9.6c-.2.5 0 1.1.4 1.4L12 20.2l11.2-9.2c.4-.3.6-.9.4-1.4z" fill="#E24329" />
      <path d="m12 20.2 6.7-13.9H5.3L12 20.2z" fill="#E24329" />
      <path d="m12 20.2-6.7-13.9H1.9L12 20.2z" fill="#FC6D26" />
      <path d="m12 20.2 6.7-13.9h3.4L12 20.2z" fill="#FC6D26" />
      <path d="M1.9 6.3 3.2 4.7c.2-.5.8-.7 1.3-.4l.8.6L1.9 6.3z" fill="#FCA326" />
      <path d="m22.1 6.3-1.3-1.6c-.2-.5-.8-.7-1.3-.4l-.8.6 3.4 1.4z" fill="#FCA326" />
    </svg>
  );
}

export function ServiceNowBrandLogo({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-label="ServiceNow">
      <circle cx="12" cy="12" r="10" fill="#032D42" />
      <path d="M12 5.5A6.5 6.5 0 1 0 18.5 12 6.5 6.5 0 0 0 12 5.5zm0 10A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5z" fill="#81B5A1" />
      <circle cx="12" cy="12" r="2" fill="#293E40" />
    </svg>
  );
}

export function SvixBrandLogo({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-label="Svix">
      <rect width="24" height="24" rx="4" fill="#18181B" />
      <path d="M6 12l4-4 4 4-4 4-4-4zm8-4l4 4-4 4" stroke="#F43F5E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
