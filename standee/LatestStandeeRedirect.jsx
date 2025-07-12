import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import slugify from '../../lib/slugify'

export default function LatestStandeeRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchLatest() {
      const { data, error } = await supabase
        .from('standee_location')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error || !data) {
        console.error('Failed to fetch latest standee:', error)
        return
      }

      navigate(`/standee/${data.current_slug}`)
    }

    fetchLatest()
  }, [navigate])

  return <p>Redirecting to the latest standee...</p>
}
