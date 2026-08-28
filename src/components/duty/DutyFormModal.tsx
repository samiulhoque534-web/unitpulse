import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { DutyType, DutyRole, Personnel } from '../../types';
import { DUTY_TYPES, DUTY_ROLES, UNIT_NAME } from '../../utils/constants';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { format } from 'date-fns';
import { AlertTriangle, Clock, Shield } from 'lucide-react';

interface DutyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: string;
  initialPersonnelId?: string;
}

export const DutyFormModal: React.FC<DutyFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialDate,
  initialPersonnelId,
}) => {
  const { success, warning, error } = useToast();
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    date: initialDate || format(new Date(), 'yyyy-MM-dd'),
    personnelId: initialPersonnelId || '',
    dutyType: 'Kote Duty' as DutyType,
    dutyRole: 'Guard Commander' as DutyRole,
    shiftName: 'Shift 1',
    location: 'Main Armory',
    startTime: '06:00',
    endTime: '12:00',
    remarks: '',
  });

  useEffect(() => {
    if (isOpen) {
      api.getPersonnel({ isActive: true }).then((res) => {
        setPersonnelList(res.personnel);
        if (!formData.personnelId && res.personnel.length > 0) {
          setFormData((prev) => ({
            ...prev,
            personnelId: initialPersonnelId || res.personnel[0].id,
          }));
        }
      });
    }
  }, [isOpen, initialPersonnelId]);

  const handleDutyTypeChange = (dt: DutyType) => {
    let defaultRole: DutyRole = 'Guard';
    let defaultLocation = 'Unit Lines';
    let start = '06:00';
    let end = '12:00';

    if (dt === 'Kote Duty') {
      defaultRole = 'Guard Commander';
      defaultLocation = 'Main Armory';
      start = '06:00';
      end = '12:00';
    } else if (dt === 'RP Duty') {
      defaultRole = 'Guard';
      defaultLocation = 'Main Regimental Gate';
      start = '06:00';
      end = '14:00';
    } else if (dt === 'Duty Officer') {
      defaultRole = 'Duty Officer';
      defaultLocation = 'Battalion HQ';
      start = '08:00';
      end = '08:00';
    } else if (dt === 'Duty JCO') {
      defaultRole = 'Duty JCO';
      defaultLocation = 'Unit Lines';
      start = '08:00';
      end = '08:00';
    } else if (dt === 'Duty Clerk') {
      defaultRole = 'Duty Clerk';
      defaultLocation = 'Battalion HQ Office';
      start = '08:00';
      end = '17:00';
    } else if (dt === '2nd Seater') {
      defaultRole = '2nd Seater';
      defaultLocation = 'CO Vehicle Escort';
      start = '08:00';
      end = '18:00';
    } else if (dt === 'Admin Driver') {
      defaultRole = 'Admin Driver';
      defaultLocation = 'MT Pool';
      start = '08:00';
      end = '20:00';
    } else if (dt === 'Canteen') {
      defaultRole = 'Canteen In-Charge';
      defaultLocation = 'Unit Canteen';
      start = '16:00';
      end = '21:00';
    } else if (dt === 'Medical Cover') {
      defaultRole = 'Medical Assistant';
      defaultLocation = 'MI Room / Field Amb Standby';
      start = '20:00';
      end = '06:00';
    }

    setFormData({
      ...formData,
      dutyType: dt,
      dutyRole: defaultRole,
      location: defaultLocation,
      startTime: start,
      endTime: end,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.personnelId || !formData.date || !formData.startTime || !formData.endTime) {
      error('Validation Error', 'All duty parameters are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.assignDuty(formData);
      if (res.hasOverlap) {
        warning('Duty Overlap Advisory', res.message);
      } else {
        success('Duty Assigned', `Assigned ${formData.dutyType} (${formData.dutyRole}) on ${formData.date}`);
      }
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
      title="Assign Regimental Duty Detail"
      subtitle={`${UNIT_NAME} — Kote (1 GC + 1 Guard), RP Variable, and Special Appointments`}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Date */}
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
              Duty Date *
            </label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-white font-mono"
            />
          </div>

          {/* Soldier Selection */}
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
              Select Soldier *
            </label>
            <select
              value={formData.personnelId}
              onChange={(e) => setFormData({ ...formData, personnelId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-white font-semibold"
            >
              {personnelList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.rank} {p.name} ({p.armyNumber}) - {p.trade}
                </option>
              ))}
            </select>
          </div>

          {/* Duty Type */}
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
              Duty Appointment *
            </label>
            <select
              value={formData.dutyType}
              onChange={(e) => handleDutyTypeChange(e.target.value as DutyType)}
              className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-white font-bold"
            >
              {DUTY_TYPES.map((dt) => (
                <option key={dt} value={dt}>
                  {dt}
                </option>
              ))}
            </select>
          </div>

          {/* Duty Role */}
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
              Assigned Role *
            </label>
            <select
              value={formData.dutyRole}
              onChange={(e) => setFormData({ ...formData, dutyRole: e.target.value as DutyRole })}
              className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-amber-300 font-bold font-mono"
            >
              {DUTY_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Shift Name */}
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
              Shift Identifier
            </label>
            <select
              value={formData.shiftName}
              onChange={(e) => setFormData({ ...formData, shiftName: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-white font-mono"
            >
              <option value="Shift 1">Shift 1 (06:00 - 12:00 / 14:00)</option>
              <option value="Shift 2">Shift 2 (12:00 / 14:00 - 18:00 / 22:00)</option>
              <option value="Shift 3">Shift 3 (18:00 / 22:00 - 22:00 / 06:00)</option>
              <option value="General">General / 24h Standing Duty</option>
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
              Location / Post
            </label>
            <input
              type="text"
              required
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-white"
            />
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
              Start Time *
            </label>
            <input
              type="time"
              required
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-white font-mono"
            />
          </div>

          {/* End Time */}
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
              End Time *
            </label>
            <input
              type="time"
              required
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-white font-mono"
            />
          </div>
        </div>

        {/* Remarks */}
        <div>
          <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
            Official Orders / Special Remarks
          </label>
          <input
            type="text"
            placeholder="e.g. Weapon Inspection, Standby Ambulance Escort, Key Custody"
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-white"
          />
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
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl bg-army-600 hover:bg-army-500 text-white font-bold disabled:opacity-50 shadow-lg"
          >
            {isSubmitting ? 'Assigning...' : 'Assign Duty'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
