
import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Search, Loader2, HardHat, Store, Hammer, ExternalLink } from 'lucide-react';
import { searchNearbyResources } from '../services/geminiService';

interface MapLocationProps {
    address: string;
    lat?: number;
    lng?: number;
    projectName: string;
}

const MapLocation: React.FC<MapLocationProps> = ({ address, lat = 25.0330, lng = 121.5654, projectName }) => {
    const [nearbyResources, setNearbyResources] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [activeResourceType, setActiveResourceType] = useState<string | null>(null);

    const handleSearchResources = async (type: string) => {
        setIsSearching(true);
        setActiveResourceType(type);
        try {
            const result = await searchNearbyResources(address, lat, lng, type);
            if (result && result.links) {
                setNearbyResources(result.links);
            }
        } catch (error) {
            console.error("搜尋資源失敗:", error);
        } finally {
            setIsSearching(false);
        }
    };

    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const hasApiKey = apiKey && apiKey !== 'undefined' && apiKey !== '';

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 地圖預覽區域 */}
            <div className="relative aspect-video rounded-[2.5rem] overflow-hidden border border-stone-200 shadow-xl group bg-stone-100">
                {hasApiKey ? (
                    <iframe
                        title="project-location"
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        style={{ border: 0 }}
                        src={`https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(address)}`}
                        allowFullScreen
                    ></iframe>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-stone-50">
                        <div className="w-16 h-16 bg-stone-200 rounded-2xl flex items-center justify-center text-stone-400 mb-4">
                            <MapPin size={32} />
                        </div>
                        <h4 className="text-sm font-black text-stone-600 uppercase tracking-widest">Google Maps 未就緒</h4>
                        <p className="text-[10px] font-bold text-stone-400 mt-2 max-w-[240px] leading-relaxed">
                            請在系統設定中配置您的 Google Maps API 金鑰以啟動案場定位與街景預覽功能。
                        </p>
                    </div>
                )}

                <div className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none">
                    <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-lg pointer-events-auto">
                        <div className="flex items-center gap-2 mb-1">
                            <MapPin size={16} className="text-rose-500" />
                            <span className="text-xs font-black text-stone-900">{projectName}</span>
                        </div>
                        <p className="text-[10px] font-bold text-stone-500">{address}</p>
                    </div>
                </div>

                <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-6 right-6 bg-stone-900 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-2 hover:scale-105 transition-all active:scale-95 pointer-events-auto group"
                >
                    <Navigation size={18} className="group-hover:animate-pulse" />
                    <span className="text-xs font-black tracking-widest">開始導航</span>
                </a>
            </div>

            {/* 附近資源搜尋 */}
            <div className="bg-stone-50 p-6 rounded-[2.5rem] border border-stone-200 shadow-inner">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h4 className="text-sm font-black text-stone-900 uppercase tracking-widest">案場周邊資源</h4>
                        <p className="text-[10px] font-bold text-stone-400 mt-1 uppercase tracking-tight">利用 AI 搜尋案場附近物資支援</p>
                    </div>
                    <Search size={20} className="text-stone-300" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { id: 'hardware', label: '五金材料', icon: Hammer },
                        { id: 'hardware_store', label: '水電材料', icon: Store },
                        { id: 'contractor', label: '臨時工班', icon: HardHat },
                        { id: 'parking', label: '附近車位', icon: MapPin },
                    ].map(type => (
                        <button
                            key={type.id}
                            onClick={() => handleSearchResources(type.label)}
                            disabled={isSearching}
                            className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 group ${activeResourceType === type.label
                                ? 'bg-stone-900 border-stone-900 text-white shadow-lg'
                                : 'bg-white border-stone-100 text-stone-600 hover:border-stone-300 hover:shadow-md'
                                }`}
                        >
                            <type.icon size={20} className={`${activeResourceType === type.label ? 'text-white' : 'text-stone-400 group-hover:text-stone-900'} transition-colors`} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{type.label}</span>
                        </button>
                    ))}
                </div>

                {isSearching && (
                    <div className="mt-8 flex flex-col items-center justify-center py-10 gap-4 animate-in fade-in">
                        <Loader2 size={32} className="text-stone-400 animate-spin" />
                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] animate-pulse">正在透過 Gemini 深度檢索周邊資訊...</p>
                    </div>
                )}

                {!isSearching && nearbyResources.length > 0 && (
                    <div className="mt-8 space-y-3 animate-in fade-in slide-in-from-top-2">
                        <h5 className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-4 ml-1">搜尋結果推薦</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {nearbyResources.map((resource, i) => (
                                <a
                                    key={i}
                                    href={resource.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-white p-4 rounded-2xl border border-stone-200 flex items-center justify-between group hover:border-stone-900 transition-all shadow-sm"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-stone-50 rounded-lg flex items-center justify-center">
                                            <MapPin size={14} className="text-stone-400 group-hover:text-stone-900" />
                                        </div>
                                        <span className="text-xs font-bold text-stone-800">{resource.title}</span>
                                    </div>
                                    <ExternalLink size={14} className="text-stone-300 group-hover:text-stone-900" />
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MapLocation;
