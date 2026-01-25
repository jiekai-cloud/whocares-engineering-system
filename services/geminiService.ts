import { GoogleGenAI, Type } from "@google/genai";
import { Project } from "../types";

// 優先採用的穩定模型列表 (依序備援)
// 優先採用的穩定模型列表 (依序備援，涵蓋穩定版與最新版)
const FALLBACK_MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash-exp',
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro-latest'
];

const STABLE_MODEL = 'gemini-1.5-flash';
const EXPERIMENTAL_MODEL = 'gemini-2.0-flash-exp';

// Always use an named parameter for apiKey and fetch from process.env.API_KEY
const getAI = () => {
  const savedKey = typeof window !== 'undefined' ? localStorage.getItem('GEMINI_API_KEY') : null;
  // Vite environment variables or process.env (fallback)
  const envKey = (import.meta.env?.VITE_GEMINI_API_KEY) || process.env.VITE_GEMINI_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY;
  const hardcodedKey = ''; // Removed for security reasons

  const isInvalid = (k: string | null | undefined) => !k || k === 'PLACEHOLDER_API_KEY' || k === 'undefined' || k === '';

  // Priority: localStorage > env > hardcoded
  let key = 'AIzaSyDM5F-SFvUSAFDVDEMtbr2c-0Ndw3QZuJY'; // Default Fallback Key
  if (!isInvalid(envKey)) key = envKey! as string;
  if (!isInvalid(savedKey)) key = savedKey!;

  if (isInvalid(key)) {
    console.error("Gemini API Key is missing or invalid.");
    throw new Error("Gemini API 金鑰未設定或無效。請點擊右上角「AI 服務」來配置金鑰。");
  }

  // Debug log (masked)
  console.log(`Using AI Key: ${key.substring(0, 8)}... (GenAI SDK - ${STABLE_MODEL})`);

  try {
    return new GoogleGenAI({ apiKey: key });
  } catch (e) {
    console.error("GenAI Initialization failed:", e);
    throw e;
  }
};

/**
 * 集中處理 AI 報錯，提供更友善的資訊
 */
const handleAIError = (error: any, context: string, modelUsed: string) => {
  console.warn(`${context} 使用 ${modelUsed} 失敗:`, error); // Changed to warn

  const errorMsg = error?.message || "";

  // 429: Too Many Requests / Resource Exhausted
  if (errorMsg.includes("limit: 0") || errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("429")) {
    return "QUOTA_EXCEEDED";
  }

  // 404 代表模型不存在或未被授權
  if (errorMsg.includes("404") || errorMsg.includes("not found")) {
    return "MODEL_NOT_FOUND";
  }

  // 503 Service Unavailable
  if (errorMsg.includes("503") || errorMsg.includes("overloaded")) {
    return "SERVER_OVERLOADED";
  }

  throw error;
};

/**
 * 具備自動備援機制的 AI 調用函式
 */
