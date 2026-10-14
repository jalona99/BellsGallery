'use client';

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTryonStore } from '@/lib/tryon-store';
import { markAROnboardingSeen } from '@/lib/utils/onboarding';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import {
  Camera,
  Hand,
  Move,
  ZoomIn,
  RotateCw,
  Sparkles,
  Eye,
  Activity,
  ChevronRight,
  Check,
} from 'lucide-react';
import { useState } from 'react';

const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Live AR Try-On!',
    description: 'Experience real-time virtual fashion fitting with advanced pose detection',
    icon: Sparkles,
    color: 'text-purple-500',
    bgGradient: 'from-purple-500/10 to-pink-500/10',
    features: [
      { icon: Camera, text: 'Live camera preview' },
      { icon: Activity, text: 'Real-time pose detection' },
      { icon: Hand, text: 'Gesture-based controls' },
    ],
  },
  {
    id: 'setup',
    title: 'Getting Started',
    description: 'Three simple steps to start your virtual try-on',
    icon: Camera,
    color: 'text-blue-500',
    bgGradient: 'from-blue-500/10 to-cyan-500/10',
    steps: [
      { number: '1', text: 'Allow camera access when prompted', icon: Camera },
      { number: '2', text: 'Select a garment from the panel', icon: Hand },
      { number: '3', text: 'Position yourself in front of the camera', icon: Eye },
    ],
  },
  {
    id: 'controls',
    title: 'Interactive Controls',
    description: 'Master the tools to perfect your try-on experience',
    icon: Move,
    color: 'text-green-500',
    bgGradient: 'from-green-500/10 to-emerald-500/10',
    controls: [
      {
        key: '🖱️ Drag',
        description: 'Click and drag to reposition garment',
        icon: Move,
      },
      {
        key: '⌨️ Arrow Keys',
        description: 'Fine-tune position (hold Shift for 10x)',
        icon: Move,
      },
      {
        key: '🎚️ Scale Slider',
        description: 'Adjust size from 30% to 300%',
        icon: ZoomIn,
      },
      {
        key: '🔄 Rotation',
        description: 'Rotate between -45° and +45°',
        icon: RotateCw,
      },
    ],
  },
  {
    id: 'features',
    title: 'Advanced Features',
    description: 'Unlock the full potential of AR try-on',
    icon: Activity,
    color: 'text-amber-500',
    bgGradient: 'from-amber-500/10 to-orange-500/10',
    features: [
      {
        title: 'Pose Detection',
        description: 'Enable MediaPipe for automatic pose tracking',
        badge: 'AI-Powered',
      },
      {
        title: 'Continuous Tracking',
        description: 'Garment follows your movements in real-time',
        badge: 'Dynamic',
      },
      {
        title: 'Snap to Shoulders',
        description: 'Auto-align garments to your body position',
        badge: 'Smart',
      },
      {
        title: 'Custom Garments',
        description: 'Upload your own PNG images with background removal',
        badge: 'Flexible',
      },
    ],
  },
];

