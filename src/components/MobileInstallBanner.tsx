import React, { useState } from 'react';
import { Smartphone, Download, X } from 'lucide-react';

interface MobileInstallBannerProps {
  onInstall: () => void;
  isInstallable: boolean;
  isInstalled: boolean;
}

export const MobileInstallBanner: React.FC<MobileInstallBannerProps> = ({
  onInstall,
  isInstallable,
  isInstalled,
}) => {
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return sessionStorage.getItem('cns_pwa_banner_dismissed') === 'true';
      } catch {
        return false;
      }
    }
    return false;
  });

  if (isInstalled || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('cns_pwa_banner_dismissed', 'true');
    } catch {
      // ignore
    }
  };

  return (
    <div className="md:hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white px-3.5 py-2 shadow-md flex items-center justify-between gap-2.5 transition-all animate-slide-in">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20 shadow-2xs">
          <Smartphone className="w-4.5 h-4.5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black tracking-tight leading-tight truncate">
            Cài đặt App Đội TT CNS
          </p>
          <p className="text-[9.5px] text-blue-100 font-medium leading-tight truncate">
            Toàn màn hình • Quét QR nhanh • Hoạt động mượt mà
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onInstall}
          className="px-2.5 py-1 bg-white text-blue-700 hover:bg-blue-50 active:scale-95 text-[11px] font-black rounded-lg shadow-xs flex items-center gap-1 cursor-pointer transition-transform"
        >
          <Download className="w-3 h-3" />
          <span>Cài App</span>
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 text-white/70 hover:text-white rounded-lg cursor-pointer"
          title="Bỏ qua"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
