"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PixelatedButton from "@/components/PixelatedButton";

const HeroSection = () => {
  const [greeting, setGreeting] = useState("gsomnia");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting("gsomnia, good morning 🌅");
    } else if (hour < 18) {
      setGreeting("gsomnia, good afternoon ☀️");
    } else {
      setGreeting("gsomnia, good evening 🌙");
    }
  }, []);

  return (
    <section className="text-center py-16">
      <p className="text-gray-400 text-sm mb-2">{greeting}</p>
      <h1 className="text-5xl md:text-6xl mb-6">welcome to Somcet</h1>
      <p className="text-lg mb-8 max-w-3xl mx-auto">
        need some test tokens? wanna send a tx? this lil site got u covered. no
        fluff, just vibes 🧃
      </p>

      <div className="flex justify-center gap-6">
        <Link href="/faucet">
          <PixelatedButton>Faucet</PixelatedButton>
        </Link>
        <Link href="/send">
          <PixelatedButton>Send</PixelatedButton>
        </Link>
      </div>
    </section>
  );
};

export default HeroSection;