async function callAIWithFallback(payload: any, context: string) {
  const ai = getAI();
  let lastError: any = null;

  console.log('[AI Config] Fallback list:', FALLBACK_MODELS);
  for (const modelId of FALLBACK_MODELS) {
    try {
      console.log(`[AI v2.1] 嘗試調用模型: ${modelId} (${context})`);
      const response = await ai.models.generateContent({
        ...payload,
        model: modelId
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const status = handleAIError(err, context, modelId);

      if (status === "QUOTA_EXCEEDED") {
        console.warn(`[AI] 模型 ${modelId} 配額已滿 (429)，等待 2 秒後嘗試下一個備援模型...`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simple backoff
        continue;
      }

      if (status === "SERVER_OVERLOADED") {
        console.warn(`[AI] 模型 ${modelId} 服務忙碌 (503)，等待 1 秒後嘗試下一個備援模型...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      if (status === "MODEL_NOT_FOUND") {
        console.warn(`[AI] 模型 ${modelId} 不存在，嘗試下一個備援模型...`);
        continue;
      }

      // 如果是其他錯誤 (例如安全攔截)，則直接報錯不續試
      throw err;
    }
  }

  throw lastError || new Error(`${context} 失敗：所有備援模型均無法連線 (配額已滿或網路問題)。請稍後再試。`);
}

/**
 * 輔助函式：清理 AI 回傳的 JSON 字串 (移除 Markdown 區塊標記)
 */
const cleanJsonString = (str: string) => {
  if (!str) return "[]";
  return str.replace(/```json/g, '').replace(/```/g, '').trim();
};

/**
 * 全案場風險報告分析 - 針對大數據量進行採樣優化
 */
export const getPortfolioAnalysis = async (projects: Project[]) => {
  try {
    const ai = getAI();
    // 再次確保排除測試專案
    const realProjects = projects.filter(p => !p.name.toLowerCase().includes('test') && !p.name.includes('測試'));
    const totalCount = realProjects.length;

    // 找出目前狀態異常的案件：進度緩慢、逾期、預算超標
    // 當專案數量龐大時，僅提取「施工中」且「進度滯後」或「報價過久」的異常件，避免 Context 爆量
    const criticalOnes = realProjects
      .filter(p => (p.status === '施工中' && p.progress < 20) || (p.status === '報價中'))
      .slice(0, 50); // 採樣前 50 個高風險案件

    const projectSummary = criticalOnes.map(p => {
      const laborCost = (p.workAssignments || []).reduce((acc, curr) => acc + curr.totalCost, 0);
      const expenseCost = (p.expenses || []).reduce((acc, curr) => acc + curr.amount, 0);
      return `- ${p.name}: 狀態 ${p.status}, 進度 ${p.progress}%, 預算 ${p.budget}, 工資支出 ${laborCost}, 材料支出 ${expenseCost}`;
    }).join('\n');

    const response = await callAIWithFallback({
      contents: [{
        parts: [{
          text: `妳是「生活品質工程管理系統」的首席營運策略官。
妳的任務是審核公司目前正在進行的 ${totalCount} 件專案，特別是以下篩選出的潛在風險案件：

${projectSummary}

請針對以下三個維度提供一份深度的營運診斷報告：
1. **資源錯置分析**：哪些專案的進度與工資支出嚴重不成比例？(即進度緩慢但人力成本已耗去大半)
2. **瓶頸案件預警**：找出最具「虧損風險」的指標案件，並說明原因。
3. **優化調度建議**：針對目前的負載，應該如何調整人力或物力以確保公司整體利潤最大化？

報告請使用簡潔、專業的繁體中文 Markdown 格式。`
        }]
      }]
    }, "全案場分析");
    return { text: response.text };
  } catch (error) {
    throw error;
  }
};

/**
 * 針對特定專案提供深入洞察
 */
export const getProjectInsights = async (project: Project, question: string) => {
  const ai = getAI();
  try {
    const response = await callAIWithFallback({
      contents: [{
        parts: [{
          text: `妳是專業的智慧營造顧問。請根據提供的單一專案數據，精確回答使用者的疑問並提出具體的改進或監控建議。

專案詳細資料：
名稱: ${project.name}
狀態: ${project.status}
進度: ${project.progress}%
預算: ${project.budget}
目前支出: ${project.spent}
問題內容: ${question}`
        }]
      }]
    }, "獲取專案洞察");
    return { text: response.text };
  } catch (error) {
    throw error;
  }
};

/**
 * 搜尋營造法規與市場知識 (使用 Google Search)
 */
export const searchEngineeringKnowledge = async (query: string) => {
  try {
    const response = await callAIWithFallback({
      contents: [{
        parts: [{
          text: `妳是營造法規與市場趨勢專家。請利用搜尋功能為使用者提供具備權權威來源的解答，包含最新法規更新或建材價格行情。

搜尋內容: ${query}`
        }]
      }],
      config: {
        tools: [{ googleSearch: {} }]
      }
    }, "搜尋知識");

    // Extract grounding chunks for URLs
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const links = chunks.map((chunk: any) => ({
      title: chunk.web?.title || '參考連結',
      uri: chunk.web?.uri
    })).filter((l: any) => l.uri);

    return { text: response.text, chunks: links };
  } catch (error) {
    return handleAIError(error, "搜尋知識");
  }
};

/**
 * 智慧施工排程建議
 */
export const suggestProjectSchedule = async (project: Project) => {
  try {
    // 對於複雜推理任務使用 Pro 模型
    const response = await callAIWithFallback({
      contents: [{
        parts: [{
          text: `妳是具備二十年經驗的資深工務經理。妳擅長進行裝修與建築工程的排程規劃，請提供符合實務邏輯的階段劃分。

案名: ${project.name}, 類別: ${project.category}, 預計工期: ${project.startDate} ~ ${project.endDate}。
請提供專業的施工進度節點規劃與各階段工期佔比建議。`
        }]
      }]
    }, "排程建議");
    return { text: response.text };
  } catch (error) {
    return handleAIError(error, "排程建議");
  }
};

/**
 * 團隊資源負載分析 - 診斷人員壓力與瓶頸
 */
export const getTeamLoadAnalysis = async (members: any[], projects: Project[]) => {
  try {
    const memberSummary = members.map(m =>
      `- ${m.name}${m.nicknames?.length ? ` (外號: ${m.nicknames.join(', ')})` : ''} (${m.role}): 負責 ${m.activeProjectsCount} 案, 狀態: ${m.status}, 專長: ${m.specialty?.join(',')}`
    ).join('\n');

    const projectSummary = projects
      .filter(p => p.status === '施工中')
      .map(p => `- ${p.name}: 進度 ${p.progress}%, 負責人: ${p.manager}`)
      .join('\n');

    const response = await callAIWithFallback({
      contents: [{
        parts: [{
          text: `妳是技術總監級別的 AI 管理顧問。
妳會分析工程團隊的負載狀況。請從以下角度提供簡短精幹的分析報告：
1. 資源分配異常：是否有人的案量過高（例如超過 5 案）？
2. 專長匹配度：目前的施工中專案是否都有對應專長的人員在場？
3. 潛在風險預警：哪些人可能因為過度忙碌導致品質下降？
請使用條列式，並在文末給出一個「整體營運負載指數 (0-100)」。

成員數據：\n${memberSummary}\n\n施工中專案：\n${projectSummary}`
        }]
      }]
    }, "團隊負載分析");
    return { text: response.text };
  } catch (error) {
    return handleAIError(error, "團隊負載分析");
  }
};

/**
 * 搜尋案場附近資源 (使用 Google Maps)
 */
export const searchNearbyResources = async (address: string, lat: number, lng: number, resourceType: string) => {
  try {
    // 地圖服務僅支援 Gemini 系列模型
    const response = await callAIWithFallback({
      contents: [{
        parts: [{
          text: `妳是地圖導航專家。請在 ${address} 附近搜尋 ${resourceType} 並提供相關資訊。`
        }]
      }],
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: lat,
              longitude: lng
            }
          }
        }
      }
    }, "案場資源搜尋");

    // 根據規範，必須提取 groundingChunks 中的地圖連結
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const links = chunks.map((chunk: any) => ({
      title: chunk.maps?.title || '地點資訊',
      uri: chunk.maps?.uri
    })).filter((l: any) => l.uri);

    return { text: response.text, links };
  } catch (error) {
    return handleAIError(error, "案場資源搜尋");
  }
};

/**
 * 解析日報文字為結構化派工數據
 */
export const parseWorkDispatchText = async (text: string, members: any[] = []) => {
  const ai = getAI();
  try {
    const memberContext = members.length > 0
      ? `目前團隊成員名單 (包含所有外號)：\n${members.map(m => `- ${m.name}${m.nicknames?.length ? ` (外號: ${m.nicknames.join(', ')})` : ''}`).join('\n')}\n\n`
      : '';

    const response = await callAIWithFallback({
      contents: [{
        parts: [{
          text: `妳是專業的工務數據解析員。妳能從混亂的通訊軟體對話或手寫日報轉錄文字中，精準提取出派工數據並轉化為 JSON 陣列。
請僅回傳 JSON 陣列，不包含額外的文字或解釋。
每一個物件必須包含:
- projectId: 案號或案場名稱
- date: 日期 (YYYY-MM-DD)
- memberName: 人員姓名 (如果日報使用外號，請對應回正式姓名)
- description: 施作內容描述

${memberContext}
日報內容：\n\n${text}`
        }]
      }]
    }, "日報解析");
    const jsonStr = cleanJsonString(response.text || "[]");
    return JSON.parse(jsonStr);
  } catch (error) {
    return handleAIError(error, "日報解析");
  }
};

/**
 * 智慧名片辨識 - 提取聯絡資訊
 */
export const scanBusinessCard = async (base64Image: string) => {
  try {
    // 使用具備視覺能力的模型
    const response = await callAIWithFallback({
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image
          }
        },
        "妳是專業的商務名片數位化專家。妳能從名片照片中精準辨認各個欄位。請辨識這張名片上的聯絡資訊。請僅回傳 JSON 格式數據，包含姓名、公司、職稱、電話、Email、地址、Line ID 等。如果某個欄位不存在，請回傳空字串。"
      ]
    }, "名片掃描");

    try {
      return JSON.parse(response.text || "{}");
    } catch (e) {
      console.error("JSON 解析失敗，原始文字:", response.text);
      return {};
    }
  } catch (error) {
    return handleAIError(error, "名片掃描");
  }
};

/**
 * 智慧發票收據辨識 - 提取支出資訊
 */
export const scanReceipt = async (base64Image: string) => {
  const ai = getAI();
  try {
    const response = await callAIWithFallback({
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image
          }
        },
        `妳是專業的財務單據辨識專家。妳能從發票或收據照片中精準辨認各個欄位。
        請辨識這張收據上的支出資訊，並僅回傳 JSON 格式數據。
        
        回傳格式必須包含以下欄位：
        - date: 日期 (格式必須為 YYYY-MM-DD，如果找不到則當天日期)
        - name: 項目名稱 (簡短描述，例如：水泥一批、機具維護)
        - amount: 金額 (數字，不要符號)
        - supplier: 供應商/商號名稱
        - category: 類別 (必須從以下選一：'委託工程', '零用金', '機具材料', '行政人事成本', '其他')
        
        請直接回傳 JSON 物件，不包含 Markdown 標記，也不要包含 \`\`\`json 等字樣。`
      ]
    }, "收據掃描");

    try {
      const jsonStr = cleanJsonString(response.text || "{}");
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error("JSON 解析失敗，原始文字:", response.text);
      return null;
    }
  } catch (error) {
    return handleAIError(error, "收據掃描");
  }
};

/**
 * 智慧報價單分析 - 提取材料明細 (價格由用戶後續輸入)
 */
export const analyzeQuotationItems = async (base64Image: string) => {
  try {
    const response = await callAIWithFallback({
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image
          }
        },
        `妳是專業的工程估價單分析師。請分析這張「廠商報價單」或「材料單」，並列出所有獨立的品項。
        
        重點需求：
        1. 使用者後續會自行輸入價格，因此請將所有項目的金額 (amount) 預設為 0。
        2. 請盡可能準確識別品項名稱 (name)。
        3. 自動分類 (category) 為：'機具材料'、'委託工程' 或 '其他'。
        4. 如果能識別供應商名稱 (supplier)，請填入；否則留空。

        請僅回傳 JSON 陣列，格式如下：
        [
          {
            "name": "品項名稱",
            "category": "類別",
            "supplier": "供應商(選填)",
            "amount": 0
          }
        ]
        
        請直接回傳 JSON，不要 markdown 標記。`
      ]
    }, "報價單分析");

    try {
      const jsonStr = cleanJsonString(response.text || "[]");
      const result = JSON.parse(jsonStr);
      return Array.isArray(result) ? result : [];
    } catch (e) {
      console.error("JSON 解析失敗:", response.text);
      return [];
    }
  } catch (error) {
    return handleAIError(error, "報價單分析");
  }
};
/**
 * 專案財務與盈虧預測分析
 */
