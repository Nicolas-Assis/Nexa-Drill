import { LucideIcon } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";

export type StatCardItem = {
  title: string;
  value: string;
  icon: LucideIcon;
  iconColor: string;
  href: string;
  comparison: { percentage: number; label: string } | null;
};

interface StatsCardsProps {
  cards: StatCardItem[];
}

export function StatsCards({ cards }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <KpiCard
          key={card.title}
          title={card.title}
          value={card.value}
          icon={card.icon}
          iconClassName={card.iconColor}
          href={card.href}
          delta={
            card.comparison
              ? { value: card.comparison.percentage, label: card.comparison.label }
              : null
          }
        />
      ))}
    </div>
  );
}
