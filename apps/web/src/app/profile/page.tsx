'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, User, Phone, Edit3, Save, X, LogOut } from 'lucide-react'
import { getCurrentUser, updateUser, signOut, type UpdateUserRequest } from '@padel-parrot/api-client'
import { z } from 'zod'
import toast from 'react-hot-toast'

interface User {
  id: string
  phone: string
  name: string | null
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
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'rgb(var(--color-interactive-muted))' }}
            >
              <User className="w-10 h-10" style={{ color: 'rgb(var(--color-text-subtle))' }} />
            </div>
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
