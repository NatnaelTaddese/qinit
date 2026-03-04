import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { MobileDisclaimer } from "@/components/mobile-disclaimer";
import { DialRoot } from "dialkit";
import "./globals.css";
import "dialkit/styles.css";
import "./dialkit-overrides.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kiñit (ቅኝት)",
  description: "Learn the Melekket",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={outfit.variable}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <MobileDisclaimer />
          {children}
          <DialRoot position="top-right" defaultOpen={false} />
        </ThemeProvider>
      </body>
    </html>
  );
}
