export interface ClimbSegment {
  startDistance: number
  endDistance: number
  startElevation: number
  endElevation: number
  length: number
  elevationGain: number
  averageGradient: number
  score: number
  category: "HC" | "1" | "2" | "3" | "4" | null
  peakDistance: number
  peakElevation: number
  name: string
}

export function detectClimbs(elevationPoints: Array<{ distance: number; elevation: number }>): ClimbSegment[] {
  if (elevationPoints.length < 10) return []

  const climbs: ClimbSegment[] = []
  const minClimbLength = 0.5 // Minimum 500m climb
  const minElevationGain = 30 // Minimum 30m elevation gain
  const gradientThreshold = 3 // Minimum 3% average gradient to be considered a climb

  let climbStart: number | null = null
  let climbStartElevation: number | null = null
  let currentElevation = elevationPoints[0].elevation
  let isClimbing = false

  // Smooth elevation data for better climb detection
  const smoothedPoints = smoothElevationForClimbDetection(elevationPoints)

  for (let i = 1; i < smoothedPoints.length; i++) {
    const point = smoothedPoints[i]
    const prevPoint = smoothedPoints[i - 1]
    const elevationChange = point.elevation - prevPoint.elevation
    const distance = point.distance - prevPoint.distance

    // Calculate gradient for this segment
    const gradient = distance > 0 ? (elevationChange / (distance * 1000)) * 100 : 0

    // Start of a potential climb
    if (!isClimbing && gradient > gradientThreshold) {
      climbStart = prevPoint.distance
      climbStartElevation = prevPoint.elevation
      isClimbing = true
    }
    // End of climb (gradient drops below threshold or we reach the end)
    else if (isClimbing && (gradient < gradientThreshold || i === smoothedPoints.length - 1)) {
      if (climbStart !== null && climbStartElevation !== null) {
        const climbEnd = point.distance
        const climbEndElevation = point.elevation
        const climbLength = climbEnd - climbStart
        const elevationGain = climbEndElevation - climbStartElevation

        // Check if this qualifies as a significant climb
        if (climbLength >= minClimbLength && elevationGain >= minElevationGain) {
          const averageGradient = (elevationGain / (climbLength * 1000)) * 100

          if (averageGradient >= gradientThreshold) {
            // Find the actual peak (highest point) in this climb segment
            let peakDistance = climbEnd
            let peakElevation = climbEndElevation

            for (let j = i; j < Math.min(i + 20, smoothedPoints.length); j++) {
              if (smoothedPoints[j].elevation > peakElevation) {
                peakElevation = smoothedPoints[j].elevation
                peakDistance = smoothedPoints[j].distance
              } else if (smoothedPoints[j].elevation < peakElevation - 10) {
                // Stop looking if elevation drops significantly
                break
              }
            }

            const score = climbLength * (averageGradient * averageGradient)
            const category = categorizeClimb(score)

            climbs.push({
              startDistance: climbStart,
              endDistance: climbEnd,
              startElevation: climbStartElevation,
              endElevation: climbEndElevation,
              length: climbLength,
              elevationGain,
              averageGradient,
              score,
              category,
              peakDistance,
              peakElevation,
              name: generateClimbName(peakElevation, climbLength, averageGradient),
            })
          }
        }
      }

      isClimbing = false
      climbStart = null
      climbStartElevation = null
    }

    currentElevation = point.elevation
  }

  // Filter out climbs that are too close to each other (merge nearby climbs)
  return mergeNearbyClimbs(climbs)
}

function smoothElevationForClimbDetection(
  points: Array<{ distance: number; elevation: number }>,
): Array<{ distance: number; elevation: number }> {
  if (points.length < 5) return points

  const smoothed = [...points]
  const windowSize = 3

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

function categorizeClimb(score: number): "HC" | "1" | "2" | "3" | "4" | null {
  if (score >= 600) return "HC"
  if (score >= 300) return "1"
  if (score >= 150) return "2"
  if (score >= 75) return "3"
  if (score > 0) return "4"
  return null
}

function generateClimbName(elevation: number, length: number, gradient: number): string {
  const climbTypes = ["Col", "Côte", "Mont", "Pic", "Sommet", "Montée", "Puy", "Roc", "Butte", "Crête"]

  // Choose name based on characteristics
  let nameType = "Côte"
  if (elevation > 1500) nameType = "Col"
  else if (elevation > 1000) nameType = "Mont"
  else if (gradient > 10) nameType = "Montée"
  else if (length > 10) nameType = "Col"

  const elevationSuffix = Math.round(elevation / 100) * 100
  return `${nameType} ${elevationSuffix}m`
}

function mergeNearbyClimbs(climbs: ClimbSegment[]): ClimbSegment[] {
  if (climbs.length <= 1) return climbs

  const merged: ClimbSegment[] = []
  const minDistanceBetweenClimbs = 2 // 2km minimum between climbs

  for (let i = 0; i < climbs.length; i++) {
    const currentClimb = climbs[i]
    let shouldMerge = false

    // Check if this climb is too close to the last merged climb
    if (merged.length > 0) {
      const lastClimb = merged[merged.length - 1]
      const distanceBetween = currentClimb.startDistance - lastClimb.endDistance

      if (distanceBetween < minDistanceBetweenClimbs) {
        // Merge with the previous climb if it's better, or skip this one
        if (currentClimb.score > lastClimb.score) {
          merged[merged.length - 1] = currentClimb
        }
        shouldMerge = true
      }
    }

    if (!shouldMerge) {
      merged.push(currentClimb)
    }
  }

  return merged
}
