'use client';

import { useAccount, useBalance, useSendTransaction, useWriteContract, useReadContract } from 'wagmi';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { parseEther, formatEther, isAddress } from 'ethers';

import PixelatedButton from '@/components/PixelatedButton';
import PixelatedCard from '@/components/PixelatedCard';
import { abiFaucet, abiMultiSender } from '@/contracts/abis';

const ADMIN_WALLET = process.env.NEXT_PUBLIC_ADMIN_WALLET?.toLowerCase();
const FAUCET_ADDRESS = process.env.NEXT_PUBLIC_FAUCET_CONTRACT_ADDRESS as `0x${string}`;

// --- Konfigurasi untuk Kontrak Multisender ---
const MULTISENDER_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_MULTISENDER_CONTRACT_ADDRESS as `0x${string}` || "0x0000000000000000000000000000000000000000";


export default function AdminPage() {
    const { address, isConnected } = useAccount();
    const { sendTransactionAsync } = useSendTransaction();
    const { writeContractAsync } = useWriteContract();
    const [depositAmount, setDepositAmount] = useState('');
    const [newClaimAmount, setNewClaimAmount] = useState('');
    const [newCooldown, setNewCooldown] = useState('');
    // State baru untuk Multisender Withdrawal
    const [multisenderWithdrawRecipient, setMultisenderWithdrawRecipient] = useState('');

    // --- Data Faucet ---
    const { data: faucetBalance, refetch: refetchFaucetBalance } = useBalance({ address: FAUCET_ADDRESS });

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

    // --- Data Multisender ---
    const { data: multisenderBalance, refetch: refetchMultisenderBalance } = useBalance({ address: MULTISENDER_CONTRACT_ADDRESS });
    
    // Membaca pemilik kontrak Multisender (jika menggunakan Ownable)
    const { data: multisenderOwner, refetch: refetchMultisenderOwner } = useReadContract({
        abi: abiMultiSender,
        address: MULTISENDER_CONTRACT_ADDRESS,
        functionName: 'owner',
    });

    // Fungsi formatDuration menerima number atau bigint atau undefined/null
    const formatDuration = (totalSeconds: number | bigint | undefined | null): string => {
        if (totalSeconds === undefined || totalSeconds === null) return 'Loading...';
        const sec = Number(totalSeconds); // Konversi bigint ke number untuk konsistensi
        if (sec === 0) return "0 Seconds (Instant)";
        if (sec === 86400) return "24 Hours";
        if (sec === 43200) return "12 Hours";
        if (sec === 3600) return "1 Hour";
        if (sec > 3600 && sec % 3600 === 0) return `${sec / 3600} Hours`;
        if (sec === 60) return "1 Minute";
        if (sec < 60) return `${sec} Seconds`;
        if (sec > 60 && sec % 60 === 0) return `${sec / 60} Minutes`;
        return `${sec} seconds`;
    };

    // isOwner sekarang juga memvalidasi pemilik Multisender (jika ada)
    const isOwner = isConnected && 
                    address?.toLowerCase() === ADMIN_WALLET && 
                    (address?.toLowerCase() === (multisenderOwner as string | undefined)?.toLowerCase() || 
                    multisenderOwner === undefined || 
                    multisenderOwner === null || 
                    MULTISENDER_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000"); 

    // --- Handlers untuk Faucet ---
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
            refetchFaucetBalance();
        } catch (error: any) {
            console.error(error);
            toast.error(`Deposit failed: ${error.shortMessage || error.message}`, { id: toastId });
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
            refetchFaucetBalance();
        } catch (error: any) {
            console.error(error);
            toast.error(`Withdrawal failed: ${error.shortMessage || error.message}`, { id: toastId });
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
            toast.error(`Update failed: ${error.shortMessage || error.message}`, { id: toastId });
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
            toast.error(`Update failed: ${error.shortMessage || error.message}`, { id: toastId });
        }
    };

    // --- Handler untuk Multisender Withdrawal ---
    const handleWithdrawStuckFunds = async () => {
        if (!multisenderBalance || multisenderBalance.value === BigInt(0)) {
            toast.error('Multisender contract has no balance to withdraw.');
            return;
        }
        if (!multisenderWithdrawRecipient || !isAddress(multisenderWithdrawRecipient)) { 
            toast.error('Please enter a valid recipient address for withdrawal.', { duration: 5000 });
            return;
        }

        const toastId = toast.loading('Withdrawing STT from Multisender...');
        try {
            await writeContractAsync({
                abi: abiMultiSender,
                address: MULTISENDER_CONTRACT_ADDRESS,
                functionName: 'withdrawStuckFunds',
                args: [multisenderWithdrawRecipient as `0x${string}`],
            });
            toast.success('Multisender withdrawal successful!', { id: toastId });
            setMultisenderWithdrawRecipient('');
            refetchMultisenderBalance(); 
        } catch (error: any) {
            console.error(error);
            toast.error(`Multisender withdrawal failed: ${error.shortMessage || error.message}`, { id: toastId });
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
            </PixelatedCard>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8 p-4 md:p-0"> 
            <h1 className="text-4xl text-center">Admin Panel</h1>
            
            {/* Faucet Status */}
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
                        {formatDuration(currentCooldown as bigint | number | undefined | null)} 
                    </span>
                </p>
            </PixelatedCard>

            {/* Set Claim Amount */}
            <PixelatedCard>
                <h2 className="text-2xl mb-4">Set Claim Amount</h2>
                <div className="flex flex-col sm:flex-row gap-4">
                    <input
                        type="number"
                        value={newClaimAmount}
                        onChange={(e) => setNewClaimAmount(e.target.value)}
                        placeholder="New amount in STT"
                        className="flex-grow bg-stone-900 text-white p-3 border-2 border-black focus:outline-none focus:border-orange-400"
                    />
                    <PixelatedButton onClick={handleSetClaimAmount}>Set Amount</PixelatedButton>
                </div>
            </PixelatedCard>

            {/* Set Cooldown Time */}
            <PixelatedCard>
                <h2 className="text-2xl mb-4">Set Cooldown Time</h2>
                <div className="flex flex-col sm:flex-row gap-4">
                    <input
                        type="number"
                        value={newCooldown}
                        onChange={(e) => setNewCooldown(e.target.value)}
                        placeholder="New cooldown in seconds (e.g., 43200 for 12h)"
                        className="flex-grow bg-stone-900 text-white p-3 border-2 border-black focus:outline-none focus:border-orange-400"
                    />
                    <PixelatedButton onClick={handleSetCooldown}>Set Cooldown</PixelatedButton>
                </div>
            </PixelatedCard>

            {/* Deposit STT to Faucet */}
            <PixelatedCard>
                <h2 className="text-2xl mb-4">Deposit STT to Faucet</h2>
                <div className="flex flex-col sm:flex-row gap-4">
                    <input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="Amount in STT"
                        className="flex-grow bg-stone-900 text-white p-3 border-2 border-black focus:outline-none focus:border-orange-400"
                    />
                    <PixelatedButton onClick={handleDeposit}>Deposit</PixelatedButton>
                </div>
            </PixelatedCard>

            {/* Withdraw Faucet Funds */}
            <PixelatedCard>
                <h2 className="text-2xl mb-4">Withdraw Faucet Funds</h2>
                <p className="mb-4">This will withdraw the entire balance from the Faucet contract to the owner's wallet.</p>
                <PixelatedButton onClick={handleWithdraw} disabled={!faucetBalance || faucetBalance.value === BigInt(0)}>
                    Withdraw All STT (Faucet)
                </PixelatedButton>
            </PixelatedCard>

            {/* --- BAGIAN MULTISENDER CONTRACT MANAGEMENT --- */}
            <PixelatedCard>
                <h2 className="text-2xl mb-4">Multisender Contract Status</h2>
                <p className="text-lg">
                    Contract Balance:{' '}
                    <span className="font-pixel text-white ml-2">
                        {multisenderBalance ? `${formatEther(multisenderBalance.value)} ${multisenderBalance.symbol}` : 'Loading...'}
                    </span>
                </p>

                <h2 className="text-2xl mb-4">Withdraw Stuck Multisender Funds</h2>
                <p className="mb-4">
                    This function allows the contract owner to withdraw any STT that got stuck in the Multisender contract (e.g., from overpayments or accidental direct transfers).
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <input
                        type="text"
                        value={multisenderWithdrawRecipient}
                        onChange={(e) => setMultisenderWithdrawRecipient(e.target.value)}
                        placeholder="Recipient address for withdrawal (0x...)"
                        className="flex-grow bg-stone-900 text-white p-3 border-2 border-black focus:outline-none focus:border-orange-400"
                    />
                    <PixelatedButton 
                        onClick={handleWithdrawStuckFunds} 
                        disabled={
                            !multisenderBalance || 
                            multisenderBalance.value === BigInt(0) || 
                            !multisenderWithdrawRecipient || 
                            !isAddress(multisenderWithdrawRecipient) 
                        }
                    >
                        Withdraw All STT (Multisender)
                    </PixelatedButton>
                </div>
                {MULTISENDER_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000" && (
                    <p className="mt-2 text-xs text-red-400 text-center">Multisender contract address is not configured. Please set NEXT_PUBLIC_MULTISENDER_CONTRACT_ADDRESS in .env.local</p>
                )}
            </PixelatedCard>

        </div>
    );
}