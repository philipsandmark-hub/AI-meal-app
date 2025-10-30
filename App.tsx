import React, { useState, useCallback, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { RecipeDisplay } from './components/RecipeDisplay';
import { LoadingState } from './components/LoadingState';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import * as geminiService from './services/geminiService';
import type { Recipe, AvailableIngredient, MealType } from './types';
import { IngredientEditor } from './components/IngredientEditor';
import { useTranslation } from './useTranslation';
import { supportedLanguages } from './languages';
import { translations } from './translations';
import type { LanguageCode } from './translations';

type AppState = 'initial' | 'loading' | 'confirming_ingredients' | 'results' | 'error';
const MAX_INGREDIENTS = 50;

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('initial');
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [availableIngredients, setAvailableIngredients] = useState<AvailableIngredient[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [allTranslations] = useState(translations);

  const [creativityLevel, setCreativityLevel] = useState(3);
  const [mealType, setMealType] = useState<MealType>({ hot: true, cold: true });
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);

  const { t } = useTranslation(language, allTranslations);

  const loadingSteps = [
    t('loading_step_1'),
    t('loading_step_2'),
    t('loading_step_3'),
    t('loading_step_4'),
    t('loading_step_5'),
  ];
  
  useEffect(() => {
    setLoadingMessage(loadingSteps[0]);
  }, [JSON.stringify(loadingSteps)]);


  const handleLanguageChange = useCallback((newLangCode: LanguageCode) => {
    if (newLangCode === language) return;
    setLanguage(newLangCode);
  }, [language]);

  const handleImageAnalysis = useCallback(async (imageFiles: File[]) => {
    setAppState('loading');
    setError(null);
    setLoadingMessage(loadingSteps[0]);

    try {
      const ingredients = (await geminiService.analyzeFridgeContents(imageFiles)).slice(0, MAX_INGREDIENTS);
      if (!ingredients || ingredients.length === 0) throw new Error(t('errorIdentifyIngredients'));

      const languageName = supportedLanguages.find(lang => lang.code === language)?.name || 'English';
      let finalIngredients = ingredients;

      if (languageName !== 'English') {
          finalIngredients = await geminiService.translateIngredientList(ingredients, languageName);
      }
      
      setAvailableIngredients(finalIngredients);
      setAppState('confirming_ingredients');
    } catch (err: any) {
      console.error("Error during ingredient analysis:", err);
      setError(err.message || t('errorUnexpected'));
      setAppState('error');
    }
  }, [t, loadingSteps, language]);

  const handleRecipeGeneration = useCallback(async (confirmedIngredients: AvailableIngredient[]) => {
    setAppState('loading');
    setError(null);
    setAvailableIngredients(confirmedIngredients);
    const languageName = supportedLanguages.find(lang => lang.code === language)?.name || 'English';

    try {
      // Step 2: Generate initial recipes
      setLoadingMessage(loadingSteps[2]);
      const recipeResults = await geminiService.generateMultipleRecipes(confirmedIngredients, languageName, 3, [], { hot: true, cold: true });

      // Defensively filter recipes to ensure they only use available ingredients
      const normalizeString = (str: string) => str.toLowerCase().replace(/s$/, '');
      const pantryStaples = ['salt', 'pepper', 'oil', 'water'];

      const filteredRecipes = recipeResults.filter(recipe => {
        return recipe.ingredients.every(recipeIng => {
          const normalizedRecipeIngName = normalizeString(recipeIng.name);
          
          if (pantryStaples.some(staple => normalizedRecipeIngName.includes(staple))) {
            return true;
          }

          return confirmedIngredients.some(availableIng => 
            normalizeString(availableIng.name) === normalizedRecipeIngName
          );
        });
      });

      if (!filteredRecipes || filteredRecipes.length === 0) {
        throw new Error(t('errorNoRecipes'));
      }

      setRecipes(filteredRecipes);

      // Step 3 & 4: Generate images
      setLoadingMessage(loadingSteps[3]);
      const recipesToUpdate = [...filteredRecipes];
      for (let i = 0; i < recipesToUpdate.length; i++) {
        try {
          const imageUrl = await geminiService.generateMealImage(
            recipesToUpdate[i].recipeName,
            recipesToUpdate[i].description
          );
          recipesToUpdate[i] = { ...recipesToUpdate[i], imageUrl };
          setRecipes([...recipesToUpdate]);
        } catch (imageError) {
          console.warn(`Could not generate image for "${recipesToUpdate[i].recipeName}".`);
        }
        
        if (i < recipesToUpdate.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      setLoadingMessage(loadingSteps[4]);
      setTimeout(() => {
        setAppState('results');
      }, 500);

    } catch (err: any) {
      console.error("Error during recipe generation:", err);
      setError(err.message || t('errorUnexpected'));
      setAppState('error');
    }
  }, [language, t, loadingSteps]);

  const handleGenerateMoreRecipes = useCallback(async () => {
    if (!availableIngredients || !recipes) return;
    setIsGeneratingMore(true);
    setError(null);
    const languageName = supportedLanguages.find(lang => lang.code === language)?.name || 'English';

    try {
        const newRecipeResults = await geminiService.generateMultipleRecipes(
            availableIngredients,
            languageName,
            creativityLevel,
            recipes,
            mealType
        );

        const normalizeString = (str: string) => str.toLowerCase().replace(/s$/, '');
        const pantryStaples = ['salt', 'pepper', 'oil', 'water'];

        const filteredNewRecipes = newRecipeResults.filter(recipe => {
            return recipe.ingredients.every(recipeIng => {
                const normalizedRecipeIngName = normalizeString(recipeIng.name);
                if (pantryStaples.some(staple => normalizedRecipeIngName.includes(staple))) {
                    return true;
                }
                return availableIngredients.some(availableIng => 
                    normalizeString(availableIng.name) === normalizedRecipeIngName
                );
            });
        });

        if (!filteredNewRecipes || filteredNewRecipes.length === 0) {
            console.warn("No new distinct recipes could be generated.");
            // Here you could set a toast notification message
            setIsGeneratingMore(false);
            return;
        }

        const combinedRecipes = [...recipes, ...filteredNewRecipes];
        setRecipes(combinedRecipes);

        const recipesToUpdate = [...combinedRecipes];
        for (let i = recipes.length; i < recipesToUpdate.length; i++) {
            try {
                const imageUrl = await geminiService.generateMealImage(
                    recipesToUpdate[i].recipeName,
                    recipesToUpdate[i].description
                );
                recipesToUpdate[i] = { ...recipesToUpdate[i], imageUrl };
                setRecipes([...recipesToUpdate]);
            } catch (imageError) {
                console.warn(`Could not generate image for "${recipesToUpdate[i].recipeName}".`);
            }
            if (i < recipesToUpdate.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        }
    } catch (err: any) {
        console.error("Error generating more recipes:", err);
        // Set a small error message on the component itself rather than a full page error
    } finally {
        setIsGeneratingMore(false);
    }
  }, [availableIngredients, recipes, creativityLevel, language, t, mealType]);

  const handleReset = () => {
    setAppState('initial');
    setRecipes(null);
    setAvailableIngredients(null);
    setError(null);
  };

  const renderContent = () => {
    switch (appState) {
      case 'loading':
        return <LoadingState message={loadingMessage} />;
      case 'confirming_ingredients':
        return (
          availableIngredients && <IngredientEditor 
            initialIngredients={availableIngredients} 
            onConfirm={handleRecipeGeneration} 
            onCancel={handleReset} 
            t={t}
            maxIngredients={MAX_INGREDIENTS}
          />
        );
      case 'results':
        return (
          <div className="w-full max-w-7xl mx-auto">
            {recipes && availableIngredients && (
              <RecipeDisplay 
                recipes={recipes} 
                availableIngredients={availableIngredients} 
                t={t}
                creativityLevel={creativityLevel}
                onCreativityChange={setCreativityLevel}
                isGeneratingMore={isGeneratingMore}
                onGenerateMore={handleGenerateMoreRecipes}
                mealType={mealType}
                onMealTypeChange={setMealType}
              />
            )}
            <button
              onClick={handleReset}
              className="mt-12 w-full max-w-xs mx-auto block secondary-button"
            >
              {t('startOver')}
            </button>
          </div>
        );
      case 'error':
        return (
          <div className="text-center bg-[--color-surface] p-8 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold text-red-600 mb-4">{t('errorTitle')}</h2>
            <p className="text-[--color-text-secondary] bg-red-50 p-4 rounded-lg">{error}</p>
            <button
              onClick={handleReset}
              className="mt-8 primary-button"
            >
              {t('tryAgain')}
            </button>
          </div>
        );
      case 'initial':
      default:
        return <ImageUploader 
                  onImageUpload={handleImageAnalysis} 
                  onLanguageChange={handleLanguageChange}
                  selectedLanguage={language}
                  t={t}
                />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[--color-bg]">
      <Header t={t} />
      <main className="flex-grow w-full p-4 md:p-8">
        <div className="flex items-center justify-center w-full">
          {renderContent()}
        </div>
      </main>
      <Footer t={t} />
    </div>
  );
};

export default App;