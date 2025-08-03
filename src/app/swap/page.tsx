"use client";

import { useState, useEffect, useMemo } from "react";
import {
  useAccount,
  useWriteContract,
  useReadContract,
  useBalance,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits, parseUnits } from "ethers";
import { erc20Abi } from "viem";
import toast from "react-hot-toast";

import PixelatedButton from "@/components/PixelatedButton";
import PixelatedCard from "@/components/PixelatedCard";

const POOL_ADDRESS = "0x47eBA9C4dae2783B8400f315468FA9c6AE9c88D1";
const SOMNIA_TESTNET_CHAIN_ID = 50312;

const TOKEN_LIST = [
  { address: "0x9EB0A05d9636d17A44D236547F060C2BB9BD67be", symbol: "IDR" },
  { address: "0x1947953bDb113315c7f5D00ffC918f2Bc9486e42", symbol: "USDT" },
  { address: "0x31CC39311c042fd151D120eA34Cec268E6D565a9", symbol: "USDC" },
  { address: "0xcD94cf69f1A422d060Aea418205c65eFC843C5a6", symbol: "SMTL" },
];

const USDT_FAUCET_ADDRESS = "0xcD94cf69f1A422d060Aea418205c65eFC843C5a6";

const multiTokenPoolAbi = [
  {
    type: "function",
    name: "swap",
    inputs: [
      { name: "_tokenIn", type: "address" },
      { name: "_tokenOut", type: "address" },
      { name: "_amountIn", type: "uint256" },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getPoolState",
    inputs: [],
    outputs: [{ type: "address[]" }, { type: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "addLiquidity",
    inputs: [{ name: "_amounts", type: "uint256[]" }],
    outputs: [{ name: "lpAmount", type: "uint256" }],
    stateMutability: "nonpayable",
  },
];

const usdtFaucetAbi = [
  {
    type: "function",
    name: "claim",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "lastClaimedTimestamp",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
];

export default function SwapPage() {
  const { address, isConnected, chain } = useAccount();
  const {
    data: hash,
    writeContractAsync,
    isPending: isSubmitting,
  } = useWriteContract();

  const [mode, setMode] = useState<"swap" | "liquidity" | "faucet">("swap");
  const [tokenInAddress, setTokenInAddress] = useState(TOKEN_LIST[0].address);
  const [tokenOutAddress, setTokenOutAddress] = useState(TOKEN_LIST[1].address);
  const [amountIn, setAmountIn] = useState("");
  const [amountOut, setAmountOut] = useState("");
  const [liquidityTokenA, setLiquidityTokenA] = useState(TOKEN_LIST[0].address);
  const [liquidityTokenB, setLiquidityTokenB] = useState(TOKEN_LIST[1].address);
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [lastEdited, setLastEdited] = useState<"A" | "B">("A");
  const [cooldown, setCooldown] = useState(0);
  
  const [activeToastId, setActiveToastId] = useState<string | undefined>(undefined);

  const { data: balanceIn, refetch: refetchBalanceIn } = useBalance({
    address,
    token: tokenInAddress as `0x${string}`,
  });
  const { data: balanceA, refetch: refetchBalanceA } = useBalance({
    address,
    token: liquidityTokenA as `0x${string}`,
  });
  const { data: balanceB, refetch: refetchBalanceB } = useBalance({
    address,
    token: liquidityTokenB as `0x${string}`,
  });
  const { data: poolState, refetch: refetchPoolState } = useReadContract({
    abi: multiTokenPoolAbi,
    address: POOL_ADDRESS,
    functionName: "getPoolState",
  });
  const { data: allowanceIn, refetch: refetchAllowanceIn } = useReadContract({
    abi: erc20Abi,
    address: tokenInAddress as `0x${string}`,
    functionName: "allowance",
    args: [address!, POOL_ADDRESS],
    query: { enabled: !!address },
  });
  const { data: allowanceA, refetch: refetchAllowanceA } = useReadContract({
    abi: erc20Abi,
    address: liquidityTokenA as `0x${string}`,
    functionName: "allowance",
    args: [address!, POOL_ADDRESS],
    query: { enabled: !!address },
  });
  const { data: allowanceB, refetch: refetchAllowanceB } = useReadContract({
    abi: erc20Abi,
    address: liquidityTokenB as `0x${string}`,
    functionName: "allowance",
    args: [address!, POOL_ADDRESS],
    query: { enabled: !!address },
  });
  const { data: lastClaim, refetch: refetchLastClaim } = useReadContract({
    abi: usdtFaucetAbi,
    address: USDT_FAUCET_ADDRESS,
    functionName: "lastClaimedTimestamp",
    args: [address!],
    query: { enabled: !!address },
  });
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const isProcessing = isSubmitting || isConfirming;

  const reserves = useMemo(() => {
    if (!poolState || !Array.isArray(poolState)) return {};
    const [tokenAddresses, reserveValues] = poolState;
    const reserveMap: { [key: string]: bigint } = {};
    tokenAddresses.forEach((addr: `0x${string}`, i: number) => {
      reserveMap[addr.toLowerCase()] = reserveValues[i];
    });
    return reserveMap;
  }, [poolState]);

  useEffect(() => {
    if (
      mode === "swap" &&
      amountIn &&
      Number(amountIn) > 0 &&
      Object.keys(reserves).length > 0
    ) {
      const reserveIn = reserves[tokenInAddress.toLowerCase()];
      const reserveOut = reserves[tokenOutAddress.toLowerCase()];
      if (!reserveIn || !reserveOut || reserveIn === BigInt(0) || reserveOut === BigInt(0)) {
        setAmountOut("0");
        return;
      }
      const amountInBigInt = parseUnits(amountIn, balanceIn?.decimals || 18);
      const amountInWithFee = amountInBigInt * BigInt(997);
      const numerator = amountInWithFee * reserveOut;
      const denominator = reserveIn * BigInt(1000) + amountInWithFee;
      setAmountOut(
        formatUnits(numerator / denominator, balanceIn?.decimals || 18)
      );
    } else {
      setAmountOut("");
    }
  }, [
    mode,
    amountIn,
    tokenInAddress,
    tokenOutAddress,
    reserves,
    balanceIn?.decimals,
  ]);

  useEffect(() => {
    if (mode !== "liquidity" || Object.keys(reserves).length === 0) return;
    const reserveA = reserves[liquidityTokenA.toLowerCase()];
    const reserveB = reserves[liquidityTokenB.toLowerCase()];
    if (!reserveA || !reserveB || reserveA === BigInt(0) || reserveB === BigInt(0)) return;
    if (lastEdited === "A" && amountA) {
      const amountABigInt = parseUnits(amountA, balanceA?.decimals || 18);
      const calculatedAmountB = (amountABigInt * reserveB) / reserveA;
      setAmountB(formatUnits(calculatedAmountB, balanceB?.decimals || 18));
    } else if (lastEdited === "B" && amountB) {
      const amountBBigInt = parseUnits(amountB, balanceB?.decimals || 18);
      const calculatedAmountA = (amountBBigInt * reserveA) / reserveB;
      setAmountA(formatUnits(calculatedAmountA, balanceA?.decimals || 18));
    }
  }, [
    mode,
    amountA,
    amountB,
    lastEdited,
    liquidityTokenA,
    liquidityTokenB,
    reserves,
    balanceA,
    balanceB,
  ]);

  useEffect(() => {
    if (lastClaim !== undefined) {
      const now = Math.floor(Date.now() / 1000);
      const cooldownEnd = Number(lastClaim) + 24 * 60 * 60;
      setCooldown(cooldownEnd > now ? cooldownEnd - now : 0);
    }
  }, [lastClaim]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  useEffect(() => {
    if (hash && !isConfirming && !isSubmitting && activeToastId) {
      toast.success("Transaction successful!", { id: activeToastId });
      setActiveToastId(undefined);
      setAmountIn("");
      setAmountA("");
      setAmountB("");
      refetchBalanceIn();
      refetchBalanceA();
      refetchBalanceB();
      refetchAllowanceIn();
      refetchAllowanceA();
      refetchAllowanceB();
      refetchPoolState();
      refetchLastClaim();
    }
  }, [isConfirming, isSubmitting, hash, activeToastId]);

  const needsApprovalSwap = useMemo(() => {
    if (mode !== "swap" || !amountIn || !allowanceIn) return false;
    return allowanceIn < parseUnits(amountIn, balanceIn?.decimals || 18);
  }, [mode, amountIn, allowanceIn, balanceIn?.decimals]);

  const needsApprovalA = useMemo(() => {
    if (mode !== "liquidity" || !amountA || !allowanceA) return false;
    return allowanceA < parseUnits(amountA, balanceA?.decimals || 18);
  }, [mode, amountA, allowanceA, balanceA?.decimals]);

  const needsApprovalB = useMemo(() => {
    if (mode !== "liquidity" || !amountB || !allowanceB) return false;
    return allowanceB < parseUnits(amountB, balanceB?.decimals || 18);
  }, [mode, amountB, allowanceB, balanceB?.decimals]);

  const handleAction = async () => {
    let action;
    if (mode === "swap") {
      action = needsApprovalSwap
        ? () =>
            writeContractAsync({
              abi: erc20Abi,
              address: tokenInAddress as `0x${string}`,
              functionName: "approve",
              args: [
                POOL_ADDRESS,
                parseUnits(amountIn, balanceIn?.decimals || 18),
              ],
            })
        : () =>
            writeContractAsync({
              abi: multiTokenPoolAbi,
              address: POOL_ADDRESS,
              functionName: "swap",
              args: [
                tokenInAddress,
                tokenOutAddress,
                parseUnits(amountIn, balanceIn?.decimals || 18),
              ],
            });
    } else if (mode === "liquidity") {
      if (needsApprovalA) {
        action = () =>
          writeContractAsync({
            abi: erc20Abi,
            address: liquidityTokenA as `0x${string}`,
            functionName: "approve",
            args: [POOL_ADDRESS, parseUnits(amountA, balanceA?.decimals || 18)],
          });
      } else if (needsApprovalB) {
        action = () =>
          writeContractAsync({
            abi: erc20Abi,
            address: liquidityTokenB as `0x${string}`,
            functionName: "approve",
            args: [POOL_ADDRESS, parseUnits(amountB, balanceB?.decimals || 18)],
          });
      } else {
        const allTokenAddresses = (poolState as any[])?.[0] || [];
        const amounts = allTokenAddresses.map((addr: string) => {
          if (addr.toLowerCase() === liquidityTokenA.toLowerCase())
            return parseUnits(amountA, balanceA?.decimals || 18);
          if (addr.toLowerCase() === liquidityTokenB.toLowerCase())
            return parseUnits(amountB, balanceB?.decimals || 18);
          return BigInt(0);
        });
        action = () =>
          writeContractAsync({
            abi: multiTokenPoolAbi,
            address: POOL_ADDRESS,
            functionName: "addLiquidity",
            args: [amounts],
          });
      }
    } else {
      action = () =>
        writeContractAsync({
          abi: usdtFaucetAbi,
          address: USDT_FAUCET_ADDRESS,
          functionName: "claim",
        });
    }

    const toastId = toast.loading("Waiting for user confirmation...");
    setActiveToastId(toastId);

    try {
      await action();
      toast.loading("Processing transaction...", { id: toastId });
    } catch (error: any) {
      toast.dismiss(toastId);
      setActiveToastId(undefined);
      
      console.error(error);
      if (error.shortMessage !== "User rejected the request.") {
        toast.error(error.shortMessage || "An error occurred.");
      }
    }
  };

  const formatCooldown = (totalSeconds: number): string => {
    if (totalSeconds <= 0) return "0s";
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    let parts: string[] = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds >= 0) parts.push(`${seconds}s`);
    return parts.join(" ");
  };

  const formatReadableBalance = (
    balance: { formatted: string } | undefined
  ): string => {
    if (!balance) return "0.0000";
    const number = parseFloat(balance.formatted);
    return number.toLocaleString("en-US", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    });
  };

  const renderSwap = () => {
    const hasInsufficientBalance =
      balanceIn && amountIn
        ? parseUnits(amountIn, balanceIn.decimals) > balanceIn.value
        : false;
    const isDisabled =
      !isConnected || isProcessing || !amountIn || hasInsufficientBalance;

    return (
      <>
        <div className="bg-stone-900 p-4 border-2 border-black space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-sm">From</p>
            <p className="text-sm">
              Balance: {formatReadableBalance(balanceIn)}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="number"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              placeholder="0.0"
              className="w-full text-2xl bg-transparent focus:outline-none"
            />
            <select
              value={tokenInAddress}
              onChange={(e) => setTokenInAddress(e.target.value)}
              className="bg-stone-900 border-2 border-black p-2 font-pixel focus:outline-none"
            >
              {TOKEN_LIST.map((token) => (
                <option key={token.address} value={token.address}>
                  {token.symbol}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-center my-2">
          <button
            onClick={() => {
              setTokenInAddress(tokenOutAddress);
              setTokenOutAddress(tokenInAddress);
              setAmountIn(amountOut);
            }}
            className="p-2 text-2xl hover:animate-spin"
          >
            &#x21C5;
          </button>
        </div>
        <div className="bg-stone-900 p-4 border-2 border-black space-y-2">
          <p className="text-sm">To</p>
          <div className="flex items-center gap-4">
            <input
              type="number"
              value={amountOut ? parseFloat(Number(amountOut).toFixed(6)) : ""}
              readOnly
              placeholder="0.0"
              className="w-full text-2xl bg-transparent focus:outline-none"
            />
            <select
              value={tokenOutAddress}
              onChange={(e) => setTokenOutAddress(e.target.value)}
              className="bg-stone-900 border-2 border-black p-2 font-pixel focus:outline-none"
            >
              {TOKEN_LIST.map((token) => (
                <option key={token.address} value={token.address}>
                  {token.symbol}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-6">
          <PixelatedButton
            onClick={handleAction}
            disabled={isDisabled}
            className={`w-full !text-lg !py-3 !border-2 transition-colors duration-200 ${
              isDisabled
                ? "!bg-stone-700 font-pixel !text-stone-500 !border-stone-600 cursor-not-allowed"
                : "!bg-orange-400 !text-stone-900 font-pixel !border-orange-400 !border-black"
            }`}
          >
            {!isConnected
              ? "Connect Wallet"
              : isProcessing
              ? isSubmitting
                ? "Waiting Confirmation..."
                : "Processing..."
              : hasInsufficientBalance
              ? "Insufficient Balance"
              : !amountIn
              ? "Enter an amount"
              : needsApprovalSwap
              ? "Approve"
              : "Swap"}
          </PixelatedButton>
        </div>
      </>
    );
  };

  const renderLiquidity = () => {
    const hasInsufficientBalanceA =
      balanceA && amountA
        ? parseUnits(amountA, balanceA.decimals) > balanceA.value
        : false;
    const hasInsufficientBalanceB =
      balanceB && amountB
        ? parseUnits(amountB, balanceB.decimals) > balanceB.value
        : false;
    const isDisabled =
      !isConnected ||
      isProcessing ||
      !amountA ||
      !amountB ||
      hasInsufficientBalanceA ||
      hasInsufficientBalanceB;

    return (
      <>
        <div className="bg-stone-900 p-4 border-2 border-black space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-sm">Token A</p>
            <p className="text-sm">
              Balance: {formatReadableBalance(balanceA)}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="number"
              value={amountA}
              onChange={(e) => {
                setAmountA(e.target.value);
                setLastEdited("A");
              }}
              placeholder="0.0"
              className="w-full text-2xl bg-transparent focus:outline-none"
            />
            <select
              value={liquidityTokenA}
              onChange={(e) => setLiquidityTokenA(e.target.value)}
              className="bg-stone-900 border-2 border-black p-2 font-pixel focus:outline-none"
            >
              {TOKEN_LIST.map((token) => (
                <option key={token.address} value={token.address}>
                  {token.symbol}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-center my-2 text-2xl font-bold">+</div>
        <div className="bg-stone-900 p-4 border-2 border-black space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-sm">Token B</p>
            <p className="text-sm">
              Balance: {formatReadableBalance(balanceB)}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="number"
              value={amountB}
              onChange={(e) => {
                setAmountB(e.target.value);
                setLastEdited("B");
              }}
              placeholder="0.0"
              className="w-full text-2xl bg-transparent focus:outline-none"
            />
            <select
              value={liquidityTokenB}
              onChange={(e) => setLiquidityTokenB(e.target.value)}
              className="bg-stone-900 border-2 border-black p-2 font-pixel focus:outline-none"
            >
              {TOKEN_LIST.map((token) => (
                <option key={token.address} value={token.address}>
                  {token.symbol}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-6">
          <PixelatedButton
            onClick={handleAction}
            disabled={isDisabled}
            className={`w-full !text-lg !py-3 !border-2 transition-colors duration-200 ${
              isDisabled
                ? "!bg-stone-700 !text-stone-500 font-pixel !border-stone-600 cursor-not-allowed"
                : "!bg-orange-400 font-pixel !text-stone-900 font-pixel !border-orange-400 !border-black"
            }`}
          >
            {!isConnected
              ? "Connect Wallet"
              : isProcessing
              ? isSubmitting
                ? "Waiting Confirmation..."
                : "Processing..."
              : hasInsufficientBalanceA || hasInsufficientBalanceB
              ? "Insufficient Balance"
              : !amountA || !amountB
              ? "Enter amounts"
              : needsApprovalA
              ? `Approve ${
                  TOKEN_LIST.find(
                    (t) =>
                      t.address.toLowerCase() === liquidityTokenA.toLowerCase()
                  )?.symbol
                }`
              : needsApprovalB
              ? `Approve ${
                  TOKEN_LIST.find(
                    (t) =>
                      t.address.toLowerCase() === liquidityTokenB.toLowerCase()
                  )?.symbol
                }`
              : "Supply Liquidity"}
          </PixelatedButton>
        </div>
      </>
    );
  };

  const renderFaucet = () => {
    const isDisabled = !isConnected || isProcessing || cooldown > 0;

    return (
      <div className="text-center p-4">
        <h2 className="text-2xl font-bold mb-2">SMTL Faucet</h2>
        <p className="text-stone-400 mb-6">
          Claim 1,000 SMTL for free, once every 24 hours.
        </p>
        <div className="bg-stone-900 p-6 border-2 border-black mb-8">
          <p className="text-lg">You will receive</p>
          <p className="text-4xl font-pixel text-white">1,000 SMTL</p>
        </div>
        <PixelatedButton onClick={handleAction} disabled={isDisabled}>
          {!isConnected
            ? "Connect Wallet"
            : isProcessing
            ? isSubmitting
              ? "Waiting Confirmation..."
              : "Processing..."
            : cooldown > 0
            ? `Wait ${formatCooldown(cooldown)}`
            : "Claim Tokens"}
        </PixelatedButton>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-4xl text-center">DeFi Pool</h1>
      <PixelatedCard>
        <div className="flex mb-4 border-b-2 border-black">
          <button
            onClick={() => setMode("swap")}
            className={`flex-1 p-2 font-pixel text-lg ${
              mode === "swap"
                ? "bg-orange-400 text-stone-900"
                : "bg-stone-700 text-white hover:bg-stone-600"
            }`}
          >
            Swap
          </button>
          <button
            onClick={() => setMode("liquidity")}
            className={`flex-1 p-2 font-pixel text-lg border-l-2 border-black ${
              mode === "liquidity"
                ? "bg-orange-400 text-stone-900"
                : "bg-stone-700 text-white hover:bg-stone-600"
            }`}
          >
            Liquidity
          </button>
          <button
            onClick={() => setMode("faucet")}
            className={`flex-1 p-2 font-pixel text-lg border-l-2 border-black ${
              mode === "faucet"
                ? "bg-orange-400 text-stone-900"
                : "bg-stone-700 text-white hover:bg-stone-600"
            }`}
          >
            Faucet
          </button>
        </div>

        {mode === "swap" && renderSwap()}
        {mode === "liquidity" && renderLiquidity()}
        {mode === "faucet" && renderFaucet()}
      </PixelatedCard>
    </div>
  );
}