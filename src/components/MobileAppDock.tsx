import React from 'react';
import { 
  Package, 
  Camera, 
  Layers, 
  FileText, 
  Settings, 
  ShieldAlert
} from 'lucide-react';

export type MobileTab = 'inventory' | 'dispatched' | 'stats' | 'reports' | 'admin';

interface MobileAppDockProps {
  currentTab: MobileTab;
  onSelectTab: (tab: MobileTab) => void;
  onOpenScanner: () => void;
  lowStockCount: number;
  missingCount: number;
  dispatchedCount?: number;
  role: 'admin' | 'guest';
}

export const MobileAppDock: React.FC<MobileAppDockProps> = ({
  currentTab,
  onSelectTab,
  onOpenScanner,
  lowStockCount,
  missingCount,
  dispatchedCount = 0,
  role,
}) => {
  const handleTabClick = (tab: MobileTab) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20);
    }
    onSelectTab(tab);
  };

  const handleScanClick = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([30, 40, 30]);
    }
    onOpenScanner();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[50000] md:hidden">
      {/* Background container with blur & safe bottom inset */}
      <div className="bg-white/95 dark:bg-[#131B2E]/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] px-2 pt-2 pb-[max(env(safe-area-inset-bottom),0.625rem)]">
        <div className="flex items-center justify-around relative max-w-lg mx-auto">
          
          {/* TAB 1: KHO VẬT TƯ */}
          <button
            type="button"
            onClick={() => handleTabClick('inventory')}
            className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all cursor-pointer relative ${
              currentTab === 'inventory'
                ? 'text-[#2563EB] dark:text-blue-400 font-black scale-105'
                : 'text-slate-500 dark:text-slate-400 font-semibold hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Package className="w-5 h-5" />
              {missingCount > 0 && (
                <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 bg-rose-600 text-white text-[8px] font-black rounded-full flex items-center justify-center animate-pulse">
                  {missingCount > 9 ? '9+' : missingCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight whitespace-nowrap">Kho VT</span>
            {currentTab === 'inventory' && (
              <span className="w-1.5 h-1.5 bg-[#2563EB] dark:bg-blue-400 rounded-full mt-0.5"></span>
            )}
          </button>

          {/* TAB 2: BÀN GIAO */}
          <button
            type="button"
            onClick={() => handleTabClick('dispatched')}
            className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all cursor-pointer relative ${
              currentTab === 'dispatched'
                ? 'text-[#2563EB] dark:text-blue-400 font-black scale-105'
                : 'text-slate-500 dark:text-slate-400 font-semibold hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Layers className="w-5 h-5" />
              {dispatchedCount > 0 && (
                <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 px-0.5 bg-blue-600 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                  {dispatchedCount > 99 ? '99+' : dispatchedCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight whitespace-nowrap">Bàn Giao</span>
            {currentTab === 'dispatched' && (
              <span className="w-1.5 h-1.5 bg-[#2563EB] dark:bg-blue-400 rounded-full mt-0.5"></span>
            )}
          </button>

          {/* CENTER: CAMERA SCAN FLOATING BUTTON */}
          <div className="flex-1 flex justify-center -translate-y-4">
            <button
              type="button"
              onClick={handleScanClick}
              className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#2563EB] via-blue-600 to-indigo-600 text-white flex flex-col items-center justify-center shadow-lg shadow-blue-500/35 border-4 border-white dark:border-[#131B2E] active:scale-90 transition-all cursor-pointer group"
              title="Quét mã QR & Barcode kiểm kê"
            >
              <Camera className="w-5.5 h-5.5 animate-pulse group-hover:scale-110 transition-transform" />
              <span className="text-[7.5px] font-black uppercase tracking-wider -mt-0.5">Quét</span>
            </button>
          </div>

          {/* TAB 3: BÁO CÁO & IN */}
          <button
            type="button"
            onClick={() => handleTabClick('reports')}
            className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all cursor-pointer relative ${
              currentTab === 'reports'
                ? 'text-[#2563EB] dark:text-blue-400 font-black scale-105'
                : 'text-slate-500 dark:text-slate-400 font-semibold hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <FileText className="w-5 h-5" />
              {lowStockCount > 0 && (
                <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 bg-amber-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                  !
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight whitespace-nowrap">Báo Cáo</span>
            {currentTab === 'reports' && (
              <span className="w-1.5 h-1.5 bg-[#2563EB] dark:bg-blue-400 rounded-full mt-0.5"></span>
            )}
          </button>

          {/* TAB 4: QUẢN TRỊ / CÁ NHÂN */}
          <button
            type="button"
            onClick={() => handleTabClick('admin')}
            className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all cursor-pointer relative ${
              currentTab === 'admin'
                ? 'text-[#2563EB] dark:text-blue-400 font-black scale-105'
                : 'text-slate-500 dark:text-slate-400 font-semibold hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <div className="relative">
              {role === 'admin' ? (
                <ShieldAlert className="w-5 h-5 text-amber-500" />
              ) : (
                <Settings className="w-5 h-5" />
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight whitespace-nowrap">
              {role === 'admin' ? 'Quản Trị' : 'Cá Nhân'}
            </span>
            {currentTab === 'admin' && (
              <span className="w-1.5 h-1.5 bg-[#2563EB] dark:bg-blue-400 rounded-full mt-0.5"></span>
            )}
          </button>

        </div>
      </div>
    </div>
  );
};
