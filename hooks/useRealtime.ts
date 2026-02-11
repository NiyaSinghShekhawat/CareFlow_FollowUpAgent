
import { useState, useEffect } from 'react';
import { Action, Department } from '@/types';
import { subscribeToDepartmentActions, subscribeToPatientActions } from '@/lib/db';

export function useDepartmentActions(department: Department) {
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToDepartmentActions(department, (data) => {
      setActions(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [department]);

  return { actions, loading };
}

export function usePatientActions(patientId: string) {
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    const unsubscribe = subscribeToPatientActions(patientId, (data) => {
      setActions(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [patientId]);

  return { actions, loading };
}
