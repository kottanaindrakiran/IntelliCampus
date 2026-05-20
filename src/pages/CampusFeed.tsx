import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import PostCard from '@/components/feed/PostCard';
import CreatePost from '@/components/feed/CreatePost';
import BranchFilter from '@/components/feed/BranchFilter';
import StoriesBar from '@/components/feed/StoriesBar';
import { usePosts } from '@/hooks/usePosts';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Loader2, Building2, BookOpen, Calendar, MapPin, Laptop, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSearchParams, useNavigate } from 'react-router-dom';

const CampusFeed = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlBranch = searchParams.get('branch');

  const [selectedBranch, setSelectedBranch] = useState(urlBranch || 'All');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Sync state with URL if it changes externally
  useEffect(() => {
    if (urlBranch) {
      setSelectedBranch(urlBranch);
    } else {
      setSelectedBranch('All');
    }
  }, [urlBranch]);

  // Update URL when branch is selected manually
  const handleBranchSelect = (branch: string) => {
    setSelectedBranch(branch);
    if (branch === 'All') {
      searchParams.delete('branch');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ branch });
    }
  };

  const categories = [
    { id: 'All', label: 'All', icon: <Building2 className="w-4 h-4" /> },
    { id: 'academic', label: 'Academic', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'event', label: 'Event', icon: <Calendar className="w-4 h-4" /> },
    { id: 'campus-life', label: 'Campus Life', icon: <MapPin className="w-4 h-4" /> },
    { id: 'project', label: 'Project', icon: <Laptop className="w-4 h-4" /> },
  ];

  const { data: currentUser } = useCurrentUser();

  // Filter posts by user's college if available
  const { data: posts, isLoading, error } = usePosts({
    branch: selectedBranch,
    college: currentUser?.college
  });

  const [playingPostId, setPlayingPostId] = useState<string | null>(null);

  // Scroll Listener for Video Autoplay
  useEffect(() => {
    const handleScroll = () => {
      const videoPosts = document.querySelectorAll('[data-video-post-id]');
      let centerPostId: string | null = null;
      let minDistance = Infinity;
      const windowHeight = window.innerHeight;

      videoPosts.forEach((post) => {
        const rect = post.getBoundingClientRect();
        const postCenter = rect.top + rect.height / 2;
        const windowCenter = windowHeight / 2;
        const distance = Math.abs(windowCenter - postCenter);

        // Check if post is mostly visible
        const isVisible = rect.top < windowHeight - 100 && rect.bottom > 100;

        if (isVisible && distance < minDistance) {
          minDistance = distance;
          centerPostId = post.getAttribute('data-video-post-id');
        }
      });

      if (centerPostId !== playingPostId) {
        setPlayingPostId(centerPostId);
      }
    };

    // Debounce or throttle could be added here for performance if needed
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, [playingPostId]);

  const filteredPosts = posts?.filter(post => {
    // Filter by selected category (case-insensitive)
    if (selectedCategory !== 'All') {
      const postType = post.post_type?.toLowerCase() || '';
      const category = selectedCategory.toLowerCase();
      if (postType !== category) return false;
    }
    return true;
  }) || [];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-bold">Campus Feed</h1>
            <div className="flex items-center gap-2">
              {/* Notifications handled by AppLayout */}
            </div>
          </div>


        </div>
      </header>

      {/* Stories */}
      <StoriesBar />

      <div className="container max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Branch Filter & Find People */}
        <BranchFilter
          selectedBranch={selectedBranch}
          onSelectBranch={handleBranchSelect}
          onFindPeople={() => navigate('/feed/people')}
        />

        {/* Categories */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => {
                if (category.id === 'project') {
                  navigate('/feed/projects');
                } else {
                  setSelectedCategory(category.id);
                }
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                selectedCategory === category.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {category.icon}
              {category.label}
            </button>
          ))}
        </div>

        {/* Create Post */}
        <CreatePost />

        {/* Posts */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <p className="text-destructive">Error loading posts</p>
            </motion.div>
          ) : filteredPosts.length > 0 ? (
            filteredPosts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <PostCard post={post} isPlaying={post.id === playingPostId} />
              </motion.div>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <p className="text-muted-foreground">No posts found</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampusFeed;
