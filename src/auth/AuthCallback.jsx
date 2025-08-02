import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"

export default function AuthCallback() {
  const [newPassword, setNewPassword] = useState("")
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  const handleReset = async () => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      alert("Error updating password: " + error.message)
    } else {
      setSuccess(true)
      setTimeout(() => navigate("/admin/login"), 2000)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        supabase.auth.refreshSession()
      }
    })
  }, [])

  return (
    <div className="bg-black text-white min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-4">
        <h1 className="text-2xl font-bold">🔒 Reset Your Password</h1>
        {success ? (
          <p className="text-green-500">✅ Password updated! Redirecting...</p>
        ) : (
          <>
            <input
              type="password"
              className="w-full p-3 rounded bg-white text-black"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button
              onClick={handleReset}
              className="bg-red-700 text-white py-2 px-4 rounded font-bold"
            >
              Set New Password
            </button>
          </>
        )}
      </div>
    </div>
  )
}
