import { createPublicClient, http } from 'viem';
import { somniaTestnet } from '../constants/chains';


const NAMING_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SOMNIA_DOMAINS_CONTRACT_ADDRESS as `0x${string}`;
const NAMING_CONTRACT_ABI = [
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "reverseLookup",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function"
  }
];

const publicClient = createPublicClient({
  chain: somniaTestnet,
  transport: http()
});

/**
 * Mengambil nama utama Somnia berdasarkan alamat dompet.
 * @param address Alamat dompet yang akan dicari.
 * @returns Nama dalam format string, atau null jika tidak ditemukan atau error.
 */
export async function getUsername(address: `0x${string}`): Promise<string | null> {
  try {
    const name = await publicClient.readContract({
      address: NAMING_CONTRACT_ADDRESS,
      abi: NAMING_CONTRACT_ABI,
      functionName: 'reverseLookup',
      args: [address]
    });
return name as string | null;
  } catch (err) {
    return null;
  }
}