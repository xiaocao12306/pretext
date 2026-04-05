export type JustificationProbePresetKey =
  | 'default-364'
  | 'narrow-260'
  | 'probe-364'
  | 'wide-520'

export type JustificationProbePreset = {
  key: JustificationProbePresetKey
  label: string
  width: number
  showIndicators: boolean
}

export const JUSTIFICATION_PROBE_PRESETS: JustificationProbePreset[] = [
  { key: 'default-364', label: 'Default 364', width: 364, showIndicators: true },
  { key: 'narrow-260', label: 'Narrow 260', width: 260, showIndicators: true },
  { key: 'probe-364', label: 'Probe 364', width: 364, showIndicators: false },
  { key: 'wide-520', label: 'Wide 520', width: 520, showIndicators: false },
]

export type EmojiProbePresetKey =
  | 'default'
  | 'tight'
  | 'coarse'
  | 'dense'

export type EmojiProbePreset = {
  key: EmojiProbePresetKey
  label: string
  sizes: number[]
  threshold: number
}

export const EMOJI_PROBE_PRESETS: EmojiProbePreset[] = [
  { key: 'default', label: 'Default', sizes: [10, 12, 14, 15, 16, 18, 20, 22, 24, 28, 32], threshold: 0.5 },
  { key: 'tight', label: 'Tight 0.5', sizes: [12, 16, 24, 32], threshold: 0.5 },
  { key: 'coarse', label: 'Coarse 1.0', sizes: [10, 14, 18, 24, 32], threshold: 1 },
  { key: 'dense', label: 'Dense 0.25', sizes: [10, 12, 14, 16, 18, 20, 24], threshold: 0.25 },
]

export function findJustificationProbePreset(key: string): JustificationProbePreset | null {
  return JUSTIFICATION_PROBE_PRESETS.find(preset => preset.key === key) ?? null
}

export function findEmojiProbePreset(key: string): EmojiProbePreset | null {
  return EMOJI_PROBE_PRESETS.find(preset => preset.key === key) ?? null
}
