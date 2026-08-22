import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/providers/AppProviders";

export const metadata: Metadata = {
  title: "Plan & Achievement System",
  description: "Role-based value chain plan and achievement system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
