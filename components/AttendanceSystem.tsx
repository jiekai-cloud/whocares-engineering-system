import React, { useState, useEffect } from 'react';
import { User, AttendanceRecord, TeamMember } from '../types';
import { MapPin, Clock, LogIn, LogOut, AlertTriangle, CheckCircle, Navigation, Loader2, Calendar } from 'lucide-react';
import LocationModal from './LocationModal';

interface AttendanceSystemProps {
    currentUser: User;
    records: AttendanceRecord[];
    onRecord: (type: 'work-start' | 'work-end', location: { lat: number; lng: number; address?: string }) => void;
}

const AttendanceSystem: React.FC<AttendanceSystemProps> = ({ currentUser, records, onRecord }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [location, setLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);
    const [loadingLocation, setLoadingLocation] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [viewingRecord, setViewingRecord] = useState<AttendanceRecord | null>(null);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Filter records for today and current user
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = records
        .filter(r => r.employeeId === currentUser.id && r.timestamp.startsWith(today))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const lastRecord = todayRecords.length > 0 ? todayRecords[todayRecords.length - 1] : null;

    const isOnDuty = lastRecord?.type === 'work-start';

    // Statistics Logic
    const stats = React.useMemo(() => {
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const monthRecords = records.filter(r =>
            r.employeeId === currentUser.id && r.timestamp.startsWith(currentMonth)
        );

        const recordsByDate: Record<string, AttendanceRecord[]> = {};
        monthRecords.forEach(r => {
            const date = r.timestamp.split('T')[0];
            if (!recordsByDate[date]) recordsByDate[date] = [];
            recordsByDate[date].push(r);
        });

        let totalDays = 0;
        let totalHours = 0;

        Object.entries(recordsByDate).forEach(([date, dayRecs]) => {
            // Sort by time
            dayRecs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            // Check if valid work day (has start)
            const hasStart = dayRecs.some(r => r.type === 'work-start');
            if (hasStart) totalDays++;

            // Calculate hours (First Start to Last End)
            const start = dayRecs.find(r => r.type === 'work-start');
            // Find last end that is AFTER start
            const end = [...dayRecs].reverse().find(r => r.type === 'work-end');

            if (start && end && new Date(end.timestamp) > new Date(start.timestamp)) {
                const duration = new Date(end.timestamp).getTime() - new Date(start.timestamp).getTime();
                totalHours += duration / (1000 * 60 * 60);
            }
        });

        return {
            days: totalDays,
            hours: totalHours.toFixed(1),
            groupedRecords: Object.entries(recordsByDate).sort((a, b) => b[0].localeCompare(a[0])) // Sort dates desc
        };
    }, [records, currentUser.id]);

    const getLocation = async () => {
        setLoadingLocation(true);
        setLocationError(null);

        if (!navigator.geolocation) {
            setLocationError("您的瀏覽器不支援地理位置功能");
            setLoadingLocation(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                // Try to get address using Google Maps API if available via reverse geocoding
                // Or just use coords
                let address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)} `;

                // Simple mock reverse geocode if no API
                try {
                    // Optional: Call Google Maps Geocoding API here if key exists
                    // For now, we store coordinates
                } catch (e) {
                    console.error(e);
                }

                setLocation({ lat: latitude, lng: longitude, address });
                setLoadingLocation(false);
            },
            (error) => {
                let msg = "無法獲取位置";
                switch (error.code) {
                    case error.PERMISSION_DENIED: msg = "請允許瀏覽器存取位置資訊以進行打卡"; break;
                    case error.POSITION_UNAVAILABLE: msg = "無法偵測到目前位置"; break;
                    case error.TIMEOUT: msg = "位置偵測逾時"; break;
                }
                setLocationError(msg);
                setLoadingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    useEffect(() => {
        getLocation();
    }, []);

    const handleClockAction = (type: 'work-start' | 'work-end') => {
        if (!location) {
            getLocation();
            return;
        }
        onRecord(type, location);
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8 animate-in fade-in">
            {/* Location Modal */}
            {viewingRecord && viewingRecord.location && (
                <LocationModal
                    location={viewingRecord.location}
                    onClose={() => setViewingRecord(null)}
                    title={`${new Date(viewingRecord.timestamp).toLocaleTimeString()} 打卡位置`}
                />
            )}

            {/* Header Panel */}
            <div className="bg-white rounded-[2rem] shadow-xl p-8 border border-stone-100 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full translate-x-1/3 -translate-y-1/3 blur-3xl -z-10" />

                <div>
                    <h1 className="text-3xl font-black text-stone-800 tracking-tight mb-2">
                        早安，{currentUser.name}
                    </h1>
                    <p className="text-stone-500 font-medium">現在是 {currentTime.toLocaleDateString('zh-TW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>

                <div className="text-right">
                    <div className="text-5xl font-black text-stone-800 tracking-tighter tabular-nums">
                        {currentTime.toLocaleTimeString('zh-TW', { hour12: false })}
                    </div>
                    <div className={`mt-2 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold ${isOnDuty
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-stone-100 text-stone-500'
                        }`}>
                        <span className={`w-2 h-2 rounded-full ${isOnDuty ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'}`} />
                        {isOnDuty ? '工作中' : '未打卡 / 已下班'}
                    </div>
                </div>
            </div>

            {/* Monthly Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-black text-stone-400 uppercase tracking-widest">本月工作天數</p>
                        <p className="text-2xl font-black text-stone-800 tabular-nums">{stats.days} <span className="text-sm text-stone-400">天</span></p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-black text-stone-400 uppercase tracking-widest">本月累計工時</p>
                        <p className="text-2xl font-black text-stone-800 tabular-nums">{stats.hours} <span className="text-sm text-stone-400">小時</span></p>
                    </div>
                </div>
            </div>

            {/* Location Status */}
            <div className={`p-4 rounded-xl border flex items-center gap-3 transition-colors ${loadingLocation ? 'bg-blue-50 border-blue-100 text-blue-700' :
                locationError ? 'bg-rose-50 border-rose-100 text-rose-700' :
                    location ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                        'bg-stone-50 border-stone-200 text-stone-600'
                }`}>
                {loadingLocation ? (
                    <Loader2 className="animate-spin" />
                ) : locationError ? (
                    <AlertTriangle />
                ) : (
                    <MapPin />
                )}
                <div className="flex-1">
                    {loadingLocation && <span className="font-bold">正在定位中...</span>}
                    {locationError && <span className="font-bold">{locationError} <button onClick={getLocation} className="underline ml-2">重試</button></span>}
                    {location && (
                        <div>
                            <span className="font-bold block">定位成功</span>
                            <span className="text-xs opacity-75">緯度: {location.lat.toFixed(6)}, 經度: {location.lng.toFixed(6)}</span>
                        </div>
                    )}
                </div>
                {!loadingLocation && !locationError && (
                    <button onClick={getLocation} className="p-2 hover:bg-black/5 rounded-full" title="更新位置">
                        <Navigation size={16} />
                    </button>
                )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                    onClick={() => handleClockAction('work-start')}
                    disabled={loadingLocation || !!locationError}
                    className={`group relative overflow-hidden p-8 rounded-[2rem] transition-all hover:-translate-y-1 hover:shadow-2xl ${loadingLocation || !!locationError ? 'opacity-50 cursor-not-allowed bg-stone-100' : 'bg-gradient-to-br from-emerald-400 to-teal-600 cursor-pointer shadow-lg shadow-emerald-200'
                        }`}
                >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex flex-col items-center gap-4 text-white">
                        <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
                            <LogIn size={48} strokeWidth={2.5} />
                        </div>
                        <div className="text-center">
                            <h3 className="text-2xl font-black tracking-tight mb-1">上班打卡</h3>
                            <p className="text-emerald-100 font-bold text-sm">開始記錄工時</p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => handleClockAction('work-end')}
                    disabled={loadingLocation || !!locationError}
                    className={`group relative overflow-hidden p-8 rounded-[2rem] transition-all hover:-translate-y-1 hover:shadow-2xl ${loadingLocation || !!locationError ? 'opacity-50 cursor-not-allowed bg-stone-100' : 'bg-gradient-to-br from-indigo-500 to-violet-600 cursor-pointer shadow-lg shadow-indigo-200'
                        }`}
                >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex flex-col items-center gap-4 text-white">
                        <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
                            <LogOut size={48} strokeWidth={2.5} />
                        </div>
                        <div className="text-center">
                            <h3 className="text-2xl font-black tracking-tight mb-1">下班打卡</h3>
                            <p className="text-indigo-100 font-bold text-sm">結束工作並簽退</p>
                        </div>
                    </div>
                </button>
            </div>

            {/* History Records */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-stone-200 p-6 overflow-hidden">
                <h3 className="text-lg font-black text-stone-800 mb-6 flex items-center gap-2">
                    <Clock size={20} className="text-stone-400" />
                    近其打卡紀錄
                </h3>

                {stats.groupedRecords.length === 0 ? (
                    <div className="text-center py-10 text-stone-400 font-medium bg-stone-50 rounded-2xl border border-stone-100 border-dashed">
                        尚無打卡紀錄
                    </div>
                ) : (
                    <div className="space-y-8">
                        {stats.groupedRecords.map(([date, dayRecords]) => (
                            <div key={date}>
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="h-px flex-1 bg-stone-100"></div>
                                    <span className="text-xs font-black text-stone-400 bg-stone-50 px-3 py-1 rounded-full">
                                        {date === today ? '今天' : date}
                                    </span>
                                    <div className="h-px flex-1 bg-stone-100"></div>
                                </div>
                                <div className="relative border-l-2 border-stone-100 ml-3 space-y-6 py-2">
                                    {dayRecords.map((record) => (
                                        <div key={record.id} className="relative pl-8">
                                            <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${record.type === 'work-start' ? 'bg-emerald-500' : 'bg-indigo-500'
                                                }`} />
                                            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                                                <div>
                                                    <span className={`font-black text-sm px-2 py-0.5 rounded mr-2 ${record.type === 'work-start' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
                                                        }`}>
                                                        {record.type === 'work-start' ? '上班' : '下班'}
                                                    </span>
                                                    <span className="font-bold text-stone-800 text-lg">
                                                        {new Date(record.timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div
                                                    className={`text-xs text-stone-400 font-mono flex items-center gap-1 ${record.location ? 'cursor-pointer hover:text-orange-500 hover:underline' : ''}`}
                                                    onClick={() => record.location && setViewingRecord(record)}
                                                >
                                                    <MapPin size={10} />
                                                    {record.location ? `${record.location.lat.toFixed(4)}, ${record.location.lng.toFixed(4)}` : '未記錄位置'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttendanceSystem;
