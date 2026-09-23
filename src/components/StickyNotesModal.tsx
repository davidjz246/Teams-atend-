import React, { useState, useEffect } from 'react';
import { StickyNote, Upload, Check, AlertCircle, Sparkles, X, Clock, Calendar } from 'lucide-react';
import { parseStickyNotes } from '../utils/parser';
import { useLanguage } from '../i18n/LanguageContext';

interface StickyNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyReasons: (parsedReasons: Record<string, string>) => void;
  overtimeDates: string[];
  existingReasons?: Record<string, string>;
}

export const StickyNotesModal: React.FC<StickyNotesModalProps> = ({
  isOpen,
  onClose,
  onApplyReasons,
  overtimeDates = [],
  existingReasons = {},
}) => {
  const { t, language } = useLanguage();
  const [noteText, setNoteText] = useState('');

  // When modal opens, prefill with detected overtime dates and any existing reasons if noteText is empty
  useEffect(() => {
    if (isOpen) {
      if (!noteText.trim()) {
        if (overtimeDates.length > 0) {
          const generatedLines = overtimeDates.map((date) => {
            const reason = existingReasons[date] || '';
            return `${date}: ${reason ? reason : 'Overtime project task and sprint review'}`;
          });
          setNoteText(generatedLines.join('\n'));
        } else {
          setNoteText('');
        }
      }
    }
  }, [isOpen, overtimeDates]);

  if (!isOpen) return null;

  const parsed = parseStickyNotes(noteText);
  const parsedCount = Object.keys(parsed).length;

  const handleApply = () => {
    onApplyReasons(parsed);
    onClose();
  };

  const handleInsertTemplate = () => {
    if (overtimeDates.length > 0) {
      const template = overtimeDates.map((d) => `${d}: `).join('\n');
      setNoteText(template);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted cursor-pointer"
          title={t('common.close', 'Close')}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
            <StickyNote className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">
              {t('sticky.title', 'Import Overtime Sticky Notes')}
            </h3>
          </div>
        </div>

        {/* Detected Overtime Dates Panel */}
        <div className="mb-4 p-3.5 rounded-2xl bg-muted/40 border border-border">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-foreground">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>{t('sticky.detected_dates', 'Detected Overtime Dates ({count}):').replace('{count}', String(overtimeDates.length))}</span>
            </div>
            {overtimeDates.length > 0 && (
              <button
                type="button"
                onClick={handleInsertTemplate}
                className="text-[11px] font-mono text-amber-500 hover:text-amber-400 font-semibold cursor-pointer underline"
              >
                {t('sticky.insert_template', 'Insert Dates Template')}
              </button>
            )}
          </div>

          {overtimeDates.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {overtimeDates.map((date) => {
                const hasReason = parsed[date] || existingReasons[date];
                return (
                  <span
                    key={date}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border flex items-center gap-1 ${
                      hasReason
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {hasReason ? <Check className="w-3 h-3 text-emerald-500" /> : <Clock className="w-3 h-3 text-amber-500" />}
                    <span>{date}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          rows={6}
          placeholder="2026.07.27: Reason for overtime..."
          className="w-full bg-background border border-border rounded-2xl p-4 font-mono text-xs text-foreground focus:outline-hidden focus:border-amber-500 resize-y"
        />

        {parsedCount > 0 && (
          <div className="mt-3 p-3 rounded-2xl bg-muted/40 border border-border text-xs font-mono">
            <div className="flex items-center justify-between text-muted-foreground mb-1.5">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                {t('sticky.parsed_ready', '{count} Reasons Parsed & Ready').replace('{count}', String(parsedCount))}
              </span>
            </div>
            <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
              {Object.entries(parsed).map(([date, reason]) => (
                <div key={date} className="flex items-start gap-2 text-[11px]">
                  <span className="text-amber-500 font-bold shrink-0">{date}:</span>
                  <span className="text-foreground line-clamp-1">{reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-mono font-medium hover:bg-muted text-muted-foreground cursor-pointer"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            onClick={handleApply}
            disabled={parsedCount === 0}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{t('sticky.apply_btn', 'Apply {count} Reasons').replace('{count}', String(parsedCount))}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
