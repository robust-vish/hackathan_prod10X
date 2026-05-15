import { CheckCircle, Circle, Loader } from 'lucide-react'
import type { LoadingStep } from '../types'

interface Props {
  steps: LoadingStep[]
}

export default function LoadingSteps({ steps }: Props) {
  return (
    <div className="card mt-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
        Processing...
      </h3>
      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            {step.done ? (
              <CheckCircle size={20} className="text-green-500 shrink-0" />
            ) : step.active ? (
              <Loader size={20} className="text-blue-500 shrink-0 animate-spin" />
            ) : (
              <Circle size={20} className="text-gray-300 shrink-0" />
            )}
            <span
              className={`text-sm ${
                step.done
                  ? 'text-green-700 font-medium'
                  : step.active
                  ? 'text-blue-700 font-semibold'
                  : 'text-gray-400'
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
