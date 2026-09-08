import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { LeaveType, Personnel, LeaveRecord } from '../../types';
import { LEAVE_TYPES, getRankPLeaveLimit, isOfficerRank } from '../../utils/constants';
import { RankBadge, StatusBadge } from '../common/Badge';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { format, differenceInDays, parseISO } from 'date-fns';
import { AlertCircle, AlertTriangle, CalendarRange, ShieldAlert, CheckCircle2, Search, X, Check } from 'lucide-react';

interface LeaveFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialPersonnelId?: string;
  leaveRecord?: LeaveRecord | null;
}

export const LeaveFormModal: React.FC<LeaveFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialPersonnelId,
  leaveRecord,
}) => {
  const { success, warning, error } = useToast();
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [soldierEntitlement, setSoldierEntitlement] = useState<any>(null);

  // Searchable Soldier Selection State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [formData, setFormData] = useState({
    personnelId: initialPersonnelId || '',
    leaveType: 'C_LEAVE' as LeaveType,
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    reason: 'Routine Rest & Recuperation',
    destinationAddress: '',
    emergencyContact: '',
    status: 'ACTIVE' as const,
    forceOverride: false,
  });

  const fetchEntitlement = async (pId: string) => {
    if (!pId) return;
    try {
      const res = await api.getSoldierEntitlement(pId);
      setSoldierEntitlement(res);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setIsSearching(!initialPersonnelId && !leaveRecord);
      api.getPersonnel({ isActive: true }).then((res) => {
        setPersonnelList(res.personnel);
        if (leaveRecord) {
          setFormData({
            personnelId: leaveRecord.personnelId,
            leaveType: leaveRecord.leaveType,
            startDate: leaveRecord.startDate,
            endDate: leaveRecord.endDate,
            reason: leaveRecord.reason || 'Authorized Leave',
            destinationAddress: leaveRecord.destinationAddress || '',
            emergencyContact: leaveRecord.emergencyContact || '',
            status: (leaveRecord.status as any) || 'ACTIVE',
            forceOverride: true,
          });
          fetchEntitlement(leaveRecord.personnelId);
        } else {
          const selectedId = initialPersonnelId || (res.personnel.length > 0 ? res.personnel[0].id : '');
          if (selectedId) {
            setFormData({
              personnelId: selectedId,
              leaveType: 'C_LEAVE',
              startDate: format(new Date(), 'yyyy-MM-dd'),
              endDate: format(new Date(), 'yyyy-MM-dd'),
              reason: 'Routine Rest & Recuperation',
              destinationAddress: '',
              emergencyContact: '',
              status: 'ACTIVE',
              forceOverride: false,
            });
            fetchEntitlement(selectedId);
          }
        }
      });
    }
  }, [isOpen, initialPersonnelId, leaveRecord]);

  const filteredPersonnel = useMemo(() => {
    if (!searchQuery.trim()) return personnelList;
    const q = searchQuery.toLowerCase().trim();
    return personnelList.filter(
      (p) =>
        p.armyNumber.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.rank.toLowerCase().includes(q) ||
        p.trade.toLowerCase().includes(q)
    );
  }, [personnelList, searchQuery]);

  const handleSelectSoldier = (pId: string) => {
    setFormData({ ...formData, personnelId: pId });
    fetchEntitlement(pId);
  };

  const calculateDays = () => {
    try {
      const s = parseISO(formData.startDate);
      const e = parseISO(formData.endDate);
      return differenceInDays(e, s) + 1;
    } catch {
      return 1;
    }
  };

  const totalDays = calculateDays();

  // P-Leave Validation States
  const isPLeave = formData.leaveType === 'P_LEAVE';
  const pLimit = soldierEntitlement?.pLeaveLimit || 60;
  const pUsed = soldierEntitlement?.pLeaveUsed || 0;
  const pRemaining = soldierEntitlement?.pLeaveRemaining !== undefined ? soldierEntitlement.pLeaveRemaining : pLimit;
  const isLimitReached = !leaveRecord && isPLeave && pRemaining <= 0;
  const isInsufficient = !leaveRecord && isPLeave && totalDays > pRemaining;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.personnelId || !formData.startDate || !formData.endDate) {
      error('Validation Error', 'Soldier, Start Date, and End Date are required.');
      return;
    }

    if (totalDays <= 0) {
      error('Invalid Dates', 'End Date must be on or after Start Date.');
      return;
    }

    if (isLimitReached) {
      error('P LEAVE LIMIT REACHED', `Soldier has already utilized all ${pLimit} days of annual P Leave.`);
      return;
    }

    if (isInsufficient) {
      error(
        'Insufficient P Leave Balance',
        `Maximum: ${pLimit}d, Used: ${pUsed}d, Remaining: ${pRemaining}d, Requested: ${totalDays}d.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      if (leaveRecord) {
        await api.updateLeave(leaveRecord.id, {
          ...formData,
          totalDays,
        });
        success('Leave Updated', `Updated particulars for ${formData.leaveType.replace('_', ' ')}`);
      } else {
        const res = await api.sanctionLeave({
          ...formData,
          totalDays,
        });

        if (res.advisory) {
          warning('C Leave Cadence Advisory', res.advisory);
        } else {
          success('Leave Sanctioned', `Sanctioned ${totalDays} days ${formData.leaveType.replace('_', ' ')}`);
        }
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      error('Leave Save Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedSoldier = personnelList.find((p) => p.id === formData.personnelId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={leaveRecord ? 'Edit Regimental Leave Record' : 'Sanction Regimental Leave'}
      subtitle="55 Fd Amb (10 Inf Div) - Strict Rank-Based P-Leave (30d Officers / 60d JCO/ORs)"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Searchable Soldier Selection */}
          <div className="sm:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                Select Soldier *
              </label>
              {!leaveRecord && selectedSoldier && (
                <button
                  type="button"
                  onClick={() => setIsSearching(!isSearching)}
                  className="text-amber-400 hover:text-amber-300 text-[11px] font-bold flex items-center space-x-1 transition-colors"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{isSearching ? 'Close Search' : 'Search / Change Soldier'}</span>
                </button>
              )}
            </div>

            {/* Selected Soldier Display Card */}
            {selectedSoldier && !isSearching && (
              <div className="p-3 rounded-xl bg-tactical-950 border border-slate-700 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <RankBadge rank={selectedSoldier.rank} />
                  <div>
                    <div className="flex items-center space-x-2">
                      <strong className="text-white text-xs">{selectedSoldier.name}</strong>
                      <span className="font-mono text-amber-400 text-xs font-bold">({selectedSoldier.armyNumber})</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Trade: <span className="text-slate-200 font-semibold">{selectedSoldier.trade}</span> • Appt: <span className="text-slate-300">{selectedSoldier.appointment || 'General Duty'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <StatusBadge status={selectedSoldier.currentStatus} />
                  {!leaveRecord && (
                    <button
                      type="button"
                      onClick={() => setIsSearching(true)}
                      className="px-2.5 py-1 rounded-lg bg-tactical-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold border border-slate-600 transition-colors"
                    >
                      Change
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Search Input & Interactive Dropdown */}
            {(!selectedSoldier || isSearching) && !leaveRecord && (
              <div className="space-y-2 p-3 rounded-xl bg-tactical-950 border border-slate-700">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search by Army No, Name, or Rank (e.g. 12345, Rahman, Sainik)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 rounded-xl bg-tactical-900 border border-slate-600 text-white placeholder-slate-500 font-medium focus:outline-none focus:border-amber-500 text-xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span>Found {filteredPersonnel.length} matching personnel</span>
                  {selectedSoldier && (
                    <button
                      type="button"
                      onClick={() => setIsSearching(false)}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      Keep Current ({selectedSoldier.name})
                    </button>
                  )}
                </div>

                {/* Filtered Scrollable List */}
                <div className="max-h-56 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-800/60">
                  {filteredPersonnel.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-xs italic">
                      No personnel matching "{searchQuery}" found.
                    </div>
                  ) : (
                    filteredPersonnel.map((p) => {
                      const isSelected = p.id === formData.personnelId;
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            handleSelectSoldier(p.id);
                            setIsSearching(false);
                            setSearchQuery('');
                          }}
                          className={`p-2 rounded-lg cursor-pointer transition-all flex items-center justify-between text-xs ${
                            isSelected
                              ? 'bg-amber-500/10 border border-amber-500/40 text-white'
                              : 'hover:bg-tactical-900 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <RankBadge rank={p.rank} />
                            <div>
                              <div className="flex items-center space-x-1.5">
                                <strong className="text-white">{p.name}</strong>
                                <span className="font-mono text-amber-400 text-[11px] font-bold">({p.armyNumber})</span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {p.trade} • {p.appointment || 'General Duty'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <StatusBadge status={p.currentStatus} />
                            {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Leave Type */}
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
              Leave Category *
            </label>
            <select
              value={formData.leaveType}
              onChange={(e) => setFormData({ ...formData, leaveType: e.target.value as LeaveType })}
              className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-white font-semibold"
            >
              {LEAVE_TYPES.map((lt) => (
                <option key={lt.type} value={lt.type}>
                  {lt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
              Leave Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-white font-semibold"
            >
              <option value="ACTIVE">ACTIVE (Currently Away)</option>
              <option value="UPCOMING">UPCOMING (Scheduled)</option>
              <option value="RETURNED">RETURNED (Restored)</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
              Leave Start Date *
            </label>
            <input
              type="date"
              required
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-white font-mono"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
              Leave End Date *
            </label>
            <input
              type="date"
              required
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-white font-mono"
            />
          </div>

          {/* Calculated Duration */}
          <div className="sm:col-span-2 p-2.5 rounded-xl bg-tactical-950 border border-slate-800 flex items-center justify-between font-mono">
            <span className="text-slate-400">Total Sanctioned Duration:</span>
            <strong className={`text-sm ${totalDays > 0 ? 'text-amber-400' : 'text-rose-400'}`}>
              {totalDays > 0 ? `${totalDays} Days` : 'Invalid Range'}
            </strong>
          </div>

          {/* Rank-Specific P Leave Entitlement Status Card */}
          {isPLeave && soldierEntitlement && (
            <div className="sm:col-span-2 p-3.5 rounded-xl bg-tactical-950 border border-blue-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 font-bold text-blue-300">
                  <CalendarRange className="w-4 h-4" />
                  <span>
                    Annual P-Leave Entitlement ({isOfficerRank(soldierEntitlement.rank) ? 'Officer Rate: 30d' : 'JCO/OR Rate: 60d'})
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  isLimitReached ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                  isInsufficient ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                  'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}>
                  {isLimitReached ? 'LIMIT REACHED' : isInsufficient ? 'INSUFFICIENT BALANCE' : 'ELIGIBLE'}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-mono pt-1">
                <div className="p-1.5 rounded bg-tactical-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Annual Cap</span>
                  <strong className="text-white">{pLimit}d</strong>
                </div>
                <div className="p-1.5 rounded bg-tactical-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Used This Year</span>
                  <strong className="text-blue-400">{pUsed}d</strong>
                </div>
                <div className="p-1.5 rounded bg-tactical-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Remaining</span>
                  <strong className="text-emerald-400">{pRemaining}d</strong>
                </div>
                <div className="p-1.5 rounded bg-tactical-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Requested</span>
                  <strong className={isInsufficient ? 'text-rose-400' : 'text-amber-400'}>{totalDays}d</strong>
                </div>
              </div>

              {isInsufficient && (
                <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-500/40 text-[11px] text-rose-300 font-medium">
                  <strong>Insufficient P Leave Balance:</strong> Requested {totalDays} days exceeds remaining balance of {pRemaining} days.
                </div>
              )}
            </div>
          )}

          {/* Leave Reason */}
          <div className="sm:col-span-2">
            <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
              Sanction Ground / Official Reason
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Routine Rest & Recuperation / Family Emergency / Medical Treatment"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-white"
            />
          </div>

          {/* Destination Address */}
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
              Leave Station / Home Address
            </label>
            <input
              type="text"
              placeholder="e.g. Vill: Joypurhat, Dist: Bogura"
              value={formData.destinationAddress}
              onChange={(e) => setFormData({ ...formData, destinationAddress: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-white"
            />
          </div>

          {/* Emergency Contact */}
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
              Emergency Contact Number
            </label>
            <input
              type="text"
              placeholder="e.g. 01712-XXXXXX"
              value={formData.emergencyContact}
              onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-white font-mono"
            />
          </div>
        </div>

        {/* Rule Notes */}
        <div className="p-3 rounded-xl bg-tactical-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
          <div className="font-bold text-white flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Military Leave Governance Rules</span>
          </div>
          <p>
            • <strong>Officers (Lt Col to 2Lt):</strong> Max <strong>30 days</strong> P Leave / calendar year.
          </p>
          <p>
            • <strong>JCOs & Other Ranks (MWO to Sainik, NC(E), Civil):</strong> Max <strong>60 days</strong> P Leave / calendar year.
          </p>
          <p>
            • <strong>C Leave:</strong> Scheduled at 3-month intervals (~90 days). Advisory warning generated if interval &lt; 3 months.
          </p>
        </div>

        {/* Buttons */}
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
            disabled={isSubmitting || totalDays <= 0 || isLimitReached || isInsufficient}
            className="px-5 py-2 rounded-xl bg-army-600 hover:bg-army-500 text-white font-bold disabled:opacity-50 shadow-lg"
          >
            {isSubmitting ? 'Saving...' : leaveRecord ? 'Update Leave Record' : 'Sanction Leave'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
