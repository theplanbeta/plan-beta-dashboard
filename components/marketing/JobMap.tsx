"use client"

import { useRef, useCallback, useState, useEffect } from "react"
import Map, {
  Source,
  Layer,
  Popup,
  NavigationControl,
  type MapRef,
  type MapLayerMouseEvent,
} from "react-map-gl/maplibre"
import type { GeoJSONSource } from "maplibre-gl"
import type { GeoJsonProperties } from "geojson"

interface MapJob {
  id: string
  title: string
  company: string
  location: string | null
  germanLevel: string | null
  profession: string | null
  jobType: string | null
  applyUrl: string | null
  imageUrl?: string
  source: "scraped" | "community"
}

interface GeoJSONFeature {
  type: "Feature"
  geometry: { type: "Point"; coordinates: [number, number] }
  properties: MapJob
}

interface MapData {
  type: "FeatureCollection"
  features: GeoJSONFeature[]
  stats: { total: number; mapped: number; unmapped: number }
}

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  WORKING_STUDENT: "Working Student",
}

// Germany center
const INITIAL_VIEW = {
  longitude: 10.45,
  latitude: 51.16,
  zoom: 5.5,
}

const PRIMARY_COLOR = "#d2302c"

export default function JobMap({
  onJobHover,
  highlightedJobId,
}: {
  onJobHover?: (jobId: string | null) => void
  highlightedJobId?: string | null
}) {
  const mapRef = useRef<MapRef>(null)
  const [mapData, setMapData] = useState<MapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [popupInfo, setPopupInfo] = useState<{
    longitude: number
    latitude: number
    properties: GeoJsonProperties
  } | null>(null)

  useEffect(() => {
    fetch("/api/jobs/map")
      .then((res) => res.json())
      .then((data) => {
        setMapData(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const onClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0]
      if (!feature) {
        setPopupInfo(null)
        return
      }

      const props = feature.properties
      if (!props) return

      // Cluster click → zoom in
      if (props.cluster) {
        const map = mapRef.current?.getMap()
        if (!map) return
        const source = map.getSource("jobs") as GeoJSONSource
        source.getClusterExpansionZoom(props.cluster_id).then((zoom) => {
          const geometry = feature.geometry as GeoJSON.Point
          map.easeTo({
            center: geometry.coordinates as [number, number],
            zoom: zoom + 1,
          })
        })
        return
      }

      // Individual pin click → popup
      const geometry = feature.geometry as GeoJSON.Point
      setPopupInfo({
        longitude: geometry.coordinates[0],
        latitude: geometry.coordinates[1],
        properties: props,
      })
    },
    []
  )

  const onMouseEnter = useCallback(
    (event: MapLayerMouseEvent) => {
      const map = mapRef.current?.getMap()
      if (map) map.getCanvas().style.cursor = "pointer"

      const feature = event.features?.[0]
      if (feature?.properties && !feature.properties.cluster && onJobHover) {
        onJobHover(feature.properties.id)
      }
    },
    [onJobHover]
  )

  const onMouseLeave = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (map) map.getCanvas().style.cursor = ""
    onJobHover?.(null)
  }, [onJobHover])

  // Highlight effect for hovered job from list
  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map || !map.isStyleLoaded()) return

    if (highlightedJobId) {
      map.setFilter("unclustered-point-highlight", [
        "==",
        ["get", "id"],
        highlightedJobId,
      ])
    } else {
      map.setFilter("unclustered-point-highlight", ["==", ["get", "id"], ""])
    }
  }, [highlightedJobId])

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-white/[0.06]" style={{ height: "100%" }}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0a0a0a]">
          <div className="flex items-center gap-3 text-gray-400">
            <svg
              className="animate-spin w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading map...
          </div>
        </div>
      )}

      <Map
        ref={mapRef}
        initialViewState={INITIAL_VIEW}
        style={{ width: "100%", height: "100%" }}
        mapStyle="https://tiles.openfreemap.org/styles/dark"
        interactiveLayerIds={[
          "clusters",
          "unclustered-point",
        ]}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {mapData && (
          <Source
            id="jobs"
            type="geojson"
            data={mapData}
            cluster={true}
            clusterMaxZoom={14}
            clusterRadius={50}
          >
            {/* Cluster circles */}
            <Layer
              id="clusters"
              type="circle"
              filter={["has", "point_count"]}
              paint={{
                "circle-color": [
                  "step",
                  ["get", "point_count"],
                  PRIMARY_COLOR,
                  10,
                  "#b82824",
                  30,
                  "#961f1c",
                ],
                "circle-radius": [
                  "step",
                  ["get", "point_count"],
                  18,
                  10,
                  24,
                  30,
                  32,
                ],
                "circle-stroke-width": 2,
                "circle-stroke-color": "rgba(255,255,255,0.15)",
              }}
            />

            {/* Cluster count labels */}
            <Layer
              id="cluster-count"
              type="symbol"
              filter={["has", "point_count"]}
              layout={{
                "text-field": "{point_count_abbreviated}",
                "text-size": 13,
                "text-font": ["Noto Sans Bold"],
              }}
              paint={{
                "text-color": "#ffffff",
              }}
            />

            {/* Individual job pins */}
            <Layer
              id="unclustered-point"
              type="circle"
              filter={["!", ["has", "point_count"]]}
              paint={{
                "circle-color": [
                  "case",
                  ["==", ["get", "source"], "community"],
                  "#10b981",
                  PRIMARY_COLOR,
                ],
                "circle-radius": 7,
                "circle-stroke-width": 2,
                "circle-stroke-color": "rgba(255,255,255,0.3)",
              }}
            />

            {/* Highlight ring for hovered job */}
            <Layer
              id="unclustered-point-highlight"
              type="circle"
              filter={["==", ["get", "id"], ""]}
              paint={{
                "circle-color": "transparent",
                "circle-radius": 14,
                "circle-stroke-width": 3,
                "circle-stroke-color": "#ffffff",
              }}
            />
          </Source>
        )}

        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            closeOnClick={false}
            onClose={() => setPopupInfo(null)}
            maxWidth="280px"
            className="job-map-popup"
          >
            <div className="p-1">
              <h3 className="font-semibold text-sm text-gray-900 mb-1 line-clamp-2">
                {popupInfo.properties?.title}
              </h3>
              <p className="text-xs text-gray-600 mb-2">
                {popupInfo.properties?.company}
                {popupInfo.properties?.location &&
                  ` \u00B7 ${popupInfo.properties.location}`}
              </p>
              <div className="flex flex-wrap gap-1 mb-2">
                {popupInfo.properties?.germanLevel && (
                  <span className="px-1.5 py-0.5 bg-red-50 border border-red-200 rounded text-[10px] text-red-700 font-medium">
                    {popupInfo.properties.germanLevel}
                  </span>
                )}
                {popupInfo.properties?.jobType && (
                  <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-600">
                    {JOB_TYPE_LABELS[popupInfo.properties.jobType as string] ||
                      popupInfo.properties.jobType}
                  </span>
                )}
                {popupInfo.properties?.source === "community" && (
                  <span className="px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 rounded text-[10px] text-emerald-700">
                    Community
                  </span>
                )}
              </div>
              {popupInfo.properties?.applyUrl && (
                <a
                  href={popupInfo.properties.applyUrl as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center py-1.5 bg-[#d2302c] text-white text-xs font-medium rounded hover:bg-[#b82824] transition-colors"
                >
                  Apply
                </a>
              )}
            </div>
          </Popup>
        )}
      </Map>

      {/* Legend */}
      {mapData && mapData.stats.mapped > 0 && (
        <div className="absolute bottom-4 left-4 bg-[#1a1a1a]/90 backdrop-blur-sm border border-white/[0.1] rounded-lg px-3 py-2 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: PRIMARY_COLOR }}
              />
              <span className="text-gray-400">Scraped</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-gray-400">Community</span>
            </div>
            <span className="text-gray-600">
              {mapData.stats.mapped} jobs
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
