"use client";

import { useState, useEffect } from "react";
import { useAccount, useSendTransaction, useBalance } from "wagmi";
import { parseEther, formatEther, isAddress } from "ethers";
import toast from "react-hot-toast";

import PixelatedButton from "@/components/PixelatedButton";
import PixelatedCard from "@/components/PixelatedCard";

const SOMNIA_TESTNET_CHAIN_ID = 50312;

interface LeaderboardEntry {
  _id: string;
  walletAddress: string;
  txCount: number;
  totalSentWei: string;
}

export default function SendPage() {
  const { address, isConnected, chain } = useAccount();
  const { data: balance } = useBalance({ address });
  const { sendTransactionAsync } = useSendTransaction();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
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

    if (!isConnected || !address) {
      toast.error("Please connect your wallet first!");
      return;
    }
    if (chain?.id !== SOMNIA_TESTNET_CHAIN_ID) {
      toast.error("Please switch to Somnia Testnet!");
      return;
    }
    if (!isAddress(recipient)) {
      toast.error("Invalid recipient address!");
      return;
    }
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      toast.error("Invalid amount!");
      return;
    }

    const toastId = toast.loading("Processing your transaction...");
    setIsLoading(true);

    try {
      await sendTransactionAsync({
        to: recipient as `0x${string}`,
        value: parseEther(amount),
      });

      toast.success("Transaction successful!", { id: toastId });

      await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderAddress: address, amountSent: amount }),
      });

      setRecipient("");
      setAmount("");
    } catch (error: any) {
      console.error(error);
      const errorMessage = error.shortMessage || "Transaction failed.";
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const maskAddress = (addr: string) =>
    `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  const presetAmounts = ["0.005", "0.01", "0.1", "0.5"];
  const formatDynamicDecimal = (weiValue: string): string => {
    const etherValue = formatEther(BigInt(weiValue));
    const fixedValue = parseFloat(etherValue).toFixed(4);
    return Number(fixedValue).toString();
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

          <form onSubmit={handleSend} className="space-y-6">
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
                                            ? "bg-orange-400 text-stone-900 border-orange-600" // Style saat aktif
                                            : "bg-stone-800 text-orange-400 border-stone-700 hover:bg-stone-700 hover:border-orange-500" // Style default
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
              {isLoading ? "Sending..." : "Send Tokens"}
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
