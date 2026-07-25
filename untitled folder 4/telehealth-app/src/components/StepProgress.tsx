interface StepProgressProps {
  steps: string[];
  currentStep: number;
}

export default function StepProgress({ steps, currentStep }: StepProgressProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isComplete = stepNumber < currentStep;

          return (
            <div key={step} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition ${
                    isComplete
                      ? "bg-teal-600 text-white"
                      : isActive
                        ? "bg-teal-600 text-white ring-4 ring-teal-100"
                        : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {isComplete ? "✓" : stepNumber}
                </div>
                <span
                  className={`mt-2 hidden text-center text-xs sm:block ${
                    isActive ? "font-semibold text-teal-700" : "text-slate-500"
                  }`}
                >
                  {step}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`mx-2 h-0.5 flex-1 ${
                    isComplete ? "bg-teal-600" : "bg-slate-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
