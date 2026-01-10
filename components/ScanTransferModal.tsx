import React, { useState, useEffect, useRef } from 'react';
import { X, QrCode, ArrowRightLeft, MapPin, Box, Trash2, Plus, Minus, Camera, Keyboard } from 'lucide-react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { InventoryItem, InventoryLocation } from '../types';

interface ScannedItem {
    inventoryItem: InventoryItem;
    quantity: number;
    fromLocation: string;
}

interface ScanTransferModalProps {
    inventoryItems: InventoryItem[];
    locations: InventoryLocation[];
    onClose: () => void;
    onConfirm: (items: ScannedItem[], toLocation: string) => void;
}

const ScanTransferModal: React.FC<ScanTransferModalProps> = ({ inventoryItems, locations, onClose, onConfirm }) => {
    const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
    const [toLocation, setToLocation] = useState<string>('');
    const [isScanning, setIsScanning] = useState(false);
    const [manualInput, setManualInput] = useState('');
    const [defaultFromLocation, setDefaultFromLocation] = useState<string>('總倉庫');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Sound effect for successful scan
    const playBeep = () => {
        const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
        audio.play().catch(e => console.log('Audio play failed', e));
    };

    const handleCodeDetected = (decodedText: string) => {
        console.log(`Scan result: ${decodedText}`);
        // Find item by Barcode (preferred), SKU, or ID
        const foundItem = inventoryItems.find(item =>
            (item.barcode && item.barcode === decodedText) ||
            (item.sku && item.sku === decodedText) ||
            item.id === decodedText
        );

        if (foundItem) {
            playBeep();

            // Determine source location (try to find one with stock)
            // Priority: Default From -> First location with stock -> 'Main'
            let source = defaultFromLocation;
            const stockInDefault = foundItem.locations.find(l => l.name === source);

            if (!stockInDefault || stockInDefault.quantity <= 0) {
                // Try to find any location with stock
                const anyStock = foundItem.locations.find(l => l.quantity > 0);
                if (anyStock) source = anyStock.name;
            }

            setScannedItems(prev => {
                const existingIdx = prev.findIndex(i => i.inventoryItem.id === foundItem.id && i.fromLocation === source);
                if (existingIdx >= 0) {
                    // Check if we have enough stock to increment
                    const currentQty = prev[existingIdx].quantity;
                    const available = foundItem.locations.find(l => l.name === source)?.quantity || 0;

                    if (currentQty < available) {
                        const newItems = [...prev];
                        newItems[existingIdx].quantity += 1;
                        return newItems;
                    } else {
                        // Max stock reached
                        return prev;
                    }
                } else {
                    return [{ inventoryItem: foundItem, quantity: 1, fromLocation: source }, ...prev];
                }
            });
            setErrorMsg(null);
        } else {
            setErrorMsg(`找不到代碼: ${decodedText}`);
        }
    };

    useEffect(() => {
        let scanner: Html5QrcodeScanner | null = null;
        let isMounted = true;

        const checkPermissionAndInit = async () => {
            try {
                // Pre-check permissions
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                // Stop the stream immediately as we just wanted to check permission
                stream.getTracks().forEach(track => track.stop());

                if (!isMounted) return;

                // Initialize Scanner
                // Small delay to ensure DOM is ready
                setTimeout(() => {
                    if (!isMounted || !document.getElementById('reader')) return;

                    try {
                        scanner = new Html5QrcodeScanner(
                            "reader",
                            {
                                fps: 10,
                                qrbox: { width: 250, height: 250 },
                                aspectRatio: 1.0
                            },
                            /* verbose= */ false
                        );
                        scanner.render(handleCodeDetected, (error) => {
                            // ignore scan errors
                        });
                    } catch (e) {
                        console.error("Scanner init error", e);
                    }
                }, 100);

            } catch (err: any) {
                console.error("Permission error", err);
                if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    setErrorMsg("🔒 請允許相機權限。請至手機「設定 > 瀏覽器 > 允許相機」開啟。");
                } else {
                    setErrorMsg("相機啟動失敗，請確認裝置支援或使用手動輸入。");
                }
            }
        };

        if (isScanning) {
            checkPermissionAndInit();
        }

        return () => {
            isMounted = false;
            if (scanner) {
                scanner.clear().catch(err => console.error("Failed to clear scanner", err));
            }
        };
    }, [isScanning]);

    const handleManualAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualInput) {
            handleCodeDetected(manualInput);
            setManualInput('');
        }
    };

    const handleRemoveItem = (index: number) => {
        setScannedItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleQuantityChange = (index: number, delta: number) => {
        setScannedItems(prev => {
            const newItems = [...prev];
            const item = newItems[index];
            const max = item.inventoryItem.locations.find(l => l.name === item.fromLocation)?.quantity || 0;
            const newQty = item.quantity + delta;

            if (newQty > 0 && newQty <= max) {
                item.quantity = newQty;
            }
            return newItems;
        });
    };

    const handleConfirm = () => {
        if (!toLocation) {
            setErrorMsg('請選擇目的倉庫');
            return;
        }
        if (scannedItems.length === 0) {
            setErrorMsg('清單中沒有物品');
            return;
        }
        onConfirm(scannedItems, toLocation);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col ${isScanning ? 'h-[80vh]' : 'max-h-[85vh]'}`}>
                <div className="px-8 py-6 bg-slate-900 flex justify-between items-center text-white shrink-0">
                    <h2 className="font-bold flex items-center gap-3 text-lg">
                        <QrCode className="text-emerald-400" />
                        掃描調撥 (Scan & Transfer)
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                        <X size={24} />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    {/* Top Controls */}
                    <div className="p-6 space-y-4 bg-slate-50 border-b border-slate-100">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">目的倉庫 (To)</label>
                                <div className="relative">
                                    <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                                    <select
                                        className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                                        value={toLocation}
                                        onChange={e => setToLocation(e.target.value)}
                                    >
                                        <option value="">選擇目的倉庫...</option>
                                        {locations.map(loc => (
                                            <option key={loc.id} value={loc.name}>{loc.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex-1 space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">預設來源 (Default From)</label>
                                <div className="relative">
                                    <Box size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                                    <select
                                        className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                        value={defaultFromLocation}
                                        onChange={e => setDefaultFromLocation(e.target.value)}
                                    >
                                        <option value="">自動偵測 (Auto)</option>
                                        {locations.map(loc => (
                                            <option key={loc.id} value={loc.name}>{loc.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {isScanning ? (
                        <div className="p-4 bg-black relative">
                            <div id="reader" className="w-full h-full rounded-2xl overflow-hidden bg-white/10"></div>
                            <button
                                onClick={() => setIsScanning(false)}
                                className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white text-slate-900 px-6 py-2 rounded-full font-bold shadow-lg text-sm"
                            >
                                停止掃描
                            </button>
                        </div>
                    ) : (
                        <div className="p-6 space-y-6">
                            {/* Input Methods */}
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setIsScanning(true)}
                                    className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                                >
                                    <Camera size={24} className="text-emerald-400" />
                                    <span>開啟相機掃描</span>
                                </button>
                                <div className="flex-1 flex flex-col gap-2">
                                    <form onSubmit={handleManualAdd} className="bg-white border-2 border-slate-100 rounded-2xl p-1 flex items-center focus-within:border-blue-500 transition-colors">
                                        <Keyboard size={20} className="text-slate-300 ml-3" />
                                        <input
                                            autoFocus
                                            className="w-full bg-transparent border-none outline-none px-3 py-3 font-bold text-slate-700"
                                            placeholder="手動輸入條碼/料號..."
                                            value={manualInput}
                                            onChange={e => setManualInput(e.target.value)}
                                        />
                                    </form>
                                    <p className="text-[10px] text-slate-400 font-bold text-center">可搭配 USB 條碼槍使用</p>
                                </div>
                            </div>

                            {/* Scanned List */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                    <span>準備調撥項目 ({scannedItems.length})</span>
                                    {scannedItems.length > 0 && (
                                        <button onClick={() => setScannedItems([])} className="text-rose-500 text-[10px] underline">清空</button>
                                    )}
                                </h3>

                                {errorMsg && (
                                    <div className="bg-rose-50 text-rose-600 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
                                        <X size={14} className="cursor-pointer" onClick={() => setErrorMsg(null)} />
                                        {errorMsg}
                                    </div>
                                )}

                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {scannedItems.length === 0 && (
                                        <div className="text-center py-10 bg-slate-50 rounded-2xl text-slate-300 border border-dashed border-slate-200">
                                            <p className="font-bold">尚未掃描任何物品</p>
                                        </div>
                                    )}
                                    {scannedItems.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm animate-in slide-in-from-bottom-2 duration-300">
                                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                                                <Box size={18} className="text-slate-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-slate-900 truncate">{item.inventoryItem.name}</h4>
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-bold">{item.inventoryItem.unit}</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-xs text-slate-400 font-bold overflow-hidden">
                                                    <span className="truncate">From: {item.fromLocation}</span>
                                                    <span>•</span>
                                                    <span className="truncate">Bar: {item.inventoryItem.barcode || item.inventoryItem.sku}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-1">
                                                <button
                                                    onClick={() => handleQuantityChange(idx, -1)}
                                                    className="w-7 h-7 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-500 hover:text-slate-900 active:scale-95"
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <span className="w-6 text-center font-black text-slate-700">{item.quantity}</span>
                                                <button
                                                    onClick={() => handleQuantityChange(idx, 1)}
                                                    className="w-7 h-7 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-500 hover:text-slate-900 active:scale-95"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>

                                            <button
                                                onClick={() => handleRemoveItem(idx)}
                                                className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0">
                    <button
                        onClick={handleConfirm}
                        disabled={scannedItems.length === 0 || !toLocation}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-black py-4 rounded-2xl shadow-xl shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <ArrowRightLeft size={20} />
                        確認調撥 ({scannedItems.reduce((acc, i) => acc + i.quantity, 0)}) 項物品
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ScanTransferModal;
