'use client'

import { useState, useCallback } from 'react'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'

interface SearchFilterProps {
  onSearch: (query: string) => void
  onFilter?: () => void
  placeholder?: string
  className?: string
}

export function SearchFilter({ onSearch, onFilter, placeholder = 'Search...', className }: SearchFilterProps) {
  const [value, setValue] = useState('')
  const debouncedSearch = useDebounce(onSearch, 300)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setValue(v)
    debouncedSearch(v)
  }, [debouncedSearch])

  return (
    <div className={`search-wrap ${className || ''}`}>
      <Search size={14} className="search-icon" />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="input search-input"
      />
      {value && (
        <button
          onClick={() => { setValue(''); onSearch('') }}
          className="absolute right-2 text-[var(--text-3)] hover:text-[var(--text)] transition-colors"
        >
          <X size={14} />
        </button>
      )}
      {onFilter && (
        <button
          onClick={onFilter}
          className="absolute right-8 text-[var(--text-3)] hover:text-[var(--text)] transition-colors"
        >
          <SlidersHorizontal size={14} />
        </button>
      )}
    </div>
  )
}
