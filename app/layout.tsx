import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "./components/AuthProvider";
import OneSignalInit from "./components/OneSignalInit";
import PwaNotificationsFlow from "./components/PwaNotificationsFlow";
import ProfileNameGate from "./components/ProfileNameGate";

const oneSignalEnabled = Boolean(process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID);
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
        <PwaNotificationsFlow oneSignalEnabled={oneSignalEnabled} />
        <AuthProvider>
          <ProfileNameGate>{children}</ProfileNameGate>
        </AuthProvider>
      </body>
    </html>
  );
}
