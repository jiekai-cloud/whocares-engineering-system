import React, { useState, useEffect } from 'react';
import { User, AttendanceRecord, TeamMember } from '../types';
import { MapPin, Clock, LogIn, LogOut, AlertTriangle, CheckCircle, Navigation, Loader2, Calendar, Sparkles } from 'lucide-react';
import LocationModal from './LocationModal';
import { getAddressFromCoords } from '../services/geminiService';

interface AttendanceSystemProps {
    currentUser: User;
    records: AttendanceRecord[];
    onRecord: (type: 'work-start' | 'work-end', location: { lat: number; lng: number; address?: string }) => void;
}

const MOTIVATIONAL_QUOTES = [
    "每一個新的開始，都從你決定開始的那一刻起。",
    "你的努力，是為了遇見更好的自己。",
    "今天的付出，是明天收穫的種子。",
    "保持專注，堅持到底，你比想像中更強大。",
    "品質源於細節，成功源於堅持。",
    "每一份辛勞都值得被看見，每一份堅持都值得被肯定。",
    "工作不只是為了生存，更是為了實現自我價值。",
    "生活品質，從每一次精準的執行開始。",
    "面對挑戰是成長的必經之路。",
    "今日事今日畢，享受充實的一天。",
    "你的專業與熱情，是團隊前進的動力。",
    "休息是為了走更長遠的路，請記得照顧自己。",
    "每一次的突破，都源於不輕言放棄的堅持。"
];

const getGreeting = (date: Date) => {
    const hour = date.getHours();
    const day = date.getDay(); // 0 is Sunday
    const isWeekend = day === 0 || day === 6;

    if (isWeekend) {
        if (hour >= 10 && hour < 16) return '週末加班？真是令人感動的奴性';
        if (hour >= 16) return '還在公司？你家裡是沒有溫暖嗎';
        return '週末還這麼早起工作，該去看醫生了';
    }

    if (hour < 5) return '還沒睡是失眠，還是根本沒得睡？';
    if (hour < 9) return '早安，社畜的一天又開始了';
    if (hour < 11) return '撐住，距離午餐還有幾個小時';
    if (hour < 13) return '午安，吃飽了好上路（工作）';
    if (hour < 15) return '下午的咖啡因是你唯一的救贖';
    if (hour < 18) return '再撐一下，老闆還在看';
    if (hour < 20) return '加班費有算清楚嗎？還是做功德？';
    if (hour < 23) return '這麼晚還在，公司應該頒發「最佳肝臟獎」給你';
    return '快回家吧，過勞死不屬於職災';
};

