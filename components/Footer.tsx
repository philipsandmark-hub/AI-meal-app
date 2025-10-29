import React from 'react';
import type { TFunction } from '../translations';

interface FooterProps {
    t: TFunction;
}

export const Footer: React.FC<FooterProps> = ({ t }) => {
  return (
    <footer className="w-full p-6 bg-[--color-bg] border-t border-[--color-border]">
      <div className="max-w-7xl mx-auto text-center text-[--color-text-secondary] text-sm">
        <p>{t('footerText')}</p>
      </div>
    </footer>
  );
};