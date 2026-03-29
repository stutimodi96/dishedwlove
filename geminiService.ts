import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const geminiService = {
  async generateMarketingCopy(type: 'whatsapp' | 'instagram', details: string) {
    const model = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a marketing pro for "Dished with Love", a home bakery by Rashmi Modi. 
      The bakery only makes veg, eggless items including pizza, bread, korean cheese buns, cakes, tarts.
      Generate a ${type} post/message based on these details: ${details}.
      Make it warm, inviting, and professional. Use emojis.`,
    });
    const response = await model;
    return response.text;
  },

  async generateGrowthStrategy(currentStatus: string) {
    const model = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a business growth consultant for "Dished with Love", a home bakery by Rashmi Modi.
      The bakery only makes veg, eggless items including pizza, bread, korean cheese buns, cakes, tarts.
      Current status: ${currentStatus}.
      Provide 3 actionable growth strategies.`,
    });
    const response = await model;
    return response.text;
  },

  async planPricing(itemDetails: string) {
    const model = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are an accounting and pricing expert for a home bakery.
      Item details: ${itemDetails}.
      Help calculate a fair price considering ingredients, time, and market value.
      Provide a breakdown.`,
    });
    const response = await model;
    return response.text;
  },

  async processVoiceCommand(transcript: string) {
    const model = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract structured data from this voice transcript for a home bakery ledger: "${transcript}".
      The output must be a JSON object with fields: product, customer, price, quantity.
      If any field is missing, use null.
      Example: "Sold 2 cakes to Rahul for 500 each" -> { "product": "cake", "customer": "Rahul", "price": 500, "quantity": 2 }`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            product: { type: Type.STRING },
            customer: { type: Type.STRING },
            price: { type: Type.NUMBER },
            quantity: { type: Type.NUMBER }
          }
        }
      }
    });
    const response = await model;
    return JSON.parse(response.text);
  }
};
