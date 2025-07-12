// src/pages/standee/latest.jsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

export default function LatestStandeeRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    const redirectToLatest = async () => {
      const { data, error } = await supabase
        .from('standee_location')
        .select('current_slug')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error || !data?.current_slug) {
        console.error('Could not load latest standee:', error)
        return
      }

      navigate(`/standee/${data.current_slug}`)
    }

    redirectToLatest()
  }, [navigate])

  return <p style={{ color: 'white', textAlign: 'center', marginTop: '2rem' }}>Redirecting to the latest standee...</p>
}
