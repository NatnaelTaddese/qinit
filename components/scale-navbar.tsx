"use client";

import { cn } from "@/lib/utils";
import {
  ScaleCategory,
  ScaleVariant,
  SCALE_CATEGORIES,
  SCALE_INFO,
  getScaleType,
  hasVariants,
} from "@/lib/scales";

type TabType = "kinit" | ScaleCategory | "quiz";

interface ScaleNavbarProps {
  activeTab: TabType;
  variant: ScaleVariant;
  onTabChange: (tab: TabType) => void;
  onVariantChange: (variant: ScaleVariant) => void;
}

export function ScaleNavbar({
  activeTab,
  variant,
  onTabChange,
  onVariantChange,
}: ScaleNavbarProps) {
  const scaleType =
    activeTab !== "kinit" && activeTab !== "quiz"
      ? getScaleType(activeTab, hasVariants(activeTab) ? variant : null)
      : null;
  const scaleInfo = scaleType ? SCALE_INFO[scaleType] : null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-transparent  border-white/5">
      <div className="flex flex-col items-center py-4 gap-4">
        {/* Tab Navigation */}
        <div className="inline-flex">
          <TabButton
            active={activeTab === "kinit"}
            onClick={() => onTabChange("kinit")}
          >
            Kiñit
          </TabButton>
          {SCALE_CATEGORIES.map((cat) => (
            <TabButton
              key={cat.id}
              active={activeTab === cat.id}
              onClick={() => onTabChange(cat.id)}
              color={
                activeTab === cat.id
                  ? SCALE_INFO[
                      getScaleType(cat.id, hasVariants(cat.id) ? variant : null)
                    ].color
                  : undefined
              }
            >
              {cat.label}
            </TabButton>
          ))}
          <TabButton
            active={activeTab === "quiz"}
            onClick={() => onTabChange("quiz")}
          >
            Quiz
          </TabButton>
        </div>

        {/* Major/Minor Toggle - only show for scales with variants */}
        {activeTab !== "kinit" &&
          activeTab !== "quiz" &&
          hasVariants(activeTab) && (
            <div className="inline-flex">
              <VariantButton
                active={variant === "major"}
                onClick={() => onVariantChange("major")}
                color={scaleInfo?.color}
              >
                Major
              </VariantButton>
              <VariantButton
                active={variant === "minor"}
                onClick={() => onVariantChange("minor")}
                color={scaleInfo?.color}
              >
                Minor
              </VariantButton>
            </div>
          )}
      </div>
    </div>
  );
}

// Tab Button Component - White piano key style
function TabButton({
  children,
  active,
  onClick,
  color,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative px-5 py-3 text-sm font-medium transition-all",
        "first:rounded-bl-[3px] last:rounded-br-[3px]",
        "border-y border-r first:border-l border-b-[5px]",
        "active:border-b-[2px] active:translate-y-[3px] active:shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_2px_4px_rgba(0,0,0,0.1)]",
      )}
      style={
        active && color
          ? {
              background: `linear-gradient(to bottom, ${color}40, ${color}60)`,
              borderColor: color,
              borderBottomColor: color,
              color: color,
              boxShadow: `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1), inset 0 -2px 4px rgba(0,0,0,0.05)`,
            }
          : active
            ? {
                background: `linear-gradient(to bottom, hsl(var(--primary) / 0.3), hsl(var(--primary) / 0.5))`,
                borderColor: `hsl(var(--primary))`,
                borderBottomColor: `hsl(var(--primary))`,
                color: `hsl(var(--primary))`,
                boxShadow: `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1), inset 0 -2px 4px rgba(0,0,0,0.05)`,
              }
            : {
                background: `linear-gradient(to bottom, white, #f8f8f8, #f0f0f0)`,
                borderColor: `#d1d5db`,
                borderBottomColor: `#9ca3af`,
                color: `#6b7280`,
                boxShadow: `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1), inset 0 -2px 4px rgba(0,0,0,0.05)`,
              }
      }
    >
      {/* Top highlight for depth */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-white/80" />
      {children}
    </button>
  );
}

// Variant Button Component - Black piano key style
function VariantButton({
  children,
  active,
  onClick,
  color,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative px-6 py-2.5 text-sm font-medium transition-all min-w-[90px]",
        "first:rounded-bl-[3px] last:rounded-br-[3px]",
        "border-y border-r first:border-l border-b-[5px]",
        "shadow-[0_6px_8px_-2px_rgba(0,0,0,0.4),0_4px_6px_-2px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.1)]",
        "active:border-b-[2px] active:translate-y-[3px] active:shadow-[0_2px_4px_rgba(0,0,0,0.3),inset_0_2px_4px_rgba(0,0,0,0.4)]",
      )}
      style={
        active && color
          ? {
              background: `linear-gradient(to bottom, ${color}, ${color}cc)`,
              borderColor: `${color}cc`,
              borderBottomColor: color,
              color: "white",
              boxShadow: `0 6px 8px -2px rgba(0,0,0,0.4), 0 4px 6px -2px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.2), inset 0 0 20px rgba(0,0,0,0.3)`,
            }
          : active
            ? {
                background: `linear-gradient(to bottom, hsl(var(--primary)), hsl(var(--primary) / 0.8))`,
                borderColor: `hsl(var(--primary) / 0.8)`,
                borderBottomColor: `hsl(var(--primary))`,
                color: "white",
                boxShadow: `0 6px 8px -2px rgba(0,0,0,0.4), 0 4px 6px -2px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.2), inset 0 0 20px rgba(0,0,0,0.3)`,
              }
            : {
                background: `linear-gradient(to bottom, #404040, #2a2a2a, #1a1a1a)`,
                borderColor: `#0a0a0a`,
                borderBottomColor: `#000`,
                color: `#737373`,
                boxShadow: `0 6px 8px -2px rgba(0,0,0,0.4), 0 4px 6px -2px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.1)`,
              }
      }
    >
      {/* Top highlight for depth */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-[1px]",
          active ? "bg-white/30" : "bg-zinc-600/50",
        )}
      />
      {/* Inner shadow overlay for depth */}
      <div className="absolute inset-0 rounded-b-[2px] bg-gradient-to-b from-white/5 via-transparent to-black/20 pointer-events-none first:rounded-bl-[3px] last:rounded-br-[3px]" />
      <span className="relative z-10">{children}</span>
    </button>
  );
}

export type { TabType };
