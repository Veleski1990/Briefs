export const CLIENTS = [
  'MAMA MANOUSH',
  'ROWANOS',
  'CLEAN EATS',
  'MONTERA SURVEYORS',
  'MONTERA REAL ESTATE',
  'BIRDIES & BLUFFS',
  'CASAS ACTIVEWEAR',
  'FULFILMENT AUS',
  'YTSS',
  'FLO BUYERS AGENTS',
  "EDDIE'S INN",
  'THE REALEST ESTATE',
  'CRYO REMEDY',
  'SITE LOCK SECURITY',
] as const

export const PLATFORMS = ['INSTAGRAM', 'TIKTOK', 'LINKEDLN', 'YOUTUBE'] as const

export const VIDEO_FORMATS = [
  'REEL',
  'VSL',
  'SHORT-FORM',
  'CAROUSEL',
  'STATIC',
  'STORY',
] as const

export const FUNNEL_STAGES = ['TOF', 'MOF', 'BOF'] as const

export const FUNNEL_STAGE_DESCRIPTIONS: Record<string, string> = {
  TOF: 'Top of Funnel — awareness content. Hook-driven, broad appeal, no hard sell. Focus on entertainment, relatability, or education.',
  MOF: 'Middle of Funnel — social proof & testimonials. Speak to people who know the brand. Build trust with real results, reviews, and behind-the-scenes.',
  BOF: 'Bottom of Funnel — conversion content. Speak to warm audiences. Drive action: booking, purchase, DM. Include social proof, offers, CTAs.',
}

export const TEAM_MEMBERS = ['Olivia', 'Vanessa', 'Steven', 'Other'] as const

// ClickUp pipeline list IDs
export const PIPELINE_LIST_IDS: Record<string, string> = {
  'ORGANIC RETAINER': '901614165179',
  'PAID ADS RETAINER': '901614166188',
  'UGC PIPELINE': '901614166190',
  'PROPERTY VIDEO': '901614166192',
}

export const PIPELINES = ['ORGANIC RETAINER', 'PAID ADS RETAINER', 'UGC PIPELINE', 'PROPERTY VIDEO'] as const

export const PIPELINE_DESCRIPTIONS: Record<string, string> = {
  'ORGANIC RETAINER': 'Organic social content — Reels, Carousels, Stories for ongoing retainer clients.',
  'PAID ADS RETAINER': 'Paid advertising content — VSLs, ad creatives, and performance-focused edits.',
  'UGC PIPELINE': 'User-generated content — raw, authentic creator-style videos for brands.',
  'PROPERTY VIDEO': 'Property walkthrough and real estate video content.',
}

// Keep for backwards compat
export const CLICKUP_LIST_ID = '901614165179'

// Custom field IDs (from GET /api/v2/list/901614165179/field)
export const CLICKUP_FIELD_IDS = {
  CLIENT: '159e3fae-d4d9-4cd1-a630-886963a48ebf',
  PLATFORM: '582b438a-f113-488f-918f-da54ebc357e2',
  TYPE: '8046a242-b753-4a97-b32d-603eafbcbf87',
  FUNNEL_STAGE: '', // TODO: create this field in ClickUp, then paste ID here
  EDITOR_BRIEF: '',  // TODO: create this field in ClickUp, then paste ID here
}

// Dropdown option IDs for CLIENT field
export const CLIENT_OPTION_IDS: Record<string, string> = {
  'MAMA MANOUSH': 'cce35715-3d6d-4249-a079-652a401d9e47',
  'ROWANOS': '84bdd3aa-03bf-4764-8acc-54b122a64bbd',
  'CLEAN EATS': '3d0f3f32-6c84-429a-bda1-77093d6987fd',
  'MONTERA SURVEYORS': 'c859170d-4ff4-4567-9d20-c000c0483a7c',
  'MONTERA REAL ESTATE': 'b4b8a4ea-6f82-4d6a-ac48-90e289db3988',
  'BIRDIES & BLUFFS': '69770223-2f78-457a-bf8c-89649f86d261',
  'CASAS ACTIVEWEAR': '111a60c7-e449-44e3-a2be-864857648907',
  'FULFILMENT AUS': '0d744e99-54de-47ef-9acc-6be7f54420db',
  'YTSS': '9c1b2b73-3703-4cc7-9bbc-740291f2df6b',
}

// Dropdown option IDs for PLATFORM field
// Note: ClickUp has a typo — "LINKEDLN" — mapped from our "LINKEDIN"
export const PLATFORM_OPTION_IDS: Record<string, string> = {
  'INSTAGRAM': '20096dcc-b934-4865-919c-82e327500af3',
  'TIKTOK': 'aaed5d66-a3a7-47df-a79f-f3e65b956ea8',
  'LINKEDLN': '078fa8b1-9cfe-4771-8250-41fbe22e9e24',
}

// Dropdown option IDs for TYPE field
// Note: VSL and SHORT-FORM don't exist yet — add them in ClickUp first,
// then run GET /api/clickup-fields again and add the new IDs here.
export const TYPE_OPTION_IDS: Record<string, string> = {
  'REEL': 'a38eab10-8065-402c-a41c-321246e1b10b',
  'CAROUSEL': 'fd7a2d9b-ccfd-42dc-a2fc-a427bbba0822',
  'STATIC': '1e5755eb-3052-4636-965d-9b36c6a9e065',
  'STORY': '41e1ed7d-af02-40ad-85b5-73c06f796751',
  'VSL': '',       // TODO: add VSL option in ClickUp TYPE field
  'SHORT-FORM': '', // TODO: add SHORT-FORM option in ClickUp TYPE field
}
