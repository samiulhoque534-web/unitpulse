import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Personnel, RankType, TradeType, ManpowerStatus } from '../../types';
import { RANKS, TRADES, MANPOWER_STATUSES } from '../../utils/constants';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

interface PersonnelFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  personnel?: Personnel | null;
}

export const PersonnelFormModal: React.FC<PersonnelFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  personnel,
}) => {
  const { success, error } = useToast();
  const [formData, setFormData] = useState({
    armyNumber: '',
    rank: 'Sainik' as RankType,
    name: '',
    trade: 'MA' as TradeType,
    appointment: 'General Duty',
    currentStatus: 'PRESENT' as ManpowerStatus,
    statusReason: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (personnel) {
      setFormData({
        armyNumber: personnel.armyNumber,
        rank: personnel.rank,
        name: personnel.name,
        trade: personnel.trade,
        appointment: personnel.appointment,
        currentStatus: personnel.currentStatus,
        statusReason: personnel.statusReason || '',
      });
    } else {
      setFormData({
        armyNumber: '',
        rank: 'Sainik',
        name: '',
        trade: 'MA',
        appointment: 'General Duty',
        currentStatus: 'PRESENT',
        statusReason: '',
      });
    }
  }, [personnel, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.armyNumber || !formData.name) {
      error('Validation Error', 'Army Number and Name are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (personnel) {
        await api.updatePersonnel(personnel.id, formData);
        success('Personnel Updated', `Updated particulars for ${formData.rank} ${formData.name}`);
      } else {
        await api.createPersonnel(formData);
        success('Personnel Enrolled', `Added ${formData.rank} ${formData.name} (${formData.armyNumber})`);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      error('Save Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={personnel ? 'Edit Soldier Particulars' : 'Enroll New Soldier (55 Fd Amb)'}
      subtitle="Regimental Service Master Particulars Record"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Army Number */}
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
              Army Number *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. No-1460123 / BA-8452"
              value={formData.armyNumber}
              onChange={(e) => setFormData({ ...formData, armyNumber: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-white font-mono uppercase placeholder-slate-500"
            />
          </div>

          {/* Rank */}
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
              Rank *
            </label>
            <select
              value={formData.rank}
              onChange={(e) => setFormData({ ...formData, rank: e.target.value as RankType })}
              className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-white font-semibold"
            >
              {RANKS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Full Name */}
          <div className="sm:col-span-2">
            <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
              Full Official Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Md. Rafiqul Islam"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-white placeholder-slate-500"
            />
          </div>

          {/* Trade */}
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
              Trade Specialization *
            </label>
            <select
              value={formData.trade}
              onChange={(e) => setFormData({ ...formData, trade: e.target.value as TradeType })}
              className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-white font-semibold"
            >
              {TRADES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Appointment */}
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
              Unit Appointment
            </label>
            <input
              type="text"
              placeholder="e.g. Nursing Assistant / Driver / CHM"
              value={formData.appointment}
              onChange={(e) => setFormData({ ...formData, appointment: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-white"
            />
          </div>

          {/* Manpower Status */}
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
              Current Manpower Status
            </label>
            <select
              value={formData.currentStatus}
              onChange={(e) => setFormData({ ...formData, currentStatus: e.target.value as ManpowerStatus })}
              className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-white font-semibold font-mono"
            >
              {MANPOWER_STATUSES.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Reason */}
          {formData.currentStatus !== 'PRESENT' && (
            <div>
              <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                Official Reason / Location
              </label>
              <input
                type="text"
                placeholder="e.g. Div HQ Attachment / Course at AFMSD"
                value={formData.statusReason}
                onChange={(e) => setFormData({ ...formData, statusReason: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-white"
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
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
            {isSubmitting ? 'Saving...' : personnel ? 'Update Particulars' : 'Enroll Soldier'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
