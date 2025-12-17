import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';

// Singleton instance
let ai: GoogleGenAI | null = null;

if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
}

export const generateCommentary = async (score: number): Promise<string> => {
    if (!ai) {
        console.warn("Gemini API Key is missing. Returning default text.");
        return "System Online. Waiting for neural link...";
    }

    try {
        const model = 'gemini-2.5-flash';
        const prompt = `
            You are a cyberpunk AI announcer for a rhythm game. 
            The user currently has a score of ${score}.
            Write a SHORT, high-energy, 1-sentence comment encouraging them. 
            Use slang like "Nova", "Chrome", "Glitched", "Turbo".
            Do not use hashtags.
            Example: "Nova moves, keep that chrome shining!"
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                maxOutputTokens: 30,
                temperature: 0.9,
            }
        });

        return response.text || "Signal interrupted... keep moving!";
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Connection unstable. Override initiated.";
    }
};
