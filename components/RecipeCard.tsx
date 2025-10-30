import React, { useMemo, useState } from 'react';
import type { Recipe, AvailableIngredient } from '../types';
import { UserIcon, PlusIcon, MinusIcon, ClipboardListIcon, BookOpenIcon, FireIcon, CopyIcon, CheckIcon } from './icons';
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

// List of common pantry staples in multiple languages to be ignored in max servings calculation
const pantryStaples = [
    'salt', 'pepper', 'oil', 'water', 'sugar', // en
    'socker', 'peppar', 'olja', 'vatten', // sv
    'salz', 'pfeffer', 'öl', 'wasser', 'zucker', // de
    'sel', 'poivre', 'huile', 'eau', 'sucre', // fr
    'sal', 'pimienta', 'aceite', 'agua', 'azúcar', // es
    'sale', 'pepe', 'olio', 'acqua', 'zucchero', // it
    'sol', 'papar', 'ulje', 'voda', 'šećer' // hr
];

const normalizeString = (str: string) => str.toLowerCase().replace(/s$/, '');

const isPantryStaple = (name: string) => {
    const normalized = normalizeString(name);
    // Use .some() for efficiency and check if the ingredient name *contains* a staple word.
    return pantryStaples.some(staple => normalized.includes(staple));
};

// A set of common "each" type units that can be treated as equivalent.
const discreteUnits = new Set(['unit', 'st', 'styck', 'piece', 'item']);

const calculateMaxServings = (recipe: Recipe, available: AvailableIngredient[]): number => {
    let maxPossible = Infinity;

    for (const recipeIng of recipe.ingredients) {
        // Skip pantry staples in the calculation, assuming user has enough.
        if (isPantryStaple(recipeIng.name)) {
            continue;
        }
        
        const normalizedRecipeIngName = normalizeString(recipeIng.name);
        const availableIng = available.find(aIng => normalizeString(aIng.name) === normalizedRecipeIngName);

        if (availableIng && recipeIng.quantity > 0) {
            const normAvailableUnit = normalizeString(availableIng.unit);
            const normRecipeUnit = normalizeString(recipeIng.unit);
            
            const unitsMatch = (normAvailableUnit === normRecipeUnit) || 
                               (discreteUnits.has(normAvailableUnit) && discreteUnits.has(normRecipeUnit));

            if (unitsMatch) {
                const possible = Math.floor(availableIng.quantity / recipeIng.quantity);
                if (possible < maxPossible) {
                    maxPossible = possible;
                }
            } else {
                 // Units don't match and aren't interchangeable discrete units.
                 // This is a strict check. For a production app, a unit conversion library would be better.
                 return 0;
            }
        } else if (!availableIng) {
            // If a non-pantry ingredient is not available at all, can't make any.
            return 0;
        }
    }
    
    // If loop completes and maxPossible is still Infinity, it means all ingredients were pantry staples.
    // Default to a high number, e.g., 20 servings. Otherwise, return the calculated max.
    return maxPossible === Infinity ? 20 : Math.max(0, maxPossible);
};


