import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import dynamic from "next/dynamic";
import AppNavbar from "@/components/AppNavbar";
import AppFooter from "@/components/AppFooter";

const inter = Inter({ subsets: ["latin"] });
const ClientOnlyProviders = dynamic(() => import("@/app/providers-client"), { ssr: false });

export const metadata: Metadata = {
  title: "Somcet",
  description: "need some test tokens? wanna send a tx? this lil site got u covered. no fluff, just vibes 🧃",
  icons: {
    icon: "/avatar.png",
    shortcut: "/avatar.png",
    apple: "/avatar.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <ClientOnlyProviders>
          <div className="flex flex-col min-h-screen">
            <AppNavbar />
            <main className="flex-grow container mx-auto px-4 py-8">
              {children}
            </main>
            <AppFooter />
          </div>
        </ClientOnlyProviders>
      </body>
    </html>
  );
}
