"use client";

// 安全なストレージ操作のためのユーティリティ
export class SafeStorage {
  private static readonly CRITICAL_KEYS = ['theme', 'user-preferences', 'auth-token'];
  private static readonly APP_KEYS_PREFIX = 'my-fridgeai-';

  // 安全なlocalStorage操作
  static setItem(key: string, value: string): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        console.warn('localStorage is not available');
        return false;
      }

      const safeKey = this.APP_KEYS_PREFIX + key;
      localStorage.setItem(safeKey, value);
      return true;
    } catch (error) {
      console.error('Failed to set localStorage item:', error);
      return false;
    }
  }

  static getItem(key: string): string | null {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        console.warn('localStorage is not available');
        return null;
      }

      const safeKey = this.APP_KEYS_PREFIX + key;
      return localStorage.getItem(safeKey);
    } catch (error) {
      console.error('Failed to get localStorage item:', error);
      return null;
    }
  }

  static removeItem(key: string): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        console.warn('localStorage is not available');
        return false;
      }

      const safeKey = this.APP_KEYS_PREFIX + key;
      localStorage.removeItem(safeKey);
      return true;
    } catch (error) {
      console.error('Failed to remove localStorage item:', error);
      return false;
    }
  }

  // 安全なsessionStorage操作
  static setSessionItem(key: string, value: string): boolean {
    try {
      if (typeof window === 'undefined' || !window.sessionStorage) {
        console.warn('sessionStorage is not available');
        return false;
      }

      const safeKey = this.APP_KEYS_PREFIX + key;
      sessionStorage.setItem(safeKey, value);
      return true;
    } catch (error) {
      console.error('Failed to set sessionStorage item:', error);
      return false;
    }
  }

  static getSessionItem(key: string): string | null {
    try {
      if (typeof window === 'undefined' || !window.sessionStorage) {
        console.warn('sessionStorage is not available');
        return null;
      }

      const safeKey = this.APP_KEYS_PREFIX + key;
      return sessionStorage.getItem(safeKey);
    } catch (error) {
      console.error('Failed to get sessionStorage item:', error);
      return null;
    }
  }

  static removeSessionItem(key: string): boolean {
    try {
      if (typeof window === 'undefined' || !window.sessionStorage) {
        console.warn('sessionStorage is not available');
        return false;
      }

      const safeKey = this.APP_KEYS_PREFIX + key;
      sessionStorage.removeItem(safeKey);
      return true;
    } catch (error) {
      console.error('Failed to remove sessionStorage item:', error);
      return false;
    }
  }

  // 緊急クリーンアップ
  static emergencyCleanup(): { success: boolean; cleared: number; errors: string[] } {
    const result = {
      success: true,
      cleared: 0,
      errors: [] as string[]
    };

    try {
      // localStorageのクリーンアップ
      if (typeof window !== 'undefined' && window.localStorage) {
        const keysToRemove: string[] = [];

        Object.keys(localStorage).forEach(key => {
          // クリティカルキーは保持
          if (!this.CRITICAL_KEYS.includes(key) &&
            !key.startsWith(this.APP_KEYS_PREFIX + 'theme') &&
            !key.startsWith(this.APP_KEYS_PREFIX + 'user-preferences')) {
            keysToRemove.push(key);
          }
        });

        keysToRemove.forEach(key => {
          try {
            localStorage.removeItem(key);
            result.cleared++;
          } catch (error) {
            result.errors.push(`Failed to remove ${key}: ${error}`);
            result.success = false;
          }
        });
      }

      // sessionStorageは完全にクリア
      if (typeof window !== 'undefined' && window.sessionStorage) {
        try {
          const sessionKeys = Object.keys(sessionStorage);
          sessionKeys.forEach(key => {
            if (key.startsWith(this.APP_KEYS_PREFIX)) {
              sessionStorage.removeItem(key);
              result.cleared++;
            }
          });
        } catch (error) {
          result.errors.push(`Failed to clear sessionStorage: ${error}`);
          result.success = false;
        }
      }

    } catch (error) {
      result.errors.push(`Cleanup failed: ${error}`);
      result.success = false;
    }

    return result;
  }

  // ストレージの健康状態をチェック
  static checkHealth(): { healthy: boolean; issues: string[] } {
    const issues: string[] = [];

    try {
      if (typeof window === 'undefined') {
        issues.push('Window object not available');
        return { healthy: false, issues };
      }

      // localStorageチェック
      if (!window.localStorage) {
        issues.push('localStorage not available');
      } else {
        try {
          const testKey = this.APP_KEYS_PREFIX + 'health-test';
          localStorage.setItem(testKey, 'test');
          localStorage.removeItem(testKey);
        } catch (error) {
          issues.push(`localStorage test failed: ${error}`);
        }
      }

      // sessionStorageチェック
      if (!window.sessionStorage) {
        issues.push('sessionStorage not available');
      } else {
        try {
          const testKey = this.APP_KEYS_PREFIX + 'health-test';
          sessionStorage.setItem(testKey, 'test');
          sessionStorage.removeItem(testKey);
        } catch (error) {
          issues.push(`sessionStorage test failed: ${error}`);
        }
      }

      // ストレージ容量チェック
      if (window.localStorage) {
        try {
          const data = JSON.stringify({ test: 'x'.repeat(1000) });
          localStorage.setItem(this.APP_KEYS_PREFIX + 'capacity-test', data);
          localStorage.removeItem(this.APP_KEYS_PREFIX + 'capacity-test');
        } catch (error) {
          issues.push('Storage might be full');
        }
      }
    } catch (error) {
      issues.push(`Health check failed: ${error}`);
    }

    return {
      healthy: issues.length === 0,
      issues
    };
  }

  // アプリデータのバックアップ
  static backupData(): { success: boolean; data?: any; error?: string } {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return { success: false, error: 'localStorage not available' };
      }

      const backup: any = {};

      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(this.APP_KEYS_PREFIX)) {
          try {
            backup[key] = localStorage.getItem(key);
          } catch (error) {
            console.warn(`Failed to backup ${key}:`, error);
          }
        }
      });

      return { success: true, data: backup };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // アプリデータのリストア
  static restoreData(backup: any): { success: boolean; restored: number; errors: string[] } {
    const result = {
      success: true,
      restored: 0,
      errors: [] as string[]
    };

    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        result.errors.push('localStorage not available');
        result.success = false;
        return result;
      }

      Object.keys(backup).forEach(key => {
        try {
          if (key.startsWith(this.APP_KEYS_PREFIX)) {
            localStorage.setItem(key, backup[key]);
            result.restored++;
          }
        } catch (error) {
          result.errors.push(`Failed to restore ${key}: ${error}`);
          result.success = false;
        }
      });
    } catch (error) {
      result.errors.push(`Restore failed: ${error}`);
      result.success = false;
    }

    return result;
  }
}

// Reactフック
export function useSafeStorage() {
  const clearCache = () => {
    const result = SafeStorage.emergencyCleanup();
    // console.log('Cache cleared:', result);
    return result;
  };

  const checkHealth = () => {
    return SafeStorage.checkHealth();
  };

  const backup = () => {
    return SafeStorage.backupData();
  };

  const restore = (backup: any) => {
    return SafeStorage.restoreData(backup);
  };

  return {
    setItem: SafeStorage.setItem,
    getItem: SafeStorage.getItem,
    removeItem: SafeStorage.removeItem,
    setSessionItem: SafeStorage.setSessionItem,
    getSessionItem: SafeStorage.getSessionItem,
    removeSessionItem: SafeStorage.removeSessionItem,
    clearCache,
    checkHealth,
    backup,
    restore
  };
}
