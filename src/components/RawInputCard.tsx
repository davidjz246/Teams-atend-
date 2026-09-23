import React, { useState } from 'react';
import { FileText, Play, RefreshCw, Clipboard, Trash2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface RawInputCardProps {
  rawInput: string;
  onChangeInput: (val: string) => void;
  onRun?: () => void;
}

export const RawInputCard: React.FC<RawInputCardProps> = ({ rawInput, onChangeInput, onRun }) => {
  const { t } = useLanguage();
  const [isRunning, setIsRunning] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  const handleRunClick = () => {
    setIsRunning(true);
    if (onRun) onRun();
    setTimeout(() => setIsRunning(false), 700);
  };

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          onChangeInput(text);
          setCopiedToast(true);
          setTimeout(() => setCopiedToast(false), 2500);
        }
      }
    } catch (e) {
      console.warn('Clipboard read permission denied or unavailable:', e);
    }
  };

  const handleClear = () => {
    onChangeInput('');
  };

  return (
    <div className="bg-card border border-border rounded-3xl p-7 sm:p-8 lg:p-9 shadow-sm flex flex-col justify-between h-full" id="raw-punch-input-section">
      <div>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5 pb-4 border-b border-border/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-mono text-xs uppercase tracking-widest text-foreground font-bold">
                {t('raw.title')}
              </h2>
              <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                Paste attendance stamps in Date / Start / End format
              </p>
            </div>
          </div>

          {/* Action Controls for Pasting / Clearing */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handlePasteClipboard}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 border border-amber-500/30 transition-all shadow-2xs cursor-pointer active:scale-95"
              title="Paste attendance punch logs directly from your clipboard"
            >
              <Clipboard className="w-3.5 h-3.5 text-amber-500" />
              <span>{copiedToast ? t('raw.pasted') : t('raw.paste')}</span>
            </button>

            {rawInput.trim() && (
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 transition-all shadow-2xs cursor-pointer active:scale-95"
                title="Clear current punch text"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('raw.clear')}</span>
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <textarea
            id="raw-punch-textarea"
            value={rawInput}
            onChange={(e) => onChangeInput(e.target.value)}
            placeholder={t('raw.placeholder')}
            className="w-full min-h-[280px] bg-background border border-border focus:border-amber-500 rounded-2xl p-5 font-mono text-xs sm:text-sm text-foreground leading-relaxed focus:outline-hidden resize-y transition-colors placeholder:text-muted-foreground/50"
          />
        </div>
      </div>

      {/* Prominent 'Read the Ledger' Button under Raw Punch Data */}
      <div className="mt-6 pt-5 border-t border-border/80">
        <button
          onClick={handleRunClick}
          className="w-full py-4 px-6 bg-amber-500 hover:bg-amber-400 text-black font-mono text-sm font-bold uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 active:scale-[0.99] flex items-center justify-center gap-2.5 cursor-pointer"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-black" />
              <span>{t('raw.processing')}</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-black text-black" />
              <span>{t('raw.read_ledger')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

