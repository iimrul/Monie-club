import React from 'react';

export const ClubBrand: React.FC<{ subtitle?: string }> = ({ subtitle }) => (
  <span className="club-brand">
    <span className="club-brand-copy"><span className="club-brand-name">Monie <span className="club-brand-accent">Club</span></span>{subtitle && <span className="club-brand-subtitle">{subtitle}</span>}</span>
  </span>
);
