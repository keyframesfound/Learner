"use client";

type Props = {
  action: (formData: FormData) => Promise<void>;
  hidden: Record<string, string>;
  label: string;
  message: string;
  className?: string;
};

export default function ConfirmSubmit({ action, hidden, label, message, className = "danger" }: Props) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
      style={{ display: "inline" }}
    >
      {Object.entries(hidden).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <button type="submit" className={className}>{label}</button>
    </form>
  );
}
