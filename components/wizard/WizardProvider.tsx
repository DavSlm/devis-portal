'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
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

export function WizardProvider({ children, initialStep }: WizardProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [currentStep, setCurrentStep] = useReducer(
    (_: StepId, next: StepId) => next,
    initialStep ?? 'profile',
  );

  const set = useCallback((patch: Partial<WizardState>) => {
    dispatch({ type: 'SET', patch });
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

  const value: WizardContextValue = {
    state,
    set,
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
