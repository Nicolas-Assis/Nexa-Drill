import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Link key={card.title} href={card.href} className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-secondary-500">{card.title}</p>
                  <p className="text-2xl font-bold text-secondary-900 mt-1 truncate">
                    {card.value}
                  </p>
                  {card.comparison && (
                    <p
                      className={cn(
                        "text-xs mt-1 font-medium",
                        card.comparison.percentage >= 0
                          ? "text-success"
                          : "text-danger"
                      )}
                    >
                      {card.comparison.percentage >= 0 ? "+" : ""}
                      {card.comparison.percentage}% {card.comparison.label}
                    </p>
                  )}
                </div>
                <div className={cn("rounded-lg p-3 shrink-0 ml-3", card.iconColor)}>
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
