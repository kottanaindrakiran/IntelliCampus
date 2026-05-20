import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home, Users, FolderKanban, MessageCircle, User,
  GraduationCap, Building2, LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { NotificationsPopover } from './NotificationsPopover';

const navItems = [
  { icon: Home, label: 'Feed', path: '/feed' },
  { icon: FolderKanban, label: 'Projects', path: '/feed/projects' },
  { icon: GraduationCap, label: 'Alumni', path: '/feed/old-students' },
  { icon: Building2, label: 'Colleges', path: '/feed/other-colleges' },
  { icon: MessageCircle, label: 'Messages', path: '/feed/messages' },
  { icon: User, label: 'Profile', path: '/feed/profile' },
];

const AppLayout = () => {
  const location = useLocation();
  const { data: currentUser, isLoading } = useCurrentUser();
  const [authUser, setAuthUser] = useState<any>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    navigate('/login');
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthUser(data.user));
  }, []);

  // Auto-create profile if missing and metadata exists (Backup for when RLS blocked registration)
  useEffect(() => {
    const syncProfile = async () => {
      if (authUser && !isLoading && !currentUser) {
        const meta = authUser.user_metadata;
        if (meta && meta.full_name) {
          console.log("Attempting to auto-create missing profile...");
          const { error } = await supabase.from('users').insert({
            id: authUser.id,
            email: authUser.email,
            name: meta.full_name,
            state: meta.state,
            college: meta.college,
            campus: meta.campus,
            branch: meta.branch,
            batch_end: meta.batch_end,
            batch_start: meta.batch_start,
            role: meta.role || 'student',
            verification_status: meta.verification_status || 'unverified',
          });

          if (!error) {
            console.log("Profile auto-created successfully.");
            queryClient.invalidateQueries({ queryKey: ['currentUser'] });
          } else {
            console.error("Failed to auto-create profile:", error);
          }
        }
      }
    };
    syncProfile();
  }, [authUser, currentUser, isLoading, queryClient]);

  if (isLoading) return null; // Or a loading spinner

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card fixed h-full">
        <div className="p-6 flex items-center justify-between">
          <Link to="/feed" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">IntelliCampus</span>
          </Link>
          <NotificationsPopover />
        </div>

        <nav className="flex-1 px-3">
          <Link
            to="/feed"
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all duration-200",
              location.pathname === '/feed' && !location.search
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Home className="w-5 h-5" />
            <span className="font-medium">Home</span>
          </Link>

          <Link
            to="/feed/projects"
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all duration-200",
              location.pathname === '/feed/projects'
                ? "gradient-bg text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <FolderKanban className="w-5 h-5" />
            <span className="font-medium">Projects</span>
          </Link>

          <Link
            to="/feed/old-students"
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
              location.pathname === '/feed/old-students'
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <GraduationCap className="w-5 h-5" />
            <span className="font-medium">Old Students</span>
          </Link>

          <Link
            to="/feed/other-colleges"
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
              location.pathname === '/feed/other-colleges'
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Building2 className="w-5 h-5" />
            <span className="font-medium">Other Colleges</span>
          </Link>

          <Link
            to="/feed/messages"
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
              location.pathname === '/feed/messages'
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <MessageCircle className="w-5 h-5" />
            <span className="font-medium">Messages</span>
          </Link>

          <Link
            to="/feed/profile"
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
              location.pathname === '/feed/profile'
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <User className="w-5 h-5" />
            <span className="font-medium">Profile</span>
          </Link>
        </nav>

        <div className="px-3 mb-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-2">
            {currentUser?.profile_photo ? (
              <img
                src={currentUser.profile_photo}
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <User className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{currentUser?.name || "User"}</p>
              <p className="text-xs text-muted-foreground truncate">{currentUser?.branch || "Student"}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pb-20 lg:pb-0">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-40">
          <Link to="/feed" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">IntelliCampus</span>
          </Link>
          <NotificationsPopover />
        </header>
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.slice(0, 6).map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path === '/feed' && location.pathname === '/feed');

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 min-w-[60px]",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <motion.div
                  initial={false}
                  animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    isActive && "gradient-bg"
                  )}
                >
                  <item.icon className={cn(
                    "w-5 h-5",
                    isActive && "text-primary-foreground"
                  )} />
                </motion.div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default AppLayout;
