"use client"; // Pastikan ini ada di baris paling atas jika menggunakan komponen sisi klien

import { useState } from "react"; // Import useState

const FaqSection = () => {
  // --- BARU: State untuk melacak FAQ yang sedang terbuka ---
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const faqs = [
    {
      q: "How does the Faucet work?",
      a: "The faucet provides 0.5 STT testnet tokens for free. You can claim them once every 24 hours to use for transaction fees on the Somnia Testnet.",
    },
    {
      q: "What is the 'Send' page and Leaderboard for?",
      a: "The 'Send' page allows you to transfer STT testnet tokens to other users. You can choose to send tokens to a single recipient or use the Multi Send feature to send to multiple addresses at once. Every transaction you send is recorded, and the Leaderboard displays the top 20 users based on their total sent tokens, encouraging activity on the testnet.",
    },
    {
      q: "How does the Multi Send feature work, and what file formats are supported?",
      a: (
        <>
          The{" "}
          <span className="font-semibold text-brand-orange">Multi Send</span>{" "}
          feature lets you send STT testnet tokens to multiple recipient
          addresses in a single transaction, saving you time and gas fees
          compared to sending individually. You can either paste a
          comma-separated list of addresses directly into the text area or
          upload an{" "}
          <span className="font-semibold text-brand-orange">
            XLSX (Excel) file
          </span>
          . When uploading an XLSX file, the dApp will automatically read the
          wallet addresses from the{" "}
          <span className="font-semibold text-brand-orange">
            first column (Column A) of the first sheet
          </span>{" "}
          in your Excel file. Invalid addresses will be filtered out.
        </>
      ),
    },
    {
      q: "What's the difference between 'Amount Per Recipient' and 'Total Amount (Distribute)' in Multi Send?",
      a: (
        <>
          In Multi Send, you have two options for specifying the amount:
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>
              <span className="font-semibold text-brand-orange">
                Amount Per Recipient:
              </span>{" "}
              If you choose this, the amount you enter will be sent to *each*
              address in your recipient list. For example, if you enter "0.1"
              and have 5 recipients, each of the 5 recipients will receive 0.1
              STT, totaling 0.5 STT sent from your wallet.
            </li>
            <li>
              <span className="font-semibold text-brand-orange">
                Total Amount (Distribute):
              </span>{" "}
              With this option, the amount you enter will be *divided equally*
              among all recipients in your list. For example, if you enter "1.0"
              and have 5 recipients, each recipient will receive 0.2 STT (1.0
              divided by 5). Any remainder from the division (due to integer
              arithmetic) will be added to the first recipient's share to ensure
              the total amount is sent.
            </li>
          </ul>
          Choose the option that best fits how you want to distribute tokens.
        </>
      ),
    },
    {
      q: "Is this dApp safe to use?",
      a: (
        <>
          Absolutely. This dApp is completely safe and never asks for access to
          your private keys. The entire source code is open-source, and you can
          verify it yourself directly on our{" "}
          <a
            href="https://github.com/lrmn7/somtool"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-orange hover:underline font-semibold"
          >
            GitHub repository
          </a>{" "}
          for full transparency.
        </>
      ),
    },
    {
      q: "Are these tokens real money?",
      a: "No. The STT tokens from the faucet have no real-world value. They are created purely for testing and development purposes within the Somnia Testnet environment.",
    },
  ];

  return (
    <section className="py-16 bg-stone-900/50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-pixel text-center mb-10">FAQ</h2>
        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="border-2 border-black bg-stone-900">
              <button
                className="w-full text-left p-5 font-pixel text-brand-orange text-lg flex justify-between items-center cursor-pointer hover:bg-stone-800 transition-colors duration-200"
                onClick={() => toggleFaq(i)}
              >
                {faq.q}
                <span className="text-white text-2xl">
                  {openFaqIndex === i ? "−" : "+"}
                </span>
              </button>
              {openFaqIndex === i && (
                <div className="p-5 pt-0">
                  {" "}
                  {/* Adjusted padding for better flow */}
                  <p className="text-stone-300 leading-relaxed border-t-2 border-stone-700 pt-5">
                    {faq.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FaqSection;