export default function AROnboardingModal() {
  const { arOnboardingOpen, closeAROnboarding } = useTryonStore();
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    markAROnboardingSeen();
    closeAROnboarding();
    setCurrentStep(0); // Reset for next time
  };

  const handleSkip = () => {
    markAROnboardingSeen();
    closeAROnboarding();
    setCurrentStep(0);
  };

  const step = ONBOARDING_STEPS[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <Dialog open={arOnboardingOpen} onOpenChange={closeAROnboarding}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto bg-neutral-900/95 border border-white/10 text-white rounded-2xl shadow-2xl backdrop-blur-xl" aria-describedby="onboarding-description">
        <VisuallyHidden>
          <DialogTitle>AR Try-On Onboarding</DialogTitle>
          <DialogDescription id="onboarding-description">
            Pelajari cara menggunakan fitur AR Try-On interaktif ini.
          </DialogDescription>
        </VisuallyHidden>

        {/* Progress Indicator */}
        <div className="flex gap-2 mb-6">
          {ONBOARDING_STEPS.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                index <= currentStep
                  ? 'bg-purple-500 shadow-sm shadow-purple-500/50'
                  : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className={`rounded-2xl border border-white/10 bg-gradient-to-br ${step.bgGradient} p-6 mb-6 backdrop-blur-md`}>
          <div className="flex items-start gap-4 mb-4">
            <div className="h-12 w-12 rounded-xl bg-white/10 border border-white/10 backdrop-blur flex items-center justify-center flex-shrink-0">
              <Icon className={`h-6 w-6 ${step.color}`} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold mb-1 text-white">{step.title}</h2>
              <p className="text-sm text-neutral-300">{step.description}</p>
            </div>
          </div>

          {/* Step-specific content */}
          {step.id === 'welcome' && step.features && (
            <div className="grid grid-cols-3 gap-3 mt-6">
              {step.features.map((feature, index) => {
                if ('icon' in feature && 'text' in feature) {
                  const FeatureIcon = feature.icon;
                  return (
                    <div
                      key={index}
                      className="bg-black/40 border border-white/10 backdrop-blur rounded-xl p-4 text-center"
                    >
                      <FeatureIcon className="h-6 w-6 mx-auto mb-2 text-purple-400" />
                      <p className="text-xs font-medium text-neutral-200">{feature.text}</p>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}

          {step.id === 'setup' && step.steps && (
            <div className="space-y-3 mt-6">
              {step.steps.map((item, index) => {
                const StepIcon = item.icon;
                return (
                  <div
                    key={index}
                    className="bg-black/40 border border-white/10 backdrop-blur rounded-xl p-3.5 flex items-center gap-4"
                  >
                    <div className="h-9 w-9 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {item.number}
                    </div>
                    <div className="flex-1 flex items-center gap-3">
                      <StepIcon className="h-5 w-5 text-purple-400 flex-shrink-0" />
                      <p className="text-sm font-medium text-neutral-200">{item.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {step.id === 'controls' && step.controls && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
              {step.controls.map((control, index) => {
                const ControlIcon = control.icon;
                return (
                  <div
                    key={index}
                    className="bg-black/40 border border-white/10 backdrop-blur rounded-xl p-3.5"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <ControlIcon className="h-4 w-4 text-purple-400" />
                      <span className="font-bold text-sm text-white">{control.key}</span>
                    </div>
                    <p className="text-xs text-neutral-300">{control.description}</p>
                  </div>
                );
              })}
            </div>
          )}

          {step.id === 'features' && step.features && (
            <div className="space-y-3 mt-6">
              {step.features.map((feature, index) => {
                if ('title' in feature && 'description' in feature && 'badge' in feature) {
                  return (
                    <div
                      key={index}
                      className="bg-black/40 border border-white/10 backdrop-blur rounded-xl p-3.5"
                    >
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <h3 className="font-semibold text-sm text-white">{feature.title}</h3>
                        <Badge variant="secondary" className="text-[10px] bg-white/10 text-neutral-200 border border-white/10 flex-shrink-0">
                          {feature.badge}
                        </Badge>
                      </div>
                      <p className="text-xs text-neutral-300">{feature.description}</p>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-neutral-400 hover:text-white hover:bg-white/10 text-xs"
          >
            Lewati Panduan
          </Button>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handlePrevious} className="border-white/10 bg-white/5 hover:bg-white/10 text-neutral-200 text-xs">
                Sebelumnya
              </Button>
            )}
            <Button onClick={handleNext} className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-purple-900/30">
              {isLastStep ? (
                <>
                  <Check className="h-4 w-4" />
                  Mulai AR
                </>
              ) : (
                <>
                  Lanjut
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Step counter */}
        <div className="text-center text-xs text-neutral-500 mt-2">
          Langkah {currentStep + 1} dari {ONBOARDING_STEPS.length}
        </div>
      </DialogContent>
    </Dialog>
  );
}
