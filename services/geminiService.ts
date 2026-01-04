
import { GoogleGenAI, Type } from "@google/genai";
import { Project } from "../types";

// Always use named parameter for apiKey and fetch from process.env.API_KEY
const getAI = () => {
  const savedKey = typeof window !== 'undefined' ? localStorage.getItem('GEMINI_API_KEY') : null;
  const envKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  const hardcodedKey = 'AIzaSyCrx4WHs8bKX9YI_-4guWJGZJfgmJip0mQ';

  const isInvalid = (k: string | null | undefined) => !k || k === 'PLACEHOLDER_API_KEY' || k === 'undefined' || k === '';

  // Priority: localStorage > env > hardcoded
  let key = hardcodedKey;
  if (!isInvalid(envKey)) key = envKey!;
  if (!isInvalid(savedKey)) key = savedKey!;

  if (isInvalid(key)) {
    console.error("Gemini API Key is missing or invalid.");
    throw new Error("Gemini API 金鑰未設定或無效。請點擊右上角「AI 服務」來配置金鑰。");
  }

  // Debug log (masked)
  console.log(`Using AI Key: ${key.substring(0, 8)}... (GenAI SDK - Gemini 2.0)`);

  return new GoogleGenAI({ apiKey: key });
};

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
  const ai = getAI();
  try {
    // 當專案數量龐大時，僅提取「施工中」且「進度滯後」或「報價過久」的異常件，避免 Context 爆量
    const totalCount = projects.length;
    const criticalOnes = projects
      .filter(p => (p.status === '施工中' && p.progress < 20) || (p.status === '報價中'))
      .slice(0, 50); // 採樣前 50 個高風險案件

    const projectSummary = criticalOnes.map(p => {
      const laborCost = (p.workAssignments || []).reduce((acc, curr) => acc + curr.totalCost, 0);
      const expenseCost = (p.expenses || []).reduce((acc, curr) => acc + curr.amount, 0);
      return `- ${p.name}: 狀態 ${p.status}, 進度 ${p.progress}%, 預算 ${p.budget}, 工資支出 ${laborCost}, 材料支出 ${expenseCost}`;
    }).join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
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
    });
    return { text: response.text };
  } catch (error) {
    console.error("全案場分析失敗:", error);
    throw error;
  }
};

/**
 * 針對特定專案提供深入洞察
 */
export const getProjectInsights = async (project: Project, question: string) => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
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
    });
    return { text: response.text };
  } catch (error) {
    console.error("獲取專案洞察失敗:", error);
    throw error;
  }
};

/**
 * 搜尋營造法規與市場知識 (使用 Google Search)
 */
export const searchEngineeringKnowledge = async (query: string) => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
        parts: [{
          text: `妳是營造法規與市場趨勢專家。請利用搜尋功能為使用者提供具備權權威來源的解答，包含最新法規更新或建材價格行情。

搜尋內容: ${query}`
        }]
      }],
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    // Extract grounding chunks for URLs
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const links = chunks.map((chunk: any) => ({
      title: chunk.web?.title || '參考連結',
      uri: chunk.web?.uri
    })).filter((l: any) => l.uri);

    return { text: response.text, chunks: links };
  } catch (error) {
    console.error("搜尋知識失敗:", error);
    throw error;
  }
};

/**
 * 智慧施工排程建議
 */
export const suggestProjectSchedule = async (project: Project) => {
  const ai = getAI();
  try {
    // 對於複雜推理任務使用 Pro 模型
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
        parts: [{
          text: `妳是具備二十年經驗的資深工務經理。妳擅長進行裝修與建築工程的排程規劃，請提供符合實務邏輯的階段劃分。

案名: ${project.name}, 類別: ${project.category}, 預計工期: ${project.startDate} ~ ${project.endDate}。
請提供專業的施工進度節點規劃與各階段工期佔比建議。`
        }]
      }]
    });
    return { text: response.text };
  } catch (error) {
    console.error("排程建議失敗:", error);
    throw error;
  }
};

/**
 * 團隊資源負載分析 - 診斷人員壓力與瓶頸
 */
export const getTeamLoadAnalysis = async (members: any[], projects: Project[]) => {
  const ai = getAI();
  try {
    const memberSummary = members.map(m =>
      `- ${m.name}${m.nicknames?.length ? ` (外號: ${m.nicknames.join(', ')})` : ''} (${m.role}): 負責 ${m.activeProjectsCount} 案, 狀態: ${m.status}, 專長: ${m.specialty?.join(',')}`
    ).join('\n');

    const projectSummary = projects
      .filter(p => p.status === '施工中')
      .map(p => `- ${p.name}: 進度 ${p.progress}%, 負責人: ${p.manager}`)
      .join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
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
    });
    return { text: response.text };
  } catch (error) {
    console.error("團隊負載分析失敗:", error);
    throw error;
  }
};

/**
 * 搜尋案場附近資源 (使用 Google Maps)
 */
