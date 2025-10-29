import React, { useState } from 'react';
import type { Recipe, AvailableIngredient } from '../types';
import { RecipeCard } from './RecipeCard';
import type { TFunction } from '../translations';

interface RecipeDisplayProps {
  recipes: Recipe[];
  availableIngredients: AvailableIngredient[];
  t: TFunction;
}

export const RecipeDisplay: React.FC<RecipeDisplayProps> = ({ recipes, availableIngredients, t }) => {
  const [servingCounts, setServingCounts] = useState<{ [key: number]: number }>(
    () => recipes.reduce((acc, _, index) => ({ ...acc, [index]: 1 }), {})
  );

  const handleServingChange = (recipeIndex: number, newCount: number) => {
    setServingCounts(prev => ({
      ...prev,
      [recipeIndex]: Math.max(1, newCount),
    }));
  };
  
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
    </div>
  );
};