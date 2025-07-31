"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Download, MapPin, X } from "lucide-react"
import { ElevationProfile } from "../components/elevation-profile"
import { parseGPX, type GPXData } from "../lib/gpx-parser"

interface LabelPoint {
  id: string
  distance: number
  elevation: number
  name: string
  category?: "HC" | "1" | "2" | "3" | "4"
}

export default function GPXElevationProfiler() {
  const [gpxData, setGpxData] = useState<GPXData | null>(null)
  const [labels, setLabels] = useState<LabelPoint[]>([])
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

  const removeLabel = useCallback((id: string) => {
    setLabels((prev) => prev.filter((label) => label.id !== id))
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
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {gpxData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Add Labels
                  </CardTitle>
                  <CardDescription>Click on the profile to add location labels</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
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
                      <div className="flex gap-2">
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

                    {labels.length > 0 && (
                      <div className="space-y-2">
                        <Label>Current Labels</Label>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {labels.map((label) => (
                            <div
                              key={label.id}
                              className="flex items-center justify-between bg-gray-100 p-2 rounded text-sm"
                            >
                              <div>
                                <span className="font-medium">{label.name}</span>
                                {label.category && (
                                  <span
                                    className={`ml-2 px-1 py-0.5 rounded text-xs text-white ${
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
                                <div className="text-gray-600">
                                  {label.distance.toFixed(1)} km • {label.elevation.toFixed(0)} m
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeLabel(label.id)}
                                className="h-6 w-6 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
              <Button onClick={downloadImage} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download Profile Image
              </Button>
            )}
          </div>

          <div className="lg:col-span-3">
            {gpxData ? (
              <Card>
                <CardContent className="p-6">
                  <ElevationProfile
                    ref={canvasRef}
                    gpxData={gpxData}
                    labels={labels}
                    onProfileClick={handleProfileClick}
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
          </div>
        </div>
      </div>
    </div>
  )
}
