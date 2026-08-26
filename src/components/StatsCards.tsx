import React from 'react';
import { Layers, CheckSquare, Activity, XCircle, Check, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AuditStats, InventoryItem } from '../types.ts';

interface StatsCardsProps {
  stats: AuditStats;
  inventory: InventoryItem[];
  onFilterLowStock?: () => void;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, inventory, onFilterLowStock }) => {
  const totalOk = inventory.filter(item => item.auditStatus === 'OK').reduce((sum, item) => sum + (item.qty || 0), 0);
  const totalMissing = inventory.filter(item => item.auditStatus === 'MISSING').reduce((sum, item) => sum + (item.qty || 0), 0);
  const totalUnchecked = inventory.filter(item => item.auditStatus === null).reduce((sum, item) => sum + (item.qty || 0), 0);
  const totalAll = totalOk + totalMissing + totalUnchecked;
  const lowStockCount = inventory.filter(item => (item.qty || 0) <= 1).length;

  const ratioOk = totalAll > 0 ? Math.round((totalOk / totalAll) * 100) : 0;
  const ratioMissing = totalAll > 0 ? Math.round((totalMissing / totalAll) * 100) : 0;
  const ratioUnchecked = totalAll > 0 ? Math.round((totalUnchecked / totalAll) * 100) : 0;

  const chartData = totalAll > 0 ? [
    { name: 'Đủ / Tốt', value: totalOk, color: '#10B981', ratio: ratioOk },
    { name: 'Thiếu / Hỏng', value: totalMissing, color: '#EF4444', ratio: ratioMissing },
    { name: 'Chưa kiểm', value: totalUnchecked, color: '#64748B', ratio: ratioUnchecked }
  ].filter(d => d.value > 0) : [
    { name: 'Chưa có thiết bị', value: 1, color: '#E2E8F0', ratio: 0 }
  ];

  return (
    <div className="space-y-6">
      {/* Top 5 Bento Metric Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-[1.8rem] shadow-sm flex items-center justify-between col-span-2 sm:col-span-1">
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tổng sản phẩm</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalItems}</h3>
            <p className="text-[10px] text-slate-500">Mã danh mục lưu</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 border border-indigo-100/55 dark:border-indigo-900/35">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-[1.8rem] shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tổng số lượng</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalQty}</h3>
              {lowStockCount > 0 && onFilterLowStock && (
                <button
                  type="button"
                  onClick={onFilterLowStock}
                  className="inline-flex items-center gap-1 text-[9px] font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-300/80 dark:border-amber-800 animate-pulse hover:bg-amber-200 cursor-pointer"
                  title="Xem các thiết bị có số lượng <= 1"
                >
                  <AlertTriangle className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                  {lowStockCount} mã ≤ 1
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-500">Cái / chiếc tồn kho</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 border border-emerald-100/55 dark:border-emerald-900/35">
            <CheckSquare className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-[1.8rem] shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Đã kiểm kê</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.checkedCount} <span className="text-xs font-normal text-slate-400">/ {stats.totalItems}</span>
            </h3>
            <p className="text-[10px] text-slate-500">{Math.round((stats.checkedCount / (stats.totalItems || 1)) * 100)}% hoàn thành</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/40 flex items-center justify-center text-sky-600 border border-sky-100/55 dark:border-sky-900/35">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-[1.8rem] shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Thiếu/Hỏng hóc</p>
            <h3 className={`text-2xl font-black ${stats.missingCount > 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
              {stats.missingCount}
            </h3>
            <p className="text-[10px] text-slate-500">Thiết bị cần hồi báo</p>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${stats.missingCount > 0 ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 border-rose-100 dark:border-rose-900/35' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
            <XCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white p-5 rounded-[1.8rem] shadow-sm flex items-center justify-between col-span-2 lg:col-span-1">
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider">Độ an toàn kho</p>
            <h3 className="text-3xl font-black tracking-tight">{stats.healthRate}%</h3>
            <p className="text-[10px] text-indigo-100">Độ khớp danh mục tốt</p>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
            <Check className="w-6 h-6 text-white" />
          </div>
        </div>
      </section>

      {/* Analytics Visual Banner with Pie Chart */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.2rem] p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-300">
        <div className="flex flex-col space-y-2 text-left w-full md:w-1/2">
          <span className="p-1 px-2.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[9px] font-black rounded-lg uppercase tracking-wider w-fit">
            Phân Tích Tổng Quan
          </span>
          <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-wider">
            Tỷ Lệ Trạng Thái Kiểm Kê
          </h3>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">
            Biểu đồ tròn trực quan giám sát chặt chẽ tình hình hao hụt, hỏng hóc và tiến độ thực hiện kiểm đếm định kỳ toàn bộ kho tài sản Bảo Đảm Kỹ Thuật.
          </p>

          <div className="pt-3 space-y-2.5 w-full">
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[11px] font-extrabold">
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Đủ / Tốt
                </span>
                <span className="text-slate-500">{totalOk} cái ({ratioOk}%)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${ratioOk}%` }}></div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-[11px] font-extrabold">
                <span className="text-rose-500 dark:text-rose-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span> Thiếu / Hỏng
                </span>
                <span className="text-slate-500">{totalMissing} cái ({ratioMissing}%)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full rounded-full transition-all duration-500" style={{ width: `${ratioMissing}%` }}></div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-[11px] font-extrabold">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span> Chưa kiểm kê
                </span>
                <span className="text-slate-500">{totalUnchecked} cái ({ratioUnchecked}%)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-slate-400 h-full rounded-full transition-all duration-500" style={{ width: `${ratioUnchecked}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative w-full md:w-1/2 h-52 flex items-center justify-center shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={88}
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
                      <div className="bg-slate-900 text-white p-3 rounded-2xl border border-slate-800 shadow-xl text-[11px] font-bold">
                        <p className="uppercase tracking-wider" style={{ color: data.color }}>{data.name}</p>
                        <div className="flex justify-between gap-4 mt-1 font-medium text-slate-300 text-[10px]">
                          <span>Số lượng:</span>
                          <span className="font-extrabold text-white">{data.value} cái</span>
                        </div>
                        <div className="flex justify-between gap-4 font-medium text-slate-300 text-[10px]">
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
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest text-center leading-tight">Tổng Kho</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{totalAll}</span>
            <span className="text-[9px] font-bold text-slate-500">CÁI / CHIẾC</span>
          </div>
        </div>
      </div>
    </div>
  );
};
