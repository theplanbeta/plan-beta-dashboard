// ISO 3166-1 alpha-2 country codes → display name + flag emoji
// Focused on countries relevant to Plan Beta's audience

export const COUNTRIES: Record<string, { name: string; flag: string }> = {
  IN: { name: "India", flag: "\u{1F1EE}\u{1F1F3}" },
  DE: { name: "Germany", flag: "\u{1F1E9}\u{1F1EA}" },
  AT: { name: "Austria", flag: "\u{1F1E6}\u{1F1F9}" },
  CH: { name: "Switzerland", flag: "\u{1F1E8}\u{1F1ED}" },
  AE: { name: "UAE", flag: "\u{1F1E6}\u{1F1EA}" },
  US: { name: "United States", flag: "\u{1F1FA}\u{1F1F8}" },
  GB: { name: "United Kingdom", flag: "\u{1F1EC}\u{1F1E7}" },
  CA: { name: "Canada", flag: "\u{1F1E8}\u{1F1E6}" },
  AU: { name: "Australia", flag: "\u{1F1E6}\u{1F1FA}" },
  SA: { name: "Saudi Arabia", flag: "\u{1F1F8}\u{1F1E6}" },
  QA: { name: "Qatar", flag: "\u{1F1F6}\u{1F1E6}" },
  KW: { name: "Kuwait", flag: "\u{1F1F0}\u{1F1FC}" },
  OM: { name: "Oman", flag: "\u{1F1F4}\u{1F1F2}" },
  BH: { name: "Bahrain", flag: "\u{1F1E7}\u{1F1ED}" },
  SG: { name: "Singapore", flag: "\u{1F1F8}\u{1F1EC}" },
  MY: { name: "Malaysia", flag: "\u{1F1F2}\u{1F1FE}" },
  NL: { name: "Netherlands", flag: "\u{1F1F3}\u{1F1F1}" },
  FR: { name: "France", flag: "\u{1F1EB}\u{1F1F7}" },
  IT: { name: "Italy", flag: "\u{1F1EE}\u{1F1F9}" },
  ES: { name: "Spain", flag: "\u{1F1EA}\u{1F1F8}" },
  SE: { name: "Sweden", flag: "\u{1F1F8}\u{1F1EA}" },
  NO: { name: "Norway", flag: "\u{1F1F3}\u{1F1F4}" },
  DK: { name: "Denmark", flag: "\u{1F1E9}\u{1F1F0}" },
  FI: { name: "Finland", flag: "\u{1F1EB}\u{1F1EE}" },
  PL: { name: "Poland", flag: "\u{1F1F5}\u{1F1F1}" },
  NP: { name: "Nepal", flag: "\u{1F1F3}\u{1F1F5}" },
  LK: { name: "Sri Lanka", flag: "\u{1F1F1}\u{1F1F0}" },
  BD: { name: "Bangladesh", flag: "\u{1F1E7}\u{1F1E9}" },
  PK: { name: "Pakistan", flag: "\u{1F1F5}\u{1F1F0}" },
  PH: { name: "Philippines", flag: "\u{1F1F5}\u{1F1ED}" },
}

export function getCountryName(code: string): string {
  return COUNTRIES[code]?.name || code
}

export function getCountryFlag(code: string): string {
  return COUNTRIES[code]?.flag || ""
}

export function getCountryDisplay(code: string): string {
  const country = COUNTRIES[code]
  if (!country) return code
  return `${country.flag} ${country.name}`
}
