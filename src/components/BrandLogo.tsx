type BrandLogoProps = {
  subtitle?: string;
  compact?: boolean;
};

function BrandLogo({ subtitle = 'Премиум магазин за ракети', compact = false }: BrandLogoProps) {
  return (
    <div className={compact ? 'brand-lockup compact' : 'brand-lockup'}>
      <div className="brand-wording brand-logo-frame">
        <img
          className="brand-logo-image"
          src="/branding/logo-new.png"
          alt="Racketpoint"
          onError={(event) => {
            const target = event.currentTarget;
            if (target.src.endsWith('/branding/logo.webp')) {
              return;
            }
            target.src = '/branding/logo.webp';
          }}
        />
        <p className="brand-subtitle">{subtitle}</p>
      </div>
    </div>
  );
}

export default BrandLogo;
