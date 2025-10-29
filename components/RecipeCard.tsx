import React, { useMemo, useState } from 'react';
import type { Recipe, AvailableIngredient, ShoppingListItem } from '../types';
import { UserIcon, PlusIcon, MinusIcon, ClipboardListIcon, BookOpenIcon } from './icons';
import type { TFunction } from '../translations';


interface RecipeCardProps {
  recipe: Recipe;
  availableIngredients: AvailableIngredient[];
  servingCount: number;
  onServingChange: (newCount: number) => void;
  t: TFunction;
}

type ActiveTab = 'ingredients' | 'instructions';

// --- Helper Functions ---

const normalizeString = (str: string) => str.toLowerCase().replace(/s$/, '');

const calculateMaxServings = (recipe: Recipe, available: AvailableIngredient[]): number => {
    let maxPossible = Infinity;

    for (const recipeIng of recipe.ingredients) {
        if (recipeIng.name.toLowerCase().includes('pantry staple')) continue;
        const normalizedRecipeIngName = normalizeString(recipeIng.name);
        const availableIng = available.find(aIng => normalizeString(aIng.name) === normalizedRecipeIngName);

        if (availableIng && recipeIng.quantity > 0) {
            // This is a simplified unit check. A real-world app would need a conversion library.
            if (normalizeString(availableIng.unit) === normalizeString(recipeIng.unit)) {
                const possible = Math.floor(availableIng.quantity / recipeIng.quantity);
                if (possible < maxPossible) {
                    maxPossible = possible;
                }
            }
        } else if (!availableIng) {
            // If a non-pantry ingredient is not available at all
            return 0;
        }
    }
    // If maxPossible is still Infinity, it means all ingredients are pantry staples.
    return maxPossible === Infinity ? 10 : Math.max(0, maxPossible);
};

const calculateShoppingList = (recipe: Recipe, available: AvailableIngredient[], desiredServings: number): ShoppingListItem[] => {
    const shoppingList: ShoppingListItem[] = [];

    for (const recipeIng of recipe.ingredients) {
        if (recipeIng.name.toLowerCase().includes('pantry staple')) continue;
        const needed = recipeIng.quantity * desiredServings;
        const normalizedRecipeIngName = normalizeString(recipeIng.name);
        const availableIng = available.find(aIng => normalizeString(aIng.name) === normalizedRecipeIngName);
        
        const inFridge = (availableIng && normalizeString(availableIng.unit) === normalizeString(recipeIng.unit)) 
            ? availableIng.quantity 
            : 0;

        if (needed > inFridge) {
            shoppingList.push({
                name: recipeIng.name,
                amountToBuy: parseFloat((needed - inFridge).toFixed(2)),
                unit: recipeIng.unit,
            });
        }
    }
    return shoppingList;
};

