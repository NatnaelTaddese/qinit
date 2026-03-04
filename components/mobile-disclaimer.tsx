"use client";

import { useState, useEffect } from "react";
import { ComputerIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function MobileDisclaimer() {
  const [isMobile, setIsMobile] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if mobile on mount and on resize
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (!isMobile || dismissed) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-6">
      <div className="max-w-sm w-full">
        {/* LCD Screen style container */}
        <div className="relative overflow-hidden rounded-[4px] bg-gradient-to-b from-zinc-800 via-zinc-900 to-zinc-950 p-[3px] shadow-[0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)]">
          <div className="rounded-[2px] bg-gradient-to-b from-zinc-950 to-zinc-900 p-[2px]">
            <div
              className="relative rounded-[1px] p-6"
              style={{
                background:
                  "linear-gradient(145deg, #f59e0b08, #f59e0b15, #f59e0b05)",
                boxShadow: `
                  inset 0 0 60px rgba(0,0,0,0.3),
                  inset 0 1px 0 rgba(255,255,255,0.03),
                  inset 0 -1px 0 rgba(0,0,0,0.5)
                `,
              }}
            >
              {/* Scanline overlay */}
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.03] rounded-[1px]"
                style={{
                  backgroundImage: `repeating-linear-gradient(
                    0deg,
                    transparent,
                    transparent 2px,
                    rgba(0,0,0,0.3) 2px,
                    rgba(0,0,0,0.3) 4px
                  )`,
                }}
              />

              {/* Content */}
              <div className="relative z-10 text-center">
                <div className="flex justify-center mb-4">
                  <div
                    className="p-3 rounded-full"
                    style={{
                      background:
                        "linear-gradient(180deg, #f59e0b30 0%, #f59e0b20 100%)",
                      border: "1px solid #f59e0b40",
                    }}
                  >
                    <HugeiconsIcon
                      icon={ComputerIcon}
                      className="w-8 h-8 text-amber-500"
                    />
                  </div>
                </div>

                <div className="text-[10px] uppercase tracking-[0.2em] mb-1 opacity-60 font-mono text-amber-500">
                  Desktop Recommended
                </div>

                <h2 className="text-lg font-bold tracking-wide mb-3 text-amber-500">
                  Best on Desktop
                </h2>

                <p className="text-sm leading-relaxed mb-6 text-amber-500/70">
                  This app uses a piano keyboard with computer key mappings and
                  is designed for desktop browsers. For the best experience,
                  please visit on a computer.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
