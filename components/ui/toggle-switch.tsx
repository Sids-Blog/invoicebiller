import { cn } from "@/lib/utils";
import * as React from "react";

interface ToggleSwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const ToggleSwitch = React.forwardRef<HTMLInputElement, ToggleSwitchProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <label className={cn("group relative inline-flex cursor-pointer items-center gap-3 text-sm font-medium text-foreground", className)}>
        <input type="checkbox" className="peer sr-only" ref={ref} {...props} />
        <div className="peer h-6 w-11 rounded-full bg-slate-300 ring-offset-background transition-all duration-200 
          after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:content-[''] 
          peer-checked:bg-primary peer-checked:after:translate-x-full peer-focus:ring-2 peer-focus:ring-ring peer-focus:ring-offset-2">
        </div>
        {label && <span>{label}</span>}
      </label>
    );
  }
);

ToggleSwitch.displayName = "ToggleSwitch";

export { ToggleSwitch };
