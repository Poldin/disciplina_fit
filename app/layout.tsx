import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "./components/AuthProvider";
import OneSignalInit from "./components/OneSignalInit";
import AuthenticatedPwaFlow from "./components/AuthenticatedPwaFlow";
import ProfileNameGate from "./components/ProfileNameGate";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "disciplinaFit",
  description: "Prenditi cura di te, con disciplina.",
  appleWebApp: {
    capable: true,
    title: "disciplinaFit",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <OneSignalInit />
        <AuthProvider>
          <AuthenticatedPwaFlow />
          <ProfileNameGate>{children}</ProfileNameGate>
        </AuthProvider>
      </body>
    </html>
  );
}
