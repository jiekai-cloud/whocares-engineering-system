import React from 'react';
import { X, MapPin, Navigation } from 'lucide-react';

interface LocationModalProps {
    location: { lat: number; lng: number; address?: string };
    onClose: () => void;
    title?: string;
}

const LocationModal: React.FC<LocationModalProps> = ({ location, onClose, title = '位置預覽' }) => {
    // Try to use Google Maps Embed API or fallback to standard map link in iframe
    // Note: Standard map link in iframe might be blocked by X-Frame-Options in some environments,
    // but simpler "output=embed" often works for basic pin display.
    const mapUrl = `https://maps.google.com/maps?q=${location.lat},${location.lng}&hl=zh-TW&z=15&output=embed`;
    const externalUrl = `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in" onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden relative animate-in zoom-in-95">
                <div className="p-4 bg-stone-900 text-white flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <MapPin size={18} className="text-orange-400" />
                        <span className="font-bold">{title}</span>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
                </div>

                <div className="aspect-video w-full bg-stone-100 relative">
                    <iframe
                        width="100%"
                        height="100%"
                        src={mapUrl}
                        frameBorder="0"
                        scrolling="no"
                        marginHeight={0}
                        marginWidth={0}
                        title="Map Preview"
                    />
                    {/* Overlay to prevent interactions if needed, or purely aesthetic */}
                    <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/10 to-transparent pointer-events-none"></div>
                </div>

                <div className="p-6 bg-white">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div className="space-y-1">
                            <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Recorded Location</h4>
                            <p className="font-mono text-xl font-bold text-stone-800 tracking-tight">{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</p>
                            {location.address && (
                                <p className="text-sm text-stone-500 font-medium flex items-center gap-1">
                                    <MapPin size={12} />
                                    {location.address}
                                </p>
                            )}
                        </div>

                        <a
                            href={externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full sm:w-auto bg-stone-900 text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-stone-800 hover:scale-105 active:scale-95 transition-all shadow-xl"
                        >
                            <Navigation size={18} className="text-orange-400" />
                            <span>開啟導航</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LocationModal;
