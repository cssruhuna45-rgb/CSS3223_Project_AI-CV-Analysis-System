import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { fieldErrorSummary, isApiError, userMessage } from '../services/http';

/**
 * Form errors from a failed request: the server's field errors shown
 * beside their inputs, and one message above the submit button.
 *
 *   const errors = useFormErrors('register', ['name', 'email', 'password']);
 *   <input {...errors.fieldProps('email')} />
 *   <FieldError errors={errors} field="email" />
 *   <FormAlert message={errors.message} />
 *   ... catch (err) { errors.report(err, 'We couldn't create your account. Please try again.'); }
 *
 * After a failure, focus moves to the first field with an error, or to
 * the message when no field could be marked, so keyboard and screen
 * reader users land on what needs fixing.
 */
export function useFormErrors(formId, fields, { ids = {} } = {}) {
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState('');
  const [focusRequest, setFocusRequest] = useState(0);
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;

  const idsRef = useRef(ids);
  idsRef.current = ids;

  // An existing input id can be kept by naming it in `ids`.
  const inputId = useCallback((field) => idsRef.current[field] || `${formId}-${field}`, [formId]);
  const errorId = useCallback((field) => `${formId}-${field}-error`, [formId]);

  useEffect(() => {
    if (!focusRequest) return;
    const first = fieldsRef.current.find((f) => fieldErrors[f]);
    const target = first
      ? document.getElementById(inputId(first))
      : document.getElementById(`${formId}-alert`);
    if (target && typeof target.focus === 'function') target.focus();
    // Only after a report, not on every keystroke that clears an error.
  }, [focusRequest]);

  const report = useCallback((err, fallback, options) => {
    const known = fieldsRef.current;
    const placed = {};
    if (isApiError(err) && err.fieldErrors) {
      known.forEach((f) => {
        if (err.fieldErrors[f]) placed[f] = err.fieldErrors[f];
      });
    }
    const unplaced = fieldErrorSummary(err, known);
    let text;
    if (Object.keys(placed).length) {
      text = unplaced
        ? `Please correct the highlighted fields. ${unplaced}`
        : 'Please correct the highlighted fields and try again.';
    } else {
      text = unplaced || userMessage(err, fallback, options);
    }
    setFieldErrors(placed);
    setMessage(text);
    setFocusRequest((n) => n + 1);
  }, []);

  /** A check made in the browser before sending, e.g. a password rule. */
  const setField = useCallback((field, text) => {
    setFieldErrors((prev) => ({ ...prev, [field]: text }));
    setMessage('Please correct the highlighted fields and try again.');
    setFocusRequest((n) => n + 1);
  }, []);

  const clear = useCallback(() => {
    setFieldErrors({});
    setMessage('');
  }, []);

  /** Clears one field's error as the user edits it. */
  const clearField = useCallback((field) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const fieldProps = (field, hintId) => {
    const describedBy = [fieldErrors[field] ? errorId(field) : null, hintId || null]
      .filter(Boolean).join(' ');
    return {
      id: inputId(field),
      'aria-invalid': fieldErrors[field] ? true : undefined,
      'aria-describedby': describedBy || undefined,
    };
  };

  return {
    formId, fieldErrors, message, report, setField, clear, clearField, fieldProps, inputId, errorId,
  };
}

/** The error under one input, linked to it by aria-describedby. */
export function FieldError({ errors, field }) {
  const text = errors.fieldErrors[field];
  if (!text) return null;
  return (
    <p id={errors.errorId(field)} style={{
      display: 'flex', gap: 6, alignItems: 'flex-start', marginTop: 6,
      fontSize: 'var(--fs-sm)', color: 'var(--danger)', lineHeight: 'var(--lh-normal)',
    }}>
      <AlertCircle size={14} aria-hidden="true" style={{ flexShrink: 0, marginTop: 3 }} />
      <span>{text}</span>
    </p>
  );
}

/**
 * An error message for a form or a section. role="alert" announces it;
 * the icon and the word "Error" for screen readers mean it does not
 * rely on colour. It stays until the user acts again.
 */
export function FormAlert({ id, message, children, style }) {
  if (!message) return null;
  return (
    <div id={id} role="alert" tabIndex={-1} style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      background: 'color-mix(in srgb, var(--danger) 10%, transparent)',
      border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)',
      borderRadius: 10,
      padding: '12px 14px',
      fontSize: 'var(--fs-sm)',
      color: 'var(--danger)',
      lineHeight: 'var(--lh-normal)',
      ...style,
    }}>
      <AlertCircle size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        <span className="sr-only">Error: </span>
        {message}
        {children}
      </div>
    </div>
  );
}
