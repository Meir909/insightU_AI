import { CheckCircle2, CircleDashed } from "lucide-react";
import type { ServiceState } from "@/lib/service-status";

export function ServiceStatusPanel({ services }: { services: ServiceState[] }) {
  return (
    <div className="rounded-[28px] border border-white/6 bg-bg-surface p-5">
      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">
          Integrations
        </p>
        <h3 className="mt-1 text-xl font-black tracking-tight text-white">Сервисы проекта</h3>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {services.map((service) => (
          <div key={service.key} className="rounded-2xl border border-white/6 bg-bg-elevated p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">{service.label}</p>
              {service.configured ? (
                <CheckCircle2 className="h-4 w-4 text-brand-green" />
              ) : (
                <CircleDashed className="h-4 w-4 text-status-mid" />
              )}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-text-secondary">{service.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
