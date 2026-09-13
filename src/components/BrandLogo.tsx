type BrandLogoProps = {
  subtitle?: string;
  compact?: boolean;
};

function BrandLogo({ subtitle = 'Премиум магазин за ракети', compact = false }: BrandLogoProps) {
  return (
    <div className={compact ? 'brand-lockup compact' : 'brand-lockup'}>
      <div className="brand-wording brand-logo-frame">
        <span className="brand-logo-image">
          <img
            className="brand-mark"
            src="/branding/logo-icon.png"
            alt="Racketpoint"
          />
          <span className="brand-wordmark">
            Racket<span>point</span>
          </span>
        </span>
        {subtitle ? <p className="brand-subtitle">{subtitle}</p> : null}
      </div>
    </div>
  );
}

export default BrandLogo;
