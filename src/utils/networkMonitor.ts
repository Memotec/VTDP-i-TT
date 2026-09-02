/**
 * NETWORK MONITOR UTILITY
 * Listens to browser online/offline events and provides callback hooks for sync services.
 */

type NetworkStatusListener = (isOnline: boolean) => void;

class NetworkMonitor {
  private listeners: Set<NetworkStatusListener> = new Set();
  private _isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  private handleOnline = () => {
    this._isOnline = true;
    this.notifyListeners(true);
  };

  private handleOffline = () => {
    this._isOnline = false;
    this.notifyListeners(false);
  };

  private notifyListeners(online: boolean) {
    this.listeners.forEach(listener => {
      try {
        listener(online);
      } catch (err) {
        console.error('NetworkMonitor listener error:', err);
      }
    });
  }

  public isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : this._isOnline;
  }

  public subscribe(listener: NetworkStatusListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    this.listeners.clear();
  }
}

export const networkMonitor = new NetworkMonitor();
