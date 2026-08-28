import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import * as XLSX from 'xlsx';
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle } from 'lucide-react';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { success, error } = useToast();
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        // Normalize rows (Strictly: Army Number, Rank, Name, Trade, Appointment)
        const normalized = data.map((r: any) => ({
          armyNumber: r['Army Number'] || r['armyNumber'] || r['ArmyNo'] || '',
          rank: r['Rank'] || r['rank'] || 'Sainik',
          name: r['Name'] || r['name'] || '',
          trade: r['Trade'] || r['trade'] || 'MA',
          appointment: r['Appointment'] || r['appointment'] || 'General Duty',
        })).filter((r) => r.armyNumber && r.name);

        setParsedRows(normalized);
        success('File Parsed', `Extracted ${normalized.length} valid personnel rows.`);
      } catch (err: any) {
        error('Parse Error', err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDownloadTemplate = () => {
    const template = [
      { 'Army Number': 'No-1460999', Rank: 'Sainik', Name: 'Md. Al-Amin', Trade: 'MA', Appointment: 'Nursing Orderly' },
      { 'Army Number': 'No-1460998', Rank: 'Lance Corporal', Name: 'Md. Sohel Rana', Trade: 'MT', Appointment: 'Driver' },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Personnel_Template');
    XLSX.writeFile(wb, '55_Fd_Amb_Personnel_Import_Template.xlsx');
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) return;
    setIsProcessing(true);
    try {
      const res = await api.bulkImportPersonnel(parsedRows);
      success('Import Completed', res.message);
      onSuccess();
      onClose();
    } catch (err: any) {
      error('Import Failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Import / Export Personnel"
      subtitle="55 Fd Amb (10 Inf Div) Master Personnel Data Management"
      maxWidth="2xl"
    >
      <div className="space-y-4 text-xs">
        <div className="p-4 rounded-xl bg-tactical-950 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="font-bold text-white">Download Standard Excel Template</div>
            <p className="text-[11px] text-slate-400">Pre-formatted sheet with exact Army Number, Rank, and Trade headers.</p>
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2 rounded-xl bg-tactical-800 hover:bg-tactical-700 text-slate-200 font-bold flex items-center space-x-1.5 border border-slate-700"
          >
            <Download className="w-3.5 h-3.5 text-army-400" />
            <span>Download Template</span>
          </button>
        </div>

        {/* File Upload Box */}
        <div className="p-6 rounded-2xl border-2 border-dashed border-slate-700 hover:border-army-500 transition-colors bg-tactical-950/60 text-center space-y-2">
          <Upload className="w-8 h-8 text-army-400 mx-auto" />
          <div className="font-bold text-white">Choose Excel (.xlsx / .xls) or CSV File</div>
          <p className="text-[11px] text-slate-400">Select file containing personnel data for bulk upload.</p>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-army-600 file:text-white hover:file:bg-army-500 cursor-pointer pt-2"
          />
        </div>

        {/* Preview parsed rows */}
        {parsedRows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between font-bold text-white">
              <span>Preview Parsed Records ({parsedRows.length} soldiers):</span>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 bg-tactical-950">
              <table className="w-full text-left text-[11px] font-mono">
                <thead className="bg-tactical-900 text-slate-400">
                  <tr>
                    <th className="p-2">Army No</th>
                    <th className="p-2">Rank</th>
                    <th className="p-2">Name</th>
                    <th className="p-2">Trade</th>
                    <th className="p-2">Appointment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {parsedRows.slice(0, 10).map((r, i) => (
                    <tr key={i}>
                      <td className="p-2 text-amber-300 font-bold">{r.armyNumber}</td>
                      <td className="p-2 text-white">{r.rank}</td>
                      <td className="p-2 text-slate-200">{r.name}</td>
                      <td className="p-2 text-army-400">{r.trade}</td>
                      <td className="p-2 text-slate-400">{r.appointment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-tactical-800 text-slate-300 font-bold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={parsedRows.length === 0 || isProcessing}
            onClick={handleImport}
            className="px-5 py-2 rounded-xl bg-army-600 hover:bg-army-500 text-white font-bold disabled:opacity-50 shadow-lg"
          >
            {isProcessing ? 'Importing...' : `Import ${parsedRows.length} Personnel`}
          </button>
        </div>
      </div>
    </Modal>
  );
};
