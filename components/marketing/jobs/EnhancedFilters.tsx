"use client"

import { usePortalAuth } from "./JobPortalAuthProvider"
import { PremiumGate } from "./PremiumGate"

interface FilterOption { value: string; count: number }

interface EnhancedFiltersProps {
  filters: {
    germanLevels: FilterOption[]
    locations: FilterOption[]
  }
  selectedLevel: string
  selectedLocation: string
  selectedJobType: string
  englishOk: boolean
  sortBy: string
  searchQuery: string
  salaryMin: string
  salaryMax: string
  city?: string
  onLevelChange: (v: string) => void
  onLocationChange: (v: string) => void
  onJobTypeChange: (v: string) => void
  onEnglishOkChange: (v: boolean) => void
  onSortChange: (v: string) => void
  onSearchChange: (v: string) => void
  onSalaryMinChange: (v: string) => void
  onSalaryMaxChange: (v: string) => void
  nearCity: string
  radiusKm: string
  onNearCityChange: (v: string) => void
  onRadiusChange: (v: string) => void
}

const selectClasses = "px-3 py-2 bg-[#1a1a1a] border border-white/[0.1] rounded-lg text-sm text-white focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"

export function EnhancedFilters({
  filters,
  selectedLevel,
  selectedLocation,
  selectedJobType,
  englishOk,
  sortBy,
  searchQuery,
  salaryMin,
  salaryMax,
  city,
  onLevelChange,
  onLocationChange,
  onJobTypeChange,
  onEnglishOkChange,
  onSortChange,
  onSearchChange,
  onSalaryMinChange,
  onSalaryMaxChange,
  nearCity,
  radiusKm,
  onNearCityChange,
  onRadiusChange,
}: EnhancedFiltersProps) {
  const { isPremium } = usePortalAuth()

  return (
    <div className="sticky top-16 md:top-20 z-30 bg-[#0a0a0a]/90 backdrop-blur-xl py-4 border-b border-white/[0.06] mb-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
        {/* Row 1: Search + basic filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-0 w-full sm:min-w-[200px] sm:w-auto">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by title, company, or city..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#1a1a1a] border border-white/[0.1] rounded-lg text-sm text-white placeholder:text-gray-600 focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
          </div>
          <select value={selectedLevel} onChange={(e) => onLevelChange(e.target.value)} className={selectClasses}>
            <option value="">Any German Level</option>
            {filters.germanLevels.map((l) => (
              <option key={l.value} value={l.value}>{l.value} ({l.count})</option>
            ))}
          </select>
          {!city && filters.locations.length > 0 && (
            <select value={selectedLocation} onChange={(e) => onLocationChange(e.target.value)} className={selectClasses}>
              <option value="">All Locations</option>
              {filters.locations.map((l) => (
                <option key={l.value} value={l.value}>{l.value} ({l.count})</option>
              ))}
            </select>
          )}
        </div>

        {/* Row 2: Near city + Job type + premium filters */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Near city + radius (free) */}
          {!city && (
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Your city..."
                  value={nearCity}
                  onChange={(e) => onNearCityChange(e.target.value)}
                  className="w-36 pl-8 pr-2 py-2 bg-[#1a1a1a] border border-white/[0.1] rounded-lg text-sm text-white placeholder:text-gray-600 focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                />
              </div>
              {nearCity && (
                <select value={radiusKm} onChange={(e) => onRadiusChange(e.target.value)} className={`${selectClasses} w-24`}>
                  <option value="10">10 km</option>
                  <option value="25">25 km</option>
                  <option value="50">50 km</option>
                  <option value="100">100 km</option>
                  <option value="200">200 km</option>
                </select>
              )}
            </div>
          )}

          {/* Job type (free) */}
          <select value={selectedJobType} onChange={(e) => onJobTypeChange(e.target.value)} className={selectClasses}>
            <option value="">All Job Types</option>
            <option value="PART_TIME">Part Time</option>
            <option value="FULL_TIME">Full Time</option>
            <option value="CONTRACT">Contract</option>
            <option value="INTERNSHIP">Internship</option>
            <option value="WORKING_STUDENT">Working Student</option>
          </select>

          {/* English OK toggle (premium) */}
          {isPremium ? (
            <label className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] border border-white/[0.1] rounded-lg cursor-pointer hover:border-white/[0.2] transition-all">
              <input
                type="checkbox"
                checked={englishOk}
                onChange={(e) => onEnglishOkChange(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-transparent text-primary focus:ring-primary/30"
              />
              <span className="text-sm text-gray-300">English OK</span>
            </label>
          ) : (
            <PremiumGate feature="English OK filter">
              <label className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] border border-white/[0.1] rounded-lg cursor-pointer opacity-60">
                <input type="checkbox" disabled className="w-4 h-4 rounded border-white/20 bg-transparent" />
                <span className="text-sm text-gray-500">English OK</span>
                <span className="text-[10px] text-primary font-semibold ml-1">PRO</span>
              </label>
            </PremiumGate>
          )}

          {/* Salary range (premium) */}
          {isPremium ? (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                placeholder="Min EUR"
                value={salaryMin}
                onChange={(e) => onSalaryMinChange(e.target.value)}
                className="w-24 px-2 py-2 bg-[#1a1a1a] border border-white/[0.1] rounded-lg text-sm text-white placeholder:text-gray-600 focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
              <span className="text-gray-600 text-xs">–</span>
              <input
                type="number"
                placeholder="Max EUR"
                value={salaryMax}
                onChange={(e) => onSalaryMaxChange(e.target.value)}
                className="w-24 px-2 py-2 bg-[#1a1a1a] border border-white/[0.1] rounded-lg text-sm text-white placeholder:text-gray-600 focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
            </div>
          ) : (
            <PremiumGate feature="Salary range filter">
              <div className="flex items-center gap-1.5 opacity-60">
                <div className="w-24 px-2 py-2 bg-[#1a1a1a] border border-white/[0.1] rounded-lg text-sm text-gray-500">Min EUR</div>
                <span className="text-gray-600 text-xs">–</span>
                <div className="w-24 px-2 py-2 bg-[#1a1a1a] border border-white/[0.1] rounded-lg text-sm text-gray-500">Max EUR</div>
                <span className="text-[10px] text-primary font-semibold">PRO</span>
              </div>
            </PremiumGate>
          )}

          {/* Sort (premium) */}
          {isPremium ? (
            <select value={sortBy} onChange={(e) => onSortChange(e.target.value)} className={selectClasses}>
              <option value="newest">Newest first</option>
              <option value="salary_desc">Highest salary</option>
              <option value="salary_asc">Lowest salary</option>
            </select>
          ) : (
            <PremiumGate feature="Sort options">
              <div className={`${selectClasses} opacity-60 cursor-pointer`}>
                Sort <span className="text-[10px] text-primary font-semibold ml-1">PRO</span>
              </div>
            </PremiumGate>
          )}
        </div>
      </div>
    </div>
  )
}
