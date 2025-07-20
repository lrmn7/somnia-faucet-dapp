import Image from "next/image";

import Marquee from "react-fast-marquee";

import { MarqueeECOData } from "@/data/marquee-eco-data";

export function MarqueeECO() {
  return (
    <div className="relative">
      <div className="relative left-1/2 right-1/2 ml-[-51vw] mr-[-50vw] w-screen rotate-2">
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-1/3" />
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-1/3" />

        {/* Marquee text */}
        <Marquee
          autoFill
          speed={40}
          className="flex items-center bg-transparent py-0.5"
        >
          <span className="ml-1 h-fit text-sm text-muted-foreground">
            Somnia Ecosystem •
          </span>
        </Marquee>

        {/* Marquee images NFT */}
        <Marquee
          autoFill
          speed={30}
          direction="right"
          className="flex items-center bg-background/5 py-0.5"
        >
          {MarqueeECOData.map((item, index) => (
            <div
              key={index}
              className="ml-12 flex items-center"
              title={item.label}
            >
              <span className="sr-only">{item.label}</span>
              <Image
                src={item.imageUrl}
                alt={item.label}
                width={512}
                height={512}
                className="pointer-events-none rounded-xl object-cover shadow-md transition-transform duration-300 ease-in-out group-hover:scale-105 grayscale contrast-50 w-full h-full"
              />
            </div>
          ))}
        </Marquee>
      </div>
    </div>
  );
}
