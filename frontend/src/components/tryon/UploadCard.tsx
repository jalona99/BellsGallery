'use client';

import { Card } from '@/components/ui/card';
import { Upload } from 'lucide-react';

interface UploadCardProps {
  title: string;
  subtitle: string;
  onUpload: () => void;
  icon?: React.ReactNode;
}

export default function UploadCard({
  title,
  subtitle,
  onUpload,
  icon,
}: UploadCardProps) {
  return (
    <Card
      className="border border-dashed border-white/20 bg-white/5 cursor-pointer hover:border-purple-500/50 hover:bg-white/[0.07] transition-all active:scale-[0.98] rounded-2xl"
      onClick={onUpload}
    >
      <div className="p-8 sm:p-12 text-center space-y-4">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            {icon || <Upload className="h-8 w-8 text-purple-400" />}
          </div>
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-white text-base">{title}</p>
          <p className="text-xs text-neutral-400">{subtitle}</p>
        </div>
      </div>
    </Card>
  );
}
