import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

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

      if (error || !data) {
        console.error('Could not find latest standee:', error)
        return
      }

      // Redirect to the most recent slug
      navigate(`/standee/${data.current_slug}`)
    }

    redirectToLatest()
  }, [navigate])

  return null
}
