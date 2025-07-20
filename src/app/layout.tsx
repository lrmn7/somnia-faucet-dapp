import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import dynamic from "next/dynamic";
import AppNavbar from "@/components/AppNavbar";
import AppFooter from "@/components/AppFooter";
import { CustomCursor } from '@/components/custom-cursor'
import Loader from "@/components/Loader";
import { usePathname } from "next/navigation"; // Tambahkan ini
import AppLoaderWrapper from "@/components/AppLoaderWrapper";
// import AlertBanner from "@/components/AlertBanner";

const inter = Inter({ subsets: ["latin"] });
const ClientOnlyProviders = dynamic(() => import("@/app/providers-client"), { ssr: false });

export const metadata: Metadata = {
  title: "SOMT👀L",
  description: "All your Somnia Testnet essentials in one place: faucet, multi-sender, and contract deployment.",
  keywords: "Somnia, Somnia Network, Testnet, Faucet, ERC20, ERC721, Multi-sender, Blockchain Tools, dApp, Web3, Smart Contract Deployment, Test Tokens, Crypto",
  authors: [{ name: "L RMN", url: "https://lrmn.link" }],
  creator: "L RMN",
  publisher: "L RMN",

  alternates: {
    canonical: "https://somtool.vercel.app/",
  },

  icons: {
    icon: "/somtool.png",
    shortcut: "/somtool.png",
    apple: "/somtool.png",
  },

  openGraph: {
    title: "Your Somnia Testnet Toolkit",
    description: "All your Somnia Testnet essentials in one place: faucet, multi-sender, and contract deployment.",
    url: "https://somtool.vercel.app/",
    siteName: "SOMT👀L",
    images: [
      {
        url: "https://somtool.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "SOMT👀L - Somnia Testnet Toolkit Screenshot",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    site: "@romanromannya",
    creator: "@romanromannya",
    title: "SOMTOOL: Empower Your Somnia Testnet Development",
    description: "All your Somnia Testnet essentials in one place: faucet, multi-sender, and contract deployment.",
    images: ["https://your-somtool-dapp-url.com/og-image.png"],
  },

  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-snippet": -1,
    },
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
            <AppLoaderWrapper />
            {/* <AlertBanner /> */}
            <AppNavbar />
            <main className="flex-grow container mx-auto px-4 py-8">
              {children}
            </main>
            <AppFooter />
            <CustomCursor />
          </div>
        </ClientOnlyProviders>
      </body>
    </html>
  );
}