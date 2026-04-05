"use client";

import { useCallback, useRef, useState } from "react";
import { BarChart3, FileText, ShieldCheck, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "overview" | "scores" | "committee" | "profile";

const tabs: { key: Tab; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }[] = [
  { key: "overview", label: "Обзор", icon: BarChart3 },
  { key: "scores", label: "Оценки", icon: ShieldCheck },
  { key: "committee", label: "Комиссия", icon: User },
  { key: "profile", label: "Профиль", icon: FileText },
];

export function CandidateTabs({ children }: { children: (tab: Tab) => React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, idx: number) => {
    let next = idx;
    if (e.key === "ArrowRight") next = (idx + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;

    e.preventDefault();
    setActiveTab(tabs[next].key);
    tabRefs.current[next]?.focus();
  }, []);

  return (
    <>
      <div className="sticky top-0 z-20 -mx-4 bg-bg-base/95 px-4 py-3 backdrop-blur-sm xl:hidden">
        <div
          role="tablist"
          aria-label="Разделы профиля кандидата"
          className="tab-bar"
        >
          {tabs.map(({ key, label, icon: Icon }, idx) => (
            <button
              key={key}
              ref={(el) => {
                tabRefs.current[idx] = el;
              }}
              role="tab"
              id={`tab-${key}`}
              aria-selected={activeTab === key}
              aria-controls={`tabpanel-${key}`}
              tabIndex={activeTab === key ? 0 : -1}
              type="button"
              className={cn("tab-bar-item", activeTab === key && "active")}
              onClick={() => setActiveTab(key)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {children(activeTab)}
      </div>
    </>
  );
}
