interface StepHeaderProps {
  title: string;
  subtitle?: string;
}

export function StepHeader({ title, subtitle }: StepHeaderProps) {
  return (
    <header className="mb-8 text-center">
      <h2 className="text-2xl sm:text-3xl font-semibold text-ink mb-2">{title}</h2>
      {subtitle && <p className="text-ink-soft">{subtitle}</p>}
    </header>
  );
}
