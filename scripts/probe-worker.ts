import { createHmac } from "crypto"
const SECRET = "planbeta_meet_recording_cron_2024_secure"
const body = JSON.stringify({ importId: "probe-non-existent" })
const sig = createHmac("sha256", SECRET).update(body).digest("hex")

async function main() {
  for (const host of ["https://dayzero.xyz", "https://theplanbeta.com"]) {
    const start = Date.now()
    try {
      const res = await fetch(`${host}/api/jobs-app/profile/cv-upload/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Worker-Signature": sig },
        body,
      })
      const text = await res.text()
      console.log(`${host} -> ${res.status} in ${Date.now() - start}ms`)
      console.log(`  body: ${text.slice(0, 200)}`)
    } catch (e) {
      console.log(`${host} -> FETCH ERROR in ${Date.now() - start}ms: ${(e as Error).message}`)
    }
  }
}
main()
