import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Personnel, RPTimelineSlot } from '../../types';
import { UNIT_NAME } from '../../utils/constants';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { format } from 'date-fns';
import {
  Shield,
  Clock,
  Plus,
  Trash2,
  AlertTriangle,
  Save,
  CheckCircle2,
  Layers,
  UserCheck,
} from 'lucide-react';

interface RPTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: string;
}

export const RPTimelineModal: React.FC<RPTimelineModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialDate,
}) => {
  const { success, warning, error } = useToast();
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [selectedDate, setSelectedDate] = useState(initialDate || format(new Date(), 'yyyy-MM-dd'));
  const [isSaving, setIsSaving] = useState(false);

  // Default 24-Hour Configurable Timeline Slots (Fully customizable)
  const [slots, setSlots] = useState<RPTimelineSlot[]>([
    {
      id: 'rp_slot_1',
      startTime: '00:00',
      endTime: '04:00',
      guardCommanders: [''],
      guards: ['', ''],
      location: 'Main Regimental Gate Post',
      remarks: 'Night Perimeter Watch',
    },
    {
      id: 'rp_slot_2',
      startTime: '04:00',
      endTime: '08:00',
      guardCommanders: [''],
      guards: ['', ''],
      location: 'Main Regimental Gate Post',
      remarks: 'Dawn Gate Security',
    },
    {
      id: 'rp_slot_3',
      startTime: '08:00',
      endTime: '12:00',
      guardCommanders: [''],
      guards: ['', ''],
      location: 'Main Regimental Gate Post',
      remarks: 'Morning Traffic & Entry Control',
    },
    {
      id: 'rp_slot_4',
      startTime: '12:00',
      endTime: '16:00',
      guardCommanders: [''],
      guards: ['', ''],
      location: 'Main Regimental Gate Post',
      remarks: 'Afternoon Gate Detail',
    },
    {
      id: 'rp_slot_5',
      startTime: '16:00',
      endTime: '20:00',
      guardCommanders: [''],
      guards: ['', ''],
      location: 'Main Regimental Gate Post',
      remarks: 'Evening Line Security',
    },
    {
      id: 'rp_slot_6',
      startTime: '20:00',
      endTime: '00:00',
      guardCommanders: [''],
      guards: ['', ''],
      location: 'Main Regimental Gate Post',
      remarks: 'Night Gate Lockdown',
    },
  ]);

  useEffect(() => {
    if (isOpen) {
      api.getPersonnel({ isActive: true }).then((res) => {
        setPersonnelList(res.personnel);
      });
    }
  }, [isOpen]);

  // Slot Handlers
  const handleAddSlot = () => {
    setSlots([
      ...slots,
      {
        id: `rp_slot_${Date.now()}`,
        startTime: '08:00',
        endTime: '12:00',
        guardCommanders: [''],
        guards: ['', ''],
        location: 'Main Regimental Gate Post',
        remarks: '',
      },
    ]);
  };

  const handleRemoveSlot = (index: number) => {
    const updated = [...slots];
    updated.splice(index, 1);
    setSlots(updated);
  };

  const handleSlotChange = (index: number, field: string, value: any) => {
    const updated = [...slots];
    (updated[index] as any)[field] = value;
    setSlots(updated);
  };

  // Guard Commander Slots Handlers
  const handleAddGcSlot = (slotIdx: number) => {
    const updated = [...slots];
    updated[slotIdx].guardCommanders.push('');
    setSlots(updated);
  };

  const handleRemoveGcSlot = (slotIdx: number, gcIdx: number) => {
    const updated = [...slots];
    updated[slotIdx].guardCommanders.splice(gcIdx, 1);
    setSlots(updated);
  };

  const handleGcChange = (slotIdx: number, gcIdx: number, pId: string) => {
    const updated = [...slots];
    updated[slotIdx].guardCommanders[gcIdx] = pId;
    setSlots(updated);
  };

  // Guard Slots Handlers
  const handleAddGuardSlot = (slotIdx: number) => {
    const updated = [...slots];
    updated[slotIdx].guards.push('');
    setSlots(updated);
  };

  const handleRemoveGuardSlot = (slotIdx: number, gdIdx: number) => {
    const updated = [...slots];
    updated[slotIdx].guards.splice(gdIdx, 1);
    setSlots(updated);
  };

  const handleGuardChange = (slotIdx: number, gdIdx: number, pId: string) => {
    const updated = [...slots];
    updated[slotIdx].guards[gdIdx] = pId;
    setSlots(updated);
  };

  // Save RP 24-Hour Timeline
  const handleSaveTimeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) {
      error('Validation Error', 'Duty date is required.');
      return;
    }

    if (slots.length === 0) {
      error('Validation Error', 'At least one RP timeline slot is required.');
      return;
    }

    // Check if any slot has personnel
    let hasAnyPersonnel = false;
    slots.forEach((s) => {
      if (s.guardCommanders.some((id) => Boolean(id)) || s.guards.some((id) => Boolean(id))) {
        hasAnyPersonnel = true;
      }
    });

    if (!hasAnyPersonnel) {
      error('Empty Timeline', 'Please select personnel for at least one RP slot before saving.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.saveRPTimeline({
        date: selectedDate,
        slots,
      });

      if (res.warnings && res.warnings.length > 0) {
        res.warnings.forEach((w) => warning('Availability Advisory', w));
      }

      success('RP Timeline Configured', `Saved RP 24-Hour Timeline (${res.createdCount} duty details) on ${selectedDate}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      error('Save Failed', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="RP DUTY — 24-Hour Configurable Timeline Editor"
      subtitle={`${UNIT_NAME} • Define Custom Time Slots, Variable Guard Commanders & Guards`}
      maxWidth="5xl"
    >
      <form onSubmit={handleSaveTimeline} className="space-y-5 text-xs">
        {/* Top Controls: Date & Add Slot Button */}
        <div className="p-3.5 rounded-xl bg-tactical-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-white font-bold uppercase">RP Duty Date:</span>
            <input
              type="date"
              required
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-tactical-900 border border-slate-700 text-white font-bold text-sm"
            />
          </div>

          <button
            type="button"
            onClick={handleAddSlot}
            className="px-3.5 py-1.5 rounded-xl bg-tactical-900 hover:bg-tactical-800 text-amber-400 border border-amber-500/30 font-bold flex items-center space-x-1.5 shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Time Slot</span>
          </button>
        </div>

        {/* Timeline Slots Container */}
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {slots.map((slot, sIdx) => (
            <div
              key={slot.id}
              className="p-4 rounded-2xl bg-tactical-950 border border-slate-800 space-y-3.5 shadow-sm"
            >
              {/* Slot Header: Timings, Location & Remove */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-800 gap-2">
                <div className="flex items-center space-x-2 font-mono">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                    Slot {sIdx + 1}
                  </span>
                  <div className="flex items-center space-x-1">
                    <input
                      type="time"
                      required
                      value={slot.startTime}
                      onChange={(e) => handleSlotChange(sIdx, 'startTime', e.target.value)}
                      className="px-2 py-1 rounded-lg bg-tactical-900 border border-slate-700 text-white font-bold"
                    />
                    <span className="text-slate-500 font-bold">-</span>
                    <input
                      type="time"
                      required
                      value={slot.endTime}
                      onChange={(e) => handleSlotChange(sIdx, 'endTime', e.target.value)}
                      className="px-2 py-1 rounded-lg bg-tactical-900 border border-slate-700 text-white font-bold"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Location / Gate Post"
                    value={slot.location}
                    onChange={(e) => handleSlotChange(sIdx, 'location', e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-tactical-900 border border-slate-700 text-white font-sans text-xs"
                  />
                  {slots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSlot(sIdx)}
                      className="p-1.5 rounded-lg bg-tactical-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-800"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Guard Commanders & Guards Sub-grids */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Guard Commander Slots */}
                <div className="p-3 rounded-xl bg-tactical-900/90 border border-amber-500/20 space-y-2.5">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                    <span className="font-bold text-amber-300 font-mono text-[11px] uppercase flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                      Guard Commanders ({slot.guardCommanders.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddGcSlot(sIdx)}
                      className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Add GC</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {slot.guardCommanders.map((gcId, gcIdx) => {
                      const selSoldier = personnelList.find((p) => p.id === gcId);
                      return (
                        <div key={gcIdx} className="space-y-1">
                          <div className="flex items-center space-x-1.5">
                            <select
                              value={gcId}
                              onChange={(e) => handleGcChange(sIdx, gcIdx, e.target.value)}
                              className="flex-1 px-2 py-1.5 rounded-lg bg-tactical-950 border border-slate-700 text-white font-sans text-xs"
                            >
                              <option value="">-- Select Guard Commander --</option>
                              {personnelList.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.rank} {p.name} ({p.armyNumber}) - {p.trade} {p.currentStatus !== 'PRESENT' ? `[${p.currentStatus}]` : ''}
                                </option>
                              ))}
                            </select>
                            {slot.guardCommanders.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveGcSlot(sIdx, gcIdx)}
                                className="text-slate-500 hover:text-rose-400 p-1"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          {selSoldier && selSoldier.currentStatus !== 'PRESENT' && (
                            <div className="text-[10px] text-rose-400 font-mono italic">
                              ⚠️ Warning: {selSoldier.currentStatus} ({selSoldier.statusReason || 'Unavailable'})
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Guard Slots */}
                <div className="p-3 rounded-xl bg-tactical-900/90 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                    <span className="font-bold text-slate-300 font-mono text-[11px] uppercase flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-slate-400" />
                      Guards / Sentries ({slot.guards.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddGuardSlot(sIdx)}
                      className="text-[10px] font-bold text-slate-300 hover:text-white flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Add Guard</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {slot.guards.map((gdId, gdIdx) => {
                      const selSoldier = personnelList.find((p) => p.id === gdId);
                      return (
                        <div key={gdIdx} className="space-y-1">
                          <div className="flex items-center space-x-1.5">
                            <select
                              value={gdId}
                              onChange={(e) => handleGuardChange(sIdx, gdIdx, e.target.value)}
                              className="flex-1 px-2 py-1.5 rounded-lg bg-tactical-950 border border-slate-700 text-white font-sans text-xs"
                            >
                              <option value="">-- Select Guard Sentry --</option>
                              {personnelList.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.rank} {p.name} ({p.armyNumber}) - {p.trade} {p.currentStatus !== 'PRESENT' ? `[${p.currentStatus}]` : ''}
                                </option>
                              ))}
                            </select>
                            {slot.guards.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveGuardSlot(sIdx, gdIdx)}
                                className="text-slate-500 hover:text-rose-400 p-1"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          {selSoldier && selSoldier.currentStatus !== 'PRESENT' && (
                            <div className="text-[10px] text-rose-400 font-mono italic">
                              ⚠️ Warning: {selSoldier.currentStatus} ({selSoldier.statusReason || 'Unavailable'})
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Slot Remarks */}
              <div>
                <input
                  type="text"
                  placeholder="Special orders / gate instructions for this time slot..."
                  value={slot.remarks || ''}
                  onChange={(e) => handleSlotChange(sIdx, 'remarks', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-tactical-900 border border-slate-800 text-slate-300 placeholder-slate-600 text-xs"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <div className="text-[11px] text-slate-400 font-mono">
            * 24-Hour Timeline is fully customizable with variable manpower per slot.
          </div>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-tactical-800 text-slate-300 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 rounded-xl bg-army-600 hover:bg-army-500 text-white font-bold disabled:opacity-50 shadow-lg flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Timeline...' : 'Save RP 24-Hour Timeline'}</span>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
