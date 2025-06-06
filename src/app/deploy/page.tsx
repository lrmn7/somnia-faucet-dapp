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

        if (!isConnected || !walletClient || !tokenName || !tokenSymbol) {
            toast.error('Please ensure your wallet is connected and all fields are filled.');
            return;
        }

        if (chain?.id !== SOMNIA_TESTNET_CHAIN_ID) {
            toast.error('Please switch to Somnia Testnet!');
            return;
        }

        setIsDeploying(true);
        setDeployedAddress(null);
        const toastId = toast.loading('Please wait, deploying...');

        try {
            const provider = new BrowserProvider(walletClient.transport, {
                name: walletClient.chain.name,
                chainId: walletClient.chain.id,
            });
            const signer = await provider.getSigner();
            const contract = contractType === 'ERC20' ? ERC20Contract : ERC721Contract;

            if (!contract.bytecode || contract.bytecode === '0x') {
                 toast.error('Deployment failed: Contract bytecode is missing.', { id: toastId });
                 setIsDeploying(false);
                 return;
            }

            let args: any[];
            if (contractType === 'ERC20') {
                const supplyInWei = parseUnits(DEFAULT_ERC20_SUPPLY, DEFAULT_TOKEN_DECIMALS);
                args = [tokenName, tokenSymbol, supplyInWei];
            } else {
                args = [tokenName, tokenSymbol];
            }

            const factory = new ContractFactory(contract.abi, contract.bytecode, signer);
            const deployedContract = await factory.deploy(...args);
            await deployedContract.waitForDeployment();

            const address = await deployedContract.getAddress();
            setDeployedAddress(address);
            toast.success('Deployment successful!', { id: toastId });

        } catch (error: any) {
            console.error(error);
            const errorMessage = error.shortMessage || error.message || 'An unknown error occurred';
            toast.error(`Deployment failed: ${errorMessage}`, { id: toastId });
        } finally {
            setIsDeploying(false);
        }
    };

    const isButtonDisabled = !isConnected || isDeploying || !tokenName || !tokenSymbol;

    const getButtonText = (): string => {
        if (isDeploying) {
            return 'Deploying...';
        }
        if (!isConnected) {
            return 'Connect Wallet to Deploy';
        }
        if (!tokenName || !tokenSymbol) {
            return 'Fill in All Fields';
        }
        return 'Deploy Contract';
    };

    return (
        <div className="max-w-2xl mx-auto">
            <PixelatedCard>
                <h1 className="text-3xl text-center mb-6">Deploy a Contract</h1>

                <div className="flex justify-center mb-6 border-2 border-black">
                    <button onClick={() => setContractType('ERC20')} className={`flex-1 p-3 font-pixel ${contractType === 'ERC20' ? 'bg-brand-orange text-white' : 'bg-stone-700'}`}>
                        ERC20 Token
                    </button>
                    <button onClick={() => setContractType('ERC721')} className={`flex-1 p-3 font-pixel ${contractType === 'ERC721' ? 'bg-brand-orange text-white' : 'bg-stone-700'}`}>
                        ERC721 NFT
                    </button>
                </div>

                <form onSubmit={handleDeploy} className="space-y-4">
                    <div>
                        <label className="block mb-1 font-pixel text-sm">Token Name</label>
                        <input type="text" value={tokenName} onChange={e => setTokenName(e.target.value)} placeholder="My Pixel Token" className="w-full bg-stone-900 p-3 border-2 border-black focus:outline-none focus:border-brand-orange" />
                    </div>
                    <div>
                        <label className="block mb-1 font-pixel text-sm">Token Symbol</label>
                        <input type="text" value={tokenSymbol} onChange={e => setTokenSymbol(e.target.value)} placeholder="MPT" className="w-full bg-stone-900 p-3 border-2 border-black focus:outline-none focus:border-brand-orange" />
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
                        >
                            {getButtonText()}
                        </PixelatedButton>
                    </div>
                </form>

                {deployedAddress && (
                    <div className="mt-6 p-4 bg-green-900/50 border-2 border-green-500 text-center">
                        <h3 className="font-pixel text-lg text-green-300">Deployment Successful!</h3>
                        <p className="mt-2 break-all">
                            <Link
                                href={`https://shannon-explorer.somnia.network/address/${deployedAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white underline hover:text-brand-orange"
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