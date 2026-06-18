import { MATERIAL_TYPES } from "@/lib/materialTypes";

type MaterialTypeSelectProps = {
  id?: string;
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  required?: boolean;
};

export function MaterialTypeSelect({
  id,
  name,
  defaultValue = "link",
  value,
  onChange,
  disabled,
  required,
}: MaterialTypeSelectProps) {
  const isControlled = value !== undefined;

  return (
    <select
      id={id}
      name={name}
      {...(isControlled ? { value } : { defaultValue })}
      onChange={onChange}
      disabled={disabled}
      required={required}
    >
      {MATERIAL_TYPES.map((item) => (
        <option key={item.value} value={item.value}>
          {item.icon} {item.label}
        </option>
      ))}
    </select>
  );
}
