export type ThemeId = 'current' | 'investica-dark' | 'investica-light' | 'investica-command' | 'investica-private';

export type ThemeLogoVariant = 'mark' | 'full-ru' | 'full-en';

export type ThemeLogoTone = 'blue' | 'white';

export type ThemeDefinition = {
  id: ThemeId;
  name: string;
  description: string;
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  sidebar: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  accent: string;
  logoVariant: ThemeLogoVariant;
  logoTone: ThemeLogoTone;
};
