import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Share2, 
  PlusSquare, 
  Download, 
  CheckCircle2, 
  X, 
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface MobileAppInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileAppInstallModal: React.FC<MobileAppInstallModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iosDevice);

    // Detect standalone PWA mode
    const standaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    setIsStandalone(standaloneMode);

    // Capture beforeinstallprompt on Android/Chrome
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Detect installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[90000] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-slide-up-mobile pb-safe">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md p-2.5 border border-white/20 shadow-inner flex items-center justify-center">
              <Smartphone className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-indigo-200 text-xs font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Trải Nghiệm Ứng Dụng Mobile</span>
              </div>
              <h3 className="text-xl font-black tracking-tight text-white mt-0.5">
                Cài Đặt App Đội TT
              </h3>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5">
          {isStandalone ? (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-extrabold text-sm text-emerald-900 dark:text-emerald-300">
                  Bạn đang sử dụng App ở chế độ Toàn Màn Hình!
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                  Ứng dụng đã được tích hợp đầy đủ tính năng quét camera, làm việc ngoại tuyến và cập nhật tức thì.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Feature Highlights */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="font-black text-indigo-600 dark:text-indigo-400 block">⚡ Mở 1 Chạm</span>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-snug">
                    Biểu tượng độc lập trên màn hình chính không cần nhập lại URL.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="font-black text-emerald-600 dark:text-emerald-400 block">📷 Quét QR Siêu Nhanh</span>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-snug">
                    Tận dụng camera góc rộng & phản hồi rung haptic chính xác.
                  </p>
                </div>
              </div>

              {/* Instructions per OS */}
              {isIOS ? (
                /* iOS Safari instructions */
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4.5 space-y-3">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Share2 className="w-4 h-4 text-indigo-500" />
                    Hướng dẫn thêm vào màn hình chính iPhone / iPad:
                  </h4>
                  <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-2.5 list-decimal list-inside font-medium">
                    <li className="leading-relaxed">
                      Nhấn vào nút <strong className="text-indigo-600 dark:text-indigo-400 font-black">Chia sẻ (Share <Share2 className="w-3.5 h-3.5 inline mx-0.5" />)</strong> ở thanh dưới trình duyệt Safari.
                    </li>
                    <li className="leading-relaxed">
                      Cuộn xuống và chọn mục <strong className="text-slate-900 dark:text-white font-black">"Thêm vào MH chính" (<PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-indigo-500" /> Add to Home Screen)</strong>.
                    </li>
                    <li className="leading-relaxed">
                      Nhấn <strong className="text-indigo-600 dark:text-indigo-400 font-black">Thêm (Add)</strong> ở góc trên bên phải để hoàn tất.
                    </li>
                  </ol>
                </div>
              ) : (
                /* Android / Chrome prompt */
                <div className="space-y-3">
                  {deferredPrompt ? (
                    <button
                      onClick={handleInstallClick}
                      className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <Download className="w-4.5 h-4.5" />
                      CÀI ĐẶT ỨNG DỤNG NGAY
                    </button>
                  ) : (
                    <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                      <h4 className="font-extrabold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Download className="w-4 h-4 text-indigo-500" />
                        Cách cài đặt trên trình duyệt Android:
                      </h4>
                      <p className="leading-relaxed">
                        Nhấn vào biểu tượng <strong className="text-slate-900 dark:text-white font-bold">Menu 3 chấm (⋮)</strong> ở góc phải trình duyệt và chọn <strong className="text-indigo-600 dark:text-indigo-400 font-bold">"Cài đặt ứng dụng"</strong> hoặc <strong className="text-indigo-600 dark:text-indigo-400 font-bold">"Thêm vào màn hình chính"</strong>.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-bold text-xs transition-colors cursor-pointer text-center"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
