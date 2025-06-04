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
        toast.success('Profile updated successfully!')
      }
    } catch (error) {
      toast.error('Failed to update profile. Please try again.')
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile not found</h2>
          <p className="text-gray-600 mb-4">Please try signing in again.</p>
          <button onClick={handleBack} className="btn-primary">
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container-app py-4">
          <div className="flex items-center">
            <button
              onClick={handleBack}
              className="mr-4 p-2 -ml-2 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              Profile
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-app py-6">
        <div className="max-w-md mx-auto">
          {/* Profile Avatar */}
          <div className="text-center mb-6">
            <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-12 h-12 text-primary-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {user.name || 'Welcome!'}
            </h2>
            <p className="text-gray-600">
              {user.name ? 'Your PadelParrot profile' : 'Complete your profile to get started'}
            </p>
          </div>

          {/* Profile Information */}
          <div className="card space-y-6">
            {/* Phone Number */}
            <div className="flex items-center">
              <Phone className="w-5 h-5 text-gray-400 mr-3" />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <p className="text-gray-900 font-medium">{user.phone}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Phone number cannot be changed
                </p>
              </div>
            </div>

            {/* Name */}
            <div className="flex items-start">
              <User className="w-5 h-5 text-gray-400 mr-3 mt-1" />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                {isEditing ? (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                    <div>
                      <input
                        type="text"
                        {...register('name')}
                        placeholder="Enter your name"
                        className="input"
                        autoFocus
                      />
                      {errors.name && (
                        <p className="text-error-600 text-sm mt-1">{errors.name.message}</p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="submit"
                        disabled={isUpdating}
                        className="flex-1 btn-primary"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {isUpdating ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={isUpdating}
                        className="btn-secondary"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-900 font-medium">
                        {user.name || 'Not set'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        This name will be shown to other players
                      </p>
                    </div>
                    <button
                      onClick={handleEdit}
                      className="p-2 rounded-lg hover:bg-gray-100"
                      title="Edit name"
                    >
                      <Edit3 className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Account Info */}
          <div className="card mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Account Information
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Member since:</span>
                <span className="text-gray-900">
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last updated:</span>
                <span className="text-gray-900">
                  {new Date(user.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Help Text */}
          {!user.name && (
            <div className="card mt-6 bg-blue-50 border-blue-200">
              <div className="flex items-start">
                <User className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">
                    Complete your profile
                  </h3>
                  <p className="text-sm text-blue-700">
                    Add your name so other players can recognize you in matches. You can change this anytime.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
} 