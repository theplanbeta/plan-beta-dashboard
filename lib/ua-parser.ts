// Lightweight User-Agent parser — no external dependencies

export interface ParsedUA {
  deviceType: string
  browser: string
  os: string
}

export function parseUserAgent(ua: string): ParsedUA {
  const lower = ua.toLowerCase()

  // Device type
  let deviceType = "desktop"
  if (/ipad|tablet|kindle|silk|playbook/i.test(ua)) {
    deviceType = "tablet"
  } else if (/mobile|iphone|ipod|android.*mobile|windows phone|opera mini|opera mobi/i.test(ua)) {
    deviceType = "mobile"
  }

  // Browser (order matters — check specific before generic)
  let browser = "Other"
  if (/edg(e|a|ios)?\/\d/i.test(ua)) browser = "Edge"
  else if (/opr\/|opera/i.test(ua)) browser = "Opera"
  else if (/samsungbrowser/i.test(ua)) browser = "Samsung"
  else if (/ucbrowser/i.test(ua)) browser = "UC Browser"
  else if (/firefox|fxios/i.test(ua)) browser = "Firefox"
  else if (/crios|chrome(?!.*edg)/i.test(ua)) browser = "Chrome"
  else if (/safari(?!.*chrom)/i.test(ua)) browser = "Safari"
  else if (lower.includes("bot") || lower.includes("crawl") || lower.includes("spider")) browser = "Bot"

  // Operating system
  let os = "Other"
  if (/android/i.test(ua)) os = "Android"
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS"
  else if (/windows/i.test(ua)) os = "Windows"
  else if (/macintosh|mac os/i.test(ua)) os = "macOS"
  else if (/linux/i.test(ua)) os = "Linux"
  else if (/cros/i.test(ua)) os = "ChromeOS"

  return { deviceType, browser, os }
}
