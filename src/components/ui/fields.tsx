import type { ReactNode } from "react";
import { cn } from "@/lib/format";
import { ui } from "@/lib/ui";
import { Icon } from "./Icon";

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[28px] font-semibold tracking-tight text-ink md:text-[32px]">{title}</h1>
        {description ? <p className="mt-1 max-w-xl text-sm leading-relaxed text-mist">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <span className={ui.label}>
      {text}
      {required ? <span className="text-primary"> *</span> : null}
    </span>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="mt-1.5 block text-xs font-medium text-rose-600">{message}</span>;
}

function Hint({ text }: { text?: ReactNode }) {
  if (!text) return null;
  return <span className="mt-1.5 block text-xs leading-relaxed text-mist">{text}</span>;
}

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
};

export function TextField({ id, label, hint, error, required, className, ...rest }: InputProps) {
  return (
    <label className="block" htmlFor={id}>
      <Label text={label} required={required} />
      <input id={id} name={id} aria-invalid={error ? true : undefined} className={cn(ui.input, error && "border-rose-400", className)} {...rest} />
      <Hint text={hint} />
      <FieldError message={error} />
    </label>
  );
}

type AreaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
};

export function TextArea({ id, label, hint, error, ...rest }: AreaProps) {
  return (
    <label className="block" htmlFor={id}>
      <Label text={label} />
      <textarea id={id} name={id} rows={4} className={cn(ui.input, "h-auto py-3", error && "border-rose-400")} {...rest} />
      <Hint text={hint} />
      <FieldError message={error} />
    </label>
  );
}

type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
  id: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  hint?: ReactNode;
  error?: string;
};

export function SelectField({ id, label, options, hint, error, required, ...rest }: SelectProps) {
  return (
    <label className="block" htmlFor={id}>
      <Label text={label} required={required} />
      <span className="relative block">
        <select id={id} name={id} className={cn(ui.input, "appearance-none pr-10", error && "border-rose-400")} {...rest}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-mist">
          <Icon name="chevron-down" />
        </span>
      </span>
      <Hint text={hint} />
      <FieldError message={error} />
    </label>
  );
}
