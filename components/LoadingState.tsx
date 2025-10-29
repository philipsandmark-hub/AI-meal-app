import React from 'react';
import { ChefIcon } from './icons';

interface LoadingStateProps {
  message: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8">
      <ChefIcon className="h-16 w-16 text-[--color-primary] mb-6" />
      <p className="text-xl font-semibold text-[--color-text-secondary]">{message}</p>
    </div>
  );
};