import { GoogleGenAI, Type } from "@google/genai";
import type { AvailableIngredient, MealType, Recipe } from '../types';

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

const STABLE_RECIPE_CORE_PROMPT = `You are an expert chef AI for an app called "Fridge-to-Feast". The app's entire purpose is to prevent a trip to the grocery store by creating recipes **using only ingredients the user already has.**

**ABSOLUTE CRITICAL RULES (Alphabetical Order):**
- **CALORIE ESTIMATION:** For each recipe, provide a reasonable estimate of the total calories for a single serving. Include this as a number in the 'calories' field.
- **EMPTY ARRAY FOR NO RECIPES:** If you cannot create any meaningful recipes that strictly follow all other rules, you **MUST** return an empty JSON array: \`[]\`. This is a valid and expected response.
- **LIMITED PANTRY STAPLES:** You may assume the user has basic pantry items like salt, pepper, and vegetable oil. You can use these sparingly. Do NOT list any other items as assumed pantry staples (e.g., no mustard, no vinegar, no flour, unless they are in the provided list).
- **NO EXTERNAL INGREDIENTS:** Do **NOT** invent, add, or assume any ingredients that are not on the list. For example, if the user has eggs but not milk, you cannot suggest a recipe that requires milk.
- **RECIPE COUNT:** Generate exactly 2 diverse recipes.
- **RESPECT QUANTITIES:** The quantity of each ingredient required for a single serving in your recipe must be less than or equal to the quantity available.
- **USE ONLY AVAILABLE INGREDIENTS:** Every single ingredient in each recipe, without exception, **must** be from the list of available ingredients provided.

**OUTPUT FORMAT:**
Return the response as a valid JSON array of recipe objects. For each recipe, provide the following details:
- A catchy name ('recipeName').
- A short description ('description').
- An estimated calorie count per serving ('calories').
- A list of ingredients with the exact quantities and units for a single serving ('ingredients').
- Detailed, step-by-step instructions for a beginner cook ('instructions').`;

const creativityMap: { [key: number]: string } = {
  1: "Generate simple, traditional, and very easy-to-make recipes. Prioritize classic combinations and straightforward techniques.",
  2: "Generate recipes that are mostly traditional but might include one slightly interesting twist or combination. Keep it familiar.",
  3: "Generate recipes that balance traditional cooking with creative ideas. They should be approachable but not boring.",
  4: "Generate creative and interesting recipes. Use ingredients in less common ways and suggest more unique flavor combinations.",
  5: "Generate highly creative, unconventional, and 'out-of-the-box' recipes. Be adventurous and suggest something the user has likely never tried before."
};

export const generateMultipleRecipes = async (
  ingredients: AvailableIngredient[], 
  language: string,
  creativity: number,
  existingRecipes: Recipe[] = [],
  mealType: MealType
): Promise<Recipe[]> => {
  const ingredientsString = JSON.stringify(ingredients);

  // 1. Stable Core (defined above)
  
  // 2. Creativity Instruction
  const creativityInstruction = `\n\n**CREATIVITY LEVEL:**\n${creativityMap[creativity] || creativityMap[3]}`;

  // 3. Meal Temperature Instruction
  let mealTypeInstruction = '\n\n**MEAL TEMPERATURE:**\n';
  if (mealType.hot && mealType.cold) {
    mealTypeInstruction += 'Generate a mix of hot and cold meals.';
  } else if (mealType.hot) {
    mealTypeInstruction += 'Generate only hot meals (dishes that are cooked and served warm).';
  } else if (mealType.cold) {
    mealTypeInstruction += 'Generate only cold meals (dishes that require no cooking, like salads or cold soups, and are served cold).';
  } else {
    mealTypeInstruction += 'Generate any type of meal.'; // Fallback
  }

  // 4. Tiny Locale Note
  const tinyLocaleNote = `\n\n**RESPONSE LANGUAGE:**\nYour entire response, including all text fields ('recipeName', 'description', ingredient 'name's, 'unit's, and 'instructions'), must be fully translated into ${language}.`;
  
  // 5. Avoid Existing Recipes (if any)
  let avoidRecipesNote = '';
  if (existingRecipes.length > 0) {
    const existingRecipeNames = existingRecipes.map(r => r.recipeName).join(', ');
    avoidRecipesNote = `\n\n**IMPORTANT - AVOID DUPLICATES:**\nGenerate recipes that are distinctly different from the following already suggested recipes: [${existingRecipeNames}].`;
  }

  // 6. Per-request Content
  const perRequestContent = `\n\n**AVAILABLE INGREDIENTS (JSON):**\n${ingredientsString}`;

  const prompt = STABLE_RECIPE_CORE_PROMPT + creativityInstruction + mealTypeInstruction + tinyLocaleNote + avoidRecipesNote + perRequestContent;
  
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
            calories: { type: Type.NUMBER },
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
          required: ['recipeName', 'description', 'ingredients', 'instructions', 'calories'],
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