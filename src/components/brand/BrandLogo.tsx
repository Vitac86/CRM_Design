import { cn } from '../ui/cn';

type BrandLogoVariant = 'mark' | 'full-ru' | 'full-en';
type BrandLogoTone = 'blue' | 'white';
type BrandLogoSize = 'default' | 'sidebar' | 'preview';

type BrandLogoProps = {
  variant?: BrandLogoVariant;
  tone?: BrandLogoTone;
  size?: BrandLogoSize;
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

const sizeClassMap: Record<BrandLogoSize, string> = {
  default: 'h-7 w-auto',
  sidebar: 'h-[76px] w-auto max-w-[210px]',
  preview: 'h-8 w-auto',
};

export const BrandLogo = ({ variant = 'full-ru', tone = 'blue', size = 'default', className }: BrandLogoProps) => {
  const logoSrc = logoMap[variant][tone] ?? logoMap[variant].blue ?? logoMap['full-ru'].blue;

  return (
    <img
      src={logoSrc}
      alt="Инвестика"
      className={cn('block object-contain', sizeClassMap[size], className)}
      loading="eager"
      decoding="async"
    />
  );
};
