'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, User, Phone, Edit3, Save, X } from 'lucide-react'
import { getCurrentUser, updateUser, type UpdateUserRequest } from '@padel-parrot/api-client'
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-stone-300 border-t-stone-600 mx-auto mb-3"></div>
          <p className="text-sm text-stone-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-lg font-medium text-stone-900 mb-2">Profile not found</h2>
          <p className="text-sm text-stone-500 mb-4">Please sign in again.</p>
          <button onClick={handleBack} className="btn-primary">
            Back to home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-stone-200 sticky top-0 z-10">
        <div className="container-app py-3">
          <div className="flex items-center">
            <button
              onClick={handleBack}
              className="mr-3 p-1.5 -ml-1.5 rounded-md hover:bg-stone-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-stone-600" />
            </button>
            <h1 className="font-medium text-stone-900">
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
            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <User className="w-8 h-8 text-stone-400" />
            </div>
            <h2 className="text-lg font-semibold text-stone-900">
              {user.name || 'Set your name'}
            </h2>
          </div>

          {/* Info */}
          <div className="card space-y-5">
            {/* Phone */}
            <div className="flex items-start">
              <Phone className="w-4 h-4 text-stone-400 mr-3 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-stone-500 mb-0.5">Phone</p>
                <p className="text-sm font-medium text-stone-900">{user.phone}</p>
              </div>
            </div>

            {/* Name */}
            <div className="flex items-start">
              <User className="w-4 h-4 text-stone-400 mr-3 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-stone-500 mb-0.5">Display name</p>
                {isEditing ? (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
                    <input
                      type="text"
                      {...register('name')}
                      placeholder="Your name"
                      className="input text-sm"
                      autoFocus
                    />
                    {errors.name && (
                      <p className="text-error-600 text-xs">{errors.name.message}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isUpdating}
                        className="btn-primary flex-1 text-xs py-1.5"
                      >
                        <Save className="w-3 h-3 mr-1" />
                        {isUpdating ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={isUpdating}
                        className="btn-secondary px-3 py-1.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-stone-900">
                      {user.name || <span className="text-stone-400">Not set</span>}
                    </p>
                    <button
                      onClick={handleEdit}
                      className="p-1.5 rounded-md hover:bg-stone-100 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-stone-500" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Account Info */}
          <div className="card">
            <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">
              Account
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-500">Member since</span>
                <span className="text-stone-900">
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Help */}
          {!user.name && (
            <div className="card bg-stone-100 border-stone-200">
              <p className="text-sm text-stone-600">
                Add your name so other players can recognize you in matches.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
