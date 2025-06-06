'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, darkTheme, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { somniaTestnet } from '@/constants/chains';
import { CustomAvatar } from '@/constants/avatar';
import { Disclaimer } from '@/constants/disclaimer';

const config = getDefaultConfig({
  appName: 'Somceut',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [somniaTestnet],
  ssr: false,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#e52694',
            accentColorForeground: 'white',
            borderRadius: 'large',
            fontStack: 'rounded',
            overlayBlur: 'small',
          })}
          avatar={CustomAvatar}
          appInfo={{
            appName: 'Somnia Network',
            learnMoreUrl: 'https://somnia.network/',
          }}
        >
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: '#333',
                color: '#fff',
              },
            }}
          />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
