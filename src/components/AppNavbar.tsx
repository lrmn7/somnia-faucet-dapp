'use client';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import DisplayUsername from "./DisplayUsername";
import PixelatedButton from './PixelatedButton';
import Image from 'next/image';

import somtool from '../../public/somtool.png';
const AppNavbar = () => {
  return (
    <>
      <nav className="bg-brand-dark border-b-2 border-black p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center">
            <Image
              src={somtool}
              alt="Somtool Logo"
              width={64}
              height={64}
            />
          </Link>
          <ConnectButton.Custom>
            {({
              account,
              chain,
              openAccountModal,
              openChainModal,
              openConnectModal,
              authenticationStatus,
              mounted,
            }) => {
              const ready = mounted && authenticationStatus !== 'loading';
              const connected =
                ready &&
                account &&
                chain &&
                (!authenticationStatus || authenticationStatus === 'authenticated');
              if (!connected) {
                return (
                  <PixelatedButton onClick={openConnectModal} type="button">
                    Connect Wallet
                  </PixelatedButton>
                );
              }
              if (chain.unsupported) {
                return (
                  <PixelatedButton onClick={openChainModal} type="button" className="!bg-red-600">
                    Wrong network
                  </PixelatedButton>
                );
              }
              return (
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    onClick={openChainModal}
                    className="hidden sm:flex items-center gap-2 bg-stone-800 hover:bg-stone-700 text-brand-orange font-pixel py-2 px-4 border-2 border-black shadow-pixel transition-all"
                    type="button"
                  >
                    {chain.hasIcon && (
                      <img
                        alt={chain.name ?? 'Chain icon'}
                        src={chain.iconUrl}
                        style={{ width: 16, height: 16, borderRadius: '999px' }}
                      />
                    )}
                    {chain.name}
                  </button>
                  <button
                    onClick={openAccountModal}
                    type="button"
                    className="bg-stone-800 hover:bg-stone-700 text-brand-orange font-pixel py-2 px-4 border-2 border-black shadow-pixel transition-all"
                  >
                              {account.displayName && (
                                <DisplayUsername
                                  address={account.address as `0x${string}`}
                                />
                              )}
                  </button>
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </nav>
    </>
  );
};

export default AppNavbar;