export const searchNearbyResources = async (address: string, lat: number, lng: number, resourceType: string) => {
  const ai = getAI();
  try {
    // 地圖服務僅支援 Gemini 2.5 系列模型
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
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
    });

    // 根據規範，必須提取 groundingChunks 中的地圖連結
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const links = chunks.map((chunk: any) => ({
      title: chunk.maps?.title || '地點資訊',
      uri: chunk.maps?.uri
    })).filter((l: any) => l.uri);

    return { text: response.text, links };
  } catch (error) {
    console.error("案場資源搜尋失敗:", error);
    throw error;
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

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
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
    });
    const jsonStr = cleanJsonString(response.text || "[]");
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("日報解析失敗:", error);
    return [];
  }
};

/**
 * 智慧名片辨識 - 提取聯絡資訊
 */
export const scanBusinessCard = async (base64Image: string) => {
  const ai = getAI();
  try {
    // 使用具備視覺能力的模型
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image
          }
        },
        "妳是專業的商務名片數位化專家。妳能從名片照片中精準辨認各個欄位。請辨識這張名片上的聯絡資訊。請僅回傳 JSON 格式數據，包含姓名、公司、職稱、電話、Email、地址、Line ID 等。如果某個欄位不存在，請回傳空字串。"
      ]
    });

    try {
      return JSON.parse(response.text || "{}");
    } catch (e) {
      console.error("JSON 解析失敗，原始文字:", response.text);
      return {};
    }
  } catch (error) {
    console.error("名片掃描失敗:", error);
    throw error;
  }
};

/**
 * 智慧發票收據辨識 - 提取支出資訊
 */
export const scanReceipt = async (base64Image: string) => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
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
    });

    try {
      const jsonStr = cleanJsonString(response.text || "{}");
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error("JSON 解析失敗，原始文字:", response.text);
      return null;
    }
  } catch (error) {
    console.error("收據掃描失敗:", error);
    throw error;
  }
};
/**
 * 專案財務與盈虧預測分析
 */
export const analyzeProjectFinancials = async (project: Project) => {
  const ai = getAI();
  try {
    const laborCost = (project.workAssignments || []).reduce((acc, curr) => acc + curr.totalCost, 0);
    const materialCost = (project.expenses || []).filter(e => e.category === '機具材料').reduce((acc, curr) => acc + curr.amount, 0);
    const subCost = (project.expenses || []).filter(e => e.category === '委託工程').reduce((acc, curr) => acc + curr.amount, 0);
    const otherCost = (project.expenses || []).filter(e => !['機具材料', '委託工程'].includes(e.category)).reduce((acc, curr) => acc + curr.amount, 0);
    const totalSpent = laborCost + materialCost + subCost + otherCost;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
        parts: [{
          text: `妳是擁有30年經驗的營造業財務稽核專家。請針對以下專案數據進行嚴格的盈虧預測與成本結構分析。

專案基本面：
- 案名：${project.name}
- 總預算：NT$ ${project.budget.toLocaleString()}
- 目前總支出：NT$ ${totalSpent.toLocaleString()}
- 進度：${project.progress}% (狀態：${project.status})

成本細項結構：
- 施工人力成本 (來自派工)：NT$ ${laborCost.toLocaleString()}
- 機具材料成本：NT$ ${materialCost.toLocaleString()}
- 委託工程 (分包)：NT$ ${subCost.toLocaleString()}
- 其他行政與雜支：NT$ ${otherCost.toLocaleString()}

請回答以下三個部分，並使用 Markdown 格式：
1. **盈虧預測結果**：請直白預測此案最終會「獲利」還是「虧損」，並給出預估的毛利率 (Gross Margin)。
2. **關鍵風險因子**：請指出 1-3 個可能導致賠錢或利潤被侵蝕的具體原因 (例如：施工進度僅 ${project.progress}% 但人力成本已佔預算 40%，顯示工率低落)。
3. **具體改善建議**：針對上述風險，提供條列式且可執行的財務管控建議。

語氣請專業、犀利且一針見血，不要講客套話。`
        }]
      }]
    });
    return { text: response.text };
  } catch (error) {
    console.error("財務分析失敗:", error);
    throw error;
  }
};

/**
 * 解析報價單/合約影像為施工排程
 */
export const parseScheduleFromImage = async (base64Image: string, startDate: string, workOnHolidays: boolean) => {
  const ai = getAI();
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

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image
          }
        },
        prompt
      ]
    });

    try {
      return JSON.parse(cleanJsonString(response.text || "[]"));
    } catch (e) {
      console.error("JSON 解析失敗:", response.text);
      return [];
    }
  } catch (error) {
    console.error("排程解析失敗:", error);
    throw error;
  }
};

/**
 * 產生施工前準備事項 (材料機具與施工公告)
 */
export const generatePreConstructionPrep = async (project: Project) => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
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
    });

    const jsonStr = cleanJsonString(response.text || "{}");
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("產生施工前準備失敗:", error);
    throw error;
  }
};
