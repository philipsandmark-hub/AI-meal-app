// translations.ts

export const translations = {
  en: {
    // Header
    headerTitle: "Fridge-to-Feast",

    // Footer
    footerText: "Powered by Google Gemini. Your culinary adventure starts here.",

    // ImageUploader
    imageUploaderTitle: "What's in your fridge?",
    imageUploaderSubtitle: "Upload up to {MAX_IMAGES} photos and let our chef AI whip up a meal.",
    addPhoto: "Add Photo",
    photosLeft: "({count} left)",
    recipeLanguageLabel: "Recipe Language",
    analyzeButton: "Analyze {count} Image",
    analyzeButtonPlural: "Analyze {count} Images",

    // LoadingState
    loading_step_1: "Analyzing your ingredients...",
    loading_step_2: "Estimating quantities...",
    loading_step_3: "Creating delicious recipes...",
    loading_step_4: "Plating your virtual dishes...",
    loading_step_5: "Finalizing your feast...",

    // IngredientEditor
    ingredientEditorTitle: "Confirm Your Ingredients",
    ingredientEditorSubtitle: "We found these items. Adjust quantities, add more, or remove items as needed.",
    addAnotherItem: "Add Another Item",
    findRecipes: "Find Recipes",
    generating: "Generating...",

    // RecipeDisplay
    recipeDisplayTitle: "Your Culinary Creations",
    recipeDisplaySubtitle: "Here are a few ideas based on what's in your fridge. Adjust servings as you like.",

    // RecipeCard
    servings: "Servings",
    ingredients: "Ingredients",
    instructions: "Instructions",
    servingsInfo: "You have ingredients for",
    servingsUnit: "serving",
    servingsUnitPlural: "servings",
    buyPrefix: "Buy",
    
    // Common
    startOver: "Start Over",
    tryAgain: "Try Again",

    // Error
    errorTitle: "Oops! Something went wrong.",
    errorIdentifyIngredients: "Could not identify any ingredients.",
    errorUnexpected: "An unexpected error occurred. Please try again.",
    errorNoRecipes: "We couldn't whip up any recipes with what you have. Try adding more ingredients!",
    
    // Dynamic Translation
    translating: "Translating...",
  },
};

export type LanguageCode = string;
export type TranslationKey = keyof typeof translations.en;
export type TFunction = (key: TranslationKey, replacements?: Record<string, string | number>) => string;