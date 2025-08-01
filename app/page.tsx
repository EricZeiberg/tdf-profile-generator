"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Download, MapPin, X, Zap, Edit2, Check, XIcon } from "lucide-react"
import { ElevationProfile } from "../components/elevation-profile"
import { parseGPX, type GPXData } from "../lib/gpx-parser"
import { detectClimbs, type ClimbSegment } from "../lib/climb-detector"

interface LabelPoint {
  id: string
  distance: number
  elevation: number
  name: string
  category?: "HC" | "1" | "2" | "3" | "4"
  customX?: number
  customY?: number
}

export default function GPXElevationProfiler() {
  const [gpxData, setGpxData] = useState<GPXData | null>(null)
  const [labels, setLabels] = useState<LabelPoint[]>([])
  const [detectedClimbs, setDetectedClimbs] = useState<ClimbSegment[]>([])
  const [hoveredClimb, setHoveredClimb] = useState<ClimbSegment | null>(null)
  const [editingLabel, setEditingLabel] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [editingCategory, setEditingCategory] = useState<LabelPoint["category"]>()
  const [isAddingLabel, setIsAddingLabel] = useState(false)
  const [newLabelName, setNewLabelName] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<LabelPoint["category"]>()
  const [startName, setStartName] = useState("START")
  const [finishName, setFinishName] = useState("FINISH")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = parseGPX(text)
      setGpxData(data)
      setLabels([])

      // Automatically detect climbs
      const climbs = detectClimbs(data.elevationPoints)
      setDetectedClimbs(climbs)

      // Automatically generate labels for significant climbs (category 3 and above)
      const autoLabels: LabelPoint[] = climbs
        .filter((climb) => climb.category && ["HC", "1", "2", "3"].includes(climb.category))
        .map((climb) => ({
          id: `climb-${Date.now()}-${Math.random()}`,
          distance: climb.peakDistance,
          elevation: climb.peakElevation,
          name: climb.name,
          category: climb.category!,
        }))

      setLabels(autoLabels)
    } catch (error) {
      console.error("Error parsing GPX file:", error)
      alert("Error parsing GPX file. Please ensure it's a valid GPX file.")
    }
  }, [])

  const handleProfileClick = useCallback(
    (distance: number, elevation: number) => {
      if (!isAddingLabel || !newLabelName.trim()) return

      const newLabel: LabelPoint = {
        id: Date.now().toString(),
        distance,
        elevation,
        name: newLabelName.trim(),
        category: selectedCategory,
      }

      setLabels((prev) => [...prev, newLabel].sort((a, b) => a.distance - b.distance))
      setNewLabelName("")
      setSelectedCategory(undefined)
      setIsAddingLabel(false)
    },
    [isAddingLabel, newLabelName, selectedCategory],
  )

  const handleLabelUpdate = useCallback((labelId: string, updates: Partial<LabelPoint>) => {
    setLabels((prev) => prev.map((label) => (label.id === labelId ? { ...label, ...updates } : label)))
  }, [])

  const removeLabel = useCallback((id: string) => {
    setLabels((prev) => prev.filter((label) => label.id !== id))
  }, [])

  const startEditingLabel = useCallback((label: LabelPoint) => {
    setEditingLabel(label.id)
    setEditingName(label.name)
    setEditingCategory(label.category)
  }, [])

  const saveEditingLabel = useCallback(() => {
    if (editingLabel && editingName.trim()) {
      handleLabelUpdate(editingLabel, {
        name: editingName.trim(),
        category: editingCategory,
      })
    }
    setEditingLabel(null)
    setEditingName("")
    setEditingCategory(undefined)
  }, [editingLabel, editingName, editingCategory, handleLabelUpdate])

  const cancelEditingLabel = useCallback(() => {
    setEditingLabel(null)
    setEditingName("")
    setEditingCategory(undefined)
  }, [])

  const addClimbLabel = useCallback((climb: ClimbSegment) => {
    const newLabel: LabelPoint = {
      id: `climb-${Date.now()}-${Math.random()}`,
      distance: climb.peakDistance,
      elevation: climb.peakElevation,
      name: climb.name,
      category: climb.category!,
    }

    setLabels((prev) => [...prev, newLabel].sort((a, b) => a.distance - b.distance))
  }, [])

  const downloadImage = useCallback(() => {
    if (!canvasRef.current) return

    const link = document.createElement("a")
    link.download = "elevation-profile.png"
    link.href = canvasRef.current.toDataURL()
    link.click()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">GPX Elevation Profile Generator</h1>
          <p className="text-gray-600">Upload a GPX file to generate a Tour de France-style elevation profile</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload GPX File
                </CardTitle>
                <CardDescription>Select a GPX file to generate the elevation profile</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".gpx"
                      onChange={handleFileUpload}
                      className="cursor-pointer"
                    />
                  </div>
                  {gpxData && (
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        <strong>Distance:</strong> {gpxData.totalDistance.toFixed(1)} km
                      </p>
                      <p>
                        <strong>Elevation Gain:</strong> {gpxData.totalElevationGain.toFixed(0)} m
                      </p>
                      <p>
                        <strong>Max Elevation:</strong> {gpxData.maxElevation.toFixed(0)} m
                      </p>
                      <p>
                        <strong>Min Elevation:</strong> {gpxData.minElevation.toFixed(0)} m
                      </p>
                      <p>
                        <strong>Climbs Detected:</strong> {detectedClimbs.length}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {detectedClimbs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Detected Climbs
                  </CardTitle>
                  <CardDescription>Automatically detected climbs from your GPX data</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {detectedClimbs.map((climb, index) => {
                      const isAlreadyAdded = labels.some((label) => Math.abs(label.distance - climb.peakDistance) < 0.1)
                      return (
                        <div
                          key={index}
                          className="bg-gray-100 p-3 rounded text-sm hover:bg-gray-200 transition-colors"
                          onMouseEnter={() => !isAlreadyAdded && setHoveredClimb(climb)}
                          onMouseLeave={() => setHoveredClimb(null)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">{climb.name}</span>
                              {climb.category && (
                                <span
                                  className={`ml-2 px-1 py-0.5 rounded text-xs text-white ${
                                    climb.category === "HC"
                                      ? "bg-red-600"
                                      : climb.category === "1"
                                        ? "bg-red-500"
                                        : climb.category === "2"
                                          ? "bg-orange-500"
                                          : climb.category === "3"
                                            ? "bg-yellow-500"
                                            : "bg-green-500"
                                  }`}
                                >
                                  {climb.category}
                                </span>
                              )}
                            </div>
                            {climb.category && !isAlreadyAdded && (
                              <Button variant="outline" size="sm" onClick={() => addClimbLabel(climb)}>
                                Add
                              </Button>
                            )}
                            {isAlreadyAdded && <span className="text-xs text-green-600 font-medium">Added</span>}
                          </div>
                          <div className="text-gray-600 mt-1">
                            <div>
                              {climb.length.toFixed(1)} km • {climb.elevationGain.toFixed(0)}m gain
                            </div>
                            <div>
                              {climb.averageGradient.toFixed(1)}% avg • Score: {climb.score.toFixed(0)}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {gpxData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Customize Start/Finish
                  </CardTitle>
                  <CardDescription>Rename the start and finish points</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="start-name">Start Point Name</Label>
                      <Input
                        id="start-name"
                        value={startName}
                        onChange={(e) => setStartName(e.target.value)}
                        placeholder="Enter start location name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="finish-name">Finish Point Name</Label>
                      <Input
                        id="finish-name"
                        value={finishName}
                        onChange={(e) => setFinishName(e.target.value)}
                        placeholder="Enter finish location name"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {gpxData && (
              <Button onClick={downloadImage} className="w-full whitespace-normal text-wrap">
                <Download className="h-4 w-4 mr-2" />
                Download Profile Image
              </Button>
            )}
          </div>

          <div className="lg:col-span-3 space-y-6">
            {gpxData ? (
              <Card>
                <CardContent className="p-6">
                  <ElevationProfile
                    ref={canvasRef}
                    gpxData={gpxData}
                    labels={labels}
                    hoveredClimb={hoveredClimb}
                    onProfileClick={handleProfileClick}
                    onLabelUpdate={handleLabelUpdate}
                    isAddingLabel={isAddingLabel}
                    startName={startName}
                    finishName={finishName}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Upload className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No GPX file uploaded</h3>
                  <p className="text-gray-600">Upload a GPX file to see the elevation profile</p>
                </CardContent>
              </Card>
            )}

            {gpxData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Labels
                  </CardTitle>
                  <CardDescription>Manage custom labels and automatically generated climb markers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm text-gray-700">Add New Label</h4>
                      <div className="space-y-2">
                        <Label htmlFor="label-name">Label Name</Label>
                        <Input
                          id="label-name"
                          value={newLabelName}
                          onChange={(e) => setNewLabelName(e.target.value)}
                          placeholder="Enter location name"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Category (optional)</Label>
                        <div className="flex flex-wrap gap-2">
                          {(["HC", "1", "2", "3", "4"] as const).map((cat) => (
                            <Button
                              key={cat}
                              variant={selectedCategory === cat ? "default" : "outline"}
                              size="sm"
                              onClick={() => setSelectedCategory(selectedCategory === cat ? undefined : cat)}
                              className={`w-10 h-8 ${
                                cat === "HC"
                                  ? "bg-red-600 hover:bg-red-700 text-white"
                                  : cat === "1"
                                    ? "bg-red-500 hover:bg-red-600 text-white"
                                    : cat === "2"
                                      ? "bg-orange-500 hover:bg-orange-600 text-white"
                                      : cat === "3"
                                        ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                                        : "bg-green-500 hover:bg-green-600 text-white"
                              } ${selectedCategory === cat ? "" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                            >
                              {cat}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <Button
                        onClick={() => setIsAddingLabel(!isAddingLabel)}
                        variant={isAddingLabel ? "destructive" : "default"}
                        className="w-full"
                        disabled={!newLabelName.trim()}
                      >
                        {isAddingLabel ? "Cancel Adding Label" : "Start Adding Label"}
                      </Button>

                      {isAddingLabel && (
                        <p className="text-sm text-blue-600 text-center">
                          Click on the elevation profile above to add the label at that location
                        </p>
                      )}
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium text-sm text-gray-700">Current Labels ({labels.length})</h4>
                      {labels.length > 0 ? (
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {labels.map((label) => (
                            <div
                              key={label.id}
                              className="flex items-center justify-between bg-gray-100 p-3 rounded text-sm"
                            >
                              {editingLabel === label.id ? (
                                <div className="flex-1 space-y-2">
                                  <Input
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    className="h-7 text-sm"
                                    placeholder="Label name"
                                  />
                                  <div className="flex gap-1">
                                    {(["HC", "1", "2", "3", "4"] as const).map((cat) => (
                                      <Button
                                        key={cat}
                                        variant={editingCategory === cat ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setEditingCategory(editingCategory === cat ? undefined : cat)}
                                        className={`w-6 h-6 text-xs ${
                                          cat === "HC"
                                            ? "bg-red-600 hover:bg-red-700 text-white"
                                            : cat === "1"
                                              ? "bg-red-500 hover:bg-red-600 text-white"
                                              : cat === "2"
                                                ? "bg-orange-500 hover:bg-orange-600 text-white"
                                                : cat === "3"
                                                  ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                                                  : "bg-green-500 hover:bg-green-600 text-white"
                                        } ${
                                          editingCategory === cat ? "" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                        }`}
                                      >
                                        {cat}
                                      </Button>
                                    ))}
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={saveEditingLabel}
                                      className="h-6 w-6 p-0"
                                    >
                                      <Check className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={cancelEditingLabel}
                                      className="h-6 w-6 p-0"
                                    >
                                      <XIcon className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{label.name}</span>
                                      {label.category && (
                                        <span
                                          className={`px-1 py-0.5 rounded text-xs text-white ${
                                            label.category === "HC"
                                              ? "bg-red-600"
                                              : label.category === "1"
                                                ? "bg-red-500"
                                                : label.category === "2"
                                                  ? "bg-orange-500"
                                                  : label.category === "3"
                                                    ? "bg-yellow-500"
                                                    : "bg-green-500"
                                          }`}
                                        >
                                          {label.category}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-gray-600 text-xs mt-1">
                                      {label.distance.toFixed(1)} km • {label.elevation.toFixed(0)} m
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => startEditingLabel(label)}
                                      className="h-6 w-6 p-0"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeLabel(label.id)}
                                      className="h-6 w-6 p-0"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">
                          No labels added yet. Add custom labels or use detected climbs above.
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
