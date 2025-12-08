'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, User, Phone, Edit3, Save, X, LogOut, Camera, Crown, Bell, ExternalLink, Check, MapPin, Users, TrendingUp } from 'lucide-react'
import { getCurrentUser, updateUser, uploadAvatar, signOut, getSubscriptionStatus, getNotificationPreferences, updateNotificationPreferences, getUserStats, type UpdateUserRequest, type Subscription, type NotificationPreferences, type UserStats } from '@padel-parrot/api-client'
import Avatar from '@/components/Avatar'
import { compressImage, validateImageFile } from '@/utils/imageUtils'
import { formatSubscriptionEnd, getSubscriptionStatusLabel, getSubscriptionStatusColor } from '@/utils/premium'
import { z } from 'zod'
import toast from 'react-hot-toast'

interface User {
  id: string
  phone: string
  name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long').optional(),
})

type UpdateProfileInput = z.infer<typeof updateProfileSchema>

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Premium subscription state
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences | null>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true)
  const [isUpdatingPrefs, setIsUpdatingPrefs] = useState(false)
  
  // Stats state
  const [stats, setStats] = useState<UserStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema)
  })

  useEffect(() => {
    loadUser()
    loadSubscription()
    loadStats()
  }, [])

  const loadUser = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await getCurrentUser()
      if (error) {
        toast.error(error)
        window.location.href = '/'
        return
      }
      if (data) {
        setUser(data)
        setValue('name', data.name || '')
      }
    } catch (error) {
      toast.error('Failed to load profile')
      window.location.href = '/'
    } finally {
      setIsLoading(false)
    }
  }

  const loadSubscription = async () => {
    setIsLoadingSubscription(true)
    try {
      const [subResult, prefsResult] = await Promise.all([
        getSubscriptionStatus(),
        getNotificationPreferences()
      ])
      
      if (subResult.data) {
        setSubscription(subResult.data)
        const isActive = subResult.data.status === 'active' &&
          (!subResult.data.current_period_end || new Date(subResult.data.current_period_end) > new Date())
        setIsPremium(isActive)
      }
      
      if (prefsResult.data) {
        setNotificationPrefs(prefsResult.data)
      }
    } catch (error) {
      console.error('Failed to load subscription:', error)
    } finally {
      setIsLoadingSubscription(false)
    }
  }

  const loadStats = async () => {
    setIsLoadingStats(true)
    try {
      const { data, error } = await getUserStats()
      if (data && !error) {
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setIsLoadingStats(false)
    }
  }

  const handleUpgrade = async () => {
    try {
      const response = await fetch('/api/subscriptions/create-checkout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
      })
      
      const data = await response.json()
      
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error('Failed to start checkout')
      }
    } catch (error) {
      toast.error('Failed to start checkout')
    }
  }

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/subscriptions/portal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
      })
      
      const data = await response.json()
      
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error('Failed to open subscription portal')
      }
    } catch (error) {
      toast.error('Failed to open subscription portal')
    }
  }

  const handleToggleNotification = async (type: 'day_before_enabled' | 'ninety_min_before_enabled') => {
    if (!isPremium) return
    
    setIsUpdatingPrefs(true)
    try {
      const currentValue = notificationPrefs?.[type] ?? true
      const { data, error } = await updateNotificationPreferences({
        [type]: !currentValue,
      })
      
      if (error) {
        toast.error(error)
        return
      }
      
      if (data) {
        setNotificationPrefs(data)
        toast.success('Notification settings updated')
      }
    } catch (error) {
      toast.error('Failed to update settings')
    } finally {
      setIsUpdatingPrefs(false)
    }
  }

  // Helper to get auth token for API calls
  const getAuthToken = async (): Promise<string> => {
    // This would typically come from your auth context/store
    // For now, we'll get it from supabase session
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || ''
  }

  const onSubmit = async (data: UpdateProfileInput) => {
    if (!user) return
    
    setIsUpdating(true)
    try {
      const updateData: UpdateUserRequest = {}
      
      if (data.name && data.name !== user.name) {
        updateData.name = data.name.trim()
      }
      
      if (Object.keys(updateData).length === 0) {
        setIsEditing(false)
        return
      }
      
      const { data: updatedUser, error } = await updateUser(updateData)
      
      if (error) {
        toast.error(error)
        return
      }
      
      if (updatedUser) {
        setUser(updatedUser)
        setIsEditing(false)
        toast.success('Saved!')
      }
    } catch (error) {
      toast.error('Failed to update')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
    setValue('name', user?.name || '')
  }

  const handleCancel = () => {
    setIsEditing(false)
    reset()
    setValue('name', user?.name || '')
  }

  const handleBack = () => {
    window.location.href = '/'
  }

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      const { error } = await signOut()
      if (error) {
        toast.error(error)
      } else {
        toast.success('Signed out')
        window.location.href = '/'
      }
    } catch (error) {
      toast.error('Failed to sign out')
    } finally {
      setIsSigningOut(false)
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    const validation = validateImageFile(file)
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid file')
      return
    }

    setIsUploadingAvatar(true)
    
    try {
      // Compress the image
      const { file: compressedFile, preview } = await compressImage(file)
      
      // Show preview immediately
      setAvatarPreview(preview)
      
      // Upload to Supabase
      const { data: avatarUrl, error } = await uploadAvatar(compressedFile)
      
      if (error) {
        toast.error(error)
        setAvatarPreview(null)
        return
      }
      
      if (avatarUrl && user) {
        setUser({ ...user, avatar_url: avatarUrl })
        toast.success('Photo updated!')
      }
    } catch (error) {
      toast.error('Failed to upload photo')
      setAvatarPreview(null)
    } finally {
      setIsUploadingAvatar(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--color-bg))' }}>
        <div className="text-center">
          <div 
            className="animate-spin rounded-full h-6 w-6 mx-auto mb-3"
            style={{ 
              border: '2px solid rgb(var(--color-border-light))',
              borderTopColor: 'rgb(var(--color-text-muted))'
            }}
          />
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'rgb(var(--color-bg))' }}>
        <div className="text-center">
          <h2 className="text-lg font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>Profile not found</h2>
          <p className="text-sm mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>Please sign in again.</p>
          <button onClick={handleBack} className="btn btn-primary">
            Back to home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(var(--color-bg))' }}>
      {/* Header */}
      <header 
        className="sticky top-0 z-10 backdrop-blur-sm"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface) / 0.8)',
          borderBottom: '1px solid rgb(var(--color-border-light))'
        }}
      >
        <div className="container-app py-4">
          <div className="flex items-center">
            <button
              onClick={handleBack}
              className="mr-3 p-2 -ml-2 rounded-lg transition-colors"
              style={{ backgroundColor: 'transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--color-interactive-muted))'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <ArrowLeft className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
            </button>
            <h1 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              Profile
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-app py-6">
        <div className="max-w-sm mx-auto space-y-6">
          {/* Avatar */}
          <div className="text-center">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAvatarChange}
              className="hidden"
              aria-label="Upload profile photo"
            />
            
            {/* Clickable avatar */}
            <button
              onClick={handleAvatarClick}
              disabled={isUploadingAvatar}
              className="relative w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden group transition-transform active:scale-95"
              style={{ 
                backgroundColor: 'rgb(var(--color-interactive-muted))',
                border: '3px solid rgb(var(--color-border-light))'
              }}
            >
              {/* Avatar image or placeholder */}
              {(avatarPreview || user.avatar_url) ? (
                <img 
                  src={avatarPreview || user.avatar_url || ''} 
                  alt="Profile photo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ color: 'rgb(var(--color-text-subtle))' }} />
              )}
              
              {/* Hover/loading overlay */}
              <div 
                className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                  isUploadingAvatar ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
              >
                {isUploadingAvatar ? (
                  <div 
                    className="w-6 h-6 rounded-full animate-spin"
                    style={{ 
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTopColor: 'white'
                    }}
                  />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </div>
            </button>
            
            <p className="text-xs mb-3" style={{ color: 'rgb(var(--color-text-subtle))' }}>
              Tap to change photo
            </p>
            
            <h2 className="text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              {user.name || 'Set your name'}
            </h2>
            <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {user.phone}
            </p>
          </div>

          {/* Info Card */}
          <div className="card">
            <h2 className="section-header">Account Details</h2>
            
            {/* Phone */}
            <div className="form-field">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgb(var(--color-interactive-muted))' }}
                >
                  <Phone className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs" style={{ color: 'rgb(var(--color-text-subtle))' }}>Phone number</p>
                  <p className="text-sm font-medium truncate" style={{ color: 'rgb(var(--color-text))' }}>
                    {user.phone}
                  </p>
                </div>
              </div>
            </div>

            {/* Name */}
            <div className="form-field">
              <div className="flex items-start gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgb(var(--color-interactive-muted))' }}
                >
                  <User className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs mb-1" style={{ color: 'rgb(var(--color-text-subtle))' }}>Display name</p>
                  {isEditing ? (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                      <input
                        type="text"
                        {...register('name')}
                        placeholder="Your name"
                        className="input"
                        autoFocus
                      />
                      {errors.name && (
                        <p className="form-error">{errors.name.message}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={isUpdating}
                          className="btn btn-primary flex-1"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {isUpdating ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancel}
                          disabled={isUpdating}
                          className="btn btn-secondary"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                        {user.name || <span style={{ color: 'rgb(var(--color-text-subtle))' }}>Not set</span>}
                      </p>
                      <button
                        onClick={handleEdit}
                        className="p-2 rounded-lg transition-colors"
                        style={{ backgroundColor: 'transparent' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--color-interactive-muted))'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <Edit3 className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Member Since */}
            <div 
              className="pt-4 mt-4"
              style={{ borderTop: '1px solid rgb(var(--color-border-light))' }}
            >
              <div className="flex justify-between text-sm">
                <span style={{ color: 'rgb(var(--color-text-muted))' }}>Member since</span>
                <span style={{ color: 'rgb(var(--color-text))' }}>
                  {new Date(user.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Stats Card */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
              <h2 className="section-header" style={{ margin: 0 }}>Your Stats</h2>
            </div>
            
            {isLoadingStats ? (
              <div className="flex items-center justify-center py-4">
                <div 
                  className="animate-spin rounded-full h-5 w-5"
                  style={{ 
                    border: '2px solid rgb(var(--color-border-light))',
                    borderTopColor: 'rgb(var(--color-text-muted))'
                  }}
                />
              </div>
            ) : stats ? (
              <div className="space-y-4">
                {/* Match Counts */}
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    className="p-3 rounded-lg text-center"
                    style={{ backgroundColor: 'rgb(var(--color-interactive-muted))' }}
                  >
                    <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                      {stats.totalMatches}
                    </p>
                    <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      Total Matches
                    </p>
                  </div>
                  <div 
                    className="p-3 rounded-lg text-center"
                    style={{ backgroundColor: 'rgb(var(--color-interactive-muted))' }}
                  >
                    <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                      {stats.matchesThisMonth}
                    </p>
                    <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      This Month
                    </p>
                  </div>
                </div>

                {/* Top Locations */}
                {stats.topLocations.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                      <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                        Favorite Locations
                      </span>
                    </div>
                    <div className="space-y-2">
                      {stats.topLocations.map((loc, index) => (
                        <div 
                          key={loc.location} 
                          className="flex items-center justify-between text-sm"
                        >
                          <span 
                            className="truncate flex-1"
                            style={{ color: 'rgb(var(--color-text-secondary))' }}
                          >
                            {loc.location}
                          </span>
                          <span 
                            className="ml-2 flex-shrink-0"
                            style={{ color: 'rgb(var(--color-text-muted))' }}
                          >
                            {loc.count} {loc.count === 1 ? 'match' : 'matches'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Frequent Partners */}
                {stats.frequentPartners.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                      <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                        Frequent Partners
                      </span>
                    </div>
                    <div className="space-y-2">
                      {stats.frequentPartners.map((partner) => (
                        <div 
                          key={partner.id} 
                          className="flex items-center gap-3"
                        >
                          <Avatar 
                            src={partner.avatar_url} 
                            name={partner.name}
                            size="sm"
                          />
                          <span 
                            className="flex-1 truncate text-sm"
                            style={{ color: 'rgb(var(--color-text-secondary))' }}
                          >
                            {partner.name || 'Anonymous'}
                          </span>
                          <span 
                            className="text-sm flex-shrink-0"
                            style={{ color: 'rgb(var(--color-text-muted))' }}
                          >
                            {partner.matchCount} {partner.matchCount === 1 ? 'match' : 'matches'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No data message */}
                {stats.totalMatches === 0 && (
                  <p className="text-sm text-center py-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    Play some matches to see your stats!
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-center py-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                Could not load stats
              </p>
            )}
          </div>

          {/* Help Hint */}
          {!user.name && (
            <div 
              className="p-4 rounded-lg"
              style={{ 
                backgroundColor: 'rgb(var(--color-interactive-muted))',
                border: '1px solid rgb(var(--color-border-light))'
              }}
            >
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                Add your name so other players can recognize you in matches.
              </p>
            </div>
          )}

          {/* Premium Subscription Card */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="w-5 h-5" style={{ color: isPremium ? 'rgb(234, 179, 8)' : 'rgb(var(--color-text-muted))' }} />
              <h2 className="section-header" style={{ margin: 0 }}>Premium</h2>
            </div>
            
            {isLoadingSubscription ? (
              <div className="flex items-center justify-center py-4">
                <div 
                  className="animate-spin rounded-full h-5 w-5"
                  style={{ 
                    border: '2px solid rgb(var(--color-border-light))',
                    borderTopColor: 'rgb(var(--color-text-muted))'
                  }}
                />
              </div>
            ) : isPremium ? (
              <>
                <div 
                  className="flex items-center justify-between p-3 rounded-lg mb-4"
                  style={{ backgroundColor: 'rgb(var(--color-interactive-muted))' }}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4" style={{ color: 'rgb(34, 197, 94)' }} />
                      <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                        Premium Active
                      </span>
                    </div>
                    {subscription?.current_period_end && (
                      <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        Renews {formatSubscriptionEnd(subscription.current_period_end)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleManageSubscription}
                    className="text-sm font-medium flex items-center gap-1 transition-colors"
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'rgb(var(--color-text))'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'rgb(var(--color-text-muted))'}
                  >
                    Manage
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
                
                {/* Notification Preferences */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Bell className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                    <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                      Match Reminders
                    </span>
                  </div>
                  
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                      Day before reminder (SMS)
                    </span>
                    <button
                      onClick={() => handleToggleNotification('day_before_enabled')}
                      disabled={isUpdatingPrefs}
                      className="relative w-11 h-6 rounded-full transition-colors"
                      style={{ 
                        backgroundColor: notificationPrefs?.day_before_enabled 
                          ? 'rgb(34, 197, 94)' 
                          : 'rgb(var(--color-border-light))'
                      }}
                    >
                      <span 
                        className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm"
                        style={{ 
                          transform: notificationPrefs?.day_before_enabled 
                            ? 'translateX(20px)' 
                            : 'translateX(0)'
                        }}
                      />
                    </button>
                  </label>
                  
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                      90 minutes before (SMS)
                    </span>
                    <button
                      onClick={() => handleToggleNotification('ninety_min_before_enabled')}
                      disabled={isUpdatingPrefs}
                      className="relative w-11 h-6 rounded-full transition-colors"
                      style={{ 
                        backgroundColor: notificationPrefs?.ninety_min_before_enabled 
                          ? 'rgb(34, 197, 94)' 
                          : 'rgb(var(--color-border-light))'
                      }}
                    >
                      <span 
                        className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm"
                        style={{ 
                          transform: notificationPrefs?.ninety_min_before_enabled 
                            ? 'translateX(20px)' 
                            : 'translateX(0)'
                        }}
                      />
                    </button>
                  </label>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm mb-4" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  Get SMS reminders before your matches and access weather forecasts to plan your games.
                </p>
                <ul className="space-y-2 mb-4">
                  <li className="flex items-center gap-2 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    <Check className="w-4 h-4" style={{ color: 'rgb(34, 197, 94)' }} />
                    SMS reminder day before match
                  </li>
                  <li className="flex items-center gap-2 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    <Check className="w-4 h-4" style={{ color: 'rgb(34, 197, 94)' }} />
                    SMS reminder 90 min before
                  </li>
                  <li className="flex items-center gap-2 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    <Check className="w-4 h-4" style={{ color: 'rgb(34, 197, 94)' }} />
                    Weather forecasts for matches
                  </li>
                </ul>
                <button
                  onClick={handleUpgrade}
                  className="btn btn-primary w-full"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Premium
                </button>
              </>
            )}
          </div>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full p-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
            style={{ 
              backgroundColor: 'transparent',
              border: '1px solid rgb(var(--color-border-light))',
              color: 'rgb(var(--color-text-muted))'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgb(var(--color-interactive-muted))'
              e.currentTarget.style.color = 'rgb(var(--color-text))'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = 'rgb(var(--color-text-muted))'
            }}
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">
              {isSigningOut ? 'Signing out...' : 'Sign out'}
            </span>
          </button>
        </div>
      </main>
    </div>
  )
}
