import React, { useMemo } from 'react';
import { Layers, CheckSquare, Activity, XCircle, Check, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AuditStats, InventoryItem } from '../types.ts';

interface StatsCardsProps {
  stats: AuditStats;
  inventory: InventoryItem[];
  onFilterLowStock?: () => void;
}

export const StatsCards: React.FC<StatsCardsProps> = React.memo(({ stats, inventory, onFilterLowStock }) => {
  const { totalOk, totalMissing, totalUnchecked, totalAll, lowStockCount, chartData, ratioOk, ratioMissing, ratioUnchecked } = useMemo(() => {
    let ok = 0;
    let missing = 0;
    let unchecked = 0;
    let lowStock = 0;

    for (let i = 0; i < inventory.length; i++) {
      const item = inventory[i];
      const qty = item.qty || 0;
      if (item.auditStatus === 'OK') {
        ok += qty;
      } else if (item.auditStatus === 'MISSING') {
        missing += qty;
      } else {
        unchecked += qty;
      }
      if (qty <= 1) {
        lowStock++;
      }
    }

    const all = ok + missing + unchecked;
    const rOk = all > 0 ? Math.round((ok / all) * 100) : 0;
    const rMissing = all > 0 ? Math.round((missing / all) * 100) : 0;
    const rUnchecked = all > 0 ? Math.round((unchecked / all) * 100) : 0;

    const data = all > 0 ? [
      { name: 'Đủ / Tốt', value: ok, color: '#10B981', ratio: rOk },
      { name: 'Thiếu / Hỏng', value: missing, color: '#EF4444', ratio: rMissing },
      { name: 'Chưa kiểm', value: unchecked, color: '#64748B', ratio: rUnchecked }
    ].filter(d => d.value > 0) : [
      { name: 'Chưa có thiết bị', value: 1, color: '#E2E8F0', ratio: 0 }
    ];

    return {
      totalOk: ok,
      totalMissing: missing,
      totalUnchecked: unchecked,
      totalAll: all,
      lowStockCount: lowStock,
      chartData: data,
      ratioOk: rOk,
      ratioMissing: rMissing,
      ratioUnchecked: rUnchecked
    };
  }, [inventory]);

  return (
    <div className="space-y-6" id="stats-section">
      {/* Top 5 Metric Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 sm:p-5 rounded-2xl shadow-xs flex items-center justify-between col-span-2 sm:col-span-1 transition-all hover:border-blue-300 dark:hover:border-blue-800">
          <div className="space-y-1">
            <p className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Danh mục quản lý</p>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stats.totalItems}</h3>
            <p className="text-xs text-slate-500 font-medium">Mã thiết bị lưu</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-[#2563EB] dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 shadow-xs">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 sm:p-5 rounded-2xl shadow-xs flex items-center justify-between transition-all hover:border-emerald-300 dark:hover:border-emerald-800">
          <div className="space-y-1">
            <p className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Tổng tồn kho</p>
            <div className="flex items-baseline gap-2 flex-wrap">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stats.totalQty}</h3>
              {lowStockCount > 0 && onFilterLowStock && (
                <button
                  type="button"
                  onClick={onFilterLowStock}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-700 animate-pulse hover:bg-amber-200 cursor-pointer"
                  title="Xem các thiết bị có số lượng <= 1"
                >
                  <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  {lowStockCount} mã ≤ 1
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium">Cái / chiếc tồn kho</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 shadow-xs">
            <CheckSquare className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 sm:p-5 rounded-2xl shadow-xs flex items-center justify-between transition-all hover:border-sky-300 dark:hover:border-sky-800">
          <div className="space-y-1">
            <p className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Tiến độ kiểm kê</p>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {stats.checkedCount} <span className="text-xs font-semibold text-slate-400">/ {stats.totalItems}</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">{Math.round((stats.checkedCount / (stats.totalItems || 1)) * 100)}% hoàn thành</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/50 flex items-center justify-center text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/50 shadow-xs">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 sm:p-5 rounded-2xl shadow-xs flex items-center justify-between transition-all hover:border-rose-300 dark:hover:border-rose-800">
          <div className="space-y-1">
            <p className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Thiếu / Hỏng hóc</p>
            <h3 className={`text-2xl sm:text-3xl font-black tracking-tight ${stats.missingCount > 0 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
              {stats.missingCount}
            </h3>
            <p className="text-xs text-slate-500 font-medium">Thiết bị cần xử lý</p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-xs ${stats.missingCount > 0 ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
            <XCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-gradient-to-tr from-[#2563EB] to-blue-700 text-white p-4.5 sm:p-5 rounded-2xl shadow-md shadow-blue-500/20 flex items-center justify-between col-span-2 lg:col-span-1">
          <div className="space-y-1">
            <p className="text-[11px] uppercase font-bold text-blue-100 tracking-wider">Độ an toàn kho</p>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight">{stats.healthRate}%</h3>
            <p className="text-xs text-blue-100 font-medium">Sẵn sàng kỹ thuật</p>
          </div>
          <div className="w-12 h-12 bg-white/15 rounded-xl backdrop-blur-md flex items-center justify-center border border-white/20">
            <Check className="w-6 h-6 text-white" />
          </div>
        </div>
      </section>

      {/* Analytics Visual Banner with Pie Chart */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-300">
        <div className="flex flex-col space-y-2.5 text-left w-full md:w-1/2">
          <span className="p-1 px-2.5 bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 text-xs font-bold rounded-lg uppercase tracking-wider w-fit border border-blue-100 dark:border-blue-900/40">
            Phân Tích Trực Quan
          </span>
          <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-white uppercase tracking-wider">
            Tỷ Lệ Trạng Thái Kiểm Kê Toàn Bộ Kho
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            Biểu đồ tròn trực quan giám sát chặt chẽ tình hình hao hụt, hỏng hóc và tiến độ thực hiện kiểm đếm định kỳ toàn bộ kho tài sản Bảo Đảm Kỹ Thuật.
          </p>

          <div className="pt-3 space-y-3 w-full">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs sm:text-sm font-bold">
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Đủ / Tốt
                </span>
                <span className="text-slate-600 dark:text-slate-400 font-bold">{totalOk} cái ({ratioOk}%)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${ratioOk}%` }}></div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs sm:text-sm font-bold">
                <span className="text-rose-500 dark:text-rose-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Thiếu / Hỏng
                </span>
                <span className="text-slate-600 dark:text-slate-400 font-bold">{totalMissing} cái ({ratioMissing}%)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full rounded-full transition-all duration-500" style={{ width: `${ratioMissing}%` }}></div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs sm:text-sm font-bold">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span> Chưa kiểm kê
                </span>
                <span className="text-slate-600 dark:text-slate-400 font-bold">{totalUnchecked} cái ({ratioUnchecked}%)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div className="bg-slate-400 h-full rounded-full transition-all duration-500" style={{ width: `${ratioUnchecked}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative w-full md:w-1/2 h-60 sm:h-64 flex items-center justify-center shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={75}
                outerRadius={105}
                paddingAngle={chartData.length > 1 ? 5 : 0}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    className="transition-all duration-300 stroke-transparent hover:opacity-90 outline-none"
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800 shadow-xl text-xs font-bold">
                        <p className="uppercase tracking-wider text-sm" style={{ color: data.color }}>{data.name}</p>
                        <div className="flex justify-between gap-6 mt-1.5 font-medium text-slate-300 text-xs">
                          <span>Số lượng:</span>
                          <span className="font-extrabold text-white">{data.value} cái</span>
                        </div>
                        <div className="flex justify-between gap-6 font-medium text-slate-300 text-xs">
                          <span>Tỷ lệ:</span>
                          <span className="font-extrabold text-white">{data.ratio}%</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs uppercase font-extrabold text-slate-400 tracking-widest text-center leading-tight">Tổng Kho</span>
            <span className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white mt-0.5">{totalAll}</span>
            <span className="text-xs font-extrabold text-slate-500 tracking-wider">CÁI / BỘ</span>
          </div>
        </div>
      </div>
    </div>
  );
});