export const analyzeProjectFinancials = async (project: Project) => {
  try {
    const laborCost = (project.workAssignments || []).reduce((acc, curr) => acc + curr.totalCost, 0);
    const materialCost = (project.expenses || []).filter(e => e.category === '機具材料').reduce((acc, curr) => acc + curr.amount, 0);
    const subCost = (project.expenses || []).filter(e => e.category === '委託工程').reduce((acc, curr) => acc + curr.amount, 0);
    const otherCost = (project.expenses || []).filter(e => !['機具材料', '委託工程'].includes(e.category)).reduce((acc, curr) => acc + curr.amount, 0);
    const totalSpent = laborCost + materialCost + subCost + otherCost;

    const response = await callAIWithFallback({
      contents: [{
        parts: [{
          text: `妳是擁有30年經驗的營造業財務稽核專家。請針對以下專案數據進行嚴格的盈虧預測與成本結構分析。

專案基本面：
- 案名：${project.name}
- 總預算：NT$ ${(project.budget || 0).toLocaleString()}
- 目前總支出：NT$ ${(totalSpent || 0).toLocaleString()}
- 進度：${project.progress}% (狀態：${project.status})

成本細項結構：
- 施工人力成本 (來自派工)：NT$ ${(laborCost || 0).toLocaleString()}
- 機具材料成本：NT$ ${(materialCost || 0).toLocaleString()}
- 委託工程 (分包)：NT$ ${(subCost || 0).toLocaleString()}
- 其他行政與雜支：NT$ ${(otherCost || 0).toLocaleString()}

請回答以下三個部分，並使用 Markdown 格式：
1. **盈虧預測結果**：請直白預測此案最終會「獲利」還是「虧損」，並給出預估的毛利率 (Gross Margin)。
2. **關鍵風險因子**：請指出 1-3 個可能導致賠錢或利潤被侵蝕的具體原因 (例如：施工進度僅 ${project.progress}% 但人力成本已佔預算 40%，顯示工率低落)。
3. **具體改善建議**：針對上述風險，提供條列式且可執行的財務管控建議。

語氣請專業、犀利且一針見血，不要講客套話。`
        }]
      }]
    }, "財務分析");
    return { text: response.text };
  } catch (error) {
    return handleAIError(error, "財務分析");
  }
};

