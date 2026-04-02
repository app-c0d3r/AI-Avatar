import * as React from "react"
import { cn } from "@/lib/utils"

const Slider = React.forwardRef(({ className, label, min = 0, max = 100, step = 1, defaultValue = 50, value, onValueChange }, ref) => {
  const [internal, setInternal] = React.useState(defaultValue)
  const controlled = value !== undefined
  const current = controlled ? value : internal

  const handleChange = (e) => {
    const next = Number(e.target.value)
    if (!controlled) setInternal(next)
    onValueChange?.(next)
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <div className="flex justify-between text-sm">
          <span className="font-medium text-foreground">{label}</span>
          <span className="text-muted-foreground tabular-nums">{current}</span>
        </div>
      )}
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={step}
        value={current}
        onChange={handleChange}
        className="w-full h-1.5 rounded-full appearance-none bg-muted cursor-pointer accent-primary"
      />
    </div>
  )
})
Slider.displayName = "Slider"

export { Slider }
