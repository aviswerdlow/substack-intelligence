import { EventEmitter } from 'events';

export interface MemoryReading {
  timestamp: number;
  heapUsedMB: number;
  heapTotalMB: number;
  rssMB: number;
  externalMB: number;
  arrayBuffersMB: number;
}

export interface MemoryTrend {
  increasing: boolean;
  averageMB: number;
  peakMB: number;
  currentMB: number;
  changeRate: number;
}

export class MemoryMonitor extends EventEmitter {
  private readings: MemoryReading[] = [];
  private readonly maxReadings: number;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly checkIntervalMs: number;
  private readonly warningThresholdMB: number;
  private readonly criticalThresholdMB: number;

  constructor(
    maxReadings: number = 10,
    checkIntervalMs: number = 30000,
    warningThresholdMB: number = 400,
    criticalThresholdMB: number = 500
  ) {
    super();
    this.maxReadings = maxReadings;
    this.checkIntervalMs = checkIntervalMs;
    this.warningThresholdMB = warningThresholdMB;
    this.criticalThresholdMB = criticalThresholdMB;
  }

  start(): void {
    if (this.intervalId) {
      return;
    }

    this.collectReading();

    this.intervalId = setInterval(() => {
      this.collectReading();
      this.checkThresholds();
      this.cleanupOldReadings();
    }, this.checkIntervalMs);

    if (typeof this.intervalId.unref === 'function') {
      this.intervalId.unref();
    }
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private collectReading(): void {
    const memUsage = process.memoryUsage();
    
    const reading: MemoryReading = {
      timestamp: Date.now(),
      heapUsedMB: memUsage.heapUsed / 1024 / 1024,
      heapTotalMB: memUsage.heapTotal / 1024 / 1024,
      rssMB: memUsage.rss / 1024 / 1024,
      externalMB: memUsage.external / 1024 / 1024,
      arrayBuffersMB: memUsage.arrayBuffers / 1024 / 1024
    };

    this.readings.push(reading);
    this.emit('reading', reading);
  }

  private checkThresholds(): void {
    const latest = this.getLatestReading();
    if (!latest) return;

    if (latest.heapUsedMB >= this.criticalThresholdMB) {
      this.emit('critical', {
        heapUsedMB: latest.heapUsedMB,
        threshold: this.criticalThresholdMB
      });
    } else if (latest.heapUsedMB >= this.warningThresholdMB) {
      this.emit('warning', {
        heapUsedMB: latest.heapUsedMB,
        threshold: this.warningThresholdMB
      });
    }
  }

  private cleanupOldReadings(): void {
    if (this.readings.length > this.maxReadings) {
      this.readings = this.readings.slice(-this.maxReadings);
    }
  }

  getLatestReading(): MemoryReading | null {
    return this.readings.length > 0 ? this.readings[this.readings.length - 1] : null;
  }

  getReadings(): MemoryReading[] {
    return [...this.readings];
  }

  getTrend(): MemoryTrend | null {
    if (this.readings.length < 2) {
      return null;
    }

    const heapValues = this.readings.map(r => r.heapUsedMB);
    const averageMB = heapValues.reduce((sum, val) => sum + val, 0) / heapValues.length;
    const peakMB = Math.max(...heapValues);
    const currentMB = heapValues[heapValues.length - 1];

    const firstHalf = heapValues.slice(0, Math.floor(heapValues.length / 2));
    const secondHalf = heapValues.slice(Math.floor(heapValues.length / 2));
    const firstHalfAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    const changeRate = secondHalfAvg - firstHalfAvg;

    return {
      increasing: changeRate > 0,
      averageMB: Math.round(averageMB * 100) / 100,
      peakMB: Math.round(peakMB * 100) / 100,
      currentMB: Math.round(currentMB * 100) / 100,
      changeRate: Math.round(changeRate * 100) / 100
    };
  }

  getStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    heapUsedMB: number;
    heapPercentage: number;
    trend: MemoryTrend | null;
  } {
    const latest = this.getLatestReading();
    if (!latest) {
      return {
        status: 'healthy',
        heapUsedMB: 0,
        heapPercentage: 0,
        trend: null
      };
    }

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (latest.heapUsedMB >= this.criticalThresholdMB) {
      status = 'critical';
    } else if (latest.heapUsedMB >= this.warningThresholdMB) {
      status = 'warning';
    }

    const heapPercentage = (latest.heapUsedMB / latest.heapTotalMB) * 100;

    return {
      status,
      heapUsedMB: Math.round(latest.heapUsedMB * 100) / 100,
      heapPercentage: Math.round(heapPercentage * 100) / 100,
      trend: this.getTrend()
    };
  }

  forceGarbageCollection(): void {
    if (global.gc) {
      global.gc();
      this.collectReading();
    }
  }
}

const globalMemoryMonitor = new MemoryMonitor();
globalMemoryMonitor.start();

export default globalMemoryMonitor;