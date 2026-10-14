import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { CLERK_ENABLED } from "@/lib/auth-config";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { STATIC_CANVAS } from "@/lib/tokens";
import "@/styles/globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz"],
  display: "swap",
  variable: "--font-bricolage",
});
const instrument = Instrument_Sans({ subsets: ["latin"], display: "swap", variable: "--font-instrument" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], display: "swap", variable: "--font-jetbrains" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: "Reprieve: the exception debt agent", template: "%s · Reprieve" },
  description:
    "Individually reasonable exceptions add up to one unreasonable risk. Reprieve is the agent that sees the sum.",
  applicationName: "Reprieve",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: STATIC_CANVAS.light },
    { media: "(prefers-color-scheme: dark)", color: STATIC_CANVAS.dark },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bricolage.variable} ${instrument.variable} ${jetbrains.variable}`}
    >
      <body>
        {CLERK_ENABLED ? (
          <ClerkProvider appearance={clerkAppearance} signInUrl="/sign-in" signUpUrl="/sign-up">
            <Providers>{children}</Providers>
          </ClerkProvider>
        ) : (
          <Providers>{children}</Providers>
        )}
      </body>
    </html>
  );
}
