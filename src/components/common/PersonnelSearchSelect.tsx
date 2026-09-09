import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Personnel } from '../../types';
import { RankBadge, StatusBadge } from './Badge';
import { Search, X, UserCheck, AlertTriangle } from 'lucide-react';

interface PersonnelSearchSelectProps {
  personnelList: Personnel[];
  selectedPersonnelId: string;
  onSelect: (soldier: Personnel | null) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
  excludeIds?: string[];
  helperText?: string;
}

export const PersonnelSearchSelect: React.FC<PersonnelSearchSelectProps> = ({
  personnelList,
  selectedPersonnelId,
  onSelect,
  label = 'Select Soldier',
  required = false,
  placeholder = 'Type Army No, Name, Rank or Trade...',
  excludeIds = [],
  helperText,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedSoldier = useMemo(
    () => personnelList.find((p) => p.id === selectedPersonnelId) || null,
    [personnelList, selectedPersonnelId]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter personnel based on search query
  const filteredPersonnel = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return personnelList
      .filter((p) => !excludeIds.includes(p.id) || p.id === selectedPersonnelId)
      .filter((p) => {
        if (!query) return true;
        const armyNo = (p.armyNumber || '').toLowerCase();
        const name = (p.name || '').toLowerCase();
        const rank = (p.rank || '').toLowerCase();
        const trade = (p.trade || '').toLowerCase();
        return (
          armyNo.includes(query) ||
          name.includes(query) ||
          rank.includes(query) ||
          trade.includes(query)
        );
      });
  }, [personnelList, searchTerm, excludeIds, selectedPersonnelId]);

  const handleSelectSoldier = (soldier: Personnel) => {
    onSelect(soldier);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClearSelection = () => {
    onSelect(null);
    setSearchTerm('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {label && (
        <label className="block text-slate-300 font-bold uppercase tracking-wider text-[11px]">
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
      )}

      {selectedSoldier ? (
        <div className="p-3 rounded-xl bg-tactical-950 border border-army-500/50 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 min-w-0">
              <RankBadge rank={selectedSoldier.rank} />
              <div className="min-w-0">
                <div className="text-white font-bold text-xs truncate">
                  {selectedSoldier.name}
                </div>
                <div className="text-slate-400 font-mono text-[10px] truncate">
                  Army No: <span className="text-amber-300 font-bold">{selectedSoldier.armyNumber}</span> • {selectedSoldier.trade}
                  {selectedSoldier.appointment ? ` • ${selectedSoldier.appointment}` : ''}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <StatusBadge status={selectedSoldier.currentStatus} />
              <button
                type="button"
                onClick={handleClearSelection}
                className="px-2.5 py-1 rounded-lg bg-tactical-800 hover:bg-tactical-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-bold transition-all flex items-center gap-1 shadow-sm"
              >
                <UserCheck className="w-3 h-3 text-army-400" />
                <span>Change</span>
              </button>
            </div>
          </div>

          {selectedSoldier.currentStatus !== 'PRESENT' && (
            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-950/40 border border-amber-500/30 text-[10px] text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Warning:</strong> Soldier is currently <strong>{selectedSoldier.currentStatus}</strong>
                {selectedSoldier.statusReason ? ` (${selectedSoldier.statusReason})` : ''}.
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder={placeholder}
              className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-tactical-950 border border-slate-700 focus:border-army-500 text-white placeholder-slate-500 text-xs font-medium focus:outline-none transition-all shadow-inner"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-tactical-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-60 flex flex-col animate-fade-in">
              <div className="px-3 py-1.5 bg-tactical-950 border-b border-slate-800 text-[10px] font-mono text-slate-400 flex items-center justify-between">
                <span>Search: Army No, Name, Rank, Trade</span>
                <span>{filteredPersonnel.length} found</span>
              </div>

              <div className="overflow-y-auto divide-y divide-slate-800/60">
                {filteredPersonnel.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-xs">
                    No matching personnel found for "{searchTerm}".
                  </div>
                ) : (
                  filteredPersonnel.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectSoldier(p)}
                      className="w-full text-left px-3 py-2.5 hover:bg-tactical-800/80 transition-colors flex items-center justify-between gap-2 min-h-[44px]"
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <RankBadge rank={p.rank} />
                        <div className="min-w-0">
                          <div className="text-white font-bold text-xs truncate">
                            {p.name}
                          </div>
                          <div className="text-slate-400 font-mono text-[10px] truncate">
                            No: <span className="text-amber-300 font-bold">{p.armyNumber}</span> • {p.trade}
                          </div>
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        <StatusBadge status={p.currentStatus} />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {helperText && !selectedSoldier && (
        <p className="text-[10px] text-slate-500 font-mono">{helperText}</p>
      )}
    </div>
  );
};
