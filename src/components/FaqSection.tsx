import Link from "next/link";

const FaqSection = () => {
  const faqs = [
    {
      q: "How does the Faucet work?",
      a: "The faucet provides 0.5 STT testnet tokens for free. You can claim them once every 12 hours to use for transaction fees on the Somnia Testnet.",
    },
    {
      q: "What is the 'Send' page and Leaderboard for?",
      a: "The 'Send' page allows you to transfer STT testnet tokens to other users. Every transaction you send is recorded. The Leaderboard displays the top 20 users based on the total tokens they have sent, as a fun way to encourage activity on the testnet.",
    },
    {
      q: "Is this dApp safe to use?",
      a: (
        <>
          Absolutely. This dApp is completely safe and never asks for access to
          your private keys. The entire source code is open-source, and
          you can verify it yourself directly on our{" "}
          <a
            href="https://github.com/lrmn7"
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
        <h2 className="text-3xl font-pixel text-center mb-10">
          Frequently Asked Questions
        </h2>
        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="border-2 border-black p-5 bg-stone-900">
              <h3 className="font-pixel text-brand-orange text-lg mb-2">
                {faq.q}
              </h3>
              <p className="text-stone-300 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FaqSection;