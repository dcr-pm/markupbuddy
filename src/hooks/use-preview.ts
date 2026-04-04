"use client";

import { useState, useCallback } from "react";

export type DeviceMode = "desktop" | "mobile";

export function usePreview() {
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [darkMode, setDarkMode] = useState(false);

  const toggleDevice = useCallback(() => {
    setDeviceMode((prev) => (prev === "desktop" ? "mobile" : "desktop"));
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => !prev);
  }, []);

  const deviceWidth = deviceMode === "desktop" ? 600 : 375;

  return {
    deviceMode,
    darkMode,
    deviceWidth,
    toggleDevice,
    toggleDarkMode,
    setDeviceMode,
    setDarkMode,
  };
}
