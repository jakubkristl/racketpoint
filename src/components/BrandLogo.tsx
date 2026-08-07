type BrandLogoProps = {
  subtitle?: string;
  compact?: boolean;
};

function BrandLogo({ subtitle = 'Racketpoint Premium Storefront', compact = false }: BrandLogoProps) {
  return (
    <div className={compact ? 'brand-lockup compact' : 'brand-lockup'}>
      <div className="brand-wording brand-logo-frame">
        <picture>
          <source srcSet="/branding/logo.webp" type="image/webp" />
          <img className="brand-logo-image" src="/branding/logo-fallback.png" alt="Racketpoint.bg Everything for Racket Sports" />
        </picture>
        <p className="brand-subtitle">{subtitle}</p>
      </div>
    </div>
  );
}

export default BrandLogo;
