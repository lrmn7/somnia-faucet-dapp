"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useSendTransaction,
  useBalance,
  useWalletClient,
} from "wagmi";
import {
  parseEther,
  formatEther,
  isAddress,
  Contract,
  BrowserProvider,
} from "ethers";
import toast from "react-hot-toast";

import PixelatedButton from "@/components/PixelatedButton";
import PixelatedCard from "@/components/PixelatedCard";

const SOMNIA_TESTNET_CHAIN_ID = 50312;
import { abiMultiSender } from "@/contracts/abis";

const MULTISENDER_CONTRACT_ADDRESS = process.env
  .NEXT_PUBLIC_MULTISENDER_CONTRACT_ADDRESS as `0x${string}`;

// --- Variabel Lingkungan Baru untuk Explorer URL ---
const EXPLORER_URL = process.env.NEXT_PUBLIC_EXPLORER_URL;

interface LeaderboardEntry {
  _id: string;
  walletAddress: string;
  txCount: number;
  totalSentWei: string;
}

type SendMode = "single" | "multi";
type MultiSendAmountType = "per_recipient" | "total_distributed";

export default function SendPage() {
  const { address, isConnected, chain } = useAccount();
  const { data: balance } = useBalance({ address });
  const { sendTransactionAsync } = useSendTransaction();
  const { data: walletClient } = useWalletClient();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [multiRecipientsList, setMultiRecipientsList] = useState("");
  const [multiSendAmountType, setMultiSendAmountType] =
    useState<MultiSendAmountType>("per_recipient");
  const [sendMode, setSendMode] = useState<SendMode>("single");

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchInitialLeaderboard = async () => {
      try {
        const response = await fetch("/api/leaderboard");
        if (response.ok) {
          const data = await response.json();
          setLeaderboard(data);
        } else {
          console.error("Failed to fetch initial leaderboard");
        }
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      }
    };
    fetchInitialLeaderboard();

    const eventSource = new EventSource("/api/stream");

    eventSource.onmessage = (event) => {
      const updatedLeaderboard = JSON.parse(event.data);
      setLeaderboard(updatedLeaderboard);
    };

    eventSource.onerror = (error) => {
      console.error("EventSource failed:", error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !address || !walletClient) {
      toast.error("Please connect your wallet first!");
      return;
    }
    if (chain?.id !== SOMNIA_TESTNET_CHAIN_ID) {
      toast.error("Please switch to Somnia Testnet!", { duration: 5000 });
      return;
    }

    const toastId = toast.loading("Processing your transaction(s)...", {
      duration: 0,
    });
    setIsLoading(true);

    try {
      if (sendMode === "single") {
        // Logika untuk Single Send
        if (!isAddress(recipient)) {
          toast.error("Invalid recipient address!", { id: toastId });
          return;
        }
        if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
          toast.error("Invalid amount!", { id: toastId });
          return;
        }

        // --- Perubahan di sini untuk mendapatkan Tx Hash ---
        const hash = await sendTransactionAsync({
          to: recipient as `0x${string}`,
          value: parseEther(amount),
        });

        // Tampilkan Tx Hash di notifikasi sukses
        toast.success(
          (t) => (
            <div>
              Transaction successful!
              <br />
              <a
                href={`${EXPLORER_URL}/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                View on Explorer
              </a>
            </div>
          ),
          { id: toastId, duration: 8000 }
        );

        await fetch("/api/leaderboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ senderAddress: address, amountSent: amount }),
        });

        setRecipient("");
        setAmount("");
      } else {
        // sendMode === 'multi'
        const recipientAddresses = multiRecipientsList
          .split(",")
          .map((addr) => addr.trim())
          .filter((addr) => addr !== "");

        if (recipientAddresses.length === 0) {
          toast.error("No recipients entered for multi-send!", { id: toastId });
          return;
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          toast.error("Invalid amount entered for multi-send!", {
            id: toastId,
          });
          return;
        }

        let amountsForContract: bigint[] = [];
        let totalAmountForContract: bigint = BigInt(0);

        if (multiSendAmountType === "per_recipient") {
          const amountWeiPerRecipient = parseEther(amount);
          for (const addr of recipientAddresses) {
            if (!isAddress(addr)) {
              toast.error(`Invalid recipient address: ${addr}`, {
                id: toastId,
              });
              return;
            }
            amountsForContract.push(amountWeiPerRecipient);
            totalAmountForContract += amountWeiPerRecipient;
          }
        } else {
          // total_distributed
          const totalAmountWei = parseEther(amount);
          if (recipientAddresses.length === 0) {
            toast.error("Cannot distribute to zero recipients.", {
              id: toastId,
            });
            return;
          }
          const amountWeiPerRecipient =
            totalAmountWei / BigInt(recipientAddresses.length);

          if (amountWeiPerRecipient <= BigInt(0)) {
            toast.error(
              "Total amount is too small to distribute among recipients! Consider more amount or fewer recipients.",
              { id: toastId, duration: 5000 }
            );
            return;
          }

          const remainder = totalAmountWei % BigInt(recipientAddresses.length);

          for (let i = 0; i < recipientAddresses.length; i++) {
            const addr = recipientAddresses[i];
            if (!isAddress(addr)) {
              toast.error(`Invalid recipient address: ${addr}`, {
                id: toastId,
              });
              return;
            }
            let currentAmount = amountWeiPerRecipient;
            if (i === 0) {
              currentAmount += remainder;
            }
            amountsForContract.push(currentAmount);
            totalAmountForContract += currentAmount;
          }
        }

        if (totalAmountForContract === BigInt(0)) {
          toast.error(
            "Calculated total amount to send is zero. Please check inputs.",
            { id: toastId }
          );
          return;
        }

        if (
          MULTISENDER_CONTRACT_ADDRESS ===
          "0x0000000000000000000000000000000000000000"
        ) {
          toast.error(
            "MultiSender contract address is not configured. Please deploy the contract and update the code.",
            { id: toastId, duration: 8000 }
          );
          return;
        }

        // --- Panggil kontrak Multisender ---
        const provider = new BrowserProvider(walletClient.transport, {
          name: walletClient.chain.name,
          chainId: walletClient.chain.id,
        });
        const signer = await provider.getSigner();

        const multiSenderContract = new Contract(
          MULTISENDER_CONTRACT_ADDRESS,
          abiMultiSender,
          signer
        );

        // --- Perubahan di sini untuk mendapatkan Tx Hash dari multi-send ---
        const txResponse = await multiSenderContract.multiSendNative(
          recipientAddresses,
          amountsForContract,
          { value: totalAmountForContract }
        );

        toast.loading("Waiting for multi-send transaction confirmation...", {
          id: toastId,
          duration: 0,
        });
        const receipt = await txResponse.wait(); // Tunggu hingga transaksi dikonfirmasi dan dapatkan receipt

        // Tampilkan Tx Hash di notifikasi sukses untuk multi-send
        toast.success(
          (t) => (
            <div>
              Multi-send successful! Sent to {recipientAddresses.length}{" "}
              recipients.
              <br />
              <a
                href={`${EXPLORER_URL}/tx/${receipt.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                View on Explorer
              </a>
            </div>
          ),
          { id: toastId, duration: 8000 }
        );

        await fetch("/api/leaderboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            senderAddress: address,
            amountSent: formatEther(totalAmountForContract),
          }),
        });

        setMultiRecipientsList("");
        setAmount("");
      }
    } catch (error: any) {
      console.error("Transaction error:", error);
      const errorMessage =
        error.shortMessage || error.message || "An unknown error occurred.";
      if (
        errorMessage.includes("insufficient funds") ||
        errorMessage.includes("gas required exceeds allowance")
      ) {
        toast.error(
          "Insufficient balance for total amount or gas fees. Please check your balance.",
          { id: toastId, duration: 8000 }
        );
      } else if (errorMessage.includes("user rejected transaction")) {
        toast.error("Transaction rejected by user.", { id: toastId });
      } else {
        toast.error(`Transaction failed: ${errorMessage}`, { id: toastId });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const maskAddress = (addr: string) =>
    `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  const presetAmounts = ["0.005", "0.01", "0.1", "0.5"];
  const formatDynamicDecimal = (weiValue: string): string => {
    try {
      const etherValue = formatEther(BigInt(weiValue));
      const fixedValue = parseFloat(etherValue).toFixed(4);
      return Number(fixedValue).toString();
    } catch (error) {
      console.error("Error formatting weiValue:", weiValue, error);
      return "N/A";
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 md:p-0">
      <h1 className="text-4xl text-center font-pixel">Send STT Tokens</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <PixelatedCard>
          <h2 className="text-2xl text-center mb-4 font-pixel">Transfer</h2>

          {isConnected && balance && (
            <div className="text-center bg-stone-900 p-4 mb-6 border-2 border-black">
              <p className="text-sm">Your Balance</p>
              <p className="text-2xl font-pixel text-white">
                {Number(parseFloat(balance.formatted).toFixed(4))}{" "}
                {balance.symbol}
              </p>
            </div>
          )}

          {/* Mode Selector (Single/Multi Send) */}
          <div className="flex justify-center mb-6 border-2 border-black">
            <button
              onClick={() => {
                setSendMode("single");
                setAmount("");
                setRecipient("");
                setMultiRecipientsList("");
              }}
              className={`flex-1 p-3 font-pixel ${
                sendMode === "single"
                  ? "bg-orange-400 text-stone-900"
                  : "bg-stone-700 text-white hover:bg-stone-600"
              }`}
            >
              Single Send
            </button>
            <button
              onClick={() => {
                setSendMode("multi");
                setAmount("");
                setRecipient("");
                setMultiRecipientsList("");
              }}
              className={`flex-1 p-3 font-pixel ${
                sendMode === "multi"
                  ? "bg-orange-400 text-stone-900"
                  : "bg-stone-700 text-white hover:bg-stone-600"
              }`}
            >
              Multi Send
            </button>
          </div>

          <form onSubmit={handleSend} className="space-y-6">
            {sendMode === "single" ? (
              // Single Send Form
              <>
                <div>
                  <label
                    htmlFor="recipient"
                    className="block text-sm mb-1 font-bold"
                  >
                    Recipient Address
                  </label>
                  <input
                    id="recipient"
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="0x..."
                    className="w-full p-3 bg-stone-800 border-2 border-black text-white font-mono focus:outline-none focus:border-orange-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 font-bold">
                    Amount (STT)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    {presetAmounts.map((val) => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setAmount(val)}
                        className={`
                          p-2 font-pixel text-sm border-2 transition-colors duration-200
                          ${
                            amount === val
                              ? "bg-orange-400 text-stone-900 border-orange-600"
                              : "bg-stone-800 text-orange-400 border-stone-700 hover:bg-stone-700 hover:border-orange-500"
                          }
                        `}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                  <input
                    id="amount"
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Or enter custom amount"
                    className="w-full p-3 bg-stone-800 border-2 border-black text-white font-mono focus:outline-none focus:border-orange-400"
                    required
                  />
                </div>
              </>
            ) : (
              // Multi Send Form
              <>
                <div>
                  <label
                    htmlFor="multiRecipientsList"
                    className="block text-sm mb-1 font-bold"
                  >
                    Recipient Addresses (separated by commas)
                  </label>
                  <textarea
                    id="multiRecipientsList"
                    value={multiRecipientsList}
                    onChange={(e) => setMultiRecipientsList(e.target.value)}
                    placeholder={`0xabc...123, 0xdef...456, 0xghi...789`}
                    rows={4}
                    className="w-full p-3 bg-stone-800 border-2 border-black text-white font-mono focus:outline-none focus:border-orange-400"
                    required
                  ></textarea>
                  <p className="text-xs text-stone-400 mt-1">
                    Enter recipient addresses separated by commas.
                  </p>
                </div>

                {/* Amount Type Selector for Multi Send - SANGAT DIPERBAIKI */}
                {/* Kontainer sekarang akan mengatur penumpukan dan jarak */}
                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setMultiSendAmountType("per_recipient")}
                    className={`
                            w-full p-3 font-pixel text-sm border-2 transition-colors duration-200
                            ${
                              multiSendAmountType === "per_recipient"
                                ? "bg-orange-400 text-stone-900 border-orange-600"
                                : "bg-stone-800 text-orange-400 border-stone-700 hover:bg-stone-700 hover:border-orange-500"
                            }
                        `}
                  >
                    Amount Per Recipient
                  </button>
                  <button
                    type="button"
                    onClick={() => setMultiSendAmountType("total_distributed")}
                    className={`
                            w-full p-3 font-pixel text-sm border-2 transition-colors duration-200
                            ${
                              multiSendAmountType === "total_distributed"
                                ? "bg-orange-400 text-stone-900 border-orange-600"
                                : "bg-stone-800 text-orange-400 border-stone-700 hover:bg-stone-700 hover:border-orange-500"
                            }
                        `}
                  >
                    Total Amount (Distribute)
                  </button>
                </div>

                <div>
                  <label className="block text-sm mb-2 font-bold">
                    Amount (STT)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    {presetAmounts.map((val) => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setAmount(val)}
                        className={`
                          p-2 font-pixel text-sm border-2 transition-colors duration-200
                          ${
                            amount === val
                              ? "bg-orange-400 text-stone-900 border-orange-600"
                              : "bg-stone-800 text-orange-400 border-stone-700 hover:bg-stone-700 hover:border-orange-500"
                          }
                        `}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                  <input
                    id="multiAmount"
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={
                      multiSendAmountType === "per_recipient"
                        ? "Enter amount per recipient"
                        : "Enter total amount to distribute"
                    }
                    className="w-full p-3 bg-stone-800 border-2 border-black text-white font-mono focus:outline-none focus:border-orange-400"
                    required
                  />
                </div>
              </>
            )}

            <PixelatedButton
              type="submit"
              disabled={isLoading}
              className={`w-full !text-lg !py-3 !border-2 transition-colors duration-200
                ${
                  isLoading
                    ? "!bg-stone-700 !text-stone-500 !border-stone-600 cursor-not-allowed"
                    : "!bg-orange-400 !text-stone-900 !border-black"
                }
              `}
            >
              {isLoading
                ? "Sending..."
                : sendMode === "single"
                ? "Send Tokens"
                : "Send Multiple Tokens"}
            </PixelatedButton>
          </form>
        </PixelatedCard>
        <PixelatedCard>
          <h2 className="text-2xl text-center mb-4 font-pixel">
            🏆 Leaderboard
          </h2>
          <div className="space-y-1 text-sm max-h-96 pr-2 -mr-2 overflow-y-auto">
            <div className="grid grid-cols-3 font-bold text-center border-b-2 border-black pb-2 sticky top-0 bg-stone-900/80 backdrop-blur-sm">
              <span>Address</span>
              <span>TXs</span>
              <span>Total Sent</span>
            </div>
            {leaderboard.length > 0 ? (
              leaderboard.map((entry, index) => (
                <div
                  key={entry._id}
                  className="grid grid-cols-3 items-center text-center p-2 transition-colors hover:bg-stone-800 rounded-md"
                >
                  <span className="font-mono text-left">
                    {index + 1}. {maskAddress(entry.walletAddress)}
                  </span>
                  <span className="font-pixel">{entry.txCount}</span>
                  <span className="font-pixel text-yellow-400">
                    {formatDynamicDecimal(entry.totalSentWei)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-center col-span-3 py-4">
                No transactions recorded yet.
              </p>
            )}
          </div>
        </PixelatedCard>
      </div>
    </div>
  );
}
