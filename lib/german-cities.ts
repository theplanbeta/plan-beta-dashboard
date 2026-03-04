// Static lookup: German city name → [longitude, latitude]
// Used to geocode job locations without an external API

export const GERMAN_CITIES: Record<string, [number, number]> = {
  // Major cities
  "Berlin": [13.405, 52.520],
  "Hamburg": [9.993, 53.551],
  "München": [11.582, 48.135],
  "Munich": [11.582, 48.135],
  "Köln": [6.960, 50.938],
  "Cologne": [6.960, 50.938],
  "Frankfurt": [8.682, 50.110],
  "Frankfurt am Main": [8.682, 50.110],
  "Stuttgart": [9.183, 48.776],
  "Düsseldorf": [6.773, 51.228],
  "Dortmund": [7.466, 51.514],
  "Essen": [7.012, 51.458],
  "Leipzig": [12.374, 51.340],
  "Bremen": [8.801, 53.079],
  "Dresden": [13.738, 51.051],
  "Hannover": [9.732, 52.375],
  "Hanover": [9.732, 52.375],
  "Nürnberg": [11.078, 49.454],
  "Nuremberg": [11.078, 49.454],
  "Duisburg": [6.763, 51.435],

  // Large cities
  "Bochum": [7.216, 51.482],
  "Wuppertal": [7.148, 51.256],
  "Bielefeld": [8.533, 52.022],
  "Bonn": [7.099, 50.737],
  "Münster": [7.626, 51.963],
  "Karlsruhe": [8.404, 49.009],
  "Mannheim": [8.467, 49.489],
  "Augsburg": [10.898, 48.371],
  "Wiesbaden": [8.240, 50.083],
  "Mönchengladbach": [6.442, 51.195],
  "Gelsenkirchen": [7.086, 51.518],
  "Braunschweig": [10.527, 52.269],
  "Aachen": [6.084, 50.775],
  "Kiel": [10.135, 54.323],
  "Chemnitz": [12.917, 50.833],
  "Halle": [11.970, 51.483],
  "Magdeburg": [11.635, 52.131],
  "Freiburg": [7.849, 47.999],
  "Freiburg im Breisgau": [7.849, 47.999],
  "Krefeld": [6.564, 51.339],
  "Lübeck": [10.687, 53.870],
  "Mainz": [8.271, 49.993],
  "Erfurt": [11.030, 50.978],
  "Oberhausen": [6.863, 51.470],
  "Rostock": [12.099, 54.092],
  "Kassel": [9.480, 51.312],
  "Hagen": [7.475, 51.361],
  "Potsdam": [13.064, 52.397],
  "Saarbrücken": [6.997, 49.234],
  "Hamm": [7.821, 51.674],
  "Ludwigshafen": [8.435, 49.477],
  "Oldenburg": [8.214, 53.144],
  "Mülheim": [6.884, 51.433],
  "Osnabrück": [8.043, 52.280],
  "Leverkusen": [6.984, 51.046],
  "Heidelberg": [8.694, 49.398],
  "Darmstadt": [8.651, 49.872],
  "Solingen": [7.084, 51.165],
  "Regensburg": [12.102, 49.014],
  "Herne": [7.219, 51.539],
  "Paderborn": [8.754, 51.719],
  "Neuss": [6.692, 51.198],
  "Ingolstadt": [11.425, 48.764],
  "Offenbach": [8.770, 50.101],
  "Würzburg": [9.934, 49.794],
  "Wolfsburg": [10.781, 52.423],
  "Ulm": [9.988, 48.401],
  "Heilbronn": [9.218, 49.142],
  "Göttingen": [9.936, 51.534],
  "Pforzheim": [8.699, 48.892],
  "Reutlingen": [9.205, 48.491],
  "Koblenz": [7.589, 50.357],
  "Bremerhaven": [8.587, 53.540],
  "Trier": [6.641, 49.750],
  "Jena": [11.589, 50.927],
  "Erlangen": [11.006, 49.590],
  "Moers": [6.636, 51.453],
  "Cottbus": [14.334, 51.761],
  "Siegen": [8.025, 50.874],
  "Hildesheim": [9.952, 52.150],
  "Salzgitter": [10.331, 52.154],
  "Gütersloh": [8.383, 51.907],
  "Kaiserslautern": [7.769, 49.444],
  "Schwerin": [11.417, 53.636],
  "Witten": [7.335, 51.444],
  "Gera": [12.083, 50.880],
  "Iserlohn": [7.695, 51.375],
  "Düren": [6.492, 50.805],
  "Esslingen": [9.305, 48.740],
  "Tübingen": [9.057, 48.522],
  "Flensburg": [9.437, 54.794],
  "Lüneburg": [10.413, 53.251],
  "Konstanz": [9.176, 47.663],
  "Bamberg": [10.886, 49.892],
  "Bayreuth": [11.578, 49.946],
  "Passau": [13.432, 48.574],
  "Landshut": [12.152, 48.537],
  "Stralsund": [13.090, 54.309],
  "Fulda": [9.675, 50.554],
  "Worms": [8.362, 49.634],
  "Marburg": [8.773, 50.810],
  "Detmold": [8.880, 51.937],
  "Lüdenscheid": [7.627, 51.220],
  "Velbert": [7.044, 51.339],
  "Wilhelmshaven": [8.135, 53.530],
  "Dorsten": [6.966, 51.661],
  "Celle": [10.081, 52.625],
  "Delmenhorst": [8.631, 53.051],
  "Weimar": [11.330, 50.980],
  "Neubrandenburg": [13.261, 53.557],
  "Norderstedt": [9.985, 53.696],
  "Viersen": [6.397, 51.253],
  "Gladbeck": [6.985, 51.570],
  "Troisdorf": [7.156, 50.816],
}

/**
 * Resolve a job location string to [longitude, latitude].
 * Tries: exact match → substring match → first-word match.
 * Returns null if no match found.
 */
export function geocodeCity(location: string | null): [number, number] | null {
  if (!location) return null

  const trimmed = location.trim()

  // Exact match
  if (GERMAN_CITIES[trimmed]) return GERMAN_CITIES[trimmed]

  // Case-insensitive exact match
  const lower = trimmed.toLowerCase()
  for (const [city, coords] of Object.entries(GERMAN_CITIES)) {
    if (city.toLowerCase() === lower) return coords
  }

  // Substring match: "Berlin, Brandenburg" → Berlin
  for (const [city, coords] of Object.entries(GERMAN_CITIES)) {
    if (lower.includes(city.toLowerCase())) return coords
  }

  // First word match: "Frankfurt (Oder)" → Frankfurt
  const firstWord = trimmed.split(/[\s,(/]+/)[0]
  if (firstWord && firstWord.length >= 3) {
    for (const [city, coords] of Object.entries(GERMAN_CITIES)) {
      if (city.toLowerCase() === firstWord.toLowerCase()) return coords
    }
  }

  return null
}
