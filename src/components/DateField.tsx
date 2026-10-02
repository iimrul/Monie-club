import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getCurrentDateString } from '../services/paymentDueManager';

type DateFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'lang'> & {
  value?: string;
  onChange: (value: string) => void;
  label: string;
  lang?: 'en' | 'bn';
};

function parseDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

function dateKey(date: Date) {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Presentation-only date picker. Both entry methods send the same YYYY-MM-DD value. */
export const DateField: React.FC<DateFieldProps> = ({ value = '', onChange, label, lang = 'en', className = '', min, max, disabled, readOnly, ...inputProps }) => {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => parseDate(value) || parseDate(getCurrentDateString())!);
  const [focusedDate, setFocusedDate] = useState(value || getCurrentDateString());
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [themeClass, setThemeClass] = useState('theme-light');
  const fieldRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const locale = lang === 'bn' ? 'bn-BD' : 'en-GB';
  const minKey = typeof min === 'string' && parseDate(min) ? min : undefined;
  const maxKey = typeof max === 'string' && parseDate(max) ? max : undefined;
  const todayKey = getCurrentDateString();
  const allowed = (key: string) => (!minKey || key >= minKey) && (!maxKey || key <= maxKey);

  const close = (returnFocus = false) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  const openCalendar = () => {
    if (open) { close(); return; }
    let initialKey = parseDate(value) ? value : todayKey;
    if (minKey && initialKey < minKey) initialKey = minKey;
    if (maxKey && initialKey > maxKey) initialKey = maxKey;
    const initialDate = parseDate(initialKey) || parseDate(todayKey)!;
    setMonth(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1, 12));
    setFocusedDate(dateKey(initialDate));
    const themedParent = fieldRef.current?.closest('.theme-light, .theme-dark, .theme-warm, .theme-midnight');
    setThemeClass(['theme-light', 'theme-dark', 'theme-warm', 'theme-midnight'].find(c => themedParent?.classList.contains(c)) || 'theme-light');
    setPosition(null);
    setOpen(true);
  };

  useLayoutEffect(() => {
    if (!open) return;
    const placePanel = () => {
      const rect = fieldRef.current?.getBoundingClientRect();
      if (!rect || !panelRef.current) return;
      const width = Math.min(344, window.innerWidth - 32);
      const height = panelRef.current.offsetHeight;
      const top = rect.bottom + height + 12 <= window.innerHeight
        ? rect.bottom + 8
        : Math.max(12, Math.min(rect.top - height - 8, window.innerHeight - height - 12));
      setPosition({ top, left: Math.max(16, Math.min(rect.left, window.innerWidth - width - 16)), width });
    };
    placePanel();
    window.addEventListener('resize', placePanel);
    window.addEventListener('scroll', placePanel, true);
    return () => {
      window.removeEventListener('resize', placePanel);
      window.removeEventListener('scroll', placePanel, true);
    };
  }, [open, month]);

  useEffect(() => {
    if (!open || !position) return;
    panelRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focusedDate}"]`)?.focus();
  }, [open, focusedDate, month, Boolean(position)]);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!fieldRef.current?.contains(event.target as Node) && !panelRef.current?.contains(event.target as Node)) close();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); }
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape, true);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape, true);
    };
  }, [open]);

  const chooseDate = (key: string) => {
    if (!allowed(key)) return;
    onChange(key);
    close(true);
  };

  const changeMonth = (year: number, index: number) => {
    let next = new Date(year, index, 1, 12);
    if (minKey && dateKey(next).slice(0, 7) < minKey.slice(0, 7)) {
      const minimum = parseDate(minKey)!;
      next = new Date(minimum.getFullYear(), minimum.getMonth(), 1, 12);
    }
    if (maxKey && dateKey(next).slice(0, 7) > maxKey.slice(0, 7)) {
      const maximum = parseDate(maxKey)!;
      next = new Date(maximum.getFullYear(), maximum.getMonth(), 1, 12);
    }
    setMonth(next);
    const firstAllowed = minKey && dateKey(next) < minKey && minKey.slice(0, 7) === dateKey(next).slice(0, 7) ? minKey : dateKey(next);
    setFocusedDate(firstAllowed);
  };

  const handleDayKeys = (event: React.KeyboardEvent, key: string) => {
    const date = parseDate(key)!;
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (event.key in offsets) date.setDate(date.getDate() + offsets[event.key]);
    else if (event.key === 'Home') date.setDate(date.getDate() - date.getDay());
    else if (event.key === 'End') date.setDate(date.getDate() + 6 - date.getDay());
    else return;
    event.preventDefault();
    const nextKey = dateKey(date);
    if (!allowed(nextKey)) return;
    setFocusedDate(nextKey);
    if (date.getMonth() !== month.getMonth() || date.getFullYear() !== month.getFullYear()) setMonth(new Date(date.getFullYear(), date.getMonth(), 1, 12));
  };

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1, 12).getDay();
  const days = Array.from({ length: 42 }, (_, index) => new Date(year, monthIndex, index - firstDay + 1, 12));
  const firstYear = Math.min(parseDate(minKey)?.getFullYear() ?? new Date().getFullYear() - 100, year);
  const lastYear = Math.max(parseDate(maxKey)?.getFullYear() ?? new Date().getFullYear() + 20, year);
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => firstYear + i);
  const monthLabel = month.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const previousMonth = dateKey(new Date(year, monthIndex - 1, 1, 12)).slice(0, 7);
  const nextMonth = dateKey(new Date(year, monthIndex + 1, 1, 12)).slice(0, 7);

  return (
    <div className="date-field" ref={fieldRef}>
      <input {...inputProps} type="date" value={value} onChange={e => onChange(e.target.value)} min={min} max={max} disabled={disabled} readOnly={readOnly} aria-label={inputProps['aria-label'] || label} className={`date-input ${className}`} />
      <button type="button" ref={triggerRef} className="calendar-toggle" onClick={openCalendar} disabled={disabled || readOnly} aria-label={lang === 'bn' ? `${label} বেছে নিন` : `Choose ${label}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? panelId : undefined}>
        <CalendarDays size={18} strokeWidth={1.7} />
      </button>
      {open && createPortal(
        <div id={panelId} ref={panelRef} role="dialog" aria-label={lang === 'bn' ? `${label} ক্যালেন্ডার` : `${label} calendar`} className={`date-calendar theme-card ${themeClass}`} style={{ position: 'fixed', zIndex: 100, width: position?.width || 344, top: position?.top || 0, left: position?.left || 0, visibility: position ? 'visible' : 'hidden' }}>
          <div className="calendar-caption"><span>{label}</span><button type="button" aria-label={lang === 'bn' ? 'ক্যালেন্ডার বন্ধ করুন' : 'Close calendar'} onClick={() => close(true)}><X size={16} /></button></div>
          <div className="calendar-navigation">
            <button type="button" aria-label={lang === 'bn' ? 'আগের মাস' : 'Previous month'} disabled={!!minKey && previousMonth < minKey.slice(0, 7)} onClick={() => changeMonth(year, monthIndex - 1)}><ChevronLeft size={18} /></button>
            <div className="calendar-month-selects">
              <select aria-label={lang === 'bn' ? 'মাস' : 'Calendar month'} value={monthIndex} onChange={e => changeMonth(year, Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => <option key={i} value={i} disabled={(!!minKey && dateKey(new Date(year, i + 1, 0, 12)) < minKey) || (!!maxKey && dateKey(new Date(year, i, 1, 12)) > maxKey)}>{new Date(year, i, 1).toLocaleDateString(locale, { month: 'long' })}</option>)}
              </select>
              <select aria-label={lang === 'bn' ? 'বছর' : 'Calendar year'} value={year} onChange={e => changeMonth(Number(e.target.value), monthIndex)}>{years.map(y => <option key={y} value={y}>{y.toLocaleString(locale, { useGrouping: false })}</option>)}</select>
            </div>
            <button type="button" aria-label={lang === 'bn' ? 'পরের মাস' : 'Next month'} disabled={!!maxKey && nextMonth > maxKey.slice(0, 7)} onClick={() => changeMonth(year, monthIndex + 1)}><ChevronRight size={18} /></button>
          </div>
          <span className="sr-only" aria-live="polite">{monthLabel}</span>
          <div className="calendar-weekdays" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <span key={i}>{new Date(2026, 1, 1 + i).toLocaleDateString(locale, { weekday: 'short' })}</span>)}</div>
          <div className="calendar-days">
            {days.map(date => {
              const key = dateKey(date);
              return <button key={key} type="button" data-date={key} className={`calendar-day ${date.getMonth() !== monthIndex ? 'calendar-outside-month' : ''} ${key === todayKey ? 'calendar-today' : ''} ${key === value ? 'calendar-selected' : ''}`} aria-label={date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} aria-pressed={key === value} aria-current={key === todayKey ? 'date' : undefined} disabled={!allowed(key)} tabIndex={focusedDate === key ? 0 : -1} onKeyDown={e => handleDayKeys(e, key)} onClick={() => chooseDate(key)}>{date.getDate().toLocaleString(locale)}</button>;
            })}
          </div>
          <div className="calendar-footer"><button type="button" disabled={!allowed(todayKey)} onClick={() => chooseDate(todayKey)}>{lang === 'bn' ? 'আজ' : 'Today'}</button>{!inputProps.required && value && <button type="button" onClick={() => { onChange(''); close(true); }}>{lang === 'bn' ? 'তারিখ মুছুন' : 'Clear date'}</button>}</div>
        </div>, document.body
      )}
    </div>
  );
};
