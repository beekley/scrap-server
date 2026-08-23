import * as u from "safe-units";

const Basis = {
  operations: "op",
  storage: "B",
  time: "s",
  power: "W",
  temperature: "°C",
} as const;

export type GameBasis = typeof Basis;

export const GameUnitSystem = u.UnitSystem.from<GameBasis>({
  operations: "op",
  storage: "B",
  time: "s",
  power: "W",
  temperature: "°C",
});

// ==========================================
// Base Dimensions
// ==========================================

export const operations = u.Measure.dimension(GameUnitSystem, "operations");
export const bytes = u.Measure.dimension(GameUnitSystem, "storage");
export const seconds = u.Measure.dimension(GameUnitSystem, "time");
export const watts = u.Measure.dimension(GameUnitSystem, "power");
export const celsius = u.Measure.dimension(GameUnitSystem, "temperature");

// ==========================================
// Quantities & Types
// ==========================================

// Base Quantities
export const Operations = operations;
export type Operations<N = number> = u.LiftMeasure<typeof operations, N>;

export const Storage = bytes;
export type Storage<N = number> = u.LiftMeasure<typeof bytes, N>;

export const Time = seconds;
export type Time<N = number> = u.LiftMeasure<typeof seconds, N>;

export const Power = watts;
export type Power<N = number> = u.LiftMeasure<typeof watts, N>;

export const Temperature = celsius;
export type Temperature<N = number> = u.LiftMeasure<typeof celsius, N>;

// Derived Quantities
export const OperationsPerSecond = Operations.over(Time);
export type OperationsPerSecond<N = number> = u.LiftMeasure<typeof OperationsPerSecond, N>;

export const Throughput = Storage.over(Time);
export type Throughput<N = number> = u.LiftMeasure<typeof Throughput, N>;

export const DataPerOperation = Storage.over(Operations);
export type DataPerOperation<N = number> = u.LiftMeasure<typeof DataPerOperation, N>;

// ==========================================
// Unit Measures
// ==========================================

// Operations
export const ops = operations.withSymbol("op");
export const kops = u.kilo(ops);
export const mops = u.mega(ops);
export const gops = u.giga(ops);

// Storage
export const B = bytes.withSymbol("B");
export const KB = u.kilo(bytes);
export const MB = u.mega(bytes);
export const GB = u.giga(bytes);
export const TB = u.tera(bytes);

export const KiB = u.kibi(bytes);
export const MiB = u.mebi(bytes);
export const GiB = u.gibi(bytes);
export const TiB = u.tebi(bytes);

// Time
export const s = seconds.withSymbol("s");
export const min = u.Measure.of(60, seconds, "min");
export const h = u.Measure.of(3600, seconds, "h");

// Operations Per Second
export const opsPerSecond = operations.per(seconds).withSymbol("op/s");
export const kopsPerSecond = kops.per(seconds).withSymbol("Kop/s");
export const mopsPerSecond = mops.per(seconds).withSymbol("Mop/s");
export const gopsPerSecond = gops.per(seconds).withSymbol("Gop/s");

// Throughput
export const bytesPerSecond = bytes.per(seconds).withSymbol("B/s");
export const kBPerSecond = KB.per(seconds).withSymbol("KB/s");
export const mBPerSecond = MB.per(seconds).withSymbol("MB/s");
export const gBPerSecond = GB.per(seconds).withSymbol("GB/s");

// Data per Operation
export const bytesPerOp = bytes.per(operations).withSymbol("B/op");
export const megabytesPerOp = MB.per(operations).withSymbol("MB/op");

// Power
export const W = watts.withSymbol("W");
export const mW = u.milli(watts);
export const kW = u.kilo(watts);

// Temperature
export const degC = celsius.withSymbol("°C");