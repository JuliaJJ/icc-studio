export const PRODUCT_STATUS = {
  idea:        { label: 'Idea',          bg: '#F1EFE8', color: '#444441' },
  in_progress: { label: 'In Progress',   bg: '#E6F1FB', color: '#0C447C' },
  ready:       { label: 'Ready',         bg: '#FAEEDA', color: '#633806' },
  live:        { label: 'Live',          bg: '#EAF3DE', color: '#27500A' },
  paused:      { label: 'Paused',        bg: '#FCEBEB', color: '#791F1F' },
}

export const PIPELINE_COLUMNS = [
  { status: 'idea',        label: 'Idea',          bg: '#F1EFE8', color: '#444441' },
  { status: 'in_progress', label: 'In Progress',   bg: '#E6F1FB', color: '#0C447C' },
  { status: 'ready',       label: 'Ready to List', bg: '#FAEEDA', color: '#633806' },
  { status: 'live',        label: 'Live',          bg: '#EAF3DE', color: '#27500A' },
  { status: 'paused',      label: 'Paused',        bg: '#FCEBEB', color: '#791F1F' },
]

export const TYPE_EMOJI = {
  'Apparel':     '👕',
  'Wall art':    '🖼️',
  'Journal':     '📔',
  'Prompt pack': '✨',
  'Sticker':     '🏷️',
  'Digital':     '💾',
}

export function productEmoji(type) {
  return TYPE_EMOJI[type] ?? '📦'
}

export const PRODUCT_TIERS = [
  { value: 'free',       label: 'Free',       hint: '$0' },
  { value: 'impulse',    label: 'Impulse',    hint: '$3–7' },
  { value: 'core',       label: 'Core',       hint: '$9–17' },
  { value: 'collection', label: 'Collection', hint: '$19–34' },
  { value: 'vault',      label: 'Vault',      hint: '$37–67' },
  { value: 'pod',        label: 'POD',        hint: '$18–85+' },
  { value: 'bundle',     label: 'Bundle',     hint: '$22–67' },
]

export const FULFILLMENT_OPTIONS = [
  'Digital', 'Inventory', 'Printify', 'Printful', 'Gelato', 'Prodigi', 'Podbase',
]

export const NICHES = [
  'Wall Art',
  'Desk/Workspace Art',
  'Phone Wallpapers',
  'Greeting Cards',
  'Stationery',
  'Postcards',
  'Wearables',
  'Home Textiles',
  'Accessories',
]

export const PLATFORMS = ['Etsy', 'Printify', 'KDP', 'Gumroad', 'Stan Store', 'Kittl']

export const EVENT_TYPES = {
  holiday:  { label: 'Holiday',  bg: '#EDE9FB', color: '#4C2F9E' },
  launch:   { label: 'Launch',   bg: '#EAF3DE', color: '#27500A' },
  campaign: { label: 'Campaign', bg: '#E6F1FB', color: '#0C447C' },
  other:    { label: 'Other',    bg: '#F1EFE8', color: '#444441' },
}
