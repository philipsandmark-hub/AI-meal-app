import React, { useState, useRef, useEffect } from 'react';
import type { AvailableIngredient } from '../types';
import { PlusIcon, TrashIcon, MinusIcon } from './icons';
import type { TFunction } from '../translations';


interface IngredientEditorProps {
    initialIngredients: AvailableIngredient[];
    onConfirm: (ingredients: AvailableIngredient[]) => void;
    onCancel: () => void;
    t: TFunction;
    maxIngredients: number;
}

export const IngredientEditor: React.FC<IngredientEditorProps> = ({ initialIngredients, onConfirm, onCancel, t, maxIngredients }) => {
    const [ingredients, setIngredients] = useState<AvailableIngredient[]>(initialIngredients);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const endOfListRef = useRef<HTMLDivElement>(null);
    
    const unitOptions = [
        { 
            label: t('unitGroupVolume'), 
            options: [
                { value: 'ml', label: 'ml' },
                { value: 'cl', label: 'cl' },
                { value: 'dl', label: 'dl' },
                { value: 'l', label: 'l' },
            ] 
        },
        { 
            label: t('unitGroupWeight'), 
            options: [
                { value: 'g', label: 'g' },
                { value: 'hg', label: 'hg' },
                { value: 'kg', label: 'kg' },
            ] 
        },
        { 
            label: t('unitGroupOther'), 
            options: [
                { value: 'bottle', label: t('unit_bottle') },
                { value: 'can', label: t('unit_can') },
                { value: 'container', label: t('unit_container') },
                { value: 'jar', label: t('unit_jar') },
                { value: 'package', label: t('unit_package') },
                { value: 'piece', label: t('unit_piece') },
                { value: 'pinch', label: t('unit_pinch') },
                { value: 'unit', label: t('unit_unit') },
            ] 
        },
    ];
    
    const allStandardUnits = unitOptions.flatMap(group => group.options.map(opt => opt.value));

    const handleIngredientChange = (index: number, field: keyof AvailableIngredient, value: string | number) => {
        const newIngredients = [...ingredients];
        const ingredientToUpdate = { ...newIngredients[index] };

        if (field === 'quantity') {
            const numValue = parseFloat(String(value));
            // Allow empty string for temporary state, but treat it as 0
            if (value === '' || (!isNaN(numValue) && numValue >= 0)) {
                ingredientToUpdate[field] = value === '' ? 0 : numValue;
            }
        } else {
            ingredientToUpdate[field] = value as string;
        }

        newIngredients[index] = ingredientToUpdate;
        setIngredients(newIngredients);
    };

    const handleQuantityStep = (index: number, delta: number) => {
        const currentQuantity = ingredients[index].quantity;
        const newQuantity = Math.max(0, currentQuantity + delta);
        handleIngredientChange(index, 'quantity', parseFloat(newQuantity.toFixed(2)));
    }

    const handleAddIngredient = () => {
        if (ingredients.length < maxIngredients) {
            setIngredients([...ingredients, { name: '', quantity: 1, unit: 'g' }]);
        }
    };

    const handleRemoveIngredient = (index: number) => {
        setIngredients(ingredients.filter((_, i) => i !== index));
    };

    const handleSubmit = () => {
        setIsSubmitting(true);
        const finalIngredients = ingredients.filter(ing => ing.name.trim() !== '' && ing.quantity > 0);
        onConfirm(finalIngredients);
    };

    useEffect(() => {
        endOfListRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [ingredients.length]);
    
    const hasIngredients = ingredients.filter(ing => ing.name.trim() !== '' && ing.quantity > 0).length > 0;
    const atMaxIngredients = ingredients.length >= maxIngredients;

    return (
        <div className="w-full max-w-2xl text-center p-8 bg-[--color-surface] rounded-2xl shadow-xl border border-[--color-border]">
            <h2 className="text-3xl font-bold mb-2 text-[--color-text-primary]">{t('ingredientEditorTitle')}</h2>
            <p className="text-[--color-text-secondary] mb-6">{t('ingredientEditorSubtitle')}</p>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto p-2">
                {ingredients.map((ing, index) => {
                    const isCustomUnit = ing.unit && !allStandardUnits.includes(ing.unit.toLowerCase());
                    return (
                        <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-[--color-border]">
                            <input
                                type="text"
                                value={ing.name}
                                onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                                placeholder="e.g., Eggs"
                                className="flex-grow p-2 bg-white text-[--color-text-primary] border border-[--color-border] rounded-md focus:ring-2 focus:ring-[--color-accent] focus:border-[--color-accent] outline-none transition-colors duration-200"
                                aria-label="Ingredient name"
                            />
                            <div className="flex items-center border border-[--color-border] rounded-md bg-white">
                                <button onClick={() => handleQuantityStep(index, -0.25)} className="p-2 text-[--color-text-secondary] hover:bg-[--color-border] rounded-l-md transition-colors" aria-label="Decrease quantity"><MinusIcon className="w-4 h-4"/></button>
                                <input
                                    type="number"
                                    value={ing.quantity}
                                    onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                                    step="0.1"
                                    min="0"
                                    className="w-16 p-2 text-center bg-transparent text-[--color-text-primary] border-l border-r border-[--color-border] focus:ring-2 focus:ring-[--color-accent] focus:border-[--color-accent] outline-none appearance-none [-moz-appearance:textfield]"
                                    aria-label="Ingredient quantity"
                                />
                                <button onClick={() => handleQuantityStep(index, 0.25)} className="p-2 text-[--color-text-secondary] hover:bg-[--color-border] rounded-r-md transition-colors" aria-label="Increase quantity"><PlusIcon className="w-4 h-4"/></button>
                            </div>
                            <select
                                value={ing.unit}
                                onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                                className="w-24 p-2 bg-white text-[--color-text-primary] border border-[--color-border] rounded-md focus:ring-2 focus:ring-[--color-accent] focus:border-[--color-accent] outline-none transition-colors duration-200"
                                aria-label="Ingredient unit"
                            >
                                {isCustomUnit && <option value={ing.unit}>{ing.unit}</option>}
                                {unitOptions.map(group => (
                                    <optgroup key={group.label} label={group.label}>
                                        {group.options.map(option => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                            <button 
                                onClick={() => handleRemoveIngredient(index)} 
                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors"
                                aria-label="Remove ingredient"
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    )
                })}
                <div ref={endOfListRef} />
            </div>

            {atMaxIngredients && (
                <p className="text-sm text-[--color-text-secondary] mt-4 font-semibold">{t('ingredientLimitReached', { count: maxIngredients })}</p>
            )}

            <button
                onClick={handleAddIngredient}
                disabled={atMaxIngredients}
                className="mt-4 flex items-center justify-center gap-2 w-full text-[--color-primary] font-semibold py-2 px-4 rounded-lg hover:bg-[--color-primary]/10 transition-colors duration-300 border-2 border-dashed border-[--color-border] hover:border-[--color-primary-light] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
                <PlusIcon className="w-5 h-5" />
                {t('addAnotherItem')}
            </button>

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <button
                    onClick={onCancel}
                    className="tertiary-button"
                >
                    {t('startOver')}
                </button>
                <button
                    onClick={handleSubmit}
                    className="primary-button"
                    disabled={!hasIngredients || isSubmitting}
                >
                    {isSubmitting ? t('generating') : t('findRecipes')}
                </button>
            </div>
        </div>
    );
};