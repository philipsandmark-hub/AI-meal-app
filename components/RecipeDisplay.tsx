import React, { useState } from 'react';
import type { Recipe, AvailableIngredient, MealType } from '../types';
import { RecipeCard } from './RecipeCard';
import type { TFunction } from '../translations';

interface RecipeDisplayProps {
  recipes: Recipe[];
  availableIngredients: AvailableIngredient[];
  t: TFunction;
  onGenerateMore: () => void;
  onCreativityChange: (level: number) => void;
  creativityLevel: number;
  isGeneratingMore: boolean;
  mealType: MealType;
  onMealTypeChange: (type: MealType) => void;
}

export const RecipeDisplay: React.FC<RecipeDisplayProps> = ({ 
  recipes, 
  availableIngredients, 
  t, 
  onGenerateMore, 
  onCreativityChange, 
  creativityLevel, 
  isGeneratingMore,
  mealType,
  onMealTypeChange,
}) => {
  const [servingCounts, setServingCounts] = useState<{ [key: number]: number }>(
    () => recipes.reduce((acc, _, index) => ({ ...acc, [index]: 1 }), {})
  );

  const handleServingChange = (recipeIndex: number, newCount: number) => {
    setServingCounts(prev => ({
      ...prev,
      [recipeIndex]: Math.max(1, newCount),
    }));
  };
  
  const creativityLabels: { [key: number]: string } = {
    1: t('creativity_1'),
    2: t('creativity_2'),
    3: t('creativity_3'),
    4: t('creativity_4'),
    5: t('creativity_5'),
  };

  const canGenerateMore = !isGeneratingMore && (mealType.hot || mealType.cold);

  return (
    <div>
      <h1 className="text-4xl md:text-5xl font-extrabold mb-2 text-center text-[--color-text-primary]">{t('recipeDisplayTitle')}</h1>
      <p className="text-center text-[--color-text-secondary] mb-10">{t('recipeDisplaySubtitle')}</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {recipes.map((recipe, index) => (
          <RecipeCard
            key={index}
            recipe={recipe}
            availableIngredients={availableIngredients}
            servingCount={servingCounts[index] || 1}
            onServingChange={(newCount) => handleServingChange(index, newCount)}
            t={t}
          />
        ))}
      </div>

      <div className="mt-16 w-full max-w-2xl mx-auto p-6 bg-[--color-surface] rounded-2xl shadow-xl border border-[--color-border]">
          <h3 className="text-2xl font-bold text-center mb-2 text-[--color-text-primary]">{t('generateMoreTitle')}</h3>
          <p className="text-center text-sm text-[--color-text-secondary] mb-6">{t('generateMoreSubtitle')}</p>
          
          <div className="mb-6">
            <h4 className="block text-center font-semibold text-[--color-text-primary] mb-3">{t('mealTypeTitle')}</h4>
            <div className="flex justify-center gap-8">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-[--color-text-secondary]">
                    <input type="checkbox" checked={mealType.hot} onChange={() => onMealTypeChange({ ...mealType, hot: !mealType.hot })} className="custom-checkbox" />
                    {t('mealTypeHot')}
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-[--color-text-secondary]">
                    <input type="checkbox" checked={mealType.cold} onChange={() => onMealTypeChange({ ...mealType, cold: !mealType.cold })} className="custom-checkbox" />
                    {t('mealTypeCold')}
                </label>
            </div>
          </div>

          <div className="mb-4">
              <label htmlFor="creativity-slider" className="block text-center font-semibold text-[--color-primary] mb-2">{creativityLabels[creativityLevel]}</label>
              <input
                  id="creativity-slider"
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={creativityLevel}
                  onChange={(e) => onCreativityChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-[--color-border] rounded-lg appearance-none cursor-pointer"
                  style={{
                      background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${((creativityLevel - 1) / 4) * 100}%, var(--color-border) ${((creativityLevel - 1) / 4) * 100}%, var(--color-border) 100%)`
                  }}
                  aria-label="Creativity level for new recipes"
              />
              <div className="flex justify-between text-xs text-[--color-text-secondary] mt-1">
                  <span>{t('creativity_classic')}</span>
                  <span>{t('creativity_adventurous')}</span>
              </div>
          </div>
          
          {!canGenerateMore && !isGeneratingMore && <p className="text-center text-sm text-red-500 font-medium mt-4">{t('mealTypeWarning')}</p>}
          <button
              onClick={onGenerateMore}
              disabled={!canGenerateMore}
              className="primary-button mt-4"
          >
              {isGeneratingMore ? t('generatingMore') : t('generateMoreButton')}
          </button>
      </div>
    </div>
  );
};