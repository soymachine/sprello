import React from 'react';
import { KanbanProvider } from '../store/KanbanContext';
import SprintSelector from './SprintSelector';
import KanbanBoard from './KanbanBoard';
import CardModal from './CardModal';
import { useState } from 'react';

export default function App() {
  const [modalCard, setModalCard] = useState<{
    sprintId: string;
    listId: string;
    cardId: string;
  } | null>(null);

  return (
    <KanbanProvider>
      <div className="h-screen bg-surface-950 text-white flex flex-col overflow-hidden">
        <SprintSelector onOpenCard={setModalCard} />
        <KanbanBoard onOpenCard={setModalCard} />
        {modalCard && (
          <CardModal
            sprintId={modalCard.sprintId}
            listId={modalCard.listId}
            cardId={modalCard.cardId}
            onClose={() => setModalCard(null)}
          />
        )}
      </div>
    </KanbanProvider>
  );
}
