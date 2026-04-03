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

export const PLATFORMS = ['Etsy', 'Printify', 'KDP', 'Gumroad', 'Stan Store', 'Kittl']

export const LAUNCH_STATUS_OPTIONS = ['planned', 'ready', 'soon', 'live', 'ended']
