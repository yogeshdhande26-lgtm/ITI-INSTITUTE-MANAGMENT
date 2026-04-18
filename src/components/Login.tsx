import React, { useState } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogIn, GraduationCap, ShieldCheck, User, Users } from 'lucide-react';
import { toast } from 'sonner';

export const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast.success('Logged in successfully');
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error('Failed to login: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Resolve loginId to email
      let targetEmail = loginId;
      const mappingDoc = await getDoc(doc(db, 'login_mappings', loginId));
      
      if (mappingDoc.exists()) {
        targetEmail = mappingDoc.data().email;
      } else {
        console.log('No mapping found for loginId');
        // If it's not an email format, it's likely a missing custom ID mapping
        if (!loginId.includes('@')) {
          toast.error('Login ID not found. Please ask your administrator to "Sync" your account in the Admin Panel.');
          setLoading(false);
          return;
        }
      }
      
      console.log('Attempting login for:', targetEmail);

      // 2. Try to sign in
      try {
        await signInWithEmailAndPassword(auth, targetEmail, password);
        toast.success('Logged in successfully');
      } catch (authError: any) {
        console.error('Initial auth error:', authError.code);
        
        if (authError.code === 'auth/operation-not-allowed') {
          toast.error('Email/Password login is not enabled in Firebase Console.');
        } else if (authError.code === 'auth/invalid-credential' || authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password') {
          toast.error('Invalid Login ID or Password. If this is your first time, please ask your administrator to sync your account.');
        } else {
          toast.error('Login Error: ' + authError.message);
        }
      }
    } catch (error: any) {
      console.error('Full credential login error:', error);
      toast.error('Login failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="max-w-md w-full shadow-lg border-none">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold tracking-tight">ITI Instructor Management</CardTitle>
            <CardDescription>
              Sign in to access your dashboard
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="google" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="google" className="gap-2">
                <ShieldCheck className="h-4 w-4" /> Admin
              </TabsTrigger>
              <TabsTrigger value="credentials" className="gap-2">
                <User className="h-4 w-4" /> Instructor
              </TabsTrigger>
              <TabsTrigger value="student" className="gap-2">
                <Users className="h-4 w-4" /> Student
              </TabsTrigger>
            </TabsList>

            <TabsContent value="google">
              <Button 
                onClick={handleGoogleLogin} 
                className="w-full h-12 text-lg font-medium transition-all hover:scale-[1.02]"
                size="lg"
                disabled={loading}
              >
                <LogIn className="mr-2 h-5 w-5" />
                {loading ? 'Signing in...' : 'Sign in with Google'}
              </Button>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Recommended for Administrators and linked accounts.
              </p>
            </TabsContent>

            <TabsContent value="credentials">
              <form onSubmit={handleCredentialLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="loginId">Instructor Login ID</Label>
                  <Input 
                    id="loginId" 
                    placeholder="Enter your Login ID" 
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="Enter your password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 text-lg font-bold bg-slate-900 hover:bg-slate-800 transition-all"
                  disabled={loading}
                >
                  {loading ? 'Verifying...' : 'Instructor Login'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="student">
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                  <p className="text-sm text-amber-800 font-medium">Student Portal Notice</p>
                  <p className="text-xs text-amber-700/80 mt-1">Please use the credentials provided by your instructor to login. You can access your homework and records here.</p>
                </div>
                <form onSubmit={handleCredentialLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="studentEmail">Student Email / Enrollment No</Label>
                    <Input 
                      id="studentEmail" 
                      placeholder="Enter your email or enrollment no" 
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="studentPassword">Password</Label>
                    <Input 
                      id="studentPassword" 
                      type="password" 
                      placeholder="Enter your password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-lg font-bold bg-amber-600 hover:bg-amber-700 transition-all shadow-md shadow-amber-200"
                    disabled={loading}
                  >
                    {loading ? 'Verifying...' : 'Student Login'}
                  </Button>
                </form>
              </div>
            </TabsContent>
          </Tabs>
          
          <p className="mt-8 text-center text-[10px] text-muted-foreground">
            By signing in, you agree to our terms and conditions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
