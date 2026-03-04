import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { geocodeCity } from "@/lib/german-cities"

export const dynamic = "force-dynamic"

/**
 * Deterministic jitter from a string ID.
 * Spreads jobs within ~0.015° (~1.5 km) of the city center
 * so they don't stack on a single pixel when zoomed in.
 */
function jitter(id: string): [number, number] {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h + id.charCodeAt(i)) | 0
  }
  // Two independent offsets from different bit ranges
  const lonOff = ((h & 0xffff) / 0xffff - 0.5) * 0.03
  const latOff = (((h >>> 16) & 0xffff) / 0xffff - 0.5) * 0.03
  return [lonOff, latOff]
}

export async function GET() {
  try {
    const [jobPostings, communityJobs] = await Promise.all([
      prisma.jobPosting.findMany({
        where: { active: true },
        select: {
          id: true,
          title: true,
          company: true,
          location: true,
          germanLevel: true,
          profession: true,
          jobType: true,
          applyUrl: true,
          source: { select: { name: true } },
        },
      }),
      prisma.communityJob.findMany({
        where: { status: "approved" },
        select: {
          id: true,
          title: true,
          company: true,
          location: true,
          cityName: true,
          germanLevel: true,
          jobType: true,
          latitude: true,
          longitude: true,
          imageUrl: true,
        },
      }),
    ])

    let mapped = 0
    let unmapped = 0

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const features: any[] = []

    // Process scraped job postings
    for (const job of jobPostings) {
      const coords = geocodeCity(job.location)
      if (coords) {
        mapped++
        const [dLon, dLat] = jitter(job.id)
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [coords[0] + dLon, coords[1] + dLat] },
          properties: {
            id: job.id,
            title: job.title,
            company: job.company,
            location: job.location,
            germanLevel: job.germanLevel,
            profession: job.profession,
            jobType: job.jobType,
            applyUrl: job.applyUrl,
            source: "scraped",
          },
        })
      } else {
        unmapped++
      }
    }

    // Process community jobs
    for (const job of communityJobs) {
      // Prefer stored lat/lon, fall back to city lookup
      let coords: [number, number] | null = null
      let hasRealGps = false
      if (job.latitude != null && job.longitude != null) {
        coords = [job.longitude, job.latitude]
        hasRealGps = true
      } else {
        coords = geocodeCity(job.location || job.cityName)
      }

      if (coords) {
        mapped++
        // Only jitter city-lookup coords, not real GPS
        const [dLon, dLat] = hasRealGps ? [0, 0] : jitter(job.id)
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [coords[0] + dLon, coords[1] + dLat] },
          properties: {
            id: job.id,
            title: job.title || "Community Job",
            company: job.company || "Community Spotted",
            location: job.location || job.cityName,
            germanLevel: job.germanLevel,
            profession: null,
            jobType: job.jobType,
            applyUrl: null,
            imageUrl: job.imageUrl,
            source: "community",
          },
        })
      } else {
        unmapped++
      }
    }

    const geojson = {
      type: "FeatureCollection",
      features,
      stats: {
        total: jobPostings.length + communityJobs.length,
        mapped,
        unmapped,
      },
    }

    return NextResponse.json(geojson, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    })
  } catch (error) {
    console.error("Failed to fetch map data:", error)
    return NextResponse.json(
      { error: "Failed to load map data" },
      { status: 500 }
    )
  }
}
