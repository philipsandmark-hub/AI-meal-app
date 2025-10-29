import { GoogleGenAI, Type } from "@google/genai";
import type { AvailableIngredient, Recipe } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

export const analyzeFridgeContents = async (imageFiles: File[]): Promise<AvailableIngredient[]> => {
  const imageParts = await Promise.all(imageFiles.map(file => fileToGenerativePart(file)));
  const prompt = `Analyze these images of a refrigerator's contents. Identify all usable food items and estimate their quantities. Return the response as a JSON array of objects, where each object has 'name', 'quantity', and 'unit'. For example: [{"name": "eggs", "quantity": 6, "unit": "unit"}, {"name": "milk", "quantity": 0.5, "unit": "gallon"}]. Be as accurate as possible with estimations.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [{ text: prompt }, ...imageParts] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            quantity: { type: Type.NUMBER },
            unit: { type: Type.STRING },
          },
          required: ['name', 'quantity', 'unit'],
        },
      }
    }
  });

  const jsonText = response.text.trim();
  try {
    return JSON.parse(jsonText);
  } catch (e) {
    console.error("Failed to parse ingredients JSON:", jsonText);
    throw new Error("Could not understand the ingredients in the image.");
  }
};

export const generateMultipleRecipes = async (ingredients: AvailableIngredient[], language: string): Promise<Recipe[]> => {
  const ingredientsString = JSON.stringify(ingredients);
  const prompt = `You are an expert chef AI for an app called "Fridge-to-Feast". Your primary and most critical function is to create delicious recipes using ONLY the ingredients a user already has. The entire purpose of the app is to avoid a trip to the grocery store.

Here is the list of available ingredients and their quantities: ${ingredientsString}.

**ABSOLUTE CRITICAL RULE:** You must generate up to 4 diverse recipes. Every single ingredient in each recipe **must** be from the list provided above. The ONLY exception is that you may assume the user has common pantry staples like salt, pepper, and oil, but do not list more than 2-3 of these. If you cannot create any meaningful recipes from the given ingredients, you MUST return an empty JSON array: []. **DO NOT, under any circumstances, invent or add ingredients that are not on the list.** For example, if the user has eggs but not milk, you cannot suggest a recipe that requires milk.

For each recipe, provide the following details in ${language}:
- A catchy name ('recipeName').
- A short description ('description').
- A list of ingredients with the exact quantities and units for a single serving ('ingredients'). Make sure the quantities are reasonable for a single serving.
- Detailed, step-by-step instructions for a beginner cook ('instructions').

Ensure all text fields in the final JSON response ('recipeName', 'description', ingredient 'name's, ingredient 'unit's, and 'instructions') are fully translated into ${language}.

Return the response as a valid JSON array of recipe objects. If no recipes can be made, return an empty array [].`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            recipeName: { type: Type.STRING },
            description: { type: Type.STRING },
            ingredients: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                },
                required: ['name', 'quantity', 'unit'],
              }
            },
            instructions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
          },
          required: ['recipeName', 'description', 'ingredients', 'instructions'],
        }
      },
    },
  });

  const jsonText = response.text.trim();
  try {
    return JSON.parse(jsonText);
  } catch (e) {
    console.error("Failed to parse recipes JSON:", jsonText);
    throw new Error("Could not generate valid recipes.");
  }
};

export const generateMealImage = async (recipeName: string, description: string): Promise<string> => {
  const prompt = `A delicious-looking, professional photograph of a finished dish: "${recipeName}". Description: "${description}". The image should be appetizing, well-lit, with a shallow depth of field, styled like a modern food blog photo. Crucially, do not include any text, letters, or words in the image. The image should only be of the food.`;
  
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '4:3',
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes = response.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    } else {
      throw new Error("No image was generated.");
    }
  } catch (error) {
    console.error(`Failed to generate image for "${recipeName}":`, error);
    throw new Error(`Could not generate an image for ${recipeName}.`);
  }
};

export const translateIngredientList = async (ingredients: AvailableIngredient[], targetLanguage: string): Promise<AvailableIngredient[]> => {
  if (!ingredients.length || targetLanguage === 'English') {
    return ingredients;
  }

  const ingredientNames = ingredients.map(ing => ing.name);
  const prompt = `Translate the following list of food ingredient names into ${targetLanguage}. Return the response as a JSON array of strings, in the same order as the input. For example, if the input is ["egg", "milk"], the output for Spanish should be ["huevo", "leche"]. Do not include any other text, explanations, or markdown formatting. Input: ${JSON.stringify(ingredientNames)}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });
    
    const jsonText = response.text.trim();
    const translatedNames = JSON.parse(jsonText);

    if (Array.isArray(translatedNames) && translatedNames.length === ingredients.length) {
      return ingredients.map((ing, index) => ({
        ...ing,
        name: translatedNames[index]
      }));
    } else {
       throw new Error("Translated list length does not match original.");
    }
  } catch (e) {
    console.error(`Failed to translate ingredient list to ${targetLanguage}:`, e);
    // Fallback: return original ingredients if translation fails
    return ingredients;
  }
};

export const translateUI = async (targetLanguage: string, englishStrings: Record<string, string>): Promise<Record<string, string>> => {
  const englishJsonString = JSON.stringify(englishStrings);
  const prompt = `Translate the string values in the following JSON object to the language "${targetLanguage}". Return only a single, valid JSON object with the exact same keys as the input. Do not add any extra text, explanations, or markdown formatting. The response MUST be only the JSON object. JSON to translate: ${englishJsonString}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text.trim();
    let jsonString = rawText;

    // The model sometimes wraps the JSON in markdown. Extract it.
    const markdownMatch = rawText.match(/```(?:json)?\n([\s\S]*?)\n```/);
    if (markdownMatch && markdownMatch[1]) {
      jsonString = markdownMatch[1].trim();
    }

    // The model might still add extraneous text before or after the JSON object.
    // Find the first '{' and the last '}' to isolate the JSON.
    const firstBrace = jsonString.indexOf('{');
    const lastBrace = jsonString.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace > firstBrace) {
      jsonString = jsonString.substring(firstBrace, lastBrace + 1);
      try {
        // Attempt to parse the cleaned-up string
        return JSON.parse(jsonString);
      } catch (e) {
        console.error("Failed to parse the extracted JSON string:", jsonString, e);
        // Fall through to the generic error if parsing the extracted string fails.
      }
    }
    
    // If we couldn't find/parse a valid JSON object, throw an error.
    console.error("Could not find a valid JSON object in the response:", rawText);
    throw new Error("Response was not in the expected JSON format.");

  } catch (error) {
    console.error(`Failed to translate UI to ${targetLanguage}:`, error);
    throw new Error(`Could not translate the app to ${targetLanguage}.`);
  }
};