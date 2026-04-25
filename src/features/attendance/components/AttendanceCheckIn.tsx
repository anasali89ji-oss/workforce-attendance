'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { formatTime } from '@/lib/utils'

interface AttendanceCheckInProps {
  userId: string
  shiftStart?: string
  onAttendanceChange?: () => void
}

/**
 * AttendanceCheckIn component handles employee check-in/check-out functionality
 * Features:
 * - Real-time clock display
 * - Location capture (optional)
 * - Late detection based on shift time
 * - Toast notifications
 */
export function AttendanceCheckIn({ 
  userId, 
  shiftStart,
  onAttendanceChange 
}: AttendanceCheckInProps) {
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [checkInTime, setCheckInTime] = useState<Date | null>(null)
  const { toast } = useToast()

  // Update current time every second
  useState(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  })

  const isLate = useCallback(() => {
    if (!shiftStart || !checkInTime) return false
    const [hours, minutes] = shiftStart.split(':').map(Number)
    const shiftStartTime = new Date(checkInTime)
    shiftStartTime.setHours(hours, minutes, 0, 0)
    return checkInTime > shiftStartTime
  }, [shiftStart, checkInTime])

  const handleCheckIn = async () => {
    setIsCheckingIn(true)
    try {
      // Simulate API call - replace with actual API endpoint
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const now = new Date()
      setCheckInTime(now)
      setIsCheckedIn(true)
      
      toast({
        title: 'Check-in Successful',
        description: `You checked in at ${formatTime(now)}`,
        variant: 'success',
      })
      
      onAttendanceChange?.()
    } catch (error) {
      toast({
        title: 'Check-in Failed',
        description: 'Please try again later',
        variant: 'destructive',
      })
    } finally {
      setIsCheckingIn(false)
    }
  }

  const handleCheckOut = async () => {
    setIsCheckingOut(true)
    try {
      // Simulate API call - replace with actual API endpoint
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const now = new Date()
      setIsCheckedIn(false)
      
      toast({
        title: 'Check-out Successful',
        description: `You checked out at ${formatTime(now)}`,
        variant: 'success',
      })
      
      onAttendanceChange?.()
    } catch (error) {
      toast({
        title: 'Check-out Failed',
        description: 'Please try again later',
        variant: 'destructive',
      })
    } finally {
      setIsCheckingOut(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-6"
    >
      <div className="text-center space-y-4">
        {/* Current Time Display */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Current Time</p>
          <motion.p 
            key={currentTime.toISOString()}
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="text-4xl font-bold tabular-nums"
          >
            {formatTime(currentTime)}
          </motion.p>
        </div>

        {/* Status Indicator */}
        <AnimatePresence mode="wait">
          {isCheckedIn ? (
            <motion.div
              key="checked-in"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400"
            >
              <CheckCircle className="w-6 h-6" />
              <span className="font-medium">Checked In</span>
              {checkInTime && (
                <span className="text-sm text-muted-foreground">
                  since {formatTime(checkInTime)}
                </span>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="checked-out"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400"
            >
              <Clock className="w-6 h-6" />
              <span className="font-medium">Not Checked In</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Late Warning */}
        {isLate() && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-center justify-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-md"
          >
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">You&apos;re checking in late today</span>
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center pt-2">
          <AnimatePresence mode="wait">
            {!isCheckedIn ? (
              <motion.div
                key="checkin-btn"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <Button
                  onClick={handleCheckIn}
                  disabled={isCheckingIn}
                  className="min-w-[140px]"
                  size="lg"
                >
                  {isCheckingIn ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Checking In...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Check In
                    </>
                  )}
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="checkout-btn"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Button
                  onClick={handleCheckOut}
                  disabled={isCheckingOut}
                  variant="outline"
                  className="min-w-[140px]"
                  size="lg"
                >
                  {isCheckingOut ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Checking Out...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Check Out
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
