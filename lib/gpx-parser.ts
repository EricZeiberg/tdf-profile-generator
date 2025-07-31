export interface ElevationPoint {
  distance: number
  elevation: number
  latitude: number
  longitude: number
}

export interface GPXData {
  elevationPoints: ElevationPoint[]
  totalDistance: number
  totalElevationGain: number
  maxElevation: number
  minElevation: number
  startPoint: { lat: number; lon: number; elevation: number }
  endPoint: { lat: number; lon: number; elevation: number }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function parseGPX(gpxContent: string): GPXData {
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(gpxContent, "text/xml")

  // Check for parsing errors
  const parserError = xmlDoc.querySelector("parsererror")
  if (parserError) {
    throw new Error("Invalid GPX file format")
  }

  // Get track points from GPX
  const trackPoints = Array.from(xmlDoc.querySelectorAll("trkpt"))

  if (trackPoints.length === 0) {
    throw new Error("No track points found in GPX file")
  }

  const elevationPoints: ElevationPoint[] = []
  let totalDistance = 0
  let totalElevationGain = 0
  let maxElevation = Number.NEGATIVE_INFINITY
  let minElevation = Number.POSITIVE_INFINITY
  let previousElevation: number | null = null

  trackPoints.forEach((point, index) => {
    const lat = Number.parseFloat(point.getAttribute("lat") || "0")
    const lon = Number.parseFloat(point.getAttribute("lon") || "0")
    const eleElement = point.querySelector("ele")
    const elevation = eleElement ? Number.parseFloat(eleElement.textContent || "0") : 0

    // Calculate distance from previous point
    if (index > 0) {
      const prevPoint = elevationPoints[index - 1]
      const distance = calculateDistance(prevPoint.latitude, prevPoint.longitude, lat, lon)
      totalDistance += distance
    }

    // Calculate elevation gain
    if (previousElevation !== null && elevation > previousElevation) {
      totalElevationGain += elevation - previousElevation
    }
    previousElevation = elevation

    // Track min/max elevation
    maxElevation = Math.max(maxElevation, elevation)
    minElevation = Math.min(minElevation, elevation)

    elevationPoints.push({
      distance: totalDistance,
      elevation,
      latitude: lat,
      longitude: lon,
    })
  })

  // Smooth the elevation data to reduce noise
  const smoothedPoints = smoothElevationData(elevationPoints)

  return {
    elevationPoints: smoothedPoints,
    totalDistance,
    totalElevationGain,
    maxElevation,
    minElevation,
    startPoint: {
      lat: elevationPoints[0].latitude,
      lon: elevationPoints[0].longitude,
      elevation: elevationPoints[0].elevation,
    },
    endPoint: {
      lat: elevationPoints[elevationPoints.length - 1].latitude,
      lon: elevationPoints[elevationPoints.length - 1].longitude,
      elevation: elevationPoints[elevationPoints.length - 1].elevation,
    },
  }
}

function smoothElevationData(points: ElevationPoint[]): ElevationPoint[] {
  if (points.length < 3) return points

  const smoothed = [...points]
  const windowSize = 5

  for (let i = windowSize; i < points.length - windowSize; i++) {
    let sum = 0
    for (let j = i - windowSize; j <= i + windowSize; j++) {
      sum += points[j].elevation
    }
    smoothed[i] = {
      ...points[i],
      elevation: sum / (windowSize * 2 + 1),
    }
  }

  return smoothed
}
