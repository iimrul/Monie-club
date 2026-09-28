import React, { useState } from 'react';
import { useClub } from '../context/ClubContext';

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReportsModal: React.FC<ReportsModalProps> = ({ isOpen, onClose }) => {
  const { 
    members, 
    monthlyPayments, 
    months, 
    exportDataJSON, 
    importDataJSON,
    resetToInitialData,
    getMemberFinancials
  } = useClub();

  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadJSON = () => {
    const jsonStr = exportDataJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Monie_Club_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (importDataJSON(content)) {
        setImportStatus('Backup restored successfully!');
        setTimeout(() => setImportStatus(null), 3000);
      } else {
        setImportStatus('Invalid backup file.');
        setTimeout(() => setImportStatus(null), 3000);
      }
    };
    reader.readAsText(file);
  };

  const handleExportMembersCSV = () => {
    const headers = ['Name', 'Units', 'Money in Club (BDT)', 'Blood Group', 'Phone', 'Address', 'Status', 'Pending Months', 'Total Due (BDT)'];
    const rows = members.map(m => {
      const fin = getMemberFinancials(m.id);
      return [
        `"${m.name}"`,
        m.units,
        fin.totalPaid,
        m.bloodGroup,
        `"${m.contactNumber}"`,
        `"${m.permanentAddress}"`,
        m.status,
        m.monthsPending,
        m.totalDueAmount,
      ];
    });

    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const uri = encodeURI(csv);
    const link = document.createElement('a');
    link.href = uri;
    link.download = `Monie_Club_Members.csv`;
    link.click();
  };

  const handleExportMatrixCSV = () => {
    const activeMems = members.filter(m => m.status === 'Active');
    const headers = ['Member Name', 'Units', ...months.map(m => m.yearMonth), 'Total Due'];
    
    const rows = activeMems.map(mem => {
      const monthCols = months.map(m => {
        const p = monthlyPayments.find(pay => pay.memberId === mem.id && pay.monthKey === m.key);
        return p?.status === 'Paid' ? `Paid (${p.amountPaid})` : 'Due';
      });
      return [`"${mem.name}"`, mem.units, ...monthCols, mem.totalDueAmount];
    });

    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const uri = encodeURI(csv);
    const link = document.createElement('a');
    link.href = uri;
    link.download = `Monie_Club_Ledger.csv`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="theme-card rounded-xl w-full max-w-md p-5 shadow-xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between pb-3 border-b theme-border">
          <div>
            <h3 className="text-sm font-bold theme-text-main">
              Reports & Data Backup
            </h3>
            <p className="text-xs theme-text-muted mt-0.5">
              Print statements, download spreadsheets, or export backups.
            </p>
          </div>
          <button
            onClick={onClose}
            className="theme-input px-2 py-0.5 rounded text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs">
          
          {/* Printable Statement */}
          <div className="theme-card-subtle p-3 rounded space-y-2">
            <div className="font-semibold theme-text-main">Meeting Printout</div>
            <p className="theme-text-muted text-[11px]">
              Clean executive summary formatted for printing and signatures.
            </p>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded cursor-pointer"
            >
              Print Official Statement
            </button>
          </div>

          {/* Spreadsheet CSV */}
          <div className="theme-card-subtle p-3 rounded space-y-2">
            <div className="font-semibold theme-text-main">Export to Spreadsheets (CSV)</div>
            <div className="flex gap-2">
              <button
                onClick={handleExportMatrixCSV}
                className="theme-input px-2.5 py-1 rounded text-xs cursor-pointer"
              >
                12-Month Matrix
              </button>
              <button
                onClick={handleExportMembersCSV}
                className="theme-input px-2.5 py-1 rounded text-xs cursor-pointer"
              >
                Members List
              </button>
            </div>
          </div>

          {/* JSON Backup */}
          <div className="theme-card-subtle p-3 rounded space-y-2">
            <div className="font-semibold theme-text-main">Data Backup & Restore</div>
            {importStatus && (
              <div className="text-emerald-600 dark:text-emerald-400 font-semibold">{importStatus}</div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadJSON}
                className="theme-input px-2.5 py-1 rounded text-xs cursor-pointer"
              >
                Download Backup
              </button>
              <label className="theme-input px-2.5 py-1 rounded text-xs cursor-pointer">
                Restore Backup
                <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
              </label>
            </div>
          </div>

          {/* Revert Defaults */}
          <div className="pt-2 flex justify-between items-center text-xs theme-text-muted border-t theme-border">
            <span>Revert to original sheet records?</span>
            <button
              onClick={() => {
                resetToInitialData();
                onClose();
              }}
              className="text-rose-600 hover:underline cursor-pointer"
            >
              Reset Data
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
