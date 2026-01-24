import { useState } from 'react';
import { useWritableRoots, useCreateWritableRoot, useDeleteWritableRoot, useAuditLogs } from '@/hooks/useLocalAccess';
import { Folder, Plus, Trash2, Shield, Info, AlertTriangle, List, Activity, Terminal, User as UserIcon, Calendar } from 'lucide-react';

export const LocalAccessPage = () => {
    const { data: roots, isLoading: rootsLoading } = useWritableRoots();
    const { data: logs, isLoading: logsLoading } = useAuditLogs();
    const createRoot = useCreateWritableRoot();
    const deleteRoot = useDeleteWritableRoot();

    const [newName, setNewName] = useState('');
    const [newPath, setNewPath] = useState('');
    const [activeTab, setActiveTab] = useState<'roots' | 'audit'>('roots');

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newPath) return;
        createRoot.mutate({ name: newName, path: newPath });
        setNewName('');
        setNewPath('');
    };

    return (
        <div className="max-w-6xl mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900 flex items-center tracking-tight">
                    <Shield className="mr-3 text-blue-600" size={32} />
                    Local Access & Security
                </h1>
                <p className="text-gray-500 mt-2 text-lg">
                    Manage agent permissions and monitor all local filesystem activities.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl mb-8 w-fit shadow-sm">
                <button
                    onClick={() => setActiveTab('roots')}
                    className={`flex items-center px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'roots' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Folder size={18} className="mr-2" />
                    Writable Roots
                </button>
                <button
                    onClick={() => setActiveTab('audit')}
                    className={`flex items-center px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'audit' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Activity size={18} className="mr-2" />
                    Audit Logs
                </button>
            </div>

            {activeTab === 'roots' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Info Card */}
                    <div className="lg:col-span-1">
                        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 sticky top-8">
                            <div className="flex items-start mb-3">
                                <Info className="text-blue-500 mr-2 mt-0.5" size={20} />
                                <h3 className="font-bold text-blue-900">How it works</h3>
                            </div>
                            <p className="text-sm text-blue-800 leading-relaxed mb-6">
                                The Local Desktop Agent (LDA) enforces these boundaries. Agents can only modify files that reside within these configured paths.
                            </p>
                            <div className="space-y-4">
                                <div className="flex items-start">
                                    <AlertTriangle className="text-yellow-600 mr-2 mt-0.5 flex-shrink-0" size={20} />
                                    <p className="text-xs text-yellow-800 leading-relaxed font-semibold">
                                        Granting a root path gives full write access to that entire subtree. Use minimal scopes.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Roots List */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                <h2 className="font-bold text-gray-800 flex items-center">
                                    <List size={18} className="mr-2 text-gray-400" />
                                    Active Roots
                                </h2>
                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">{roots?.length || 0} Path(s)</span>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {rootsLoading ? (
                                    <div className="p-12 text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                    </div>
                                ) : roots && roots.length > 0 ? (
                                    roots.map((root) => (
                                        <div key={root.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                                            <div className="flex items-center">
                                                <div className="p-3 bg-blue-50 rounded-xl text-blue-600 mr-4 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                                    <Folder size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-extrabold text-gray-900 mb-0.5">{root.name}</h4>
                                                    <code className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-mono">{root.path}</code>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => deleteRoot.mutate(root.id)}
                                                className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-16 text-center text-gray-400">
                                        <Folder size={56} className="mx-auto mb-4 opacity-10" />
                                        <p className="font-medium">No writable roots configured.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Add Root Form */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                            <h3 className="font-bold text-gray-900 mb-6 flex items-center">
                                <Plus className="mr-2 text-green-500" size={20} />
                                Add New Root
                            </h3>
                            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-1">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Label</label>
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="e.g. My Projects"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none text-sm transition-all bg-gray-50 font-medium"
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Absolute Path</label>
                                    <input
                                        type="text"
                                        value={newPath}
                                        onChange={(e) => setNewPath(e.target.value)}
                                        placeholder="C:\Users\..."
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none text-sm font-mono transition-all bg-gray-50"
                                    />
                                </div>
                                <div className="md:col-span-2 mt-2">
                                    <button
                                        type="submit"
                                        disabled={!newName || !newPath || createRoot.isPending}
                                        className="w-full flex items-center justify-center py-3.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-gray-200 active:scale-[0.98]"
                                    >
                                        <Plus size={18} className="mr-2" />
                                        {createRoot.isPending ? 'Adding Root...' : 'Authorize Path'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h2 className="font-bold text-gray-800 flex items-center">
                                <Activity size={18} className="mr-2 text-gray-400" />
                                System Activity Logs
                            </h2>
                            <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full">{logs?.length || 0} Events Cached</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Time</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">User / Task</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Path</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {logsLoading ? (
                                        <tr>
                                            <td colSpan={4} className="p-12 text-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                            </td>
                                        </tr>
                                    ) : logs && logs.length > 0 ? (
                                        logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center text-xs text-gray-500 font-medium">
                                                        <Calendar size={12} className="mr-1.5 text-gray-300" />
                                                        {new Date(log.created_at).toLocaleString()}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-gray-900 flex items-center">
                                                            <UserIcon size={12} className="mr-1.5 text-blue-500" />
                                                            {log.username}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 font-medium truncate max-w-[150px]">
                                                            {log.task_title || 'System Action'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase ${log.action === 'WRITE' ? 'bg-orange-100 text-orange-700' :
                                                            log.action === 'READ' ? 'bg-blue-100 text-blue-700' :
                                                                log.action === 'EXECUTE' ? 'bg-purple-100 text-purple-700' :
                                                                    'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center group">
                                                        <Terminal size={14} className="mr-2 text-gray-300 group-hover:text-gray-900 transition-colors" />
                                                        <code className="text-xs font-mono text-gray-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 group-hover:bg-white group-hover:border-gray-300 transition-all max-w-[300px] truncate" title={log.path}>
                                                            {log.path}
                                                        </code>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="p-20 text-center text-gray-400">
                                                <Activity size={48} className="mx-auto mb-4 opacity-5" />
                                                <p className="font-medium">No activity log found.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
