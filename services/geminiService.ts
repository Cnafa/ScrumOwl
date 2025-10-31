
import { GoogleGenAI } from "@google/genai";

// Ensure the API key is available in the environment variables
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // In a real app, you might want to handle this more gracefully.
  // For this context, we assume the key is set.
  console.warn("API_KEY environment variable not set. Gemini API calls will fail.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

/**
 * Generates a concise summary for a work item using the Gemini API.
 * @param title - The title of the work item.
 * @param description - The description of the work item.
 * @returns A promise that resolves to the generated summary text.
 */
export const generateSummary = async (title: string, description: string): Promise<string> => {
  if (!API_KEY) {
    throw new Error("Gemini API key is not configured.");
  }
  
  const prompt = `Based on the following title and description of a work item, please write a concise summary of 50 words or less, suitable for a quick overview. Do not use markdown.

Title: "${title}"

Description: "${description}"

Summary:`;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    
    // Using the recommended .text property to extract the text
    const summaryText = response.text;
    if (!summaryText) {
      throw new Error("Received an empty response from the API.");
    }
    
    return summaryText.trim();
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    // Provide a more user-friendly error message
    throw new Error("Failed to generate summary due to an API error.");
  }
};
