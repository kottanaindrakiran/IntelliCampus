import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DbCollege, DbCampus } from '@/types/database';

export const useColleges = () => {
  return useQuery({
    queryKey: ['colleges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colleges')
        .select('*')
        .order('college_name');

      if (error) throw error;
      return data as DbCollege[];
    },
  });
};

export const useCollegesByState = (state?: string) => {
  return useQuery({
    queryKey: ['colleges', 'state', state],
    enabled: !!state,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colleges')
        .select('*')
        .eq('state', state!)
        .order('college_name');

      if (error) throw error;
      return data as DbCollege[];
    },
  });
};

export const useCampuses = (collegeId?: string) => {
  return useQuery({
    queryKey: ['campuses', collegeId],
    enabled: !!collegeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campuses')
        .select('*')
        .eq('college_id', collegeId!)
        .order('campus_name');

      if (error) throw error;
      return data as DbCampus[];
    },
  });
};

export const useStates = () => {
  return useQuery({
    queryKey: ['states'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colleges')
        .select('state')
        .order('state');

      if (error) throw error;

      // Get unique states
      const uniqueStates = [...new Set(data.map(c => c.state).filter(Boolean))];
      return uniqueStates as string[];
    },
  });
};
