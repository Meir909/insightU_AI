"use client";

import { useState } from "react";
import { BarChart3, FileText, ShieldCheck, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "overview" | "scores" | "committee" | "profile";

const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Обзор", icon: BarChart3 },
  { key: "scores", label: "Оценки", icon: ShieldCheck },
  { key: "committee", label: "Комиссия", icon: User },
  { key: "profile", label: "Профиль", icon: FileText },
];

export function CandidateTabs({ children }: { children: (tab: Tab) => React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  return (
    <>
      {/* Mobile tab bar — hidden on xl */}
      <div className="sticky top-0 z-20 -mx-4 bg-bg-base/95 px-4 py-3 backdrop-blur-sm xl:hidden">
        <div className="tab-bar">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              className={cn("tab-bar-item", activeTab === key && "active")}
              onClick={() => setActiveTab(key)}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {children(activeTab)}
    </>
  );
}
