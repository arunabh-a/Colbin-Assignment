import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, LogOut, Edit, Save, X } from 'lucide-react';
import { api } from '@/service/app.api';
import type { UserProfile } from '@/service/api.interface';
import { toast } from 'sonner';

export default function Profile() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Check authentication status on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setAuthLoading(true);
      
      // First do a silent check to see if we have valid cookies
      const hasValidAuth = await api.utils.silentAuthCheck();
      
      if (hasValidAuth) {
        // If we have valid auth, get the full user data
        const { isAuthenticated: authenticated, user: userData } = await api.utils.checkAuthStatus();
        setIsAuthenticated(authenticated);
        setUser(userData || null);
      } else {
        // No valid auth, don't attempt refresh
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setAuthLoading(false);
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await api.auth.logout();
      setIsAuthenticated(false);
      setUser(null);
      toast.success("Signed out successfully");
    } catch (error: any) {
      console.error('Logout failed:', error);
      toast.error(error.message || "Failed to sign out");
    }
  };

  // Redirect if not authenticated
  if (!authLoading && !isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUpdating(true);

    const formData = new FormData(e.currentTarget);
    
    const updateData = {
      name: formData.get('name') as string,
      bio: formData.get('bio') as string,
    };

    try {
      // Update profile via API
      const updatedUser = await api.user.updateProfile(updateData);
      
      // Update local state with the response from backend
      setUser(updatedUser);
      setEditing(false);
      
      toast.success("Profile updated successfully");
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setUpdating(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Profile not found</p>
            <Button onClick={handleSignOut} className="mt-4">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">User Profile</h1>
          <Button onClick={handleSignOut} variant="outline" size="sm">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl">Profile Information</CardTitle>
            {!editing ? (
              <Button onClick={() => setEditing(true)} variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <Button onClick={() => setEditing(false)} variant="outline" size="sm">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {editing ? (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={user.name || ''}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={user.email}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    defaultValue={user.bio || ''}
                    placeholder="Tell us about yourself..."
                    rows={3}
                  />
                </div>
                
                <Button type="submit" disabled={updating} className="w-full">
                  {updating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">NAME</h3>
                    <p className="text-lg">{user.name || 'Not provided'}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">EMAIL</h3>
                    <p className="text-lg">{user.email}</p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">BIO</h3>
                  <p className="text-base leading-relaxed">
                    {user.bio || 'No bio provided yet.'}
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">EMAIL VERIFICATION</h3>
                  <Badge variant={user.emailVerified ? "default" : "secondary"}>
                    {user.emailVerified ? "Verified" : "Not Verified"}
                  </Badge>
                </div>
                
                <Separator />
                
                <div className="text-sm text-muted-foreground">
                  <p>Member since: {new Date(user.createdAt).toLocaleDateString()}</p>
                  {user.lastLoginAt && (
                    <p>Last login: {new Date(user.lastLoginAt).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}