import { BatteryCharging, CarFront, Flame, Lightbulb, Refrigerator, Sun, Thermometer } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AssetId } from './model';

export const ASSET_ICONS: Record<AssetId, LucideIcon> = {
  ev: CarFront,
  solar: Sun,
  battery: BatteryCharging,
  heatPump: Thermometer,
  waterHeater: Flame,
  lighting: Lightbulb,
  appliances: Refrigerator,
};