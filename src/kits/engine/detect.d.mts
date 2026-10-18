export type KitId = 'material' | 'antd' | 'mantine' | 'radix' | 'bootstrap' | 'daisyui' | 'shadcn' | 'openprops' | 'tailwind'
export function detectKit(doc?: Document): KitId | null
