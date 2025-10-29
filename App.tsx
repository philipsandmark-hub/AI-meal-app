import React, { useState, useCallback, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { RecipeDisplay } from './components/RecipeDisplay';
import { LoadingState } from './components/LoadingState';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import * as geminiService from './services/geminiService';
import type { Recipe, AvailableIngredient } from './types';
import { IngredientEditor } from './components/IngredientEditor';
import { useTranslation } from './useTranslation';
import { supportedLanguages } from './languages';
import { translations } from './translations';
import type { LanguageCode } from './translations';

type AppState = 'initial' | 'loading' | 'confirming_ingredients' | 'results' | 'error';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('initial');
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [availableIngredients, setAvailableIngredients] = useState<AvailableIngredient[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [allTranslations, setAllTranslations] = useState(translations);
  const [isTranslating, setIsTranslating] = useState(false);

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


  const handleLanguageChange = useCallback(async (newLangCode: LanguageCode) => {
    if (newLangCode === language) return;

    // If translations are already cached, just switch the language
    if (allTranslations[newLangCode]) {
      setLanguage(newLangCode);
      return;
    }

    setIsTranslating(true);
    setError(null);

    try {
      const languageName = supportedLanguages.find(lang => lang.code === newLangCode)?.name;
      if (!languageName) {
        throw new Error(`Language ${newLangCode} not supported.`);
      }
      
      const newStrings = await geminiService.translateUI(languageName, allTranslations.en);
      
      setAllTranslations(prev => ({
        ...prev,
        [newLangCode]: newStrings,
      }));
      setLanguage(newLangCode);

    } catch (err: any) {
      console.error("Error translating UI:", err);
      // Fallback to the previous language without showing an error to the user
    } finally {
      setIsTranslating(false);
    }
  }, [language, allTranslations]);

  const handleImageAnalysis = useCallback(async (imageFiles: File[]) => {
    setAppState('loading');
    setError(null);
    setLoadingMessage(loadingSteps[0]);

    try {
      const ingredients = await geminiService.analyzeFridgeContents(imageFiles);
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
      // Step 2: Generate multiple recipes
      setLoadingMessage(loadingSteps[2]);
      const recipeResults = await geminiService.generateMultipleRecipes(confirmedIngredients, languageName);

      if (!recipeResults || recipeResults.length === 0) {
        throw new Error(t('errorNoRecipes'));
      }

      setRecipes(recipeResults); // Set text-only recipes first for faster perceived load

      // Step 3 & 4: Generate images sequentially to avoid rate limiting and update state progressively
      setLoadingMessage(loadingSteps[3]);
      const recipesToUpdate = [...recipeResults];
      for (let i = 0; i < recipesToUpdate.length; i++) {
        try {
          const imageUrl = await geminiService.generateMealImage(
            recipesToUpdate[i].recipeName,
            recipesToUpdate[i].description
          );
          recipesToUpdate[i] = { ...recipesToUpdate[i], imageUrl };
          // Update state progressively so user sees images as they load
          setRecipes([...recipesToUpdate]);
        } catch (imageError) {
          console.warn(
            `Could not generate image for "${recipesToUpdate[i].recipeName}". Displaying recipe without image.`,
            imageError
          );
          // Don't throw; just continue to the next image. The recipe card will show a placeholder.
        }
        
        // Add a delay to prevent hitting API rate limits, even with sequential requests.
        if (i < recipesToUpdate.length - 1) { // No need to wait after the last one.
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
          />
        );
      case 'results':
        return (
          <div className="w-full max-w-7xl mx-auto">
            {recipes && availableIngredients && (
              <RecipeDisplay recipes={recipes} availableIngredients={availableIngredients} t={t} />
            )}
            <button
              onClick={handleReset}
              className="mt-12 w-full max-w-xs mx-auto block primary-button"
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
       {isTranslating && (
        <div className="fixed inset-0 bg-white bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300">
          <div className="text-lg font-semibold text-[--color-text-primary]">{t('translating')}</div>
        </div>
      )}
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