import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Trash2, ArrowDown, Play, Square, Circle } from 'lucide-react';
import { stopAction } from '../services/api';

export const LiveConsole: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [connected, setConnected] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentCmd, setCurrentCmd] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Determine WebSocket URL
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
        ws.close();
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, []);

  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleClear = () => {
    setLogs([]);
  };

  const handleStop = async () => {
    try {
      await stopAction();
    } catch (e: any) {
      alert(`Stop failed: ${e.message}`);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-amber-400 font-semibold tracking-wider uppercase mb-1">System Stream</div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <Terminal className="w-6 h-6 text-amber-400" />
            Live Terminal & Subprocess Monitor
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time stdout/stderr stream from background pipeline scripts, LLM token generations, and evaluation sweeps.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#12151f] border border-[#23293d] text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            <span className="text-slate-300">{connected ? 'Stream Connected' : 'Connecting...'}</span>
          </div>

          {isRunning && (
            <button
              onClick={handleStop}
              className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Cancel Task</span>
            </button>
          )}

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all ${
              autoScroll 
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' 
                : 'bg-[#12151f] text-slate-400 border-[#23293d]'
            }`}
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>Auto-Scroll {autoScroll ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={handleClear}
            className="p-1.5 rounded-lg bg-[#12151f] hover:bg-[#1a2030] text-slate-400 hover:text-slate-200 border border-[#23293d] transition-all"
            title="Clear terminal buffer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal View */}
      <div className="bg-[#07090e] border border-[#1b2233] rounded-xl shadow-2xl overflow-hidden font-mono text-xs">
        {/* Terminal Titlebar */}
        <div className="bg-[#0d1017] px-4 py-2.5 border-b border-[#1b2233] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <span className="text-[11px] text-slate-400 ml-2">stdout/stderr streaming session</span>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            {isRunning ? (
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Running: {currentCmd}</span>
              </div>
            ) : (
              <span className="text-slate-500">Idle</span>
            )}
          </div>
        </div>

        {/* Terminal Body */}
        <div className="p-5 h-[580px] overflow-y-auto space-y-0.5 select-text">
          {logs.length === 0 ? (
            <div className="text-slate-500 italic py-10 text-center">
              // Console stream is ready. Run any pipeline command or tool to view live output here.
            </div>
          ) : (
            logs.map((line, idx) => {
              // Basic color highlights
              let colorClass = 'text-slate-300';
              if (line.includes('ERROR') || line.includes('Error') || line.includes('Traceback')) {
                colorClass = 'text-rose-400 font-semibold';
              } else if (line.includes('===') || line.includes('---')) {
                colorClass = 'text-amber-400 font-semibold';
              } else if (line.includes('PASS') || line.includes('SUCCESS') || line.includes('Finished')) {
                colorClass = 'text-emerald-400';
              } else if (line.startsWith('Calling')) {
                colorClass = 'text-sky-400';
              }

              return (
                <div key={idx} className={`leading-relaxed whitespace-pre-wrap ${colorClass}`}>
                  {line}
                </div>
              );
            })
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
};
