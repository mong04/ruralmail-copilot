// src/components/packages/GroupHeader.tsx
import React from 'react';

interface GroupHeaderProps {
  title: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  /** This style prop is required by react-virtual for positioning */
  style: React.CSSProperties;
}

export const GroupHeader: React.FC<GroupHeaderProps> = ({
  title,
  count,
  isExpanded,
  onToggle,
  style,
}) => {
  return (
    <div style={style}>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-3 rounded-md text-base font-bold sticky top-0 z-10 border transition-all ${
          title === 'Unassigned'
            ? 'bg-amber-100 border-amber-200 text-amber-800'
            : 'bg-blue-100 border-blue-200 text-blue-800'
        }`}
      >
        {/* **THE FIX IS HERE:** */}
        <span className="flex-1 min-w-0 text-left pr-2">
          {title} ({count})
        </span>

        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`transform transition-transform duration-200 ${
            isExpanded ? 'rotate-90' : 'rotate-0'
          }`}
        >
          <path
            fillRule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
};