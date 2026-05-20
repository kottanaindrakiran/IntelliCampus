import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Image, Video, FolderArchive, Send, X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { postCategories } from '@/data/constants';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DbUser } from '@/types/database';

interface CreatePostProps {
  onClose?: () => void;
}

const CreatePost = ({ onClose }: CreatePostProps) => {
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Array to store multiple selected files
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  // Track dominant file type (image vs video vs project)
  const [fileType, setFileType] = useState<'image' | 'video' | 'project' | null>(null);

  const [isPosting, setIsPosting] = useState(false);
  const [user, setUser] = useState<DbUser | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data } = await supabase.from('users').select('*').eq('id', authUser.id).single();
        setUser(data);
      }
    };
    fetchUser();
  }, []);

  const handleFileSelect = (type: 'image' | 'video' | 'project') => {
    const input = document.createElement('input');
    input.type = 'file';

    // Configure input based on type
    if (type === 'image') {
      input.multiple = true; // Allow multiple selection for images
      input.accept = 'image/*';
    } else if (type === 'video') {
      input.accept = 'video/*';
    } else {
      input.accept = '.zip,.rar,.pdf';
    }

    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        if (type === 'image') {
          const newFiles = Array.from(files);

          // Append new images if we are already in 'image' mode, otherwise replace
          setSelectedFiles(prev => {
            if (fileType === 'image') {
              return [...prev, ...newFiles];
            }
            return newFiles;
          });
          setFileType('image');
        } else {
          // For video/project, we currently support single selection mode (replaces previous)
          setSelectedFiles([files[0]]);
          if (type === 'project') {
            setSelectedCategory('project');
          }
          setFileType(type);
        }
      }
    };
    input.click();
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);
      // If all files removed, reset file type
      if (newFiles.length === 0) {
        setFileType(null);
      }
      return newFiles;
    });
  };

  const handlePost = async () => {
    // Validate inputs
    if (!content.trim() && selectedFiles.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please add content or media.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCategory) {
      toast({
        title: "Select Category",
        description: "Please select a category for your post.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Unauthorized",
        description: "You must be logged in to post.",
        variant: "destructive"
      });
      return;
    }

    if (user.verification_status !== 'verified') {
      toast({
        title: "Access Denied",
        description: "Only verified users can create posts.",
        variant: "destructive"
      });
      return;
    }

    setIsPosting(true);
    try {
      const mediaUrls: string[] = [];

      // Upload all selected files
      if (selectedFiles.length > 0) {
        // Determine bucket based on type
        const bucket = fileType === 'project' ? 'project-files' : 'post-media';

        for (const file of selectedFiles) {
          const fileExt = file.name.split('.').pop();
          const filePath = `${user.id}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

          mediaUrls.push(publicUrl);
        }
      }

      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        caption: content,
        post_type: selectedCategory,
        // Backward compatibility: first item in media_url, all items in media_urls
        media_url: mediaUrls[0] || null,
        media_urls: mediaUrls,
        branch: user.branch,
      });

      if (error) throw error;

      toast({
        title: "Post Created! 🎉",
        description: "Your post has been shared with your community.",
      });

      // Reset state
      setContent('');
      setSelectedCategory('');
      setSelectedFiles([]);
      setFileType(null);
      onClose?.();

    } catch (error: any) {
      console.error(error);
      toast({
        title: "Error",
        description: error.message || "Failed to create post.",
        variant: "destructive",
      });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl shadow-soft p-4"
    >
      <div className="flex items-start gap-3">
        {user?.profile_photo ? (
          <img
            src={user.profile_photo}
            alt="Profile"
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <User className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1">
          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[80px] border-0 resize-none focus-visible:ring-0 p-0 text-sm"
          />
        </div>
      </div>

      {/* Category Selection */}
      <div className="mt-4">
        <p className="text-xs text-muted-foreground mb-2">Select Category</p>
        <div className="flex flex-wrap gap-2">
          {(() => {
            const currentYear = new Date().getFullYear();
            const isAlumni = user?.batch_end && user.batch_end < currentYear;

            const displayedCategories = postCategories.filter(category => {
              const alumniCategories = ['alumni', 'college-days', 'career-updates', 'mentorship'];

              if (isAlumni) {
                if (alumniCategories.includes(category.id)) return true;
                if (category.id === 'project') return true;
                return false;
              } else {
                if (alumniCategories.includes(category.id)) return false;
                return true;
              }
            });

            return displayedCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full font-medium transition-all duration-200",
                  selectedCategory === category.id
                    ? "gradient-bg text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {category.icon} {category.label}
              </button>
            ));
          })()}
        </div>
      </div>

      {/* Selected File Preview */}
      {selectedFiles.length > 0 && (
        <div className="mt-4 p-3 bg-muted rounded-xl">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {selectedFiles.map((file, index) => (
              <div key={index} className="relative flex-shrink-0 bg-background rounded-lg p-2 border border-border w-40 snap-start">
                <div className="flex items-center gap-2 mb-2">
                  {fileType === 'image' && <Image className="w-4 h-4 text-primary" />}
                  {fileType === 'video' && <Video className="w-4 h-4 text-primary" />}
                  {fileType === 'project' && <FolderArchive className="w-4 h-4 text-primary" />}
                  <span className="text-xs truncate max-w-[100px] font-medium">{file.name}</span>
                </div>
                {/* Preview for images */}
                {fileType === 'image' && (
                  <div className="w-full h-24 rounded-md overflow-hidden bg-muted/50 mb-1">
                    <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <button
                  onClick={() => removeFile(index)}
                  className="absolute top-1 right-1 p-1 bg-background/80 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => handleFileSelect('image')}
          >
            <Image className="w-4 h-4 text-green-500" />
            <span className="hidden sm:inline text-xs">Photo</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => handleFileSelect('video')}
          >
            <Video className="w-4 h-4 text-red-500" />
            <span className="hidden sm:inline text-xs">Video</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => handleFileSelect('project')}
          >
            <FolderArchive className="w-4 h-4 text-blue-500" />
            <span className="text-xs">Project</span>
          </Button>
        </div>

        <Button
          variant="gradient"
          size="sm"
          onClick={handlePost}
          disabled={(!content.trim() && selectedFiles.length === 0) || !selectedCategory || isPosting}
        >
          <Send className="w-4 h-4 mr-2" />
          {isPosting ? 'Posting...' : 'Post'}
        </Button>
      </div>
    </motion.div>
  );
};

export default CreatePost;
