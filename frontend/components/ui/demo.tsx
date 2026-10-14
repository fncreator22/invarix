import { Component } from "@/components/ui/features-card";
import Footer01 from "@/components/ui/footer-01";

import SettingsWorkspaceHub from "@/components/ui/settings";

export function DemoOne() {
  return <Component />;
}

export function Footer01Demo() {
  return <Footer01 />;
}

export function SettingsDemo() {
  return (
    <div className="min-h-screen bg-canvas p-6">
      <SettingsWorkspaceHub slug="northwind-pay" workspaceName="Northwind Pay" />
    </div>
  );
}

export default SettingsDemo;
