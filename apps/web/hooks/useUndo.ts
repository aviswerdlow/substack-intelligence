'use client';

import { useState, useCallback } from 'react';

interface UndoState<T> {
  past: T[];
  present: T;
  future: T[];
}

interface UndoActions<T> {
  set: (newPresent: T | ((prevPresent: T) => T)) => void;
  reset: (newPresent?: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useUndo<T>(initialPresent: T): [UndoState<T>, UndoActions<T>] {
  const [state, setState] = useState<UndoState<T>>({
    past: [],
    present: initialPresent,
    future: [],
  });

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const undo = useCallback(() => {
    setState((currentState) => {
      if (currentState.past.length === 0) return currentState;

      const previous = currentState.past[currentState.past.length - 1];
      const newPast = currentState.past.slice(0, currentState.past.length - 1);

      return {
        past: newPast,
        present: previous,
        future: [currentState.present, ...currentState.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((currentState) => {
      if (currentState.future.length === 0) return currentState;

      const next = currentState.future[0];
      const newFuture = currentState.future.slice(1);

      return {
        past: [...currentState.past, currentState.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const set = useCallback((newPresent: T | ((prevPresent: T) => T)) => {
    setState((currentState) => {
      const resolvedPresent = typeof newPresent === 'function' 
        ? (newPresent as (prevPresent: T) => T)(currentState.present)
        : newPresent;

      if (resolvedPresent === currentState.present) {
        return currentState;
      }

      return {
        past: [...currentState.past, currentState.present],
        present: resolvedPresent,
        future: [],
      };
    });
  }, []);

  const reset = useCallback((newPresent?: T) => {
    setState({
      past: [],
      present: newPresent ?? initialPresent,
      future: [],
    });
  }, [initialPresent]);

  return [
    state,
    {
      set,
      reset,
      undo,
      redo,
      canUndo,
      canRedo,
    },
  ];
}