"use client";

import type React from "react";

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import type { GPXData } from "../lib/gpx-parser";

interface LabelPoint {
  id: string;
  distance: number;
  elevation: number;
  name: string;
  category?: "HC" | "1" | "2" | "3" | "4";
}

interface ElevationProfileProps {
  gpxData: GPXData;
  labels: LabelPoint[];
  onProfileClick: (distance: number, elevation: number) => void;
  isAddingLabel: boolean;
  startName: string;
  finishName: string;
}

export const ElevationProfile = forwardRef<
  HTMLCanvasElement,
  ElevationProfileProps
>(
  (
    { gpxData, labels, onProfileClick, isAddingLabel, startName, finishName },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => canvasRef.current!, []);

    useEffect(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Set canvas size
      const containerWidth = container.clientWidth;
      const containerHeight = 400;
      canvas.width = containerWidth * 2; // High DPI
      canvas.height = containerHeight * 2;
      canvas.style.width = `${containerWidth}px`;
      canvas.style.height = `${containerHeight}px`;
      ctx.scale(2, 2);

      // Clear canvas
      ctx.clearRect(0, 0, containerWidth, containerHeight);

      // Drawing dimensions
      const padding = { top: 60, right: 40, bottom: 80, left: 60 };
      const chartWidth = containerWidth - padding.left - padding.right;
      const chartHeight = containerHeight - padding.top - padding.bottom;

      // Calculate scales
      const maxDistance = gpxData.totalDistance;
      const minElevation = Math.floor(gpxData.minElevation / 100) * 100;
      const maxElevation = Math.ceil(gpxData.maxElevation / 100) * 100;
      const elevationRange = maxElevation - minElevation;

      const xScale = (distance: number) =>
        padding.left + (distance / maxDistance) * chartWidth;
      const yScale = (elevation: number) =>
        padding.top +
        chartHeight -
        ((elevation - minElevation) / elevationRange) * chartHeight;

      // Draw background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, containerWidth, containerHeight);

      // Draw elevation profile area (yellow fill)
      ctx.beginPath();
      ctx.moveTo(xScale(0), yScale(minElevation));

      gpxData.elevationPoints.forEach((point, index) => {
        if (index === 0) {
          ctx.lineTo(xScale(point.distance), yScale(point.elevation));
        } else {
          ctx.lineTo(xScale(point.distance), yScale(point.elevation));
        }
      });

      ctx.lineTo(xScale(maxDistance), yScale(minElevation));
      ctx.closePath();
      ctx.fillStyle = "#FFED4E"; // More vibrant yellow like Tour de France
      ctx.fill();

      // Draw horizontal grid lines only inside the elevation profile
      ctx.save(); // Save current state

      // Create clipping path matching the elevation profile
      ctx.beginPath();
      ctx.moveTo(xScale(0), yScale(minElevation));

      gpxData.elevationPoints.forEach((point, index) => {
        if (index === 0) {
          ctx.lineTo(xScale(point.distance), yScale(point.elevation));
        } else {
          ctx.lineTo(xScale(point.distance), yScale(point.elevation));
        }
      });

      ctx.lineTo(xScale(maxDistance), yScale(minElevation));
      ctx.closePath();
      ctx.clip(); // Set clipping path

      // Draw grid lines (will be clipped to profile area)
      ctx.strokeStyle = "#f5cf27";
      ctx.lineWidth = 1;
      ctx.setLineDash([]);

      // Calculate grid line interval (every 100m)
      const gridInterval = 30;
      const startGridElevation =
        Math.ceil(minElevation / gridInterval) * gridInterval;

      for (
        let elevation = startGridElevation;
        elevation <= maxElevation;
        elevation += gridInterval
      ) {
        const y = yScale(elevation);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();
      }

      ctx.restore(); // Restore state to remove clipping

      // Draw elevation profile line
      ctx.beginPath();
      ctx.moveTo(
        xScale(0),
        yScale(gpxData.elevationPoints[0]?.elevation || minElevation)
      );

      gpxData.elevationPoints.forEach((point) => {
        ctx.lineTo(xScale(point.distance), yScale(point.elevation));
      });

      ctx.strokeStyle = "#B8860B";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw distance markers at bottom (black bar) - only for labeled points
      ctx.fillStyle = "#333333";
      ctx.fillRect(padding.left, padding.top + chartHeight, chartWidth, 30);

      // Distance text on black bar - only for labeled points
      ctx.fillStyle = "#FFD700";
      ctx.font = "bold 14px 'Helvetica Neue', Helvetica, sans-serif";
      ctx.textAlign = "center";

      // Add markers for labeled points
      labels.forEach((label) => {
        const x = xScale(label.distance);
        ctx.fillText(
          `${label.distance.toFixed(1)}`,
          x,
          padding.top + chartHeight + 20
        );
      });

      // Draw start and end labels
      ctx.fillStyle = "#000000";
      ctx.font = "bold 32px 'Helvetica Neue', Helvetica, sans-serif";
      ctx.textAlign = "left";

      // Start label
      const startElevation =
        gpxData.elevationPoints[0]?.elevation || minElevation;
      ctx.fillText(startName.toUpperCase(), padding.left, 40);
      ctx.font = "18px 'Helvetica Neue', Helvetica, sans-serif";
      ctx.fillText(`${startElevation.toFixed(0)} m`, padding.left, 55);

      // End label
      ctx.textAlign = "right";
      ctx.font = "bold 32px 'Helvetica Neue', Helvetica, sans-serif";
      const endElevation =
        gpxData.elevationPoints[gpxData.elevationPoints.length - 1]
          ?.elevation || minElevation;
      ctx.fillText(
        finishName.toUpperCase(),
        containerWidth - padding.right,
        40
      );
      ctx.font = "18px 'Helvetica Neue', Helvetica, sans-serif";
      ctx.fillText(
        `${endElevation.toFixed(0)} m`,
        containerWidth - padding.right,
        55
      );
      ctx.fillText(
        `${maxDistance.toFixed(1)} km`,
        containerWidth - padding.right,
        70
      );

      // Draw labels
      labels.forEach((label) => {
        const x = xScale(label.distance);
        const y = yScale(label.elevation);

        // Draw vertical dashed line from top to bottom of profile
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = "#666666";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, padding.top - 10);
        ctx.lineTo(x, padding.top + chartHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw category badge if present
        if (label.category) {
          const badgeColors = {
            HC: "#DC2626",
            "1": "#EF4444",
            "2": "#F97316",
            "3": "#EAB308",
            "4": "#22C55E",
          };

          ctx.fillStyle = badgeColors[label.category];
          ctx.fillRect(x - 15, padding.top - 35, 30, 20);

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 12px 'Helvetica Neue', Helvetica, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(label.category, x, padding.top - 20);
        }

        // Draw label text
        ctx.fillStyle = "#000000";
        ctx.font = "bold 11px 'Helvetica Neue', Helvetica, sans-serif";
        ctx.textAlign = "center";

        const labelY = label.category ? padding.top - 45 : padding.top - 25;
        ctx.fillText(label.name, x, labelY);

        ctx.font = "10px 'Helvetica Neue', Helvetica, sans-serif";
        ctx.fillText(`${label.elevation.toFixed(0)} m`, x, labelY + 12);
        ctx.fillText(`${label.distance.toFixed(1)} km`, x, labelY + 24);

        // Draw point on profile
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = "#DC2626";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Draw total distance at bottom right
      ctx.fillStyle = "#000000";
      ctx.font = "bold 16px 'Helvetica Neue', Helvetica, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(
        `${maxDistance.toFixed(1)} km`,
        containerWidth - 20,
        containerHeight - 10
      );

      // Draw "0" at bottom left
      ctx.textAlign = "left";
      ctx.fillText("0", 20, containerHeight - 10);
    }, [gpxData, labels, startName, finishName]);

    const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isAddingLabel) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Convert canvas coordinates to data coordinates
      const containerWidth = rect.width;
      const containerHeight = 400;
      const padding = { top: 60, right: 40, bottom: 80, left: 60 };
      const chartWidth = containerWidth - padding.left - padding.right;
      const chartHeight = containerHeight - padding.top - padding.bottom;

      if (
        x < padding.left ||
        x > containerWidth - padding.right ||
        y < padding.top ||
        y > padding.top + chartHeight
      ) {
        return;
      }

      const distance =
        ((x - padding.left) / chartWidth) * gpxData.totalDistance;

      // Find closest elevation point
      let closestPoint = gpxData.elevationPoints[0];
      let minDiff = Math.abs(closestPoint.distance - distance);

      for (const point of gpxData.elevationPoints) {
        const diff = Math.abs(point.distance - distance);
        if (diff < minDiff) {
          minDiff = diff;
          closestPoint = point;
        }
      }

      onProfileClick(closestPoint.distance, closestPoint.elevation);
    };

    return (
      <div ref={containerRef} className="w-full">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className={`w-full border border-gray-200 rounded ${
            isAddingLabel ? "cursor-crosshair" : "cursor-default"
          }`}
          style={{ height: "400px" }}
        />
        {isAddingLabel && (
          <p className="text-sm text-blue-600 mt-2 text-center">
            Click on the elevation profile to add a label at that location
          </p>
        )}
      </div>
    );
  }
);

ElevationProfile.displayName = "ElevationProfile";
