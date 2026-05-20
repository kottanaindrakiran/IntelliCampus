import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  GraduationCap, ArrowLeft, ArrowRight, Check, Upload,
  MapPin, Building, GitBranch, Calendar, User, Mail, Lock, FileText, Eye, EyeOff,
  Loader2, CheckCircle2, XCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { branches, generateYears } from '@/data/constants';
import { collegeData } from '@/data/collegeData';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const steps = [
  { id: 1, title: 'State', icon: MapPin },
  { id: 2, title: 'College', icon: Building },
  { id: 3, title: 'Campus', icon: Building },
  { id: 4, title: 'Branch', icon: GitBranch },
  { id: 5, title: 'Year', icon: Calendar },
  { id: 6, title: 'Profile', icon: User },
  { id: 7, title: 'Password', icon: Lock },
];

const Connect = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCollegeId, setSelectedCollegeId] = useState<string | null>(null);


  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Verification states
  const [verificationState, setVerificationState] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    state: '',
    college: '',
    campus: '',
    branch: '',
    passingYear: '',
    profilePhoto: null as File | null,
    fullName: '',
    email: '',
    document: null as File | null,
    password: '',
    confirmPassword: '',
  });

  // Profile Photo state is handled in formData
  
  const currentYear = new Date().getFullYear();
  const isOldStudent = formData.passingYear && parseInt(formData.passingYear) < currentYear;

  const updateFormData = (field: string, value: string | File | null) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Reset dependent fields
      if (field === 'state') {
        newData.college = '';
        newData.campus = '';
      } else if (field === 'college') {
        newData.campus = '';
      }
      
      return newData;
    });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!formData.state;
      case 2: return !!formData.college;
      case 3: return !!formData.campus;
      case 4: return !!formData.branch;
      case 5: return !!formData.passingYear;
      case 6: return !!formData.fullName && !!formData.email && verificationState === 'success';
      case 7: return formData.password.length >= 6 && formData.password === formData.confirmPassword;
      default: return false;
    }
  };

  const handleNext = () => {
    // Email Validation for Current Students (Step 6)
    if (currentStep === 6 && !isOldStudent) {
      const email = formData.email.toLowerCase();
      const validDomains = ['.edu', '.ac.in', '.edu.in', 'srmist.edu.in'];
      const isValidEdu = validDomains.some(domain => email.endsWith(domain));

      if (!isValidEdu) {
        toast({
          variant: "destructive",
          title: "Invalid College Email Address",
          description: "Current students must use a valid college email ending in .edu, .ac.in, or your college's specific domain (like @srmist.edu.in). Personal emails (Gmail, etc.) are only allowed for Alumni.",
        });
        return;
      }
    }

    if (currentStep < 7) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // 1. Sign up with Supabase Auth
      // We store profile data in metadata as a backup for when email verification is enabled
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/feed/profile`,
          data: {
            full_name: formData.fullName,
            state: formData.state,
            college: formData.college,
            campus: formData.campus,
            branch: formData.branch,
            batch_end: parseInt(formData.passingYear),
            batch_start: parseInt(formData.passingYear) - 4,
            role: 'student',
            verification_status: isOldStudent ? (formData.document ? 'pending' : 'unverified') : 'verified',
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Registration failed');

      // If email verification is enabled, session might be null.
      // In that case, we can't upload files or insert into public.users due to RLS.
      // The user will have to complete their profile (or we auto-create it from metadata) after login.
      if (!authData.session) {
        toast({
          title: "Registration Successful! 📧",
          description: "Please check your email to verify your account. You can complete your profile setup after logging in.",
        });
        navigate('/login');
        return;
      }

      const userId = authData.user.id;
      let profilePhotoUrl = null;
      let documentUrl = null;

      // 2. Upload Profile Photo
      if (formData.profilePhoto) {
        try {
          const fileExt = formData.profilePhoto.name.split('.').pop();
          const filePath = `${userId}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, formData.profilePhoto);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

          profilePhotoUrl = publicUrl;
        } catch (e) {
          console.error("Avatar upload failed:", e);
          // Continue without avatar
        }
      }

      // 3. Upload Verification Document (Required)
      if (formData.document) {
        try {
          const fileExt = formData.document.name.split('.').pop();
          const filePath = `${userId}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('verification-documents')
            .upload(filePath, formData.document);

          if (uploadError) throw uploadError;

          documentUrl = filePath;
        } catch (e) {
          console.error("Document upload failed:", e);
        }
      }

      // 4. Insert into public.users
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: formData.email,
          name: formData.fullName,
          profile_photo: profilePhotoUrl,
          state: formData.state,
          college: formData.college,
          campus: formData.campus,
          branch: formData.branch,
          batch_end: parseInt(formData.passingYear),
          // Calculate batch_start roughly (assuming 4 years) or leave null if not critical
          batch_start: parseInt(formData.passingYear) - 4,
          role: 'student', // Default role
          verification_status: verificationState === 'success' ? 'verified' : (isOldStudent ? 'pending' : 'unverified'),
        });

      if (profileError) throw profileError;

      // 5. Trigger Document Verification (Edge Function)
      if (documentUrl) {
        try {
          await supabase.functions.invoke('verify-document', {
            body: {
              document_path: documentUrl,
              user_id: userId,
              user_type: isOldStudent ? 'old' : 'current',
              provided_email: formData.email
            }
          });
        } catch (verifyError) {
          console.error("Auto-verification failed:", verifyError);
          // Not blocking registration, just logging
        }
      }

      toast({
        title: "Registration Successful! 🎉",
        description: "Welcome to IntelliCampus! Verification details submitted.",
      });
      navigate('/login');

    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message || "Something went wrong. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (field: string) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      updateFormData(field, file);
      if (field === 'document') {
        handleDocumentVerify(file);
      }
    }
  };

  const handleDocumentVerify = async (file: File) => {
    if (!formData.fullName || !formData.college) {
      toast({
        variant: "destructive",
        title: "Required Fields Missing",
        description: "Please enter your full name and select your college before uploading your ID for verification.",
      });
      return;
    }

    setVerificationState('verifying');
    setVerificationError(null);

    try {
      // 1. Upload to temporary or permanent path
      const fileExt = file.name.split('.').pop();
      const tempPath = `temp/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('verification-documents')
        .upload(tempPath, file);

      if (uploadError) throw uploadError;

      // 2. Call Edge Function with minimum 2s delay
      const [response] = await Promise.all([
        supabase.functions.invoke('verify-document', {
          body: {
            document_path: tempPath,
            full_name: formData.fullName,
            college_name: formData.college,
            campus_name: formData.campus,
            user_type: isOldStudent ? 'old' : 'current'
          }
        }),
        new Promise(resolve => setTimeout(resolve, 2000))
      ]);

      if (response.error) {
        // Try to extract a specific error message if available
        let errorMsg = "Verification failed";
        try {
          // Supabase function errors can be tricky to parse directly
          const context = response.error as any;
          if (context.context && typeof context.context.json === 'function') {
            const body = await context.context.json();
            errorMsg = body.error || errorMsg;
          } else if (context.message) {
            errorMsg = context.message;
          }
        } catch (e) {
          errorMsg = response.error.message || errorMsg;
        }
        throw new Error(errorMsg);
      }

      setVerificationState('success');
    } catch (error: any) {
      console.error("Verification error details:", error);
      setVerificationState('error');
      
      let displayError = error.message || "Could not verify document. Please try again.";
      if (displayError.includes("non-2xx")) {
        displayError = "Verification failed. Please ensure the document is clear and contains your name and college.";
      }
      setVerificationError(displayError);
    }
  };

  const handleCollegeSelect = (collegeName: string) => {
    updateFormData('college', collegeName);
  };

  const renderStepContent = () => {
    const states = Object.keys(collegeData) as (keyof typeof collegeData)[];
    const selectedState = formData.state as keyof typeof collegeData;
    const colleges = selectedState ? Object.keys(collegeData[selectedState]) : [];
    const selectedCollege = formData.college;
    const campuses = (selectedState && selectedCollege) ? (collegeData[selectedState] as any)[selectedCollege] || [] : [];

    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <label className="text-sm font-medium">Select Your State</label>
            <Select value={formData.state} onValueChange={(v) => updateFormData('state', v)}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Choose your state" />
              </SelectTrigger>
              <SelectContent>
                {states.map(state => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <label className="text-sm font-medium">Select Your College</label>
            <Select value={formData.college} onValueChange={handleCollegeSelect}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Choose your college" />
              </SelectTrigger>
              <SelectContent>
                {colleges.map(college => (
                  <SelectItem key={college} value={college}>{college}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <label className="text-sm font-medium">Select Your Campus</label>
            <Select value={formData.campus} onValueChange={(v) => updateFormData('campus', v)}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Choose your campus" />
              </SelectTrigger>
              <SelectContent>
                {campuses.map((campus: string) => (
                  <SelectItem key={campus} value={campus}>{campus}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <label className="text-sm font-medium">Select Your Branch</label>
            <Select value={formData.branch} onValueChange={(v) => updateFormData('branch', v)}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Choose your branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map(branch => (
                  <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <label className="text-sm font-medium">Select Your Passing Year</label>
            <Select value={formData.passingYear} onValueChange={(v) => updateFormData('passingYear', v)}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Choose your passing year" />
              </SelectTrigger>
              <SelectContent>
                {generateYears().map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.passingYear && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-xl text-center font-medium ${isOldStudent
                  ? 'bg-accent/20 text-accent'
                  : 'bg-primary/20 text-primary'
                  }`}
              >
                {isOldStudent ? '🎓 Old Student (Alumni)' : '📚 Current Student'}
              </motion.div>
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Profile Photo</label>
              <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition-colors">
                {formData.profilePhoto ? (
                  <div className="flex items-center gap-2 text-primary">
                    <Check className="w-5 h-5" />
                    <span>{formData.profilePhoto.name}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Upload className="w-8 h-8" />
                    <span className="text-sm">Upload your photo</span>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload('profilePhoto')} />
              </label>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input placeholder="Enter your full name" value={formData.fullName} onChange={(e) => updateFormData('fullName', e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input type="email" placeholder="Enter your email" value={formData.email} onChange={(e) => updateFormData('email', e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Verification Document <span className="text-destructive">*</span></label>
              <p className="text-xs text-muted-foreground">ID Card, Hall Ticket, Marks Memo, or Certificate</p>

              <AnimatePresence mode="wait">
                {verificationState === 'idle' && (
                  <motion.div
                    key="upload"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition-colors bg-card/30">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Upload className="w-10 h-10 mb-2" />
                        <span className="font-medium text-foreground">Click or drag to upload ID</span>
                        <span className="text-xs">JPG, PNG, or PDF</span>
                      </div>
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileUpload('document')} />
                    </label>
                  </motion.div>
                )}

                {verificationState === 'verifying' && (
                  <motion.div
                    key="verifying"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center justify-center h-48 border-2 border-border rounded-xl bg-card/30"
                  >
                    <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                    <p className="font-medium text-lg">Verifying your document...</p>
                    <p className="text-sm text-muted-foreground">This will only take a moment</p>
                  </motion.div>
                )}

                {verificationState === 'success' && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center h-48 border-2 border-success/50 rounded-xl bg-success/10"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", damping: 12 }}
                    >
                      <CheckCircle2 className="w-12 h-12 text-success mb-3" />
                    </motion.div>
                    <p className="font-bold text-lg text-success">Document Verified!</p>
                    <p className="text-sm text-success/80">Your student identity has been confirmed.</p>
                  </motion.div>
                )}

                {verificationState === 'error' && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center h-48 border-2 border-destructive/50 rounded-xl bg-destructive/10 px-4 text-center"
                  >
                    <XCircle className="w-12 h-12 text-destructive mb-3" />
                    <p className="font-bold text-lg text-destructive">Verification Failed</p>
                    <p className="text-sm text-destructive/80 mb-4">{verificationError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setVerificationState('idle')}
                      className="border-destructive text-destructive hover:bg-destructive hover:text-white"
                    >
                      Upload Different Document
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password (min 6 characters)"
                  value={formData.password}
                  onChange={(e) => updateFormData('password', e.target.value)}
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen hero-gradient flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <Card className="border-0 shadow-medium">
          <CardHeader className="text-center pb-2">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.5, delay: 0.2 }} className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-8 h-8 text-primary-foreground" />
            </motion.div>
            <CardTitle className="text-2xl">Join IntelliCampus</CardTitle>
            <CardDescription>Step {currentStep} of 7: {steps[currentStep - 1].title}</CardDescription>
          </CardHeader>

          <div className="px-6 pb-4">
            <div className="flex gap-1">
              {steps.map((step) => (
                <div key={step.id} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${step.id <= currentStep ? 'gradient-bg' : 'bg-muted'}`} />
              ))}
            </div>
          </div>

          <CardContent>
            <AnimatePresence mode="wait">
              <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>

            <div className="flex gap-3 mt-6">
              {currentStep > 1 && (
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              {!(currentStep === 6 && verificationState !== 'success') && (
                <Button variant="gradient" onClick={handleNext} disabled={!canProceed() || isLoading} className="flex-1">
                  {isLoading ? 'Creating Account...' : currentStep === 7 ? 'Create Account' : 'Continue'}
                  {!isLoading && currentStep < 7 && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              )}
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-primary font-semibold hover:underline">Login</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Connect;
