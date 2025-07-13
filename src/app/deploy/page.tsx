'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAccount, useWalletClient } from 'wagmi';
import { ContractFactory, BrowserProvider, parseUnits } from 'ethers';
import Link from 'next/link';

import PixelatedButton from '@/components/PixelatedButton';
import PixelatedCard from '@/components/PixelatedCard';
import { abiERC20Token, abiERC721Token } from '@/contracts/abis';
import { bytecodeERC20Token, bytecodeERC721Token } from '@/contracts/bytecode';
const SOMNIA_TESTNET_CHAIN_ID = 50312;
const DEFAULT_ERC20_SUPPLY = '1000';
const DEFAULT_TOKEN_DECIMALS = 18;

const ERC20Contract = {
    abi: abiERC20Token,
    bytecode: bytecodeERC20Token,
};

const ERC721Contract = {
    abi: abiERC721Token,
    bytecode: bytecodeERC721Token,
};


type ContractType = 'ERC20' | 'ERC721';

export default function DeployPage() {
    const { isConnected, chain } = useAccount();
    const { data: walletClient } = useWalletClient();

    const [contractType, setContractType] = useState<ContractType>('ERC20');
    const [isDeploying, setIsDeploying] = useState(false);
    const [deployedAddress, setDeployedAddress] = useState<string | null>(null);

    const [tokenName, setTokenName] = useState('');
    const [tokenSymbol, setTokenSymbol] = useState('');

    const handleDeploy = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedTokenName = tokenName.trim();
        const trimmedTokenSymbol = tokenSymbol.trim();

        if (!isConnected || !walletClient) {
            toast.error('Please connect your wallet first!');
            return;
        }
        if (!trimmedTokenName || !trimmedTokenSymbol) {
            toast.error('Token Name and Symbol cannot be empty.');
            return;
        }

        if (chain?.id !== SOMNIA_TESTNET_CHAIN_ID) {
            toast.error('Please switch to Somnia Testnet!');
            return;
        }

        setIsDeploying(true);
        setDeployedAddress(null);
        const toastId = toast.loading('Please wait, deploying contract...');

        try {
            const provider = new BrowserProvider(walletClient.transport, {
                name: walletClient.chain.name,
                chainId: walletClient.chain.id,
            });
            const signer = await provider.getSigner();
            const contractToDeploy = contractType === 'ERC20' ? ERC20Contract : ERC721Contract;

            if (!contractToDeploy.bytecode || contractToDeploy.bytecode === '0x') {
                toast.error('Deployment failed: Contract bytecode is missing or empty. Please check your contract compilation.', { id: toastId });
                setIsDeploying(false);
                return;
            }

            let args: any[];
            if (contractType === 'ERC20') {
                const supplyInWei = parseUnits(DEFAULT_ERC20_SUPPLY, DEFAULT_TOKEN_DECIMALS);
                args = [trimmedTokenName, trimmedTokenSymbol, supplyInWei];
            } else {
                args = [trimmedTokenName, trimmedTokenSymbol];
            }

            console.log("Attempting to deploy contract with type:", contractType);
            console.log("Deployment arguments:", args);

            const factory = new ContractFactory(contractToDeploy.abi, contractToDeploy.bytecode, signer);
            const deployedContract = await factory.deploy(...args);
            
            toast.loading('Waiting for deployment confirmation...', { id: toastId });
            await deployedContract.waitForDeployment();

            const address = await deployedContract.getAddress();
            setDeployedAddress(address);
            toast.success(`Deployment successful! Contract Address: ${address}`, { id: toastId });

        } catch (error: any) {
            console.error('Deployment error:', error);
            const errorMessage = error.shortMessage || error.message || 'An unknown error occurred.';
            toast.error(`Deployment failed: ${errorMessage}. Please check console for details.`, { id: toastId });
        } finally {
            setIsDeploying(false);
        }
    };

    const isButtonDisabled = isDeploying || !isConnected || !tokenName.trim() || !tokenSymbol.trim();

    const getButtonText = (): string => {
        if (isDeploying) {
            return 'Deploying...';
        }
        if (!isConnected) {
            return 'Connect Wallet to Deploy';
        }
        if (!tokenName.trim() || !tokenSymbol.trim()) {
            return 'Enter Token Details';
        }
        return 'Deploy Contract';
    };

    return (
        <div className="max-w-2xl mx-auto p-4">
            <PixelatedCard>
                <h1 className="text-3xl text-center mb-6 font-pixel">Deploy a Contract</h1>

                <div className="flex justify-center mb-6 border-2 border-black">
                    <button onClick={() => setContractType('ERC20')} className={`flex-1 p-3 font-pixel ${contractType === 'ERC20' ? 'bg-orange-400 text-stone-900' : 'bg-stone-700 text-white hover:bg-stone-600'}`}>
                        ERC20
                    </button>
                    <button onClick={() => setContractType('ERC721')} className={`flex-1 p-3 font-pixel ${contractType === 'ERC721' ? 'bg-orange-400 text-stone-900' : 'bg-stone-700 text-white hover:bg-stone-600'}`}>
                        ERC721
                    </button>
                </div>

                <form onSubmit={handleDeploy} className="space-y-4">
                    <div>
                        <label className="block mb-1 font-pixel text-sm">Token Name</label>
                        <input type="text" value={tokenName} onChange={e => setTokenName(e.target.value)} placeholder="My Token Name" className="w-full bg-stone-900 p-3 border-2 border-black text-white focus:outline-none focus:border-orange-400" />
                    </div>
                    <div>
                        <label className="block mb-1 font-pixel text-sm">Token Symbol</label>
                        <input type="text" value={tokenSymbol} onChange={e => setTokenSymbol(e.target.value)} placeholder="MTOKEN" className="w-full bg-stone-900 p-3 border-2 border-black text-white focus:outline-none focus:border-orange-400" />
                    </div>

                    {contractType === 'ERC20' && (
                        <>
                            <div>
                                <label className="block mb-1 font-pixel text-sm">Initial Supply</label>
                                <div className="w-full bg-stone-800 p-3 border-2 border-black text-white/70">
                                    {DEFAULT_ERC20_SUPPLY} (Default)
                                </div>
                            </div>
                            <div>
                                <label className="block mb-1 font-pixel text-sm">Token Decimals</label>
                                <div className="w-full bg-stone-800 p-3 border-2 border-black text-white/70">
                                    {DEFAULT_TOKEN_DECIMALS} (Default)
                                </div>
                            </div>
                        </>
                    )}

                    <div className="pt-4 flex flex-col">
                        <PixelatedButton 
                            type="submit" 
                            disabled={isButtonDisabled}
                            className={`w-full !text-lg !py-3 !border-2 transition-colors duration-200
                                ${
                                    isButtonDisabled
                                        ? "!bg-stone-700 !text-stone-500 !border-stone-600 cursor-not-allowed"
                                        : "!bg-orange-400 !text-stone-900 !border-black"
                                }
                            `}
                        >
                            {getButtonText()}
                        </PixelatedButton>
                    </div>
                </form>

                {deployedAddress && (
                    <div className="mt-6 p-4 bg-green-900/50 border-2 border-green-500 text-center">
                        <h3 className="font-pixel text-lg text-green-300">Deployment Successful!</h3>
                        <p className="mt-2 break-all font-mono text-sm">
                            Contract Address: <br/>
                            <Link
                                href={`https://shannon-explorer.somnia.network/address/${deployedAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white underline hover:text-orange-400"
                            >
                                {deployedAddress}
                            </Link>
                        </p>
                    </div>
                )}
            </PixelatedCard>
        </div>
    );
}