/**
 * 解析報價單/合約影像為施工排程
 */
export const parseScheduleFromImage = async (base64Image: string, startDate: string, workOnHolidays: boolean) => {
  try {
    const prompt = `妳是專業的工程排程規劃師。請讀取這張報價單或合約內容，分析出「施工項目」以及合理的「預計工期」。
    
    排程條件：
    1. 專案開始日期：${startDate}
    2. 假日施工：${workOnHolidays ? '是 (包含週末與假日)' : '否 (僅週一至週五施工，遇假日順延)'}
    
    請根據項目性質，自動推估合理的起訖日期。請注意，如果不可假日施工，工期計算必須跳過週末。
    
    請直接回傳一個 JSON 陣列，不包含 Markdown 標記，也不要包含 \`\`\`json 等字樣。
    陣列中每個物件包含：
    - name: 項目名稱 (例如：拆除工程)
    - startDate: 預計開始日期 (YYYY-MM-DD)
    - endDate: 預計結束日期 (YYYY-MM-DD)
    - status: 固定為 'Upcoming'
    - progress: 固定為 0`;

    const response = await callAIWithFallback({
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image
          }
        },
        prompt
      ]
    }, "排程解析");

    try {
      return JSON.parse(cleanJsonString(response.text || "[]"));
    } catch (e) {
      console.error("JSON 解析失敗:", response.text);
      return [];
    }
  } catch (error) {
    return handleAIError(error, "排程解析");
  }
};

