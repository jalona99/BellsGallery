'use client';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info, Lock, HelpCircle } from 'lucide-react';
import type { ClothType } from '@/lib/types';
import type { PreselectState } from '@/lib/store/useVtonStore';

interface ClothTypeSelectorProps {
  value: ClothType;
  onChange: (value: ClothType) => void;
  availableTypes: ClothType[];
  disabledTypes: { type: ClothType; reason: string }[];
  preselectState: PreselectState;
  detectedLabel?: string;
  confidence?: number;
}

export default function ClothTypeSelector({
  value,
  onChange,
  disabledTypes,
  preselectState,
  detectedLabel,
  confidence,
}: ClothTypeSelectorProps) {
  const allTypes: ClothType[] = ['upper', 'lower', 'overall'];

  const isDisabled = (type: ClothType) => {
    return disabledTypes.some((d) => d.type === type);
  };

  const getDisabledReason = (type: ClothType) => {
    return disabledTypes.find((d) => d.type === type)?.reason;
  };

  const isPreselected = (type: ClothType) => {
    return value === type && (preselectState === 'LOCKED' || preselectState === 'SUGGESTED');
  };

  const getPreselectBadge = () => {
    if (!detectedLabel || !confidence) return null;

    const confidencePercent = (confidence * 100).toFixed(0);

    if (preselectState === 'LOCKED') {
      return (
        <div className="flex items-center gap-2 text-xs">
          <Lock className="h-3.5 w-3.5 text-emerald-400" />
          <span className="font-medium text-emerald-300">
            Terdeteksi: {value.charAt(0).toUpperCase() + value.slice(1)}
          </span>
          <Badge variant="default" className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5">
            {detectedLabel} · {confidencePercent}%
          </Badge>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Allow user to change even when locked
                  }}
                  className="h-auto px-1.5 py-0.5 text-xs text-neutral-400 hover:text-white hover:bg-white/10"
                >
                  Ubah
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-neutral-900 text-neutral-200 border-white/10">
                <p className="text-xs">Deteksi dengan tingkat keyakinan tinggi</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      );
    }

    if (preselectState === 'SUGGESTED') {
      return (
        <div className="flex items-center gap-2 text-xs">
          <HelpCircle className="h-3.5 w-3.5 text-amber-400" />
          <span className="font-medium text-amber-300">
            Saran: {value.charAt(0).toUpperCase() + value.slice(1)}
          </span>
          <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-300 bg-amber-500/10 px-2 py-0.5">
            {detectedLabel} · {confidencePercent}%
          </Badge>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                // User confirms suggestion
              }}
              className="h-auto px-2 py-0.5 text-xs text-amber-300 hover:bg-amber-500/20"
            >
              Konfirmasi
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                // User wants to change
              }}
              className="h-auto px-2 py-0.5 text-xs text-neutral-400 hover:text-white hover:bg-white/10"
            >
              Ubah
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  const typeDisplayNames: Record<ClothType, { id: string; en: string }> = {
    upper: { id: 'Atasan (Baju / Kemeja / Kaos)', en: 'Upper Garment' },
    lower: { id: 'Bawahan (Celana / Rok)', en: 'Lower Garment' },
    overall: { id: 'Terusan (Gaun / Overall)', en: 'Overall / Dress' },
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold text-neutral-200">Jenis Pakaian (Garment Type)</Label>
        {getPreselectBadge()}
      </div>

      {preselectState === 'UNKNOWN' && (
        <p className="text-xs text-neutral-400">
          Pilih tipe pakaian di bawah ini untuk melanjutkan.
        </p>
      )}

      <RadioGroup value={value} onValueChange={onChange} className="grid grid-cols-1 gap-2">
        {allTypes.map((type) => {
          const disabled = isDisabled(type);
          const reason = getDisabledReason(type);
          const selected = value === type;
          const preselected = isPreselected(type);

          return (
            <div key={type} className="relative">
              <RadioGroupItem value={type} id={type} disabled={disabled} className="peer sr-only" />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label
                      htmlFor={type}
                      className={`
                        flex items-center justify-between rounded-xl border p-3.5 transition-all
                        ${disabled ? 'cursor-not-allowed opacity-40 border-white/5 bg-white/[0.02]' : 'cursor-pointer hover:bg-white/10 hover:border-white/20'}
                        ${selected ? 'border-purple-500/80 bg-purple-500/10 text-white shadow-sm shadow-purple-500/15' : 'border-white/10 bg-white/5 text-neutral-300'}
                        ${preselected && preselectState === 'LOCKED' ? 'border-emerald-500/70 bg-emerald-500/10' : ''}
                        ${preselected && preselectState === 'SUGGESTED' ? 'border-amber-500/70 bg-amber-500/10' : ''}
                      `}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-white">{typeDisplayNames[type].id}</span>
                        <span className="text-[11px] text-neutral-400">{typeDisplayNames[type].en}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {preselected && preselectState === 'LOCKED' && (
                          <Badge variant="default" className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            Terdeteksi
                          </Badge>
                        )}
                        {preselected && preselectState === 'SUGGESTED' && (
                          <Badge variant="outline" className="text-[11px] border-amber-500/40 text-amber-300 bg-amber-500/10">
                            Disarankan
                          </Badge>
                        )}
                        {disabled && (
                          <Info className="h-4 w-4 text-neutral-500" />
                        )}
                      </div>
                    </Label>
                  </TooltipTrigger>
                  {(disabled && reason) && (
                    <TooltipContent className="bg-neutral-900 text-neutral-200 border-white/10">
                      <p className="text-xs max-w-xs">{reason}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          );
        })}
      </RadioGroup>

      {preselectState === 'UNKNOWN' && detectedLabel && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-white/5 border border-white/10 text-xs">
          <Info className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
          <p className="text-neutral-400">
            Tipe pakaian belum terdeteksi pasti secara otomatis. Silakan pilih kategori pakaian yang sesuai di atas.
          </p>
        </div>
      )}
    </div>
  );
}
