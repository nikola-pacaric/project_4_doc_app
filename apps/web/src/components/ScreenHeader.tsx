interface ScreenHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
}

export function ScreenHeader({ eyebrow, title, subtitle }: ScreenHeaderProps) {
  return (
    <header className="screen-header">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {subtitle ? <p className="summary">{subtitle}</p> : null}
    </header>
  );
}
