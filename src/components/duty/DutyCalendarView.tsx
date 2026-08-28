import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { DutyRecord } from '../../types';
import { DutyTypeBadge, RankBadge } from '../common/Badge';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Moon,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';

interface DutyCalendarViewProps {
  onAssignDutyForDate: (date: string) => void;
}

export const DutyCalendarView: React.FC<DutyCalendarViewProps> = ({ onAssignDutyForDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState<Record<string, DutyRecord[]>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [isLoading, setIsLoading] = useState(true);

  const fetchCalendar = async () => {
    setIsLoading(true);
    try {
      const monthStr = format(currentMonth, 'yyyy-MM');
      const res = await api.getDutyCalendar(monthStr);
      setCalendarData(res.dateMap || {});
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, [currentMonth]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const selectedDuties = calendarData[selectedDateStr] || [];

  return (
    <div className="space-y-6">
      {/* Calendar Header & Month Navigation */}
      <div className="p-4 rounded-2xl bg-tactical-900 border border-slate-800 flex items-center justify-between shadow-tactical">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-army-600/20 border border-army-500/30 text-army-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-white font-mono uppercase tracking-wider">
              {format(currentMonth, 'MMMM yyyy')}
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              Monthly Regimental Duty Roster Grid
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1.5 rounded-xl bg-tactical-800 hover:bg-tactical-700 text-slate-200 border border-slate-700 text-xs font-bold font-mono"
          >
            Today
          </button>
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl bg-tactical-800 hover:bg-tactical-700 text-slate-200 border border-slate-700"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl bg-tactical-800 hover:bg-tactical-700 text-slate-200 border border-slate-700"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid + Daily Drawer Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Calendar Grid (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl bg-tactical-900 border border-slate-800 p-4 shadow-tactical space-y-3">
          {/* Weekday Header */}
          <div className="grid grid-cols-7 gap-1 text-center font-mono text-[11px] font-bold text-slate-400 pb-2 border-b border-slate-800">
            {weekDays.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-xs font-sans">
            {days.map((day) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const dayDuties = calendarData[dayStr] || [];
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentMonthDay = isSameMonth(day, currentMonth);
              const isTodayDate = isToday(day);

              return (
                <div
                  key={day.toString()}
                  onClick={() => setSelectedDate(day)}
                  className={`min-h-[90px] p-2 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-army-950/80 border-army-500 ring-1 ring-army-500 shadow-md'
                      : isTodayDate
                      ? 'bg-tactical-950 border-amber-500/50'
                      : isCurrentMonthDay
                      ? 'bg-tactical-950/70 border-slate-800/80 hover:border-slate-700'
                      : 'bg-tactical-950/30 border-slate-900 text-slate-600'
                  }`}
                >
                  {/* Top Day Header */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-mono font-bold ${
                        isTodayDate
                          ? 'w-5 h-5 rounded-full bg-amber-500 text-tactical-950 flex items-center justify-center'
                          : isCurrentMonthDay
                          ? 'text-white'
                          : 'text-slate-600'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayDuties.length > 0 && (
                      <span className="text-[9px] font-mono font-bold px-1 rounded bg-slate-800 text-slate-300">
                        {dayDuties.length}
                      </span>
                    )}
                  </div>

                  {/* Duty Chips Preview */}
                  <div className="space-y-1 mt-1 overflow-hidden">
                    {dayDuties.slice(0, 2).map((d) => (
                      <div
                        key={d.id}
                        className="truncate text-[10px] px-1.5 py-0.5 rounded bg-slate-800/90 text-slate-200 border border-slate-700 font-medium"
                      >
                        {d.dutyType}
                      </div>
                    ))}
                    {dayDuties.length > 2 && (
                      <div className="text-[9px] text-slate-400 font-mono pl-1">
                        +{dayDuties.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Details Drawer (1 col) */}
        <div className="rounded-2xl bg-tactical-900 border border-slate-800 p-5 space-y-4 shadow-tactical flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                  Selected Duty Date
                </span>
                <h4 className="text-base font-black text-white font-mono">
                  {selectedDate ? format(selectedDate, 'EEEE, dd MMM yyyy') : 'Select Date'}
                </h4>
              </div>
              <button
                onClick={() => onAssignDutyForDate(selectedDateStr)}
                className="px-3 py-1.5 rounded-xl bg-army-600 hover:bg-army-500 text-white text-xs font-bold transition-all flex items-center space-x-1 shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Assign</span>
              </button>
            </div>

            {/* List of Duties for Selected Date */}
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {selectedDuties.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs italic">
                  No duties scheduled for this date. Click "Assign" to add a guard or detail.
                </div>
              ) : (
                selectedDuties.map((d) => (
                  <div
                    key={d.id}
                    className="p-3 rounded-xl bg-tactical-950 border border-slate-800 hover:border-slate-700 transition-all text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <DutyTypeBadge type={d.dutyType} />
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {d.durationHours} hrs
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-200">
                      <div className="flex items-center space-x-1.5">
                        <RankBadge rank={d.rank || 'Sainik'} />
                        <strong className="text-white">{d.name}</strong>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Army No: <strong className="text-amber-400">{d.armyNumber}</strong> • Trade: {d.trade}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800/80">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{d.startTime} - {d.endTime}</span>
                      </span>
                      {d.isNightDuty && (
                        <span className="text-purple-400 flex items-center gap-1 text-[10px] font-bold">
                          <Moon className="w-3 h-3" />
                          <span>{d.nightDutyHours}h Night</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
