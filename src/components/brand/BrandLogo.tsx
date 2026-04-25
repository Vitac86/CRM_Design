import { cn } from '../ui/cn';

type BrandLogoVariant = 'mark' | 'full-ru' | 'full-en';
type BrandLogoTone = 'blue' | 'white';

type BrandLogoProps = {
  variant?: BrandLogoVariant;
  tone?: BrandLogoTone;
  className?: string;
};

const logoMap: Record<BrandLogoVariant, Partial<Record<BrandLogoTone, string>>> = {
  mark: {
    blue: '/brand/investica/logo-mark-blue.svg',
    white: '/brand/investica/logo-mark-white.svg',
  },
  'full-ru': {
    blue: '/brand/investica/logo-full-ru-blue.svg',
    white: '/brand/investica/logo-full-ru-white.svg',
  },
  'full-en': {
    blue: '/brand/investica/logo-full-en-blue.svg',
  },
};

export const BrandLogo = ({ variant = 'full-ru', tone = 'blue', className }: BrandLogoProps) => {
  const logoSrc = logoMap[variant][tone] ?? logoMap[variant].blue ?? logoMap['full-ru'].blue;

  return (
    <img
      src={logoSrc}
      alt="Инвестика"
      className={cn('h-7 w-auto object-contain', className)}
      loading="eager"
      decoding="async"
    />
  );
};
