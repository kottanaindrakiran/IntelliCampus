import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from './useCurrentUser';
import { useToast } from './use-toast';

export const useIsFollowing = (targetUserId?: string) => {
    const { data: currentUser } = useCurrentUser();

    return useQuery({
        queryKey: ['isFollowing', targetUserId, currentUser?.id],
        enabled: !!targetUserId && !!currentUser,
        queryFn: async () => {
            if (!currentUser || !targetUserId) return false;

            const { count, error } = await supabase
                .from('follows')
                .select('*', { count: 'exact', head: true })
                .eq('follower_id', currentUser.id)
                .eq('following_id', targetUserId);

            if (error) throw error;
            return count !== null && count > 0;
        },
    });
};

export const useFollow = (targetUserId: string) => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { data: currentUser } = useCurrentUser();

    const { mutate: follow, isPending: isFollowPending } = useMutation({
        mutationFn: async () => {
            if (!currentUser) throw new Error("Not logged in");

            // Use upsert to handle potential race conditions or double-clicks gracefully
            const { error } = await supabase
                .from('follows')
                .upsert({
                    follower_id: currentUser.id,
                    following_id: targetUserId
                });

            if (error) {
                // If the error isn't a duplicate key, throw it
                if (error.code !== '23505') throw error;
            }
        },
        onMutate: async () => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['isFollowing', targetUserId] });
            // Snapshot the previous value
            const previousValue = queryClient.getQueryData(['isFollowing', targetUserId]);
            // Optimistically update to the new value
            queryClient.setQueryData(['isFollowing', targetUserId], true);
            return { previousValue };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['followCounts', targetUserId] });
            queryClient.invalidateQueries({ queryKey: ['followCounts', currentUser?.id] });
            queryClient.invalidateQueries({ queryKey: ['isMutualFollow', targetUserId] });
        },
        onError: (error: any, _, context) => {
            // Roll back to the previous value
            if (context?.previousValue !== undefined) {
                queryClient.setQueryData(['isFollowing', targetUserId], context.previousValue);
            }
            toast({
                title: "Cannot Follow",
                description: error.message || "Failed to follow user.",
                variant: "destructive"
            });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['isFollowing', targetUserId] });
        }
    });

    const { mutate: unfollow, isPending: isUnfollowPending } = useMutation({
        mutationFn: async () => {
            if (!currentUser) throw new Error("Not logged in");

            const { error } = await supabase
                .from('follows')
                .delete()
                .eq('follower_id', currentUser.id)
                .eq('following_id', targetUserId);

            if (error) throw error;
        },
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['isFollowing', targetUserId] });
            const previousValue = queryClient.getQueryData(['isFollowing', targetUserId]);
            queryClient.setQueryData(['isFollowing', targetUserId], false);
            return { previousValue };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['followCounts', targetUserId] });
            queryClient.invalidateQueries({ queryKey: ['followCounts', currentUser?.id] });
            queryClient.invalidateQueries({ queryKey: ['isMutualFollow', targetUserId] });
        },
        onError: (error: any, _, context) => {
            if (context?.previousValue !== undefined) {
                queryClient.setQueryData(['isFollowing', targetUserId], context.previousValue);
            }
            toast({
                title: "Error",
                description: error.message || "Failed to unfollow user.",
                variant: "destructive"
            });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['isFollowing', targetUserId] });
        }
    });

    return {
        follow,
        unfollow,
        isLoading: isFollowPending || isUnfollowPending
    };
};

export const useAmIFollowed = (userId: string | undefined) => {
    const { data: currentUser } = useCurrentUser();

    return useQuery({
        queryKey: ['isFollowedBy', userId, currentUser?.id],
        queryFn: async () => {
            if (!userId || !currentUser) return false;

            const { count, error } = await supabase
                .from('follows')
                .select('*', { count: 'exact', head: true })
                .eq('follower_id', userId)
                .eq('following_id', currentUser.id);

            if (error) {
                console.error("Error checking if followed by user:", error);
                return false;
            }

            return count !== null && count > 0;
        },
        enabled: !!userId && !!currentUser,
    });
};

export const useIsMutualFollow = (userId: string | undefined) => {
    const { data: isFollowing } = useIsFollowing(userId);
    const { data: isFollowedBy } = useAmIFollowed(userId);

    return {
        isMutual: !!(isFollowing && isFollowedBy),
        isFollowing,
        isFollowedBy
    };
};
