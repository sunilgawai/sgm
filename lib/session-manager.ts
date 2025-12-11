// lib/session-manager.ts
export interface SessionData {
  orderId: string;
  submissionId: string | null;
  paymentStatus: "pending" | "paid" | "failed";
  completedSteps: number[];
  buyerInfo: {
    email: string;
    phone: string;
    name?: string;
  } | null;
  timestamp: number;
  expiresAt: number;
}

const SESSION_STORAGE_KEY = "ai_clone_session";
const SESSION_EXPIRY_DAYS = 90; // 90 days session validity

export class SessionManager {
  static save(data: Omit<SessionData, "timestamp" | "expiresAt">): void {
    try {
      const timestamp = Date.now();
      const expiresAt = timestamp + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

      const sessionData: SessionData = {
        ...data,
        timestamp,
        expiresAt,
      };

      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
      console.log("✅ Session saved:", {
        orderId: data.orderId,
        completedSteps: data.completedSteps,
        expiresIn: `${SESSION_EXPIRY_DAYS} days`,
      });
    } catch (error) {
      console.error("❌ Failed to save session:", error);
    }
  }

  static load(): SessionData | null {
    try {
      const data = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!data) {
        console.log("ℹ️ No existing session found");
        return null;
      }

      const session: SessionData = JSON.parse(data);

      // Check if session is expired
      if (Date.now() > session.expiresAt) {
        console.log("⚠️ Session expired, clearing...");
        this.clear();
        return null;
      }

      const daysRemaining = Math.ceil(
        (session.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)
      );
      console.log("✅ Session loaded:", {
        orderId: session.orderId,
        completedSteps: session.completedSteps,
        daysRemaining,
      });

      return session;
    } catch (error) {
      console.error("❌ Failed to load session:", error);
      this.clear();
      return null;
    }
  }

  static update(
    updates: Partial<Omit<SessionData, "timestamp" | "expiresAt">>
  ): void {
    const existing = this.load();
    if (existing) {
      this.save({
        orderId: updates.orderId ?? existing.orderId,
        submissionId: updates.submissionId ?? existing.submissionId,
        paymentStatus: updates.paymentStatus ?? existing.paymentStatus,
        completedSteps: updates.completedSteps ?? existing.completedSteps,
        buyerInfo: updates.buyerInfo ?? existing.buyerInfo,
      });
    }
  }

  static clear(): void {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      console.log("🗑️ Session cleared");
    } catch (error) {
      console.error("❌ Failed to clear session:", error);
    }
  }

  static isValid(session: SessionData | null): boolean {
    if (!session) return false;
    if (Date.now() > session.expiresAt) return false;
    if (!session.orderId) return false;
    return true;
  }

  static getDaysRemaining(session: SessionData): number {
    return Math.ceil((session.expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
  }

  static getDaysSinceCreation(session: SessionData): number {
    return Math.floor((Date.now() - session.timestamp) / (1000 * 60 * 60 * 24));
  }
}
