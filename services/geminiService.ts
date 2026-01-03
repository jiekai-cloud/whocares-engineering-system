
import { GoogleGenAI, Type } from "@google/genai";
import { Project } from "../types";

// Always use named parameter for apiKey and fetch from process.env.API_KEY
const getAI = () => {
  const key = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!key || key === 'PLACEHOLDER_API_KEY' || key === 'undefined') {
    console.error("Gemini API Key is missing or invalid. Please check your .env.local or environment variables.");
    throw new Error("Gemini API 金鑰未設定或無效。請確認環境變數 GEMINI_API_KEY 是否正確配置。");
  }
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

    const projectSummary = criticalOnes.map(p => `- ${p.name}: 狀態 ${p.status}, 進度 ${p.progress}%, 預算 ${p.budget}`).join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ parts: [{ text: `目前系統共管理 ${totalCount} 件專案，以下是經初步篩選出的 50 個潛在風險案件，請針對這些數據提供營運風險報告：\n${projectSummary}` }] }],
      config: {
        systemInstruction: `妳是「生活品質工程管理系統」的首席運籌官。
          妳的分析對象是擁有 50 名成員的大型工程團隊。
          請針對整體資源分配、專案瓶頸與報價效率提供宏觀建議。`
      }
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
      model: 'gemini-1.5-flash',
      contents: [{
        parts: [{
          text: `專案詳細資料：
名稱: ${project.name}
狀態: ${project.status}
進度: ${project.progress}%
預算: ${project.budget}
目前支出: ${project.spent}
問題內容: ${question}`
        }]
      }],
      config: {
        systemInstruction: "妳是專業的智慧營造顧問。請根據提供的單一專案數據，精確回答使用者的疑問並提出具體的改進或監控建議。"
      }
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
      model: 'gemini-1.5-flash',
      contents: [{ parts: [{ text: query }] }],
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "妳是營造法規與市場趨勢專家。請利用搜尋功能為使用者提供具備權權威來源的解答，包含最新法規更新或建材價格行情。"
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
      model: 'gemini-1.5-pro',
      contents: [{ parts: [{ text: `案名: ${project.name}, 類別: ${project.category}, 預計工期: ${project.startDate} ~ ${project.endDate}。請提供專業的施工進度節點規劃與各階段工期佔比建議。` }] }],
      config: {
        systemInstruction: "妳是具備二十年經驗的資深工務經理。妳擅長進行裝修與建築工程的排程規劃，請提供符合實務邏輯的階段劃分。"
      }
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
      `- ${m.name} (${m.role}): 負責 ${m.activeProjectsCount} 案, 狀態: ${m.status}, 專長: ${m.specialty?.join(',')}`
    ).join('\n');

    const projectSummary = projects
      .filter(p => p.status === '施工中')
      .map(p => `- ${p.name}: 進度 ${p.progress}%, 負責人: ${p.manager}`)
      .join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ parts: [{ text: `成員數據：\n${memberSummary}\n\n施工中專案：\n${projectSummary}` }] }],
      config: {
        systemInstruction: `妳是技術總監級別的 AI 管理顧問。
          妳會分析工程團隊的負載狀況。請從以下角度提供簡短精幹的分析報告：
          1. 資源分配異常：是否有人的案量過高（例如超過 5 案）？
          2. 專長匹配度：目前的施工中專案是否都有對應專長的人員在場？
          3. 潛在風險預警：哪些人可能因為過度忙碌導致品質下降？
          請使用條列式，並在文末給出一個「整體營運負載指數 (0-100)」。`
      }
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
      model: 'gemini-1.5-flash',
      contents: `在 ${address} 附近搜尋 ${resourceType}。`,
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
export const parseWorkDispatchText = async (text: string) => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ parts: [{ text: `請解析以下非結構化的施工日報內容，並提取出派工相關資訊：\n\n${text}` }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              projectId: {
                type: Type.STRING,
                description: '提及的案號或案場名稱。',
              },
              date: {
                type: Type.STRING,
                description: '派工日期 (格式: YYYY-MM-DD)。',
              },
              memberName: {
                type: Type.STRING,
                description: '出勤的人員姓名。',
              },
              description: {
                type: Type.STRING,
                description: '當日施作的具體內容描述。',
              },
            },
            required: ["projectId", "date", "memberName"],
          },
        },
        systemInstruction: "妳是專業的工務數據解析員。妳能從混亂的通訊軟體對話或手寫日報轉錄文字中，精準提取出派工數據並轉化為 JSON 格式。"
      }
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
      model: 'gemini-1.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image
          }
        },
        "請辨識這張名片上的聯絡資訊。請盡可能精確提取公司名稱、姓名、職稱、電話、Line ID、Email 與地址。"
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: '公司或客戶名稱全銜' },
            contactPerson: { type: Type.STRING, description: '聯絡人姓名' },
            occupation: { type: Type.STRING, description: '職稱或職業' },
            phone: { type: Type.STRING, description: '主要聯絡電話 (手機)' },
            landline: { type: Type.STRING, description: '室內電話或分機' },
            fax: { type: Type.STRING, description: '傳真號碼' },
            email: { type: Type.STRING, description: '電子郵件' },
            address: { type: Type.STRING, description: '地址' },
            lineId: { type: Type.STRING, description: 'Line ID' },
            taxId: { type: Type.STRING, description: '統一編號' },
            website: { type: Type.STRING, description: '官網或社交帳號' }
          }
        },
        systemInstruction: "妳是專業的商務名片數位化專家。妳能從名片照片中精準辨認各個欄位。如果某個欄位不存在或無法辨識，請回傳空字串。"
      }
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
