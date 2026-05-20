import { useNavigate } from 'react-router-dom';
import { User, MessageCircle, UserPlus, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFollow, useIsFollowing, useIsMutualFollow } from '@/hooks/useFollow';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface UserCardProps {
    user: {
        id: string;
        name: string | null;
        profile_photo: string | null;
        college: string | null;
        branch: string | null;
        batch_end: number | null;
        role: string | null;
    };
}

const UserCard = ({ user }: UserCardProps) => {
    const navigate = useNavigate();
    const { data: currentUser } = useCurrentUser();
    const { data: isFollowing } = useIsFollowing(user.id);
    const { follow, unfollow, isLoading } = useFollow(user.id);
    const { isMutual } = useIsMutualFollow(user.id);

    const isMe = currentUser?.id === user.id;

    const handleFollowClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isLoading) return;
        
        if (isFollowing) {
            unfollow();
        } else {
            follow();
        }
    };

    const handleMessageClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/feed/messages/${user.id}`);
    };

    const handleCardClick = () => {
        navigate(`/feed/profile/${user.id}`);
    };

    return (
        <div
            onClick={handleCardClick}
            className="bg-card border border-border/50 rounded-xl p-4 flex items-center justify-between gap-4 hover:border-primary/50 transition-colors cursor-pointer group"
        >
            <div className="flex items-center gap-3 min-w-0">
                <div className="relative">
                    {user.profile_photo ? (
                        <img
                            src={user.profile_photo}
                            alt={user.name || 'User'}
                            className="w-12 h-12 rounded-full object-cover border border-border"
                        />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border border-border">
                            <User className="w-6 h-6 text-muted-foreground" />
                        </div>
                    )}
                </div>

                <div className="min-w-0">
                    <h4 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                        {user.name || 'Unknown User'}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate">
                        {user.branch || 'Student'} {user.batch_end ? `'${user.batch_end.toString().slice(-2)}` : ''}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 truncate">
                        {user.college || 'Unknown College'}
                    </p>
                </div>
            </div>

            {!isMe && (
                <div className="flex items-center gap-2">
                    {isMutual && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                            onClick={handleMessageClick}
                            title="Message"
                        >
                            <MessageCircle className="w-4 h-4" />
                        </Button>
                    )}

                    <Button
                        variant={isFollowing ? "secondary" : "default"}
                        size="sm"
                        className={`h-8 px-3 text-xs gap-1.5 ${isFollowing ? 'bg-secondary/80 hover:bg-secondary' : 'bg-primary hover:bg-primary/90'}`}
                        onClick={handleFollowClick}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : isFollowing ? (
                            <>
                                <UserCheck className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Following</span>
                            </>
                        ) : (
                            <>
                                <UserPlus className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Follow</span>
                            </>
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
};

export default UserCard;
