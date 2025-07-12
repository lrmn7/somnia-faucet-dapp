'use client';

import { useAccount, useBalance, useSendTransaction, useWriteContract, useReadContract } from 'wagmi';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { parseEther, formatEther } from 'ethers';

import PixelatedButton from '@/components/PixelatedButton';
import PixelatedCard from '@/components/PixelatedCard';
import { abiFaucet } from '@/contracts/abis';
import {abiMultiSender } from '@/contracts/abis';

const ADMIN_WALLET = process.env.NEXT_PUBLIC_ADMIN_WALLET?.toLowerCase();
const FAUCET_ADDRESS = process.env.NEXT_PUBLIC_FAUCET_CONTRACT_ADDRESS as `0x${string}`;

export default function AdminPage() {
    const { address, isConnected } = useAccount();
    const { sendTransactionAsync } = useSendTransaction();
    const { writeContractAsync } = useWriteContract();
    const [depositAmount, setDepositAmount] = useState('');
    const [newClaimAmount, setNewClaimAmount] = useState('');
    const [newCooldown, setNewCooldown] = useState('');

    const { data: faucetBalance, refetch: refetchBalance } = useBalance({ address: FAUCET_ADDRESS });

    const { data: currentClaimAmount, refetch: refetchClaimAmount } = useReadContract({
        abi: abiFaucet,
        address: FAUCET_ADDRESS,
        functionName: 'claimAmount',
    });

    const { data: currentCooldown, refetch: refetchCooldown } = useReadContract({
        abi: abiFaucet,
        address: FAUCET_ADDRESS,
        functionName: 'cooldownTime',
    });

    const formatDuration = (totalSeconds: number) => {
        if (totalSeconds === undefined || totalSeconds === null) return 'Loading...';
        if (totalSeconds === 0) return "0 Seconds (Instant)";
        if (totalSeconds === 86400) return "24 Hours";
        if (totalSeconds === 43200) return "12 Hours";
        if (totalSeconds === 3600) return "1 Hour";
        if (totalSeconds > 3600 && totalSeconds % 3600 === 0) return `${totalSeconds / 3600} Hours`;
        if (totalSeconds === 60) return "1 Minute";
        if (totalSeconds < 60) return `${totalSeconds} Seconds`;
        if (totalSeconds > 60 && totalSeconds % 60 === 0) return `${totalSeconds / 60} Minutes`;
        return `${totalSeconds} seconds`;
    };

    const isOwner = isConnected && address?.toLowerCase() === ADMIN_WALLET;

    const handleDeposit = async () => {
        if (!depositAmount || parseFloat(depositAmount) <= 0) {
            toast.error('Please enter a valid amount.');
            return;
        }
        const toastId = toast.loading('Sending STT to Faucet...');
        try {
            await sendTransactionAsync({
                to: FAUCET_ADDRESS,
                value: parseEther(depositAmount),
            });
            toast.success('Deposit successful!', { id: toastId });
            setDepositAmount('');
            refetchBalance();
        } catch (error: any) {
            console.error(error);
            toast.error(`Deposit failed: ${error.shortMessage}`, { id: toastId });
        }
    };

    const handleWithdraw = async () => {
        if (!faucetBalance || faucetBalance.value === BigInt(0)) {
            toast.error('Faucet has no balance to withdraw.');
            return;
        }
        const toastId = toast.loading('Withdrawing STT from Faucet...');
        try {
            await writeContractAsync({
                abi: abiFaucet,
                address: FAUCET_ADDRESS,
                functionName: 'withdraw',
            });
            toast.success('Withdrawal successful!', { id: toastId });
            refetchBalance();
        } catch (error: any) {
            console.error(error);
            toast.error(`Withdrawal failed: ${error.shortMessage}`, { id: toastId });
        }
    };

    const handleSetClaimAmount = async () => {
        if (!newClaimAmount || parseFloat(newClaimAmount) <= 0) {
            toast.error('Please enter a valid amount.');
            return;
        }
        const toastId = toast.loading('Updating claim amount...');
        try {
            await writeContractAsync({
                abi: abiFaucet,
                address: FAUCET_ADDRESS,
                functionName: 'setClaimAmount',
                args: [parseEther(newClaimAmount)],
            });
            toast.success('Claim amount updated successfully!', { id: toastId });
            setNewClaimAmount('');
            refetchClaimAmount();
        } catch (error: any) {
            console.error(error);
            toast.error(`Update failed: ${error.shortMessage}`, { id: toastId });
        }
    };

    const handleSetCooldown = async () => {
        if (!newCooldown || parseInt(newCooldown) < 0) {
            toast.error('Please enter a valid cooldown time in seconds.');
            return;
        }
        const toastId = toast.loading('Updating cooldown time...');
        try {
            await writeContractAsync({
                abi: abiFaucet,
                address: FAUCET_ADDRESS,
                functionName: 'setCooldownTime',
                args: [BigInt(newCooldown)],
            });
            toast.success('Cooldown time updated successfully!', { id: toastId });
            setNewCooldown('');
            refetchCooldown();
        } catch (error: any) {
            console.error(error);
            toast.error(`Update failed: ${error.shortMessage}`, { id: toastId });
        }
    };

    if (!isConnected) {
        return (
            <PixelatedCard className="text-center">
                <h2 className="text-2xl">Admin Panel</h2>
                <p className="mt-4">Please connect your wallet to access the admin panel.</p>
            </PixelatedCard>
        );
    }

    if (!isOwner) {
        return (
            <PixelatedCard className="text-center">
                <h2 className="text-2xl text-red-500">Access Denied</h2>
                <p className="mt-4">You are not authorized to access this page.</p>
                <p className="mt-2 text-sm text-brand-gray">Connected as: {address}</p>
            </PixelatedCard>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <h1 className="text-4xl text-center">Admin Panel</h1>
            <PixelatedCard>
                <h2 className="text-2xl mb-4">Faucet Status</h2>
                <p className="text-lg">
                    Contract Balance:{' '}
                    <span className="font-pixel text-white ml-2">
                        {faucetBalance ? `${formatEther(faucetBalance.value)} ${faucetBalance.symbol}` : 'Loading...'}
                    </span>
                </p>
                <p className="text-lg mt-2">
                    Current Claim Amount:{' '}
                    <span className="font-pixel text-white ml-2">
                        {typeof currentClaimAmount === 'bigint' ? `${formatEther(currentClaimAmount)} STT` : 'Loading...'}
                    </span>
                </p>
                <p className="text-lg mt-2">
                    Current Cooldown:{' '}
                    <span className="font-pixel text-white ml-2">
                        {formatDuration(Number(currentCooldown))}
                    </span>
                </p>
            </PixelatedCard>

            <PixelatedCard>
                <h2 className="text-2xl mb-4">Set Claim Amount</h2>
                <div className="flex flex-col sm:flex-row gap-4">
                    <input
                        type="number"
                        value={newClaimAmount}
                        onChange={(e) => setNewClaimAmount(e.target.value)}
                        placeholder="New amount in STT"
                        className="flex-grow bg-stone-900 text-white p-3 border-2 border-black focus:outline-none focus:border-brand-orange"
                    />
                    <PixelatedButton onClick={handleSetClaimAmount}>Set Amount</PixelatedButton>
                </div>
            </PixelatedCard>

            <PixelatedCard>
                <h2 className="text-2xl mb-4">Set Cooldown Time</h2>
                <div className="flex flex-col sm:flex-row gap-4">
                    <input
                        type="number"
                        value={newCooldown}
                        onChange={(e) => setNewCooldown(e.target.value)}
                        placeholder="New cooldown in seconds (e.g., 43200 for 12h)"
                        className="flex-grow bg-stone-900 text-white p-3 border-2 border-black focus:outline-none focus:border-brand-orange"
                    />
                    <PixelatedButton onClick={handleSetCooldown}>Set Cooldown</PixelatedButton>
                </div>
            </PixelatedCard>

            <PixelatedCard>
                <h2 className="text-2xl mb-4">Deposit STT</h2>
                <div className="flex flex-col sm:flex-row gap-4">
                    <input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="Amount in STT"
                        className="flex-grow bg-stone-900 text-white p-3 border-2 border-black focus:outline-none focus:border-brand-orange"
                    />
                    <PixelatedButton onClick={handleDeposit}>Deposit</PixelatedButton>
                </div>
            </PixelatedCard>

            <PixelatedCard>
                <h2 className="text-2xl mb-4">Withdraw Funds</h2>
                <p className="mb-4">This will withdraw the entire balance from the faucet contract to the owner's wallet.</p>
                <PixelatedButton onClick={handleWithdraw} disabled={!faucetBalance || faucetBalance.value === BigInt(0)}>
                    Withdraw All STT
                </PixelatedButton>
            </PixelatedCard>
        </div>
    );
}