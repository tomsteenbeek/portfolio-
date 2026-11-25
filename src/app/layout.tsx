import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: { default: "Digitale Informatie | Strategie & Portfolio", template: "%s · Digitale Informatie" },
  description: "Strategie-, jaarplan- en portfoliomanagement voor team Digitale Informatie.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
