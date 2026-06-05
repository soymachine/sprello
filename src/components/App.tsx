import React, { useState } from 'react';
import { KanbanProvider } from '../store/KanbanContext';
import { ThemeProvider } from '../store/themeStore';
import SprintSelector from './SprintSelector';
import KanbanBoard from './KanbanBoard';
import CardModal from './CardModal';

export default function App() {
  const [modalCard, setModalCard] = useState<{
    sprintId: string;
    listId: string;
    cardId: string;
  } | null>(null);

  return (
    <ThemeProvider>
      <KanbanProvider>
        <div className="h-screen bg-surface-950 text-surface-50 flex flex-col overflow-hidden">
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
    </ThemeProvider>
  );
}
