import * as u from "safe-units";
import {
  B,
  degC,
  opsPerSecond,
  W,
  bytesPerSecond,
  type Part,
  type ServerNode,
  type Temperature,
  type OperationsPerSecond,
  type Storage,
  type Throughput,
  type Power,
} from "./types";

export interface ServerAggregates {
  totalCompute: OperationsPerSecond;
  totalMemory: Storage;
  totalStorage: Storage;
  maxIOBandwidth: Throughput;
  totalPowerDraw: Power;
  totalPowerCapacity: Power;
  netCoolingCapacity: Power; // Total cooling capacity minus active power draw
  currentTemperature: Temperature;
  isOverloaded: boolean; // True if powerDraw > powerCapacity
}

/**
 * Calculates derived aggregates dynamically for a server node or list of installed parts.
 */
export function calculateServerAggregates(
  serverOrParts: ServerNode | Part[],
  ambientTemperature: Temperature = u.Measure.of(25, degC)
): ServerAggregates {
  const parts = Array.isArray(serverOrParts) ? serverOrParts : serverOrParts.installedParts;

  let totalCompute: OperationsPerSecond = u.Measure.of(0, opsPerSecond);
  let totalMemory: Storage = u.Measure.of(0, B);
  let totalStorage: Storage = u.Measure.of(0, B);
  let maxIOBandwidth: Throughput = u.Measure.of(0, bytesPerSecond);
  let totalPowerDraw: Power = u.Measure.of(0, W);
  let totalPowerCapacity: Power = u.Measure.of(0, W);
  const totalCoolingCapacity: Power = u.Measure.of(0, W);

  for (const part of parts) {
    // Power Draw
    totalPowerDraw = totalPowerDraw.plus(part.powerDraw);

    // Kind-specific aggregates
    switch (part.kind) {
      case "CPU":
        totalCompute = totalCompute.plus(part.computeRate);
        break;

      case "RAM":
        totalMemory = totalMemory.plus(part.memoryCapacity);
        if (part.ioBandwidth.gt(maxIOBandwidth)) {
          maxIOBandwidth = part.ioBandwidth;
        }
        break;

      case "STORAGE":
        totalStorage = totalStorage.plus(part.storageCapacity);
        if (part.ioBandwidth.gt(maxIOBandwidth)) {
          maxIOBandwidth = part.ioBandwidth;
        }
        break;

      case "STORAGE_DEVICE":
        totalStorage = totalStorage.plus(part.storageCapacity);
        break;

      case "PSU":
        totalPowerCapacity = totalPowerCapacity.plus(part.powerCapacity);
        break;

      case "MOTHERBOARD":
        break;

      case "CASE":
        break;
    }
  }

  const netCoolingCapacity = totalCoolingCapacity.minus(totalPowerDraw);
  const isOverloaded = totalPowerDraw.gt(totalPowerCapacity);

  return {
    totalCompute,
    totalMemory,
    totalStorage,
    maxIOBandwidth,
    totalPowerDraw,
    totalPowerCapacity,
    netCoolingCapacity,
    currentTemperature: ambientTemperature,
    isOverloaded,
  };
}

