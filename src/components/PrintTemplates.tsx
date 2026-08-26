import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { InventoryItem } from '../types.ts';

interface PrintTemplatesProps {
  printLayout: 'NONE' | 'QR' | 'LABEL';
  inventory: InventoryItem[];
}

export const PrintTemplates: React.FC<PrintTemplatesProps> = ({ printLayout, inventory }) => {
  if (printLayout === 'NONE') return null;

  return (
    <div className="hidden printable-area">
      {printLayout === 'QR' && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
            <h2 style={{ textTransform: 'uppercase', fontSize: '16px', margin: '0' }}>DANH SÁCH MÃ QR TRUY XUẤT VẬT TƯ</h2>
            <span style={{ fontSize: '11px', color: '#666' }}>Đội Thông Tin CNS/ATM - Ngày in: {new Date().toLocaleDateString('vi-VN')}</span>
          </div>
          <div className="qr-print-grid">
            {inventory.filter(item => item.warehouse).map(item => (
              <div key={item.id} className="qr-print-item">
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '5px' }}>
                  <QRCodeSVG value={item.warehouse || ''} size={110} level="M" />
                </div>
                <div style={{ fontSize: '11px', fontWeight: 'bold' }}>{item.warehouse}</div>
                <div style={{ fontSize: '9px', color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                <div style={{ fontSize: '9px', fontFamily: 'monospace' }}>S/N: {item.sn}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {printLayout === 'LABEL' && (
        <div>
          <div className="label-print-grid">
            {inventory.map(item => (
              <div key={item.id} className="label-print-item">
                <div>
                  <div style={{ fontSize: '10px', color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '3px', marginBottom: '5px' }}>
                    TRUNG TÂM BẢO ĐẢM KỸ THUẬT - ĐỘI THÔNG TIN
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '800', lineHeight: '1.2', color: '#000', textTransform: 'uppercase' }}>
                    {item.name}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  <div style={{ fontSize: '10px', color: '#333' }}>
                    <div><strong>P/N:</strong> {item.pn || 'N/A'}</div>
                    <div><strong>S/N:</strong> <span style={{ fontFamily: 'monospace' }}>{item.sn}</span></div>
                    {item.loc && <div><strong>Vị trí:</strong> {item.loc}</div>}
                  </div>

                  {item.warehouse ? (
                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                      <QRCodeSVG value={item.warehouse} size={65} />
                      <div style={{ fontSize: '8px', fontWeight: 'bold', marginTop: '2px' }}>{item.warehouse}</div>
                    </div>
                  ) : (
                    <div style={{ width: '65px', height: '65px', border: '1px dashed #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: '#777' }}>
                      NO QR
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
