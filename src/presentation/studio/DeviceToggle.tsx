import { Monitor, Smartphone } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { PreviewDevice } from '@/domain'

export interface DeviceToggleProps {
  value: PreviewDevice
  onChange: (device: PreviewDevice) => void
}

/** Desktop / mobile switcher. Always keeps one option selected. */
export function DeviceToggle({ value, onChange }: DeviceToggleProps) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={value}
      onValueChange={(next) => {
        if (next === 'desktop' || next === 'mobile') onChange(next)
      }}
      aria-label="Preview device"
    >
      <ToggleGroupItem value="desktop" aria-label="Desktop preview">
        <Monitor aria-hidden="true" />
        <span className="hidden sm:inline">Desktop</span>
      </ToggleGroupItem>
      <ToggleGroupItem value="mobile" aria-label="Mobile preview">
        <Smartphone aria-hidden="true" />
        <span className="hidden sm:inline">Mobile</span>
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
