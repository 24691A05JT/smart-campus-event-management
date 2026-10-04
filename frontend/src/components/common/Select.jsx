import React from 'react';

export default function Select({
  label,
  name,
  value,
  onChange,
  options = [],
  error,
  helperText,
  required = false,
  className = '',
  disabled = false,
  ...props
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={name} className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}

      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full px-4 py-3 bg-slate-950/80 border ${
          error
            ? 'border-red-500/80 focus:border-red-500 focus:ring-red-500/20'
            : 'border-slate-800 focus:border-blue-500 focus:ring-blue-500/20'
        } rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 transition duration-150 disabled:opacity-50 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3CSvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394A3B8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[right_1rem_center] bg-no-repeat`}
        {...props}
      >
        {options.map((opt) => {
          const val = typeof opt === 'object' ? opt.value : opt;
          const lbl = typeof opt === 'object' ? opt.label : opt;
          return (
            <option key={val} value={val} className="bg-slate-900 text-slate-100 py-2">
              {lbl}
            </option>
          );
        })}
      </select>

      {error && <p className="text-red-400 text-xs mt-1 font-medium">{error}</p>}
      {helperText && !error && <p className="text-slate-400 text-xs mt-1">{helperText}</p>}
    </div>
  );
}
