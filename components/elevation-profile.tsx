"use client"

import type React from "react"

import { useEffect, useRef, forwardRef, useImperativeHandle, useState, useCallback } from "react"
import type { GPXData } from "../lib/gpx-parser"
import type { ClimbSegment } from "../lib/climb-detector"

interface LabelPoint {
  id: string
  distance: number
  elevation: number
  name: string
  category?: "HC" | "1" | "2" | "3" | "4"
  customX?: number
  customY?: number
}

interface ElevationProfileProps {
  gpxData: GPXData
  labels: LabelPoint[]
  hoveredClimb: ClimbSegment | null
  onProfileClick: (distance: number, elevation: number) => void
  onLabelUpdate: (labelId: string, updates: Partial<LabelPoint>) => void
  isAddingLabel: boolean
  startName: string
  finishName: string
}

export const ElevationProfile = forwardRef<HTMLCanvasElement, ElevationProfileProps>(
  ({ gpxData, labels, hoveredClimb, onProfileClick, onLabelUpdate, isAddingLabel, startName, finishName }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [dragState, setDragState] = useState<{
      isDragging: boolean
      labelId: string | null
      startX: number
      startY: number
      initialCustomX: number
      initialCustomY: number
    }>({
      isDragging: false,
      labelId: null,
      startX: 0,
      startY: 0,
      initialCustomX: 0,
      initialCustomY: 0,
    })

    useImperativeHandle(ref, () => canvasRef.current!, [])

    const handleMouseDown = useCallback(
      (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (isAddingLabel) return

        const canvas = canvasRef.current
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()
        const mouseX = event.clientX - rect.left
        const mouseY = event.clientY - rect.top

        // Calculate current label positions and check if mouse is over a label
        const containerWidth = rect.width
        const basePadding = { top: 60, right: 40, bottom: 80, left: 60 }
        const extraTopPadding = 100 // Fixed extra space for draggable labels
        const padding = {
          top: basePadding.top + extraTopPadding,
          right: basePadding.right,
          bottom: basePadding.bottom,
          left: basePadding.left,
        }

        const chartWidth = containerWidth - padding.left - padding.right
        const maxDistance = gpxData.totalDistance
        const xScale = (distance: number) => padding.left + (distance / maxDistance) * chartWidth

        for (const label of labels) {
          const profileX = xScale(label.distance)
          const labelX = label.customX !== undefined ? label.customX : profileX
          const labelY = label.customY !== undefined ? label.customY : padding.top - 25

          // Check if mouse is within label bounds (approximate text area)
          const labelWidth = 80
          const labelHeight = 40
          if (
            mouseX >= labelX - labelWidth / 2 &&
            mouseX <= labelX + labelWidth / 2 &&
            mouseY >= labelY - labelHeight / 2 &&
            mouseY <= labelY + labelHeight / 2
          ) {
            setDragState({
              isDragging: true,
              labelId: label.id,
              startX: mouseX,
              startY: mouseY,
              initialCustomX: labelX,
              initialCustomY: labelY,
            })
            return
          }
        }
      },
      [isAddingLabel, labels, gpxData],
    )

    const handleMouseMove = useCallback(
      (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!dragState.isDragging || !dragState.labelId) return

        const canvas = canvasRef.current
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()
        const mouseX = event.clientX - rect.left
        const mouseY = event.clientY - rect.top

        const deltaX = mouseX - dragState.startX
        const deltaY = mouseY - dragState.startY

        const newX = dragState.initialCustomX + deltaX
        const newY = dragState.initialCustomY + deltaY

        // Constrain to canvas bounds
        const constrainedX = Math.max(50, Math.min(rect.width - 50, newX))
        const constrainedY = Math.max(20, Math.min(rect.height - 100, newY))

        onLabelUpdate(dragState.labelId, {
          customX: constrainedX,
          customY: constrainedY,
        })
      },
      [dragState, onLabelUpdate],
    )

    const handleMouseUp = useCallback(() => {
      setDragState({
        isDragging: false,
        labelId: null,
        startX: 0,
        startY: 0,
        initialCustomX: 0,
        initialCustomY: 0,
      })
    }, [])

    useEffect(() => {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Calculate bottom displacement for distance markers
      const sortedLabels = [...labels].sort((a, b) => a.distance - b.distance)
      const bottomDisplacements: { [key: string]: number } = {}
      const minDistanceSpacing = 40

      sortedLabels.forEach((label, index) => {
        let displacement = 0
        const maxDistance = gpxData.totalDistance
        const x = (label.distance / maxDistance) * 800

        for (let i = 0; i < index; i++) {
          const prevLabel = sortedLabels[i]
          const prevX = (prevLabel.distance / maxDistance) * 800
          const prevDisplacement = bottomDisplacements[prevLabel.id] || 0

          if (Math.abs(x - prevX) < minDistanceSpacing) {
            displacement = Math.max(displacement, prevDisplacement + 15)
          }
        }

        bottomDisplacements[label.id] = displacement
      })

      const maxBottomDisplacement = Math.max(0, ...Object.values(bottomDisplacements))

      // Set fixed padding with extra space for draggable labels
      const basePadding = { top: 60, right: 40, bottom: 80, left: 60 }
      const extraTopPadding = 100 // Fixed extra space for draggable labels
      const extraBottomPadding = Math.max(0, maxBottomDisplacement + 10)

      const padding = {
        top: basePadding.top + extraTopPadding,
        right: basePadding.right,
        bottom: basePadding.bottom + extraBottomPadding,
        left: basePadding.left,
      }

      // Set canvas size with dynamic height
      const containerWidth = container.clientWidth
      const baseHeight = 400
      const dynamicHeight = baseHeight + extraTopPadding + extraBottomPadding

      canvas.width = containerWidth * 2
      canvas.height = dynamicHeight * 2
      canvas.style.width = `${containerWidth}px`
      canvas.style.height = `${dynamicHeight}px`
      ctx.scale(2, 2)

      // Clear canvas
      ctx.clearRect(0, 0, containerWidth, dynamicHeight)

      // Drawing dimensions
      const chartWidth = containerWidth - padding.left - padding.right
      const chartHeight = baseHeight - basePadding.top - basePadding.bottom

      // Calculate scales
      const maxDistance = gpxData.totalDistance
      const minElevation = Math.floor(gpxData.minElevation / 100) * 100
      const maxElevation = Math.ceil(gpxData.maxElevation / 100) * 100
      const elevationRange = maxElevation - minElevation

      const xScale = (distance: number) => padding.left + (distance / maxDistance) * chartWidth
      const yScale = (elevation: number) =>
        padding.top + chartHeight - ((elevation - minElevation) / elevationRange) * chartHeight

      // Draw background
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, containerWidth, dynamicHeight)

      // Draw elevation profile area (yellow fill)
      ctx.beginPath()
      ctx.moveTo(xScale(0), yScale(minElevation))

      gpxData.elevationPoints.forEach((point, index) => {
        if (index === 0) {
          ctx.lineTo(xScale(point.distance), yScale(point.elevation))
        } else {
          ctx.lineTo(xScale(point.distance), yScale(point.elevation))
        }
      })

      ctx.lineTo(xScale(maxDistance), yScale(minElevation))
      ctx.closePath()
      ctx.fillStyle = "#FFED4E"
      ctx.fill()

      // Draw horizontal grid lines only inside the elevation profile
      ctx.save()

      // Create clipping path matching the elevation profile
      ctx.beginPath()
      ctx.moveTo(xScale(0), yScale(minElevation))

      gpxData.elevationPoints.forEach((point, index) => {
        if (index === 0) {
          ctx.lineTo(xScale(point.distance), yScale(point.elevation))
        } else {
          ctx.lineTo(xScale(point.distance), yScale(point.elevation))
        }
      })

      ctx.lineTo(xScale(maxDistance), yScale(minElevation))
      ctx.closePath()
      ctx.clip()

      // Draw grid lines
      ctx.strokeStyle = "#f5cf27"
      ctx.lineWidth = 1
      ctx.setLineDash([])

      const gridInterval = 30
      const startGridElevation = Math.ceil(minElevation / gridInterval) * gridInterval

      for (let elevation = startGridElevation; elevation <= maxElevation; elevation += gridInterval) {
        const y = yScale(elevation)
        ctx.beginPath()
        ctx.moveTo(padding.left, y)
        ctx.lineTo(padding.left + chartWidth, y)
        ctx.stroke()
      }

      ctx.restore()

      // Draw elevation profile line
      ctx.beginPath()
      ctx.moveTo(xScale(0), yScale(gpxData.elevationPoints[0]?.elevation || minElevation))

      gpxData.elevationPoints.forEach((point) => {
        ctx.lineTo(xScale(point.distance), yScale(point.elevation))
      })

      ctx.strokeStyle = "#B8860B"
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw distance markers at bottom (black bar)
      ctx.fillStyle = "#333333"
      ctx.fillRect(padding.left, padding.top + chartHeight, chartWidth, 30)

      // Distance text on black bar with displacement
      ctx.fillStyle = "#FFD700"
      ctx.font = "bold 14px 'Helvetica Neue', Helvetica, sans-serif"
      ctx.textAlign = "center"

      labels.forEach((label) => {
        const x = xScale(label.distance)
        const displacement = bottomDisplacements[label.id] || 0
        ctx.fillText(`${label.distance.toFixed(1)}`, x, padding.top + chartHeight + 20 + displacement)
      })

      // Draw start and end labels
      ctx.fillStyle = "#000000"
      ctx.font = "bold 32px 'Helvetica Neue', Helvetica, sans-serif"
      ctx.textAlign = "left"

      const startElevation = gpxData.elevationPoints[0]?.elevation || minElevation
      ctx.fillText(startName.toUpperCase(), padding.left, 40)
      ctx.font = "18px 'Helvetica Neue', Helvetica, sans-serif"
      ctx.fillText(`${startElevation.toFixed(0)} m`, padding.left, 55)

      ctx.textAlign = "right"
      ctx.font = "bold 32px 'Helvetica Neue', Helvetica, sans-serif"
      const endElevation = gpxData.elevationPoints[gpxData.elevationPoints.length - 1]?.elevation || minElevation
      ctx.fillText(finishName.toUpperCase(), containerWidth - padding.right, 40)
      ctx.font = "18px 'Helvetica Neue', Helvetica, sans-serif"
      ctx.fillText(`${endElevation.toFixed(0)} m`, containerWidth - padding.right, 55)
      ctx.fillText(`${maxDistance.toFixed(1)} km`, containerWidth - padding.right, 70)

      // Draw hovered climb preview point
      if (hoveredClimb) {
        const previewX = xScale(hoveredClimb.peakDistance)
        const previewY = yScale(hoveredClimb.peakElevation)

        // Draw preview point with pulsing animation effect
        ctx.beginPath()
        ctx.arc(previewX, previewY, 6, 0, 2 * Math.PI)
        ctx.fillStyle = "rgba(59, 130, 246, 0.7)" // Blue with transparency
        ctx.fill()
        ctx.strokeStyle = "#ffffff"
        ctx.lineWidth = 2
        ctx.stroke()

        // Draw preview label
        const previewLabelY = padding.top - 25
        ctx.fillStyle = "rgba(59, 130, 246, 0.9)"
        ctx.fillRect(previewX - 15, previewLabelY - 20, 30, 20)

        if (hoveredClimb.category) {
          ctx.fillStyle = "#ffffff"
          ctx.font = "bold 12px 'Helvetica Neue', Helvetica, sans-serif"
          ctx.textAlign = "center"
          ctx.fillText(hoveredClimb.category, previewX, previewLabelY - 5)
        }

        // Draw preview text
        ctx.fillStyle = "rgba(59, 130, 246, 0.9)"
        ctx.font = "bold 11px 'Helvetica Neue', Helvetica, sans-serif"
        ctx.textAlign = "center"

        const previewTextY = hoveredClimb.category ? previewLabelY - 30 : previewLabelY - 10
        ctx.fillText(hoveredClimb.name, previewX, previewTextY)

        ctx.font = "10px 'Helvetica Neue', Helvetica, sans-serif"
        ctx.fillText(`${hoveredClimb.peakElevation.toFixed(0)} m`, previewX, previewTextY + 12)
        ctx.fillText(`${hoveredClimb.peakDistance.toFixed(1)} km`, previewX, previewTextY + 24)

        // Draw preview connector line
        ctx.strokeStyle = "rgba(59, 130, 246, 0.7)"
        ctx.lineWidth = 1
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(previewX, previewY)
        ctx.lineTo(previewX, padding.top - 10)
        ctx.stroke()
        ctx.setLineDash([])
      }

      // Draw labels with custom positioning and L-shaped connectors
      labels.forEach((label) => {
        const profileX = xScale(label.distance)
        const profileY = yScale(label.elevation)

        // Use custom position if available, otherwise use default position
        const labelX = label.customX !== undefined ? label.customX : profileX
        const labelY = label.customY !== undefined ? label.customY : padding.top - 25

        // Draw L-shaped connector line
        ctx.strokeStyle = "#666666"
        ctx.lineWidth = 1
        ctx.setLineDash([3, 3])
        ctx.beginPath()

        // Vertical line from profile point up
        ctx.moveTo(profileX, profileY)
        ctx.lineTo(profileX, padding.top - 10)

        // If label is moved, draw L-shaped connector
        if (label.customX !== undefined || label.customY !== undefined) {
          // Horizontal line from vertical line to label
          ctx.lineTo(labelX, padding.top - 10)
          // Vertical line down to label
          ctx.lineTo(labelX, labelY + 15)
        }

        ctx.stroke()
        ctx.setLineDash([])

        // Draw category badge if present
        if (label.category) {
          const badgeColors = {
            HC: "#DC2626",
            "1": "#EF4444",
            "2": "#F97316",
            "3": "#EAB308",
            "4": "#22C55E",
          }

          ctx.fillStyle = badgeColors[label.category]
          ctx.fillRect(labelX - 15, labelY - 20, 30, 20)

          ctx.fillStyle = "#ffffff"
          ctx.font = "bold 12px 'Helvetica Neue', Helvetica, sans-serif"
          ctx.textAlign = "center"
          ctx.fillText(label.category, labelX, labelY - 5)
        }

        // Draw label text
        ctx.fillStyle = "#000000"
        ctx.font = "bold 11px 'Helvetica Neue', Helvetica, sans-serif"
        ctx.textAlign = "center"

        const textY = label.category ? labelY - 30 : labelY - 10
        ctx.fillText(label.name, labelX, textY)

        ctx.font = "10px 'Helvetica Neue', Helvetica, sans-serif"
        ctx.fillText(`${label.elevation.toFixed(0)} m`, labelX, textY + 12)
        ctx.fillText(`${label.distance.toFixed(1)} km`, labelX, textY + 24)

        // Draw point on profile
        ctx.beginPath()
        ctx.arc(profileX, profileY, 4, 0, 2 * Math.PI)
        ctx.fillStyle = "#DC2626"
        ctx.fill()
        ctx.strokeStyle = "#ffffff"
        ctx.lineWidth = 2
        ctx.stroke()

        // Highlight draggable labels
        if (!isAddingLabel) {
          ctx.strokeStyle = dragState.isDragging && dragState.labelId === label.id ? "#0066cc" : "#cccccc"
          ctx.lineWidth = 1
          ctx.setLineDash([2, 2])
          ctx.strokeRect(labelX - 40, labelY - 35, 80, 40)
          ctx.setLineDash([])
        }
      })

      // Draw total distance at bottom
      ctx.fillStyle = "#000000"
      ctx.font = "bold 16px 'Helvetica Neue', Helvetica, sans-serif"
      ctx.textAlign = "right"
      ctx.fillText(`${maxDistance.toFixed(1)} km`, containerWidth - 20, dynamicHeight - 10)

      ctx.textAlign = "left"
      ctx.fillText("0", 20, dynamicHeight - 10)
    }, [gpxData, labels, hoveredClimb, startName, finishName, dragState, isAddingLabel])

    const handleCanvasClick = useCallback(
      (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isAddingLabel || dragState.isDragging) return

        const canvas = canvasRef.current
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top

        const basePadding = { top: 60, right: 40, bottom: 80, left: 60 }
        const extraTopPadding = 100
        const padding = {
          top: basePadding.top + extraTopPadding,
          right: basePadding.right,
          bottom: basePadding.bottom,
          left: basePadding.left,
        }

        const containerWidth = rect.width
        const baseHeight = 400
        const chartWidth = containerWidth - padding.left - padding.right
        const chartHeight = baseHeight - basePadding.top - basePadding.bottom

        if (
          x < padding.left ||
          x > containerWidth - padding.right ||
          y < padding.top ||
          y > padding.top + chartHeight
        ) {
          return
        }

        const distance = ((x - padding.left) / chartWidth) * gpxData.totalDistance

        let closestPoint = gpxData.elevationPoints[0]
        let minDiff = Math.abs(closestPoint.distance - distance)

        for (const point of gpxData.elevationPoints) {
          const diff = Math.abs(point.distance - distance)
          if (diff < minDiff) {
            minDiff = diff
            closestPoint = point
          }
        }

        onProfileClick(closestPoint.distance, closestPoint.elevation)
      },
      [isAddingLabel, dragState.isDragging, gpxData, onProfileClick],
    )

    return (
      <div ref={containerRef} className="w-full">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleCanvasClick}
          className={`w-full border border-gray-200 rounded ${
            isAddingLabel ? "cursor-crosshair" : dragState.isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
        />
        {isAddingLabel && (
          <p className="text-sm text-blue-600 mt-2 text-center">
            Click on the elevation profile to add a label at that location
          </p>
        )}
        {!isAddingLabel && labels.length > 0 && (
          <p className="text-sm text-gray-600 mt-2 text-center">
            Drag labels to reposition them. L-shaped lines will connect them to their original positions.
          </p>
        )}
        {hoveredClimb && (
          <p className="text-sm text-blue-600 mt-2 text-center">
            Hovering over: {hoveredClimb.name} - Click "Add" to place this label on the profile
          </p>
        )}
      </div>
    )
  },
)

ElevationProfile.displayName = "ElevationProfile"
