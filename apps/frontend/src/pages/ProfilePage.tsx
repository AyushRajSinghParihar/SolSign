import { ProfileForm } from '@/components/profile/ProfileForm'
import { trpc } from '@/lib/trpc'
import { Skeleton } from '@/components/ui/skeleton'

export function ProfilePage() {
  const getProfileQuery = trpc.user.getProfile.useQuery()

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Your Profile</h1>
        <p className="text-muted-foreground">
          Manage your notification settings.
        </p>
      </div>
      
      {getProfileQuery.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-24" />
        </div>
      ) : getProfileQuery.isError ? (
        <p className="text-destructive">Failed to load your profile.</p>
      ) : (
        <ProfileForm userProfile={getProfileQuery.data} />
      )}
    </div>
  )
}