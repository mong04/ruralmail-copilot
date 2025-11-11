// components/AddressList.tsx (NEW FILE, UPDATED)
import React from 'react';
import { type Stop } from '../../../db';
// *** THIS IS THE ONLY CHANGE ***
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';

interface AddressListProps {
  addresses: Stop[];
  // Callbacks to bubble events up to the parent
  onReorder: (startIndex: number, endIndex: number) => void;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
}

const AddressList: React.FC<AddressListProps> = ({
  addresses,
  onReorder,
  onEdit,
  onRemove,
}) => {
  const handleDragEnd = (result: DropResult) => {
    // Must have a destination
    if (!result.destination) {
      return;
    }
    // No change in position
    if (result.destination.index === result.source.index) {
      return;
    }
    // Call parent handler
    onReorder(result.source.index, result.destination.index);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="route-list">
        {(provided) => (
          <ul
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="list-none p-0 max-h-96 overflow-y-auto"
          >
            {addresses.map((stop, index) => (
              <Draggable
                key={stop.full_address || index} // Use a more stable key if possible
                draggableId={stop.full_address || index.toString()}
                index={index}
              >
                {(provided, snapshot) => (
                  <li
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`p-3 mb-2 border rounded-lg shadow-sm flex justify-between items-center ${
                      snapshot.isDragging ? 'bg-blue-100' : 'bg-white'
                    }`}
                  >
                    {/* Drag Handle */}
                    <div {...provided.dragHandleProps} className="pr-3 text-gray-500">
                      {/* Simple drag handle icon */}
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M4 11h16v2H4zM4 6h16v2H4zM4 16h16v2H4z" />
                      </svg>
                    </div>

                    {/* Content */}
                    <div className="grow">
                      <span className="font-medium">{`Stop ${index + 1}: `}</span>
                      {stop.full_address}
                      {stop.notes && (
                        <p className="text-sm text-gray-600 italic">
                          Notes: {stop.notes}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 ml-4">
                      <button
                        onClick={() => onEdit(index)}
                        className="p-1 text-blue-600 hover:text-blue-800"
                        aria-label={`Edit stop ${index + 1}`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onRemove(index)}
                        className="p-1 text-red-600 hover:text-red-800"
                        aria-label={`Remove stop ${index + 1}`}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {addresses.length === 0 && (
              <li className="p-4 text-center text-gray-500">
                Your route is empty. Start by adding a new stop.
              </li>
            )}
          </ul>
        )}
      </Droppable>
    </DragDropContext>
  );
};

export default AddressList;