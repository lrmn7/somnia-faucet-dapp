"use client";

import { useState } from "react";
import toast from "react-hot-toast";

import PixelatedButton from "@/components/PixelatedButton";
import PixelatedCard from "@/components/PixelatedCard";
import { FaSpinner, FaCheckCircle } from "react-icons/fa";

const isValidEVMAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

const getRandomAmount = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export default function DummyCheckerPage() {
  const [walletAddress, setWalletAddress] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const handleCheckAirdrop = () => {
    if (!isValidEVMAddress(walletAddress)) {
      toast.error("Please enter a valid EVM wallet address.");
      return;
    }

    setResultMessage(null);
    setIsChecking(true);

    setTimeout(() => {
      const randomAmount = getRandomAmount(1000, 50000);
      const formattedAmount = randomAmount.toLocaleString("en-US");
      const message = `Congrats! You are eligible for ${formattedAmount} $SOM\nStay tuned for updates!`;
      
      setResultMessage(message);
      setIsChecking(false);
    }, 6000);
  };

  const isButtonDisabled = isChecking || walletAddress.trim() === "";

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <h1 className="text-4xl text-center font-bold text-orange-500 drop-shadow-lg">Somnia Airdrop Checker</h1>
      <PixelatedCard className="p-8">
        <p className="text-lg text-center mb-6 text-gray-400">
          Enter your EVM wallet address
        </p>

        <div className="space-y-4 mb-6">
          <input
            id="walletAddress"
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="e.g., 0x90A69de07ADEEDBA5d2f2D0afdc0f4D9aFFcbA4F"
            className="w-full p-3 bg-stone-900 border-2 border-orange-500 text-orange-500 font-pixel focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all duration-300"
          />
        </div>

        <div className="flex flex-col items-center">
          <PixelatedButton
            onClick={handleCheckAirdrop}
            disabled={isButtonDisabled}
          >
            {isChecking ? (
              <span className="flex items-center space-x-2">
                <FaSpinner className="animate-spin" />
                <span>Checking...</span>
              </span>
            ) : (
              "Check Airdrop"
            )}
          </PixelatedButton>

          {isChecking && (
            <p className="mt-4 text-sm text-center text-gray-400 animate-pulse">
              This is a fun-only demo. Not an official airdrop checker.
            </p>
          )}

          {resultMessage && (
            <div className="mt-8 w-full p-6 bg-lime-950 border-4 border-green-500 rounded-lg shadow-lg animate-fade-in">
              <div className="flex items-center space-x-4">
                <FaCheckCircle className="text-green-500 text-3xl animate-bounce-slow" />
                <p className="text-lg font-bold text-green-300 font-pixel whitespace-pre-wrap">
                  {resultMessage}
                </p>
              </div>
            </div>
          )}
        </div>
      </PixelatedCard>
    </div>
  );
}