import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Personnel, KoteCycleType } from '../../types';
import { UNIT_NAME } from '../../utils/constants';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { format } from 'date-fns';
import { Shield, Clock, Moon, Sun, AlertTriangle, CheckCircle2, Zap, Users } from 'lucide-react';

interface KoteCycleAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: string;
  initialCycle?: KoteCycleType;
}

export const KoteCycleAssignModal: React.FC<KoteCycleAssignModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialDate,
  initialCycle = 'NIGHT_18_06',
}) => {
  const { success, warning, error } = useToast();
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [selectedDate, setSelectedDate] = useState(initialDate || format(new Date(), 'yyyy-MM-dd'));
  const [selectedCycle, setSelectedCycle] = useState<KoteCycleType>(initialCycle);
  const [location, setLocation] = useState('Main Armory / Kote');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 3 Relief Groups
  const [groups, setGroups] = useState([
    { groupNumber: 1, guardCommanderId: '', guardId: '' },
    { groupNumber: 2, guardCommanderId: '', guardId: '' },
    { groupNumber: 3, guardCommanderId: '', guardId: '' },
  ]);

  useEffect(() => {
    if (isOpen) {
      api.getPersonnel({ isActive: true }).then((res) => {
        setPersonnelList(res.personnel);
      });
    }
  }, [isOpen]);

  const handleGroupChange = (groupNum: number, field: 'guardCommanderId' | 'guardId', value: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.groupNumber === groupNum ? { ...g, [field]: value } : g))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) {
      error('Validation Error', 'Duty date must be selected.');
      return;
    }

    const filledGroups = groups.filter((g) => g.guardCommanderId && g.guardId);
    if (filledGroups.length === 0) {
      error('Validation Error', 'Please assign at least one Group with Guard Commander and Guard.');
      return;
    }

    // Check duplicate assignments within cycle
    const assignedIds = new Set<string>();
    let hasDuplicate = false;
    filledGroups.forEach((g) => {
      if (g.guardCommanderId === g.guardId) hasDuplicate = true;
      if (assignedIds.has(g.guardCommanderId) || assignedIds.has(g.guardId)) hasDuplicate = true;
      assignedIds.add(g.guardCommanderId);
      assignedIds.add(g.guardId);
    });

    if (hasDuplicate) {
      warning('Assignment Note', 'Some soldiers appear multiple times across groups.');
    }

    setIsSubmitting(true);
    try {
      const res = await api.assignKoteCycle({
        date: selectedDate,
        cycle: selectedCycle,
        groups: filledGroups,
        location,
      });

      if (res.warnings && res.warnings.length > 0) {
        res.warnings.forEach((w) => warning('Availability Advisory', w));
      }

      success(
        'Kote 3-Group Relief Assigned',
        `Assigned ${selectedCycle === 'NIGHT_18_06' ? 'Night (18:00–06:00)' : 'Day (06:00–18:00)'} rotating schedule (${filledGroups.length} groups, 4h active duty each).`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      error('Assignment Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="KOTE DUTY — 12-Hour Continuous Relief Rotation (3 Groups)"
      subtitle={`${UNIT_NAME} • 2h Active Duty ↓ 4h Rest ↓ 2h Active Duty ↓ 4h Rest (Full 12-Hour Coverage)`}
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-xs">
        {/* Top Bar: Date & Cycle Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
              Duty Date *
            </label>
            <input
              type="date"
              required
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
              12-Hour Kote Cycle *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedCycle('NIGHT_18_06')}
                className={`p-2 rounded-xl border flex items-center justify-center space-x-1.5 font-bold transition-all ${
                  selectedCycle === 'NIGHT_18_06'
                    ? 'bg-purple-950/60 border-purple-500 text-purple-300 shadow-md'
                    : 'bg-tactical-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Moon className="w-4 h-4 text-purple-400" />
                <span>Night (18:00–06:00)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCycle('DAY_06_18')}
                className={`p-2 rounded-xl border flex items-center justify-center space-x-1.5 font-bold transition-all ${
                  selectedCycle === 'DAY_06_18'
                    ? 'bg-amber-950/60 border-amber-500 text-amber-300 shadow-md'
                    : 'bg-tactical-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Day (06:00–18:00)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Rotation Coverage Visualizer */}
        <div className="p-3.5 rounded-2xl bg-tactical-950 border border-army-500/30 font-mono space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-army-300 uppercase flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              12-HOUR CONTINUOUS ROTATION TIMETABLE (3 GROUPS)
            </span>
            <span className="text-emerald-400 font-bold text-[10px]">
              Active Duty = 4h / Person (2h + 2h)
            </span>
          </div>

          {selectedCycle === 'NIGHT_18_06' ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30">
                <span className="text-purple-300 font-bold block pb-1 border-b border-purple-500/20">
                  GROUP 1 (Relief 1)
                </span>
                <div className="text-white mt-1">Duty: 18:00–20:00, 00:00–02:00</div>
                <div className="text-slate-400 text-[10px]">Rest: 20:00–00:00, 02:00–06:00</div>
              </div>

              <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/30">
                <span className="text-blue-300 font-bold block pb-1 border-b border-blue-500/20">
                  GROUP 2 (Relief 2)
                </span>
                <div className="text-white mt-1">Duty: 20:00–22:00, 02:00–04:00</div>
                <div className="text-slate-400 text-[10px]">Rest: 22:00–02:00, 04:00–08:00</div>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30">
                <span className="text-amber-300 font-bold block pb-1 border-b border-amber-500/20">
                  GROUP 3 (Relief 3)
                </span>
                <div className="text-white mt-1">Duty: 22:00–00:00, 04:00–06:00</div>
                <div className="text-slate-400 text-[10px]">Rest: 00:00–04:00, 06:00–10:00</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30">
                <span className="text-amber-300 font-bold block pb-1 border-b border-amber-500/20">
                  GROUP 1 (Relief 1)
                </span>
                <div className="text-white mt-1">Duty: 06:00–08:00, 12:00–14:00</div>
                <div className="text-slate-400 text-[10px]">Rest: 08:00–12:00, 14:00–18:00</div>
              </div>

              <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/30">
                <span className="text-blue-300 font-bold block pb-1 border-b border-blue-500/20">
                  GROUP 2 (Relief 2)
                </span>
                <div className="text-white mt-1">Duty: 08:00–10:00, 14:00–16:00</div>
                <div className="text-slate-400 text-[10px]">Rest: 10:00–14:00, 16:00–20:00</div>
              </div>

              <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30">
                <span className="text-purple-300 font-bold block pb-1 border-b border-purple-500/20">
                  GROUP 3 (Relief 3)
                </span>
                <div className="text-white mt-1">Duty: 10:00–12:00, 16:00–18:00</div>
                <div className="text-slate-400 text-[10px]">Rest: 12:00–16:00, 18:00–22:00</div>
              </div>
            </div>
          )}
        </div>

        {/* 3 Relief Groups Assign Forms */}
        <div className="space-y-3">
          {groups.map((grp) => {
            const selGc = personnelList.find((p) => p.id === grp.guardCommanderId);
            const selGd = personnelList.find((p) => p.id === grp.guardId);
            const shiftDutyTimes =
              selectedCycle === 'NIGHT_18_06'
                ? grp.groupNumber === 1
                  ? '18:00–20:00 & 00:00–02:00'
                  : grp.groupNumber === 2
                  ? '20:00–22:00 & 02:00–04:00'
                  : '22:00–00:00 & 04:00–06:00'
                : grp.groupNumber === 1
                ? '06:00–08:00 & 12:00–14:00'
                : grp.groupNumber === 2
                ? '08:00–10:00 & 14:00–16:00'
                : '10:00–12:00 & 16:00–18:00';

            return (
              <div
                key={grp.groupNumber}
                className="p-3.5 rounded-2xl bg-tactical-950 border border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <div className="flex items-center space-x-2 font-mono">
                    <span className="px-2 py-0.5 rounded bg-army-600/30 text-army-300 font-bold">
                      GROUP {grp.groupNumber} (Relief {grp.groupNumber})
                    </span>
                    <span className="text-white font-bold">Duty Hours: {shiftDutyTimes}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">1 GC + 1 Guard</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Guard Commander */}
                  <div>
                    <label className="block text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1">
                      Guard Commander (Group {grp.groupNumber})
                    </label>
                    <select
                      value={grp.guardCommanderId}
                      onChange={(e) => handleGroupChange(grp.groupNumber, 'guardCommanderId', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-tactical-900 border border-slate-700 text-white font-sans text-xs"
                    >
                      <option value="">-- Select Guard Commander --</option>
                      {personnelList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.rank} {p.name} ({p.armyNumber}) - {p.trade} {p.currentStatus !== 'PRESENT' ? `[${p.currentStatus}]` : ''}
                        </option>
                      ))}
                    </select>

                    {selGc && selGc.currentStatus !== 'PRESENT' && (
                      <div className="mt-1 text-[10px] text-rose-400 font-mono italic">
                        ⚠️ Unavailable: {selGc.currentStatus} ({selGc.statusReason || 'Away'})
                      </div>
                    )}
                  </div>

                  {/* Guard */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Guard Sentry (Group {grp.groupNumber})
                    </label>
                    <select
                      value={grp.guardId}
                      onChange={(e) => handleGroupChange(grp.groupNumber, 'guardId', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-tactical-900 border border-slate-700 text-white font-sans text-xs"
                    >
                      <option value="">-- Select Guard Sentry --</option>
                      {personnelList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.rank} {p.name} ({p.armyNumber}) - {p.trade} {p.currentStatus !== 'PRESENT' ? `[${p.currentStatus}]` : ''}
                        </option>
                      ))}
                    </select>

                    {selGd && selGd.currentStatus !== 'PRESENT' && (
                      <div className="mt-1 text-[10px] text-rose-400 font-mono italic">
                        ⚠️ Unavailable: {selGd.currentStatus} ({selGd.statusReason || 'Away'})
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Location */}
        <div>
          <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
            Armory Post / Location
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl bg-tactical-950 border border-slate-700 text-white text-xs"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-tactical-800 text-slate-300 font-bold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 rounded-xl bg-army-600 hover:bg-army-500 text-white font-bold disabled:opacity-50 shadow-lg flex items-center space-x-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Generating 3-Relief Schedules...' : 'Save 3-Relief Kote Schedule'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
