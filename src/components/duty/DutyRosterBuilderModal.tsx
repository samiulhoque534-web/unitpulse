import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Personnel } from '../../types';
import { DUTY_TYPES, DUTY_ROLES, UNIT_NAME } from '../../utils/constants';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { format } from 'date-fns';
import {
  Shield,
  Clock,
  Plus,
  Trash2,
  AlertCircle,
  Save,
  CheckCircle2,
  Layers,
  UserCheck,
} from 'lucide-react';

interface DutyRosterBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: string;
}

interface DutySlot {
  id: string;
  dutyType: string;
  shiftName: string;
  dutyRole: string;
  personnelId: string;
  location: string;
  startTime: string;
  endTime: string;
  remarks?: string;
}

export const DutyRosterBuilderModal: React.FC<DutyRosterBuilderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialDate,
}) => {
  const { success, warning, error } = useToast();
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [selectedDate, setSelectedDate] = useState(initialDate || format(new Date(), 'yyyy-MM-dd'));
  const [isSaving, setIsSaving] = useState(false);

  // KOTE SHIFTS: Exactly 3 Shifts with 1 Guard Commander + 1 Guard each (6 total)
  const [koteShifts, setKoteShifts] = useState([
    {
      shiftName: 'Shift 1',
      startTime: '06:00',
      endTime: '12:00',
      location: 'Main Armory / Kote',
      guardCommanderId: '',
      guardId: '',
    },
    {
      shiftName: 'Shift 2',
      startTime: '12:00',
      endTime: '18:00',
      location: 'Main Armory / Kote',
      guardCommanderId: '',
      guardId: '',
    },
    {
      shiftName: 'Shift 3',
      startTime: '18:00',
      endTime: '22:00',
      location: 'Main Armory / Kote',
      guardCommanderId: '',
      guardId: '',
    },
  ]);

  // RP SHIFTS: Variable manpower per shift with dynamic slots
  const [rpShifts, setRpShifts] = useState([
    {
      shiftName: 'Shift 1',
      startTime: '06:00',
      endTime: '14:00',
      location: 'Main Regimental Gate Post',
      slots: [
        { id: 'rp_s1_1', role: 'Guard Commander', personnelId: '' },
        { id: 'rp_s1_2', role: 'Guard', personnelId: '' },
      ],
    },
    {
      shiftName: 'Shift 2',
      startTime: '14:00',
      endTime: '22:00',
      location: 'Main Regimental Gate Post',
      slots: [
        { id: 'rp_s2_1', role: 'Guard Commander', personnelId: '' },
        { id: 'rp_s2_2', role: 'Guard', personnelId: '' },
      ],
    },
    {
      shiftName: 'Shift 3',
      startTime: '22:00',
      endTime: '06:00',
      location: 'Main Regimental Gate Post',
      slots: [
        { id: 'rp_s3_1', role: 'Guard Commander', personnelId: '' },
        { id: 'rp_s3_2', role: 'Guard', personnelId: '' },
      ],
    },
  ]);

  // OTHER DUTY APPOINTMENTS
  const [otherDuties, setOtherDuties] = useState<DutySlot[]>([
    {
      id: 'oth_1',
      dutyType: 'Duty Officer',
      shiftName: '24h General',
      dutyRole: 'Duty Officer',
      personnelId: '',
      location: 'Battalion HQ',
      startTime: '08:00',
      endTime: '08:00',
      remarks: '24h Operational Command',
    },
    {
      id: 'oth_2',
      dutyType: 'Duty JCO',
      shiftName: '24h General',
      dutyRole: 'Duty JCO',
      personnelId: '',
      location: 'Unit Lines & Barracks',
      startTime: '08:00',
      endTime: '08:00',
      remarks: 'Lines Discipline & Roster',
    },
    {
      id: 'oth_3',
      dutyType: 'Duty Clerk',
      shiftName: 'Office Hours',
      dutyRole: 'Duty Clerk',
      personnelId: '',
      location: 'Battalion HQ Office',
      startTime: '08:00',
      endTime: '17:00',
      remarks: 'Admin & Dispatch',
    },
    {
      id: 'oth_4',
      dutyType: '2nd Seater',
      shiftName: 'Day Duty',
      dutyRole: '2nd Seater',
      personnelId: '',
      location: 'CO Ambulance Escort',
      startTime: '08:00',
      endTime: '18:00',
      remarks: 'Executive Transport Escort',
    },
    {
      id: 'oth_5',
      dutyType: 'Admin Driver',
      shiftName: 'Standby Pool',
      dutyRole: 'Admin Driver',
      personnelId: '',
      location: 'MT Pool',
      startTime: '08:00',
      endTime: '20:00',
      remarks: 'Ambulance Standby',
    },
    {
      id: 'oth_6',
      dutyType: 'Medical Cover',
      shiftName: 'Night Standby',
      dutyRole: 'Medical Assistant',
      personnelId: '',
      location: 'MI Room Emergency Ward',
      startTime: '20:00',
      endTime: '06:00',
      remarks: 'Emergency Triage Support',
    },
  ]);

  useEffect(() => {
    if (isOpen) {
      api.getPersonnel({ isActive: true }).then((res) => {
        setPersonnelList(res.personnel);
      });
    }
  }, [isOpen]);

  // RP Slot Handlers
  const handleAddRpSlot = (shiftIdx: number, role: string) => {
    const updated = [...rpShifts];
    updated[shiftIdx].slots.push({
      id: `rp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      role,
      personnelId: '',
    });
    setRpShifts(updated);
  };

  const handleRemoveRpSlot = (shiftIdx: number, slotIdx: number) => {
    const updated = [...rpShifts];
    updated[shiftIdx].slots.splice(slotIdx, 1);
    setRpShifts(updated);
  };

  const handleUpdateRpSlotPersonnel = (shiftIdx: number, slotIdx: number, personnelId: string) => {
    const updated = [...rpShifts];
    updated[shiftIdx].slots[slotIdx].personnelId = personnelId;
    setRpShifts(updated);
  };

  const handleUpdateRpSlotRole = (shiftIdx: number, slotIdx: number, role: string) => {
    const updated = [...rpShifts];
    updated[shiftIdx].slots[slotIdx].role = role;
    setRpShifts(updated);
  };

  // Other Duties Handlers
  const handleAddOtherDuty = () => {
    setOtherDuties([
      ...otherDuties,
      {
        id: `oth_${Date.now()}`,
        dutyType: 'Duty NCO',
        shiftName: 'General Duty',
        dutyRole: 'Duty NCO',
        personnelId: '',
        location: 'Unit Grounds',
        startTime: '08:00',
        endTime: '18:00',
        remarks: '',
      },
    ]);
  };

  const handleRemoveOtherDuty = (idx: number) => {
    const updated = [...otherDuties];
    updated.splice(idx, 1);
    setOtherDuties(updated);
  };

  const handleUpdateOtherDuty = (idx: number, field: string, value: string) => {
    const updated = [...otherDuties];
    (updated[idx] as any)[field] = value;
    if (field === 'dutyType') {
      updated[idx].dutyRole = value;
    }
    setOtherDuties(updated);
  };

  // Save Full Roster
  const handleSaveRoster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) {
      error('Validation Error', 'Duty date is required.');
      return;
    }

    const payloadDuties: any[] = [];

    // 1. Collect Kote duties (exact 1 GC + 1 Guard per shift = 6 assignments max)
    koteShifts.forEach((s) => {
      if (s.guardCommanderId) {
        payloadDuties.push({
          personnelId: s.guardCommanderId,
          dutyType: 'Kote Duty',
          dutyRole: 'Guard Commander',
          shiftName: s.shiftName,
          location: s.location,
          startTime: s.startTime,
          endTime: s.endTime,
          remarks: 'Kote Guard Commander',
        });
      }
      if (s.guardId) {
        payloadDuties.push({
          personnelId: s.guardId,
          dutyType: 'Kote Duty',
          dutyRole: 'Guard',
          shiftName: s.shiftName,
          location: s.location,
          startTime: s.startTime,
          endTime: s.endTime,
          remarks: 'Kote Sentry Guard',
        });
      }
    });

    // 2. Collect RP duties (variable manpower per shift)
    rpShifts.forEach((s) => {
      s.slots.forEach((slot) => {
        if (slot.personnelId) {
          payloadDuties.push({
            personnelId: slot.personnelId,
            dutyType: 'RP Duty',
            dutyRole: slot.role,
            shiftName: s.shiftName,
            location: s.location,
            startTime: s.startTime,
            endTime: s.endTime,
            remarks: `RP ${slot.role}`,
          });
        }
      });
    });

    // 3. Collect other appointments
    otherDuties.forEach((d) => {
      if (d.personnelId) {
        payloadDuties.push({
          personnelId: d.personnelId,
          dutyType: d.dutyType,
          dutyRole: d.dutyRole || d.dutyType,
          shiftName: d.shiftName,
          location: d.location,
          startTime: d.startTime,
          endTime: d.endTime,
          remarks: d.remarks || null,
        });
      }
    });

    if (payloadDuties.length === 0) {
      error('Empty Roster', 'Please select personnel for at least one duty detail before saving.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.batchAssignDuties({
        date: selectedDate,
        duties: payloadDuties,
      });

      success('Daily Roster Saved', `Successfully assigned ${res.createdCount} duty details for ${selectedDate}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      error('Roster Save Failed', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Dynamic Daily Duty Roster Builder"
      subtitle={`Configure Kote (3 Shifts x 2 Personnel), RP (Variable Manpower), and Appointments for ${UNIT_NAME}`}
      maxWidth="5xl"
    >
      <form onSubmit={handleSaveRoster} className="space-y-6 text-xs">
        {/* Date Selector Header */}
        <div className="p-3.5 rounded-xl bg-tactical-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-white font-bold uppercase">Effective Duty Date:</span>
          </div>
          <input
            type="date"
            required
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-tactical-900 border border-slate-700 text-white font-bold text-sm"
          />
        </div>

        {/* SECTION 1: KOTE DUTY (EXACTLY 3 SHIFTS, 1 GC + 1 GUARD PER SHIFT = 6 TOTAL) */}
        <div className="p-4 rounded-2xl bg-tactical-950/80 border border-red-500/30 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-red-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                1. KOTE DUTY (3 SHIFTS — EXACTLY 1 GUARD COMMANDER + 1 GUARD PER SHIFT)
              </h4>
            </div>
            <span className="text-[10px] font-mono text-red-400 font-bold px-2 py-0.5 rounded bg-red-950/40 border border-red-500/30">
              6 Assignments Total
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {koteShifts.map((s, idx) => (
              <div
                key={s.shiftName}
                className="p-3 rounded-xl bg-tactical-900 border border-slate-800 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                    <span className="font-bold text-white font-mono uppercase">{s.shiftName}</span>
                    <span className="text-[10px] font-mono text-slate-400">{s.startTime} - {s.endTime}</span>
                  </div>

                  <div className="space-y-2.5 mt-2.5">
                    {/* Guard Commander Slot */}
                    <div>
                      <label className="block text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-0.5">
                        Guard Commander (1 Person)
                      </label>
                      <select
                        value={s.guardCommanderId}
                        onChange={(e) => {
                          const updated = [...koteShifts];
                          updated[idx].guardCommanderId = e.target.value;
                          setKoteShifts(updated);
                        }}
                        className="w-full px-2 py-1.5 rounded-lg bg-tactical-950 border border-slate-700 text-white font-sans text-xs"
                      >
                        <option value="">-- Select Guard Commander --</option>
                        {personnelList.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.rank} {p.name} ({p.armyNumber}) - {p.trade}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Guard Slot */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-0.5">
                        Guard (1 Person)
                      </label>
                      <select
                        value={s.guardId}
                        onChange={(e) => {
                          const updated = [...koteShifts];
                          updated[idx].guardId = e.target.value;
                          setKoteShifts(updated);
                        }}
                        className="w-full px-2 py-1.5 rounded-lg bg-tactical-950 border border-slate-700 text-white font-sans text-xs"
                      >
                        <option value="">-- Select Guard Sentry --</option>
                        {personnelList.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.rank} {p.name} ({p.armyNumber}) - {p.trade}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-800/80">
                  Location: {s.location}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 2: RP DUTY (VARIABLE MANPOWER PER SHIFT WITH ADD PERSONNEL SLOTS) */}
        <div className="p-4 rounded-2xl bg-tactical-950/80 border border-amber-500/30 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                2. RP DUTY (VARIABLE MANPOWER — DYNAMIC GUARD COMMANDER & GUARD SLOTS)
              </h4>
            </div>
            <span className="text-[10px] font-mono text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-950/40 border border-amber-500/30">
              Configurable Manpower
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {rpShifts.map((s, shiftIdx) => (
              <div
                key={s.shiftName}
                className="p-3 rounded-xl bg-tactical-900 border border-slate-800 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                    <span className="font-bold text-white font-mono uppercase">{s.shiftName}</span>
                    <span className="text-[10px] font-mono text-slate-400">{s.startTime} - {s.endTime}</span>
                  </div>

                  {/* List of Dynamic Personnel Slots in this RP Shift */}
                  <div className="space-y-2 mt-2.5">
                    {s.slots.map((slot, slotIdx) => (
                      <div
                        key={slot.id}
                        className="p-2 rounded-lg bg-tactical-950 border border-slate-800 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <select
                            value={slot.role}
                            onChange={(e) => handleUpdateRpSlotRole(shiftIdx, slotIdx, e.target.value)}
                            className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-tactical-900 border border-slate-700 text-amber-300"
                          >
                            <option value="Guard Commander">Guard Commander</option>
                            <option value="Guard">Guard</option>
                          </select>

                          {s.slots.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRpSlot(shiftIdx, slotIdx)}
                              className="text-slate-500 hover:text-rose-400 p-0.5"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        <select
                          value={slot.personnelId}
                          onChange={(e) => handleUpdateRpSlotPersonnel(shiftIdx, slotIdx, e.target.value)}
                          className="w-full px-2 py-1 rounded-lg bg-tactical-900 border border-slate-700 text-white font-sans text-xs"
                        >
                          <option value="">-- Select Personnel --</option>
                          {personnelList.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.rank} {p.name} ({p.armyNumber}) - {p.trade}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add Slot Action Buttons */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddRpSlot(shiftIdx, 'Guard Commander')}
                    className="flex-1 py-1 rounded-lg bg-tactical-950 hover:bg-tactical-800 text-amber-300 border border-slate-700 font-mono text-[10px] font-bold flex items-center justify-center gap-1"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>+ Add GC</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddRpSlot(shiftIdx, 'Guard')}
                    className="flex-1 py-1 rounded-lg bg-tactical-950 hover:bg-tactical-800 text-slate-200 border border-slate-700 font-mono text-[10px] font-bold flex items-center justify-center gap-1"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>+ Add Guard</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 3: OTHER DUTY APPOINTMENTS (DUTY OFFICER, JCO, NCO, CLERK, 2ND SEATER, DRIVER, CANTEEN, MED COVER) */}
        <div className="p-4 rounded-2xl bg-tactical-950/80 border border-blue-500/30 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                3. OTHER REGIMENTAL DUTY APPOINTMENTS & SHIFTS
              </h4>
            </div>
            <button
              type="button"
              onClick={handleAddOtherDuty}
              className="px-2.5 py-1 rounded-lg bg-tactical-900 hover:bg-tactical-800 text-blue-300 border border-blue-500/30 text-xs font-bold font-mono flex items-center space-x-1"
            >
              <Plus className="w-3 h-3" />
              <span>Add Custom Appointment</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {otherDuties.map((d, idx) => (
              <div
                key={d.id}
                className="p-3 rounded-xl bg-tactical-900 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 items-center"
              >
                {/* Appointment Type */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    Appointment
                  </label>
                  <select
                    value={d.dutyType}
                    onChange={(e) => handleUpdateOtherDuty(idx, 'dutyType', e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-tactical-950 border border-slate-700 text-white font-bold"
                  >
                    {DUTY_TYPES.map((dt) => (
                      <option key={dt} value={dt}>{dt}</option>
                    ))}
                  </select>
                </div>

                {/* Assigned Personnel */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    Assigned Soldier
                  </label>
                  <select
                    value={d.personnelId}
                    onChange={(e) => handleUpdateOtherDuty(idx, 'personnelId', e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-tactical-950 border border-slate-700 text-white font-sans"
                  >
                    <option value="">-- Select Soldier --</option>
                    {personnelList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.rank} {p.name} ({p.armyNumber}) - {p.trade}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Timings */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    Timings (Start - End)
                  </label>
                  <div className="flex items-center space-x-1">
                    <input
                      type="time"
                      value={d.startTime}
                      onChange={(e) => handleUpdateOtherDuty(idx, 'startTime', e.target.value)}
                      className="w-full px-1.5 py-1 rounded bg-tactical-950 border border-slate-700 text-white font-mono text-[11px]"
                    />
                    <span className="text-slate-500">-</span>
                    <input
                      type="time"
                      value={d.endTime}
                      onChange={(e) => handleUpdateOtherDuty(idx, 'endTime', e.target.value)}
                      className="w-full px-1.5 py-1 rounded bg-tactical-950 border border-slate-700 text-white font-mono text-[11px]"
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    Location / Desk
                  </label>
                  <input
                    type="text"
                    value={d.location}
                    onChange={(e) => handleUpdateOtherDuty(idx, 'location', e.target.value)}
                    className="w-full px-2 py-1 rounded bg-tactical-950 border border-slate-700 text-white font-sans text-xs"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end space-x-2 pt-2 md:pt-0">
                  <button
                    type="button"
                    onClick={() => handleRemoveOtherDuty(idx)}
                    className="p-1.5 rounded-lg bg-tactical-950 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="text-[11px] text-slate-400 font-mono">
            * Kote is 3 shifts x 2 personnel (6 total). RP is variable with dynamic slots.
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
              className="px-6 py-2 rounded-xl bg-army-600 hover:bg-army-500 text-white font-bold transition-all shadow-lg flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Roster...' : 'Save Daily Roster'}</span>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
