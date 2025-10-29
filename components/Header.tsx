import React from 'react';
import { LogoIcon } from './icons';
import type { TFunction } from '../translations';

interface HeaderProps {
    t: TFunction;
}

export const Header: React.FC<HeaderProps> = ({ t }) => {
  return (
    <header className="w-full p-4 bg-[--color-surface] shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto flex items-center">
        <LogoIcon className="h-10 w-10 text-[--color-primary] mr-3" />
        <h1 className="text-2xl font-bold text-[--color-text-primary]">
          {t('headerTitle')} <span className="text-[--color-primary] font-extrabold">AI</span>
        </h1>
      </div>
    </header>
  );
};