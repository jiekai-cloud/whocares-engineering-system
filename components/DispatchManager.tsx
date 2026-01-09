
import React, { useState, useMemo, useEffect } from 'react';
import {
  ClipboardSignature, Plus, User, Briefcase, Calendar,
  Trash2, Search, FilterX, CreditCard, Users, Hammer, TrendingUp,
  Sparkles, Loader2, Check, ArrowRight, Info, AlertCircle, AlertTriangle, ChevronDown, Upload, FileSpreadsheet
} from 'lucide-react';
import { Project, TeamMember, WorkAssignment } from '../types';
import { parseWorkDispatchText } from '../services/geminiService';
import * as XLSX from 'xlsx';

interface DispatchManagerProps {
  projects: Project[];
  teamMembers: TeamMember[];
  onAddDispatch: (projectId: string, assignment: WorkAssignment) => void;
  onDeleteDispatch: (projectId: string, assignmentId: string) => void;
}

interface PendingAssignment {
  id: string;
  projectId: string; // AI 抓到的原始 ID
  matchedProjectId: string; // 系統內匹配到的實際 ID (若無則為空)
  date: string;
  memberName: string;
  wagePerDay: string;
  days: string;
  description: string;
  isSpiderMan?: boolean; // 是否為蜘蛛人作業
}

