interface RateLimitRecord {
  timestamps: number[];
}

export class MemoryRateLimiter {
  private records = new Map<string, RateLimitRecord>();
  private maxRequests: number;
  private windowMs: number;
  private readonly maxKeys: number;

  constructor(maxRequests: number, windowMs: number, maxKeys = 10_000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.maxKeys = maxKeys;
  }

  isRateLimited(key: string): boolean {
    const now = Date.now();
    this.evictExpired(now);
    const record = this.records.get(key) || { timestamps: [] };

    // Lọc bỏ các timestamp ngoài khoảng thời gian window
    record.timestamps = record.timestamps.filter((ts) => now - ts < this.windowMs);

    if (record.timestamps.length >= this.maxRequests) {
      this.records.set(key, record);
      return true;
    }

    if (!this.records.has(key) && this.records.size >= this.maxKeys) {
      // Fail closed when the bounded local fallback is saturated.
      return true;
    }
    record.timestamps.push(now);
    this.records.set(key, record);
    return false;
  }

  reset(key: string): void {
    this.records.delete(key);
  }

  private evictExpired(now: number): void {
    for (const [key, record] of this.records) {
      if (record.timestamps.every((timestamp) => now - timestamp >= this.windowMs)) {
        this.records.delete(key);
      }
    }
  }
}

// Rate limiter cho donor submit: 10 submit / giờ / IP (SRS-002)
export const donationSubmitLimiter = new MemoryRateLimiter(10, 60 * 60 * 1000);

// Rate limiter cho admin login: 5 lần sai / 15 phút / IP (SRS-060)
export const adminLoginLimiter = new MemoryRateLimiter(5, 15 * 60 * 1000);

