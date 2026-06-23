import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
  title: "BULLSH*T! — AI Game Show",
  description: "Can you catch the AI lying? A web-based trivia game powered by Claude.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-9WE0V7SP61"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-9WE0V7SP61');
          `}
        </Script>
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        {/* Course project disclaimer */}
        <footer className="w-full text-center py-3 px-4 text-xs text-gray-600 border-t border-gray-800">
          This site is a university course project. It tracks page visits, clicks, and gameplay events for UX analysis purposes via Google Analytics.
        </footer>
      </body>
    </html>
  );
}