const DispatchManager: React.FC<DispatchManagerProps> = ({ projects, teamMembers, onAddDispatch, onDeleteDispatch }) => {
  const [activeMode, setActiveMode] = useState<'manual' | 'ai' | 'excel'>('manual');
  const [isParsing, setIsParsing] = useState(false);
  const [rawLog, setRawLog] = useState('');
  const [pendingAssignments, setPendingAssignments] = useState<PendingAssignment[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [lastUploadedFileName, setLastUploadedFileName] = useState<string | null>(null);
  const [selectedPendingIds, setSelectedPendingIds] = useState<Set<string>>(new Set());

  const [filterProject, setFilterProject] = useState('all');
  const [formData, setFormData] = useState({
    projectId: '',
    memberId: '',
    date: new Date().toISOString().split('T')[0],
    wagePerDay: '',
    days: '1'
  });

  // AI 解析處理
  const handleAIParse = async () => {
    if (!rawLog.trim()) return;
    setIsParsing(true);
    try {
      const results = await parseWorkDispatchText(rawLog, teamMembers);

      const mapped = (results || []).map((r: any, idx: number) => {
        // 嘗試在現有專案中尋找匹配項
        const pid = r.projectId || '';
        const matched = projects.find(p =>
          p.id.toLowerCase().includes(pid.toLowerCase()) ||
          pid.toLowerCase().includes(p.id.toLowerCase()) ||
          p.name.includes(pid)
        );

        // 嘗試匹配成員以獲取日薪
        const matchedMember = teamMembers.find(m =>
          m.name === r.memberName || (m.nicknames || []).includes(r.memberName)
        );

        return {
          id: `pending-${idx}-${Date.now()}`,
          projectId: pid,
          matchedProjectId: matched?.id || '',
          date: r.date || new Date().toISOString().split('T')[0],
          memberName: r.memberName || '未知成員',
          wagePerDay: matchedMember?.dailyRate?.toString() || '2500',
          days: '1',
          description: r.description || ''
        };
      });
      setPendingAssignments(mapped);
    } catch (error: any) {
      alert(`AI 解析失敗: ${error.message || '請檢查網路後再試'}`);
    } finally {
      setIsParsing(false);
    }
  };


  // 智能提取專案 ID 的輔助函數
  const extractProjectId = (text: string): string | null => {
    if (!text) return null;

    // 常見的專案 ID 格式：
    // 1. BNI2024773 (字母+年份+編號) - 2024/2025年保持原樣
    // 2. BNI2601001 (字母+年份後兩位+編號) - 2026年格式
    // 3. BNI2024773_專案名稱
    // 4. [BNI2024773] 專案名稱
    // 5. 專案名稱 (BNI2024773)

    // 嘗試多種模式
    // 1. BNI2024773 (字母+年份+編號)
    // 2. BNI-2025057 (帶分隔符)
    // 3. [BNI2024773]

    const patterns = [
      // 強力模式：字母 + (可選分隔符 -, _, 空格) + 4位以上數字
      /([A-Z]+[-_\s]?\d{4,})/i,
      // 括號模式
      /\[([A-Z0-9\s-]+)\]/i,
      /\(([A-Z0-9\s-]+)\)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        // 移除所有分隔符，標準化為純字母+數字 (例如 BNI-2025057 -> BNI2025057)
        const extractedId = match[1].replace(/[-_\s]/g, '').toUpperCase();

        // 檢查是否為 2024 或 2025 年的案號
        // 格式：BNI2024XXX 或 BNI2025XXX (2024/2025 緊接在字母後面)
        const is2024or2025 = /^[A-Z]+2024\d+$|^[A-Z]+2025\d+$/i.test(extractedId);

        if (is2024or2025) {
          // 2024/2025 年案號：保持原樣，這些是手動編號，格式可能不一致
          return extractedId;
        } else {
          // 2026 及以後的案號：使用標準格式
          return extractedId;
        }
      }
    }

    return null;
  };

  // Excel 導入處理
  const handleExcelImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 重複上傳檢查
    if (file.name === lastUploadedFileName) {
      if (!window.confirm(`檔案 "${file.name}" 之前已經上傳過，您確定要再次匯入重複的內容嗎？`)) {
        event.target.value = ''; // 清空 input 以便下次能選同個檔案
        return;
      }
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        const mapped = jsonData.map((row: any, idx: number) => {
          // 從Excel欄位提取資料
          const projectName = row['案件編號及名稱'] || '';
          const dateStr = row['施工日期'] || row['申請日期'] || '';
          const workersStr = row['施工人員'] || '';

          // 嘗試解析多個施工人員（可能用逗號、頓號或空格分隔）
          const workers = workersStr.split(/[,、，\s]+/).filter((w: string) => w.trim());

          // 解析日期格式
          let parsedDate = new Date().toISOString().split('T')[0];
          if (dateStr) {
            const dateMatch = dateStr.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
            if (dateMatch) {
              parsedDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
            }
          }

          // 智能提取專案 ID
          const extractedId = extractProjectId(projectName);

          // 改進的模糊匹配邏輯
          const matched = projects.find(p => {
            // 1. 如果成功提取到 ID，優先用 ID 精確匹配
            if (extractedId) {
              if (p.id.toUpperCase() === extractedId) return true;
              // 也檢查部分匹配（例如 BNI2024773 匹配 BNI2601773）
              if (p.id.toUpperCase().includes(extractedId)) return true;
              if (extractedId.includes(p.id.toUpperCase())) return true;
            }

            // 2. 名稱模糊匹配
            if (p.name && projectName) {
              if (p.name.includes(projectName)) return true;
              if (projectName.includes(p.name)) return true;
            }

            // 3. ID 包含在原始字串中
            if (projectName.toUpperCase().includes(p.id.toUpperCase())) return true;

            return false;
          });



          // 為每個工人創建一筆派工記錄
          return workers.map((workerName: string, workerIdx: number) => {
            const matchedMember = teamMembers.find(m =>
              m.name === workerName.trim() || (m.nicknames || []).includes(workerName.trim())
            );

            // 檢查是否為蜘蛛人作業（繩索吊掛作業）
            // 優化：動態偵測所有包含關鍵字的欄位，不再依賴完全精確的欄位名稱
            const spiderManKeywords = ['繩索', '吊掛', '蜘蛛人', '高空'];
            const spiderManFields = Object.keys(row)
              .filter(key => spiderManKeywords.some(keyword => key.includes(keyword)))
              .map(key => row[key]);

            // 判斷此工人是否在任何蜘蛛人欄位中
            const isSpiderManWork = spiderManFields.some(field => {
              if (!field) return false;
              const names = field.toString().split(/[,、，\s]+/).filter((n: string) => n.trim());
              return names.some((n: string) => n.trim() === workerName.trim());
            });

            // 計算薪資：基本日薪 + 蜘蛛人津貼（如果適用）
            const baseDailyRate = matchedMember?.dailyRate || 2500;
            const spiderManAllowance = isSpiderManWork ? (matchedMember?.spiderManAllowance || 0) : 0;
            const totalDailyRate = baseDailyRate + spiderManAllowance;

            return {
              id: `excel-${idx}-${workerIdx}-${Date.now()}`,
              projectId: extractedId || projectName, // 優先顯示提取到的 ID
              matchedProjectId: matched?.id || '',
              date: parsedDate,
              memberName: workerName.trim(),
              wagePerDay: totalDailyRate.toString(),
              days: '1',
              description: row['施工進度說明'] || row['施工項目'] || '',
              isSpiderMan: isSpiderManWork
            };
          });
        }).flat();

        setPendingAssignments(prev => [...prev, ...mapped]);
        setUploadedFileName(file.name);
        setLastUploadedFileName(file.name);
        // 不清除已選取的項目，讓用戶可以繼續操作之前的，或者選擇清除
        // 但如果希望重置選擇，可以: setSelectedPendingIds(new Set());
      } catch (error: any) {
        alert(`Excel 解析失敗: ${error.message || '請確認檔案格式正確'}`);
        setUploadedFileName('');
      }
    };
    reader.readAsBinaryString(file);
  };

  // 批次刪除功能
  const handleBatchDelete = () => {
    if (selectedPendingIds.size === 0) return;
    if (window.confirm(`確定要刪除選取的 ${selectedPendingIds.size} 筆資料嗎？`)) {
      setPendingAssignments(prev => prev.filter(p => !selectedPendingIds.has(p.id)));
      setSelectedPendingIds(new Set());
    }
  };

  const toggleSelectAll = () => {
    if (selectedPendingIds.size === pendingAssignments.length) {
      setSelectedPendingIds(new Set());
    } else {
      setSelectedPendingIds(new Set(pendingAssignments.map(p => p.id)));
    }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedPendingIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedPendingIds(newSet);
  };

  const handleBulkImport = () => {
    const validItems = pendingAssignments.filter(item => item.matchedProjectId !== '');
    if (validItems.length === 0) {
      alert("沒有可匯入的項目。請先為標記為紅色的項目選擇正確的專案。");
      return;
    }

    let successCount = 0;
    validItems.forEach(item => {
      const member = teamMembers.find(m => m.name === item.memberName);
      onAddDispatch(item.matchedProjectId, {
        id: Date.now().toString() + Math.random(),
        date: item.date,
        memberId: member?.id || 'EXTERNAL',
        memberName: item.memberName,
        wagePerDay: Number(item.wagePerDay),
        days: Number(item.days),
        totalCost: Number(item.wagePerDay) * Number(item.days),
        isSpiderMan: item.isSpiderMan
      });
      successCount++;
    });

    alert(`成功匯入 ${successCount} 筆派工紀錄至案件成本。`);
    if (successCount === pendingAssignments.length) {
      setPendingAssignments([]);
      setRawLog('');
      setUploadedFileName('');
      setActiveMode('manual');
      setSelectedPendingIds(new Set());
    } else {
      // 留下那些還沒匹配成功的
      setPendingAssignments(prev => prev.filter(p => p.matchedProjectId === ''));
      setSelectedPendingIds(new Set());
    }
  };

  const updatePendingItem = (id: string, field: keyof PendingAssignment, value: string) => {
    setPendingAssignments(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const project = projects.find(p => p.id === formData.projectId);
    const member = teamMembers.find(m => m.id === formData.memberId);
    if (!project || !member || !formData.wagePerDay || !formData.days) return;
    onAddDispatch(project.id, {
      id: Date.now().toString(),
      date: formData.date,
      memberId: member.id,
      memberName: member.name,
      wagePerDay: Number(formData.wagePerDay),
      days: Number(formData.days),
      totalCost: Number(formData.wagePerDay) * Number(formData.days)
    });
    setFormData({ ...formData, memberId: '', wagePerDay: '', days: '1' });
  };

  const allAssignments = useMemo(() => {
    const list: (WorkAssignment & { projectName: string, projectId: string })[] = [];
    projects.forEach(p => {
      (p.workAssignments || []).forEach(wa => {
        list.push({ ...wa, projectName: p.name, projectId: p.id });
      });
    });
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [projects]);

  const filteredAssignments = useMemo(() => {
    if (filterProject === 'all') return allAssignments;
    return allAssignments.filter(a => a.projectId === filterProject);
  }, [allAssignments, filterProject]);



  const groupedPendingAssignments = useMemo(() => {
    return pendingAssignments.reduce((acc, item) => {
      const project = projects.find(p => p.id === item.matchedProjectId);
      const groupKey = project
        ? `${project.name} (${project.id})`
        : `未匹配 / 原始案號: ${item.projectId || '未知專案'}`;

      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(item);
      return acc;
    }, {} as Record<string, typeof pendingAssignments>);
  }, [pendingAssignments, projects]);

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-in slide-in-from-bottom-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-stone-900 tracking-tight">成本管理與派工系統</h1>
          <p className="text-stone-500 text-xs lg:text-sm font-medium">您可以手動輸入、貼上日報，或上傳 Excel 施工日誌，AI 將自動為您計算案件成本。</p>
        </div>
        <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200">
          <button
            onClick={() => setActiveMode('manual')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${activeMode === 'manual' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'}`}
          >
            手動單筆錄入
          </button>
          <button
            onClick={() => setActiveMode('ai')}
            className={`px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2 transition-all ${activeMode === 'ai' ? 'bg-white text-orange-600 shadow-sm' : 'text-stone-400'}`}
          >
            <Sparkles size={14} /> AI 智慧解析日報
          </button>
          <button
            onClick={() => setActiveMode('excel')}
            className={`px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2 transition-all ${activeMode === 'excel' ? 'bg-white text-emerald-600 shadow-sm' : 'text-stone-400'}`}
          >
            <FileSpreadsheet size={14} /> Excel 匯入
          </button>
        </div>
      </div>

      {activeMode === 'ai' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in zoom-in-95">
          {/* 左側：輸入日報 */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-stone-200 shadow-sm space-y-6">
            <h3 className="text-sm font-black text-stone-900 flex items-center gap-2 uppercase tracking-widest">
              <ClipboardSignature size={20} className="text-orange-600" /> 第一步：貼上日報文字
            </h3>
            <textarea
              className="w-full h-80 bg-stone-50 border border-stone-200 rounded-3xl p-6 text-sm font-bold text-black outline-none focus:ring-4 focus:ring-orange-500/10 placeholder:text-stone-300 resize-none leading-relaxed"
              placeholder="請直接貼上 Line 訊息或日報內容..."
              value={rawLog}
              onChange={e => setRawLog(e.target.value)}
            />
            <button
              onClick={handleAIParse}
              disabled={isParsing || !rawLog.trim()}
              className="w-full bg-stone-900 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isParsing ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} className="text-orange-400" />}
              {isParsing ? 'AI 解析中...' : '開始 AI 智慧解析'}
            </button>
          </div>

          {/* 右側：解析預覽與匹配修正 */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-stone-200 shadow-sm flex flex-col h-full">
            <div className="flex justify-between items-center mb-6 shrink-0 flex-wrap gap-2">
              <h3 className="text-sm font-black text-stone-900 flex items-center gap-2 uppercase tracking-widest">
                <Check size={20} className="text-emerald-600" /> 第二步：確認並匯入 <span className="text-emerald-500 text-[10px]">(已更新 V3.0)</span>
              </h3>
              <div className="flex items-center gap-2">
                {pendingAssignments.length > 0 && (
                  <>
                    <button
                      onClick={handleBatchDelete}
                      disabled={selectedPendingIds.size === 0}
                      className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-all ${selectedPendingIds.size > 0
                        ? 'bg-rose-100 text-rose-600 hover:bg-rose-200'
                        : 'bg-stone-100 text-stone-300 cursor-not-allowed'
                        }`}
                    >
                      <Trash2 size={12} />
                      刪除選取 ({selectedPendingIds.size})
                    </button>

                    <button
                      onClick={toggleSelectAll}
                      className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-stone-100 text-stone-500 hover:bg-stone-200"
                    >
                      {selectedPendingIds.size === pendingAssignments.length ? '取消全選' : '全選'}
                    </button>

                    <button
                      onClick={handleBulkImport}
                      className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-100 flex items-center gap-2"
                    >
                      匯入紀錄 ({pendingAssignments.filter(i => i.matchedProjectId !== '').length})
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar pr-2 min-h-[450px]">
              {/* 1. 專案匯總摘要區塊 */}
              {pendingAssignments.length > 0 && (
                <div className="mb-6 p-4 bg-stone-50 rounded-2xl border border-stone-200">
                  <h4 className="text-xs font-black text-stone-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <LayoutList size={14} className="text-stone-500" />
                    匯入專案列表 ({Object.keys(groupedPendingAssignments).length})
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(groupedPendingAssignments).map(([groupName, items]) => {
                      const isUnmatched = groupName.startsWith('未匹配');
                      return (
                        <div key={groupName} className="flex items-center justify-between p-3 bg-white rounded-xl border border-stone-100 shadow-sm hover:shadow-md transition-all">
                          <div className="flex flex-col gap-1">
                            <span className={`text-xs font-black ${isUnmatched ? 'text-rose-600' : 'text-stone-900'}`}>
                              {groupName}
                            </span>
                            <span className="text-[10px] text-stone-400 font-bold">{items.length} 筆派工紀錄</span>
                          </div>
                          <button
                            onClick={() => {
                              // 找出這個群組的所有 ID
                              const idsToImport = new Set(items.map(i => i.id));
                              // 檢查是否所有項目都已匹配
                              const hasUnmatched = items.some(i => !i.matchedProjectId);

                              if (hasUnmatched) {
                                alert('此專案尚有未匹配的項目，請先手動選擇正確的專案後再匯入。');
                                return;
                              }

                              // 執行匯入邏輯 (只針對這個專案)
                              let successCount = 0;
                              items.forEach(item => {
                                if (!item.matchedProjectId) return;
                                const member = teamMembers.find(m => m.name === item.memberName);
                                onAddDispatch(item.matchedProjectId, {
                                  id: Date.now().toString() + Math.random(),
                                  date: item.date,
                                  memberId: member?.id || 'EXTERNAL',
                                  memberName: item.memberName,
                                  wagePerDay: Number(item.wagePerDay),
                                  days: Number(item.days),
                                  totalCost: Number(item.wagePerDay) * Number(item.days),
                                  isSpiderMan: item.isSpiderMan
                                });
                                successCount++;
                              });

                              alert(`成功匯入 ${groupName} 的 ${successCount} 筆紀錄！`);
                              // 從待處理列表中移除已匯入的項目
                              setPendingAssignments(prev => prev.filter(p => !idsToImport.has(p.id)));
                              setSelectedPendingIds(prev => {
                                const next = new Set(prev);
                                idsToImport.forEach(id => next.delete(id));
                                return next;
                              });

                              if (pendingAssignments.length - successCount === 0) {
                                setPendingAssignments([]);
                                setRawLog('');
                                setUploadedFileName('');
                                setActiveMode('manual');
                              }
                            }}
                            disabled={isUnmatched}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-all ${isUnmatched
                              ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                              : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              }`}
                          >
                            {isUnmatched ? '請先匹配' : '匯入此案'} <ArrowRight size={10} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. 詳細列表 (原有顯示邏輯) */}
              {pendingAssignments.length > 0 ? (
                Object.entries(groupedPendingAssignments).map(([groupName, items]) => (
                  <div key={groupName} className="mb-6">
                    <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm py-2 mb-2 border-b border-stone-100 flex items-center justify-between">
                      <h4 className={`text-xs font-black uppercase tracking-widest pl-3 border-l-4 ${groupName.startsWith('未匹配') ? 'border-rose-500 text-rose-600' : 'border-emerald-500 text-emerald-700'}`}>
                        {groupName}
                      </h4>
                      <span className="text-[10px] font-bold bg-stone-100 text-stone-500 px-2 py-1 rounded-full">{items.length} 筆</span>
                    </div>

                    <div className="space-y-3">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className={`p-5 pl-12 rounded-2xl border transition-all space-y-3 relative group ${item.matchedProjectId ? 'bg-stone-50 border-stone-100' : 'bg-rose-50 border-rose-100 ring-2 ring-rose-500/20'
                            }`}
                        >
                          <div className="absolute top-0 left-0 bottom-0 w-10 flex items-center justify-center border-r border-stone-100/50">
                            <input
                              type="checkbox"
                              checked={selectedPendingIds.has(item.id)}
                              onChange={() => toggleSelection(item.id)}
                              className="w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                            />
                          </div>

                          <button onClick={() => setPendingAssignments(prev => prev.filter(p => p.id !== item.id))} className="absolute top-4 right-4 text-stone-300 hover:text-rose-500 z-10">
                            <Trash2 size={14} />
                          </button>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              {item.matchedProjectId ? (
                                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">匹配成功: {item.matchedProjectId}</span>
                              ) : (
                                <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 flex items-center gap-1">
                                  <AlertTriangle size={10} /> 找不到案號: {item.projectId}
                                </span>
                              )}
                            </div>

                            {/* 專案選擇/修正下拉選單 */}
                            <div className="relative">
                              <select
                                className={`w-full bg-white border rounded-xl px-3 py-2 text-xs font-black text-black outline-none ${item.matchedProjectId ? 'border-stone-200' : 'border-rose-300 ring-2 ring-rose-500/10'}`}
                                value={item.matchedProjectId}
                                onChange={e => {
                                  updatePendingItem(item.id, 'matchedProjectId', e.target.value);
                                }}
                              >
                                <option value="">請手動指定所屬專案...</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
                              </select>
                            </div>

                            <div className="flex justify-between items-end">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-white border border-stone-200 rounded-lg flex items-center justify-center font-black text-xs text-stone-700">{item.memberName.charAt(0)}</div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs font-black text-stone-900">{item.memberName}</p>
                                    {item.isSpiderMan && (
                                      <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">🕷️ 蜘蛛人</span>
                                    )}
                                  </div>
                                  <p className="text-[9px] text-stone-400 font-bold">{item.date}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-100">
                            <div>
                              <label className="block text-[8px] font-black text-stone-400 uppercase mb-1">單日薪資 (TWD)</label>
                              <input
                                type="number"
                                className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs font-black text-black outline-none"
                                value={item.wagePerDay}
                                onChange={e => updatePendingItem(item.id, 'wagePerDay', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-black text-stone-400 uppercase mb-1">派工天數</label>
                              <input
                                type="number" step="0.5"
                                className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs font-black text-black outline-none"
                                value={item.days}
                                onChange={e => updatePendingItem(item.id, 'days', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-30 italic text-stone-400 space-y-3">
                  <AlertCircle size={48} />
                  <p className="text-xs font-black uppercase tracking-widest">AI 解析結果將顯示於此</p>
                </div>
              )}

            </div>

            {pendingAssignments.length > 0 && (
              <div className="mt-6 p-4 bg-orange-50 rounded-2xl border border-orange-100 flex items-start gap-3">
                <Info size={16} className="text-orange-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-orange-700 font-bold leading-relaxed">
                  如果顯示紅色，表示系統內找不到對應案號。請點擊選單手動選擇正確的案件名稱，否則該筆紀錄將無法匯入。
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Excel 匯入介面 */}
      {activeMode === 'excel' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in zoom-in-95">
          {/* 左側：上傳Excel */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-stone-200 shadow-sm space-y-6">
            <h3 className="text-sm font-black text-stone-900 flex items-center gap-2 uppercase tracking-widest">
              <FileSpreadsheet size={20} className="text-emerald-600" /> 第一步：上傳施工日誌 Excel
            </h3>

            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-2xl border-2 border-dashed border-emerald-200 space-y-4">
              <div className="flex flex-col items-center justify-center py-8">
                <Upload size={48} className="text-emerald-400 mb-4" />
                <p className="text-sm font-bold text-stone-700 mb-2">拖放Excel檔案至此，或點擊下方按鈕上傳</p>
                <p className="text-xs text-stone-500 mb-6">支援 .xlsx, .xls 格式</p>

                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleExcelImport}
                    className="hidden"
                  />
                  <div className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center gap-3">
                    <Upload size={20} />
                    選擇 Excel 檔案
                  </div>
                </label>
              </div>

              {/* 上傳成功提示 */}
              {uploadedFileName && (
                <div className="bg-white p-5 rounded-2xl border-2 border-emerald-500 shadow-lg animate-in slide-in-from-top-2">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
                      <Check size={24} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-black text-emerald-900 mb-1">✓ 上傳成功</h4>
                      <p className="text-xs font-bold text-stone-700 mb-2 break-all">{uploadedFileName}</p>
                      <p className="text-[11px] text-emerald-700 font-medium">
                        成功解析 <span className="font-black text-emerald-900">{pendingAssignments.length}</span> 筆施工紀錄
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 space-y-3">
              <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center gap-2">
                <Info size={16} />
                Excel 格式說明
              </h4>
              <div className="text-[11px] text-blue-800 font-medium space-y-2 leading-relaxed">
                <p>✓ <strong>必要欄位：</strong></p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li><strong>案件編號及名稱</strong> - 用於匹配專案</li>
                  <li><strong>施工日期</strong> - 派工日期</li>
                  <li><strong>施工人員</strong> - 工人名稱（多人用逗號分隔）</li>
                </ul>
                <p className="mt-3">✓ <strong>選用欄位：</strong></p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li><strong>施工進度說明</strong> - 工作描述</li>
                  <li><strong>施工項目</strong> - 工作項目</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 右側：解析預覽與匹配修正（與AI模式共用） */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-stone-200 shadow-sm flex flex-col h-full">
            <div className="flex justify-between items-center mb-6 shrink-0 flex-wrap gap-2">
              <h3 className="text-sm font-black text-stone-900 flex items-center gap-2 uppercase tracking-widest">
                <Check size={20} className="text-emerald-600" /> 第二步：確認並匯入
              </h3>
              <div className="flex items-center gap-2">
                {pendingAssignments.length > 0 && (
                  <>
                    <button
                      onClick={handleBatchDelete}
                      disabled={selectedPendingIds.size === 0}
                      className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-all ${selectedPendingIds.size > 0
                        ? 'bg-rose-100 text-rose-600 hover:bg-rose-200'
                        : 'bg-stone-100 text-stone-300 cursor-not-allowed'
                        }`}
                    >
                      <Trash2 size={12} />
                      刪除選取 ({selectedPendingIds.size})
                    </button>

                    <button
                      onClick={toggleSelectAll}
                      className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-stone-100 text-stone-500 hover:bg-stone-200"
                    >
                      {selectedPendingIds.size === pendingAssignments.length ? '取消全選' : '全選'}
                    </button>

                    <button
                      onClick={handleBulkImport}
                      className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-100 flex items-center gap-2"
                    >
                      匯入紀錄 ({pendingAssignments.filter(i => i.matchedProjectId !== '').length})
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 列表內容區域 - 使用新的分組顯示邏輯 */}
            <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar pr-2 min-h-[450px]">

              {/* 1. 專案匯總摘要區塊 (V3.0 新增) */}
              {pendingAssignments.length > 0 && (
                <div className="mb-6 p-4 bg-stone-50 rounded-2xl border border-stone-200">
                  <h4 className="text-xs font-black text-stone-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <LayoutList size={14} className="text-stone-500" />
                    匯入專案列表 ({Object.keys(groupedPendingAssignments).length})
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(groupedPendingAssignments).map(([groupName, items]) => {
                      const isUnmatched = groupName.startsWith('未匹配');
                      return (
                        <div key={groupName} className="flex items-center justify-between p-3 bg-white rounded-xl border border-stone-100 shadow-sm hover:shadow-md transition-all">
                          <div className="flex flex-col gap-1">
                            <span className={`text-xs font-black ${isUnmatched ? 'text-rose-600' : 'text-stone-900'}`}>
                              {groupName}
                            </span>
                            <span className="text-[10px] text-stone-400 font-bold">{items.length} 筆派工紀錄</span>
                          </div>
                          <button
                            onClick={() => {
                              // 找出這個群組的所有 ID
                              const groupIds = new Set(items.map(i => i.id));
                              // 執行匯入
                              handleImportSpecific(groupIds);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border flex items-center gap-1 transition-all ${isUnmatched
                              ? 'bg-stone-100 text-stone-300 border-stone-200 cursor-not-allowed'
                              : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                              }`}
                            disabled={isUnmatched}
                            title={isUnmatched ? "請先在下方手動選擇正確專案" : "只匯入此專案的紀錄"}
                          >
                            {isUnmatched ? '待修正' : '匯入此案'}
                            {!isUnmatched && <ArrowRight size={10} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. 詳細列表 (分組顯示) */}
              {pendingAssignments.length > 0 ? (
                Object.entries(groupedPendingAssignments).map(([groupName, items]) => (
                  <div key={groupName} className="mb-6">
                    <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm py-2 mb-2 border-b border-stone-200 flex items-center justify-between">
                      <h4 className={`text-xs font-black uppercase tracking-widest pl-3 border-l-4 ${groupName.startsWith('未匹配') ? 'border-rose-500 text-rose-600' : 'border-emerald-500 text-emerald-700'
                        }`}>
                        {groupName}
                      </h4>
                      <span className="text-[10px] font-bold bg-stone-100 text-stone-500 px-2 py-1 rounded-full">{items.length} 筆</span>
                    </div>

                    <div className="space-y-3">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className={`p-5 pl-12 rounded-2xl border transition-all space-y-3 relative group ${item.matchedProjectId ? 'bg-stone-50 border-stone-100' : 'bg-rose-50 border-rose-100 ring-2 ring-rose-500/20'
                            }`}
                        >
                          <div className="absolute top-0 left-0 bottom-0 w-10 flex items-center justify-center border-r border-stone-100/50">
                            <input
                              type="checkbox"
                              checked={selectedPendingIds.has(item.id)}
                              onChange={() => toggleSelection(item.id)}
                              className="w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                            />
                          </div>

                          <button onClick={() => setPendingAssignments(prev => prev.filter(p => p.id !== item.id))} className="absolute top-4 right-4 text-stone-300 hover:text-rose-500 z-10">
                            <Trash2 size={14} />
                          </button>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              {item.matchedProjectId ? (
                                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">匹配成功: {item.matchedProjectId}</span>
                              ) : (
                                <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 flex items-center gap-1">
                                  <AlertTriangle size={10} /> 找不到案號: {item.projectId}
                                </span>
                              )}
                            </div>

                            {/* 專案選擇/修正下拉選單 */}
                            <div className="relative">
                              <select
                                className={`w-full bg-white border rounded-xl px-3 py-2 text-xs font-black text-black outline-none ${item.matchedProjectId ? 'border-stone-200' : 'border-rose-300 ring-2 ring-rose-500/10'}`}
                                value={item.matchedProjectId}
                                onChange={e => updatePendingItem(item.id, 'matchedProjectId', e.target.value)}
                              >
                                <option value="">請手動指定所屬專案...</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
                              </select>
                            </div>

                            <div className="flex justify-between items-end">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-white border border-stone-200 rounded-lg flex items-center justify-center font-black text-xs text-stone-700">{item.memberName.charAt(0)}</div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs font-black text-stone-900">{item.memberName}</p>
                                    {item.isSpiderMan && (
                                      <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">🕷️ 蜘蛛人</span>
                                    )}
                                  </div>
                                  <p className="text-[9px] text-stone-400 font-bold">{item.date}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-100">
                            <div>
                              <label className="block text-[8px] font-black text-stone-400 uppercase mb-1">單日薪資 (TWD)</label>
                              <input
                                type="number"
                                className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs font-black text-black outline-none"
                                value={item.wagePerDay}
                                onChange={e => updatePendingItem(item.id, 'wagePerDay', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-black text-stone-400 uppercase mb-1">派工天數</label>
                              <input
                                type="number" step="0.5"
                                className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs font-black text-black outline-none"
                                value={item.days}
                                onChange={e => updatePendingItem(item.id, 'days', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-30 italic text-stone-400 space-y-3">
                  <AlertCircle size={48} />
                  <p className="text-xs font-black uppercase tracking-widest">Excel 解析結果將顯示於此</p>
                </div>
              )}
            </div>

            {pendingAssignments.length > 0 && (
              <div className="mt-6 p-4 bg-orange-50 rounded-2xl border border-orange-100 flex items-start gap-3">
                <Info size={16} className="text-orange-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-orange-700 font-bold leading-relaxed">
                  如果顯示紅色，表示系統內找不到對應案號。請點擊選單手動選擇正確的案件名稱，否則該筆紀錄將無法匯入。
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 手動錄入介面 (與之前相同) */}
      {activeMode === 'manual' && (
        <div className="bg-white p-8 rounded-[2rem] border-2 border-stone-100 shadow-sm animate-in zoom-in-95">
          <form onSubmit={handleManualSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-stone-500 uppercase mb-2">1. 選擇專案</label>
              <select
                required
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-black outline-none focus:ring-2 focus:ring-orange-500/20"
                value={formData.projectId}
                onChange={e => setFormData({ ...formData, projectId: e.target.value })}
              >
                <option value="">請選擇專案...</option>
                {projects.map(p => <option key={p.id} value={p.id} className="text-black">{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-stone-500 uppercase mb-2">2. 派駐成員</label>
              <select
                required
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-black outline-none"
                value={formData.memberId}
                onChange={e => setFormData({ ...formData, memberId: e.target.value })}
              >
                <option value="">選擇人員...</option>
                {teamMembers.map(m => <option key={m.id} value={m.id} className="text-black">{m.name} ({m.role})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-stone-500 uppercase mb-2">3. 薪資 (TWD)</label>
              <input
                type="number"
                placeholder="2500"
                required
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-black outline-none"
                value={formData.wagePerDay}
                onChange={e => setFormData({ ...formData, wagePerDay: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-black text-stone-500 uppercase mb-2">4. 天數</label>
              <div className="flex gap-2">
                <input
                  type="number" step="0.5" min="0.5"
                  required
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-black outline-none"
                  value={formData.days}
                  onChange={e => setFormData({ ...formData, days: e.target.value })}
                />
                <button type="submit" className="bg-stone-900 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-stone-100 hover:bg-black transition-all">確認</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 數據統計與清單 (與之前相同) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Hammer size={24} /></div>
          <div>
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">總人天統計</p>
            <p className="text-xl font-black text-stone-900">{(filteredAssignments || []).reduce((acc, curr) => acc + (curr?.days || 0), 0)} 人天</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><CreditCard size={24} /></div>
          <div>
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">總人力開銷</p>
            <p className="text-xl font-black text-stone-900">NT$ {((filteredAssignments || []).reduce((acc, curr) => acc + (curr?.totalCost || 0), 0) || 0).toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><TrendingUp size={24} /></div>
          <div>
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">案件人力佔比</p>
            <p className="text-xl font-black text-stone-900">28.5%</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-8 py-5 border-b border-stone-100 bg-stone-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <ClipboardSignature size={18} className="text-orange-600" />
            <h3 className="font-black text-stone-900 text-sm uppercase tracking-widest">累積派工紀錄明細</h3>
          </div>
          <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-stone-200">
            <Briefcase size={14} className="text-stone-400" />
            <select
              className="bg-transparent text-xs font-bold text-black outline-none cursor-pointer"
              value={filterProject}
              onChange={e => setFilterProject(e.target.value)}
            >
              <option value="all">所有案件紀錄</option>
              {projects.map(p => <option key={p.id} value={p.id} className="text-black">{p.name}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-stone-50/50 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">
                <th className="px-8 py-4">日期</th>
                <th className="px-8 py-4">所屬案件</th>
                <th className="px-8 py-4">成員</th>
                <th className="px-8 py-4 text-right">單日薪資</th>
                <th className="px-8 py-4 text-right">天數</th>
                <th className="px-8 py-4 text-right">成本小計</th>
                <th className="px-8 py-4 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {filteredAssignments.length > 0 ? filteredAssignments.map((item) => (
                <tr key={item.id} className="text-sm hover:bg-stone-50/50 transition-colors group">
                  <td className="px-8 py-5 font-mono text-xs text-stone-500">{item.date}</td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="font-bold text-stone-900">{item.projectName}</span>
                      <span className="text-[10px] text-stone-400 font-black">{item.projectId}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 font-bold text-stone-800">{item.memberName}</td>
                  <td className="px-8 py-5 text-right font-bold text-stone-600">NT$ {(item.wagePerDay || 0).toLocaleString()}</td>
                  <td className="px-8 py-5 text-right font-black text-stone-900">{item.days}</td>
                  <td className="px-8 py-5 text-right font-black text-orange-600">NT$ {(item.totalCost || 0).toLocaleString()}</td>
                  <td className="px-8 py-5 text-center">
                    <button
                      onClick={() => onDeleteDispatch(item.projectId, item.id)}
                      className="p-2 text-stone-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="text-center py-20 text-xs font-black uppercase tracking-widest text-stone-300 italic">尚無相關紀錄</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DispatchManager;
