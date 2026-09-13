import React, { useState } from 'react';
import { AlertTriangle, Copy, Check, ExternalLink, RefreshCw, X, FileCode } from 'lucide-react';

interface AppsScriptFixModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetrySync: () => void;
  isSyncing: boolean;
}

export const APPS_SCRIPT_SOURCE_CODE = `/**
 * GOOGLE APPS SCRIPT CHO HỆ THỐNG QUẢN LÝ VẬT TƯ DỰ PHÒNG ĐỘI THÔNG TIN (CNS)
 * Phiên bản chuẩn 3.6 - Chống lỗi "Sorry, it is not possible to delete all non-frozen rows"
 */

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("KhoVatTu") || ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", items: [], dispatched: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    var headers = data[0].map(function(h) { return String(h).trim(); });
    var items = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0] && !row[1]) continue;
      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        obj[headers[j]] = row[j];
      }
      items.push(obj);
    }

    var dispatched = [];
    var dSheet = ss.getSheetByName("SoBanGiao");
    if (dSheet) {
      var dData = dSheet.getDataRange().getValues();
      if (dData.length > 1) {
        var dHeaders = dData[0].map(function(h) { return String(h).trim(); });
        for (var d = 1; d < dData.length; d++) {
          var dRow = dData[d];
          if (!dRow[0] && !dRow[1]) continue;
          var dObj = {};
          for (var k = 0; k < dHeaders.length; k++) {
            dObj[dHeaders[k]] = dRow[k];
          }
          dispatched.push(dObj);
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      items: items,
      dispatched: dispatched
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("KhoVatTu");
    if (!sheet) {
      sheet = ss.insertSheet("KhoVatTu");
    }

    var rawData = e.parameter.data || e.parameter.inventory || (e.postData && e.postData.contents);
    if (!rawData) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Không tìm thấy dữ liệu 'data' hoặc 'inventory'."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var items = typeof rawData === "string" ? JSON.parse(rawData) : rawData;

    if (Array.isArray(items)) {
      // Dùng clearContents() thay vì deleteRows() để hoàn toàn triệt tiêu lỗi "Sorry, it is not possible to delete all non-frozen rows"
      sheet.clearContents();

      var headers = ["id", "name", "category", "pn", "sn", "warehouse", "loc", "qty", "auditStatus", "auditDate", "auditNote", "updatedAt"];

      // Đảm bảo số lượng dòng đủ trước khi ghi
      var requiredRows = items.length + 2;
      if (sheet.getMaxRows() < requiredRows) {
        sheet.insertRowsAfter(sheet.getMaxRows(), requiredRows - sheet.getMaxRows() + 10);
      }

      // Ghi tiêu đề
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");

      if (items.length > 0) {
        var rows = items.map(function(it) {
          return [
            it.id || "",
            it.name || "",
            it.category || "Khác",
            it.pn || "",
            it.sn || "",
            it.warehouse || "",
            it.loc || "",
            it.qty !== undefined ? it.qty : 1,
            it.auditStatus || "",
            it.auditDate || "",
            it.auditNote || "",
            it.updatedAt || new Date().toISOString()
          ];
        });
        sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
      }
    }

    // Ghi nhận sổ bàn giao nếu có
    var rawDispatched = e.parameter.dispatched;
    if (rawDispatched) {
      var dItems = typeof rawDispatched === "string" ? JSON.parse(rawDispatched) : rawDispatched;
      if (Array.isArray(dItems)) {
        var dSheet = ss.getSheetByName("SoBanGiao") || ss.insertSheet("SoBanGiao");
        dSheet.clearContents();
        var dHeaders = ["id", "docNo", "date", "itemId", "itemName", "sn", "pn", "qty", "receiver", "department", "reason", "location", "status", "returnedQty", "returnDate"];
        var dRequired = dItems.length + 2;
        if (dSheet.getMaxRows() < dRequired) {
          dSheet.insertRowsAfter(dSheet.getMaxRows(), dRequired - dSheet.getMaxRows() + 10);
        }
        dSheet.getRange(1, 1, 1, dHeaders.length).setValues([dHeaders]);
        dSheet.getRange(1, 1, 1, dHeaders.length).setFontWeight("bold");

        if (dItems.length > 0) {
          var dRows = dItems.map(function(r) {
            return [
              r.id || "", r.docNo || "", r.date || "", r.itemId || "", r.itemName || "",
              r.sn || "", r.pn || "", r.qty || 1, r.receiver || "", r.department || "",
              r.reason || "", r.location || "", r.status || "DISPATCHED",
              r.returnedQty || 0, r.returnDate || ""
            ];
          });
          dSheet.getRange(2, 1, dRows.length, dHeaders.length).setValues(dRows);
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Đã lưu " + (Array.isArray(items) ? items.length : 0) + " thiết bị vào Google Sheet thành công!",
      count: Array.isArray(items) ? items.length : 0,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: "Lỗi thực thi trong Apps Script: " + err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

export const AppsScriptFixModal: React.FC<AppsScriptFixModalProps> = ({
  isOpen,
  onClose,
  onRetrySync,
  isSyncing
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_SOURCE_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-amber-200 dark:border-amber-900/60 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-amber-200/80 dark:border-amber-900/50 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-xl shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Khắc Phục Lỗi Đồng Bộ Google Sheet
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 rounded-full border border-amber-300/60 dark:border-amber-700/60">
                  Cần xử lý 1 lần
                </span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                Máy chủ Google Apps Script đang báo lỗi: <code className="text-amber-700 dark:text-amber-300 font-mono text-[11px] bg-amber-50 dark:bg-amber-950/60 px-1 py-0.5 rounded">Sorry, it is not possible to delete all non-frozen rows</code>.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Explanation box */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs space-y-2">
            <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>🔍 Nguyên nhân &amp; Cách khắc phục trong 30 giây:</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11.5px]">
              Trang Google Sheet của bạn có <b>hàng tiêu đề cố định (frozen row)</b>, trong khi mã Apps Script cũ thực hiện lệnh xoá toàn bộ dòng (<code>deleteRows</code>). Bản mã mới bên dưới sử dụng <code>clearContents()</code> và ghi mảng trực tiếp, <b>hoàn toàn không xoá dòng</b> và giúp tốc độ ghi nhanh gấp 10 lần.
            </p>
          </div>

          {/* 3 Step Action Guide */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              3 Bước Cập Nhật Mã Apps Script:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 rounded-xl text-xs space-y-1">
                <div className="font-bold text-indigo-700 dark:text-indigo-400">1. Mở Apps Script</div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Trên Google Sheet, vào menu <b>Tiện ích mở rộng &gt; Apps Script</b>.
                </p>
              </div>

              <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 rounded-xl text-xs space-y-1">
                <div className="font-bold text-indigo-700 dark:text-indigo-400">2. Dán mã mới &amp; Lưu</div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Nhấn nút <b>Sao chép mã</b> bên dưới, dán đè vào file <code>Code.gs</code> rồi nhấn <b>Ctrl + S</b>.
                </p>
              </div>

              <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 rounded-xl text-xs space-y-1">
                <div className="font-bold text-indigo-700 dark:text-indigo-400">3. Triển khai lại</div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Nhấn <b>Triển khai &gt; Quản lý bản triển khai &gt; Sửa (biểu tượng bút chì) &gt; Phiên bản: Mới &gt; Triển khai</b>.
                </p>
              </div>
            </div>
          </div>

          {/* Script Viewer & Copy */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-indigo-500" />
                Mã nguồn Code.gs chuẩn v3.6:
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">Đã sao chép!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép mã</span>
                  </>
                )}
              </button>
            </div>
            <div className="relative">
              <pre className="p-3 bg-slate-950 text-emerald-400 font-mono text-[10px] rounded-xl overflow-x-auto max-h-44 leading-relaxed border border-slate-800 select-all">
                {APPS_SCRIPT_SOURCE_CODE}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-2.5">
          <a
            href="https://script.google.com/home/all"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Mở Google Apps Script
          </a>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm shadow-indigo-500/20 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Đã sao chép!' : '1. Sao Chép Mã Code.gs'}
            </button>

            <button
              type="button"
              onClick={onRetrySync}
              disabled={isSyncing}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm shadow-emerald-500/20 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              2. Kiểm Tra &amp; Ghi Dữ Liệu Ngay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
