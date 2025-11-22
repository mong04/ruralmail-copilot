import React from 'react';
import { type Stop } from '../../../db';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { SwipeableRow } from '../../../components/ui/SwipeableRow';
import { GripVertical } from 'lucide-react';

interface AddressListProps {
  addresses: Stop[];
  onReorder: (startIndex: number, endIndex: number) => void;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
}

const AddressList: React.FC<AddressListProps> = ({ addresses, onReorder, onEdit, onRemove }) => {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;
    onReorder(result.source.index, result.destination.index);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="route-list">
        {(provided) => (
          <ul {...provided.droppableProps} ref={provided.innerRef} className="list-none p-0">
            {addresses.map((stop, index) => (
              <Draggable key={stop.full_address || `${index}`} draggableId={stop.full_address || index.toString()} index={index}>
                {(provided) => (
                  <li ref={provided.innerRef} {...provided.draggableProps} className="relative">
                    <SwipeableRow
                      onEdit={() => onEdit(index)}
                      onDelete={() => onRemove(index)}
                      className={index < addresses.length - 1 ? "border-b border-border/40" : ""}
                    >
                      <div className="w-full flex items-center gap-3 py-3 px-4 bg-surface active:bg-surface-muted/50 transition-colors cursor-pointer relative group">
                        {/* Drag Handle */}
                        <div {...provided.dragHandleProps} className="shrink-0 text-muted-foreground/50 touch-none">
                          <GripVertical size={20} />
                        </div>
                        
                        {/* Stop Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">
                            <span className="font-bold text-brand">{`#${index + 1} `}</span>
                            {stop.full_address}
                          </p>
                          {stop.notes && <p className="text-xs text-muted-foreground italic truncate">Notes: {stop.notes}</p>}
                        </div>
                      </div>
                    </SwipeableRow>
                  </li>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {addresses.length === 0 && <li className="p-4 text-center text-muted">Your route is empty. Start by adding a new stop.</li>}
          </ul>
        )}
      </Droppable>
    </DragDropContext>
  );
};

export default AddressList;
