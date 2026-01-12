
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, Expense, Product, ShopConfig } from "./types";

export async function analyzeNextMonthForecast(
  data: { 
    transactions: Transaction[], 
    expenses: Expense[], 
    products: Product[],
    config: ShopConfig
  }
) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const dailyTotal = data.transactions
    .filter(t => new Date(t.timestamp).toDateString() === new Date().toDateString())
    .reduce((acc, t) => acc + t.total, 0);

  const inventorySummary = data.products.map(p => ({
    name: p.name,
    stock: p.stock,
    isLow: p.stock <= p.minStock,
    margin: ((p.price - p.cost) / p.price * 100).toFixed(0) + '%'
  }));

  const prompt = `أنت الخبير الاستراتيجي لمتجر "${data.config.name}". 
إليك البيانات الحالية:
- مبيعات اليوم: ${dailyTotal} ${data.config.currency}
- حالة المخزون: ${JSON.stringify(inventorySummary)}
- عدد العمليات المسجلة: ${data.transactions.length}

المطلوب تقديم تحليل فائق الذكاء باللغة العربية:
1. توقعات السوق ليوم "غد" (Market Forecast).
2. نظرة استراتيجية للـ 30 يوماً القادمة (30-Day Outlook).
3. نصيحة إدارية فورية للمدير لتحسين التدفق المالي.

يجب أن يكون الرد بصيغة JSON حصراً.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tomorrowForecast: { type: Type.STRING },
          monthlyOutlook: { type: Type.STRING },
          managerBrief: { type: Type.STRING },
          strategicAdvices: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["tomorrowForecast", "monthlyOutlook", "managerBrief", "strategicAdvices"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("AI Analysis Error", e);
    return null;
  }
}
