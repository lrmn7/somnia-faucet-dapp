'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract, useBalance } from 'wagmi';
import { formatEther, type BigNumberish } from 'ethers';
import toast from 'react-hot-toast';

import PixelatedButton from '@/components/PixelatedButton';
import PixelatedCard from '@/components/PixelatedCard';
import FaucetContract from '@/contracts/Faucet.json';

const FAUCET_ADDRESS = process.env.NEXT_PUBLIC_FAUCET_CONTRACT_ADDRESS as `0x${string}`;
const SOMNIA_TESTNET_CHAIN_ID = 50312;

export default function FaucetPage() {
    const { address, isConnected, chain } = useAccount();
    const { writeContractAsync } = useWriteContract();
    const [cooldown, setCooldown] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const { data: balance, refetch: refetchBalance } = useBalance({ address: FAUCET_ADDRESS });
    
    const { data: claimAmount, refetch: refetchClaimAmount } = useReadContract({
        abi: FaucetContract.abi,
        address: FAUCET_ADDRESS,
        functionName: 'claimAmount',
    });
    
    const { data: remainingCooldown, refetch: refetchCooldown } = useReadContract({
        abi: FaucetContract.abi,
        address: FAUCET_ADDRESS,
        functionName: 'getRemainingCooldown',
        args: [address],
        query: { enabled: !!address },
    });

    const { data: cooldownTime } = useReadContract({
        abi: FaucetContract.abi,
        address: FAUCET_ADDRESS,
        functionName: 'cooldownTime',
    });

    const formatCooldown = (totalSeconds: number): string => {
        if (totalSeconds <= 0) return "0s";
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);
        let parts: string[] = [];
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
        return parts.join(' ');
    };

    const formatDuration = (totalSeconds: number): string => {
        if (totalSeconds === 43200) return "every 12 hours";
        if (totalSeconds === 86400) return "every 24 hours";
        if (totalSeconds === 3600) return "every 1 hour";
        return `every ${totalSeconds} seconds`;
    };

    useEffect(() => {
        if (remainingCooldown !== undefined) {
            setCooldown(Number(remainingCooldown));
        }
    }, [remainingCooldown]);

    useEffect(() => {
        if (cooldown > 0) {
            const timer = setInterval(() => {
                setCooldown(prev => (prev > 0 ? prev - 1 : 0));
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [cooldown]);

    const handleClaim = async () => {
        if (!isConnected || !address) {
            toast.error('Please connect your wallet first!');
            return;
        }
        if (chain?.id !== SOMNIA_TESTNET_CHAIN_ID) {
            toast.error('Please switch to Somnia Testnet!');
            return;
        }
        
        setIsLoading(true);
        const toastId = toast.loading('Processing your claim...');
        try {
            await writeContractAsync({
                abi: FaucetContract.abi,
                address: FAUCET_ADDRESS,
                functionName: 'claim',
            });
            toast.success('Tokens claimed successfully!', { id: toastId });
            refetchCooldown();
            refetchBalance();
            refetchClaimAmount();
        } catch (error: any) {
            console.error(error);
            const errorMessage = error.shortMessage || 'An unknown error occurred.';
            toast.error(`Claim failed: ${errorMessage}`, { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };
    
    const isOwner = isConnected && address?.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_WALLET?.toLowerCase();
    const isFaucetEmpty = balance !== undefined && typeof claimAmount === 'bigint' && balance.value < claimAmount;
    
    const isButtonDisabled = isLoading || !isConnected || (cooldown > 0 && !isOwner) || isFaucetEmpty;
    
    const getButtonText = (): string => {
        if (isLoading) {
            return 'Processing...';
        }
        if (!isConnected) {
            return 'Connect Wallet to Claim';
        }
        if (isFaucetEmpty) {
            return 'Faucet is Empty';
        }
        if (cooldown > 0 && !isOwner) {
            return `Wait ${formatCooldown(cooldown)}`;
        }
        return 'Claim Faucet';
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <h1 className="text-4xl text-center">Free Faucet</h1>
            <PixelatedCard>
                <p className="text-2xl text-center mb-2">Get free tokens for the Somnia Network Testnet</p>
                
                <div className="text-center bg-stone-900 p-4 mb-6 border-2 border-black">
                    <p className="text-sm">Faucet Balance</p>
                    <p className="text-2xl font-pixel text-white">
                        {balance ? `${parseFloat(Number(balance.formatted).toFixed(4))} ${balance.symbol}` : 'Loading...'}
                    </p>
                </div>

                <div className="flex flex-col items-center">
                    <PixelatedButton onClick={handleClaim} disabled={isButtonDisabled}>
                        {getButtonText()}
                    </PixelatedButton>
                    {isConnected && (
                        <p className="mt-4 text-sm">
                            You can claim {typeof claimAmount === 'bigint' ? `${formatEther(claimAmount)} STT` : '...'} 
                            {' '}
                            {cooldownTime !== undefined ? formatDuration(Number(cooldownTime)) : '...'}.
                        </p>
                    )}
                </div>
            </PixelatedCard>
        </div>
    );
}