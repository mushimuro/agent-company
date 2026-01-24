import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { PlayCircle, StopCircle, Trash2, Download, Maximize2, Minimize2 } from 'lucide-react';

interface LogEvent {
    event_type: string;
    message: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
}

interface LiveLogViewerProps {
    attemptId: string;
    logs?: LogEvent[];
    onLogReceived?: (log: LogEvent) => void;
    websocketUrl?: string;
    isRunning?: boolean;
}

export const LiveLogViewer = ({
    attemptId,
    logs = [],
    onLogReceived,
    websocketUrl,
    isRunning = false,
}: LiveLogViewerProps) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<XTerm | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;
    const lastLogCountRef = useRef(0);

    // Color map for different log types
    const getColor = (eventType: string): string => {
        switch (eventType) {
            case 'ERROR':
                return '\x1b[31m'; // Red
            case 'STATUS':
                return '\x1b[34m'; // Blue
            case 'PROGRESS':
                return '\x1b[33m'; // Yellow
            case 'LOG':
                return '\x1b[37m'; // White
            case 'SUCCESS':
                return '\x1b[32m'; // Green
            default:
                return '\x1b[90m'; // Gray
        }
    };

    const formatLog = (log: LogEvent): string => {
        const color = getColor(log.event_type);
        const timestamp = log.timestamp
            ? new Date(log.timestamp).toLocaleTimeString()
            : new Date().toLocaleTimeString();
        const reset = '\x1b[0m';
        const dim = '\x1b[2m';

        return `${dim}[${timestamp}]${reset} ${color}[${log.event_type}]${reset} ${log.message}\r\n`;
    };

    // Initialize terminal
    useEffect(() => {
        if (!terminalRef.current) return;

        const term = new XTerm({
            theme: {
                background: '#0f172a',
                foreground: '#e2e8f0',
                cursor: '#3b82f6',
                selectionForeground: '#f8fafc',
                selectionBackground: '#334155',
                black: '#1e293b',
                brightBlack: '#475569',
                red: '#ef4444',
                brightRed: '#f87171',
                green: '#22c55e',
                brightGreen: '#4ade80',
                yellow: '#eab308',
                brightYellow: '#facc15',
                blue: '#3b82f6',
                brightBlue: '#60a5fa',
                magenta: '#a855f7',
                brightMagenta: '#c084fc',
                cyan: '#06b6d4',
                brightCyan: '#22d3ee',
                white: '#f1f5f9',
                brightWhite: '#ffffff',
            },
            fontFamily: '"SF Mono", Monaco, "Cascadia Code", Consolas, monospace',
            fontSize: 13,
            lineHeight: 1.4,
            cursorBlink: false,
            disableStdin: true,
            scrollback: 5000,
            convertEol: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalRef.current);
        fitAddon.fit();

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        // Write welcome message
        term.writeln('\x1b[34m╔════════════════════════════════════════╗\x1b[0m');
        term.writeln('\x1b[34m║\x1b[0m       Agent Execution Log Viewer       \x1b[34m║\x1b[0m');
        term.writeln('\x1b[34m╚════════════════════════════════════════╝\x1b[0m');
        term.writeln('');

        // Handle window resize
        const handleResize = () => {
            if (fitAddonRef.current) {
                fitAddonRef.current.fit();
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            term.dispose();
            wsRef.current?.close();
        };
    }, []);

    // Handle logs update
    useEffect(() => {
        if (!xtermRef.current) return;

        // If logs array was reset (smaller than before), clear terminal
        if (logs.length < lastLogCountRef.current) {
            xtermRef.current.clear();
            lastLogCountRef.current = 0;
            // Rewrite welcome message if desired
            xtermRef.current.writeln('\x1b[34m╔════════════════════════════════════════╗\x1b[0m');
            xtermRef.current.writeln('\x1b[34m║\x1b[0m       Agent Execution Log Viewer       \x1b[34m║\x1b[0m');
            xtermRef.current.writeln('\x1b[34m╚════════════════════════════════════════╝\x1b[0m');
            xtermRef.current.writeln('');
        }

        const newLogs = logs.slice(lastLogCountRef.current);
        newLogs.forEach((log) => {
            xtermRef.current?.write(formatLog(log));
        });

        lastLogCountRef.current = logs.length;
    }, [logs]);

    // Connect to WebSocket
    useEffect(() => {
        if (!websocketUrl || !isRunning) return;

        const connect = () => {
            const ws = new WebSocket(websocketUrl);

            ws.onopen = () => {
                setIsConnected(true);
                reconnectAttempts.current = 0;
                xtermRef.current?.writeln('\x1b[32m[WebSocket Connected]\x1b[0m');
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const log: LogEvent = {
                        event_type: data.event_type || 'LOG',
                        message: data.message || event.data,
                        timestamp: data.timestamp || new Date().toISOString(),
                        metadata: data.metadata,
                    };

                    xtermRef.current?.write(formatLog(log));
                    onLogReceived?.(log);
                } catch {
                    // Plain text message
                    xtermRef.current?.writeln(event.data);
                }
            };

            ws.onclose = () => {
                setIsConnected(false);

                // Attempt reconnection with exponential backoff
                if (isRunning && reconnectAttempts.current < maxReconnectAttempts) {
                    const delay = Math.pow(2, reconnectAttempts.current) * 1000;
                    xtermRef.current?.writeln(
                        `\x1b[33m[WebSocket Disconnected - Reconnecting in ${delay / 1000}s...]\x1b[0m`
                    );
                    reconnectAttempts.current++;
                    setTimeout(connect, delay);
                } else {
                    xtermRef.current?.writeln('\x1b[31m[WebSocket Disconnected]\x1b[0m');
                }
            };

            ws.onerror = () => {
                xtermRef.current?.writeln('\x1b[31m[WebSocket Error]\x1b[0m');
            };

            wsRef.current = ws;
        };

        connect();

        return () => {
            wsRef.current?.close();
        };
    }, [websocketUrl, isRunning, onLogReceived]);

    // Refit on fullscreen change
    useEffect(() => {
        setTimeout(() => {
            fitAddonRef.current?.fit();
        }, 100);
    }, [isFullscreen]);

    const clearLogs = () => {
        xtermRef.current?.clear();
        xtermRef.current?.writeln('\x1b[90m[Logs cleared]\x1b[0m');
    };

    const downloadLogs = () => {
        if (!xtermRef.current) return;

        // Get terminal buffer content
        const buffer = xtermRef.current.buffer.active;
        let content = '';
        for (let i = 0; i < buffer.length; i++) {
            const line = buffer.getLine(i);
            if (line) {
                content += line.translateToString() + '\n';
            }
        }

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs-${attemptId}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div
            className={`bg-slate-950 rounded-lg border border-slate-700 overflow-hidden ${isFullscreen ? 'fixed inset-4 z-50' : ''
                }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        {isRunning ? (
                            <PlayCircle className="h-4 w-4 text-green-400 animate-pulse" />
                        ) : (
                            <StopCircle className="h-4 w-4 text-slate-400" />
                        )}
                        <span className="text-sm font-medium text-white">Execution Logs</span>
                    </div>
                    {isConnected && (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                            Live
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={clearLogs}
                        className="p-1.5 text-slate-400 hover:text-white transition-colors"
                        title="Clear logs"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                        onClick={downloadLogs}
                        className="p-1.5 text-slate-400 hover:text-white transition-colors"
                        title="Download logs"
                    >
                        <Download className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="p-1.5 text-slate-400 hover:text-white transition-colors"
                        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                    >
                        {isFullscreen ? (
                            <Minimize2 className="h-4 w-4" />
                        ) : (
                            <Maximize2 className="h-4 w-4" />
                        )}
                    </button>
                </div>
            </div>

            {/* Terminal */}
            <div
                ref={terminalRef}
                className={`${isFullscreen ? 'h-[calc(100%-40px)]' : 'h-80'}`}
                style={{ padding: '8px' }}
            />
        </div>
    );
};

export default LiveLogViewer;
