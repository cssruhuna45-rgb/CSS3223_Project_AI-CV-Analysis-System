import React, { useState, useRef, useEffect, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

import { searchNavigation } from '../constants/navigation';

/**
 * Jump to a page by name.
 *
 * <p>This searches the navigation, not the data. It is given the same
 * role-filtered list the sidebar renders, so it can only ever move to
 * a page the signed-in account could already have clicked - it opens
 * no door the sidebar keeps shut, and it reaches no other role's
 * screens.
 *
 * <p>There is no search endpoint behind it. The placeholder says
 * "Find a page" rather than "Search anything" for that reason: a box
 * that implies it will search CVs and then quietly does not is worse
 * than a narrower box that does exactly what it says.
 *
 * <p>Built as a combobox with a listbox popup: arrow keys move the
 * active option, Enter opens it, Escape closes the list and leaves the
 * text, and aria-activedescendant keeps the focus in the input so what
 * a screen reader announces matches what the eye follows.
 */
export default function PageSearch({ navItems }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const listId = useId();
  const optionId = (index) => `${listId}-option-${index}`;

  const results = searchNavigation(navItems, query);

  // Keep the highlight inside the result list as it shrinks while
  // typing, otherwise Enter can point past the end of it.
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const go = (item) => {
    if (!item) return;

    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
    navigate(item.path);
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      // Closes the list but keeps what was typed: Escape here means
      // "stop suggesting", not "throw away my work".
      setOpen(false);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();

      if (!open) {
        setOpen(true);
        return;
      }

      if (!results.length) return;

      setActiveIndex((current) => {
        const next = event.key === 'ArrowDown' ? current + 1 : current - 1;
        return (next + results.length) % results.length;
      });
      return;
    }

    if (event.key === 'Enter' && open) {
      event.preventDefault();
      go(results[activeIndex]);
    }
  };

  if (!navItems.length) return null;

  return (
    <div className="page-search" ref={wrapperRef}>
      <Search size={16} className="page-search-icon" aria-hidden="true" />

      <input
        ref={inputRef}
        type="text"
        className="page-search-input"
        value={query}
        placeholder="Find a page"
        aria-label="Find a page"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && results.length ? optionId(activeIndex) : undefined
        }
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />

      {open && (
        <ul className="page-search-results" id={listId} role="listbox" aria-label="Pages">
          {results.length === 0 ? (
            <li className="page-search-empty" role="option" aria-disabled="true" aria-selected="false">
              No matching pages
            </li>
          ) : (
            results.map((item, index) => {
              const Icon = item.icon;
              const active = index === activeIndex;

              return (
                <li
                  key={item.path}
                  id={optionId(index)}
                  role="option"
                  aria-selected={active}
                  className={`page-search-option ${active ? 'page-search-option--active' : ''}`}
                  // Pointer down rather than click: click fires after
                  // the input's blur has already closed the list.
                  onMouseDown={(event) => {
                    event.preventDefault();
                    go(item);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <Icon size={16} aria-hidden="true" className="page-search-option-icon" />
                  <span className="page-search-option-text">
                    <span className="page-search-option-label">{item.label}</span>
                    <span className="page-search-option-description">{item.description}</span>
                  </span>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
