import UAParser from "ua-parser-js";
import { v4 as uuidv4 } from "uuid";

export default function getDeviceInfo() {
  const parser = new UAParser();
  const result = parser.getResult();

  let deviceId = localStorage.getItem("deviceId");

  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem("deviceId", deviceId);
  }

  return {
    deviceId,
    deviceType: result.device.type || "desktop",
    deviceOS: result.os.name || "Unknown",
    deviceOSVersion: result.os.version || "Unknown",
    appVersion: import.meta.env.VITE_APP_VERSION || "1.0.0",
  };
}