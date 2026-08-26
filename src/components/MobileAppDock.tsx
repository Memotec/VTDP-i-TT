import React from 'react';
import { 
  Package, 
  Camera, 
  BarChart3, 
  FileText, 
  Settings, 
  ShieldAlert
} from 'lucide-react';

export type MobileTab = 'inventory' | 'stats' | 'reports' | 'admin';

interface MobileAppDockProps {
  currentTab: MobileTab;
  onSelectTab: (tab: MobileTab) => void;
  onOpenScanner: () => void;
  lowStockCount: number;
  missingCount: number;
  role: 'admin' | 'guest';
}

export const MobileAppDock: React.FC<MobileAppDockProps> = ({
  currentTab,
  onSelectTab,
  onOpenScanner,
  lowStockCount,
  missingCount,
  role,
}) => {
  const handleTabClick = (tab: MobileTab) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(25);
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
      {/* Background glass container with safe bottom inset */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] px-2 pt-2 pb-safe">
        <div className="flex items-center justify-around relative max-w-lg mx-auto">
          
          {/* TAB 1: KHO VẬT TƯ */}
          <button
            onClick={() => handleTabClick('inventory')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all cursor-pointer relative ${
              currentTab === 'inventory'
                ? 'text-indigo-600 dark:text-indigo-400 font-black scale-105'
                : 'text-slate-500 dark:text-slate-400 font-semibold hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Package className="w-5 h-5" />
              {missingCount > 0 && (
                <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center animate-pulse">
                  {missingCount > 9 ? '9+' : missingCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 tracking-tight">Kho VT</span>
            {currentTab === 'inventory' && (
              <span className="w-1 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full mt-0.5"></span>
            )}
          </button>

          {/* TAB 2: THỐNG KÊ */}
          <button
            onClick={() => handleTabClick('stats')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all cursor-pointer relative ${
              currentTab === 'stats'
                ? 'text-indigo-600 dark:text-indigo-400 font-black scale-105'
                : 'text-slate-500 dark:text-slate-400 font-semibold hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <BarChart3 className="w-5 h-5" />
              {lowStockCount > 0 && (
                <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 bg-amber-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                  !
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 tracking-tight">Thống Kê</span>
            {currentTab === 'stats' && (
              <span className="w-1 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full mt-0.5"></span>
            )}
          </button>

          {/* CENTER: CAMERA SCAN FLOATING BUTTON */}
          <div className="flex-1 flex justify-center -translate-y-4">
            <button
              onClick={handleScanClick}
              className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-indigo-400 text-white flex flex-col items-center justify-center shadow-lg shadow-indigo-600/40 border-4 border-white dark:border-slate-900 active:scale-95 transition-all cursor-pointer group"
              title="Quét mã QR & Barcode"
            >
              <Camera className="w-6 h-6 animate-pulse group-hover:scale-110 transition-transform" />
              <span className="text-[8px] font-black uppercase tracking-wider -mt-0.5">Quét</span>
            </button>
          </div>

          {/* TAB 3: BÁO CÁO & PHIẾU */}
          <button
            onClick={() => handleTabClick('reports')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all cursor-pointer relative ${
              currentTab === 'reports'
                ? 'text-indigo-600 dark:text-indigo-400 font-black scale-105'
                : 'text-slate-500 dark:text-slate-400 font-semibold hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-[10px] mt-1 tracking-tight">Báo Cáo</span>
            {currentTab === 'reports' && (
              <span className="w-1 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full mt-0.5"></span>
            )}
          </button>

          {/* TAB 4: QUẢN TRỊ / CÀI ĐẶT */}
          <button
            onClick={() => handleTabClick('admin')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all cursor-pointer relative ${
              currentTab === 'admin'
                ? 'text-indigo-600 dark:text-indigo-400 font-black scale-105'
                : 'text-slate-500 dark:text-slate-400 font-semibold hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <div className="relative">
              {role === 'admin' ? (
                <ShieldAlert className="w-5 h-5 text-indigo-500" />
              ) : (
                <Settings className="w-5 h-5" />
              )}
            </div>
            <span className="text-[10px] mt-1 tracking-tight">
              {role === 'admin' ? 'Quản Trị' : 'Cài Đặt'}
            </span>
            {currentTab === 'admin' && (
              <span className="w-1 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full mt-0.5"></span>
            )}
          </button>

        </div>
      </div>
    </div>
  );
};