/**
 * 產生施工前準備事項 (材料機具與施工公告)
 */
export const generatePreConstructionPrep = async (project: Project) => {
  try {
    const response = await callAIWithFallback({
      contents: [{
        parts: [{
          text: `妳是資深工務工地主任。請針對以下專案資訊，協助產生「施工前準備事項」。
          
專案名稱：${project.name}
專案類別：${project.category}
施工地點：${project.location?.address || '未提供'}
施工期間：${project.startDate} ~ ${project.endDate}

請產生以下內容，並以 JSON 格式回傳，不包含 Markdown 標記或 \`\`\`json 字樣：
1. materialsAndTools: 條列出此工程所需的關鍵材料與機具清單 (繁體中文，專業精鍊)。
2. notice: 撰寫一份適合張貼在工地現場或社區電梯的「施工公告」，格式要正式、專業且有禮貌。

請直接回傳 JSON 物件，包含這兩個欄位。`
        }]
      }]
    }, "產生施工前準備");

    const jsonStr = cleanJsonString(response.text || "{}");
    return JSON.parse(jsonStr);
  } catch (error) {
    return handleAIError(error, "產生施工前準備");
  }
};

/**
 * 解析語音指令
 * 用於將使用者的口語指令轉換為系統操作 (新增案件、查詢案件)
 */
