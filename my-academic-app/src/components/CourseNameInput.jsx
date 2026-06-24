import { useId, useMemo } from 'react';

function CourseNameInput({
  value,
  onChange,
  suggestions = [],
  placeholder = 'שם הקורס',
  required = false,
  id: externalId,
  className = 'form-input form-input--full',
}) {
  const autoId = useId();
  const inputId = externalId || `course-name-${autoId}`;
  const listId = `${inputId}-list`;

  const filtered = useMemo(() => {
    const q = (value || '').trim().toLowerCase();
    if (!q) return suggestions;
    return suggestions.filter((name) => name.toLowerCase().includes(q));
  }, [suggestions, value]);

  return (
    <>
      <input
        id={inputId}
        className={className}
        list={listId}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete="off"
      />
      <datalist id={listId}>
        {filtered.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </>
  );
}

export default CourseNameInput;