// --- Component ---

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, availableIngredients, servingCount, onServingChange, t }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('ingredients');
  const [isCopied, setIsCopied] = useState(false);
  const maxServings = useMemo(() => calculateMaxServings(recipe, availableIngredients), [recipe, availableIngredients]);
  
  // Cap serving count for UI sanity, though user can go higher to see shopping list
  const sliderMax = 20;
  const sliderValue = Math.min(servingCount, sliderMax);
  const sliderBg = `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${((sliderValue - 1) / (sliderMax - 1)) * 100}%, var(--color-border) ${((sliderValue - 1) / (sliderMax - 1)) * 100}%, var(--color-border) 100%)`;
  
  const servingsText = maxServings !== 1 ? t('servingsUnitPlural') : t('servingsUnit');
  const servingsTotalText = servingCount > 1 ? t('caloriesTotalFor_plural', { count: servingCount }) : t('caloriesTotalFor', { count: servingCount });

  const handleCopyRecipe = () => {
    const ingredientsText = recipe.ingredients.map(ing =>
        `- ${parseFloat((ing.quantity * servingCount).toFixed(2))} ${ing.unit} ${ing.name}`
    ).join('\n');

    const instructionsText = recipe.instructions.map((step, index) =>
        `${index + 1}. ${step}`
    ).join('\n');

    const fullText = `${recipe.recipeName}\n\n${t('ingredients')}:\n${ingredientsText}\n\n${t('instructions')}:\n${instructionsText}`;

    navigator.clipboard.writeText(fullText).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    }).catch(err => {
        console.error('Failed to copy recipe: ', err);
    });
  };

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
      <p className="text-[--color-text-secondary] mb-4 text-sm italic">{recipe.description}</p>
      
      {recipe.calories && (
        <div className="mb-4 flex items-center gap-4 p-3 bg-green-50/50 rounded-lg border border-green-200">
          <FireIcon className="w-6 h-6 text-[--color-accent]" />
          <div>
            <div className="font-bold text-lg text-[--color-text-primary]">{recipe.calories * servingCount} kcal</div>
            <div className="text-xs text-[--color-text-secondary]">{servingsTotalText}</div>
          </div>
          <div className="ml-auto text-right text-xs text-[--color-text-secondary]">
            ({recipe.calories} {t('caloriesPerServing')})
          </div>
        </div>
      )}

      <div className="my-2 p-4 bg-[--color-primary]/5 rounded-lg border border-[--color-primary]/20">
        <label className="font-semibold text-[--color-text-primary] flex items-center mb-2">
          <UserIcon className="w-5 h-5 mr-2 text-[--color-primary]" /> {t('servings')}
        </label>
        <div className="flex items-center gap-4">
          <button onClick={() => onServingChange(Math.max(1, servingCount - 1))} className="p-1 rounded-full bg-[--color-border] hover:bg-gray-300"><MinusIcon className="w-5 h-5"/></button>
          <span className="text-lg font-bold text-[--color-primary] w-8 text-center">{servingCount}</span>
          <button onClick={() => onServingChange(Math.min(99, servingCount + 1))} className="p-1 rounded-full bg-[--color-border] hover:bg-gray-300"><PlusIcon className="w-5 h-5"/></button>
        </div>
        <div className="relative mt-2">
          <input
            type="range"
            min="1"
            max={sliderMax}
            value={sliderValue}
            onChange={(e) => onServingChange(parseInt(e.target.value))}
            className="w-full h-2 bg-transparent rounded-lg appearance-none cursor-pointer"
            style={{ background: sliderBg }}
          />
           {maxServings > 0 && maxServings <= sliderMax && (
            <div className={`absolute top-1/2 h-4 w-1 bg-gray-400 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none`} style={{ left: `${((maxServings - 1) / (sliderMax - 1)) * 100}%`}}>
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
                  const neededForServings = ing.quantity * servingCount;
                  const normalizedRecipeIngName = normalizeString(ing.name);
                  const availableIng = availableIngredients.find(aIng => normalizeString(aIng.name) === normalizedRecipeIngName);
                  
                  let shortfall = 0;
                  if (availableIng && normalizeString(availableIng.unit) === normalizeString(ing.unit)) {
                      shortfall = Math.max(0, neededForServings - availableIng.quantity);
                  } else if (!availableIng) {
                      shortfall = neededForServings;
                  }

                  const isShort = servingCount > maxServings && shortfall > 0 && !isPantryStaple(ing.name);

                  return (
                    <li key={i}>
                      <span className={`font-semibold ${isShort ? 'text-[--color-accent-dark]' : 'text-[--color-text-primary]'}`}>{parseFloat(neededForServings.toFixed(2))} {ing.unit}</span> {ing.name}
                      {isShort && (
                        <span className="text-xs font-semibold text-[--color-accent-dark] ml-2">
                          ({t('buyPrefix')} {parseFloat(shortfall.toFixed(2))} {ing.unit})
                        </span>
                      )}
                    </li>
                  )
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
      <div className="mt-auto pt-4 border-t border-[--color-border]">
        <button
            onClick={handleCopyRecipe}
            className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-2 px-4 rounded-lg transition-colors duration-300 border-2 border-[--color-border] hover:border-[--color-primary-light] hover:bg-[--color-primary]/10 text-[--color-primary] disabled:opacity-50"
            disabled={isCopied}
        >
            {isCopied ? (
                <>
                    <CheckIcon className="w-5 h-5" />
                    {t('copyRecipeSuccess')}
                </>
            ) : (
                <>
                    <CopyIcon className="w-5 h-5" />
                    {t('copyRecipe')}
                </>
            )}
        </button>
      </div>
    </div>
  );
};