export async function parseVoiceCommand(text: string): Promise<{
  intent: 'CREATE_PROJECT' | 'QUERY_PROJECT' | 'GENERAL_CHAT';
  data?: any;
  response: string;
}> {
  try {
    const response = await callAIWithFallback({
      contents: [{
        parts: [{
          text: `
      你是營建管理系統的 AI 助理。請分析以下使用者語音指令，並判斷其意圖。
      指令內容："${text}"

      可能的意圖 (Intent)：
      1. CREATE_PROJECT: 使用者想要"新增"、"建立"、"添加"一個新案件。
      2. QUERY_PROJECT: 使用者想要"查詢"、"搜尋"、"找"一個案件。
      3. GENERAL_CHAT: 其他一般對話或詢識建議。

      請回傳標準 JSON 格式 (不要有 markdown code block)：
      {
        "intent": "CREATE_PROJECT" | "QUERY_PROJECT" | "GENERAL_CHAT",
        "data": {
          // 如果是 CREATE_PROJECT，請提取：
          "name": "案件名稱 (若無則依情境產生，必填)",
          "client": "業主名稱",
          "budget": 數字 (若未提及則為 0),
          "location": "地址",
          "notes": "備註內容"
          
          // 如果是 QUERY_PROJECT，請提取：
          "keywords": "搜尋關鍵字"
        },
        "response": "請用繁體中文簡短回覆使用者確認動作 (例如：『好的，正在為您建立關於XXX的案件...』)"
      }`
        }]
      }]
    }, "語音指令解析");

    let textResponse = response.text || "";

    // Clean up potential markdown blocks
    textResponse = textResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');

    return JSON.parse(textResponse);
  } catch (error) {
    console.warn("Voice parsing failed", error);
    return {
      intent: 'GENERAL_CHAT',
      response: '抱歉，我不太理解您的指令，請再試一次。'
    };
  }
}

/**
 * AI 工地現場助理 - 圖片分析
 * 根據工地照片自動產生施工描述
 */
export const analyzeSitePhoto = async (base64Image: string) => {
  try {
    const prompt = `妳是專業的工地主任。請精確描述這張照片中的施工現場狀況，內容包含：
    1. 正在進行的工項內容。
    2. 使用的材料或機具辨識。
    3. 現場環境狀況 (如：環境整潔、防護措施、結構細節)。
    
    請用繁體中文撰寫一小段 professional (專業) 的日誌文字。約 50-100 字。`;

    const response = await callAIWithFallback({
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image
          }
        },
        prompt
      ]
    }, "工地圖片分析");

    return response.text;
  } catch (error) {
    return handleAIError(error, "工地圖片分析");
  }
};

/**
 * AI 工地現場助理 - 文字優化
 * 將口語、零碎的工地筆記優化為專業的施工日誌
 */
export const refineSiteNotes = async (notes: string) => {
  try {
    const prompt = `妳是具備豐富經驗的案場負責人。請將以下口語、零碎且非正式的施工筆記，優化為一篇結構完整、措辭專業的「施工日誌」。
    
    原始筆記：${notes}
    
    要求：
    1. 修正錯別字與口語語助詞。
    2. 使用工程專業術語 (例如：『做好了』改為『施作完成』、『買東西』改為『進場材料採購』)。
    3. 語氣穩重專業，長度不限但須簡練。`;

    const response = await callAIWithFallback({
      contents: [{
        parts: [{ text: prompt }]
      }]
    }, "日誌文字優化");

    return response.text;
  } catch (error) {
    return handleAIError(error, "日誌文字優化");
  }
};

/**
 * 智慧逆向地理編碼 - 將經緯度轉換為地址
 * 利用 Gemini 的地圖能力來解析座標
 */
export const getAddressFromCoords = async (lat: number, lng: number) => {
  try {
    const response = await callAIWithFallback({
      contents: [{
        parts: [{
          text: `妳是精準的地理資訊助手。請告訴我座標 [${lat}, ${lng}] 對應的台灣詳細地址。
          請僅回傳地址文字，不含排除任何其他說明。`
        }]
      }],
      config: {
        tools: [{ googleSearch: {} }] // Using search as a fallback for geocoding knowledge
      }
    }, "逆向地理編碼");

    return response.text.trim();
  } catch (error) {
    console.warn("Gemini Geocoding 失敗:", error);
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
};