// --- Component ---

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, availableIngredients, servingCount, onServingChange, t }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('ingredients');
  const maxServings = useMemo(() => calculateMaxServings(recipe, availableIngredients), [recipe, availableIngredients]);
  const shoppingList = useMemo(() => calculateShoppingList(recipe, availableIngredients, servingCount), [recipe, availableIngredients, servingCount]);
  
  const shoppingListMap = useMemo(() => {
    const map = new Map<string, ShoppingListItem>();
    shoppingList.forEach(item => map.set(normalizeString(item.name), item));
    return map;
  }, [shoppingList]);

  const sliderBg = `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${((Math.min(servingCount, 10) - 1) / 9) * 100}%, var(--color-border) ${((Math.min(servingCount, 10) - 1) / 9) * 100}%, var(--color-border) 100%)`;
  const servingsText = maxServings !== 1 ? t('servingsUnitPlural') : t('servingsUnit');

  const TabButton: React.FC<{tab: ActiveTab, label: string, icon: React.ReactNode}> = ({ tab, label, icon }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex-1 flex items-center justify-center gap-2 p-3 text-sm font-semibold rounded-t-lg transition-colors duration-200 border-b-2 ${
        activeTab === tab 
          ? 'border-[--color-primary] text-[--color-primary]' 
          : 'border-transparent text-[--color-text-secondary] hover:text-[--color-primary]'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="bg-[--color-surface] p-6 rounded-2xl shadow-lg border border-[--color-border] flex flex-col h-full">
      <div className="w-full h-56 mb-4 rounded-lg overflow-hidden bg-gray-200">
        {recipe.imageUrl ? (
          <img src={recipe.imageUrl} alt={recipe.recipeName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[--color-border] animate-pulse">
            <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      <h2 className="text-2xl font-bold mb-2 text-[--color-text-primary]">{recipe.recipeName}</h2>
      <p className="text-[--color-text-secondary] mb-6 text-sm italic">{recipe.description}</p>
      
      <div className="my-4 p-4 bg-gray-50 rounded-lg border border-[--color-border]">
        <label className="font-semibold text-[--color-text-primary] flex items-center mb-2">
          <UserIcon className="w-5 h-5 mr-2 text-[--color-primary]" /> {t('servings')}
        </label>
        <div className="flex items-center gap-4">
          <button onClick={() => onServingChange(Math.max(1, servingCount - 1))} className="p-1 rounded-full bg-[--color-border] hover:bg-gray-300"><MinusIcon className="w-5 h-5"/></button>
          <span className="text-lg font-bold text-[--color-primary] w-8 text-center">{servingCount}</span>
          <button onClick={() => onServingChange(servingCount + 1)} className="p-1 rounded-full bg-[--color-border] hover:bg-gray-300"><PlusIcon className="w-5 h-5"/></button>
        </div>
        <div className="relative mt-2">
          <input
            type="range"
            min="1"
            max="10" 
            value={servingCount}
            onChange={(e) => onServingChange(parseInt(e.target.value))}
            className="w-full h-2 bg-transparent rounded-lg appearance-none cursor-pointer"
            style={{ background: sliderBg }}
          />
           {maxServings > 0 && maxServings < 10 && (
            <div className={`absolute top-1/2 h-4 w-1 bg-gray-400 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none`} style={{ left: `${((maxServings - 1) / 9) * 100}%`}}>
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs bg-gray-600 text-white px-1.5 py-0.5 rounded-md">{maxServings}</span>
            </div>
           )}
          <div className="text-xs text-[--color-text-secondary] mt-2">{t('servingsInfo')} <strong className="text-[--color-primary]">{maxServings}</strong> {servingsText}.</div>
        </div>
      </div>
      
      <div className="flex-grow flex flex-col mt-4">
        <div className="flex border-b border-[--color-border]">
          <TabButton tab="ingredients" label={t('ingredients')} icon={<ClipboardListIcon className="w-5 h-5" />} />
          <TabButton tab="instructions" label={t('instructions')} icon={<BookOpenIcon className="w-5 h-5" />} />
        </div>
        <div className="py-4 flex-grow">
          {activeTab === 'ingredients' && (
            <ul className="list-disc list-inside space-y-2 text-sm text-[--color-text-secondary]">
              {recipe.ingredients.map((ing, i) => {
                const shoppingItem = shoppingListMap.get(normalizeString(ing.name));
                return (
                  <li key={i}>
                    <span className="font-semibold text-[--color-text-primary]">{parseFloat((ing.quantity * servingCount).toFixed(2))} {ing.unit}</span> {ing.name}
                    {shoppingItem && (
                      <span className="ml-2 text-[--color-accent-dark] font-semibold text-xs">
                        ({t('buyPrefix')} {shoppingItem.amountToBuy} {shoppingItem.unit})
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {activeTab === 'instructions' && (
            <ol className="list-decimal list-inside space-y-2 text-sm text-[--color-text-secondary]">
              {recipe.instructions.map((step, i) => (
                <li key={i} className="pl-2">{step}</li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
};