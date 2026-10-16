import React from "react";

export function GitHubBrandLogo({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-label="GitHub">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
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