const AttendanceSystem: React.FC<AttendanceSystemProps> = ({ currentUser, records, onRecord }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [quote, setQuote] = useState('');
    const [location, setLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);
    const [loadingLocation, setLoadingLocation] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [viewingRecord, setViewingRecord] = useState<AttendanceRecord | null>(null);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        setQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);
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
        let todayHours = 0; // New metric

        Object.entries(recordsByDate).forEach(([date, dayRecs]) => {
            // Sort by time
            dayRecs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            // Check if valid work day (has start)
            const hasStart = dayRecs.some(r => r.type === 'work-start');
            if (hasStart) totalDays++;

            // Calculate hours (Pair Start-End logic)
            // Iterate through records to find pairs
            let dailyDuration = 0;
            let currentStart: number | null = null;

            dayRecs.forEach(r => {
                const time = new Date(r.timestamp).getTime();
                if (r.type === 'work-start') {
                    if (currentStart === null) currentStart = time;
                } else if (r.type === 'work-end') {
                    if (currentStart !== null) {
                        dailyDuration += (time - currentStart);
                        currentStart = null;
                    }
                }
            });

            // If it's TODAY and still clocked in (currentStart is not null), add time until NOW
            if (date === today && currentStart !== null) {
                dailyDuration += (currentTime.getTime() - currentStart);
            }

            const h = dailyDuration / (1000 * 60 * 60);
            totalHours += h;

            if (date === today) {
                todayHours = h;
            }
        });

        return {
            days: totalDays,
            hours: totalHours.toFixed(1),
            todayHours: todayHours.toFixed(1), // Export today's hours
            groupedRecords: Object.entries(recordsByDate).sort((a, b) => b[0].localeCompare(a[0])) // Sort dates desc
        };
    }, [records, currentUser.id, currentTime]); // Add currentTime dependency for real-time update

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

                let address = '';

                // Using Gemini-powered reverse geocoding to avoid CORS and API key restrictions
                try {
                    address = await getAddressFromCoords(latitude, longitude);
                } catch (e) {
                    console.error('Reverse Geocoding Error:', e);
                    address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
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

    // Safe helpers
    const safeDate = (iso: string) => {
        try {
            const d = new Date(iso);
            if (isNaN(d.getTime())) return '無效時間';
            return d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return '無效格式';
        }
    };

    const safeLocation = (loc: any) => {
        if (!loc) return null;
        if (loc.address) return loc.address;
        if (typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return null;
        return `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;
    };

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
                    title={`${safeDate(viewingRecord.timestamp)} 打卡位置`}
                />
            )}

            {/* Header Panel */}
            <div className="bg-white rounded-[2rem] shadow-xl p-8 border border-stone-100 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full translate-x-1/3 -translate-y-1/3 blur-3xl -z-10" />

                <div>
                    <h1 className="text-3xl font-black text-stone-800 tracking-tight mb-2">
                        {getGreeting(currentTime)}，{currentUser.name}
                    </h1>
                    <p className="text-emerald-700 font-bold mb-1 opacity-90">{quote}</p>
                    <p className="text-xs text-stone-400 font-medium">今天是 {currentTime.toLocaleDateString('zh-TW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>

                <div className="text-right">
                    <div className="text-5xl font-black text-stone-800 tracking-tighter tabular-nums text-right">
                        {currentTime.toLocaleTimeString('zh-TW', { hour12: false })}
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                        <button
                            onClick={() => window.dispatchEvent(new CustomEvent('TRIGGER_CLOUD_SYNC'))}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white/50 hover:bg-white text-stone-500 hover:text-orange-600 transition-all border border-transparent hover:border-orange-200"
                            title="手動同步資料"
                        >
                            <Loader2 size={12} className="opacity-70" /> 同步
                        </button>
                        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold ${isOnDuty
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-stone-100 text-stone-500'
                            }`}>
                            <span className={`w-2 h-2 rounded-full ${isOnDuty ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'}`} />
                            {isOnDuty ? '工作中' : '未打卡'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Monthly Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-black text-stone-400 uppercase tracking-widest">本月天數</p>
                        <p className="text-2xl font-black text-stone-800 tabular-nums">{stats.days} <span className="text-sm text-stone-400">天</span></p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-black text-stone-400 uppercase tracking-widest">今日工時</p>
                        <p className="text-2xl font-black text-stone-800 tabular-nums">{stats.todayHours} <span className="text-sm text-stone-400">hr</span></p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm flex items-center gap-4 col-span-2 md:col-span-1">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-black text-stone-400 uppercase tracking-widest">本月累計</p>
                        <p className="text-2xl font-black text-stone-800 tabular-nums">{stats.hours} <span className="text-sm text-stone-400">hr</span></p>
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
                            <span className="font-bold flex items-center gap-1">定位成功 <Sparkles size={10} className="text-blue-500" /></span>
                            <span className="text-xs opacity-75">{location.address || `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`}</span>
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
                                    {dayRecords.map((record) => {
                                        const locString = safeLocation(record.location);
                                        return (
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
                                                            {safeDate(record.timestamp)}
                                                        </span>
                                                    </div>
                                                    <div
                                                        className={`text-xs text-stone-400 font-mono flex items-center gap-1 ${locString ? 'cursor-pointer hover:text-orange-500 hover:underline' : ''}`}
                                                        onClick={() => locString && setViewingRecord(record)}
                                                    >
                                                        <MapPin size={10} />
                                                        {locString || '未記錄位置'}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
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
