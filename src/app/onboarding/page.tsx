import React, { Suspense } from "react";
import { OnboardingFlow } from "@/components/OnboardingFlow";

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[100dvh] w-full items-center justify-center bg-[#050811]" />
      }
    >
      <OnboardingFlow />
    </Suspense>
  );
}
