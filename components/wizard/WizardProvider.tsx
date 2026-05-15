'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { initialState, type WizardState } from '@/types/wizard';
import { computeFlow, canAdvance, type StepId } from './flow';

type Action =
  | { type: 'SET'; patch: Partial<WizardState> }
  | { type: 'RESET' };

function reducer(state: WizardState, action: Action): WizardState {
  switch (action.type) {
    case 'SET':
      return { ...state, ...action.patch };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

interface WizardContextValue {
  state: WizardState;
  set: (patch: Partial<WizardState>) => void;
  /**
   * Like set() but also schedules an auto-advance to the next step
   * once React has committed the new state. Use for single-select card
   * pickers where clicking an option implies "I'm done with this step".
   */
  pick: (patch: Partial<WizardState>) => void;
  reset: () => void;

  flow: StepId[];
  currentStep: StepId;
  currentIndex: number;
  totalSteps: number;
  isFirst: boolean;
  isLast: boolean;

  canAdvance: boolean;
  next: () => void;
  prev: () => void;
  goTo: (id: StepId) => void;
}

const WizardContext = createContext<WizardContextValue | null>(null);

interface WizardProviderProps {
  children: ReactNode;
  initialStep?: StepId;
}

// Small visual pause after picking so the user sees their selection before
// the screen transitions.
const AUTO_ADVANCE_DELAY_MS = 220;

export function WizardProvider({ children, initialStep }: WizardProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [currentStep, setCurrentStep] = useReducer(
    (_: StepId, next: StepId) => next,
    initialStep ?? 'profile',
  );
  const [pendingAdvance, setPendingAdvance] = useState(false);
  const advanceTimerRef = useRef<number | null>(null);

  const set = useCallback((patch: Partial<WizardState>) => {
    dispatch({ type: 'SET', patch });
  }, []);

  const pick = useCallback((patch: Partial<WizardState>) => {
    dispatch({ type: 'SET', patch });
    setPendingAdvance(true);
  }, []);

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  const flow = useMemo(() => computeFlow(state), [state]);
  const currentIndex = flow.indexOf(currentStep);
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;
  const advanceable = canAdvance(currentStep, state);

  const next = useCallback(() => {
    if (!advanceable) return;
    const nextStep = flow[safeIndex + 1];
    if (nextStep) setCurrentStep(nextStep);
  }, [advanceable, flow, safeIndex]);

  const prev = useCallback(() => {
    const prevStep = flow[safeIndex - 1];
    if (prevStep) setCurrentStep(prevStep);
  }, [flow, safeIndex]);

  const goTo = useCallback(
    (id: StepId) => {
      if (flow.includes(id)) setCurrentStep(id);
    },
    [flow],
  );

  // Auto-advance handler: runs after a pick() once state is committed.
  useEffect(() => {
    if (!pendingAdvance) return;
    setPendingAdvance(false);
    if (!advanceable) return;
    const nextStep = flow[safeIndex + 1];
    if (!nextStep) return;
    if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = window.setTimeout(() => {
      setCurrentStep(nextStep);
    }, AUTO_ADVANCE_DELAY_MS);
  }, [pendingAdvance, advanceable, flow, safeIndex]);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current);
    };
  }, []);

  const value: WizardContextValue = {
    state,
    set,
    pick,
    reset,
    flow,
    currentStep: flow[safeIndex] ?? flow[0],
    currentIndex: safeIndex,
    totalSteps: flow.length,
    isFirst: safeIndex === 0,
    isLast: safeIndex === flow.length - 1,
    canAdvance: advanceable,
    next,
    prev,
    goTo,
  };

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) {
    throw new Error('useWizard must be used inside <WizardProvider>');
  }
  return ctx;
}
