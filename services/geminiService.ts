
import { GoogleGenAI, Type } from '@google/genai';
import type { Answer, LaptopRecommendation } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: {
          type: Type.STRING,
          description: 'A plausible, specific laptop model name (e.g., "Dell XPS 15 (9530)", "Apple MacBook Air (M3)").'
        },
        specs: {
          type: Type.OBJECT,
          properties: {
            processor: { type: Type.STRING },
            ram: { type: Type.STRING },
            storage: { type: Type.STRING },
            graphics: { type: Type.STRING }
          },
          required: ['processor', 'ram', 'storage', 'graphics']
        },
        description: {
          type: Type.STRING,
          description: "A brief description (2-3 sentences) explaining why it's a good fit for the user."
        },
        matchPercentage: {
          type: Type.INTEGER,
          description: "A number from 0 to 100 indicating how well it aligns with the user's answers."
        }
      },
      required: ['name', 'specs', 'description', 'matchPercentage']
    }
};

const buildPrompt = (answers: Answer[]): string => {
  const answersText = answers.map(a => `- ${a.question}: ${a.answer}`).join('\n');
  return `
    Based on the following user answers to a laptop quiz, please recommend 4 distinct laptops from different brands if possible.

    User's Answers:
    ${answersText}

    For each recommendation, provide the requested details. Ensure the match percentage accurately reflects how well the laptop's features and price align with *all* of the user's answers. The recommendations should be sorted in descending order of the match percentage.
    
    Return your response as a JSON array that adheres to the provided schema.
  `;
};

export const getLaptopRecommendations = async (answers: Answer[]): Promise<LaptopRecommendation[]> => {
  const prompt = buildPrompt(answers);

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: responseSchema,
            temperature: 0.5,
        },
    });

    const jsonText = response.text.trim();
    const recommendations = JSON.parse(jsonText) as LaptopRecommendation[];

    if (!Array.isArray(recommendations)) {
        throw new Error("API did not return a valid array of recommendations.");
    }

    return recommendations;

  } catch (error) {
    console.error("Error fetching laptop recommendations:", error);
    throw new Error("Failed to get recommendations from the AI model.");
  }
};
