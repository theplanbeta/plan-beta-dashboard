import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { geocodeCity } from "@/lib/german-cities"

export const dynamic = "force-dynamic"

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
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: coords },
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
      if (job.latitude != null && job.longitude != null) {
        coords = [job.longitude, job.latitude]
      } else {
        coords = geocodeCity(job.location || job.cityName)
      }

      if (coords) {
        mapped++
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: coords },
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
