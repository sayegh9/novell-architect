import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Trash2, ArrowDown, Square, Circle } from 'lucide-react';
import { stopAction } from '../services/api';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';

export const LiveConsole: React.FC = () => {
  const { t, lang } = useI18n();
  const { isDark } = useTheme();
  const [logs, setLogs] = useState<string[]>([]);
  const [connected, setConnected] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentCmd, setCurrentCmd] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/stream`;

    let ws: WebSocket;
    let reconnectTimeout: any;

    const connect = () => {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'connected') {
            setIsRunning(data.is_running);
            setCurrentCmd(data.cmd);
            if (data.logs_preview && data.logs_preview.length > 0) {
              setLogs(data.logs_preview);
            }
          } else if (data.type === 'job_start') {
            setIsRunning(true);
            setCurrentCmd(data.cmd);
            setLogs(prev => [...prev, `\n--- STARTING COMMAND: ${data.cmd} ---\n`]);
          } else if (data.type === 'log') {
            setLogs(prev => [...prev, data.text]);
          } else if (data.type === 'job_end') {
            setIsRunning(false);
            setLogs(prev => [...prev, `\n--- PROCESS FINISHED (Exit code: ${data.returncode}) ---\n`]);
          }
        } catch (e) {
          console.error(e);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        reconnectTimeout = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        setConnected(false);
      };
    };

    connect();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  useEffect(() => {
    if (autoScroll) {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleClear = () => {
    setLogs([]);
  };

  const handleStop = async () => {
    try {
      await stopAction();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-amber-500 font-semibold tracking-wider uppercase mb-1">
            {lang === 'ar' ? 'البث المباشر للعمليات' : 'Execution Telemetry & Terminal'}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Terminal className="w-6 h-6 text-amber-500" />
            {t('console.title')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('console.subtitle')}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Connection Status Badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-medium border ${
            connected
              ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
              : 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-500/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span>{connected ? (lang === 'ar' ? 'متصل' : 'Connected') : (lang === 'ar' ? 'غير متصل' : 'Disconnected')}</span>
          </div>

          {/* Clear Button */}
          <button
            onClick={handleClear}
            className="p-2 rounded-xl bg-white dark:bg-[#141824] hover:bg-slate-100 dark:hover:bg-[#1a2030] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#23293d] transition-all shadow-sm"
            title={t('console.clear')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div className="bg-[#05070c] border border-[#1a2133] rounded-2xl overflow-hidden shadow-2xl flex flex-col font-mono text-xs" dir="ltr">
        {/* Terminal Titlebar */}
        <div className="bg-[#0c101a] px-4 py-3 border-b border-[#1a2133] flex items-center justify-between" dir="ltr">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="text-[11px] text-slate-400 ml-2 font-mono">autonovel-orchestrator.log</span>
          </div>

          <div className="flex items-center gap-3">
            {isRunning && (
              <button
                onClick={handleStop}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600/20 text-rose-300 border border-rose-500/40 text-[11px] hover:bg-rose-600/30 transition-all"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop</span>
              </button>
            )}

            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] transition-all ${
                autoScroll ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-500'
              }`}
            >
              <ArrowDown className="w-3 h-3" />
              <span>Auto-scroll</span>
            </button>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="p-5 h-[520px] overflow-y-auto font-mono text-xs text-slate-200 leading-relaxed space-y-0.5 select-text selection:bg-amber-500/30 text-left" dir="ltr">
          {logs.length === 0 ? (
            <div className="text-slate-500 italic py-12 text-center">
              {lang === 'ar' ? 'جاهز لاستقبال مخرجات العمليات...' : 'Ready for execution streams. Logs will appear here in real-time...'}
            </div>
          ) : (
            logs.map((line, idx) => (
              <div key={idx} className="whitespace-pre-wrap font-mono text-left" dir="ltr">
                {line}
              </div>
            ))
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>

    </div>
  );
};
