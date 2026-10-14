'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';

interface QualityTip {
  text: string;
}

interface QualityTipsCardProps {
  title: string;
  tips: QualityTip[] | string[];
  defaultOpen?: boolean;
}

export default function QualityTipsCard({ title, tips, defaultOpen = false }: QualityTipsCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const tipTexts = tips.map((tip) => (typeof tip === 'string' ? tip : tip.text));

  return (
    <Card className="overflow-hidden border border-white/10 hover:border-purple-500/30 bg-white/[0.03] hover:bg-white/[0.05] backdrop-blur-md rounded-2xl transition-all shadow-sm">
      <Button
        type="button"
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 sm:p-3.5 flex items-center justify-between hover:bg-white/5 rounded-none text-neutral-200"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Lightbulb className="h-3.5 w-3.5 text-amber-300" />
          </div>
          <span className="text-xs sm:text-sm font-medium text-neutral-200">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-neutral-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-neutral-400" />
        )}
      </Button>

      {isOpen && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-3.5 pt-0 border-t border-white/5">
          <ul className="space-y-1.5 text-xs text-neutral-300 pt-2.5">
            {tipTexts.map((tip, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-purple-400 mt-0.5 font-bold">•</span>
                <span className="leading-relaxed">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
