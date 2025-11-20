'use client';

import { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

interface BaseInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  className?: string;
}

type InputProps = BaseInputProps & InputHTMLAttributes<HTMLInputElement> & {
  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'time' | 'datetime-local';
};

type TextareaProps = BaseInputProps & TextareaHTMLAttributes<HTMLTextAreaElement> & {
  type: 'textarea';
};

type FormInputProps = InputProps | TextareaProps;

export function FormInput({
  label,
  error,
  helperText,
  required,
  className = '',
  type = 'text',
  ...props
}: FormInputProps) {
  const hasError = !!error;
  
  const baseInputClasses = `
    w-full px-3 py-2 border rounded-md text-sm
    focus:outline-none focus:ring-2 transition-colors
    disabled:bg-gray-100 disabled:cursor-not-allowed
    ${hasError 
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
    }
    ${className}
  `;

  const renderInput = () => {
    if (type === 'textarea') {
      const textareaProps = props as TextareaHTMLAttributes<HTMLTextAreaElement>;
      return (
        <textarea
          {...textareaProps}
          className={baseInputClasses}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined
          }
        />
      );
    }

    const inputProps = props as InputHTMLAttributes<HTMLInputElement>;
    return (
      <input
        {...inputProps}
        type={type}
        className={baseInputClasses}
        aria-invalid={hasError}
        aria-describedby={
          hasError ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined
        }
      />
    );
  };

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={props.id}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {renderInput()}
        
        {hasError && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
          </div>
        )}
      </div>

      {hasError && (
        <p
          id={`${props.id}-error`}
          className="mt-1 text-sm text-red-600 flex items-center gap-1"
        >
          {error}
        </p>
      )}

      {!hasError && helperText && (
        <p
          id={`${props.id}-helper`}
          className="mt-1 text-sm text-gray-500"
        >
          {helperText}
        </p>
      )}
    </div>
  );
}

// Select component
interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends BaseInputProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
}

export function FormSelect({
  label,
  error,
  helperText,
  required,
  className = '',
  options,
  value,
  onChange,
  placeholder,
  ...props
}: SelectProps) {
  const hasError = !!error;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={props.id}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <select
        {...props}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={`
          w-full px-3 py-2 border rounded-md text-sm
          focus:outline-none focus:ring-2 transition-colors
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${hasError 
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
          }
          ${className}
        `}
        aria-invalid={hasError}
        aria-describedby={
          hasError ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined
        }
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {hasError && (
        <p
          id={`${props.id}-error`}
          className="mt-1 text-sm text-red-600"
        >
          {error}
        </p>
      )}

      {!hasError && helperText && (
        <p
          id={`${props.id}-helper`}
          className="mt-1 text-sm text-gray-500"
        >
          {helperText}
        </p>
      )}
    </div>
  );
}
